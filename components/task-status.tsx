import type {TaskStatus} from "@/lib/types";
import {TASK_STATUS_LABELS} from "@/lib/types";
export function TaskStatusBadge({status}:{status:TaskStatus}) {return <span className={`status ${status}`}>{TASK_STATUS_LABELS[status]||status}</span>;}
export function Progress({value}:{value:number}) {return <div role="progressbar" aria-label="نسبة التقدم" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100} className="progress"><div style={{width:`${Math.max(0,Math.min(100,value||0))}%`}}/></div>;}
