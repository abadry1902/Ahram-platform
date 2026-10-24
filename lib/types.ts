export type TaskStatus = "new" | "in_progress" | "paused" | "awaiting_review" | "done" | "expired";
export const TASK_STATUS_LABELS: Record<TaskStatus,string> = {
  new:"جديدة", in_progress:"قيد التنفيذ", paused:"متوقفة", awaiting_review:"بانتظار المراجعة", done:"تامة", expired:"منقضية"
};
export type Task = {
 id: string; title: string; description:string|null; status:TaskStatus; priority:"low"|"medium"|"high"|"urgent";
 progress:number; leader_id:string|null; due_at:string|null; created_at:string; closed_at:string|null;
 pause_reason:string|null; closure_reason:string|null; task_type_id:string|null;
};
