import Link from "next/link";
import {Brand} from "@/components/brand";
import {LayoutDashboard,ClipboardList,Users,FileText,CalendarDays,Bell,FolderClosed,Upload,Settings,Link2,Layers3,BarChart3,Archive} from "lucide-react";
import type {Role} from "@/lib/auth";
export function WorkspaceSidebar({role}:{role:Role}){
 const links=[{href:"/app",label:"الرئيسية",icon:LayoutDashboard},
 {href:"/app/tasks",label:"المهام",icon:ClipboardList},
 ...(role==="supervisor"?[{href:"/app/tasks/new",label:"مهمة جديدة",icon:Layers3},{href:"/app/team",label:"فريق العمل",icon:Users},{href:"/app/import",label:"استيراد المهام",icon:Upload}]:[]),
 {href:"/app/calendar",label:"التقويم",icon:CalendarDays},
 {href:"/app/archive",label:"الأرشيف",icon:Archive},
 ...(role==="supervisor"?[{href:"/app/reports",label:"التقارير",icon:BarChart3}]:[]),
 {href:"/app/notifications",label:"الإشعارات",icon:Bell},
 ...(role!=="employee"?[{href:"/app/content",label:"إدارة المقالات",icon:FileText},{href:"/app/links",label:"الروابط",icon:Link2}]:[]),
 ...(role==="supervisor"?[{href:"/app/templates",label:"قوالب المهام",icon:FolderClosed}]:[]),
 {href:"/app/settings",label:"الإعدادات",icon:Settings}];
 return <aside className="sidebar"><Brand href="/app"/><nav aria-label="أقسام النظام">{links.map(({href,label,icon:Icon})=><Link key={href} href={href} className="side-link"><Icon aria-hidden="true"/>{label}</Link>)}</nav></aside>;
}
