"use server";
import {revalidatePath} from "next/cache";
import {requireUser} from "@/lib/auth";
export async function markNotificationRead(form:FormData){
 const id=String(form.get("id")||"");if(!/^[0-9a-f-]{36}$/.test(id))return;
 const {db,user}=await requireUser();
 await db.from("notifications").update({read_at:new Date().toISOString()}).eq("id",id).eq("user_id",user.id);
 revalidatePath("/app/notifications");
}
