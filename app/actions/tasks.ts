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
 let templateId=trimmed(data,"task_type_id");
 const templateName=trimmed(data,"new_template_name");
 if(templateName){const stages=trimmed(data,"new_template_stages").split(/\r?\n/).map(s=>s.trim()).filter(Boolean);if(templateName.length<3||templateName.length>100||!stages.length||stages.length>20||stages.some(s=>s.length>120))redirect("/app/tasks/new?error=template");const {data:created,error:templateError}=await db.from("task_types").insert({name_ar:templateName,stages}).select("id").single();if(templateError||!created)redirect("/app/tasks/new?error=template");templateId=created.id;}
 if(templateId&&!uid.safeParse(templateId).success)redirect("/app/tasks/new?error=template");
 const clientId=trimmed(data,"client_id"),clientName=trimmed(data,"new_client_name");
 if(trimmed(data,"client_search")&&!clientId&&!clientName)redirect("/app/tasks/new?error=select_client");
 if((clientId&&!uid.safeParse(clientId).success)||(clientName&&(clientName.length<2||clientName.length>160)))redirect("/app/tasks/new?error=client");
 const {data:id,error}=await db.rpc("create_task_for_client_secure",{p_client_id:clientId||null,p_new_client_name:clientName||null,p_template_id:templateId||null,p_title:p.data.title,p_description:p.data.description||null,p_priority:p.data.priority,p_due_at:due?.toISOString()||null,p_assignee_ids:assignees,p_leader_id:assignees.length===1?assignees[0]:p.data.leader_id||null});
 if(error||!id)redirect("/app/tasks/new?error=create");
 revalidatePath("/app");revalidatePath("/app/tasks");redirect(`/app/tasks/${id}?ok=created`);
}
export async function setStatus(data:FormData){
 const {db}=await requireUser();const taskId=trimmed(data,"task_id");const status=trimmed(data,"status");const reason=trimmed(data,"reason");
 if(!uid.safeParse(taskId).success || !["new","in_progress","paused","awaiting_review","done","expired"].includes(status))return;
 const {error}=await db.rpc("set_task_status_secure",{p_task_id:taskId,p_status:status,p_reason:reason||null});
 if(error)redirect(`/app/tasks/${taskId}?error=status`);
 revalidatePath(`/app/tasks/${taskId}`);revalidatePath("/app");redirect(`/app/tasks/${taskId}?ok=saved`);
}
export async function setOverallProgress(data:FormData){
 const {db}=await requireUser();const taskId=trimmed(data,"task_id");const progress=Number(data.get("progress"));
 if(!uid.safeParse(taskId).success || !Number.isInteger(progress)||progress<0||progress>100)return;
 const {error}=await db.rpc("set_overall_progress_secure",{p_task_id:taskId,p_progress:progress});
 if(error)redirect(`/app/tasks/${taskId}?error=progress`);
 revalidatePath(`/app/tasks/${taskId}`);revalidatePath("/app/tasks");revalidatePath("/app");revalidatePath("/app/reports");
}
export async function setMyProgress(data:FormData){
 const {db,user}=await requireUser();const taskId=trimmed(data,"task_id");const progress=Number(data.get("progress"));
 if(!uid.safeParse(taskId).success||!Number.isInteger(progress)||progress<0||progress>100)return;
 const {error}=await db.from("task_assignments").update({progress,updated_at:new Date().toISOString()}).eq("task_id",taskId).eq("user_id",user.id);
 if(error)redirect(`/app/tasks/${taskId}?error=save`);
 revalidatePath(`/app/tasks/${taskId}`);redirect(`/app/tasks/${taskId}?ok=saved`);
}
export async function setMyStatus(data:FormData){
 const {db,user}=await requireUser();const taskId=trimmed(data,"task_id");
 const status=trimmed(data,"status");const pause=trimmed(data,"reason");
 if(!uid.safeParse(taskId).success||!["new","in_progress","paused","completed"].includes(status))return;
 if(status==="paused"&&pause.length<5)redirect(`/app/tasks/${taskId}?error=pause`);
 const {error}=await db.from("task_assignments")
  .update({status,pause_reason:status==="paused"?pause:null,updated_at:new Date().toISOString()})
  .eq("task_id",taskId).eq("user_id",user.id);
 if(error)redirect(`/app/tasks/${taskId}?error=personal`);
 revalidatePath(`/app/tasks/${taskId}`);redirect(`/app/tasks/${taskId}?ok=saved`);
}
export async function postTaskNote(data:FormData){
 const {db,user}=await requireUser();const taskId=trimmed(data,"task_id");const body=trimmed(data,"body");
 if(!uid.safeParse(taskId).success||body.length<1||body.length>3000)return;
 const {error}=await db.from("task_notes").insert({task_id:taskId,author_id:user.id,body});
 if(error)redirect(`/app/tasks/${taskId}?error=save`);
 revalidatePath(`/app/tasks/${taskId}`);redirect(`/app/tasks/${taskId}?ok=saved`);
}
export async function addTaskStep(data:FormData){
 const {db}=await requireSupervisor();const taskId=trimmed(data,"task_id");const title=trimmed(data,"title");
 if(!uid.safeParse(taskId).success||title.length<3||title.length>180)return;
 const {error}=await db.from("task_steps").insert({task_id:taskId,title});
 if(error)redirect(`/app/tasks/${taskId}?error=save`);
 revalidatePath(`/app/tasks/${taskId}`);redirect(`/app/tasks/${taskId}?ok=saved`);
}
export async function toggleStep(data:FormData){
 const taskId=trimmed(data,"task_id"),stepId=trimmed(data,"step_id");
 if(!uid.safeParse(taskId).success||!uid.safeParse(stepId).success)return;
 try{const current=await getTaskChecklist(taskId);const step=current.steps.find(s=>s.id===stepId);if(!step)throw new Error();await setChecklistStep(taskId,stepId,!step.checked);}catch{redirect(`/app/tasks/${taskId}?error=save`);}
 redirect(`/app/tasks/${taskId}?ok=saved`);
}

