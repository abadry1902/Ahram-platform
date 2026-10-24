-- Al Ahram Platform: initial database / authorization model.
-- Run this migration in a NEW Supabase project. Review before using real client data.
create extension if not exists pgcrypto;

create table if not exists public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 full_name text not null default 'عضو الفريق',
 role text not null default 'employee' check (role in ('supervisor','employee','content_editor')),
 created_at timestamptz not null default now()
);
create or replace function public.on_auth_user_created() returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
 insert into public.profiles(id,full_name,role)
 values(new.id,coalesce(nullif(new.raw_user_meta_data->>'full_name',''),'عضو الفريق'),'employee')
 on conflict (id) do nothing;
 return new;
end; $$;
drop trigger if exists auth_user_created_profile on auth.users;
create trigger auth_user_created_profile after insert on auth.users for each row execute function public.on_auth_user_created();

create table if not exists public.task_types (
 id uuid primary key default gen_random_uuid(),
 name_ar text not null,
 name_en text,
 stages jsonb not null default '[]'::jsonb,
 created_at timestamptz not null default now()
);
create table if not exists public.tasks (
 id uuid primary key default gen_random_uuid(),
 title text not null check (char_length(title) between 3 and 180),
 description text check (char_length(coalesce(description,''))<=4000),
 status text not null default 'new' check (status in ('new','in_progress','paused','awaiting_review','done','expired')),
 priority text not null default 'medium' check (priority in ('low','medium','high','urgent')),
 progress int not null default 0 check (progress between 0 and 100),
 task_type_id uuid references public.task_types(id) on delete set null,
 leader_id uuid references public.profiles(id),
 created_by uuid not null references public.profiles(id),
 due_at timestamptz,
 pause_reason text,
 closure_reason text,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 closed_at timestamptz
);
create index if not exists tasks_created_at_idx on public.tasks(created_at desc);
create index if not exists tasks_due_at_idx on public.tasks(due_at);
create index if not exists tasks_status_idx on public.tasks(status);
create table if not exists public.task_assignments (
 task_id uuid not null references public.tasks(id) on delete cascade,
 user_id uuid not null references public.profiles(id),
 progress int not null default 0 check (progress between 0 and 100),
 updated_at timestamptz not null default now(),
 primary key(task_id,user_id)
);
create index if not exists task_assignment_user_idx on public.task_assignments(user_id);
create table if not exists public.task_steps (
 id uuid primary key default gen_random_uuid(),
 task_id uuid not null references public.tasks(id) on delete cascade,
 title text not null check (char_length(title) between 3 and 180),
 stage_name text,
 sort_order int not null default 0,
 created_at timestamptz not null default now()
);
create table if not exists public.step_completions (
 step_id uuid not null references public.task_steps(id) on delete cascade,
 user_id uuid not null references public.profiles(id),
 completed_at timestamptz not null default now(),
 primary key(step_id,user_id)
);
create table if not exists public.task_notes (
 id uuid primary key default gen_random_uuid(),
 task_id uuid not null references public.tasks(id) on delete cascade,
 author_id uuid not null references public.profiles(id),
 body text not null check (char_length(body) between 1 and 3000),
 created_at timestamptz not null default now()
);
create table if not exists public.task_status_history (
 id bigint generated always as identity primary key,
 task_id uuid not null references public.tasks(id) on delete cascade,
 previous_status text,
 next_status text not null,
 reason text,
 changed_by uuid references public.profiles(id),
 changed_at timestamptz not null default now()
);
create table if not exists public.task_activity (
 id bigint generated always as identity primary key,
 task_id uuid not null references public.tasks(id) on delete cascade,
 actor_id uuid references public.profiles(id),
 action text not null,
 payload jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now()
);
create table if not exists public.notifications (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references public.profiles(id) on delete cascade,
 task_id uuid references public.tasks(id) on delete cascade,
 message text not null,
 read_at timestamptz,
 created_at timestamptz not null default now()
);
create index if not exists notification_user_idx on public.notifications(user_id,created_at desc);
create table if not exists public.articles (
 id uuid primary key default gen_random_uuid(),
 slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
 category text not null default 'general',
 title_ar text not null,
 title_en text not null default '',
 excerpt_ar text not null default '',
 excerpt_en text not null default '',
 body_ar text not null default '',
 body_en text not null default '',
 status text not null default 'draft' check (status in ('draft','review','published')),
 author_id uuid not null references public.profiles(id),
 published_at timestamptz,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create table if not exists public.useful_links (
 id uuid primary key default gen_random_uuid(),
 name_ar text not null,
 name_en text not null default '',
 description_ar text not null default '',
 description_en text not null default '',
 category text not null default 'general',
 href text not null check (href ~ '^https://'),
 is_published boolean not null default false,
 created_at timestamptz not null default now()
);
create table if not exists public.contact_enquiries (
 id uuid primary key default gen_random_uuid(),
 name text not null check (char_length(name) between 2 and 120),
 email text not null,
 phone text not null default '',
 message text not null check (char_length(message) between 10 and 2000),
 locale text not null default 'ar' check (locale in ('ar','en')),
 source text not null default 'public_form',
 created_at timestamptz not null default now()
);
create table if not exists public.import_batches (
 id uuid primary key default gen_random_uuid(),
 initiated_by uuid not null references public.profiles(id),
 original_name text not null,
 row_count int not null default 0,
 imported_count int not null default 0,
 created_at timestamptz not null default now()
);

create or replace function public.is_supervisor() returns boolean
language sql stable security definer set search_path=public,pg_temp as $$
 select exists(select 1 from public.profiles where id=(select auth.uid()) and role='supervisor');
$$;
create or replace function public.is_content_editor() returns boolean
language sql stable security definer set search_path=public,pg_temp as $$
 select exists(select 1 from public.profiles where id=(select auth.uid()) and role in ('supervisor','content_editor'));
$$;
create or replace function public.is_task_member(p_task_id uuid) returns boolean
language sql stable security definer set search_path=public,pg_temp as $$
 select exists(select 1 from public.task_assignments where task_id=p_task_id and user_id=(select auth.uid()));
$$;
create or replace function public.shares_task_with(p_user_id uuid) returns boolean
language sql stable security definer set search_path=public,pg_temp as $$
 select exists(select 1 from public.task_assignments mine join public.task_assignments theirs on mine.task_id=theirs.task_id
 where mine.user_id=(select auth.uid()) and theirs.user_id=p_user_id);
$$;
create or replace function public.can_access_step(p_step_id uuid) returns boolean
language sql stable security definer set search_path=public,pg_temp as $$
 select exists(select 1 from public.task_steps where id=p_step_id and (public.is_supervisor() or public.is_task_member(task_id)));
$$;

alter table public.profiles enable row level security;
alter table public.task_types enable row level security;
alter table public.tasks enable row level security;
alter table public.task_assignments enable row level security;
alter table public.task_steps enable row level security;
alter table public.step_completions enable row level security;
alter table public.task_notes enable row level security;
alter table public.task_status_history enable row level security;
alter table public.task_activity enable row level security;
alter table public.notifications enable row level security;
alter table public.articles enable row level security;
alter table public.useful_links enable row level security;
alter table public.contact_enquiries enable row level security;
alter table public.import_batches enable row level security;

create policy "profiles limited visibility" on public.profiles for select to authenticated
 using (id=(select auth.uid()) or public.is_supervisor() or public.shares_task_with(id));
create policy "supervisor manages types" on public.task_types for all to authenticated
 using (public.is_supervisor()) with check (public.is_supervisor());
create policy "team reads types" on public.task_types for select to authenticated using (true);
create policy "tasks accessible to assigned participants only" on public.tasks for select to authenticated
 using (public.is_supervisor() or public.is_task_member(id));
create policy "members view same task assignments" on public.task_assignments for select to authenticated
 using (public.is_supervisor() or public.is_task_member(task_id));
create policy "member updates personal progress" on public.task_assignments for update to authenticated
 using (user_id=(select auth.uid()) and public.is_task_member(task_id))
 with check (user_id=(select auth.uid()) and public.is_task_member(task_id));
create policy "team reads steps" on public.task_steps for select to authenticated
 using (public.is_supervisor() or public.is_task_member(task_id));
create policy "supervisor creates steps" on public.task_steps for insert to authenticated
 with check (public.is_supervisor());
create policy "team reads step completions" on public.step_completions for select to authenticated
 using (public.can_access_step(step_id));
create policy "members mark own steps" on public.step_completions for insert to authenticated
 with check (user_id=(select auth.uid()) and public.can_access_step(step_id));
create policy "members unmark own steps" on public.step_completions for delete to authenticated
 using (user_id=(select auth.uid()) and public.can_access_step(step_id));
create policy "team reads notes" on public.task_notes for select to authenticated
 using (public.is_supervisor() or public.is_task_member(task_id));
create policy "team creates notes" on public.task_notes for insert to authenticated
 with check (author_id=(select auth.uid()) and (public.is_supervisor() or public.is_task_member(task_id)));
create policy "team sees history" on public.task_status_history for select to authenticated
 using (public.is_supervisor() or public.is_task_member(task_id));
create policy "team sees activity" on public.task_activity for select to authenticated
 using (public.is_supervisor() or public.is_task_member(task_id));
create policy "user sees notifications" on public.notifications for select to authenticated
 using (user_id=(select auth.uid()));
create policy "user reads notifications" on public.notifications for update to authenticated
 using (user_id=(select auth.uid())) with check (user_id=(select auth.uid()));
create policy "public reads published articles" on public.articles for select to anon,authenticated
 using (status='published' or public.is_content_editor());
create policy "editor creates drafts" on public.articles for insert to authenticated
 with check (public.is_content_editor() and author_id=(select auth.uid()) and status='draft');
create policy "editor updates drafts" on public.articles for update to authenticated
 using (public.is_content_editor() and (status<>'published' or public.is_supervisor()))
 with check (public.is_content_editor());
create policy "public reads published links" on public.useful_links for select to anon,authenticated
 using (is_published or public.is_content_editor());
create policy "supervisor manages links" on public.useful_links for all to authenticated
 using (public.is_supervisor()) with check (public.is_supervisor());
-- Anonymous inserts are allowed with limited fields; put CAPTCHA / IP rate-limiting at the edge before launch.
create policy "public can send enquiries" on public.contact_enquiries for insert to anon,authenticated
 with check (source='public_form' and char_length(message) between 10 and 2000);
create policy "supervisor reads enquiries" on public.contact_enquiries for select to authenticated using (public.is_supervisor());
create policy "supervisor views imports" on public.import_batches for select to authenticated using (public.is_supervisor());

create or replace function public.lock_assignment_columns() returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if old.user_id is distinct from new.user_id or old.task_id is distinct from new.task_id then
  raise exception 'Assignment identity cannot be modified';
 end if;
 if not public.is_supervisor() and new.progress is not distinct from old.progress then
  return new;
 end if;
 if new.progress<0 or new.progress>100 then raise exception 'Invalid progress'; end if;
 return new;
end; $$;
create trigger assignment_lock before update on public.task_assignments
 for each row execute function public.lock_assignment_columns();

create or replace function public.create_task_secure(
 p_title text,p_description text,p_priority text,p_due_at timestamptz,p_assignee_ids uuid[],p_leader_id uuid default null
) returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare new_id uuid; assignee uuid; cleaned uuid[];
begin
 if not public.is_supervisor() then raise exception 'Supervisor only'; end if;
 if char_length(trim(p_title)) not between 3 and 180 then raise exception 'Invalid title'; end if;
 if p_priority not in ('low','medium','high','urgent') then raise exception 'Invalid priority'; end if;
 if cardinality(p_assignee_ids)<1 or cardinality(p_assignee_ids)>50 then raise exception 'Select 1 to 50 assignees'; end if;
 select array_agg(distinct id) into cleaned from public.profiles where id=any(p_assignee_ids);
 if cleaned is null or cardinality(cleaned)<>cardinality(p_assignee_ids) then raise exception 'Invalid assignees'; end if;
 if p_leader_id is not null and not (p_leader_id=any(cleaned)) then raise exception 'Leader must be a participant'; end if;
 insert into public.tasks(title,description,priority,due_at,leader_id,created_by)
 values(trim(p_title),nullif(trim(coalesce(p_description,'')),''),p_priority,p_due_at,p_leader_id,auth.uid()) returning id into new_id;
 foreach assignee in array cleaned loop
  insert into public.task_assignments(task_id,user_id) values(new_id,assignee);
  insert into public.notifications(task_id,user_id,message) values(new_id,assignee,'تم تكليفك بمهمة جديدة: '||p_title);
 end loop;
 insert into public.task_activity(task_id,actor_id,action) values(new_id,auth.uid(),'created');
 return new_id;
end; $$;

create or replace function public.task_history_after_update() returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if old.status is distinct from new.status then
  insert into public.task_status_history(task_id,previous_status,next_status,reason,changed_by)
  values(new.id,old.status,new.status,coalesce(new.pause_reason,new.closure_reason),auth.uid());
  insert into public.task_activity(task_id,actor_id,action,payload)
  values(new.id,auth.uid(),'status_changed',jsonb_build_object('from',old.status,'to',new.status));
 end if;
 if old.progress is distinct from new.progress then
  insert into public.task_activity(task_id,actor_id,action,payload)
  values(new.id,auth.uid(),'overall_progress',jsonb_build_object('from',old.progress,'to',new.progress));
 end if;
 return new;
end; $$;
create trigger task_changed after update on public.tasks for each row execute function public.task_history_after_update();

create or replace function public.set_task_status_secure(p_task_id uuid,p_status text,p_reason text default null)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare row_task public.tasks%rowtype; supervisor boolean := public.is_supervisor();
begin
 select * into row_task from public.tasks where id=p_task_id for update;
 if not found then raise exception 'Task not found'; end if;
 if not supervisor and row_task.leader_id is distinct from auth.uid() then raise exception 'Leader or supervisor only'; end if;
 if row_task.status in ('done','expired') then raise exception 'Closed tasks are immutable'; end if;
 if p_status not in ('new','in_progress','paused','awaiting_review','done','expired') then raise exception 'Invalid status'; end if;
 if p_status in ('done','expired') and not supervisor then raise exception 'Supervisor approval required'; end if;
 if p_status='done' and row_task.status<>'awaiting_review' then raise exception 'Task must first await review'; end if;
 if p_status in ('paused','expired') and length(trim(coalesce(p_reason,'')))<5 then raise exception 'A reason is required'; end if;
 if p_status='awaiting_review' and row_task.status='new' then raise exception 'Cannot submit an unstarted task'; end if;
 update public.tasks set status=p_status,updated_at=now(),
 pause_reason=case when p_status='paused' then p_reason else null end,
 closure_reason=case when p_status='expired' then p_reason else null end,
 closed_at=case when p_status in ('done','expired') then now() else null end,
 progress=case when p_status='done' then 100 else progress end
 where id=p_task_id;
 if p_status='awaiting_review' then
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
 if p_progress<0 or p_progress>100 then raise exception 'Invalid progress'; end if;
 update public.tasks set progress=p_progress,updated_at=now() where id=p_task_id;
end; $$;

create or replace function public.article_approval_guard() returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if not public.is_supervisor() then
  if old.status='published' or new.status='published' then raise exception 'Supervisor approval is required for publication'; end if;
  if old.author_id is distinct from new.author_id then raise exception 'Cannot reassign author'; end if;
 end if;
 if new.status='published' and old.status<>'review' then raise exception 'Article must be in review'; end if;
 if new.status='published' and new.published_at is null then new.published_at=now(); end if;
 new.updated_at=now();
 return new;
end; $$;
create trigger article_guard before update on public.articles for each row execute function public.article_approval_guard();

create or replace function public.prevent_notification_rewrite() returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if new.user_id is distinct from old.user_id or new.task_id is distinct from old.task_id or new.message is distinct from old.message or new.created_at is distinct from old.created_at then
  raise exception 'Cannot edit notification content';
 end if;
 return new;
end; $$;
create trigger notification_protect before update on public.notifications for each row execute function public.prevent_notification_rewrite();

revoke all on function public.create_task_secure(text,text,text,timestamptz,uuid[],uuid) from public;
revoke all on function public.set_task_status_secure(uuid,text,text) from public;
revoke all on function public.set_overall_progress_secure(uuid,int) from public;
grant execute on function public.create_task_secure(text,text,text,timestamptz,uuid[],uuid) to authenticated;
grant execute on function public.set_task_status_secure(uuid,text,text) to authenticated;
grant execute on function public.set_overall_progress_secure(uuid,int) to authenticated;

-- Provision the initial supervisor via Supabase Auth first, then elevate the known UUID manually:
-- update public.profiles set role='supervisor' where id='<AUTH-USER-UUID>';
-- Do not enable unrestricted public sign-ups for staff. Restrict operational attachments to a PRIVATE bucket.
