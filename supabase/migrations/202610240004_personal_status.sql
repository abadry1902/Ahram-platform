-- Independent per-assignee statuses, separate from supervisor/leader controlled overall status.
alter table public.task_assignments
 add column if not exists status text not null default 'new'
 check (status in ('new','in_progress','paused','completed')),
 add column if not exists pause_reason text;

create or replace function public.lock_assignment_columns() returns trigger
language plpgsql security definer set search_path=public,pg_temp as $$
declare parent_status text;
begin
 if old.user_id is distinct from new.user_id or old.task_id is distinct from new.task_id then
  raise exception 'Assignment identity cannot be modified';
 end if;
 select status into parent_status from public.tasks where id=old.task_id;
 if parent_status in ('done','expired') then raise exception 'Closed task is read-only'; end if;
 if new.status='paused' and length(trim(coalesce(new.pause_reason,'')))<5 then
  raise exception 'Personal pause requires a reason';
 end if;
 if new.status<>'paused' then new.pause_reason=null; end if;
 new.updated_at=now();
 return new;
end; $$;

create or replace function public.log_assignment_change() returns trigger
language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if old.progress is distinct from new.progress or old.status is distinct from new.status then
  insert into public.task_activity(task_id,actor_id,action,payload)
  values(new.task_id,auth.uid(),'assignee_progress',jsonb_build_object(
    'employee',new.user_id,'status',new.status,'progress',new.progress,'pause_reason',new.pause_reason));
 end if;
 return new;
end; $$;
create trigger assignment_changed after update on public.task_assignments
 for each row execute function public.log_assignment_change();
