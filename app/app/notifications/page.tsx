import {PushOptIn} from "@/components/push-opt-in";

import {Card,Button} from "@/components/ui";
import {workspaceI18n} from "@/lib/workspace-locale";
import {requireUser} from "@/lib/auth";
import {markNotificationRead} from "@/app/actions/notifications";
import Link from "next/link";
import {formatDate} from "@/lib/i18n";
export default async function Notifications(){
 const {locale,t:tr}=await workspaceI18n();const {db,user}=await requireUser();const {data:items}=await db.from("notifications").select("id,task_id,message,created_at,read_at").eq("user_id",user.id).order("created_at",{ascending:false}).limit(100);return <><div className="title-row"><div><span className="eyebrow">NOTIFICATIONS</span><h1>{tr("الإشعارات")}</h1><p className="muted">{tr("تحديثات المهام والمراجعات التي تخصك.")}</p></div></div><PushOptIn ar={locale==="ar"}/><div className="vertical-stack">{(items||[]).map(n=><Card className="notification-row" key={n.id} style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:18}}><div>{!n.read_at&&<span className="pill">{tr("جديد")}</span>}<p>{n.message}</p><small className="muted">{formatDate(n.created_at,locale)}</small>{n.task_id&&<p><Link href={`/app/tasks/${n.task_id}`} style={{color:"var(--blue)"}}>{tr("فتح المهمة ←")}</Link></p>}</div>{!n.read_at&&<form action={markNotificationRead}><input type="hidden" name="id" value={n.id}/><Button className="button outline">{tr("تحديد كمقروء")}</Button></form>}</Card>)}{!(items||[]).length&&<div className="card empty">{tr("لا توجد إشعارات.")}</div>}</div></>;}