export async function searchClients(term:string){
 const {db}=await requireUser();
 const q=String(term||"").trim().slice(0,160).replace(/[\\%_]/g,"\\$&");
 let query=db.from("clients").select("id,name").order("name").limit(50);
 if(q)query=query.ilike("name",`%${q}%`);
 const {data,error}=await query;if(error)throw new Error("clients_unavailable");return data||[];
}
export async function getTaskChecklist(taskId:string){
 const {db,user}=await requireUser();if(!uid.safeParse(taskId).success)throw new Error("invalid_task");
 const {data:task,error}=await db.from("tasks").select("id,status,progress").is("deleted_at",null).eq("id",taskId).single();
 if(error||!task)throw new Error("task_unavailable");
 const [{data:steps,error:stepsError},{data:assignment}]=await Promise.all([
  db.from("task_steps").select("id,title,stage_name,sort_order").eq("task_id",taskId).order("sort_order").order("id"),
  db.from("task_assignments").select("progress").eq("task_id",taskId).eq("user_id",user.id).maybeSingle()
 ]);
 if(stepsError)throw new Error("steps_unavailable");
 const {data:done,error:doneError}=steps?.length?await db.from("step_completions").select("step_id").eq("user_id",user.id).in("step_id",steps.map(s=>s.id)):{data:[],error:null};
 if(doneError)throw new Error("steps_unavailable");const ids=new Set((done||[]).map(d=>d.step_id));
 const {data:members,error:membersError}=await db.from("task_assignments").select("user_id,progress,status").eq("task_id",taskId);
 if(membersError)throw new Error("members_unavailable");
 const {data:profiles,error:profilesError}=members&&members.length>1?await db.from("profiles").select("id,full_name").in("id",members.map(m=>m.user_id)):{data:[],error:null};
 if(profilesError)throw new Error("members_unavailable");
 const names=new Map((profiles||[]).map(p=>[p.id,p.full_name]));
 return {members:members&&members.length>1?members.map(m=>({...m,name:names.get(m.user_id)||m.user_id})):[],steps:(steps||[]).map(s=>({id:s.id,title:s.title,stage:s.stage_name,checked:ids.has(s.id)})),canEdit:!!assignment&&!["done","expired"].includes(task.status),progress:task.progress,myProgress:assignment?.progress??null};
}
export async function setChecklistStep(taskId:string,stepId:string,checked:boolean){
 const {db,user}=await requireUser();if(!uid.safeParse(taskId).success||!uid.safeParse(stepId).success||typeof checked!=="boolean")throw new Error("invalid_step");
 const {data:assignment}=await db.from("task_assignments").select("user_id").eq("task_id",taskId).eq("user_id",user.id).maybeSingle();if(!assignment)throw new Error("not_assigned");
 const {data:step}=await db.from("task_steps").select("id").eq("id",stepId).eq("task_id",taskId).single();if(!step)throw new Error("step_unavailable");
 // Set desired state instead of toggling: retrying a request cannot invert progress.
 const result=checked?await db.from("step_completions").upsert({step_id:stepId,user_id:user.id},{onConflict:"step_id,user_id",ignoreDuplicates:true}):await db.from("step_completions").delete().eq("step_id",stepId).eq("user_id",user.id);
 if(result.error)throw new Error("save_failed");
 const updated=await getTaskChecklist(taskId);
 if(updated.steps.find(s=>s.id===stepId)?.checked!==checked)throw new Error("save_failed");
 revalidatePath(`/app/tasks/${taskId}`);revalidatePath("/app/tasks");revalidatePath("/app");revalidatePath("/app/reports");return updated;
}

