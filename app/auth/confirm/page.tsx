import {AuthPanel} from '@/components/auth-panel';
import {AuthFlow} from '@/components/auth-flow';
export const metadata={robots:{index:false,follow:false},referrer:'no-referrer' as const};
export default async function Page({searchParams}:{searchParams:Promise<{locale?:string;next?:string}>}){
 const query=await searchParams,locale=query.locale==='en'?'en':'ar';
 return <AuthPanel locale={locale} title={locale==='ar'?'تفعيل حسابك':'Activate your account'} description={locale==='ar'?'نتحقق من رابط الدعوة الآمن.':'Verifying your secure invitation.'}><AuthFlow mode="confirm" locale={locale} next={query.next==='setup'?'setup':'app'}/></AuthPanel>;
}
