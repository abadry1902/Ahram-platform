
import {TableContainer,DataTable} from "@/components/ui";
import {workspaceI18n} from "@/lib/workspace-locale";
import {requireUser} from "@/lib/auth";
import Link from "next/link";
import {TaskStatusBadge} from "@/components/task-status";
import {formatDate} from "@/lib/i18n";
import type {TaskStatus} from "@/lib/types";
export default async function Archive(){
 const {locale,t:tr}=await workspaceI18n();
 const {db}=await requireUser();const {data:tasks}=await db.from("tasks").select("id,title,status,closure_reason,closed_at").in("status",["done","expired"]).order("closed_at",{ascending:false}).limit(150);
 return <><div className="title-row"><div><span className="eyebrow">ARCHIVE</span><h1>{tr("أرشيف المهام المغلقة")}</h1><p className="muted">{tr("تمييز مستقل بين المهام التامة والمنقضية، بدون حذف سجلات الإغلاق.")}</p></div></div>
 <TableContainer className="table-wrap"><DataTable className="data-table"><thead><tr><th>{tr("المهمة")}</th><th>{tr("النتيجة")}</th><th>{tr("تاريخ الإغلاق")}</th><th>{tr("سبب الانقضاء")}</th></tr></thead><tbody>{(tasks||[]).map(t=><tr key={t.id}><td><Link href={`/app/tasks/${t.id}`} style={{color:"var(--blue)",fontWeight:800}}>{t.title}</Link></td><td><TaskStatusBadge status={t.status as TaskStatus}/></td><td>{formatDate(t.closed_at,locale)}</td><td>{t.closure_reason||"—"}</td></tr>)}</tbody></DataTable>{!tasks?.length&&<div className="empty">{tr("الأرشيف فارغ.")}</div>}</TableContainer></>;
}
