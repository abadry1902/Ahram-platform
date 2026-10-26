// AL AHRAM QA integration helpers. Native Node 20+ fetch; no service-role key.
import assert from 'node:assert/strict';
import {createInterface} from 'node:readline/promises';
import {Writable} from 'node:stream';

export const cfg = {
  url: (process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/$/, ''),
  key: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
  projectRef: process.env.QA_PROJECT_REF || '',
  users: {
    supervisor: [process.env.QA_SUPERVISOR_EMAIL, process.env.QA_SUPERVISOR_PASSWORD],
    employeeA: [process.env.QA_EMPLOYEE_A_EMAIL, process.env.QA_EMPLOYEE_A_PASSWORD],
    employeeB: [process.env.QA_EMPLOYEE_B_EMAIL, process.env.QA_EMPLOYEE_B_PASSWORD],
    editor: [process.env.QA_EDITOR_EMAIL, process.env.QA_EDITOR_PASSWORD]
  }
};

export function validateConfig({mutating = false} = {}) {
  assert.ok(cfg.url && cfg.key && cfg.projectRef, 'QA URL, public key and QA_PROJECT_REF required');
  const u = new URL(cfg.url);
  assert.equal(u.protocol, 'https:', 'Only HTTPS Supabase QA projects are supported');
  assert.equal(u.hostname, `${cfg.projectRef}.supabase.co`, 'QA_PROJECT_REF must match Supabase host exactly');
  assert.notEqual(cfg.projectRef, 'tfidmxlaugqcwskanmxk', 'The live AL AHRAM project cannot be used for synthetic QA');
  assert.ok(!u.username && !u.password && !u.port && !u.search && !u.hash && u.pathname==='/', 'QA URL must contain only the project origin');
  assert.equal(process.env.QA_PROJECT_PURPOSE, 'AL_AHRAM_DISPOSABLE_QA', 'Explicit dedicated QA purpose declaration required');
  // A name or ref cannot prove that a project is non-production. Owner approval is still required.
  validatePublicKey(cfg.key);
  const emails=[];
  for (const [role, [email, pass]] of Object.entries(cfg.users)) {
    assert.ok(email && pass, `Missing ${role} QA login credentials`);
    emails.push(email.trim().toLowerCase());
  }
  assert.equal(new Set(emails).size, 4, 'Four distinct QA accounts are required');
  if (mutating) {
    assert.equal(process.env.QA_MUTATION_CONFIRM, 'YES_DISPOSABLE_QA_ONLY',
      'Mutating tests are disabled. Explicitly authorize a disposable QA project first.');
  }
}

export function validatePublicKey(key) {
  assert.ok(typeof key==='string' && key.length>0, 'A public Supabase key is required');
  if(key.startsWith('sb_publishable_')) return;
  assert.ok(!key.startsWith('sb_secret_'), 'Secret keys are forbidden in QA client tests');
  let claims;
  try {claims=JSON.parse(Buffer.from(key.split('.')[1]||'', 'base64url').toString());} catch {throw Error('Expected a publishable key or legacy anon JWT');}
  assert.equal(claims.role, 'anon', 'Only legacy anon JWT keys are allowed; service-role keys are forbidden');
}

export async function request(path, {method='GET', jwt, body, headers={}} = {}) {
  const h = {apikey:cfg.key, ...(jwt?{Authorization:`Bearer ${jwt}`}:(cfg.key.startsWith('sb_publishable_')?{}:{Authorization:`Bearer ${cfg.key}`})), ...headers};
  if (body !== undefined) h['Content-Type'] = 'application/json';
  const response = await fetch(`${cfg.url}${path}`, {method, headers:h, body:body===undefined?undefined:JSON.stringify(body), signal:AbortSignal.timeout(20000),redirect:'error'});
  const raw = await response.text();
  let data; try {data=raw?JSON.parse(raw):null;} catch {data=raw;}
  return {status:response.status, ok:response.ok, data};
}

async function promptMfaCode() {
  assert.ok(process.stdin.isTTY, 'MFA requires an interactive terminal or an explicit codeProvider for an isolated QA runner');
  // Never echo or persist OTPs. This uses an existing verified factor; it does not enroll one.
  const silentOutput=new Writable({write(_chunk,_encoding,callback){callback();}});
  const input=createInterface({input:process.stdin,output:silentOutput,terminal:true});
  process.stderr.write('Enter the current code for this QA account (hidden): ');
  try { return (await input.question('')).trim(); }
  finally { input.close();process.stderr.write('\n'); }
}

