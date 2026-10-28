-- Only names are stored in Phase 1. Client records are not public directories.
create table public.clients (
 id uuid primary key default gen_random_uuid(),
 name text not null check (char_length(btrim(name)) between 2 and 160),
 created_by uuid not null references public.profiles(id),
 created_at timestamptz not null default now()
);
create unique index clients_normalized_name on public.clients(lower(btrim(name)));
alter table public.clients enable row level security;
revoke all on public.clients from public,anon,authenticated;
grant select,insert on public.clients to authenticated;
alter table public.tasks add column client_id uuid references public.clients(id);
create index tasks_client_id_idx on public.tasks(client_id);
create policy "read relevant beneficiaries" on public.clients for select to authenticated
 using (public.is_supervisor() or exists(select 1 from public.tasks t where t.client_id=clients.id and public.is_task_member(t.id)));
create policy "supervisor creates beneficiaries" on public.clients for insert to authenticated
 with check (public.is_supervisor() and created_by=(select auth.uid()));
create policy "clients require mfa" on public.clients as restrictive for all to authenticated
 using ((select auth.jwt()->>'aal')='aal2') with check ((select auth.jwt()->>'aal')='aal2');

-- One transaction ensures failed task creation cannot leave an orphan new client.
create function public.create_task_for_client_secure(
 p_title text,p_description text,p_priority text,p_due_at timestamptz,
 p_assignee_ids uuid[],p_leader_id uuid,p_template_id uuid,p_client_id uuid,p_new_client_name text
) returns uuid language plpgsql security definer set search_path='' as $$
declare selected_client uuid:=p_client_id; new_task uuid; clean_name text:=btrim(regexp_replace(coalesce(p_new_client_name,''),'\s+',' ','g'));
begin
 if auth.uid() is null or not public.is_supervisor() then raise exception 'Supervisor only' using errcode='42501'; end if;
 if clean_name<>'' then
  if p_client_id is not null then raise exception 'Choose existing or new client'; end if;
  if char_length(clean_name) not between 2 and 160 then raise exception 'Invalid client name'; end if;
  insert into public.clients(name,created_by) values(clean_name,auth.uid()) on conflict do nothing returning id into selected_client;
  if selected_client is null then select id into selected_client from public.clients where lower(btrim(name))=lower(clean_name); end if;
 elsif selected_client is not null and not exists(select 1 from public.clients where id=selected_client) then
  raise exception 'Unknown client';
 end if;
 new_task:=public.create_task_with_template_secure(p_title,p_description,p_priority,p_due_at,p_assignee_ids,
  case when cardinality(p_assignee_ids)=1 then p_assignee_ids[1] else p_leader_id end,p_template_id);
 update public.tasks set client_id=selected_client where id=new_task;
 return new_task;
end; $$;
revoke all on function public.create_task_for_client_secure(text,text,text,timestamptz,uuid[],uuid,uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.create_task_for_client_secure(text,text,text,timestamptz,uuid[],uuid,uuid,uuid,text) to authenticated;
