import {ClientPicker} from "@/components/client-picker";
import {TaskAssignees} from "@/components/task-assignees";

import {TaskTemplatePicker} from "@/components/task-template-picker";
import {Card,Input,Textarea,Select,Button} from "@/components/ui";
import {workspaceI18n} from "@/lib/workspace-locale";
import {requireSupervisor} from "@/lib/auth";
import {createTask} from "@/app/actions/tasks";
export default async function NewTask({searchParams}:{searchParams:Promise<{error?:string}>}){
 const {locale,t:tr}=await workspaceI18n();
 const {db}=await requireSupervisor();const {error}=await searchParams;
 const {data:staff}=await db.from("profiles").select("id,full_name,role").eq("is_active",true).order("full_name");
 const {data:templates}=await db.from("task_types").select("id,name_ar,stages").order("name_ar");
 const {data:clients}=await db.from("clients").select("id,name").order("name").limit(50);
 const people=staff||[];
 return <><div className="title-row"><div><span className="eyebrow">NEW TASK</span><h1>{tr("إنشاء مهمة جديدة")}</h1><p className="muted">{tr("تحديد المسؤولين والقائد وتاريخ الاستحقاق.")}</p></div></div><Card className="card" style={{maxWidth:900}}>{error&&<div className="notice warning" style={{marginBottom:20}}>{tr("تحقق من البيانات والتعيينات. السبب:")}{error}</div>}<form action={createTask}><ClientPicker locale={locale} initial={clients||[]} allowCreate/><div className="form-field"><label htmlFor="title">{tr("عنوان المهمة *")}</label><Input id="title" className="input" name="title" required minLength={3} maxLength={180}/></div><div className="form-field"><label htmlFor="description">{tr("الوصف والتعليمات")}</label><Textarea id="description" className="input" name="description" maxLength={4000}/></div><div className="grid" style={{gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))"}}><label className="form-field">{tr("الأولوية")}<Select className="input" name="priority"><option value="medium">{tr("متوسطة")}</option><option value="high">{tr("عالية")}</option><option value="urgent">{tr("قصوى")}</option><option value="low">{tr("منخفضة")}</option></Select></label><label className="form-field">{tr("الموعد النهائي")}<Input className="input" name="due_at" type="datetime-local"/></label></div><TaskTemplatePicker templates={templates||[]} locale={locale}/><TaskAssignees people={people} locale={locale}/><Button className="button alt" style={{marginTop:20}}>{tr("إنشاء المهمة")}</Button></form></Card></>;
}
