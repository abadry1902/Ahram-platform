import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type Role = "supervisor" | "employee" | "content_editor";
export async function requireUser() {
  const db = await createClient();
  if (!db) redirect("/login?error=configuration");
  const {data: {user}, error} = await db.auth.getUser();
  if (error || !user) redirect("/login");
  const assurance=await db.auth.mfa.getAuthenticatorAssuranceLevel();
  if(assurance.error||assurance.data.currentLevel!=="aal2")redirect("/auth/mfa");
  const {data: profile} = await db.from("profiles").select("id,full_name,role").eq("id",user.id).single();
  if (!profile) redirect("/login?error=profile");
  return {db, user, profile: profile as {id:string; full_name:string; role:Role}};
}
export async function requireSupervisor() {
  const context = await requireUser();
  if (context.profile.role !== "supervisor") redirect("/app");
  return context;
}
