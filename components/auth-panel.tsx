import Link from 'next/link';
import {Brand} from '@/components/brand';
import type {ReactNode} from 'react';
export function AuthPanel({title,description,locale,children}:{title:string;description:string;locale:'ar'|'en';children:ReactNode}){
 return <main className={`login-shell ${locale==='en'?'english':''}`} lang={locale} dir={locale==='ar'?'rtl':'ltr'}><div className="login-story"><Brand href={`/${locale}`} tone="dark"/><h2>{locale==='ar'?'مساحة آمنة لفريق الأهرام.':'A secure space for AL AHRAM.'}</h2><p>{locale==='ar'?'حسابات معتمدة، وصلاحيات واضحة، وخطوة تحقق إضافية لحماية عملك.':'Approved accounts, clear permissions and an extra verification step to protect your work.'}</p><img className="login-scene" src="/images/v4/architectural-journey.webp" alt=""/></div><div className="login-content"><section className="login-card"><span className="eyebrow">AL AHRAM · SECURITY</span><h1>{title}</h1><p className="muted">{description}</p>{children}<div className="login-back"><Link href={`/login?locale=${locale}`}>{locale==='ar'?'العودة للدخول':'Back to sign in'}</Link></div></section></div></main>;
}
