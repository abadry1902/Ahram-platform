import {requireUser} from "@/lib/auth";
import {WorkspaceShell} from "@/components/workspace-shell";
import {workspaceI18n} from "@/lib/workspace-locale";
export const dynamic="force-dynamic";
export default async function WorkspaceLayout({children}:{children:React.ReactNode}){
 const {profile}=await requireUser();const {locale}=await workspaceI18n();
 return <WorkspaceShell locale={locale} profile={profile}>{children}</WorkspaceShell>;
}
