import Link from 'next/link';
import {TaskList} from '@/components/task-list';
import {TaskFilters} from '@/components/task-filters';
import {workspaceI18n} from '@/lib/workspace-locale';
import {requireUser} from '@/lib/auth';
import {parseFilters,pageNumber,filterUrl} from '@/lib/analytics/filters';
import {taskPage} from '@/lib/analytics/queries';
export default async function TasksPage({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}){
 const {locale,t}=await workspaceI18n(),{db,profile}=await requireUser(),raw=await searchParams,f=parseFilters(raw),page=pageNumber(raw.page),ar=locale==='ar';
 const [{data:profiles},{data:clients},{data:selected},{data:types}]=await Promise.all([db.from('profiles').select('id,full_name').order('full_name'),db.from('clients').select('id,name').order('name').limit(50),f.client_id?db.from('clients').select('id,name').eq('id',f.client_id).maybeSingle():Promise.resolve({data:null}),db.from('task_types').select('id,name_ar,name_en').order('name_ar')]);
 let result:Awaited<ReturnType<typeof taskPage>>|null=null;try{result=await taskPage(db,f,page);}catch{/* Never display a failed query as zero tasks. */}
 return <><div className="title-row"><div><span className="eyebrow">TASKS</span><h1>{t('إدارة المهام')}</h1><p className="muted">{ar?'فلاتر دقيقة، خطوات واضحة، ومتابعة في مكان واحد.':'Precise filters, clear steps, and one place to follow up.'}</p></div>{profile.role==='supervisor'&&<Link className="button" href="/app/tasks/new">{t('+ مهمة جديدة')}</Link>}</div>
 <TaskFilters key={JSON.stringify(f)} locale={locale} filters={f} profiles={profiles||[]} clients={clients||[]} selected={selected} types={types||[]} userId={profile.id}/>
 {result?<><p role="status" className="muted">{ar?`${result.total} نتيجة · صفحة ${page}`:`${result.total} results · Page ${page}`}</p><TaskList locale={locale} items={result.items}/><nav className="filter-actions" aria-label={ar?'صفحات النتائج':'Result pages'}>{page>1&&<Link className="button outline" href={filterUrl('/app/tasks',f,{page:String(page-1)})}>{ar?'السابق':'Previous'}</Link>}{page*25<result.total&&<Link className="button outline" href={filterUrl('/app/tasks',f,{page:String(page+1)})}>{ar?'التالي':'Next'}</Link>}</nav></>:<div className="notice warning" role="alert">{ar?'تعذر تحميل المهام. تحقق من الاتصال وتفعيل ترحيل التحليلات المعتمد.':'Tasks could not be loaded. Check connectivity and the approved analytics migration.'}</div>}</>;
}
