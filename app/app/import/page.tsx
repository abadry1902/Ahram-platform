
import {workspaceI18n} from "@/lib/workspace-locale";
import {requireSupervisor} from "@/lib/auth";
import {ImportClient} from "./import-client";
export default async function ImportPage(){
 const {locale,t:tr}=await workspaceI18n();const {db}=await requireSupervisor();const {data:profiles}=await db.from("profiles").select("id,full_name").eq("is_active",true).order("full_name");return <><div className="title-row"><div><span className="eyebrow">BULK IMPORT</span><h1>{tr("استيراد المهام")}</h1><p className="muted">{tr("تحليل الملفات ومعاينة المهام وتعيين المسؤولين قبل الحفظ.")}</p></div></div><div className="notice" style={{marginBottom:18}}>{tr("أعمدة Excel/CSV المدعومة: Title أو «عنوان المهمة»، Description أو «الوصف»، Priority أو «الأولوية»، DueDate أو «تاريخ الاستحقاق»، Assignees أو «الموظف». يمكن كتابة أكثر من اسم موظف مفصولًا بفاصلة منقوطة.")}</div><ImportClient people={profiles||[]}/></>;}