export async function signIn(email, password, {codeProvider=promptMfaCode, factorId}={}) {
  const r=await request('/auth/v1/token?grant_type=password', {method:'POST',body:{email,password}});
  assert.ok(r.ok && r.data?.access_token && r.data?.user?.id, `QA sign-in failed (HTTP ${r.status}); response body omitted to protect credentials`);
  let jwt=r.data.access_token;
  const decode=token=>{try{return JSON.parse(Buffer.from(token.split('.')[1],'base64url').toString());}catch{throw new Error('Invalid QA session token');}};
  if(decode(jwt).aal!=='aal2'){
    const factors=(r.data.user.factors||[]).filter(f=>f.factor_type==='totp'&&f.status==='verified'&&(!factorId||f.id===factorId));
    assert.equal(factors.length,1,'QA requires one selected, verified TOTP factor; enrollment must be completed before running tests');
    const factor=factors[0];
    assert.match(factor.id,/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i,'Invalid QA factor ID');
    const challenge=await request(`/auth/v1/factors/${factor.id}/challenge`,{method:'POST',jwt,body:{}});
    assert.ok(challenge.ok&&challenge.data?.id,`QA MFA challenge failed (HTTP ${challenge.status})`);
    const code=await codeProvider();
    assert.ok(typeof code==='string'&&/^\d{6}$/.test(code),'A six-digit MFA code is required');
    const verified=await request(`/auth/v1/factors/${factor.id}/verify`,{method:'POST',jwt,body:{challenge_id:challenge.data.id,code}});
    assert.ok(verified.ok&&verified.data?.access_token,`QA MFA verification failed (HTTP ${verified.status}); response body omitted`);
    jwt=verified.data.access_token;
  }
  const claims=decode(jwt);
  assert.equal(claims.aal,'aal2','QA requires MFA-verified sessions');
  assert.equal(claims.sub,r.data.user.id,'QA MFA must preserve the signed-in identity');
  assert.ok(Number.isFinite(claims.exp)&&claims.exp*1000>Date.now(),'QA session has expired');
  // Decoding claims alone does not verify a JWT. GoTrue validates the final token here.
  const user=await request('/auth/v1/user',{jwt});
  assert.ok(user.ok&&user.data?.id===r.data.user.id,'GoTrue did not validate the final QA session');
  return {jwt,id:r.data.user.id};
}

export async function loginAll() {
  const sessions={};
  for(const [role,[email,password]] of Object.entries(cfg.users)) {
    process.stderr.write(`Authenticating QA role: ${role}\n`);
    sessions[role]=await signIn(email,password);
  }
  assert.equal(new Set(Object.values(sessions).map(s=>s.id)).size,4,'Expected four distinct Auth identities');
  const expected={supervisor:'supervisor',employeeA:'employee',employeeB:'employee',editor:'content_editor'};
  for(const [role,session] of Object.entries(sessions)) {
    const r=await request(rest('profiles',`select=id,role&id=eq.${session.id}`),{jwt:session.jwt});
    expectRows(r,1,`${role} preflight`);
    assert.equal(r.data[0].role,expected[role],`${role} must have the expected role before any test writes`);
  }
  return sessions;
}

export function rest(table,query='') {return `/rest/v1/${table}${query?'?'+query:''}`;}
export function filterEq(column,value) {return `${column}=eq.${encodeURIComponent(value)}`;}
export function selectById(table,id,columns='*') {return rest(table,`select=${encodeURIComponent(columns)}&${filterEq('id',id)}`);}
export function rpc(name,body,jwt) {return request(`/rest/v1/rpc/${name}`,{method:'POST',jwt,body});}
export function expectRows(r, expected, label) {
  assert.ok(r.ok,`${label}: expected HTTP success; got ${r.status} ${JSON.stringify(r.data)}`);
  assert.ok(Array.isArray(r.data),`${label}: expected JSON array`);
  assert.equal(r.data.length,expected,`${label}: unexpected row count`);
}
export function expectDenied(r,label,{allowEmpty=true}={}) {
  const filtered=allowEmpty && r.status===200 && r.ok && Array.isArray(r.data) && r.data.length===0;
  // Server errors, missing RPCs/tables, invalid JWTs and validation errors must NEVER count as authorization success.
  const rls=[401,403].includes(r.status) && r.data?.code==='42501';
  const appGuard=r.status===400 && r.data?.code==='P0001' && /^(Supervisor only|Leader or supervisor only|Supervisor approval required|Only supervisor can return a review|Pending supervisor review|Closed tasks are immutable|Closed task|Closed task is read-only|Personal pause requires a reason|A reason is required|Review return requires a reason|Supervisor approval is required for publication)$/.test(r.data?.message||'');
  assert.ok(filtered || rls || appGuard,
    `${label}: no recognized authorization/guard denial (HTTP ${r.status}, code ${r.data?.code||'none'})`);
}
export const report=[];
export async function check(name,fn){
  try {await fn(); report.push({test:name,result:'PASS'});console.log('PASS',name);}
  catch(e){report.push({test:name,result:'FAIL',message:e.message});console.error('FAIL',name,'—',e.message);}
}
export function blocked(name){report.push({test:name,result:'BLOCKED',message:'A required fixture could not be created'});console.error('BLOCKED',name);}
export function summarize(){
  const failed=report.filter(x=>x.result==='FAIL');
  const blocked=report.filter(x=>x.result==='BLOCKED');
  console.log('\nQA RESULTS',JSON.stringify({passed:report.filter(x=>x.result==='PASS').length,failed:failed.length,blocked:blocked.length,checks:report},null,2));
  if(failed.length||blocked.length) process.exitCode=1;
}
