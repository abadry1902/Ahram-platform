import {requireUser} from "@/lib/auth";
import {WorkspaceSidebar} from "@/components/workspace-sidebar";
import {signOut} from "@/app/actions/auth";
import {LogOut} from "lucide-react";
export const dynamic="force-dynamic";
export default async function WorkspaceLayout({children}:{children:React.ReactNode}) {
 const {profile}=await requireUser();
 return <div className="workspace" lang="ar" dir="rtl"><WorkspaceSidebar role={profile.role}/><div className="workspace-main"><header className="workspace-top"><div><strong>منصة الأهرام</strong><span className="muted tiny" style={{marginInlineStart:12}}>مساحة العمل الداخلية</span></div><div style={{display:"flex",alignItems:"center",gap:15}}><span className="tiny"><b>{profile.full_name}</b><span className="muted" style={{display:"block"}}>{profile.role==="supervisor"?"المشرف العام":profile.role==="content_editor"?"محرر المحتوى":"موظف"}</span></span><form action={signOut}><button className="button outline" title="تسجيل الخروج" aria-label="تسجيل الخروج"><LogOut size={17}/></button></form></div></header><main className="workspace-body">{children}</main></div></div>;
}
