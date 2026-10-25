"use client";
import {useState} from "react";
export function TaskAssignees({people,locale}:{people:{id:string;full_name:string}[];locale:string}){
 const [selected,setSelected]=useState<string[]>([]);const ar=locale==="ar";const shared=selected.length>1;
 return <><fieldset className="assignee-picker"><legend>{ar?"الموظفون المكلفون":"Assigned staff"}</legend><div className="assignee-options">{people.map(p=><label key={p.id}><input type="checkbox" name="assignees" value={p.id} checked={selected.includes(p.id)} onChange={e=>setSelected(s=>e.target.checked?[...s,p.id]:s.filter(x=>x!==p.id))}/>{p.full_name}</label>)}</div></fieldset>
 {shared?<label className="form-field">{ar?"قائد المهمة المشتركة":"Shared task leader"}<select className="input" name="leader_id" key={selected.join(",")}><option value="">{ar?"المشرف يدير الحالة العامة":"Supervisor manages overall status"}</option>{people.filter(p=>selected.includes(p.id)).map(p=><option key={p.id} value={p.id}>{p.full_name}</option>)}</select></label>:<input type="hidden" name="leader_id" value={selected[0]||""}/>}
 <p className="notice">{ar?(shared?"كل مشارك يحدّث خطواته؛ التقدم العام متوسط تقدم المشاركين. المشرف يعتمد الإغلاق.":"الموظف يحدّث خطواته وحالة المهمة؛ المشرف يعتمد الإغلاق النهائي."):(shared?"Each member updates their own steps; overall progress is the member average. Supervisor approves closure.":"The assignee updates steps and task status; the supervisor approves final closure.")}</p></>;
}
