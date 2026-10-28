'use client';
import {useRef,useState} from 'react';
import {Pencil,X} from 'lucide-react';
import {editTask} from '@/app/actions/tasks';
import {SubmitButton} from './submit-button';
import {ClientPicker} from './client-picker';
export function TaskEditDialog({task,locale,members,client}:{task:{id:string;title:string;description:string|null;priority:string;due_at:string|null;leader_id:string|null;updated_at:string};locale:string;members:{id:string;full_name:string}[];client:{id:string;name:string}|null}){
 const ar=locale==='ar',dialog=useRef<HTMLDialogElement>(null);
 const [due,setDue]=useState(''),[dueIso,setDueIso]=useState(task.due_at||''),[zone,setZone]=useState('');
 function open(){const date=task.due_at?new Date(task.due_at):null;setDue(date?new Date(date.getTime()-date.getTimezoneOffset()*60000).toISOString().slice(0,16):'');setDueIso(task.due_at||'');setZone(Intl.DateTimeFormat().resolvedOptions().timeZone);dialog.current?.showModal();}
 return <><button type="button" className="button" onClick={open}><Pencil size={16}/>{ar?'تعديل المهمة':'Edit task'}</button><dialog ref={dialog} className="task-edit-dialog" aria-labelledby="task-edit-title"><form action={editTask}>
 <div className="title-row"><h2 id="task-edit-title">{ar?'تعديل المهمة':'Edit task'}</h2><button type="button" className="dialog-close" aria-label={ar?'إغلاق':'Close'} onClick={()=>dialog.current?.close()}><X size={20}/></button></div>
 <input type="hidden" name="task_id" value={task.id}/><input type="hidden" name="expected_updated_at" value={task.updated_at}/>
 <label className="form-field">{ar?'عنوان المهمة':'Task title'}<input className="input" name="title" required minLength={3} maxLength={180} defaultValue={task.title}/></label>
 <label className="form-field">{ar?'الوصف':'Description'}<textarea className="input" name="description" maxLength={4000} rows={4} defaultValue={task.description||''}/></label>
 <div className="task-edit-grid"><label className="form-field">{ar?'الأولوية':'Priority'}<select className="input" name="priority" defaultValue={task.priority}>{[['low','منخفضة','Low'],['medium','متوسطة','Medium'],['high','عالية','High'],['urgent','قصوى','Critical']].map(([v,a,e])=><option key={v} value={v}>{ar?a:e}</option>)}</select></label>
 <label className="form-field">{ar?'موعد التسليم':'Due date'}<input className="input" type="datetime-local" value={due} onChange={e=>{const value=e.target.value;setDue(value);setDueIso(value&&!Number.isNaN(Date.parse(value))?new Date(value).toISOString():'');}}/><small>{ar?'بتوقيت جهازك: ':'Device timezone: '}{zone}</small><input type="hidden" name="due_at" value={dueIso}/></label></div>
 <ClientPicker locale={locale} initial={client?[client]:[]} selected={client}/>
 <label className="form-field">{ar?'قائد المهمة — من المشاركين الحاليين':'Task leader — current participants'}<select className="input" name="leader_id" defaultValue={task.leader_id||''}><option value="">{ar?'المشرف العام':'Supervisor'}</option>{members.map(p=><option key={p.id} value={p.id}>{p.full_name}</option>)}</select></label>
 <p className="muted tiny">{ar?'تغيير الموعد يُسجّل في التاريخ ولا يغيّر الموعد المرجعي للتقارير السابقة.':'Deadline changes are recorded without rewriting the baseline used by reports.'}</p>
 <div className="task-edit-actions"><SubmitButton className="button alt">{ar?'حفظ التعديلات':'Save changes'}</SubmitButton><button type="button" className="button outline" onClick={()=>dialog.current?.close()}>{ar?'إلغاء':'Cancel'}</button></div>
 </form></dialog></>;
}
