"use client";
import Link from "next/link";
import {usePathname} from "next/navigation";
import {Brand} from "./brand";
import {useWorkspaceI18n} from "./workspace-context";
import {LayoutDashboard,ClipboardList,Users,FileText,CalendarDays,Bell,FolderClosed,Upload,Settings,Link2,Layers3,BarChart3,Archive,ArrowUpRight,X} from "lucide-react";
import type {Role} from "@/lib/auth";
export function WorkspaceSidebar({role,open=false,onClose}:{role:Role;open?:boolean;onClose?:()=>void}){
 const path=usePathname(),{t,locale}=useWorkspaceI18n();
 const links=[{href:"/app",label:"الرئيسية",icon:LayoutDashboard},
 {href:"/app/tasks",label:"المهام",icon:ClipboardList},
 ...(role==="supervisor"?[{href:"/app/tasks/new",label:"مهمة جديدة",icon:Layers3},{href:"/app/team",label:"فريق العمل",icon:Users},{href:"/app/import",label:"استيراد المهام",icon:Upload}]:[]),
 {href:"/app/calendar",label:"التقويم",icon:CalendarDays},{href:"/app/archive",label:"الأرشيف",icon:Archive},
 ...(role==="supervisor"?[{href:"/app/reports",label:"التقارير",icon:BarChart3}]:[]),
 {href:"/app/notifications",label:"الإشعارات",icon:Bell},
 ...(role!=="employee"?[{href:"/app/content",label:"إدارة المقالات",icon:FileText},{href:"/app/links",label:"الروابط",icon:Link2}]:[]),
 ...(role==="supervisor"?[{href:"/app/templates",label:"قوالب المهام",icon:FolderClosed}]:[]),{href:"/app/settings",label:"الإعدادات",icon:Settings}];
 return <><button className={`workspace-scrim ${open?"visible":""}`} onClick={onClose} tabIndex={open?0:-1} aria-label={t("إغلاق القائمة")}/><aside className={`sidebar ${open?"is-open":""}`} id="workspace-navigation"><div className="sidebar-brand"><Brand href="/app"/><button className="sidebar-close" onClick={onClose} aria-label={t("إغلاق القائمة")}><X size={20}/></button></div><div className="sidebar-label">{locale==="ar"?"مساحة الفريق":"TEAM WORKSPACE"}</div><nav aria-label={t("أقسام النظام")}>{links.map(({href,label,icon:Icon})=>{const active=path===href||(href!=="/app"&&href!=="/app/tasks"&&path.startsWith(href+"/"))||(href==="/app/tasks"&&path.startsWith('/app/tasks/')&&path!=="/app/tasks/new");return <Link key={href} href={href} onClick={onClose} className={`side-link ${active?"active":""}`} aria-current={active?"page":undefined}><Icon aria-hidden="true"/>{t(label)}</Link>;})}</nav><div className="sidebar-bottom"><span className="orange-rule"/><p>{locale==="ar"?"وضوح في كل خطوة.":"Clarity at every step."}</p><Link href={`/${locale}`}>{locale==="ar"?"الموقع العام":"Public website"}<ArrowUpRight size={16}/></Link></div></aside></>;
}
