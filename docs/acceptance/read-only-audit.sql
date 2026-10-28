-- AL AHRAM / QA-only, READ-ONLY security inventory.
-- Run in the approved dedicated Supabase project's SQL Editor.
-- No schema changes, no credentials, no user data returned.

-- A) RLS must be enabled on every public table.
select n.nspname as schema_name, c.relname as table_name,
       c.relrowsecurity as rls_enabled, c.relforcerowsecurity as force_rls
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relkind in ('r','p')
order by c.relname;

-- B) Review all policies and their USING/WITH CHECK predicates.
select schemaname,tablename,policyname,permissive,roles,cmd,qual,with_check
from pg_policies where schemaname in ('public','storage')
order by schemaname,tablename,policyname;

-- C) Find functions with SECURITY DEFINER and whether anon/authenticated may execute them.
select n.nspname as schema_name,p.proname as function_name,
       pg_get_function_identity_arguments(p.oid) as arguments,
       p.prosecdef as security_definer,
       p.proconfig as function_settings, p.proacl as explicit_function_acl,
       has_function_privilege('anon',p.oid,'EXECUTE') as anon_can_execute,
       has_function_privilege('authenticated',p.oid,'EXECUTE') as authenticated_can_execute,
       has_function_privilege('service_role',p.oid,'EXECUTE') as service_role_can_execute
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public'
order by p.prosecdef desc,p.proname;

-- D) Verify private bucket and MIME/size restrictions.
select id,name,public,file_size_limit,allowed_mime_types
from storage.buckets where id='task-ops';

-- E) Table privileges are separate from RLS.
select table_schema,table_name,privilege_type,grantee
from information_schema.role_table_grants
where table_schema='public' and grantee in ('anon','authenticated')
order by table_name,grantee,privilege_type;

-- F) Inspect views: public views can bypass RLS unless security_invoker=true.
select schemaname,viewname,definition from pg_views where schemaname='public';

-- G) Check expected migration tables exist.
select expected.name,
       to_regclass('public.'||expected.name) is not null as exists_in_public
from (values ('profiles'),('tasks'),('task_assignments'),('task_notes'),
             ('task_attachments'),('task_steps'),('step_completions'),
             ('articles'),('useful_links'),('notifications'),('reminder_deliveries')) as expected(name);

-- H) Schema creation and default function grants affect SECURITY DEFINER safety.
select n.nspname, n.nspacl,
 has_schema_privilege('anon',n.oid,'CREATE') as anon_can_create,
 has_schema_privilege('authenticated',n.oid,'CREATE') as authenticated_can_create
from pg_namespace n where n.nspname='public';
select defaclrole::regrole as owner_role,defaclnamespace::regnamespace as schema_name,
 defaclobjtype,defaclacl from pg_default_acl order by 1,2,3;

-- I) View options must be checked, not inferred from view definitions alone.
select n.nspname,c.relname,c.reloptions from pg_class c
join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relkind in ('v','m');
