"use client";
import Link from "next/link";
import {usePathname} from "next/navigation";
import {Compass,ArrowLeft,RefreshCw} from "lucide-react";
import {Brand} from "./brand";
import {Button} from "./ui";
export function SystemState({kind,reset}:{kind:"missing"|"error";reset?:()=>void}){
 const path=usePathname(),locale=path.startsWith("/en")?"en":"ar",ar=locale==="ar";
 return <main className={`system-state ${ar?"":"english"}`} dir={ar?"rtl":"ltr"} lang={locale}><Brand href={`/${locale}`}/><section className="system-state-card"><div className="icon-tile"><Compass size={28}/></div><span className="eyebrow">{kind==="missing"?"404":"AL AHRAM"}</span><h1>{kind==="missing"?(ar?"لنعد إلى الطريق الصحيح.":"Let’s find your way back."):(ar?"تعذر إكمال هذه الخطوة.":"We couldn’t complete this step.")}</h1><p>{kind==="missing"?(ar?"الصفحة غير موجودة أو لم تعد متاحة. يمكنك العودة للرئيسية أو استكشاف المقالات.":"This page is unavailable or no longer exists. Return home or explore our insights."):(ar?"حدث خطأ أثناء عرض الصفحة. أعد المحاولة، أو ارجع إلى الصفحة الرئيسية.":"There was a problem displaying this page. Try again or return to the homepage.")}</p><div className="system-state-actions">{reset&&<Button onClick={reset}><RefreshCw size={18}/>{ar?"إعادة المحاولة":"Try again"}</Button>}<Link className="button alt" href={`/${locale}`}><ArrowLeft size={18}/>{ar?"الصفحة الرئيسية":"Go to homepage"}</Link><Link className="button outline" href={`/${locale}/articles`}>{ar?"تصفّح المقالات":"Explore insights"}</Link></div></section><small>{ar?"الأهرام للاستشارات القانونية":"AL AHRAM Legal Consultancy"}</small></main>;
}
