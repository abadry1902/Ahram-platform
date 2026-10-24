"use client";
import {useState} from "react";
import type {ImportRow} from "@/lib/import-parser";
type Staff={id:string;full_name:string};
export function ImportClient({people}:{people:Staff[]}){
 const [file,setFile]=useState<File|null>(null),[rows,setRows]=useState<ImportRow[]>([]),[defaultAssignee,setDefaultAssignee]=useState(people[0]?.id||"");
 const [loading,setLoading]=useState(false),[error,setError]=useState(""),[result,setResult]=useState("");
 async function preview(e:React.FormEvent){e.preventDefault();if(!file)return;setLoading(true);setError("");setRows([]);setResult("");try{
  const data=new FormData();data.append("file",file);
  const response=await fetch("/api/import/preview",{method:"POST",body:data});const value=await response.json();
  if(!response.ok)throw new Error(value.error||"Preview failed");
  setRows(value.rows);
 }catch(e){setError(e instanceof Error?e.message:"تعذر قراءة الملف");}finally{setLoading(false);}}
 async function commit(){if(!defaultAssignee||!rows.length)return;setLoading(true);setError("");try{
  const response=await fetch("/api/import/commit",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({rows,default_assignee:defaultAssignee})});
  const value=await response.json();if(!response.ok)throw new Error(value.error||"Import failed");
  setResult(`تم إنشاء ${value.added} مهمة، وتم تجاوز ${value.skipped} صف. ${(value.errors||[]).slice(0,10).map((x:{row:number;reason:string})=>`الصف ${x.row}: ${x.reason}`).join(" • ")}`);setRows([]);
 }catch(e){setError(e instanceof Error?e.message:"تعذر الاستيراد");}finally{setLoading(false);}}
 return <div className="vertical-stack"><div className="card"><form onSubmit={preview}><label className="form-field">اختر ملفًا (XLSX أو CSV أو DOCX — حد أقصى 1MB)<input className="input" type="file" accept=".xlsx,.csv,.docx" required onChange={e=>setFile(e.target.files?.[0]||null)}/></label><button disabled={loading} className="button alt">{loading?"جاري المعالجة...":"تحليل الملف ومعاينة الصفوف"}</button></form>{error&&<div className="notice warning" role="alert" style={{marginTop:14}}>{error}</div>}{result&&<div className="notice" role="status" style={{marginTop:14}}>{result}</div>}</div>
 {!!rows.length&&<div className="card"><div className="title-row"><div><h2>معاينة الاستيراد ({rows.length} صف)</h2><p className="muted tiny">لم يتم إنشاء أية مهمة بعد. راجع البيانات والأخطاء أولًا.</p></div></div><div className="table-wrap"><table className="data-table"><thead><tr><th>#</th><th>العنوان</th><th>المسؤولون من الملف</th><th>الأولوية</th><th>التاريخ</th><th>ملاحظات</th></tr></thead><tbody>{rows.map((r,i)=><tr key={i}><td>{i+1}</td><td>{r.title||"—"}</td><td>{r.assignees_text||"افتراضي"}</td><td>{r.priority}</td><td>{r.due_at?.slice(0,10)||"—"}</td><td>{r.warnings.join("، ")||"✓"}</td></tr>)}</tbody></table></div><label className="form-field" style={{marginTop:20}}>الموظف الافتراضي للصفوف التي لا تتضمن مسؤولًا<select className="input" value={defaultAssignee} onChange={e=>setDefaultAssignee(e.target.value)}>{people.map(p=><option key={p.id} value={p.id}>{p.full_name}</option>)}</select></label><div className="notice warning">تأكد أن الملف لا يحتوي على أسرار عملاء أو مستندات قضايا. استيراد Word يقترح مهمة لكل سطر، ويتطلب مراجعة بشرية.</div><button disabled={loading||rows.some(r=>!r.title||r.warnings.includes("العنوان غير صالح"))} onClick={commit} className="button alt" style={{marginTop:15}}>تأكيد إضافة المهام</button></div>}</div>;
}
