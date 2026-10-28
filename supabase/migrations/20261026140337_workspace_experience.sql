-- REVIEW ONLY. Do not apply to production without approval.
begin;
alter table public.profiles add column is_active boolean not null default true;
alter table public.tasks add column deleted_at timestamptz, add column deleted_by uuid references public.profiles(id);
alter table public.useful_links add column image_url text check(image_url is null or (image_url like 'https://%' and length(image_url)<=2048));
create table public.service_media(service_key text primary key check(service_key in ('corporate','real-estate','litigation','labor','family','advisory')),image_url text not null check(image_url like 'https://%' and length(image_url)<=2048));
alter table public.service_media enable row level security;
create policy "public service covers" on public.service_media for select to anon,authenticated using(true);
create policy "supervisor service covers" on public.service_media for all to authenticated using(public.is_supervisor()) with check(public.is_supervisor());
create table public.team_account_events(id uuid primary key default gen_random_uuid(),actor_id uuid not null references public.profiles(id),member_id uuid not null references public.profiles(id),old_role text not null,new_role text not null,was_active boolean not null,is_active boolean not null,created_at timestamptz not null default now());
alter table public.team_account_events enable row level security;
create policy "supervisor account audit" on public.team_account_events for select to authenticated using(public.is_supervisor());
revoke insert,update,delete on public.team_account_events from anon,authenticated;
create or replace function public.is_active_member() returns boolean language sql stable security definer set search_path='' as $$
 select coalesce(auth.jwt()->>'aal','')='aal2' and exists(select 1 from public.profiles where id=auth.uid() and is_active);
$$;
revoke all on function public.is_active_member() from public,anon,authenticated;
grant execute on function public.is_active_member() to authenticated;
-- Verified second factor is required at both RLS and RPC boundaries.
-- Public published content remains readable without MFA.
create or replace function public.is_supervisor() returns boolean
language sql stable security definer set search_path='' as $$
 select public.is_active_member() and exists(select 1 from public.profiles where id=(select auth.uid()) and role='supervisor');
$$;
create or replace function public.is_content_editor() returns boolean
language sql stable security definer set search_path='' as $$
 select public.is_active_member() and exists(select 1 from public.profiles where id=(select auth.uid()) and role in ('supervisor','content_editor'));
