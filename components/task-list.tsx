"use client";
import {useState} from "react";
import Link from "next/link";
import {ChevronDown,ArrowUpRight} from "lucide-react";
import {getTaskChecklist,setChecklistStep} from "@/app/actions/tasks";
import {TaskStatusBadge,Progress} from "./task-status";
import {formatDate,type Locale} from "@/lib/i18n";
import type {Task} from "@/lib/types";
type Row=Pick<Task,"id"|"title"|"status"|"priority"|"progress"|"due_at"|"created_at">&{clientName:string|null;memberCount:number};
type Checklist=Awaited<ReturnType<typeof getTaskChecklist>>;
function TaskRow({task,locale}:{task:Row;locale:Locale}){
 const ar=locale==="ar";const [open,setOpen]=useState(false);const [data,setData]=useState<Checklist|null>(null);const [busy,setBusy]=useState(false);const [error,setError]=useState(false);const [saved,setSaved]=useState(false);
 async function load(){setBusy(true);setError(false);try{setData(await getTaskChecklist(task.id));}catch{setError(true);}finally{setBusy(false);}}
 async function expand(){setOpen(v=>!v);if(!open)await load();}
 async function check(id:string,checked:boolean){if(!data||busy)return;const before=data;setData({...data,steps:data.steps.map(s=>s.id===id?{...s,checked}:s)});setBusy(true);setSaved(false);setError(false);try{setData(await setChecklistStep(task.id,id,checked));setSaved(true);}catch{setData(before);setError(true);}finally{setBusy(false);}}
 return <article className={`task-inline-row${open?" expanded":""}`}><button type="button" className="task-row-toggle" aria-expanded={open} aria-controls={`checklist-${task.id}`} onClick={expand}>
 <span className="task-row-title"><strong>{task.title}</strong><small>{task.clientName||(ar?"بدون مستفيد محدد":"No beneficiary")}{task.memberCount>1&&<span className="shared-tag">{ar?`مشتركة · ${task.memberCount}`:`Shared · ${task.memberCount}`}</span>}</small></span>
 <span className="task-row-status"><TaskStatusBadge status={task.status}/></span><span className={`task-priority priority-${task.priority}`}>{({low:ar?"منخفضة":"Low",medium:ar?"متوسطة":"Medium",high:ar?"عالية":"High",urgent:ar?"عاجلة":"Urgent"})[task.priority]}</span>
 <span className="task-row-progress"><Progress value={data?.progress??task.progress}/><small>{data?.progress??task.progress}%</small></span><time className="task-row-due">{formatDate(task.due_at,locale)}</time><ChevronDown className="task-chevron" size={18}/></button>
 {open&&<div className="task-inline-panel" id={`checklist-${task.id}`}><div className="inline-panel-heading"><strong>{ar?"الخطوات والمراحل":"Steps and stages"}</strong><Link className="text-link" href={`/app/tasks/${task.id}`}>{ar?"التفاصيل الكاملة":"Full details"}<ArrowUpRight size={16}/></Link></div>
 {task.memberCount>1&&<small className="muted">{ar?"علامات الإتمام تخصك فقط. التقدم العام متوسط تقدم المشاركين.":"Checks are personal. Overall progress averages all participants."}</small>}
 {data?.steps.map(step=><label className={`inline-step${step.checked?" completed":""}`} key={step.id}><input type="checkbox" checked={step.checked} disabled={busy||!data.canEdit} onChange={e=>check(step.id,e.target.checked)}/><span>{step.title}</span><small>{Math.round(100/data.steps.length*100)/100}%</small></label>)}
 {data&&!data.steps.length&&<p className="muted">{ar?"لا توجد مراحل لهذه المهمة بعد.":"No stages added to this task yet."}</p>}
 <div className="inline-save-state" role="status" aria-live="polite">{busy?(ar?"جارٍ الحفظ أو التحميل…":"Saving or loading…"):error?<><span>{ar?"تعذر التحديث. لم تُحفظ تغييراتك.":"Update failed. Your changes were not saved."}</span><button className="text-link" type="button" onClick={load}>{ar?"إعادة التحميل":"Reload"}</button></>:saved?(ar?"✓ تم الحفظ تلقائيًا":"✓ Saved automatically"):data&&!data.canEdit?(ar?"للعرض فقط؛ التعديل للمكلّف بالمهمة قبل إغلاقها.":"Read only. Assigned staff can update open tasks."):ar?"يُحفظ التقدم تلقائيًا عند تحديد خطوة.":"Progress saves automatically when you check a step."}</div>
 </div>}</article>;
}
export function TaskList({items,locale}:{items:Row[];locale:Locale}){const ar=locale==="ar";return <div className="task-list"><div className="task-list-heading"><span>{ar?"المهمة / المستفيد":"Task / beneficiary"}</span><span>{ar?"الحالة":"Status"}</span><span>{ar?"الأولوية":"Priority"}</span><span>{ar?"التقدم":"Progress"}</span><span>{ar?"الموعد النهائي":"Due date"}</span><span/></div>{items.map(task=><TaskRow key={task.id} task={task} locale={locale}/>)}{!items.length&&<div className="empty">{ar?"لا توجد مهام مطابقة.":"No matching tasks."}</div>}</div>;}
