// No application-record writes. Auth sign-in creates sessions/audit events; this is not a zero-write database audit.
import assert from 'node:assert/strict';
import {validateConfig,loginAll,request,rest,check,summarize,expectRows,expectDenied} from './qa-helpers.mjs';

validateConfig();
const sessions=await loginAll();
const expected={supervisor:'supervisor',employeeA:'employee',employeeB:'employee',editor:'content_editor'};
for(const [role,session] of Object.entries(sessions)){
 await check(`Auth login & ${role} profile role`,async()=>{
   const r=await request(rest('profiles',`select=id,role&id=eq.${session.id}`),{jwt:session.jwt});
   expectRows(r,1,role);assert.equal(r.data[0].role,expected[role]);
 });
}
await check('Anonymous cannot list staff profiles',async()=>{
 const r=await request(rest('profiles','select=id,role&limit=10'));
 expectDenied(r,'Anonymous profile data exposed');
});
await check('Anonymous cannot read tasks',async()=>{
 const r=await request(rest('tasks','select=id&limit=10'));
 expectDenied(r,'Anonymous task data exposed');
});
await check('Anonymous cannot read task notes',async()=>{
 const r=await request(rest('task_notes','select=id&limit=10'));
 expectDenied(r,'Anonymous note data exposed');
});
await check('Anonymous cannot read contact enquiries',async()=>{
 const r=await request(rest('contact_enquiries','select=id&limit=10'));
 expectDenied(r,'Anonymous enquiry data exposed');
});
await check('Anonymous sees only published articles',async()=>{
 const r=await request(rest('articles','select=id,status&status=neq.published&limit=1'));
 expectRows(r,0,'Anonymous draft/review filter');
});
await check('Anonymous sees only published useful links',async()=>{
 const r=await request(rest('useful_links','select=id,is_published&is_published=eq.false&limit=1'));
 expectRows(r,0,'Anonymous unpublished-link filter');
});
await check('Employee A can read own profile (not a cross-user isolation test)',async()=>{
 // Cross-user isolation requires controlled task fixtures in the mutating suite.
 const r=await request(rest('profiles',`select=id,role&id=eq.${sessions.employeeA.id}`),{jwt:sessions.employeeA.jwt});
 expectRows(r,1,'employee own profile');
});
summarize();
