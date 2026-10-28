"use client";
import {Button} from "@/components/ui";

import {useEffect,useRef,useState} from "react";
import Link from "next/link";
import {usePathname} from "next/navigation";
import {Menu,X,ArrowUpLeft,ArrowUpRight,Globe2} from "lucide-react";
import {Brand} from "@/components/brand";
import {localize,type Locale} from "@/lib/i18n";
export function SiteHeader({locale}:{locale:Locale}) {
 const [open,setOpen]=useState(false);const button=useRef<HTMLButtonElement>(null);const path=usePathname();
 const t=(a:string,e:string)=>localize(locale,a,e);const Arrow=locale==="ar"?ArrowUpLeft:ArrowUpRight;
 const swapped=path.replace(/^\/(ar|en)(?=\/|$)/,`/${locale==="ar"?"en":"ar"}`);
 useEffect(()=>{document.documentElement.lang=locale;document.documentElement.dir=locale==="ar"?"rtl":"ltr";},[locale]);
 useEffect(()=>{if(!open)return;const escape=(event:KeyboardEvent)=>{if(event.key==="Escape"){setOpen(false);button.current?.focus();}};document.addEventListener("keydown",escape);return()=>document.removeEventListener("keydown",escape);},[open]);
 const nav=[["","الرئيسية","Home"],["about","عن الأهرام","About us"],["services","خدماتنا","Our services"],["articles","موضوعات قانونية","Legal topics"],["links","خدمات حكومية","Government services"]];
 return <><a className="skip-link" href="#main">{t("انتقل إلى المحتوى","Skip to content")}</a><header className="site-header"><div className="container header-inner"><Brand href={`/${locale}`}/><Button ref={button} className="menu-toggle" aria-expanded={open} aria-controls="public-navigation" aria-label={t(open?"إغلاق القائمة":"فتح القائمة",open?"Close menu":"Open menu")} onClick={()=>setOpen(!open)}>{open?<X/>:<Menu/>}</Button><nav id="public-navigation" aria-label={t("التنقل الرئيسي","Main navigation")} className={`nav ${open?"open":""}`}>
 {nav.map(([slug,ar,en])=>{const href=`/${locale}${slug?`/${slug}`:""}`;const active=slug?path.startsWith(href):path===href;return <Link key={slug} href={href} aria-current={active?"page":undefined} onClick={()=>setOpen(false)}>{t(ar,en)}</Link>;})}
 <Link className="locale-switch" href={swapped} onClick={()=>setOpen(false)} lang={locale==="ar"?"en":"ar"} aria-label={t("Switch to English","التبديل إلى العربية")}><Globe2 size={15}/>{locale==="ar"?"EN":"عربي"}</Link><Link className="button alt header-cta" href={`/${locale}/contact`} onClick={()=>setOpen(false)}>{t("استشارة مجانية","Free consultation")} <Arrow size={16}/></Link></nav></div></header></>;
}
