-- Operational reminders and tightened review transitions.
create table if not exists public.reminder_deliveries (
 task_id uuid not null references public.tasks(id) on delete cascade,
 user_id uuid not null references public.profiles(id) on delete cascade,
 kind text not null check (kind in ('due_soon','overdue')),
 due_at timestamptz not null,
 created_at timestamptz not null default now(),
 primary key(task_id,user_id,kind,due_at)
);
alter table public.reminder_deliveries enable row level security;
-- This table is intentionally inaccessible to ordinary authenticated clients.
create or replace function public.enqueue_due_reminders() returns integer
language plpgsql security definer set search_path=public,pg_temp as $$
declare count_new integer;
begin
 with due as (
 select t.id,t.title,t.due_at,a.user_id,
  case when t.due_at<now() then 'overdue' else 'due_soon' end as kind
 from public.tasks t join public.task_assignments a on a.task_id=t.id
 where t.due_at is not null and t.due_at<now()+interval '24 hours'
 and t.status not in ('done','expired')
 ),
 inserted as (
 insert into public.reminder_deliveries(task_id,user_id,kind,due_at)
 select id,user_id,kind,due_at from due
 on conflict do nothing returning task_id,user_id,kind
 ),
 sent as (
 insert into public.notifications(task_id,user_id,message)
 select d.id,d.user_id,case when d.kind='overdue' then 'تجاوزت المهمة موعدها: ' else 'موعد المهمة يقترب: ' end||d.title
 from due d join inserted i on d.id=i.task_id and d.user_id=i.user_id and d.kind=i.kind
 returning 1
 )
 select count(*) into count_new from sent;
 return count_new;
end; $$;
revoke all on function public.enqueue_due_reminders() from public,anon,authenticated;
grant execute on function public.enqueue_due_reminders() to service_role;

-- Run from trusted daily cron only after deployment:
-- select cron.schedule('ahram-due-reminders','0 8 * * *', $$select public.enqueue_due_reminders();$$);

create or replace function public.set_task_status_secure(p_task_id uuid,p_status text,p_reason text default null)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare row_task public.tasks%rowtype; supervisor boolean := public.is_supervisor();
begin
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
 closed_at=case when p_status in ('done','expired') then now() else null end,
 progress=case when p_status='done' then 100 else progress end
 where id=p_task_id;
 if p_status='awaiting_review' and row_task.status<>'awaiting_review' then
  insert into public.notifications(user_id,task_id,message)
  select id,p_task_id,'مهمة تنتظر المراجعة: '||row_task.title from public.profiles where role='supervisor';
 end if;
end; $$;
create or replace function public.set_overall_progress_secure(p_task_id uuid,p_progress int)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare row_task public.tasks%rowtype;
begin
 select * into row_task from public.tasks where id=p_task_id for update;
 if not found then raise exception 'Task not found'; end if;
 if not public.is_supervisor() and row_task.leader_id is distinct from auth.uid() then raise exception 'Leader or supervisor only'; end if;
 if row_task.status in ('done','expired') then raise exception 'Closed task'; end if;
 if row_task.status='awaiting_review' and not public.is_supervisor() then raise exception 'Pending supervisor review'; end if;
 if p_progress<0 or p_progress>100 then raise exception 'Invalid progress'; end if;
 update public.tasks set progress=p_progress,updated_at=now() where id=p_task_id;
end; $$;
