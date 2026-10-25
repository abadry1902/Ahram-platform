-- Verified second factor is required at both RLS and RPC boundaries.
-- Public published content remains readable without MFA.
create or replace function public.is_supervisor() returns boolean
language sql stable security definer set search_path='' as $$
 select coalesce((auth.jwt()->>'aal')='aal2',false) and exists(select 1 from public.profiles where id=(select auth.uid()) and role='supervisor');
$$;
create or replace function public.is_content_editor() returns boolean
language sql stable security definer set search_path='' as $$
 select coalesce((auth.jwt()->>'aal')='aal2',false) and exists(select 1 from public.profiles where id=(select auth.uid()) and role in ('supervisor','content_editor'));
$$;
create or replace function public.is_task_member(p_task_id uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select coalesce((auth.jwt()->>'aal')='aal2',false) and exists(select 1 from public.task_assignments where task_id=p_task_id and user_id=(select auth.uid()));
$$;
create or replace function public.shares_task_with(p_user_id uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select coalesce((auth.jwt()->>'aal')='aal2',false) and exists(select 1 from public.task_assignments mine join public.task_assignments theirs on mine.task_id=theirs.task_id
 where mine.user_id=(select auth.uid()) and theirs.user_id=p_user_id);
$$;
create or replace function public.can_access_step(p_step_id uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select coalesce((auth.jwt()->>'aal')='aal2',false) and exists(select 1 from public.task_steps where id=p_step_id and (public.is_supervisor() or public.is_task_member(task_id)));
$$;
create or replace function public.set_task_status_secure(p_task_id uuid,p_status text,p_reason text default null)
returns void language plpgsql security definer set search_path='' as $$
declare row_task public.tasks%rowtype; supervisor boolean := public.is_supervisor();
begin
 if coalesce(auth.jwt()->>'aal','')<>'aal2' then raise exception 'MFA required' using errcode='42501'; end if;
 if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
 select * into row_task from public.tasks where id=p_task_id for update;
 if not found then raise exception 'Task not found'; end if;
 if not supervisor and row_task.leader_id is distinct from auth.uid() then raise exception 'Leader or supervisor only'; end if;
 if row_task.status in ('done','expired') then raise exception 'Closed tasks are immutable'; end if;
 if row_task.status='awaiting_review' and not supervisor and p_status<>'awaiting_review' then raise exception 'Only supervisor can return a review'; end if;
 if p_status not in ('new','in_progress','paused','awaiting_review','done','expired') then raise exception 'Invalid status'; end if;
 if p_status in ('done','expired') and not supervisor then raise exception 'Supervisor approval required'; end if;
 if p_status='done' and row_task.status<>'awaiting_review' then raise exception 'Task must first await review'; end if;
 if p_status in ('paused','expired') and length(trim(coalesce(p_reason,'')))<5 then raise exception 'A reason is required'; end if;
 if row_task.status='awaiting_review' and p_status='in_progress' and supervisor and length(trim(coalesce(p_reason,'')))<5 then raise exception 'Review return requires a reason'; end if;
 if p_status='awaiting_review' and row_task.status='new' then raise exception 'Cannot submit an unstarted task'; end if;
 update public.tasks set status=p_status,updated_at=now(),
 pause_reason=case when p_status='paused' then p_reason else null end,
 closure_reason=case when p_status='expired' then p_reason else null end,
 review_feedback=case when row_task.status='awaiting_review' and p_status='in_progress' then p_reason else review_feedback end,
 closed_at=case when p_status in ('done','expired') then now() else null end,
 progress=case when p_status='done' then 100 else progress end where id=p_task_id;
 if p_status='awaiting_review' and row_task.status<>'awaiting_review' then
  insert into public.notifications(user_id,task_id,message)
  select id,p_task_id,'مهمة تنتظر المراجعة: '||row_task.title from public.profiles where role='supervisor';
 end if;
end; $$;
create or replace function public.set_overall_progress_secure(p_task_id uuid,p_progress int)
returns void language plpgsql security definer set search_path='' as $$
declare row_task public.tasks%rowtype;
begin
 if coalesce(auth.jwt()->>'aal','')<>'aal2' then raise exception 'MFA required' using errcode='42501'; end if;
 if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
 select * into row_task from public.tasks where id=p_task_id for update;
 if not found then raise exception 'Task not found'; end if;
 if not public.is_supervisor() and row_task.leader_id is distinct from auth.uid() then raise exception 'Leader or supervisor only'; end if;
 if row_task.status in ('done','expired') then raise exception 'Closed task'; end if;
 if row_task.status='awaiting_review' and not public.is_supervisor() then raise exception 'Pending supervisor review'; end if;
 if p_progress<0 or p_progress>100 then raise exception 'Invalid progress'; end if;
 update public.tasks set progress=p_progress,updated_at=now() where id=p_task_id;
end; $$;
do $$
declare target text;
begin
 foreach target in array array['profiles','task_types','tasks','task_assignments','task_steps','step_completions','task_notes','task_status_history','task_activity','notifications','contact_enquiries','import_batches','task_attachments','reminder_deliveries'] loop
  execute format('create policy "workspace requires mfa" on public.%I as restrictive for all to authenticated using ((select auth.jwt()->>''aal'')=''aal2'') with check ((select auth.jwt()->>''aal'')=''aal2'')',target);
 end loop;
end; $$;
-- Platform event trigger has no legitimate client entry point.
DO $$ BEGIN
 if to_regprocedure('public.rls_auto_enable()') is not null then
  revoke execute on function public.rls_auto_enable() from public,anon,authenticated;
 end if;
END $$;