export async function trashTask(form:FormData){
 const {db}=await requireSupervisor();const id=String(form.get("task_id")),restore=form.get("restore")==="true";
 if(!uid.safeParse(id).success)redirect("/app/tasks?error=invalid");
 const {error}=await db.rpc("trash_task_secure",{p_task:id,p_restore:restore});
 if(error)redirect("/app/tasks?error=permission");
 revalidatePath("/app","layout");redirect(restore?"/app/tasks?ok=saved":"/app/tasks?ok=deleted");
}
export async function completeUnstagedTask(taskId:string,completed:boolean){
 const {db}=await requireUser();if(!uid.safeParse(taskId).success||typeof completed!=="boolean")throw new Error("invalid");
 const {error}=await db.rpc("complete_unstaged_task_secure",{p_task:taskId,p_completed:completed});
 if(error)throw new Error("save_failed");
 revalidatePath("/app","layout");return getTaskChecklist(taskId);
}

export async function editTask(data:FormData){
 const {db}=await requireSupervisor();const id=trimmed(data,'task_id');
 if(!uid.safeParse(id).success)redirect('/app/tasks?error=invalid');
 const result=taskSchema.safeParse({title:trimmed(data,'title'),description:trimmed(data,'description'),priority:trimmed(data,'priority'),due_at:trimmed(data,'due_at'),leader_id:trimmed(data,'leader_id')});
 const clientId=trimmed(data,'client_id'),expected=trimmed(data,'expected_updated_at');
 if(!result.success||(clientId&&!uid.safeParse(clientId).success)||!expected||Number.isNaN(Date.parse(expected)))redirect(`/app/tasks/${id}?error=invalid`);
 if(trimmed(data,'client_search')&&!clientId)redirect(`/app/tasks/${id}?error=select_client`);
 const due=result.data.due_at?new Date(result.data.due_at):null;
 if(due&&Number.isNaN(due.getTime()))redirect(`/app/tasks/${id}?error=date`);
 const {error}=await db.rpc('edit_task_details_secure',{p_task_id:id,p_title:result.data.title,p_description:result.data.description||null,p_priority:result.data.priority,p_due_at:due?.toISOString()||null,p_client_id:clientId||null,p_leader_id:result.data.leader_id||null,p_expected_updated_at:expected});
 if(error)redirect(`/app/tasks/${id}?error=${error.message==='conflict'?'conflict':'edit'}`);
 revalidatePath('/app','layout');redirect(`/app/tasks/${id}?ok=saved`);
}
