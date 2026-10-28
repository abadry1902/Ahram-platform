"use server";
import {createClient as createAdminClient} from "@supabase/supabase-js";
import {redirect} from "next/navigation";
import {revalidatePath} from "next/cache";
import {z} from "zod";
import {requireSupervisor} from "@/lib/auth";
const schema=z.object({email:z.string().email().max(254),full_name:z.string().trim().min(2).max(120),role:z.enum(["employee","content_editor","supervisor"])});
export async function inviteTeamMember(form:FormData){
 await requireSupervisor();
 const p=schema.safeParse({email:String(form.get("email")||"").trim().toLowerCase(),full_name:String(form.get("full_name")||"").trim(),role:String(form.get("role")||"employee")});
 if(!p.success)redirect("/app/team?error=invalid");
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!url||!key)redirect("/app/team?error=admin_config");
 // Service-role client never leaves the server, and this action checks the supervisor's session first.
 const admin=createAdminClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
 const siteUrl=process.env.NEXT_PUBLIC_SITE_URL;
 if(!siteUrl||!siteUrl.startsWith("https://"))redirect("/app/team?error=admin_config");
 const {data,error}=await admin.auth.admin.inviteUserByEmail(p.data.email,{data:{full_name:p.data.full_name},redirectTo:new URL("/auth/confirm",siteUrl).href});
 if(error||!data.user)redirect("/app/team?error=invite");
 const {error:roleError}=await admin.from("profiles").update({full_name:p.data.full_name,role:p.data.role}).eq("id",data.user.id);
 if(roleError)redirect("/app/team?error=profile");
 revalidatePath("/app/team");redirect("/app/team?ok=invited");
}

export async function manageTeamMember(form:FormData){
 const {db}=await requireSupervisor();
 const parsed=z.object({id:z.string().uuid(),role:z.enum(["employee","content_editor","supervisor"]),active:z.enum(["true","false"])}).safeParse({id:form.get("id"),role:form.get("role"),active:form.get("active")});
 if(!parsed.success)redirect("/app/team?error=invalid");
 const {error}=await db.rpc("manage_team_member_secure",{p_member:parsed.data.id,p_role:parsed.data.role,p_active:parsed.data.active==="true"});
 if(error)redirect("/app/team?error="+(["self","last_supervisor"].includes(error.message)?error.message:"permission"));
 revalidatePath("/app/team");redirect("/app/team?ok=saved");
}
