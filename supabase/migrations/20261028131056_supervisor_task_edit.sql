begin;
create function public.edit_task_details_secure(
 p_task_id uuid,p_title text,p_description text,p_priority text,p_due_at timestamptz,
 p_client_id uuid,p_leader_id uuid,p_expected_updated_at timestamptz
) returns void language plpgsql security definer set search_path='' as $$
declare previous public.tasks%rowtype;
begin
 if auth.uid() is null or not public.is_supervisor() then raise exception 'permission' using errcode='42501'; end if;
 if p_title is null or char_length(btrim(p_title)) not between 3 and 180 or char_length(coalesce(p_description,''))>4000 or p_priority is null or p_priority not in ('low','medium','high','urgent') then raise exception 'invalid'; end if;
 select * into previous from public.tasks where id=p_task_id for update;
 if not found or previous.deleted_at is not null or previous.status in ('done','expired') then raise exception 'Task is not editable'; end if;
 if p_expected_updated_at is null or previous.updated_at is distinct from p_expected_updated_at then raise exception 'conflict'; end if;
 if p_client_id is not null and not exists(select 1 from public.clients where id=p_client_id) then raise exception 'invalid client'; end if;
 if p_leader_id is not null and not exists(select 1 from public.task_assignments a join public.profiles p on p.id=a.user_id where a.task_id=p_task_id and a.user_id=p_leader_id and p.is_active) then raise exception 'invalid leader'; end if;
 update public.tasks set title=btrim(p_title),description=nullif(btrim(p_description),''),priority=p_priority,due_at=p_due_at,client_id=p_client_id,leader_id=p_leader_id,updated_at=clock_timestamp() where id=p_task_id;
 insert into public.task_activity(task_id,actor_id,action,payload) values(p_task_id,auth.uid(),'details_updated',jsonb_build_object('fields',(select coalesce(jsonb_agg(key),'[]') from jsonb_each(jsonb_build_object('title',previous.title is distinct from btrim(p_title),'description',previous.description is distinct from nullif(btrim(p_description),''),'priority',previous.priority is distinct from p_priority,'due_at',previous.due_at is distinct from p_due_at,'client_id',previous.client_id is distinct from p_client_id,'leader_id',previous.leader_id is distinct from p_leader_id)) where value='true'::jsonb)));
end $$;
revoke all on function public.edit_task_details_secure(uuid,text,text,text,timestamptz,uuid,uuid,timestamptz) from public,anon,authenticated;
grant execute on function public.edit_task_details_secure(uuid,text,text,text,timestamptz,uuid,uuid,timestamptz) to authenticated;
commit;
