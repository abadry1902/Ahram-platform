"use client";
import {useState} from "react";
import Link from "next/link";
import {Brand} from "@/components/brand";
import type {Locale} from "@/lib/i18n";
import {localize} from "@/lib/i18n";
import {usePathname} from "next/navigation";
import {Menu,X} from "lucide-react";
export function SiteHeader({locale}:{locale:Locale}){
 const [open,setOpen]=useState(false);
 const path=usePathname(); const swapped=path.replace(/^\/(ar|en)(?=\/|$)/,`/${locale==="ar"?"en":"ar"}`);
 const nav=[["", "الرئيسية","Home"],["about","من نحن","About"],["services","خدماتنا","Services"],["articles","المقالات","Insights"],["links","روابط مهمة","Useful Links"],["contact","تواصل معنا","Contact"]];
 return <header className="site-header"><div className="container header-inner">
   <Brand href={`/${locale}`}/>
   <button className="menu-toggle" aria-expanded={open} aria-label="Toggle navigation" onClick={()=>setOpen(!open)}>{open?<X/>:<Menu/>}</button>
   <nav aria-label="Main navigation" className={`nav ${open?"open":""}`}>
     {nav.map(([slug,ar,en])=><Link key={slug} onClick={()=>setOpen(false)} href={`/${locale}/${slug}`}>{localize(locale,ar,en)}</Link>)}
     <Link className="pill" href={swapped} lang={locale==="ar"?"en":"ar"}>{locale==="ar"?"EN":"عربي"}</Link>
     <Link href="/login" className="button alt">{localize(locale,"بوابة الفريق","Staff Portal")}</Link>
   </nav>
 </div></header>;
}
