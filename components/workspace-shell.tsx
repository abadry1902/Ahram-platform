"use client";
import {NotificationBell} from "./notification-bell";
import {SystemFeedback} from "./system-feedback";
import {useEffect,useRef,useState,type ReactNode} from "react";
import Link from "next/link";
import {usePathname} from "next/navigation";
import {Menu,LogOut,Globe2,Bell,ShieldCheck} from "lucide-react";
import {WorkspaceLocaleContext} from "./workspace-context";
import {workspaceTranslator} from "@/lib/workspace-strings";
import {WorkspaceSidebar} from "./workspace-sidebar";
import {signOut} from "@/app/actions/auth";
import {setWorkspaceLocale} from "@/app/actions/locale";
import type {Role} from "@/lib/auth";
import type {Locale} from "@/lib/i18n";
export function WorkspaceShell({children,locale,profile}:{children:ReactNode;locale:Locale;profile:{full_name:string;role:Role}}){
 const [open,setOpen]=useState(false),button=useRef<HTMLButtonElement>(null),path=usePathname(),t=workspaceTranslator(locale);
 useEffect(()=>{document.documentElement.lang=locale;document.documentElement.dir=locale==="ar"?"rtl":"ltr";},[locale]);
 useEffect(()=>{setOpen(false)},[path]);
 useEffect(()=>{if(!open)return;const close=(event:KeyboardEvent)=>{if(event.key==="Escape"){setOpen(false);button.current?.focus();}};document.addEventListener("keydown",close);return()=>document.removeEventListener("keydown",close)},[open]);
 return <WorkspaceLocaleContext.Provider value={locale}><div className={`workspace ${locale==="en"?"english":""}`} lang={locale} dir={locale==="ar"?"rtl":"ltr"}><a className="skip-link" href="#workspace-main">{t("انتقل إلى المحتوى")}</a><WorkspaceSidebar role={profile.role} open={open} onClose={()=>setOpen(false)}/><div className="workspace-main"><header className="workspace-top"><div className="workspace-top-title"><button ref={button} className="menu-toggle" onClick={()=>setOpen(!open)} aria-expanded={open} aria-controls="workspace-navigation" aria-label={t("فتح القائمة")}><Menu/></button><span className="workspace-secure"><ShieldCheck size={20}/><span><strong>{t("منصة الأهرام")}</strong><small>{t("مساحة العمل الداخلية")}</small></span></span></div><div className="workspace-tools"><form action={setWorkspaceLocale}><input type="hidden" name="locale" value={locale==="ar"?"en":"ar"}/><input type="hidden" name="returnTo" value={path}/><button className="icon-button locale-tool" aria-label={locale==="ar"?"Switch to English":"التبديل إلى العربية"}><Globe2 size={18}/><span>{locale==="ar"?"EN":"عربي"}</span></button></form><NotificationBell ar={locale==="ar"}/><Link href="/app/settings" className="profile-chip"><span className="avatar">{profile.full_name.slice(0,1)}</span><span><strong>{profile.full_name}</strong><small>{t(profile.role==="supervisor"?"المشرف العام":profile.role==="content_editor"?"محرر المحتوى":"موظف")}</small></span></Link><form action={signOut}><button className="icon-button" title={t("تسجيل الخروج")} aria-label={t("تسجيل الخروج")}><LogOut size={18}/></button></form></div></header><main id="workspace-main" className="workspace-body"><SystemFeedback locale={locale}/>{children}</main><footer className="workspace-footer">AL AHRAM <span>·</span> {locale==="ar"?"عمل منظّم. خطوات أوضح.":"Considered work. Clearer steps."}</footer></div></div></WorkspaceLocaleContext.Provider>;
}
