import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto';

// Real local PostgreSQL execution with simulated Supabase auth/storage schemas.
// This does NOT exercise GoTrue, JWT validation, PostgREST or Storage APIs.
const db = new PGlite({ extensions: { pgcrypto } });
const ids = {
  supervisor: '10000000-0000-4000-8000-000000000001',
  leader: '10000000-0000-4000-8000-000000000002',
  employee: '10000000-0000-4000-8000-000000000003',
  editor: '10000000-0000-4000-8000-000000000004',
};
let sharedTask, otherTask, leaderlessTask, article;

async function as(role, user, operation) {
  assert.ok(['anon', 'authenticated'].includes(role));
  await db.exec(`set role ${role}`);
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [user || '']);
  try { return await operation(); }
  finally {
    await db.exec('reset role');
    await db.query("select set_config('request.jwt.claim.sub', '', false)");
  }
}
const authenticated = (user, operation) => as('authenticated', user, operation);
const query = (sql, params=[]) => db.query(sql, params).then(r => r.rows);
const deny = (operation, message) => assert.rejects(operation, e =>
  (e.code === '42501' || e.code === 'P0001') && message.test(e.message));
const status = (task, value, reason=null) => query('select public.set_task_status_secure($1,$2,$3)', [task,value,reason]);
const progress = (task, value) => query('select public.set_overall_progress_secure($1,$2)', [task,value]);
const createTask = (title, members, leader=null) => query(
  'select public.create_task_secure($1,$2,$3,$4,$5,$6) as id',
  [title, 'Synthetic local security test', 'medium', null, members, leader]
).then(rows => rows[0].id);

before(async () => {
  await db.exec(`
    create role anon nologin;
    create role authenticated nologin;
    create role service_role nologin bypassrls;
    create schema auth;
    create schema storage;
    grant usage on schema public,auth,storage to anon,authenticated,service_role;
    create table auth.users(id uuid primary key, raw_user_meta_data jsonb not null default '{}');
    create function auth.uid() returns uuid language sql stable as
      $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    create function auth.jwt() returns jsonb language sql stable as
      $$select jsonb_build_object('aal',coalesce(nullif(current_setting('request.jwt.claim.aal',true),''),'aal2'))$$;
    create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
    create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text);
    alter table storage.objects enable row level security;
    grant select,insert,update,delete on storage.objects to authenticated;
    create function storage.extension(text) returns text language sql immutable as
      $$select reverse(split_part(reverse($1),'.',1))$$;
    -- Match the actual dedicated project's explicit role defaults. Revoking only
    -- PUBLIC must not accidentally make this regression test pass.
    alter default privileges for role postgres in schema public grant all on tables to anon,authenticated,service_role;
    alter default privileges for role postgres in schema public grant all on sequences to anon,authenticated,service_role;
    alter default privileges for role postgres in schema public grant execute on functions to anon,authenticated,service_role;
  `);
  const dir = new URL('../../supabase/migrations/', import.meta.url);
  for (const file of (await readdir(dir)).filter(f=>f.endsWith('.sql')).sort()) {
    await db.exec(await readFile(new URL(file, dir), 'utf8'));
  }
  for (const [name,id] of Object.entries(ids)) {
    await query('insert into auth.users(id,raw_user_meta_data) values($1,$2)',
      [id, JSON.stringify({full_name:`LOCAL QA ${name}`,role:'supervisor'})]);
  }
  // Trusted local fixture setup only; no real Auth accounts or remote writes.
  await query("update public.profiles set role='supervisor' where id=$1", [ids.supervisor]);
  await query("update public.profiles set role='content_editor' where id=$1", [ids.editor]);
  sharedTask = await authenticated(ids.supervisor,()=>createTask('LOCAL QA shared', [ids.leader,ids.employee], ids.leader));
  otherTask = await authenticated(ids.supervisor,()=>createTask('LOCAL QA separate', [ids.editor], ids.editor));
  leaderlessTask = await authenticated(ids.supervisor,()=>createTask('LOCAL QA leaderless', [ids.employee]));
});
after(()=>db.close());

test('all application tables have RLS and clients cannot create public objects', async()=>{
  const tables = await query("select relname,relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r'");
  assert.equal(tables.length,16);
  assert.ok(tables.every(t=>t.relrowsecurity));
  for (const role of ['anon','authenticated']) {
    assert.equal((await query("select has_schema_privilege($1,'public','create') as allowed",[role]))[0].allowed,false);
  }
});

test('anonymous RPC execution is denied despite Supabase direct default grants', async()=>{
  for(const fn of ['create_task_secure(text,text,text,timestamptz,uuid[],uuid)','set_task_status_secure(uuid,text,text)','set_overall_progress_secure(uuid,int)','create_task_with_template_secure(text,text,text,timestamptz,uuid[],uuid,uuid)','is_supervisor()','is_content_editor()','is_task_member(uuid)','shares_task_with(uuid)','can_access_step(uuid)','get_attachment_task_id(text)']) {
    assert.equal((await query('select has_function_privilege($1,$2,$3) as allowed',['anon',`public.${fn}`,'execute']))[0].allowed,false,fn);
  }
  await deny(()=>as('anon',null,()=>status(leaderlessTask,'in_progress')),/permission denied for function/);
  await deny(()=>as('anon',null,()=>progress(leaderlessTask,80)),/permission denied for function/);
});

