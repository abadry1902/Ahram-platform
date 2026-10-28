'use client';
import {useEffect,useRef,useState} from 'react';
import {browserClient} from '@/lib/supabase/browser';
import {Button,Input,Select} from '@/components/ui';
export function AuthFlow({mode,locale,next='app'}:{mode:'confirm'|'setup'|'mfa';locale:'ar'|'en';next?:'app'|'setup'}){
 const t=(ar:string,en:string)=>locale==='ar'?ar:en;
 const started=useRef(false);const [ready,setReady]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const [factors,setFactors]=useState<{id:string;friendly_name?:string}[]>([]),[factor,setFactor]=useState(''),[qr,setQr]=useState(''),[code,setCode]=useState('');
 const fail=()=>setError(t('تعذر إتمام الخطوة. أعد المحاولة أو تواصل مع إدارة المكتب.','Unable to complete this step. Try again or contact the office administrator.'));
 useEffect(()=>{if(started.current)return;started.current=true;
 void(async()=>{try{
 if(mode==='confirm'){
  const current=new URL(window.location.href),fragment=new URLSearchParams(current.hash.slice(1));
  const access=fragment.get('access_token'),refresh=fragment.get('refresh_token'),authCode=current.searchParams.get('code');
  // Remove one-time credentials from browser history immediately; never log them.
  window.history.replaceState(null,'',`/auth/confirm?locale=${locale}`);
  const db=browserClient();
  if(access&&refresh){const result=await db.auth.setSession({access_token:access,refresh_token:refresh});if(result.error)throw result.error;}
  else if(authCode){const result=await db.auth.exchangeCodeForSession(authCode);if(result.error)throw result.error;}
  else throw new Error('Missing invitation');
 }
 const db=browserClient();
 const {data,error:authError}=await db.auth.getUser();if(authError||!data.user){window.location.replace(`/login?locale=${locale}&error=session`);return;}
 if(mode==='confirm'){window.location.replace(`/auth/setup?locale=${locale}`);return;}
 const list=await db.auth.mfa.listFactors();if(list.error)throw list.error;
 const verified=list.data.totp.filter(f=>f.status==='verified');setFactors(verified);setFactor(verified[0]?.id||'');
 const assurance=await db.auth.mfa.getAuthenticatorAssuranceLevel();if(assurance.error)throw assurance.error;
 if(mode==='setup'&&verified.length&&assurance.data.currentLevel!=='aal2'){window.location.replace(`/auth/mfa?locale=${locale}&next=setup`);return;}
 if(mode==='mfa'&&assurance.data.currentLevel==='aal2'){window.location.replace(next==='setup'?`/auth/setup?locale=${locale}`:'/app');return;}
 setReady(true);
 }catch{fail();}})();
 // One initialization per mount prevents consuming invitation codes twice.
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[]);
 async function enroll(){setBusy(true);setError('');try{
 const result=await browserClient().auth.mfa.enroll({factorType:'totp',friendlyName:`AL AHRAM ${Date.now()}`,issuer:'AL AHRAM'});if(result.error)throw result.error;
 setFactor(result.data.id);setQr(result.data.totp.qr_code);
 }catch{fail();}finally{setBusy(false);}}
 async function submit(event:React.FormEvent<HTMLFormElement>){event.preventDefault();setBusy(true);setError('');try{
 const db=browserClient();
 if(mode==='setup'){
  const form=new FormData(event.currentTarget),password=String(form.get('password')||'');
  if(password.length<12||password.length>128||password!==form.get('confirm')){setError(t('استخدم 12 حرفًا على الأقل وتأكد من تطابق كلمتي المرور.','Use at least 12 characters and make sure both passwords match.'));return;}
  const result=await db.auth.updateUser({password});if(result.error)throw result.error;
  window.location.replace(`/auth/mfa?locale=${locale}`);
 }else{
  if(!factor||!/^\d{6}$/.test(code)){setError(t('أدخل رمز التحقق المكون من 6 أرقام.','Enter the six-digit verification code.'));return;}
  const result=await db.auth.mfa.challengeAndVerify({factorId:factor,code});if(result.error)throw result.error;
  setCode('');setQr('');window.location.replace(next==='setup'?`/auth/setup?locale=${locale}`:'/app');
 }
 }catch{fail();}finally{setBusy(false);}}
 return <>{error&&<div className="notice warning" role="alert">{error}</div>}{!ready&&!error&&<p role="status">{t('جارٍ التحقق من الجلسة…','Checking your session…')}</p>}{ready&&mode==='setup'&&<form onSubmit={submit}><div className="form-field"><label htmlFor="new-password">{t('كلمة المرور الجديدة','New password')}</label><Input id="new-password" name="password" type="password" autoComplete="new-password" minLength={12} maxLength={128} required dir="ltr"/></div><div className="form-field"><label htmlFor="confirm-password">{t('تأكيد كلمة المرور','Confirm password')}</label><Input id="confirm-password" name="confirm" type="password" autoComplete="new-password" minLength={12} maxLength={128} required dir="ltr"/></div><Button disabled={busy}>{t('حفظ ومتابعة التحقق','Save and continue')}</Button></form>}{ready&&mode==='mfa'&&<>{!factor&&<Button onClick={enroll} disabled={busy}>{t('إعداد تطبيق المصادقة','Set up authenticator app')}</Button>}{qr&&<div className="form-field"><p>{t('امسح الرمز بتطبيق المصادقة، ثم أدخل الرمز الذي يظهر فيه. احتفظ بالتطبيق لاستعماله عند الدخول.','Scan with your authenticator app, then enter its code. Keep access to the app for future sign-ins.')}</p><img src={qr} alt={t('رمز إعداد المصادقة الخاص بحسابك','Your private authenticator setup QR code')} width={220} height={220} style={{maxWidth:'100%',height:'auto',background:'white'}}/></div>}{factor&&<form onSubmit={submit}>{factors.length>1&&<div className="form-field"><label htmlFor="factor">{t('جهاز المصادقة','Authenticator')}</label><Select id="factor" value={factor} onChange={e=>setFactor(e.target.value)}>{factors.map((f,i)=><option key={f.id} value={f.id}>{f.friendly_name||`${t('جهاز','Device')} ${i+1}`}</option>)}</Select></div>}<div className="form-field"><label htmlFor="totp">{t('رمز التحقق','Verification code')}</label><Input id="totp" value={code} onChange={e=>setCode(e.target.value.replace(/\D/g,'').slice(0,6))} inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" minLength={6} maxLength={6} required dir="ltr"/></div><Button disabled={busy}>{t('تحقق ومتابعة','Verify and continue')}</Button></form>}</>}</>;
}
