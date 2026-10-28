import {workspaceI18n} from '@/lib/workspace-locale';
import {requireSupervisor} from '@/lib/auth';
import {TaskFilters} from '@/components/task-filters';
import {AnalyticsReport} from '@/components/analytics-report';
import {taskReport,type Report} from '@/lib/analytics/queries';
import {parseFilters,previousPeriod,filterUrl} from '@/lib/analytics/filters';
export default async function Reports({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}){
 const {locale,t}=await workspaceI18n(),{db,profile}=await requireSupervisor(),f=parseFilters(await searchParams),ar=locale==='ar';
 const pdfReady=Boolean(process.env.CHROMIUM_EXECUTABLE_PATH);
 const [{data:profiles},{data:clients},{data:selected},{data:types}]=await Promise.all([db.from('profiles').select('id,full_name').order('full_name'),db.from('clients').select('id,name').order('name').limit(50),f.client_id?db.from('clients').select('id,name').eq('id',f.client_id).maybeSingle():Promise.resolve({data:null}),db.from('task_types').select('id,name_ar,name_en').order('name_ar')]);
 let report:Report|null=null,previous:Report|null=null;try{report=await taskReport(db,f);const prev=previousPeriod(f);if(prev)previous=await taskReport(db,prev);}catch{}
 return <><div className="title-row"><div><span className="eyebrow">PERFORMANCE</span><h1>{t('التقارير ومتابعة الأداء')}</h1><p className="muted">{ar?'أرقام موحّدة وقراءة شفافة للأعمال والفريق.':'Consistent numbers and transparent operational insights.'}</p></div><div className="filter-actions"><a className="button" href={filterUrl('/api/reports/export',f,{format:'xlsx',locale})}>{ar?'تصدير Excel':'Export Excel'}</a>{pdfReady?<a className="button outline" href={filterUrl('/api/reports/export',f,{format:'pdf',locale})}>{ar?'تصدير PDF':'Export PDF'}</a>:<button className="button outline" type="button" disabled title={ar?'تصدير PDF غير متاح حاليًا':'PDF export is currently unavailable'}>{ar?'تصدير PDF — غير متاح حاليًا':'PDF export — currently unavailable'}</button>}</div></div>
 <TaskFilters key={JSON.stringify(f)} base="/app/reports" locale={locale} filters={f} profiles={profiles||[]} clients={clients||[]} selected={selected} types={types||[]} userId={profile.id}/>
 {report?<AnalyticsReport report={report} previous={previous} locale={locale} filters={f}/>:<div className="notice warning" role="alert">{ar?'التقارير غير متاحة. تحقق من الاتصال وترحيل التحليلات قبل الاستخدام.':'Reports unavailable. Check connectivity and analytics migration readiness.'}</div>}</>;
}
