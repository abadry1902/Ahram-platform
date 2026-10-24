"use server";
import {revalidatePath} from "next/cache";
import {redirect} from "next/navigation";
import {z} from "zod";
import {requireSupervisor,requireUser} from "@/lib/auth";
const uid=z.string().uuid();
const taskSchema=z.object({title:z.string().trim().min(3).max(180),description:z.string().trim().max(4000),priority:z.enum(["low","medium","high","urgent"]),due_at:z.string().optional(),leader_id:z.union([uid,z.literal("")])});
function trimmed(data:FormData,k:string){return String(data.get(k)||"").trim();}
export async function createTask(data:FormData){
 const {db}=await requireSupervisor();
 const raw={title:trimmed(data,"title"),description:trimmed(data,"description"),priority:trimmed(data,"priority"),due_at:trimmed(data,"due_at"),leader_id:trimmed(data,"leader_id")};
 const p=taskSchema.safeParse(raw);if(!p.success)redirect("/app/tasks/new?error=invalid");
 const assignees=[...new Set(data.getAll("assignees").map(String).filter(v=>uid.safeParse(v).success))];
 if(assignees.length===0 || (p.data.leader_id&&!assignees.includes(p.data.leader_id)))redirect("/app/tasks/new?error=assignees");
 const due=p.data.due_at?new Date(p.data.due_at):null;
 if(due&&Number.isNaN(due.getTime()))redirect("/app/tasks/new?error=date");
 const {data:id,error}=await db.rpc("create_task_secure",{p_title:p.data.title,p_description:p.data.description||null,p_priority:p.data.priority,p_due_at:due?.toISOString()||null,p_assignee_ids:assignees,p_leader_id:p.data.leader_id||null});
 if(error||!id)redirect("/app/tasks/new?error=create");
 revalidatePath("/app");revalidatePath("/app/tasks");redirect(`/app/tasks/${id}`);
}
export async function setStatus(data:FormData){
 const {db}=await requireUser();const taskId=trimmed(data,"task_id");const status=trimmed(data,"status");const reason=trimmed(data,"reason");
 if(!uid.safeParse(taskId).success || !["new","in_progress","paused","awaiting_review","done","expired"].includes(status))return;
 const {error}=await db.rpc("set_task_status_secure",{p_task_id:taskId,p_status:status,p_reason:reason||null});
 if(error)redirect(`/app/tasks/${taskId}?error=status`);
 revalidatePath(`/app/tasks/${taskId}`);revalidatePath("/app");
}
export async function setOverallProgress(data:FormData){
 const {db}=await requireUser();const taskId=trimmed(data,"task_id");const progress=Number(data.get("progress"));
 if(!uid.safeParse(taskId).success || !Number.isInteger(progress)||progress<0||progress>100)return;
 const {error}=await db.rpc("set_overall_progress_secure",{p_task_id:taskId,p_progress:progress});
 if(error)redirect(`/app/tasks/${taskId}?error=progress`);
 revalidatePath(`/app/tasks/${taskId}`);
}
export async function setMyProgress(data:FormData){
 const {db,user}=await requireUser();const taskId=trimmed(data,"task_id");const progress=Number(data.get("progress"));
 if(!uid.safeParse(taskId).success||!Number.isInteger(progress)||progress<0||progress>100)return;
 await db.from("task_assignments").update({progress,updated_at:new Date().toISOString()}).eq("task_id",taskId).eq("user_id",user.id);
 revalidatePath(`/app/tasks/${taskId}`);
}
export async function postTaskNote(data:FormData){
 const {db,user}=await requireUser();const taskId=trimmed(data,"task_id");const body=trimmed(data,"body");
 if(!uid.safeParse(taskId).success||body.length<1||body.length>3000)return;
 await db.from("task_notes").insert({task_id:taskId,author_id:user.id,body});
 revalidatePath(`/app/tasks/${taskId}`);
}
export async function addTaskStep(data:FormData){
 const {db}=await requireSupervisor();const taskId=trimmed(data,"task_id");const title=trimmed(data,"title");
 if(!uid.safeParse(taskId).success||title.length<3||title.length>180)return;
 await db.from("task_steps").insert({task_id:taskId,title});
 revalidatePath(`/app/tasks/${taskId}`);
}
export async function toggleStep(data:FormData){
 const {db,user}=await requireUser();const taskId=trimmed(data,"task_id");const stepId=trimmed(data,"step_id");
 if(!uid.safeParse(taskId).success||!uid.safeParse(stepId).success)return;
 const {data:existing}=await db.from("step_completions").select("step_id").eq("step_id",stepId).eq("user_id",user.id).maybeSingle();
 if(existing)await db.from("step_completions").delete().eq("step_id",stepId).eq("user_id",user.id);
 else await db.from("step_completions").insert({step_id:stepId,user_id:user.id});
 revalidatePath(`/app/tasks/${taskId}`);
}
