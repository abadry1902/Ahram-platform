import test from 'node:test';
import assert from 'node:assert/strict';
import {cfg,signIn} from './qa-helpers.mjs';

const userId='10000000-0000-4000-8000-000000000001';
const factorId='10000000-0000-4000-8000-000000000002';
const token=(aal='aal1',extra={})=>'test.'+Buffer.from(JSON.stringify({sub:userId,aal,exp:Math.floor(Date.now()/1000)+600,...extra})).toString('base64url')+'.test';
const login=()=>({access_token:token(),user:{id:userId,factors:[{id:factorId,factor_type:'totp',status:'verified'}]}});
async function withResponses(responses,run){
 const previousFetch=globalThis.fetch,previousCfg=structuredClone(cfg),calls=[];
 Object.assign(cfg,{url:'https://syntheticqa.supabase.co',key:'sb_publishable_synthetic_only'});
 globalThis.fetch=async(url,options)=>{
  calls.push({path:new URL(url).pathname,method:options.method,body:options.body?JSON.parse(options.body):undefined,headers:options.headers});
  assert.ok(responses.length,'Unexpected extra request');
  const {status=200,data}=responses.shift();
  return new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json'}});
 };
 try {await run(calls);} finally {globalThis.fetch=previousFetch;Object.assign(cfg,previousCfg);}
}

test('QA MFA challenges and verifies an existing factor, then validates the upgraded token with GoTrue',async()=>{
 const upgraded=token('aal2');
 await withResponses([{data:login()},{data:{id:'challenge'}},{data:{access_token:upgraded}},{data:{id:userId}}],async calls=>{
  const session=await signIn('qa@example.invalid','synthetic',{codeProvider:async()=> '123456'});
  assert.deepEqual(session,{id:userId,jwt:upgraded});
  assert.deepEqual(calls.map(c=>c.path),['/auth/v1/token',`/auth/v1/factors/${factorId}/challenge`,`/auth/v1/factors/${factorId}/verify`,'/auth/v1/user']);
  assert.deepEqual(calls[2].body,{challenge_id:'challenge',code:'123456'});
  assert.equal(calls[3].headers.Authorization,`Bearer ${upgraded}`);
 });
});
test('password-only fixtures cannot pass QA and do not enroll factors automatically',async()=>{
 const data=login();data.user.factors=[];
 await withResponses([{data}],async calls=>{
  await assert.rejects(signIn('qa@example.invalid','synthetic'),/verified TOTP/);
  assert.equal(calls.length,1);
 });
});
test('multiple verified factors require explicit selection',async()=>{
 const data=login();data.user.factors.push({...data.user.factors[0],id:userId});
 await withResponses([{data}],async()=>assert.rejects(signIn('qa@example.invalid','synthetic'),/one selected/));
});
test('invalid OTP is rejected before verification and never included in error messages',async()=>{
 await withResponses([{data:login()},{data:{id:'challenge'}}],async()=>{
  await assert.rejects(signIn('qa@example.invalid','synthetic',{codeProvider:async()=> 'sensitive-input'}),e=>/six-digit/.test(e.message)&&!e.message.includes('sensitive-input'));
 });
});
test('MFA failure stays a failure and sensitive API error bodies are omitted',async()=>{
 await withResponses([{data:login()},{data:{id:'challenge'}},{status:422,data:{message:'sensitive-server-response'}}],async()=>{
  await assert.rejects(signIn('qa@example.invalid','synthetic',{codeProvider:async()=> '123456'}),e=>/422/.test(e.message)&&!e.message.includes('sensitive-server-response'));
 });
});
test('unverified, expired or identity-swapped upgraded tokens cannot pass QA',async()=>{
 for(const jwt of [token('aal1'),token('aal2',{exp:1}),token('aal2',{sub:factorId})]){
  await withResponses([{data:login()},{data:{id:'challenge'}},{data:{access_token:jwt}}],async()=>{
   await assert.rejects(signIn('qa@example.invalid','synthetic',{codeProvider:async()=> '123456'}));
  });
 }
});
test('local aal2 claims cannot pass when GoTrue rejects the final token',async()=>{
 await withResponses([{data:{access_token:token('aal2'),user:{id:userId}}},{status:401,data:{message:'invalid token'}}],async()=>{
  await assert.rejects(signIn('qa@example.invalid','synthetic'),/GoTrue/);
 });
});
