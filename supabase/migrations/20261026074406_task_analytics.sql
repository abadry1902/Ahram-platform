begin;
alter table public.task_assignments add column completed_at timestamptz,
 add column measurement_due_at timestamptz,
 add column tracking_started_at timestamptz,
 add column assigned_at timestamptz;
-- Review-only migration. Execute in an isolated database before release approval.
-- All read RPCs run with caller privileges; existing MFA/RLS remain authoritative.
create or replace function public.filtered_tasks_v1(f jsonb default '{}')
returns setof public.tasks language sql stable security invoker set search_path='' as $$
 select t.* from public.tasks t
 where (nullif(f->>'status','') is null or t.status=f->>'status')
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

create or replace function public.task_page_v1(f jsonb default '{}', page_number integer default 1, page_size integer default 25)
returns jsonb language sql stable security invoker set search_path='' as $$
 with filtered as materialized(select * from public.filtered_tasks_v1(f)), page as (
 select t.id,t.title,t.status,t.priority,t.progress,t.due_at,t.created_at,t.closed_at,t.leader_id,t.client_id,
 (select count(*) from public.task_assignments a where a.task_id=t.id) as "memberCount",
 (select c.name from public.clients c where c.id=t.client_id) as "clientName"
 from filtered t order by
 case when f->>'sort'='due' then t.due_at end asc nulls last,
 case when f->>'sort'='progress' then t.progress end desc,
 case when f->>'sort'='priority' then case t.priority when 'urgent' then 4 when 'high' then 3 when 'medium' then 2 else 1 end end desc,
 t.created_at desc,t.id
 limit least(greatest(page_size,1),100) offset (greatest(page_number,1)::bigint-1)*least(greatest(page_size,1),100))
 select jsonb_build_object('total',(select count(*) from filtered),'items',coalesce((select jsonb_agg(page) from page),'[]'::jsonb))
$$;

-- Protected provenance: no timestamps inferred for pre-migration completions.

create table public.assignment_events(
 id bigint generated always as identity primary key, task_id uuid not null references public.tasks(id) on delete cascade,
 user_id uuid not null references public.profiles(id), actor_id uuid references public.profiles(id),
 kind text not null check(kind in ('completed','reopened','paused','resumed')),
 occurred_at timestamptz not null default now(), deadline timestamptz
);
create table public.task_deadline_history(
 id bigint generated always as identity primary key, task_id uuid not null references public.tasks(id) on delete cascade,
 actor_id uuid references public.profiles(id), old_due_at timestamptz,new_due_at timestamptz, changed_at timestamptz not null default now()
);
alter table public.assignment_events enable row level security;
alter table public.task_deadline_history enable row level security;
revoke all on public.assignment_events,public.task_deadline_history from public,anon,authenticated;
grant select on public.assignment_events,public.task_deadline_history to authenticated;
create policy "task members read assignment provenance" on public.assignment_events for select to authenticated using(public.is_supervisor() or public.is_task_member(task_id));
create policy "task members read deadline provenance" on public.task_deadline_history for select to authenticated using(public.is_supervisor() or public.is_task_member(task_id));

