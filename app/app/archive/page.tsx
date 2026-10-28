import {trashTask} from "@/app/actions/tasks";

import {TableContainer,DataTable,Button} from "@/components/ui";
import {workspaceI18n} from "@/lib/workspace-locale";
import {requireUser} from "@/lib/auth";
import Link from "next/link";
import {TaskStatusBadge} from "@/components/task-status";
import {formatDate} from "@/lib/i18n";
import type {TaskStatus} from "@/lib/types";
export default async function Archive(){
 const {locale,t:tr}=await workspaceI18n();
 const {db,profile}=await requireUser();const {data:removed}=profile.role==="supervisor"?await db.from("tasks").select("id,title,deleted_at").not("deleted_at","is",null).order("deleted_at",{ascending:false}).limit(100):{data:[]};const {data:tasks}=await db.from("tasks").select("id,title,status,closure_reason,closed_at").is("deleted_at",null).in("status",["done","expired"]).order("closed_at",{ascending:false}).limit(150);
 return <><div className="title-row"><div><span className="eyebrow">ARCHIVE</span><h1>{tr("أرشيف المهام المغلقة")}</h1><p className="muted">{tr("تمييز مستقل بين المهام التامة والمنقضية، بدون حذف سجلات الإغلاق.")}</p></div></div>
 <TableContainer className="table-wrap"><DataTable className="data-table"><thead><tr><th>{tr("المهمة")}</th><th>{tr("النتيجة")}</th><th>{tr("تاريخ الإغلاق")}</th><th>{tr("سبب الانقضاء")}</th></tr></thead><tbody>{(tasks||[]).map(t=><tr key={t.id}><td><Link href={`/app/tasks/${t.id}`} style={{color:"var(--blue)",fontWeight:800}}>{t.title}</Link></td><td><TaskStatusBadge status={t.status as TaskStatus}/></td><td>{formatDate(t.closed_at,locale)}</td><td>{t.closure_reason||"—"}</td></tr>)}</tbody></DataTable>{!tasks?.length&&<div className="empty">{tr("الأرشيف فارغ.")}</div>}</TableContainer>{profile.role==="supervisor"&&<section className="card"><h2>{locale==="ar"?"المحذوفات القابلة للاسترجاع":"Recoverable bin"}</h2>{removed?.map(t=><form key={t.id} action={trashTask} className="title-row"><strong>{t.title}</strong><input type="hidden" name="task_id" value={t.id}/><input type="hidden" name="restore" value="true"/><Button className="button outline">{locale==="ar"?"استرجاع":"Restore"}</Button></form>)}</section>}</>;
}
