/* Isolated component review, not authenticated E2E. */
const fs=require('fs'),path=require('path'),ts=require('typescript');
require.extensions['.ts']=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,esModuleInterop:true,target:ts.ScriptTarget.ES2022}}).outputText,f);
const {chromium}=require('playwright-core');
const server=require('./analytics-server.cjs');
(async()=>{
 const executable=process.env.QA_CHROMIUM_PATH; if(!executable)throw Error('Set QA_CHROMIUM_PATH to an isolated test browser');
 const browser=await chromium.launch({executablePath:executable,args:['--no-sandbox','--disable-dev-shm-usage','--single-process'],headless:true});
 const page=await browser.newPage({reducedMotion:"reduce"});await page.route('**/*',route=>new URL(route.request().url()).hostname==='127.0.0.1'?route.continue():route.abort());
 const out='docs/analytics/screenshots';fs.mkdirSync(out,{recursive:true});const results=[];
 const manifest=JSON.parse(fs.readFileSync('.review/output/manifest.json','utf8'));
 for(const view of manifest)for(const [size,width,height] of [['desktop',1440,1000],['tablet',768,1024],['mobile',390,844]]){
  await page.setViewportSize({width,height});
  await page.goto('http://127.0.0.1:3001/'+view.name+'.html');await page.evaluate(()=>document.fonts.ready);
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2);
  await page.screenshot({path:`${out}/${view.name}-${size}.jpg`,fullPage:true,type:'jpeg',quality:55});
  results.push({view:view.name,size,overflow,mode:'real-component-render/synthetic-fixtures/actions-disconnected'});
 }
 for(const locale of ['ar','en'])for(const name of ['dashboard','tasks','reports']){
  await page.setViewportSize({width:1440,height:1000});await page.goto(`http://127.0.0.1:3001/before/${name}-supervisor-${locale}.html`);await page.screenshot({path:`${out}/before-${name}-${locale}.jpg`,fullPage:true,type:'jpeg',quality:55});
 }
 const {reportHtml}=require('../../lib/analytics/export.ts'),snapshot=JSON.parse(fs.readFileSync('.review/analytics/sample-snapshot.json','utf8')),assets=require('../../lib/brand-assets.json');
 const font=fs.readFileSync('public/fonts/Cairo.ttf').toString('base64'),logo=fs.readFileSync(path.join('public',assets.horizontal.src)).toString('base64');
 for(const locale of ['ar','en']){await page.setContent(reportHtml(snapshot,locale,font,logo));await page.evaluate(()=>document.fonts.ready);await page.pdf({path:`docs/analytics/samples/synthetic-report-${locale}.pdf`,format:'A4',printBackground:true,displayHeaderFooter:true,headerTemplate:'<div style="font-size:9px;margin:auto">AL AHRAM · Synthetic QA report</div>',footerTemplate:'<div style="font-size:9px;margin:auto"><span class="pageNumber"></span> / <span class="totalPages"></span></div>',margin:{top:'20mm',bottom:'20mm'}});}
 fs.writeFileSync('docs/analytics/browser-results.json',JSON.stringify(results,null,2));await browser.close();server.close();console.log(JSON.stringify({views:results.length,overflow:results.filter(r=>r.overflow)}));
})().catch(e=>{console.error(e);process.exit(1)});