create function public.track_assignment_v1() returns trigger language plpgsql security definer set search_path='' as $$
declare is_complete boolean; was_complete boolean; due timestamptz;
begin
 select due_at into due from public.tasks where id=new.task_id;
 if tg_op='INSERT' then
  new.completed_at=null; new.assigned_at=now(); new.tracking_started_at=now(); new.measurement_due_at=due;
  return new;
 end if;
 -- Run after checklist derivation. Fields are never writable by the caller.
 new.completed_at=old.completed_at; new.assigned_at=old.assigned_at;
 new.tracking_started_at=coalesce(old.tracking_started_at,now());
 new.measurement_due_at=case when old.tracking_started_at is null then due else old.measurement_due_at end;
 is_complete=case when exists(select 1 from public.task_steps where task_id=new.task_id) then new.progress=100 else new.status='completed' or new.progress=100 end;
 was_complete=case when exists(select 1 from public.task_steps where task_id=old.task_id) then old.progress=100 else old.status='completed' or old.progress=100 end;
 if is_complete and not was_complete then
  new.completed_at=now();
  insert into public.assignment_events(task_id,user_id,actor_id,kind,deadline) values(new.task_id,new.user_id,auth.uid(),'completed',new.measurement_due_at);
 elsif not is_complete and was_complete then
  new.completed_at=null;
  insert into public.assignment_events(task_id,user_id,actor_id,kind,deadline) values(new.task_id,new.user_id,auth.uid(),'reopened',new.measurement_due_at);
 end if;
 if new.status is distinct from old.status and (new.status='paused' or old.status='paused') then
  insert into public.assignment_events(task_id,user_id,actor_id,kind,deadline) values(new.task_id,new.user_id,auth.uid(),case when new.status='paused' then 'paused' else 'resumed' end,new.measurement_due_at);
 end if;
 return new;
end $$;
create trigger zz_assignment_provenance before insert or update on public.task_assignments for each row execute function public.track_assignment_v1();
-- Snapshot only provenance columns. Suppress existing recomputation/logging triggers
-- under this migration's exclusive table lock so no historical completion is invented.
-- Restore exactly their previous enabled modes, including replica/always/disabled.
do $$
declare states jsonb; r record;
begin
 select jsonb_object_agg(tgname,tgenabled) into states from pg_trigger where tgrelid='public.task_assignments'::regclass and not tgisinternal;
 for r in select key from jsonb_each_text(states) loop
  execute format('alter table public.task_assignments disable trigger %I',r.key);
 end loop;
 update public.task_assignments a set measurement_due_at=t.due_at,tracking_started_at=now() from public.tasks t where t.id=a.task_id;
 for r in select key,value from jsonb_each_text(states) loop
  execute format('alter table public.task_assignments %s trigger %I',case r.value when 'D' then 'disable' when 'R' then 'enable replica' when 'A' then 'enable always' else 'enable' end,r.key);
 end loop;
end $$;
create function public.track_deadline_v1() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if old.due_at is distinct from new.due_at then
 insert into public.task_deadline_history(task_id,actor_id,old_due_at,new_due_at) values(new.id,auth.uid(),old.due_at,new.due_at);
 end if; return new;
end $$;
create trigger task_deadline_provenance after update of due_at on public.tasks for each row execute function public.track_deadline_v1();
revoke all on function public.track_assignment_v1(),public.track_deadline_v1() from public,anon,authenticated;

create or replace function public.task_metrics_v1(f jsonb default '{}') returns jsonb
language sql stable security invoker set search_path='' as $$
 with t as materialized(select * from public.filtered_tasks_v1(f))
 select jsonb_build_object('total',count(*),'active',count(*) filter(where status not in ('done','expired')),
 'new',count(*) filter(where status='new'),'in_progress',count(*) filter(where status='in_progress'),
 'paused',count(*) filter(where status='paused'),'awaiting_review',count(*) filter(where status='awaiting_review'),
 'done',count(*) filter(where status='done'),'expired',count(*) filter(where status='expired'),
 'overdue',count(*) filter(where status not in ('done','expired') and due_at<now()),
 'completion_rate',round(100.0*count(*) filter(where status='done')/nullif(count(*),0),1),
 'average_completion_hours',round(avg(extract(epoch from closed_at-created_at)/3600) filter(where status='done'),1)) from t
$$;

