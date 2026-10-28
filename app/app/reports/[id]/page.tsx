import {notFound} from 'next/navigation';
import Link from 'next/link';
import {requireSupervisor} from '@/lib/auth';
import {workspaceI18n} from '@/lib/workspace-locale';
import {parseFilters,filterUrl} from '@/lib/analytics/filters';
import {taskReport} from '@/lib/analytics/queries';
import {AnalyticsReport} from '@/components/analytics-report';
export default async function MemberReport({params,searchParams}:{params:Promise<{id:string}>;searchParams:Promise<Record<string,string|string[]|undefined>>}){
 const {db}=await requireSupervisor(),{locale}=await workspaceI18n(),{id}=await params;
 const f=parseFilters({...await searchParams,assignee:id});if(f.assignee!==id)notFound();
 const {data:member}=await db.from('profiles').select('id,full_name').eq('id',id).maybeSingle();if(!member)notFound();
 try{const report=await taskReport(db,f);report.team=report.team.filter(p=>p.id===id);report.member_trends=report.member_trends.filter(p=>p.user_id===id);return <><Link href={filterUrl('/app/reports',f,{assignee:''})}>{locale==='ar'?'← الفريق':'← Team'}</Link><h1>{member.full_name}</h1><AnalyticsReport report={report} previous={null} locale={locale} filters={f}/></>;}catch{return <div className="notice warning">{locale==='ar'?'تعذر تحميل التقرير':'Report unavailable'}</div>;}
}
