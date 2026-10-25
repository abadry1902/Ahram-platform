-- Keep review-return feedback visible and auditable to all task participants.
alter table public.tasks add column if not exists review_feedback text;
create or replace function public.task_history_after_update() returns trigger
language plpgsql security definer set search_path='' as $$
declare change_reason text;
begin
 change_reason:=case when old.status='awaiting_review' and new.status='in_progress' then new.review_feedback
 else coalesce(new.pause_reason,new.closure_reason) end;
 if old.status is distinct from new.status then
  insert into public.task_status_history(task_id,previous_status,next_status,reason,changed_by)
  values(new.id,old.status,new.status,change_reason,auth.uid());
  insert into public.task_activity(task_id,actor_id,action,payload)
  values(new.id,auth.uid(),'status_changed',jsonb_build_object('from',old.status,'to',new.status,'reason',change_reason));
 end if;
 if old.progress is distinct from new.progress then
  insert into public.task_activity(task_id,actor_id,action,payload)
  values(new.id,auth.uid(),'overall_progress',jsonb_build_object('from',old.progress,'to',new.progress));
 end if;
 return new;
end; $$;

create or replace function public.set_task_status_secure(p_task_id uuid,p_status text,p_reason text default null)
returns void language plpgsql security definer set search_path='' as $$
declare row_task public.tasks%rowtype; supervisor boolean := public.is_supervisor();
begin
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