create function public.task_report_v1(f jsonb default '{}') returns jsonb
language plpgsql stable security invoker set search_path='' as $$
declare result jsonb;
begin
 if not public.is_supervisor() then raise exception 'Supervisor only' using errcode='42501'; end if;
 with tasks as materialized(select * from public.filtered_tasks_v1(f)), a as materialized(
 select a.*, (a.completed_at is not null and (nullif(f->>'from','') is null or a.completed_at>=((f->>'from')::date::timestamp at time zone 'Africa/Cairo')) and (nullif(f->>'to','') is null or a.completed_at<(((f->>'to')::date+1)::timestamp at time zone 'Africa/Cairo'))) as completed_in_period,t.status as task_status,t.leader_id,t.priority,t.due_at,
 (select count(*) from public.task_assignments x where x.task_id=t.id)>1 as shared
 from tasks t join public.task_assignments a on a.task_id=t.id),
 pause_transitions as(select e.user_id,e.task_id,e.kind,e.occurred_at,lead(e.occurred_at) over(partition by e.task_id,e.user_id order by e.occurred_at,e.id) as ended_at from public.assignment_events e join tasks t on t.id=e.task_id where e.kind in ('paused','resumed')),
 team as (select p.id,p.full_name,
 round(avg(extract(epoch from a.completed_at-a.assigned_at)/3600) filter(where a.completed_in_period and a.assigned_at is not null),1) as completion_hours,
 count(*) filter(where a.assigned_at is not null and a.due_at is not null and (nullif(f->>'from','') is null or a.due_at>=((f->>'from')::date::timestamp at time zone 'Africa/Cairo')) and (nullif(f->>'to','') is null or a.due_at<(((f->>'to')::date+1)::timestamp at time zone 'Africa/Cairo'))) as due_count,
 count(*) filter(where a.assigned_at is not null and a.due_at is not null and a.completed_at is not null and (nullif(f->>'from','') is null or a.due_at>=((f->>'from')::date::timestamp at time zone 'Africa/Cairo')) and (nullif(f->>'to','') is null or (a.due_at<(((f->>'to')::date+1)::timestamp at time zone 'Africa/Cairo') and a.completed_at<(((f->>'to')::date+1)::timestamp at time zone 'Africa/Cairo')))) as due_completed,
 (select round(sum(extract(epoch from ended_at-occurred_at)/3600),1) from pause_transitions pt where pt.user_id=p.id and pt.kind='paused' and ended_at is not null) as pause_hours,
count(*) filter(where a.task_status not in ('done','expired')) as active,
 count(*) filter(where a.completed_in_period) as completed,
 count(*) filter(where a.completed_in_period and a.measurement_due_at is not null) as eligible,
 count(*) filter(where a.completed_in_period and a.measurement_due_at is not null and a.completed_at<=a.measurement_due_at) as on_time,
 count(*) filter(where (a.status='completed' or a.progress=100) and (a.completed_at is null or a.measurement_due_at is null)) as excluded,
 count(*) filter(where a.task_status not in ('done','expired') and a.completed_at is null and a.progress<100 and a.status<>'completed' and a.due_at<now()) as overdue,
 round(avg(a.progress) filter(where a.task_status not in ('done','expired')),1) as progress,
 count(*) filter(where a.shared) as shared,count(*) filter(where a.leader_id=p.id) as led,
 count(*) filter(where a.status='paused') as paused
 from a join public.profiles p on p.id=a.user_id group by p.id,p.full_name),
 trends as(select to_char(closed_at at time zone 'Africa/Cairo','YYYY-MM') as month,count(*) as completed from tasks where status='done' and closed_at is not null group by 1 order by 1),
 priorities as(select priority,count(*) as count from tasks group by priority),
 review as(select t.id,t.title,(select max(changed_at) from public.task_status_history h where h.task_id=t.id and h.next_status='awaiting_review') as since from tasks t where t.status='awaiting_review'),
 member_trends as(select user_id,to_char(completed_at at time zone 'Africa/Cairo','YYYY-MM') as month,count(*) as completed,count(*) filter(where measurement_due_at is not null and completed_at<=measurement_due_at) as on_time,count(*) filter(where measurement_due_at is not null) as eligible from a where completed_in_period group by 1,2 order by 2),
 transitions as(select h.task_id,h.next_status,h.changed_at,lead(h.changed_at) over(partition by h.task_id order by h.changed_at,h.id) as ended_at from public.task_status_history h join tasks t on t.id=h.task_id),
 durations as(select avg(extract(epoch from ended_at-changed_at)/3600) filter(where next_status='awaiting_review') as review_hours,avg(extract(epoch from ended_at-changed_at)/3600) filter(where next_status='paused') as pause_hours from transitions)

 select jsonb_build_object('metrics',public.task_metrics_v1(f),'team',coalesce((select jsonb_agg(team order by active desc,full_name) from team),'[]'::jsonb),
 'trends',coalesce((select jsonb_agg(trends) from trends),'[]'::jsonb),'priorities',coalesce((select jsonb_agg(priorities) from priorities),'[]'::jsonb),'review',coalesce((select jsonb_agg(review order by since nulls last) from review),'[]'::jsonb),'member_trends',coalesce((select jsonb_agg(member_trends) from member_trends),'[]'::jsonb),'durations',(select row_to_json(durations) from durations),'generated_at',now(),'timezone','Africa/Cairo') into result;
 return result;
