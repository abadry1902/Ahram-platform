import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {requireSupervisor} from '@/lib/auth';
import {parseFilters} from '@/lib/analytics/filters';
import {excelReport,reportHtml,type Snapshot} from '@/lib/analytics/export';
import assets from '@/lib/brand-assets.json';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function GET(request:Request){
 const {db}=await requireSupervisor(),url=new URL(request.url),format=url.searchParams.get('format')||'xlsx',locale=url.searchParams.get('locale')==='en'?'en':'ar';
 if(!['xlsx','pdf'].includes(format))return new Response('Unsupported export format',{status:400});
 if(format==='pdf'&&!process.env.CHROMIUM_EXECUTABLE_PATH)return new Response(locale==='ar'?'تصدير PDF يحتاج إعداد Chromium في خادم Node.':'PDF export requires Chromium configured on the Node server.',{status:503});
 const f=parseFilters(Object.fromEntries(url.searchParams));
 const {data,error}=await db.rpc('report_export_v1',{f,export_format:format});
 if(error)return new Response(locale==='ar'?'تعذر إنشاء التقرير. ضيّق الفترة أو انتظر قليلًا وأعد المحاولة.':'Report unavailable. Narrow the date range or wait before retrying.',{status:503});
 const snapshot=data as Snapshot;
 try{
 let bytes:Buffer;
 if(format==='xlsx')bytes=await excelReport(snapshot,locale);
 else {
 const [{chromium},font,logo]=await Promise.all([import('playwright-core'),readFile(path.join(process.cwd(),'public/fonts/Cairo.ttf')),readFile(path.join(process.cwd(),'public',assets.horizontal.src))]);
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE_PATH,chromiumSandbox:true});
 try{const page=await browser.newPage();await page.route('**/*',r=>r.abort());await page.setContent(reportHtml(snapshot,locale,font.toString('base64'),logo.toString('base64')),{waitUntil:'load',timeout:15000});await page.evaluate(()=>document.fonts.ready);bytes=await page.pdf({format:'A4',printBackground:true,displayHeaderFooter:true,headerTemplate:'<div style="font-size:9px;margin:auto;color:#1546A0">AL AHRAM · Operations</div>',footerTemplate:'<div style="font-size:9px;margin:auto"><span class="pageNumber"></span> / <span class="totalPages"></span></div>',margin:{top:'20mm',bottom:'20mm'}});}finally{await browser.close();}
 }
 return new Response(new Uint8Array(bytes),{headers:{'Content-Type':format==='xlsx'?'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':'application/pdf','Content-Disposition':`attachment; filename="AL-AHRAM-report.${format}"`,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
 }catch{return new Response(locale==='ar'?'تعذر تجهيز ملف التقرير.':'Report rendering failed.',{status:503,headers:{'Cache-Control':'no-store'}});}
}
