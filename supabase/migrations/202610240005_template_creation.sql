-- Task creation with optional workflow template, including initial stage checklist.
create or replace function public.create_task_with_template_secure(
 p_title text,p_description text,p_priority text,p_due_at timestamptz,
 p_assignee_ids uuid[],p_leader_id uuid,p_template_id uuid
) returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare new_id uuid; step jsonb; index_num int:=0;
begin
 if not public.is_supervisor() then raise exception 'Supervisor only'; end if;
 if p_template_id is not null and not exists(select 1 from public.task_types where id=p_template_id)
 then raise exception 'Unknown template'; end if;
 new_id:=public.create_task_secure(p_title,p_description,p_priority,p_due_at,p_assignee_ids,p_leader_id);
 if p_template_id is not null then
  update public.tasks set task_type_id=p_template_id where id=new_id;
  for step in select jsonb_array_elements(stages) from public.task_types where id=p_template_id loop
   index_num:=index_num+1;
   if jsonb_typeof(step)='string' then
    insert into public.task_steps(task_id,title,stage_name,sort_order)
    values(new_id,trim(step #>> '{}'),trim(step #>> '{}'),index_num);
   end if;
  end loop;
 end if;
 return new_id;
end; $$;
revoke all on function public.create_task_with_template_secure(text,text,text,timestamptz,uuid[],uuid,uuid) from public;
grant execute on function public.create_task_with_template_secure(text,text,text,timestamptz,uuid[],uuid,uuid) to authenticated;