$$;
create or replace function public.is_task_member(p_task_id uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select public.is_active_member() and exists(select 1 from public.task_assignments where task_id=p_task_id and exists(select 1 from public.tasks t where t.id=p_task_id and t.deleted_at is null) and user_id=(select auth.uid()));
$$;
create or replace function public.shares_task_with(p_user_id uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select public.is_active_member() and exists(select 1 from public.task_assignments mine join public.task_assignments theirs on mine.task_id=theirs.task_id
 where mine.user_id=(select auth.uid()) and theirs.user_id=p_user_id);
$$;
create or replace function public.can_access_step(p_step_id uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select public.is_active_member() and exists(select 1 from public.task_steps where id=p_step_id and (public.is_supervisor() or public.is_task_member(task_id)));
$$;

do $$ declare target text; begin
 foreach target in array array['profiles','task_types','tasks','task_assignments','task_steps','step_completions','task_notes','task_status_history','task_activity','notifications','contact_enquiries','import_batches','task_attachments','reminder_deliveries','clients','assignment_events','task_deadline_history','report_exports'] loop
 execute format('create policy "active account required" on public.%I as restrictive for all to authenticated using(public.is_active_member()) with check(public.is_active_member())',target);
 end loop;
end $$;
create policy "hide removed tasks" on public.tasks as restrictive for select to authenticated using(deleted_at is null or public.is_supervisor());
create or replace function public.manage_team_member_secure(p_member uuid,p_role text,p_active boolean) returns void language plpgsql security definer set search_path='' as $$
declare previous public.profiles%rowtype;
begin
 if not public.is_supervisor() then raise exception 'permission' using errcode='42501'; end if;
 if p_member=auth.uid() then raise exception 'self'; end if;
 if p_role not in ('employee','content_editor','supervisor') or p_active is null then raise exception 'invalid'; end if;
 perform pg_advisory_xact_lock(260126);
 select * into previous from public.profiles where id=p_member for update;
 if not found then raise exception 'invalid'; end if;
 if previous.role='supervisor' and previous.is_active and (p_role<>'supervisor' or not p_active) and (select count(*) from public.profiles where role='supervisor' and is_active)<=1 then raise exception 'last_supervisor'; end if;
 update public.profiles set role=p_role,is_active=p_active where id=p_member;
 insert into public.team_account_events(actor_id,member_id,old_role,new_role,was_active,is_active) values(auth.uid(),p_member,previous.role,p_role,previous.is_active,p_active);
end $$;
create or replace function public.task_lifecycle_guard() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is not null and not public.is_active_member() then raise exception 'Inactive account' using errcode='42501'; end if;
 if tg_op='UPDATE' then
 if new.deleted_at is distinct from old.deleted_at or new.deleted_by is distinct from old.deleted_by then
 if not public.is_supervisor() then raise exception 'Supervisor only' using errcode='42501'; end if;
 elsif old.deleted_at is not null then raise exception 'Deleted task is read-only'; end if;
 end if;
 return new;
end $$;
create trigger task_lifecycle before insert or update on public.tasks for each row execute function public.task_lifecycle_guard();
create or replace function public.trash_task_secure(p_task uuid,p_restore boolean default false) returns void language plpgsql security definer set search_path='' as $$
begin
 if not public.is_supervisor() then raise exception 'Supervisor only' using errcode='42501'; end if;
 perform 1 from public.tasks where id=p_task for update;
 if not found then raise exception 'Task not found'; end if;
 update public.tasks set deleted_at=case when p_restore then null else now() end,deleted_by=case when p_restore then null else auth.uid() end where id=p_task;
 insert into public.task_activity(task_id,actor_id,action) values(p_task,auth.uid(),case when p_restore then 'restored' else 'soft_deleted' end);
end $$;
create or replace function public.guard_open_task_child() returns trigger
language plpgsql security definer set search_path='' as $$
declare target_task uuid; parent_status text;
begin
 if tg_table_name='step_completions' then
  select task_id into target_task from public.task_steps
   where id=case when tg_op='DELETE' then old.step_id else new.step_id end;
 else
  target_task:=case when tg_op='DELETE' then old.task_id else new.task_id end;
 end if;
 select status into parent_status from public.tasks where id=target_task for update;
 if not found then raise exception 'Task not found'; end if;
 if auth.uid() is not null and not public.is_active_member() then raise exception 'Inactive account' using errcode='42501'; end if;
 if exists(select 1 from public.tasks where id=target_task and deleted_at is not null) then raise exception 'Deleted task is read-only'; end if;
 if parent_status in ('done','expired') then raise exception 'Closed task is read-only'; end if;
 if tg_table_name='task_assignments' and tg_op='INSERT' then
 if not exists(select 1 from public.profiles where id=new.user_id and is_active) then raise exception 'Inactive assignee'; end if;
 end if;
 if tg_op='DELETE' then return old; end if;
 return new;
end; $$;
create trigger assignments_require_live_task before insert or update on public.task_assignments for each row execute function public.guard_open_task_child();
create or replace function public.complete_unstaged_task_secure(p_task uuid,p_completed boolean) returns void language plpgsql security definer set search_path='' as $$
begin
 if not public.is_active_member() or not public.is_task_member(p_task) then raise exception 'Not assigned' using errcode='42501'; end if;
 if p_completed is null then raise exception 'Invalid completion'; end if;
 -- Same parent lock as checklist edits prevents a stage being added concurrently.
 perform 1 from public.tasks where id=p_task for update;
 if exists(select 1 from public.task_steps where task_id=p_task) then raise exception 'Use checklist'; end if;
 update public.task_assignments set progress=case when p_completed then 100 else 0 end,status=case when p_completed then 'completed' else 'in_progress' end,pause_reason=null,updated_at=now() where task_id=p_task and user_id=auth.uid();
end $$;
create or replace function public.filtered_tasks_v1(f jsonb default '{}')
returns setof public.tasks language sql stable security invoker set search_path='' as $$
 select t.* from public.tasks t
 where t.deleted_at is null and (nullif(f->>'status','') is null or t.status=f->>'status')
 and (nullif(f->>'priority','') is null or t.priority=f->>'priority')
 and (nullif(f->>'client_id','') is null or t.client_id=(f->>'client_id')::uuid)
 and (nullif(f->>'leader_id','') is null or t.leader_id=(f->>'leader_id')::uuid)
 and (nullif(f->>'task_type_id','') is null or t.task_type_id=(f->>'task_type_id')::uuid)
 and (nullif(f->>'assignee','') is null or exists(select 1 from public.task_assignments a where a.task_id=t.id and a.user_id=(f->>'assignee')::uuid))
 and (nullif(f->>'assignment_metric','') is null or exists(
 select 1 from public.task_assignments a where a.task_id=t.id
 and (nullif(f->>'assignee','') is null or a.user_id=(f->>'assignee')::uuid)
 and case f->>'assignment_metric'
 when 'overdue' then t.status not in ('done','expired') and a.completed_at is null and a.progress<100 and a.status<>'completed' and t.due_at<now()
 when 'paused' then a.status='paused'
 when 'excluded' then (a.status='completed' or a.progress=100) and (a.completed_at is null or a.measurement_due_at is null)
 else a.completed_at is not null
 and (nullif(f->>'from','') is null or a.completed_at>=((f->>'from')::date::timestamp at time zone 'Africa/Cairo'))
 and (nullif(f->>'to','') is null or a.completed_at<(((f->>'to')::date+1)::timestamp at time zone 'Africa/Cairo'))
 and case f->>'assignment_metric' when 'eligible' then a.measurement_due_at is not null when 'on_time' then a.measurement_due_at is not null and a.completed_at<=a.measurement_due_at else f->>'assignment_metric'='completed' end end))
 and (nullif(f->>'shared','') is null or ((select count(*) from public.task_assignments a where a.task_id=t.id)>1) = (f->>'shared'='1'))
 and (f->>'overdue' is distinct from '1' or (t.status not in ('done','expired') and t.due_at<now()))
 and (f->>'active' is distinct from '1' or t.status not in ('done','expired'))
 and (nullif(f->>'q','') is null or strpos(lower(t.title),lower(f->>'q'))>0 or starts_with(t.id::text,lower(f->>'q')))
 and (nullif(f->>'from','') is null or (case f->>'date_field' when 'due_at' then t.due_at when 'closed_at' then t.closed_at else t.created_at end)>=((f->>'from')::date::timestamp at time zone 'Africa/Cairo'))
 and (nullif(f->>'to','') is null or (case f->>'date_field' when 'due_at' then t.due_at when 'closed_at' then t.closed_at else t.created_at end)<(((f->>'to')::date+1)::timestamp at time zone 'Africa/Cairo'))
$$;


create or replace function public.notify_task_participants() returns trigger language plpgsql security definer set search_path='' as $$
declare target uuid; recipient uuid;
begin
 target=new.task_id;
 if tg_table_name='task_activity' then
 if new.action='created' then return null; end if;
 end if;
 if tg_table_name='task_assignments' then
  if tg_op='UPDATE' then return null; end if;
  insert into public.notifications(user_id,task_id,message) select new.user_id,target,'تم إسناد مهمة إليك · A task was assigned to you' where new.user_id is distinct from auth.uid();
 else
  insert into public.notifications(user_id,task_id,message)
  select a.user_id,target,'تحديث في مهمة مشتركة معك · Update to your task' from public.task_assignments a join public.profiles p on p.id=a.user_id where a.task_id=target and p.is_active and a.user_id is distinct from auth.uid();
 end if;
 return null;
end $$;
create trigger assignment_notification after insert on public.task_assignments for each row execute function public.notify_task_participants();
create trigger activity_notification after insert on public.task_activity for each row execute function public.notify_task_participants();
create trigger note_notification after insert on public.task_notes for each row execute function public.notify_task_participants();
revoke all on function public.task_lifecycle_guard(),public.notify_task_participants(),public.manage_team_member_secure(uuid,text,boolean),public.trash_task_secure(uuid,boolean),public.complete_unstaged_task_secure(uuid,boolean) from public,anon,authenticated;
grant execute on function public.manage_team_member_secure(uuid,text,boolean),public.trash_task_secure(uuid,boolean),public.complete_unstaged_task_secure(uuid,boolean) to authenticated;

create table public.push_subscriptions(id uuid primary key default gen_random_uuid(),user_id uuid not null default auth.uid() references public.profiles(id),endpoint text not null unique check(length(endpoint)<=2048),p256dh text not null check(length(p256dh)<=256),auth_key text not null check(length(auth_key)<=128),created_at timestamptz not null default now());
alter table public.push_subscriptions enable row level security;
create policy "own push subscriptions" on public.push_subscriptions for all to authenticated using(user_id=auth.uid() and public.is_active_member()) with check(user_id=auth.uid() and public.is_active_member());
create table public.push_outbox(notification_id uuid primary key references public.notifications(id) on delete cascade,attempts integer not null default 0,available_at timestamptz not null default now(),delivered_at timestamptz);
alter table public.push_outbox enable row level security;
revoke all on public.push_outbox from anon,authenticated;
create or replace function public.enqueue_push() returns trigger language plpgsql security definer set search_path='' as $$
begin insert into public.push_outbox(notification_id) values(new.id);return null;end $$;
create trigger push_notification_queue after insert on public.notifications for each row execute function public.enqueue_push();
create or replace function public.claim_push_batch() returns table(notification_id uuid) language sql volatile security definer set search_path='' as $$
 with batch as(select o.notification_id from public.push_outbox o where o.delivered_at is null and o.attempts<5 and o.available_at<=now() order by o.available_at limit 50 for update skip locked)
 update public.push_outbox o set attempts=o.attempts+1,available_at=now()+interval '5 minutes' from batch b where o.notification_id=b.notification_id returning o.notification_id;
$$;
revoke all on function public.enqueue_push(),public.claim_push_batch() from public,anon,authenticated;
grant execute on function public.claim_push_batch() to service_role;
commit;
