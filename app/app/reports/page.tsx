import {requireSupervisor} from "@/lib/auth";
import Link from "next/link";
import {Progress} from "@/components/task-status";
import {formatDate} from "@/lib/i18n";
export default async function Reports(){
 const {db}=await requireSupervisor();
 const [{data:tasks},{data:assignments},{data:profiles}]=await Promise.all([
  db.from("tasks").select("id,status,priority,due_at,created_at,closed_at").order("created_at",{ascending:false}).limit(1000),
  db.from("task_assignments").select("task_id,user_id,progress,status").limit(2000),
  db.from("profiles").select("id,full_name").order("full_name")
 ]);
 const all=tasks||[],members=assignments||[];
 const active=all.filter(t=>!["done","expired"].includes(t.status));
 const overdue=active.filter(t=>t.due_at&&new Date(t.due_at)<new Date()).length;
 const done=all.filter(t=>t.status==="done").length,expired=all.filter(t=>t.status==="expired").length;
 const review=all.filter(t=>t.status==="awaiting_review").length;
 return <><div className="title-row"><div><span className="eyebrow">PERFORMANCE</span><h1>التقارير ومتابعة الأداء</h1><p className="muted">ملخص لمتابعة الأعمال وتوزيع المهام على أعضاء المكتب.</p></div></div>
 <div className="stat-grid">{[["مهام نشطة",active.length],["متأخرة",overdue],["بانتظار المراجعة",review],["تامة / منقضية",`${done} / ${expired}`]].map(([label,n])=><div className="stat" key={label}><small className="muted">{label}</small><strong>{n}</strong></div>)}</div>
 <div className="card" style={{marginTop:24}}><h2>أعباء العمل حسب الموظف</h2><p className="muted tiny">تعداد المهام النشطة التي يشارك فيها الموظف ونسبة التقدم الشخصي المتوسطة.</p>
 <div className="table-wrap"><table className="data-table"><thead><tr><th>الموظف</th><th>المهام النشطة</th><th>متوسط تقدمه</th><th>حالات توقف شخصية</th></tr></thead><tbody>{(profiles||[]).map(p=>{const current=members.filter(a=>a.user_id===p.id&&active.some(t=>t.id===a.task_id));const avg=current.length?Math.round(current.reduce((sum,x)=>sum+x.progress,0)/current.length):0;return <tr key={p.id}><td><b>{p.full_name}</b></td><td>{current.length}</td><td><Progress value={avg}/>{avg}%</td><td>{current.filter(x=>x.status==="paused").length}</td></tr>})}</tbody></table></div></div>
 <div className="card" style={{marginTop:20}}><h2>التوزيع حسب الحالة</h2><div className="grid">{[["جديدة","new"],["قيد التنفيذ","in_progress"],["متوقفة","paused"],["بانتظار المراجعة","awaiting_review"],["تامة","done"],["منقضية","expired"]].map(([label,status])=><Link key={status} className="card" href={`/app/tasks?status=${status}`}><b>{label}</b><strong style={{display:"block",fontSize:26,color:"var(--blue)"}}>{all.filter(t=>t.status===status).length}</strong></Link>)}</div></div><p className="muted tiny" style={{marginTop:18}}>تعتمد الإحصائيات الحالية على أول 1000 مهمة و2000 تعيين. عند زيادة البيانات يلزم تحويلها لاستعلامات تجميع على قاعدة البيانات.</p></>;
}
