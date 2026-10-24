import Link from "next/link";
import {requireUser} from "@/lib/auth";
import {TaskStatusBadge,Progress} from "@/components/task-status";
import type {Task} from "@/lib/types";
import {formatDate} from "@/lib/i18n";
import {ClipboardList,Clock,CheckCircle2,AlertCircle} from "lucide-react";
export default async function Dashboard(){
 const {db,profile}=await requireUser();
 const {data,error}=await db.from("tasks").select("id,title,status,priority,progress,due_at,created_at").order("created_at",{ascending:false}).limit(100);
 const tasks=(data||[]) as Task[];
 const totals=[tasks.length,tasks.filter(t=>t.status==="in_progress").length,tasks.filter(t=>t.status==="awaiting_review").length,tasks.filter(t=>t.status==="done").length];
 return <><div className="title-row"><div><span className="eyebrow">WORKSPACE OVERVIEW</span><h1>أهلًا، {profile.full_name}</h1><p className="muted">{profile.role==="supervisor"?"متابعة فريق العمل والمهام الموكلة إليه.":"تابع مهامك والمراحل المشتركة مع زملائك."}</p></div>{profile.role==="supervisor"&&<Link className="button" href="/app/tasks/new">+ إنشاء مهمة</Link>}</div>
 {error&&<div className="notice warning">تعذر تحميل الإحصائيات: تحقق من صلاحيات قاعدة البيانات.</div>}
 <div className="stat-grid">{[["إجمالي المهام",ClipboardList],["قيد التنفيذ",Clock],["بانتظار المراجعة",AlertCircle],["تامة",CheckCircle2]].map(([label,Icon],i)=><div className="stat" key={String(label)}><div className="muted tiny">{String(label)}</div><strong>{totals[i]}</strong><span style={{color:"var(--blue)"}}>{typeof Icon!=="string"&&<Icon size={19}/>}</span></div>)}</div>
 <div className="dashboard-grid" style={{marginTop:24}}><div className="card"><div className="title-row"><h2 style={{margin:0}}>أحدث المهام</h2><Link href="/app/tasks" style={{color:"var(--blue)"}}>عرض الكل ←</Link></div>{tasks.length?<div className="table-wrap"><table className="data-table"><thead><tr><th>المهمة</th><th>الحالة</th><th>التقدم</th><th>الموعد</th></tr></thead><tbody>{tasks.slice(0,7).map(t=><tr key={t.id}><td><Link href={`/app/tasks/${t.id}`} style={{color:"var(--blue)",fontWeight:800}}>{t.title}</Link></td><td><TaskStatusBadge status={t.status}/></td><td><Progress value={t.progress}/></td><td>{formatDate(t.due_at)}</td></tr>)}</tbody></table></div>:<div className="empty">لا توجد مهام حاليًا.</div>}</div><div className="vertical-stack"><div className="card"><h3>المهام المشتركة</h3><p>كل مشترك يرى تقدم وتعليقات أعضاء الفريق داخل المهمة المشتركة فقط.</p><Link href="/app/tasks?shared=1" className="button outline">عرض المهام المشتركة</Link></div><div className="card"><h3>خطواتك التالية</h3><p>راجع المهام القريبة من موعدها النهائي، وحدّث نسبة إنجازك أولًا بأول.</p><Link href="/app/calendar" className="button outline">افتح التقويم</Link></div></div></div></>;
}