test('UID guard protects leaderless tasks even if a future grant mistakenly exposes RPCs', async()=>{
  await db.exec('grant execute on function public.set_task_status_secure(uuid,text,text),public.set_overall_progress_secure(uuid,int) to anon;');
  try {
    await deny(()=>as('anon',null,()=>status(leaderlessTask,'in_progress')),/Authentication required/);
  } finally { await db.exec('revoke execute on function public.set_task_status_secure(uuid,text,text),public.set_overall_progress_secure(uuid,int) from anon;'); }
  await db.exec('grant execute on function public.set_overall_progress_secure(uuid,int) to anon;');
  try {
    await deny(()=>as('anon',null,()=>progress(leaderlessTask,80)),/Authentication required/);
  } finally { await db.exec('revoke execute on function public.set_task_status_secure(uuid,text,text),public.set_overall_progress_secure(uuid,int) from anon;'); }
  // An authenticated role without a UID also fails closed.
  await deny(()=>as('authenticated',null,()=>progress(leaderlessTask,80)),/Authentication required/);
  const [task] = await query('select status,progress from public.tasks where id=$1',[leaderlessTask]);
  assert.deepEqual(task,{status:'new',progress:0});
});

test('new functions require explicit client grants',async()=>{
  await db.exec('create function public.qa_future_function() returns int language sql as $$select 1$$');
  try {
    for(const role of ['anon','authenticated']) {
      assert.equal((await query("select has_function_privilege($1,'public.qa_future_function()','execute') as allowed",[role]))[0].allowed,false);
    }
  } finally { await db.exec('drop function public.qa_future_function()'); }
});

test('user-editable metadata does not grant supervisor and profiles cannot self-promote',async()=>{
  assert.equal((await query('select role from public.profiles where id=$1',[ids.employee]))[0].role,'employee');
  assert.equal((await authenticated(ids.employee,()=>query("update public.profiles set role='supervisor' where id=$1 returning id",[ids.employee]))).length,0);
});

test('only supervisor and task leader change global progress/status',async()=>{
  await deny(()=>authenticated(ids.employee,()=>status(sharedTask,'in_progress')),/Leader or supervisor only/);
  await deny(()=>authenticated(ids.employee,()=>progress(sharedTask,90)),/Leader or supervisor only/);
  await deny(()=>authenticated(ids.editor,()=>progress(sharedTask,90)),/Leader or supervisor only/);
  await deny(()=>authenticated(ids.employee,()=>createTask('Unauthorized task',[ids.employee])),/Supervisor only/);
  await authenticated(ids.leader,()=>status(sharedTask,'in_progress'));
  await authenticated(ids.leader,()=>progress(sharedTask,40));
  await authenticated(ids.supervisor,()=>progress(leaderlessTask,15));
});

test('personal progress is independent and cannot update teammates',async()=>{
  await authenticated(ids.employee,()=>query("update public.task_assignments set status='completed',progress=100 where task_id=$1 and user_id=$2",[sharedTask,ids.employee]));
  assert.equal((await authenticated(ids.employee,()=>query('update public.task_assignments set progress=99 where task_id=$1 and user_id=$2 returning user_id',[sharedTask,ids.leader]))).length,0);
  assert.equal((await query('select progress from public.tasks where id=$1',[sharedTask]))[0].progress,40);
  assert.equal((await query('select progress from public.task_assignments where task_id=$1 and user_id=$2',[sharedTask,ids.leader]))[0].progress,0);
});

test('shared notes and teammate progress stay inside shared tasks',async()=>{
  await authenticated(ids.leader,()=>query('insert into public.task_notes(task_id,author_id,body) values($1,$2,$3)',[sharedTask,ids.leader,'Synthetic shared note']));
  assert.equal((await authenticated(ids.employee,()=>query('select id from public.task_notes where task_id=$1',[sharedTask]))).length,1);
  assert.equal((await authenticated(ids.employee,()=>query('select user_id from public.task_assignments where task_id=$1',[sharedTask]))).length,2);
  assert.equal((await authenticated(ids.editor,()=>query('select id from public.task_notes where task_id=$1',[sharedTask]))).length,0);
  assert.equal((await authenticated(ids.employee,()=>query('select id from public.tasks where id=$1',[otherTask]))).length,0);
  await deny(()=>authenticated(ids.editor,()=>query('insert into public.task_notes(task_id,author_id,body) values($1,$2,$3)',[sharedTask,ids.editor,'Unauthorized note'])),/row-level security/);
});

