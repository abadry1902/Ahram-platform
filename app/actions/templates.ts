"use server";
import {revalidatePath} from "next/cache";
import {requireSupervisor} from "@/lib/auth";
export async function createTaskTemplate(form:FormData){
 const {db}=await requireSupervisor();const name=String(form.get("name_ar")||"").trim();
 const stages=String(form.get("stages")||"").split(/\r?\n/).map(s=>s.trim()).filter(Boolean).slice(0,20);
 if(name.length<3||name.length>100||stages.length===0||stages.some(s=>s.length>120))return;
 await db.from("task_types").insert({name_ar:name,stages});
 revalidatePath("/app/templates");
}
