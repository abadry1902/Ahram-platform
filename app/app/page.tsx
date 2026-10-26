
import {taskMetrics} from "@/lib/analytics/queries";
import {Card,TableContainer,DataTable} from "@/components/ui";
import {workspaceI18n} from "@/lib/workspace-locale";
import Link from "next/link";
import {requireUser} from "@/lib/auth";
import {TaskStatusBadge,Progress} from "@/components/task-status";
import type {Task} from "@/lib/types";
import {formatDate} from "@/lib/i18n";
import {ClipboardList,Clock,CheckCircle2,AlertCircle} from "lucide-react";
export default async function Dashboard(){
 const {locale,t:tr}=await workspaceI18n();
 const {db,profile}=await requireUser();
 const {data,error}=await db.from("tasks").select("id,title,status,priority,progress,due_at,created_at").is("deleted_at",null).order("created_at",{ascending:false}).limit(7);
 const tasks=(data||[]) as Task[];
 let metrics=null;try{metrics=await taskMetrics(db);}catch{};
 const totals=metrics?[metrics.total,metrics.in_progress,metrics.awaiting_review,metrics.done]:[null,null,null,null];
 const links=['/app/tasks','/app/tasks?status=in_progress','/app/tasks?status=awaiting_review','/app/tasks?status=done'];
 return <><section className="workspace-welcome"><div className="workspace-welcome-copy"><span className="eyebrow">{tr("أهلًا،")} {profile.full_name}</span><h1>{locale==="ar"?"لنبنِ معًا خطوة قانونية أوضح.":"Clearer steps. Better teamwork."}</h1><p>{profile.role==="supervisor"?tr("متابعة فريق العمل والمهام الموكلة إليه."):tr("تابع مهامك والمراحل المشتركة مع زملائك.")}</p>{profile.role==="supervisor"?<Link className="button" href="/app/tasks/new">{tr("+ إنشاء مهمة")}</Link>:<Link className="button alt" href="/app/tasks">{tr("المهام")}</Link>}</div><img src="/images/v4/architectural-journey.webp" alt=""/></section>
 {(error||!metrics)&&<div className="notice warning">{tr("تعذر تحميل الإحصائيات: تحقق من صلاحيات قاعدة البيانات.")}</div>}
 <div className="stat-grid">{[{label:tr("إجمالي المهام"),Icon:ClipboardList},{label:tr("قيد التنفيذ"),Icon:Clock},{label:tr("بانتظار المراجعة"),Icon:AlertCircle},{label:tr("تامة"),Icon:CheckCircle2}].map(({label,Icon},i)=><Link className="stat stat-link" key={label} href={links[i]}><div className="muted tiny">{label}</div><strong>{totals[i]??"—"}</strong><span style={{color:"var(--blue)"}}><Icon size={19}/></span></Link>)}</div>
 <div className="dashboard-grid" style={{marginTop:24}}><Card className="card"><div className="title-row"><h2 style={{margin:0}}>{tr("أحدث المهام")}</h2><Link href="/app/tasks" style={{color:"var(--blue)"}}>{tr("عرض الكل ←")}</Link></div>{tasks.length?<TableContainer className="table-wrap"><DataTable className="data-table"><thead><tr><th>{tr("المهمة")}</th><th>{tr("الحالة")}</th><th>{tr("التقدم")}</th><th>{tr("الموعد")}</th></tr></thead><tbody>{tasks.slice(0,7).map(t=><tr key={t.id}><td><Link href={`/app/tasks/${t.id}`} style={{color:"var(--blue)",fontWeight:800}}>{t.title}</Link></td><td><TaskStatusBadge status={t.status}/></td><td><Progress value={t.progress}/></td><td>{formatDate(t.due_at,locale)}</td></tr>)}</tbody></DataTable></TableContainer>:<div className="empty">{tr("لا توجد مهام حاليًا.")}</div>}</Card><div className="vertical-stack"><Card className="card"><h3>{tr("المهام المشتركة")}</h3><p>{tr("كل مشترك يرى تقدم وتعليقات أعضاء الفريق داخل المهمة المشتركة فقط.")}</p><Link href="/app/tasks?shared=1" className="button outline">{tr("عرض المهام المشتركة")}</Link></Card><Card className="card"><h3>{tr("خطواتك التالية")}</h3><p>{tr("راجع المهام القريبة من موعدها النهائي، وحدّث نسبة إنجازك أولًا بأول.")}</p><Link href="/app/calendar" className="button outline">{tr("افتح التقويم")}</Link></Card></div></div></>;
}
