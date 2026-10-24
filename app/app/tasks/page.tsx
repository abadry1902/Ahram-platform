import {requireUser} from "@/lib/auth";
import {TaskStatusBadge,Progress} from "@/components/task-status";
import {formatDate} from "@/lib/i18n";
import type {Task,TaskStatus} from "@/lib/types";
import Link from "next/link";
export default async function TasksPage({searchParams}:{searchParams:Promise<{q?:string;status?:TaskStatus;from?:string;to?:string;date_field?:string;shared?:string;priority?:string}>}){
 const {db,profile}=await requireUser();const s=await searchParams;
 let query=db.from("tasks").select("id,title,status,priority,progress,due_at,created_at,closed_at,leader_id").order("created_at",{ascending:false}).limit(250);
 if(s.status&&["new","in_progress","paused","awaiting_review","done","expired"].includes(s.status))query=query.eq("status",s.status);
 if(s.priority&&["low","medium","high","urgent"].includes(s.priority))query=query.eq("priority",s.priority);
 const dateField=["created_at","due_at","closed_at"].includes(s.date_field||"")?s.date_field!:"created_at";
 if(s.from&&/^\d{4}-\d{2}-\d{2}$/.test(s.from))query=query.gte(dateField,`${s.from}T00:00:00Z`);
 if(s.to&&/^\d{4}-\d{2}-\d{2}$/.test(s.to))query=query.lte(dateField,`${s.to}T23:59:59Z`);
 if(s.q)query=query.ilike("title",`%${s.q.slice(0,100).replace(/[%,]/g,"")}%`);
 const {data,error}=await query;let items=(data||[]) as Task[];
 if(s.shared==="1"&&items.length){const {data:assignments}=await db.from("task_assignments").select("task_id").in("task_id",items.map(t=>t.id));const counts=new Map<string,number>();assignments?.forEach(a=>counts.set(a.task_id,(counts.get(a.task_id)||0)+1));items=items.filter(t=>(counts.get(t.id)||0)>1);}
 return <><div className="title-row"><div><span className="eyebrow">TASKS</span><h1>{s.shared==="1"?"المهام المشتركة":"إدارة المهام"}</h1><p className="muted">ابحث وصنف حسب الحالة والأولوية وتواريخ الإنشاء والاستحقاق والإغلاق.</p></div>{profile.role==="supervisor"&&<Link className="button" href="/app/tasks/new">+ مهمة جديدة</Link>}</div>
 <form className="card" style={{marginBottom:20}}><div className="grid" style={{gridTemplateColumns:"repeat(auto-fit,minmax(170px,1fr))",gap:12}}><label className="form-field">بحث<input name="q" className="input" defaultValue={s.q||""} placeholder="عنوان المهمة"/></label><label className="form-field">الحالة<select className="input" name="status" defaultValue={s.status||""}><option value="">الكل</option>{Object.entries({new:"جديدة",in_progress:"قيد التنفيذ",paused:"متوقفة",awaiting_review:"بانتظار المراجعة",done:"تامة",expired:"منقضية"}).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label><label className="form-field">نوع التاريخ<select className="input" name="date_field" defaultValue={s.date_field||"created_at"}><option value="created_at">الإنشاء</option><option value="due_at">الاستحقاق</option><option value="closed_at">الإغلاق</option></select></label><label className="form-field">من<input type="date" name="from" className="input" defaultValue={s.from||""}/></label><label className="form-field">إلى<input type="date" name="to" className="input" defaultValue={s.to||""}/></label></div><div style={{display:"flex",gap:10,flexWrap:"wrap"}}><button className="button alt">تطبيق الفلاتر</button><Link className="button outline" href="/app/tasks">مسح الفلاتر</Link><Link className="button outline" href="/app/tasks?shared=1">المهام المشتركة</Link></div></form>
 {error&&<div className="notice warning">تعذر تحميل المهام.</div>}
 <div className="table-wrap"><table className="data-table"><thead><tr><th>عنوان المهمة</th><th>الحالة</th><th>الأولوية</th><th>التقدم العام</th><th>تاريخ الإنشاء</th><th>الموعد النهائي</th></tr></thead><tbody>{items.map(t=><tr key={t.id}><td><Link style={{color:"var(--blue)",fontWeight:800}} href={`/app/tasks/${t.id}`}>{t.title}</Link></td><td><TaskStatusBadge status={t.status}/></td><td>{({low:"منخفضة",medium:"متوسطة",high:"عالية",urgent:"عاجلة"} as Record<string,string>)[t.priority]}</td><td style={{minWidth:100}}><Progress value={t.progress}/><small>{t.progress}%</small></td><td>{formatDate(t.created_at)}</td><td>{formatDate(t.due_at)}</td></tr>)}</tbody></table>{!items.length&&<div className="empty">لا توجد مهام مطابقة.</div>}</div></>;
}
