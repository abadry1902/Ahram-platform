import test from 'node:test';
import assert from 'node:assert/strict';
import {cfg,validateConfig,validatePublicKey,expectDenied,expectRows} from './qa-helpers.mjs';

test('server failures and missing endpoints never pass authorization checks',()=>{
 for(const r of [
  {status:500,ok:false,data:{code:'XX000'}},
  {status:404,ok:false,data:{code:'PGRST202'}},
  {status:401,ok:false,data:{code:'PGRST301'}},
  {status:400,ok:false,data:{code:'23514'}},
  {status:403,ok:false,data:{message:'proxy error'}}
 ]) assert.throws(()=>expectDenied(r,'negative test'));
});
test('RLS empty rows and permission-denied codes are recognized',()=>{
 expectDenied({status:200,ok:true,data:[]},'filtered row');
 expectDenied({status:403,ok:false,data:{code:'42501'}},'RLS');
});
test('RPC guard errors are recognized but arbitrary application errors fail',()=>{
 expectDenied({status:400,ok:false,data:{code:'P0001',message:'Supervisor approval required'}},'closure');
 assert.throws(()=>expectDenied({status:400,ok:false,data:{code:'P0001',message:'database unavailable'}},'closure'));
});
test('successful writes and visible rows cannot masquerade as denial',()=>{
 for(const r of [{status:204,ok:true,data:null},{status:200,ok:true,data:null},{status:200,ok:true,data:[{id:'synthetic'}]}]) assert.throws(()=>expectDenied(r,'write'));
 assert.throws(()=>expectDenied({status:200,ok:true,data:[]},'RPC',{allowEmpty:false}));
});
test('positive checks require HTTP success and exact array cardinality',()=>{
 expectRows({status:200,ok:true,data:[{id:'synthetic'}]},1,'read');
 assert.throws(()=>expectRows({status:200,ok:true,data:[]},1,'read'));
 assert.throws(()=>expectRows({status:403,ok:false,data:[]},0,'read'));
});
test('public-key guard rejects service-role and secret keys',()=>{
 const fake=role=>'header.'+Buffer.from(JSON.stringify({role})).toString('base64url')+'.signature';
 validatePublicKey('sb_publishable_synthetic_test_only');
 validatePublicKey(fake('anon'));
 for(const key of ['sb_secret_synthetic_test_only',fake('service_role'),fake('authenticated'),'malformed']) assert.throws(()=>validatePublicKey(key));
});
test('configuration refuses wrong origin, duplicate accounts and missing write opt-in',()=>{
 const original=structuredClone(cfg), purpose=process.env.QA_PROJECT_PURPOSE,mutation=process.env.QA_MUTATION_CONFIRM;
 try {
  Object.assign(cfg,{url:'https://syntheticqa.supabase.co',key:'sb_publishable_synthetic_test_only',projectRef:'syntheticqa',users:Object.fromEntries(['supervisor','employeeA','employeeB','editor'].map(r=>[r,[r+'@example.invalid','synthetic']]))});
  process.env.QA_PROJECT_PURPOSE='AL_AHRAM_DISPOSABLE_QA';delete process.env.QA_MUTATION_CONFIRM;
  validateConfig();assert.throws(()=>validateConfig({mutating:true}));
  cfg.url='https://unrelated.supabase.co';assert.throws(()=>validateConfig());
  cfg.url='https://syntheticqa.supabase.co?token=synthetic';assert.throws(()=>validateConfig());
  cfg.url='https://syntheticqa.supabase.co';cfg.users.employeeB=cfg.users.employeeA;assert.throws(()=>validateConfig());
 } finally {
  Object.assign(cfg,original);
  for(const [key,value] of [['QA_PROJECT_PURPOSE',purpose],['QA_MUTATION_CONFIRM',mutation]]) {if(value===undefined) delete process.env[key];else process.env[key]=value;}
 }
});