end $$;
create index task_assignment_member_lookup on public.task_assignments(user_id,task_id);
create index task_due_analytics on public.tasks(due_at,id) where status not in ('done','expired');
create index assignment_event_lookup on public.assignment_events(task_id,user_id,occurred_at);
revoke all on function public.filtered_tasks_v1(jsonb),public.task_page_v1(jsonb,integer,integer),public.task_metrics_v1(jsonb),public.task_report_v1(jsonb) from public,anon,authenticated;
grant execute on function public.filtered_tasks_v1(jsonb),public.task_page_v1(jsonb,integer,integer),public.task_metrics_v1(jsonb),public.task_report_v1(jsonb) to authenticated;

create table public.report_exports(
 id uuid primary key default gen_random_uuid(),user_id uuid not null references public.profiles(id),
 created_at timestamptz not null default now(),format text not null check(format in ('xlsx','pdf')),
 filters jsonb not null,task_count integer not null,event text not null default 'snapshot_requested'
);
alter table public.report_exports enable row level security;
revoke all on public.report_exports from public,anon,authenticated;
grant select on public.report_exports to authenticated;
create policy "supervisor reads export audit" on public.report_exports for select to authenticated using(public.is_supervisor());
-- Narrow privilege escalation only to append trusted rate-limit/audit rows.
-- Authorization is explicit; report data is supervisor-only at this boundary.
create function public.report_export_v1(f jsonb default '{}', export_format text default 'xlsx') returns jsonb
language plpgsql security definer set search_path='' as $$
declare n integer; result jsonb; export_id uuid;
begin
 if auth.uid() is null or not public.is_supervisor() then raise exception 'Supervisor only' using errcode='42501'; end if;
 if export_format not in ('xlsx','pdf') then raise exception 'Invalid format'; end if;
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text,0));
 if (select count(*) from public.report_exports where user_id=auth.uid() and created_at>now()-interval '10 minutes')>=5 then raise exception 'Export rate limit' using errcode='P0001'; end if;
 
 with rows as(select t.id,t.title,t.status,t.priority,t.progress,t.created_at,t.due_at,t.closed_at from public.filtered_tasks_v1(f) t order by t.created_at desc,t.id limit 10001)
 select jsonb_build_object('report',public.task_report_v1(f),'tasks',coalesce((select jsonb_agg(rows) from rows),'[]'::jsonb),'filters',f) into result;
 n=jsonb_array_length(result->'tasks');
 if n>10000 then raise exception 'Narrow filters to at most 10000 tasks'; end if;
 insert into public.report_exports(user_id,format,filters,task_count) values(auth.uid(),export_format,f,n) returning id into export_id;
 return result||jsonb_build_object('export_id',export_id);
end $$;
revoke all on function public.report_export_v1(jsonb,text) from public,anon,authenticated;
grant execute on function public.report_export_v1(jsonb,text) to authenticated;

commit;
