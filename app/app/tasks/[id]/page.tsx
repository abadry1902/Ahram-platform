import {notFound} from "next/navigation";
import {requireUser} from "@/lib/auth";
import {TaskStatusBadge,Progress} from "@/components/task-status";
import {setStatus,setOverallProgress,setMyProgress,postTaskNote,addTaskStep,toggleStep} from "@/app/actions/tasks";
import {formatDate} from "@/lib/i18n";
import type {Task,TaskStatus} from "@/lib/types";
import Link from "next/link";
export default async function TaskDetail({params}:{params:Promise<{id:string}>}){
 const {id}=await params;
 const {db,user,profile}=await requireUser();
 const {data:task,error}=await db.from("tasks").select("*").eq("id",id).maybeSingle();
 if(error||!task)notFound();
 const t=task as Task;
 const [{data:assignments},{data:notes},{data:steps},{data:completions},{data:history},{data:profiles}]=await Promise.all([
  db.from("task_assignments").select("task_id,user_id,progress,updated_at").eq("task_id",id).order("progress",{ascending:false}),
  db.from("task_notes").select("id,body,author_id,created_at").eq("task_id",id).order("created_at",{ascending:true}),
  db.from("task_steps").select("id,title,stage_name,sort_order").eq("task_id",id).order("sort_order"),
  db.from("step_completions").select("step_id,user_id,completed_at"),
  db.from("task_status_history").select("id,previous_status,next_status,changed_at,changed_by,reason").eq("task_id",id).order("changed_at",{ascending:false}).limit(20),
  db.from("profiles").select("id,full_name")
 ]);
 const names=new Map((profiles||[]).map(p=>[p.id,p.full_name]));
 const leader=profile.role==="supervisor"||t.leader_id===user.id;
 const supervisor=profile.role==="supervisor";
 const closed=["done","expired"].includes(t.status);
 const my=(assignments||[]).find(x=>x.user_id===user.id);
 const completedIds=new Set((completions||[]).filter(x=>x.user_id===user.id).map(x=>x.step_id));
 return <><div className="title-row"><div><Link href="/app/tasks" className="muted tiny">← جميع المهام</Link><h1 style={{marginTop:8}}>{t.title}</h1><div style={{display:"flex",gap:12,flexWrap:"wrap",alignItems:"center"}}><TaskStatusBadge status={t.status}/><span className="muted tiny">رقم المهمة: {id.slice(0,8).toUpperCase()}</span></div></div></div>
 <div className="details-grid"><div className="vertical-stack">
 <section className="card"><h2>التفاصيل</h2><p>{t.description||"لا يوجد وصف إضافي."}</p><div className="grid" style={{gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))"}}><div><small className="muted">الأولوية</small><div>{({low:"منخفضة",medium:"متوسطة",high:"عالية",urgent:"عاجلة"} as Record<string,string>)[t.priority]}</div></div><div><small className="muted">تاريخ الإنشاء</small><div>{formatDate(t.created_at)}</div></div><div><small className="muted">موعد التسليم</small><div>{formatDate(t.due_at)}</div></div><div><small className="muted">قائد المهمة</small><div>{t.leader_id?names.get(t.leader_id)||"—":"المشرف العام"}</div></div></div>{t.pause_reason&&<p className="notice warning">سبب التوقف: {t.pause_reason}</p>}{t.closure_reason&&<p className="notice warning">سبب الانقضاء: {t.closure_reason}</p>}</section>
 <section className="card"><div className="title-row"><h2 style={{margin:0}}>الخطوات والمراحل</h2><span className="tiny muted">علامة الإتمام شخصية لكل موظف</span></div>
 {(steps||[]).length?(steps||[]).map(s=><form key={s.id} action={toggleStep} style={{borderBottom:"1px solid #e8edf5",padding:"11px 0",display:"flex",gap:12,alignItems:"center"}}><input type="hidden" name="task_id" value={id}/><input type="hidden" name="step_id" value={s.id}/><button disabled={closed} className="button outline" style={{padding:"5px 11px"}} aria-label={completedIds.has(s.id)?"إلغاء إكمال الخطوة":"إنهاء الخطوة"}>{completedIds.has(s.id)?"✓":"○"}</button><span>{s.title}</span>{s.stage_name&&<span className="pill">{s.stage_name}</span>}</form>):<p className="muted">لم تُضف خطوات بعد.</p>}
 {supervisor&&!closed&&<form action={addTaskStep} style={{display:"flex",gap:8,marginTop:15,flexWrap:"wrap"}}><input type="hidden" name="task_id" value={id}/><input className="input" required minLength={3} maxLength={180} name="title" placeholder="خطوة جديدة" style={{flex:1}}/><button className="button alt">إضافة خطوة</button></form>}</section>
 <section className="card"><h2>ملاحظات الفريق</h2><p className="muted tiny">كل المكلفين بهذه المهمة فقط يمكنهم رؤية الملاحظات وتقدم بعضهم.</p><div style={{display:"grid",gap:12,marginBottom:22}}>{(notes||[]).map(n=><div key={n.id} style={{borderBottom:"1px solid var(--line)",paddingBottom:10}}><b>{names.get(n.author_id)||"عضو الفريق"}</b><small className="muted" style={{marginInlineStart:12}}>{formatDate(n.created_at)}</small><p style={{whiteSpace:"pre-wrap",margin:"6px 0"}}>{n.body}</p></div>)}{!(notes||[]).length&&<p className="muted">لا توجد ملاحظات بعد.</p>}</div><form action={postTaskNote}><input type="hidden" name="task_id" value={id}/><textarea className="input" aria-label="أضف ملاحظة للفريق" name="body" required minLength={1} maxLength={3000} placeholder="أضف ملاحظة أو تحديثًا يراه المشاركون في المهمة..."/><button className="button alt" style={{marginTop:10}}>إضافة ملاحظة</button></form></section>
 <section className="card"><h2>سجل الحالات</h2>{(history||[]).map(h=><div key={h.id} style={{borderBottom:"1px solid var(--line)",padding:"10px 0"}}><strong>{names.get(h.changed_by)||"عضو الفريق"}</strong> ← <TaskStatusBadge status={h.next_status as TaskStatus}/><small className="muted" style={{marginInlineStart:12}}>{formatDate(h.changed_at)}</small>{h.reason&&<p className="tiny">السبب: {h.reason}</p>}</div>)}{!(history||[]).length&&<p className="muted">لم تُسجل انتقالات حالة بعد.</p>}</section>
 </div><aside className="vertical-stack">
 <div className="card"><h2>التقدم العام</h2><strong style={{color:"var(--blue)",fontSize:32}}>{t.progress}%</strong><Progress value={t.progress}/>{leader&&!closed&&<form action={setOverallProgress} style={{marginTop:17}}><input type="hidden" name="task_id" value={id}/><label className="form-field">تحديث نسبة التقدم العامة<input type="number" min="0" max="100" name="progress" defaultValue={t.progress} className="input"/></label><button className="button alt">حفظ التقدم</button></form>}{!leader&&<p className="muted tiny">نسبة التقدم العامة يغيرها قائد المهمة أو المشرف فقط.</p>}</div>
 <div className="card"><h2>فريق المهمة</h2>{(assignments||[]).map(a=><div key={a.user_id} style={{margin:"14px 0"}}><div style={{display:"flex",justifyContent:"space-between",gap:12}}><b>{names.get(a.user_id)||"عضو الفريق"}{a.user_id===t.leader_id?" ★":""}</b><span>{a.progress}%</span></div><Progress value={a.progress}/></div>)}{my&&!closed&&<form action={setMyProgress} style={{paddingTop:16,borderTop:"1px solid var(--line)"}}><input type="hidden" name="task_id" value={id}/><label className="form-field">تقدمك الشخصي<input className="input" type="number" name="progress" min={0} max={100} defaultValue={my.progress}/></label><button className="button alt">تحديث تقدمي</button></form>}</div>
 {leader&&!closed&&<div className="card"><h2>إدارة الحالة العامة</h2><p className="muted tiny">المشرف يراجع الإغلاق النهائي. يجب تسجيل سبب عند التوقف أو الانقضاء.</p><form action={setStatus}><input type="hidden" name="task_id" value={id}/><label className="form-field">الحالة<select name="status" className="input" defaultValue={t.status}><option value="new">جديدة</option><option value="in_progress">قيد التنفيذ</option><option value="paused">متوقفة</option><option value="awaiting_review">بانتظار المراجعة</option>{supervisor&&<><option value="done">تامة — اعتماد</option><option value="expired">منقضية — إغلاق</option></>}</select></label><label className="form-field">سبب التوقف/الانقضاء (إلزامي للحالتين)<textarea className="input" name="reason" style={{minHeight:85}} placeholder="اكتب السبب هنا"/></label><button className="button alt">حفظ الحالة</button></form></div>}
 {closed&&<div className="notice">{t.status==="done"?"المهمة تامة ومعتمدة من المشرف.":"المهمة منقضية ومؤرشفة."}</div>}
 </aside></div></>;
}
