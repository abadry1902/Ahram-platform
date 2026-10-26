import ExcelJS from "exceljs";
import mammoth from "mammoth";

export type ImportRow={title:string;description:string;priority:string;due_at:string;assignees_text:string;warnings:string[]};
const key=(s:unknown)=>String(s??"").trim().toLowerCase().replace(/[_\s-]/g,"");
const columns={
 title:["title","task","tasktitle","المهمة","عنوانالمهمة","العنوان"],
 description:["description","details","الوصف","التفاصيل","ملاحظات"],
 priority:["priority","الأولوية"],
 due_at:["due","deadline","duedate","تاريخالاستحقاق","تاريخالتسليم","الموعد"],
 assignees_text:["assignees","assignedto","employee","الموظف","الموظفون","المسؤول","المكلف"]
};
function mapRow(rec:Record<string,string>):ImportRow{
 const pick=(field:keyof typeof columns)=>{const keys=columns[field];const match=Object.keys(rec).find(k=>keys.includes(key(k)));return match?rec[match].trim():"";};
 const title=pick("title"),description=pick("description"),priorityRaw=pick("priority").toLowerCase();
 const priority=(["urgent","high","medium","low"].includes(priorityRaw)?priorityRaw:({قصوى:"urgent",عاجلة:"urgent",critical:"urgent",عالية:"high",متوسطة:"medium",منخفضة:"low"} as Record<string,string>)[priorityRaw])||"medium";
 const rawDue=pick("due_at");const date=rawDue?new Date(rawDue):null;
 const due_at=date&&!Number.isNaN(date.getTime())?date.toISOString():"";
 const warnings=[...(title.length<3||title.length>180?["العنوان غير صالح"]:[]),...(rawDue&&!due_at?["تاريخ غير مفهوم"]:[]),...(!pick("assignees_text")?["لا يوجد موظف في الصف؛ سيُستخدم الموظف الافتراضي عند الاستيراد"]:[])];
 return {title,description:description.slice(0,4000),priority,due_at,assignees_text:pick("assignees_text"),warnings};
}
function csvTable(text:string):string[][]{
 const rows:string[][]=[];let row:string[]=[],value="",quoted=false;
 for(let i=0;i<text.length;i++){
  const ch=text[i];
  if(ch==='"'){if(quoted&&text[i+1]==='"'){value+='"';i++;}else quoted=!quoted;}
  else if(ch===","&&!quoted){row.push(value);value="";}
  else if((ch==="\n"||ch==="\r")&&!quoted){if(ch==="\r"&&text[i+1]==="\n")i++;row.push(value);if(row.some(v=>v.trim()))rows.push(row);row=[];value="";}
  else value+=ch;
 }
 row.push(value);if(row.some(v=>v.trim()))rows.push(row);
 return rows;
}
function toRecords(table:string[][]):ImportRow[]{
 if(table.length<2)throw new Error("Missing header or rows");
 const headers=table[0].map(s=>s.replace(/^\uFEFF/,"").trim());
 if(!headers.some(h=>columns.title.includes(key(h))))throw new Error("Missing task-title column");
 return table.slice(1,101).filter(row=>row.some(v=>v.trim())).map(row=>mapRow(Object.fromEntries(headers.map((h,i)=>[h,row[i]||""]))));
}
export async function parseImport(file:File):Promise<ImportRow[]>{
 if(file.size>1024*1024)throw new Error("Maximum file size 1 MB");
 const ext=file.name.split(".").pop()?.toLowerCase();
 if(ext==="csv")return toRecords(csvTable(await file.text()));
 const buffer=Buffer.from(await file.arrayBuffer());
 if(ext==="xlsx"){
  const workbook=new ExcelJS.Workbook();await workbook.xlsx.load(buffer as never);
  const sheet=workbook.worksheets[0];if(!sheet)throw new Error("No worksheet");
  const table:string[][]=[];sheet.eachRow({includeEmpty:false},row=>{
   const cells=(row.values as ExcelJS.CellValue[]).slice(1);
   table.push(cells.map(x=>{
     if(x instanceof Date)return x.toISOString();
     if(x&&typeof x==="object"&&"text" in x)return String(x.text||"");
     if(x&&typeof x==="object"&&"result" in x)return String(x.result||"");
     return String(x??"");
   }));
  });
  return toRecords(table);
 }
 if(ext==="docx"){
  const {value}=await mammoth.extractRawText({buffer});
  const lines=value.split(/\r?\n/).map(x=>x.trim()).filter(Boolean).slice(0,100);
  return lines.map(line=>({title:line.slice(0,180),description:"",priority:"medium",due_at:"",assignees_text:"",warnings:["مستخرج من Word، راجع العنوان وحدد الموظف الافتراضي قبل التأكيد"]}));
 }
 throw new Error("Unsupported file type");
}
