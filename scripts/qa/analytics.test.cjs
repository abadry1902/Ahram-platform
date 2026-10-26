const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript');
require.extensions['.ts']=(module,file)=>module._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,esModuleInterop:true,target:ts.ScriptTarget.ES2022}}).outputText,file);
const {parseFilters,previousPeriod,pageNumber}=require('../../lib/analytics/filters.ts');
const {excelReport,safeCell,reportHtml}=require('../../lib/analytics/export.ts');
const ExcelJS=require('exceljs');
test('filters validate input and Cairo midnight, presets and previous-period boundaries',()=>{
 assert.deepEqual(parseFilters({q:' %x ',status:'invented',client_id:'bad',from:'2026-02-31',page:'-1'}),{q:'%x'});
 const f=parseFilters({preset:'today'},new Date('2026-10-25T22:30:00Z'));assert.equal(f.from,'2026-10-26');assert.equal(f.to,f.from);
 assert.deepEqual(previousPeriod({from:'2026-10-01',to:'2026-10-31'}),{from:'2026-08-31',to:'2026-09-30',preset:''});
 assert.equal(pageNumber('0'),1);assert.equal(pageNumber('999999'),100000);
});
test('seven-sheet export preserves exact values and typed dates, RTL, and neutralizes formula payloads',async()=>{
 const snapshot=JSON.parse(fs.readFileSync('.review/analytics/sample-snapshot.json','utf8'));
 snapshot.tasks[0].title='=HYPERLINK("https://invalid")';
 const bytes=await excelReport(snapshot,'ar'),book=new ExcelJS.Workbook();await book.xlsx.load(bytes);
 assert.equal(book.worksheets.length,7);assert.equal(book.getWorksheet('Executive Summary').getCell('B2').value,snapshot.report.metrics.total);
 assert.equal(book.getWorksheet('Tasks Overview').getCell('B2').value,"'"+snapshot.tasks[0].title);
 assert(book.getWorksheet('Tasks Overview').getCell('F2').value instanceof Date);
 assert.equal(book.getWorksheet('Tasks Overview').views[0].rightToLeft,true);
 assert.equal(book.getWorksheet('Tasks Overview').getCell('E2').value,snapshot.tasks[0].progress);
 assert.equal(safeCell(' @SUM(A1)'),"' @SUM(A1)");
 fs.mkdirSync('docs/analytics/samples',{recursive:true});snapshot.tasks[0].title='LOCAL QA on-time';fs.writeFileSync('docs/analytics/samples/synthetic-report-ar.xlsx',await excelReport(snapshot,'ar'));
 snapshot.tasks[0].title='LOCAL QA on-time';fs.writeFileSync('docs/analytics/samples/synthetic-report-en.xlsx',await excelReport(snapshot,'en'));
 const html=reportHtml(snapshot,'ar','font','logo');assert(html.includes('dir="rtl"'));assert(html.includes('size:A4'));assert(html.includes('display:table-header-group'));
});
