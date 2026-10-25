"use client";
import {Card,Input,Button,TableContainer,DataTable,Select} from "@/components/ui";
import {useWorkspaceI18n} from "@/components/workspace-context";

import {useState} from "react";
import {z} from "zod";
import type {ImportRow} from "@/lib/import-parser";
type Staff={id:string;full_name:string};
const errorMessage=(value:unknown,fallback:string)=>{const parsed=z.object({error:z.string()}).safeParse(value);return parsed.success?parsed.data.error:fallback;};
const previewSchema=z.object({rows:z.array(z.object({title:z.string(),description:z.string(),priority:z.enum(["low","medium","high","urgent"]),due_at:z.string(),assignees_text:z.string(),warnings:z.array(z.string())}))});
const commitSchema=z.object({added:z.number().int().nonnegative(),skipped:z.number().int().nonnegative(),errors:z.array(z.object({row:z.number(),reason:z.string()})).default([])});
export function ImportClient({people}:{people:Staff[]}){
 const {locale,t:tr}=useWorkspaceI18n();
 const [file,setFile]=useState<File|null>(null),[rows,setRows]=useState<ImportRow[]>([]),[defaultAssignee,setDefaultAssignee]=useState(people[0]?.id||"");
 const [loading,setLoading]=useState(false),[error,setError]=useState(""),[result,setResult]=useState("");
 async function preview(e:React.FormEvent){e.preventDefault();if(!file)return;setLoading(true);setError("");setRows([]);setResult("");try{
  const data=new FormData();data.append("file",file);
  const response=await fetch("/api/import/preview",{method:"POST",body:data});const value=await response.json();
  if(!response.ok)throw new Error(errorMessage(value,"Preview failed"));
  setRows(previewSchema.parse(value).rows);
 }catch(e){setError(e instanceof Error?e.message:tr("تعذر قراءة الملف"));}finally{setLoading(false);}}
 async function commit(){if(!defaultAssignee||!rows.length)return;setLoading(true);setError("");try{
  const response=await fetch("/api/import/commit",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({rows,default_assignee:defaultAssignee})});
  const payload:unknown=await response.json();if(!response.ok)throw new Error(errorMessage(payload,"Import failed"));
  const value=commitSchema.parse(payload);
  setResult(`${locale==="ar"?`تم إنشاء ${value.added} مهمة، وتجاوز ${value.skipped} صف.`:`Created ${value.added} tasks; skipped ${value.skipped} rows.`} ${(value.errors||[]).slice(0,10).map((x:{row:number;reason:string})=>`${locale==="ar"?"الصف":"Row"} ${x.row}: ${x.reason}`).join(" • ")}`);setRows([]);
 }catch(e){setError(e instanceof Error?e.message:tr("تعذر الاستيراد"));}finally{setLoading(false);}}
 return <div className="vertical-stack"><Card className="card"><form onSubmit={preview}><label className="form-field">{tr("اختر ملفًا (XLSX أو CSV أو DOCX — حد أقصى 1MB)")}<Input className="input" type="file" accept=".xlsx,.csv,.docx" required onChange={e=>setFile(e.target.files?.[0]||null)}/></label><Button disabled={loading} className="button alt">{loading?tr("جاري المعالجة..."):tr("تحليل الملف ومعاينة الصفوف")}</Button></form>{error&&<div className="notice warning" role="alert" style={{marginTop:14}}>{error}</div>}{result&&<div className="notice" role="status" style={{marginTop:14}}>{result}</div>}</Card>
 {!!rows.length&&<Card className="card"><div className="title-row"><div><h2>{tr("معاينة الاستيراد (")}{rows.length} {tr("صف)")}</h2><p className="muted tiny">{tr("لم يتم إنشاء أية مهمة بعد. راجع البيانات والأخطاء أولًا.")}</p></div></div><TableContainer className="table-wrap"><DataTable className="data-table"><thead><tr><th>#</th><th>{tr("العنوان")}</th><th>{tr("المسؤولون من الملف")}</th><th>{tr("الأولوية")}</th><th>{tr("التاريخ")}</th><th>{tr("ملاحظات")}</th></tr></thead><tbody>{rows.map((r,i)=><tr key={i}><td>{i+1}</td><td>{r.title||"—"}</td><td>{r.assignees_text||tr("افتراضي")}</td><td>{r.priority}</td><td>{r.due_at?.slice(0,10)||"—"}</td><td>{r.warnings.join("، ")||"✓"}</td></tr>)}</tbody></DataTable></TableContainer><label className="form-field" style={{marginTop:20}}>{tr("الموظف الافتراضي للصفوف التي لا تتضمن مسؤولًا")}<Select className="input" value={defaultAssignee} onChange={e=>setDefaultAssignee(e.target.value)}>{people.map(p=><option key={p.id} value={p.id}>{p.full_name}</option>)}</Select></label><div className="notice warning">{tr("تأكد أن الملف لا يحتوي على أسرار عملاء أو مستندات قضايا. استيراد Word يقترح مهمة لكل سطر، ويتطلب مراجعة بشرية.")}</div><Button disabled={loading||rows.some(r=>!r.title||r.warnings.includes("العنوان غير صالح"))} onClick={commit} className="button alt" style={{marginTop:15}}>{tr("تأكيد إضافة المهام")}</Button></Card>}</div>;
}
