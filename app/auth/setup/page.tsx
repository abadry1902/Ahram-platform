import {AuthPanel} from '@/components/auth-panel';
import {AuthFlow} from '@/components/auth-flow';
export const metadata={robots:{index:false,follow:false},referrer:'no-referrer' as const};
export default async function Page({searchParams}:{searchParams:Promise<{locale?:string;next?:string}>}){
 const query=await searchParams,locale=query.locale==='en'?'en':'ar';
 return <AuthPanel locale={locale} title={locale==='ar'?'كلمة مرور لحسابك':'Set your password'} description={locale==='ar'?'اختر كلمة مرور قوية وخاصة بك.':'Choose a strong password that is unique to you.'}><AuthFlow mode="setup" locale={locale} next={query.next==='setup'?'setup':'app'}/></AuthPanel>;
}
