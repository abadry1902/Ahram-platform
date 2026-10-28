import type {SupabaseClient} from '@supabase/supabase-js';
import type {Task} from '@/lib/types';
import type {Filters} from './filters';
export type TaskRow=Task&{memberCount:number;clientName:string|null};
export type Metrics={total:number;active:number;new:number;in_progress:number;paused:number;awaiting_review:number;done:number;expired:number;overdue:number;completion_rate:number|null;average_completion_hours:number|null};
export type Member={id:string;full_name:string;active:number;completed:number;eligible:number;on_time:number;excluded:number;overdue:number;progress:number|null;shared:number;led:number;paused:number;completion_hours:number|null;due_count:number;due_completed:number;pause_hours:number|null};
export type Report={metrics:Metrics;team:Member[];trends:{month:string;completed:number}[];priorities:{priority:string;count:number}[];review:{id:string;title:string;since:string|null}[];member_trends:{user_id:string;month:string;completed:number;on_time:number;eligible:number}[];durations:{review_hours:number|null;pause_hours:number|null};generated_at:string;timezone:string};
export async function taskPage(db:SupabaseClient,f:Filters,page=1,size=25){const {data,error}=await db.rpc('task_page_v1',{f,page_number:page,page_size:size});if(error)throw new Error('Task analytics unavailable',{cause:error});return data as {total:number;items:TaskRow[]};}
export async function taskMetrics(db:SupabaseClient,f:Filters={}){const {data,error}=await db.rpc('task_metrics_v1',{f});if(error)throw new Error('Task analytics unavailable',{cause:error});return data as Metrics;}
export async function taskReport(db:SupabaseClient,f:Filters){const {data,error}=await db.rpc('task_report_v1',{f});if(error)throw new Error('Task analytics unavailable',{cause:error});return data as Report;}
