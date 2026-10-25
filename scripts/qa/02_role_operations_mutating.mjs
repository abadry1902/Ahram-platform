// MUTATING TESTS — EXPLICIT OPT-IN, DISPOSABLE QA PROJECT ONLY.
// Creates fictitious tasks/articles and leaves them in the QA database for audit.
// Never run on production or a project containing real client data.
import assert from 'node:assert/strict';
import {cfg,validateConfig,loginAll,request,rest,rpc,check,summarize,expectRows,expectDenied,blocked} from './qa-helpers.mjs';

validateConfig({mutating:true});
const s=await loginAll();
const suffix=Date.now().toString(36);
const created={project_ref:cfg.projectRef,run_id:suffix,task_ids:[],article_ids:[]};
const as=(who,path,opts={})=>request(path,{...opts,jwt:s[who].jwt});
const q=(table,id,fields='id')=>rest(table,`select=${fields}&id=eq.${id}`);
async function makeTask(title,assignees,leader){
 const r=await rpc('create_task_secure',{
  p_title:title,p_description:'QA fictitious operational task',p_priority:'medium',p_due_at:null,
  p_assignee_ids:assignees,p_leader_id:leader
 },s.supervisor.jwt);
 assert.ok(r.ok,`Supervisor task create failed: ${r.status} ${JSON.stringify(r.data)}`);
 assert.match(String(r.data),/^[0-9a-f-]{36}$/i);
 created.task_ids.push(r.data);return r.data;
}
const run=async(name,fn)=>check(name,fn);
let privateTask,sharedTask,expiredTask,articleId;
await run('Supervisor can create A-only task',async()=>{
 privateTask=await makeTask(`QA-AHRAM-A-ONLY-${suffix}`,[s.employeeA.id],s.employeeA.id);
});
if(privateTask){
 await run('Employee A can read assigned task',async()=>{
  expectRows(await as('employeeA',q('tasks',privateTask)),1,'A own task');
 });
 await run('Employee B cannot read A-only task by direct ID',async()=>{
  const r=await as('employeeB',q('tasks',privateTask));
  expectDenied(r,'B sees unrelated task');
 });
 await run('Editor cannot read A-only task',async()=>{
  const r=await as('editor',q('tasks',privateTask));
  expectDenied(r,'Editor sees unrelated task');
 });
 await run('Non-member B cannot update global status by RPC',async()=>{
  expectDenied(await rpc('set_task_status_secure',{p_task_id:privateTask,p_status:'in_progress',p_reason:null},s.employeeB.jwt),'B global status');
 });
 await run('Leader A can start assigned task',async()=>{
  const r=await rpc('set_task_status_secure',{p_task_id:privateTask,p_status:'in_progress',p_reason:null},s.employeeA.jwt);
  assert.ok(r.ok,JSON.stringify(r.data));
 });
 await run('Leader A can change global progress',async()=>{
  const r=await rpc('set_overall_progress_secure',{p_task_id:privateTask,p_progress:37},s.employeeA.jwt);
  assert.ok(r.ok,JSON.stringify(r.data));
 });
 await run('B cannot change global progress by RPC',async()=>{
  expectDenied(await rpc('set_overall_progress_secure',{p_task_id:privateTask,p_progress:99},s.employeeB.jwt),'B global progress');
 });
 await run('Direct REST update of task is not allowed to employee A',async()=>{
  const r=await as('employeeA',rest('tasks',`id=eq.${privateTask}&select=id,progress`),
   {method:'PATCH',headers:{Prefer:'return=representation'},body:{progress:99}});
  expectDenied(r,'direct task update');
  const v=await as('supervisor',q('tasks',privateTask,'id,progress'));
  expectRows(v,1,'supervisor task check');assert.equal(v.data[0].progress,37);
 });
} else blocked('A-only task dependent cases');
await run('Employee A cannot create tasks via RPC',async()=>{
 expectDenied(await rpc('create_task_secure',{
  p_title:`QA-AHRAM-ILLEGAL-${suffix}`,p_description:'should fail',p_priority:'low',p_due_at:null,
  p_assignee_ids:[s.employeeA.id],p_leader_id:s.employeeA.id
 },s.employeeA.jwt),'employee create');
});
await run('Employee cannot self-promote via profiles REST',async()=>{
 const r=await as('employeeA',rest('profiles',`id=eq.${s.employeeA.id}&select=id,role`),
  {method:'PATCH',headers:{Prefer:'return=representation'},body:{role:'supervisor'}});
 expectDenied(r,'self promotion');
 const v=await as('supervisor',q('profiles',s.employeeA.id,'id,role'));
 expectRows(v,1,'verify unchanged role');assert.equal(v.data[0].role,'employee');
});
await run('Supervisor can create shared task for A+B',async()=>{
 sharedTask=await makeTask(`QA-AHRAM-SHARED-${suffix}`,[s.employeeA.id,s.employeeB.id],s.employeeA.id);
});
if(sharedTask){
 await run('Both assigned employees can read shared task',async()=>{
  expectRows(await as('employeeA',q('tasks',sharedTask)),1,'A shared');
  expectRows(await as('employeeB',q('tasks',sharedTask)),1,'B shared');
 });
 await run('Employee A posts shared note; B reads it',async()=>{
  const body=`QA-AHRAM note ${suffix}`;
  const ins=await as('employeeA',rest('task_notes','select=id'),{method:'POST',headers:{Prefer:'return=representation'},body:{task_id:sharedTask,author_id:s.employeeA.id,body}});
  assert.ok(ins.ok,JSON.stringify(ins.data));
  const r=await as('employeeB',rest('task_notes',`select=id,body&task_id=eq.${sharedTask}`));
  assert.ok(r.ok && r.data.some(n=>n.body===body),'B cannot see shared note');
 });
 await run('Editor cannot see shared task notes',async()=>{
  const r=await as('editor',rest('task_notes',`select=id&task_id=eq.${sharedTask}`));
  expectDenied(r,'Editor sees unrelated notes');
 });
 await run('B can update own personal progress',async()=>{
  const r=await as('employeeB',rest('task_assignments',`task_id=eq.${sharedTask}&user_id=eq.${s.employeeB.id}&select=user_id,progress`),
   {method:'PATCH',headers:{Prefer:'return=representation'},body:{progress:44}});
  assert.ok(r.ok && r.data.length===1 && r.data[0].progress===44,JSON.stringify(r.data));
 });
 await run('A cannot update B personal progress',async()=>{
  const r=await as('employeeA',rest('task_assignments',`task_id=eq.${sharedTask}&user_id=eq.${s.employeeB.id}&select=user_id,progress`),
   {method:'PATCH',headers:{Prefer:'return=representation'},body:{progress:98}});
  expectDenied(r,'A modifies B progress');
  const v=await as('supervisor',rest('task_assignments',`select=user_id,progress&task_id=eq.${sharedTask}&user_id=eq.${s.employeeB.id}`));
  expectRows(v,1,'B unchanged');assert.equal(v.data[0].progress,44);
 });
 await run('B personal pause requires reason',async()=>{
  const r=await as('employeeB',rest('task_assignments',`task_id=eq.${sharedTask}&user_id=eq.${s.employeeB.id}&select=user_id`),
   {method:'PATCH',headers:{Prefer:'return=representation'},body:{status:'paused',pause_reason:'no'}});
  expectDenied(r,'short personal pause');
 });
 await run('B personal pause with reason does not pause global task',async()=>{
  const r=await as('employeeB',rest('task_assignments',`task_id=eq.${sharedTask}&user_id=eq.${s.employeeB.id}&select=status`),
   {method:'PATCH',headers:{Prefer:'return=representation'},body:{status:'paused',pause_reason:'QA reason: waiting for test review'}});
  assert.ok(r.ok && r.data?.[0]?.status==='paused',JSON.stringify(r.data));
  const t=await as('supervisor',q('tasks',sharedTask,'id,status'));
  expectRows(t,1,'global state');assert.equal(t.data[0].status,'new');
 });
 await run('Leader starts and submits task for review',async()=>{
  for(const state of ['in_progress','awaiting_review']){
   const r=await rpc('set_task_status_secure',{p_task_id:sharedTask,p_status:state,p_reason:null},s.employeeA.jwt);
   assert.ok(r.ok,`Could not set ${state}: ${JSON.stringify(r.data)}`);
  }
 });
 await run('Leader cannot approve done',async()=>{
  expectDenied(await rpc('set_task_status_secure',{p_task_id:sharedTask,p_status:'done',p_reason:null},s.employeeA.jwt),'leader close');
 });
 await run('Supervisor approves done from awaiting_review',async()=>{
  const r=await rpc('set_task_status_secure',{p_task_id:sharedTask,p_status:'done',p_reason:null},s.supervisor.jwt);
  assert.ok(r.ok,JSON.stringify(r.data));
  const v=await as('supervisor',q('tasks',sharedTask,'id,status,progress'));
  expectRows(v,1,'closed task');assert.equal(v.data[0].status,'done');assert.equal(v.data[0].progress,100);
 });
 await run('Closed task rejects further status changes',async()=>{
  expectDenied(await rpc('set_task_status_secure',{p_task_id:sharedTask,p_status:'in_progress',p_reason:null},s.supervisor.jwt),'closed immutable');
 });
} else blocked('Shared task dependent cases');
await run('Supervisor can create task for expired closure',async()=>{
 expiredTask=await makeTask(`QA-AHRAM-EXPIRED-${suffix}`,[s.employeeA.id],s.employeeA.id);
});
if(expiredTask){
 await run('Expired closure requires a reason',async()=>{
  expectDenied(await rpc('set_task_status_secure',{p_task_id:expiredTask,p_status:'expired',p_reason:'bad'},s.supervisor.jwt),'expiry reason');
 });
 await run('Supervisor can close expired with reason, distinct from done',async()=>{
  const r=await rpc('set_task_status_secure',{p_task_id:expiredTask,p_status:'expired',p_reason:'QA expired for test validation'},s.supervisor.jwt);
  assert.ok(r.ok,JSON.stringify(r.data));
  const v=await as('supervisor',q('tasks',expiredTask,'id,status,closure_reason'));
  expectRows(v,1,'expired task');assert.equal(v.data[0].status,'expired');
 });
} else blocked('Expired-task dependent cases');
await run('Content editor can create draft article',async()=>{
 const slug=`qa-ahram-article-${suffix}`;
 const r=await as('editor',rest('articles','select=id,status'),{
  method:'POST',headers:{Prefer:'return=representation'},
  body:{slug,category:'qa',title_ar:'مقال اختبار الأهرام القانوني',title_en:'QA article',
    excerpt_ar:'محتوى اختباري فقط',body_ar:'هذا محتوى اختباري وهمي لغرض التحقق من الصلاحيات فقط.',
    body_en:'QA-only content.',author_id:s.editor.id,status:'draft'}
 });
 assert.ok(r.ok && r.data?.[0]?.id,JSON.stringify(r.data));
 articleId=r.data[0].id;created.article_ids.push(articleId);
});
if(articleId){
 await run('Anonymous cannot read draft',async()=>{
  const r=await request(q('articles',articleId,'id,status'));
  expectDenied(r,'Anonymous sees draft');
 });
 await run('Editor can submit draft for review',async()=>{
  const r=await as('editor',rest('articles',`id=eq.${articleId}&select=id,status`),
   {method:'PATCH',headers:{Prefer:'return=representation'},body:{status:'review'}});
  assert.ok(r.ok && r.data?.[0]?.status==='review',JSON.stringify(r.data));
 });
 await run('Editor cannot publish article',async()=>{
  const r=await as('editor',rest('articles',`id=eq.${articleId}&select=id,status`),
   {method:'PATCH',headers:{Prefer:'return=representation'},body:{status:'published'}});
  expectDenied(r,'editor publish');
 });
 await run('Supervisor can publish reviewed article',async()=>{
  const r=await as('supervisor',rest('articles',`id=eq.${articleId}&select=id,status`),
   {method:'PATCH',headers:{Prefer:'return=representation'},body:{status:'published'}});
  assert.ok(r.ok && r.data?.[0]?.status==='published',JSON.stringify(r.data));
 });
 await run('Anonymous can read published article',async()=>{
  expectRows(await request(q('articles',articleId,'id,status')),1,'published article');
 });
} else blocked('Article dependent cases');
console.log('\nQA DATA CREATED — SAVE IDS FOR MANUAL CLEANUP (NO SECRETS):',JSON.stringify(created,null,2));
summarize();
