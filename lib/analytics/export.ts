import ExcelJS from 'exceljs';
import type {Report,TaskRow} from './queries';
import type {Filters} from './filters';
export type Snapshot={report:Report;tasks:TaskRow[];filters:Filters;export_id:string};
export const definitions=[
 ['Task cohort','Tasks matching the chosen filters and date basis; Cairo calendar days use exclusive next-day boundaries.'],
 ['Office total','One row per task, regardless of participant count.'],
 ['Workload','Active assignments per member; not an assessment of work quality or task complexity.'],
 ['Individual completion','Server-recorded completion; checklist tasks require all steps. Supervisor closure is separate.'],
 ['On-time rate','Eligible individual completions within the period and task cohort, on or before the frozen deadline / eligible completions.'],
 ['Excluded','Completed assignments without recorded completion time or deadline. Missing is not zero.'],
 ['Deadline','Frozen at tracking start; later edits retained in immutable history and never improve this baseline retroactively.'],
 ['Pauses','Personal pause counts shown; no automatic deadline extension or elapsed-time deduction.'],
 ['Completion rate','Done tasks / selected task cohort. Not individual productivity or quality.'],
 ['Historical records','No completion dates are fabricated. Closed historical assignments remain unmeasurable.'],
 ['Recorded durations','Individual completion hours require a known assignment creation timestamp. Ended personal pauses only; ongoing and historical unknown intervals are excluded.'],
 ['Tracked due completion','Completed tracked assignments due in the period / tracked assignments due in the period, inside the selected task cohort. Historical unknown assignment starts are excluded.'],
 ['Performance score','Deferred: no approved complexity model or documented human quality reviews.'],
];
export const definitionsAr=[
 ['مجموعة المهام','المهام المطابقة للفلاتر وأساس التاريخ المختار. حدود الأيام بتوقيت القاهرة وتنتهي عند بداية اليوم التالي.'],
 ['إجمالي المكتب','كل مهمة تُحسب مرة واحدة مهما كان عدد المشاركين.'],
 ['عبء العمل','التكليفات المرتبطة بمهام نشطة لكل عضو؛ لا يقيّم الجودة أو التعقيد.'],
 ['الإكمال الفردي','تاريخ يسجله الخادم عند الإكمال. المهام ذات الخطوات تستلزم إتمامها كلها. إغلاق المشرف مستقل.'],
 ['الالتزام بالمواعيد','الإكمال الفردي في الموعد المرجعي أو قبله مقسومًا على الإكمال المؤهل خلال الفترة داخل مجموعة المهام.'],
 ['المستبعدة','تكليفات مكتملة بدون تاريخ إكمال موثّق أو موعد مرجعي. البيانات الناقصة ليست صفرًا.'],
 ['الموعد المرجعي','يُحفظ عند بدء التتبع. تعديلات الموعد مؤرخة ولا تحسن التقييم بأثر رجعي.'],
 ['التوقفات','تُعرض التوقفات الشخصية دون تمديد تلقائي للموعد أو خصم مدة التوقف.'],
 ['معدل الإغلاق','المهام التامة مقسومة على مجموعة المهام المحددة، وليس تقييمًا لإنتاجية الموظف أو جودة عمله.'],
 ['البيانات التاريخية','لا تُختلق تواريخ الإكمال القديمة. التكليفات المغلقة تاريخيًا بدون دليل تبقى غير قابلة للقياس.'],
 ['المدد الموثقة','مدة الإكمال الفردي تحتاج تاريخ تكليف موثوقًا. فترات التوقف المنتهية والموثقة فقط؛ الفترات الحالية أو التاريخية المجهولة مستبعدة.'],
 ['إنجاز المستحقات الموثقة','التكليفات الموثقة المستحقة خلال الفترة والمكتملة حتى نهايتها مقسومة على التكليفات الموثقة المستحقة داخل مجموعة المهام. تواريخ التكليف القديمة المجهولة مستبعدة.'],
 ['التقييم المركب','مؤجل لغياب نموذج تعقيد معتمد ومراجعة بشرية موثّقة للجودة.'],
];
export function safeCell(v:string){return /^[\s]*[=+@\-]/.test(v)?"'"+v:v;}
export async function excelReport(snapshot:Snapshot,locale:string){
 const book=new ExcelJS.Workbook();book.creator='AL AHRAM';book.created=new Date(snapshot.report.generated_at);const ar=locale==='ar';
 const sheet=(name:string,headers:string[],rows:unknown[][])=>{const s=book.addWorksheet(name,{views:[{state:'frozen',ySplit:1,rightToLeft:ar}]});s.addRow(headers);for(const row of rows)s.addRow(row.map(v=>typeof v==='string'?safeCell(v):v));s.getRow(1).eachCell(c=>{c.font={bold:true,color:{argb:'FFFFFFFF'}};c.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF1546A0'}};});s.columns.forEach(c=>{c.width=25;});s.autoFilter={from:{row:1,column:1},to:{row:Math.max(s.rowCount,1),column:headers.length}};s.eachRow((r,n)=>{if(n>1)r.eachCell(c=>{if(c.value instanceof Date)c.numFmt='yyyy-mm-dd hh:mm';});});return s;};
 sheet('Executive Summary',[ar?'المؤشر':'Metric',ar?'القيمة':'Value'],[...Object.entries(snapshot.report.metrics),['Generated at (UTC)',new Date(snapshot.report.generated_at)],['Timezone','Africa/Cairo'],['Filters',JSON.stringify(snapshot.filters)],['Export ID',snapshot.export_id]]);
 const headers=ar?['رقم المهمة','العنوان','الحالة','الأولوية','التقدم','الإنشاء UTC','الاستحقاق UTC','الإغلاق UTC']:['Task ID','Title','Status','Priority','Progress','Created UTC','Due UTC','Closed UTC'];
 const row=(t:TaskRow)=>[t.id,t.title,t.status,t.priority,t.progress,new Date(t.created_at),t.due_at?new Date(t.due_at):null,t.closed_at?new Date(t.closed_at):null];
 sheet('Tasks Overview',headers,snapshot.tasks.map(row));
 sheet('Employee Performance',ar?['الموظف','نشطة','إكمال موثق','مؤهلة','في الموعد','مستبعدة','متأخرة','متوسط التقدم','مشتركة','يقودها','متوقفة','متوسط ساعات الإكمال','مستحقات موثقة','إنجاز المستحقات','ساعات التوقف']:['Member','Active','Recorded complete','Eligible','On time','Excluded','Overdue','Average progress','Shared','Leading','Paused','Completion hours','Tracked due','Tracked due complete','Ended pause hours'],snapshot.report.team.map(p=>[p.full_name,p.active,p.completed,p.eligible,p.on_time,p.excluded,p.overdue,p.progress,p.shared,p.led,p.paused,p.completion_hours,p.due_count,p.due_completed,p.pause_hours]));
 sheet('Workload Distribution',ar?['الموظف','التكليفات النشطة','متوسط التقدم']:['Member','Active assignments','Average progress'],snapshot.report.team.map(p=>[p.full_name,p.active,p.progress]));
 sheet('Overdue Tasks',headers,snapshot.tasks.filter(t=>!['done','expired'].includes(t.status)&&t.due_at&&Date.parse(t.due_at)<Date.parse(snapshot.report.generated_at)).map(row));
 sheet('Monthly Trends',ar?['الشهر','إغلاق تام']:['Month','Done closures'],snapshot.report.trends.map(t=>[t.month,t.completed]));
 const d=sheet('Report Definitions',ar?['التعريف','طريقة الحساب']:['Definition','Method'],ar?definitionsAr:definitions);d.getColumn(2).width=100;d.getColumn(2).alignment={wrapText:true};
 return Buffer.from(await book.xlsx.writeBuffer());
}
const escape=(s:unknown)=>String(s??'—').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
export function reportHtml(snapshot:Snapshot,locale:string,fontBase64:string,logoBase64:string){
 const ar=locale==='ar',r=snapshot.report;
 return `<!doctype html><html lang="${ar?'ar':'en'}" dir="${ar?'rtl':'ltr'}"><head><meta charset="utf-8"><style>@font-face{font-family:Cairo;src:url(data:font/ttf;base64,${fontBase64})}*{box-sizing:border-box}body{font:12px Cairo,sans-serif;color:#0B2F56}h1{color:#1546A0}h2{margin-top:24px;color:#1546A0}img{width:170px;height:auto}.meta{color:#53647B;font-size:10px}.kpis{display:flex;flex-wrap:wrap;gap:12px}.kpi{border:1px solid #E8F0FC;padding:12px;min-width:120px}.kpi b{display:block;font-size:24px;color:#1546A0}table{width:100%;border-collapse:collapse;margin:14px 0}thead{display:table-header-group}th{background:#E8F0FC}th,td{text-align:start;padding:8px;border-bottom:1px solid #E8F0FC}tr,.kpi{break-inside:avoid}h2{break-after:avoid}.bar{height:10px;background:#1546A0;margin:4px 0}.page{break-before:page}@page{size:A4;margin:20mm 14mm}</style></head><body><img src="data:image/png;base64,${logoBase64}" alt="AL AHRAM"><h1>${ar?'تقرير متابعة الأعمال والفريق':'Operations and team report'}</h1><p class="meta">${escape(r.generated_at)} · Africa/Cairo · ${escape(snapshot.export_id)}</p><p class="meta">${escape(JSON.stringify(snapshot.filters))}</p><div class="kpis">${[['total',ar?'المهام':'Tasks'],['active',ar?'نشطة':'Active'],['done',ar?'تامة':'Done'],['overdue',ar?'متأخرة':'Overdue']].map(([k,l])=>`<div class="kpi">${l}<b>${escape(r.metrics[k as keyof typeof r.metrics])}</b></div>`).join('')}</div><h2>${ar?'أعباء العمل والالتزام':'Workload and timeliness'}</h2><table><thead><tr>${(ar?['الموظف','نشطة','إكمال موثق','في الموعد / مؤهلة','مستبعدة']:['Member','Active','Recorded complete','On time / eligible','Excluded']).map(x=>`<th>${x}</th>`).join('')}</tr></thead><tbody>${r.team.map(p=>`<tr><td>${escape(p.full_name)}</td><td>${p.active}</td><td>${p.completed}</td><td>${p.on_time} / ${p.eligible}</td><td>${p.excluded}</td></tr>`).join('')}</tbody></table><h2>${ar?'اتجاه الإغلاق الشهري':'Monthly closures'}</h2>${r.trends.map(t=>`<div>${escape(t.month)} · ${t.completed}<div class="bar" style="width:${Math.max(1,100*t.completed/Math.max(1,...r.trends.map(t=>t.completed)))}%"></div></div>`).join('')||'<p>—</p>'}<h2>${ar?'ملاحظات القراءة':'Interpretation'}</h2><p>${ar?'حجم العمل لا يقيّم الجودة. تاريخ إكمال الموظف مستقل عن إغلاق المشرف. البيانات التاريخية الناقصة مستبعدة، ولا تُعامل كصفر.':'Workload does not measure quality. Individual completion is independent of supervisor closure. Missing historical data is excluded, never scored as zero.'}</p><section class="page"><h2>${ar?'تعريفات المؤشرات':'Metric definitions'}</h2>${(ar?definitionsAr:definitions).map(([k,v])=>`<p><b>${escape(k)}</b>: ${escape(v)}</p>`).join('')}</section></body></html>`;
}
