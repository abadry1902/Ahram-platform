export const statuses=['new','in_progress','paused','awaiting_review','done','expired'] as const;
export type Filters=Record<string,string>;
export function parseFilters(raw:Record<string,string|string[]|undefined>,now=new Date()):Filters {
 const out:Filters={};const get=(k:string)=>typeof raw[k]==='string'?raw[k] as string:'';
 for(const [key,values] of Object.entries({assignment_metric:['completed','eligible','on_time','excluded','overdue','paused'],status:statuses,priority:['low','medium','high','urgent'],shared:['0','1'],overdue:['1'],active:['1'],date_field:['created_at','due_at','closed_at'],sort:['newest','due','priority','progress'],preset:['today','last7','last30','thisMonth']}))if((values as readonly string[]).includes(get(key)))out[key]=get(key);
 for(const key of ['client_id','leader_id','assignee','task_type_id'])if(/^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/i.test(get(key)))out[key]=get(key);
 for(const key of ['from','to']){const value=get(key);if(/^\d{4}-\d{2}-\d{2}$/.test(value)&&!Number.isNaN(Date.parse(value))&&new Date(value).toISOString().slice(0,10)===value)out[key]=value;}
 if(get('q').trim())out.q=get('q').trim().slice(0,100);
 const date=new Intl.DateTimeFormat('en-CA',{timeZone:'Africa/Cairo',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
 if(out.preset){out.to=date;const start=new Date(date+'T12:00:00Z');if(out.preset==='last7')start.setUTCDate(start.getUTCDate()-6);if(out.preset==='last30')start.setUTCDate(start.getUTCDate()-29);if(out.preset==='thisMonth')start.setUTCDate(1);out.from=start.toISOString().slice(0,10);}
 if(out.from&&out.to&&out.from>out.to)[out.from,out.to]=[out.to,out.from];
 return out;
}
export function filterUrl(base:string,filters:Filters,patch:Filters={}) {const params=new URLSearchParams({...filters,...patch});for(const [k,v] of [...params])if(!v)params.delete(k);return base+(params.size?'?'+params.toString():'');}
export function pageNumber(value:unknown){return typeof value==='string'&&/^\d{1,6}$/.test(value)?Math.max(1,Math.min(100000,Number(value))):1;}
export function previousPeriod(f:Filters):Filters|null{if(!f.from||!f.to)return null;const start=Date.parse(f.from),end=Date.parse(f.to),span=end-start+86400000;return {...f,preset:'',from:new Date(start-span).toISOString().slice(0,10),to:new Date(start-86400000).toISOString().slice(0,10)};}
