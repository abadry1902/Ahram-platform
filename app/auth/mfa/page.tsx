import {AuthPanel} from '@/components/auth-panel';
import {AuthFlow} from '@/components/auth-flow';
export const metadata={robots:{index:false,follow:false},referrer:'no-referrer' as const};
export default async function Page({searchParams}:{searchParams:Promise<{locale?:string;next?:string}>}){
 const query=await searchParams,locale=query.locale==='en'?'en':'ar';
 return <AuthPanel locale={locale} title={locale==='ar'?'تأكيد هويتك':'Verify your identity'} description={locale==='ar'?'استخدم تطبيق المصادقة لحماية مساحة العمل.':'Use an authenticator app to protect your workspace.'}><AuthFlow mode="mfa" locale={locale} next={query.next==='setup'?'setup':'app'}/></AuthPanel>;
}
