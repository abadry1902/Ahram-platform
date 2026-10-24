"use server";
import {redirect} from "next/navigation";
import {z} from "zod";
import {createClient} from "@/lib/supabase/server";
const schema=z.object({name:z.string().trim().min(2).max(120),email:z.string().trim().email().max(250),phone:z.string().trim().max(32),message:z.string().trim().min(10).max(2000),locale:z.enum(["ar","en"])});
export async function sendEnquiry(data:FormData){
 const locale=data.get("locale")==="en"?"en":"ar";
 if(data.get("website"))redirect(`/${locale}/contact?sent=1`);
 const p=schema.safeParse(Object.fromEntries(["name","email","phone","message","locale"].map(k=>[k,String(data.get(k)||"")])));
 if(!p.success)redirect(`/${locale}/contact?error=invalid`);
 const db=await createClient();if(!db)redirect(`/${locale}/contact?error=config`);
 const {error}=await db.from("contact_enquiries").insert({...p.data,source:"public_form"});
 if(error)redirect(`/${locale}/contact?error=send`);
 redirect(`/${locale}/contact?sent=1`);
}
