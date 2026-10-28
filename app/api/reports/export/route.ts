import {requireSupervisor} from '@/lib/auth';
import {parseFilters} from '@/lib/analytics/filters';
import {excelReport,reportHtml,type Snapshot} from '@/lib/analytics/export';
import assets from '@/lib/brand-assets.json';
export const dynamic='force-dynamic';
export async function GET(request:Request){
 const {db}=await requireSupervisor(),url=new URL(request.url),format=url.searchParams.get('format')||'xlsx',locale=url.searchParams.get('locale')==='en'?'en':'ar';
 const headers={'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'};
 if(!['xlsx','pdf'].includes(format))return new Response('Unsupported export format',{status:400,headers});
 const f=parseFilters(Object.fromEntries(url.searchParams));
 const {data,error}=await db.rpc('report_export_v1',{f,export_format:format});
 if(error)return new Response(locale==='ar'?'تعذر إنشاء التقرير. ضيّق الفترة أو انتظر قليلًا وأعد المحاولة.':'Report unavailable. Narrow the date range or wait before retrying.',{status:503,headers});
 try{
 const snapshot=data as Snapshot;
 if(format==='xlsx')return new Response(new Uint8Array(await excelReport(snapshot,locale)),{headers:{...headers,'Content-Type':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','Content-Disposition':'attachment; filename="AL-AHRAM-report.xlsx"'}});
 // Browser printing provides native Arabic shaping and paginated PDF on Workers,
 // without sending authenticated report data to a third-party rendering service.
 const nonce=crypto.randomUUID().replaceAll('-','');
 let html=reportHtml(snapshot,locale,'','').replace('data:font/ttf;base64,','/fonts/Cairo.ttf').replace('data:image/png;base64,',assets.horizontal.src);
 const label=locale==='ar'?'طباعة / حفظ PDF':'Print / Save PDF';
 const hint=locale==='ar'?'اختر «حفظ كملف PDF» من نافذة الطباعة لتنزيل التقرير.':'Choose “Save as PDF” in the print dialog to download the report.';
 html=html.replace('</style>','.print-controls{padding:16px;background:#E8F0FC;margin-bottom:20px}.print-controls button{font:inherit;padding:10px 20px;cursor:pointer}@media print{.print-controls{display:none}} @media screen{body{max-width:1000px;margin:24px auto;padding:20px}}</style>');
 html=html.replace('<body>',`<body><div class="print-controls"><button id="print-report" type="button">${label}</button><p>${hint}</p></div>`);
 html=html.replace('</body>',`<script nonce="${nonce}">document.getElementById('print-report').addEventListener('click',async()=>{await document.fonts.ready;window.print()});</script></body>`);
 return new Response(html,{headers:{...headers,'Content-Type':'text/html; charset=utf-8','Content-Security-Policy':`default-src 'none'; style-src 'unsafe-inline'; font-src 'self'; img-src 'self' data:; script-src 'nonce-${nonce}'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'`}});
 }catch{return new Response(locale==='ar'?'تعذر تجهيز ملف التقرير.':'Report rendering failed.',{status:503,headers});}
}