test('only supervisor closes after review; done and expired remain distinct',async()=>{
  await deny(()=>authenticated(ids.leader,()=>status(sharedTask,'done')),/Supervisor approval required/);
  await deny(()=>authenticated(ids.supervisor,()=>status(sharedTask,'done')),/Task must first await review/);
  await authenticated(ids.leader,()=>status(sharedTask,'awaiting_review'));
  await deny(()=>authenticated(ids.leader,()=>progress(sharedTask,95)),/Pending supervisor review/);
  await authenticated(ids.supervisor,()=>status(sharedTask,'in_progress','Please review the synthetic checklist'));
  await authenticated(ids.leader,()=>status(sharedTask,'awaiting_review'));
  await authenticated(ids.supervisor,()=>status(sharedTask,'done'));
  await authenticated(ids.supervisor,()=>status(otherTask,'expired','Synthetic local expiry'));
  assert.equal((await query('select status from public.tasks where id=$1',[sharedTask]))[0].status,'done');
  assert.equal((await query('select status from public.tasks where id=$1',[otherTask]))[0].status,'expired');
  await deny(()=>authenticated(ids.supervisor,()=>progress(sharedTask,20)),/Closed task/);
  await deny(()=>authenticated(ids.employee,()=>query('update public.task_assignments set progress=0 where task_id=$1 and user_id=$2',[sharedTask,ids.employee])),/Closed task is read-only/);
  assert.ok((await query('select id from public.task_activity where task_id=$1',[sharedTask])).length>0);
});

test('public articles/links work without anonymous helper execution; publishing remains supervised',async()=>{
  article = (await authenticated(ids.editor,()=>query("insert into public.articles(slug,title_ar,status,author_id) values('local-qa-draft','مقال اختبار','draft',$1) returning id",[ids.editor])))[0].id;
  assert.equal((await as('anon',null,()=>query('select id from public.articles'))).length,0);
  await deny(()=>authenticated(ids.editor,()=>query("update public.articles set status='published' where id=$1",[article])),/Supervisor approval/);
  await authenticated(ids.editor,()=>query("update public.articles set status='review' where id=$1",[article]));
  await authenticated(ids.supervisor,()=>query("update public.articles set status='published' where id=$1",[article]));
  assert.equal((await as('anon',null,()=>query('select id from public.articles'))).length,1);
  await authenticated(ids.supervisor,()=>query("insert into public.useful_links(name_ar,href,is_published) values('ظاهر','https://example.com',true),('مخفي','https://example.org',false)"));
  assert.equal((await as('anon',null,()=>query('select id from public.useful_links'))).length,1);
});

test('trigger-only and cron functions cannot be called by clients',async()=>{
  for(const role of ['anon','authenticated']) {
    for(const name of ['on_auth_user_created','lock_assignment_columns','task_history_after_update','article_approval_guard','prevent_notification_rewrite','log_assignment_change','enqueue_due_reminders']) {
      assert.equal((await query('select has_function_privilege($1,$2,$3) as allowed',[role,`public.${name}()`,'execute']))[0].allowed,false,`${role}:${name}`);
    }
  }
  assert.equal((await query("select has_function_privilege('service_role','public.enqueue_due_reminders()','execute') as allowed"))[0].allowed,true);
});

test('closed tasks reject direct note and checklist writes',async()=>{
 await deny(()=>authenticated(ids.leader,()=>query('insert into public.task_notes(task_id,author_id,body) values($1,$2,$3)',[sharedTask,ids.leader,'Closed task append'])),/Closed task is read-only/);
 await deny(()=>authenticated(ids.supervisor,()=>query('insert into public.task_steps(task_id,title) values($1,$2)',[sharedTask,'Closed task checklist'])),/Closed task is read-only/);
});
test('production gates deny unscanned uploads and direct enquiry spam',async()=>{
 await deny(()=>as('anon',null,()=>query("insert into public.contact_enquiries(name,email,message) values('Local QA','local@example.invalid','Synthetic local enquiry')")),/permission denied/);
 await deny(()=>authenticated(ids.employee,()=>query("insert into storage.objects(bucket_id,name) values('task-ops',$1)",[`${leaderlessTask}/${ids.employee}/test.pdf`])),/row-level security/);
});

test('MFA is enforced for direct table reads and leader RPCs, including enrolled-user AAL1 sessions',async()=>{
 await query("select set_config('request.jwt.claim.aal','aal1',false)");
 try {
  assert.equal((await authenticated(ids.supervisor,()=>query('select id from public.tasks'))).length,0);
  assert.equal((await authenticated(ids.employee,()=>query('select id from public.profiles'))).length,0);
  await deny(()=>authenticated(ids.leader,()=>progress(leaderlessTask,10)),/MFA required/);
  await deny(()=>authenticated(ids.supervisor,()=>status(leaderlessTask,'in_progress')),/MFA required/);
  assert.equal((await as('anon',null,()=>query("select id from public.articles where status='published'"))).length,1);
 } finally {await query("select set_config('request.jwt.claim.aal','aal2',false)");}
 assert.equal((await authenticated(ids.supervisor,()=>query('select id from public.tasks'))).length,3);
});
