"use server";
import {redirect} from "next/navigation";
import {isWorkspaceEnabled} from "@/lib/readiness";
import {createClient} from "@/lib/supabase/server";
export async function signIn(data:FormData) {
 const locale=data.get("locale")==="en"?"en":"ar";
 if(!isWorkspaceEnabled())redirect(`/login?locale=${locale}&error=configuration`);
 const email=String(data.get("email")||"").trim();const password=String(data.get("password")||"");
 if(!email||!password)redirect("/login?error=invalid");
 const db=await createClient();if(!db)redirect("/login?error=configuration");
 const {error}=await db.auth.signInWithPassword({email,password});
 if(error)redirect("/login?error=credentials");
 redirect("/app");
}
export async function signOut(){
 const db=await createClient();if(db)await db.auth.signOut();
 redirect("/login");
}
