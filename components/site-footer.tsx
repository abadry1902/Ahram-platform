import Link from "next/link";
import {Brand} from "@/components/brand";
import type {Locale} from "@/lib/i18n";
import {localize} from "@/lib/i18n";
export function SiteFooter({locale}:{locale:Locale}){
 return <footer className="foot"><div className="container"><div className="foot-grid">
 <div><Brand href={`/${locale}`}/><p>{localize(locale,"خدمة قانونية قائمة على الوضوح والاهتمام بكل التفاصيل.","Legal guidance built on clarity and attention to detail.")}</p><small>{localize(locale,"المعلومات المنشورة للتوعية العامة ولا تُعد استشارة قانونية.","Published content is general information, not specific legal advice.")}</small></div>
 <div><b>{localize(locale,"استكشف","Explore")}</b><p><Link href={`/${locale}/services`}>{localize(locale,"الخدمات","Services")}</Link></p><p><Link href={`/${locale}/articles`}>{localize(locale,"المقالات","Articles")}</Link></p><p><Link href={`/${locale}/links`}>{localize(locale,"الروابط المهمة","Useful Links")}</Link></p></div>
 <div><b>{localize(locale,"تواصل معنا","Contact")}</b><p><Link href={`/${locale}/contact`}>{localize(locale,"طلب استشارة","Request a consultation")}</Link></p><p><Link href="/login">{localize(locale,"دخول الفريق","Staff login")}</Link></p></div>
 </div><hr style={{borderColor:"#ffffff24",marginTop:25}}/><small>© {new Date().getFullYear()} AL AHRAM Legal Consultancy</small></div></footer>
}
