// Real Auth/PostgREST integration. Disposable, isolated QA project only.
// Leaves synthetic tasks for audit; always attempts to restore the employee it disables.
import assert from 'node:assert/strict';
import {cfg,validateConfig,loginAll,request,rest,rpc,check,summarize,expectRows,expectDenied} from './qa-helpers.mjs';

validateConfig({mutating:true});
const sessions=await loginAll();
const runId=`QA-WORKSPACE-${Date.now().toString(36)}`;
const call=(role,name,body)=>rpc(name,body,sessions[role].jwt);
const read=(role,table,query)=>request(rest(table,query),{jwt:sessions[role].jwt});
const succeeds=(result,label)=>assert.ok(result.ok,`${label}: HTTP ${result.status}; code ${result.data?.code||'none'}`);
const created=await call('supervisor','create_task_secure',{
 p_title:runId,p_description:'Fictitious QA only',p_priority:'high',p_due_at:null,
 p_assignee_ids:[sessions.employeeA.id,sessions.employeeB.id],p_leader_id:sessions.employeeA.id
});
succeeds(created,'Create QA task');
const taskId=created.data;
assert.match(taskId,/^[0-9a-f-]{36}$/i);
await check('Employee completion updates only its assignment; shared task remains open at 50%',async()=>{
 succeeds(await call('employeeA','complete_unstaged_task_secure',{p_task:taskId,p_completed:true}),'Complete own assignment');
 const assignments=await read('supervisor','task_assignments',`select=user_id,progress&task_id=eq.${taskId}`);
 expectRows(assignments,2,'Assignments');
 assert.equal(assignments.data.find(a=>a.user_id===sessions.employeeA.id).progress,100);
 assert.equal(assignments.data.find(a=>a.user_id===sessions.employeeB.id).progress,0);
 const task=await read('supervisor','tasks',`select=progress,status&id=eq.${taskId}`);
 expectRows(task,1,'Shared task');assert.equal(task.data[0].progress,50);assert.equal(task.data[0].status,'new');
});
await check('Assignment notifications are isolated by recipient',async()=>{
 const mine=await read('employeeA','notifications',`select=id,user_id&task_id=eq.${taskId}`);
 assert.ok(mine.ok&&mine.data.length>0,'Expected an assignment notification');
 assert.ok(mine.data.every(n=>n.user_id===sessions.employeeA.id));
 expectDenied(await read('employeeB','notifications',`select=id&id=eq.${mine.data[0].id}`),'Other employee notification');
});
await check('Employee cannot delete task; supervisor deletion hides it and restoration preserves progress',async()=>{
 expectDenied(await call('employeeA','trash_task_secure',{p_task:taskId,p_restore:false}),'Employee delete',{allowEmpty:false});
 try{
  succeeds(await call('supervisor','trash_task_secure',{p_task:taskId,p_restore:false}),'Supervisor delete');
  expectDenied(await read('employeeA','tasks',`select=id&id=eq.${taskId}`),'Deleted task visibility');
  const page=await call('supervisor','task_page_v1',{f:{q:runId}});
  succeeds(page,'Filtered page');assert.equal(page.data.total,0);
 }finally{
  succeeds(await call('supervisor','trash_task_secure',{p_task:taskId,p_restore:true}),'Restore task');
 }
 const task=await read('employeeA','tasks',`select=id,progress&id=eq.${taskId}`);
 expectRows(task,1,'Restored task');assert.equal(task.data[0].progress,50);
});
await check('Disabling employee revokes existing JWT access; restoration reopens access',async()=>{
 try{
  succeeds(await call('supervisor','manage_team_member_secure',{p_member:sessions.employeeB.id,p_role:'employee',p_active:false}),'Disable QA employee');
  expectDenied(await read('employeeB','tasks',`select=id&id=eq.${taskId}`),'Disabled employee existing JWT');
  expectDenied(await call('employeeB','complete_unstaged_task_secure',{p_task:taskId,p_completed:true}),'Disabled employee RPC',{allowEmpty:false});
 }finally{
  succeeds(await call('supervisor','manage_team_member_secure',{p_member:sessions.employeeB.id,p_role:'employee',p_active:true}),'Restore QA employee');
 }
 expectRows(await read('employeeB','tasks',`select=id&id=eq.${taskId}`),1,'Restored employee');
});
await check('Report snapshot, filtered list and dashboard counts agree',async()=>{
 const f={q:runId};
 const page=await call('supervisor','task_page_v1',{f});
 const metrics=await call('supervisor','task_metrics_v1',{f});
 const exported=await call('supervisor','report_export_v1',{f,export_format:'xlsx'});
 for(const result of [page,metrics,exported])succeeds(result,'Analytics endpoint');
 assert.equal(page.data.total,1);assert.equal(metrics.data.total,page.data.total);
 assert.equal(exported.data.tasks.length,page.data.total);
 assert.equal(exported.data.report.metrics.total,page.data.total);
 expectDenied(await call('employeeA','report_export_v1',{f,export_format:'xlsx'}),'Employee report export',{allowEmpty:false});
});
await check('Employees cannot claim the server push queue',async()=>{
 expectDenied(await call('employeeA','claim_push_batch',{}),'Push queue',{allowEmpty:false});
});
console.log('QA fixture (no credentials):',JSON.stringify({project:cfg.projectRef,runId,taskId}));
summarize();
