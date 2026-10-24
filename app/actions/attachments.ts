"use server";
import {randomUUID} from "node:crypto";
import {redirect} from "next/navigation";
import {revalidatePath} from "next/cache";
import {requireUser} from "@/lib/auth";
export async function uploadOperationalAttachment(form:FormData){
 const {db,user}=await requireUser();
 const taskId=String(form.get("task_id")||"");
 const file=form.get("file");
 if(!/^[a-f0-9-]{36}$/i.test(taskId)||!(file instanceof File))return;
 const {data:task}=await db.from("tasks").select("id,status").eq("id",taskId).maybeSingle();
 if(!task||["done","expired"].includes(task.status))redirect(`/app/tasks/${taskId}?attachment_error=closed`);
 const allowed:Record<string,string>={"application/pdf":"pdf","image/jpeg":"jpg","image/png":"png"};
 const ext=allowed[file.type];
 if(!ext||file.size<1||file.size>5*1024*1024)redirect(`/app/tasks/${taskId}?attachment_error=type`);
 const filename=file.name.replace(/[\\/\x00-\x1F]/g,"").slice(0,180)||`document.${ext}`;
 const path=`${taskId}/${user.id}/${randomUUID()}.${ext}`;
 const {error}=await db.storage.from("task-ops").upload(path,Buffer.from(await file.arrayBuffer()),{contentType:file.type,upsert:false});
 if(error)redirect(`/app/tasks/${taskId}?attachment_error=upload`);
 const {error:dbError}=await db.from("task_attachments").insert({task_id:taskId,uploader_id:user.id,filename,storage_path:path,mime_type:file.type,byte_size:file.size});
 if(dbError)redirect(`/app/tasks/${taskId}?attachment_error=record`);
 revalidatePath(`/app/tasks/${taskId}`);redirect(`/app/tasks/${taskId}`);
}
