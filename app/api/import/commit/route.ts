import {NextRequest,NextResponse} from "next/server";
import {z} from "zod";
import {createClient} from "@/lib/supabase/server";
export const runtime="nodejs";
const row=z.object({title:z.string().trim().min(3).max(180),description:z.string().max(4000).default(""),priority:z.enum(["urgent","high","medium","low"]),due_at:z.string().optional().default(""),assignees_text:z.string().max(500).default("")});
const payload=z.object({rows:z.array(row).min(1).max(50),default_assignee:z.string().uuid(),leader_id:z.string().uuid().optional().nullable()});
export async function POST(request:NextRequest){
 const db=await createClient();if(!db)return NextResponse.json({error:"Configuration required"},{status:503});
 const {data:{user}}=await db.auth.getUser();if(!user)return NextResponse.json({error:"Unauthorized"},{status:401});
 const {data:profile}=await db.from("profiles").select("role").eq("id",user.id).maybeSingle();
 if(profile?.role!=="supervisor")return NextResponse.json({error:"Forbidden"},{status:403});
 let json:unknown;try{json=await request.json();}catch{return NextResponse.json({error:"Invalid JSON"},{status:400});}
 const p=payload.safeParse(json);if(!p.success)return NextResponse.json({error:"Invalid import rows"},{status:400});
 const {data:staff}=await db.from("profiles").select("id,full_name").eq("is_active",true);
 const byName=new Map((staff||[]).map(x=>[x.full_name.trim().toLowerCase(),x.id]));
 if(!staff?.some(x=>x.id===p.data.default_assignee))return NextResponse.json({error:"Default assignee not found"},{status:400});
 let added=0;const errors:{row:number;reason:string}[]=[];const known=new Set<string>();
 for(const [index,r] of p.data.rows.entries()){
  const normalized=r.title.toLowerCase();
  if(known.has(normalized)){errors.push({row:index+1,reason:"Duplicate title within upload"});continue;}
  known.add(normalized);
  const nameList=r.assignees_text.split(/[;,،|]/).map(x=>x.trim()).filter(Boolean);
  const matched=nameList.map(s=>byName.get(s.toLowerCase())||(staff||[]).find(x=>x.id===s)?.id);
  if(nameList.length&&matched.some(x=>!x)){errors.push({row:index+1,reason:"Unrecognized employee name"});continue;}
  const assignees=nameList.length?[...new Set(matched as string[])]:[p.data.default_assignee];
  const leader=p.data.leader_id&&assignees.includes(p.data.leader_id)?p.data.leader_id:null;
  if(r.due_at&&!Number.isFinite(new Date(r.due_at).getTime())){errors.push({row:index+1,reason:"Invalid due date"});continue;}
  const {data:duplicate}=await db.from("tasks").select("id").eq("title",r.title).limit(1);
  if(duplicate?.length){errors.push({row:index+1,reason:"Existing task title"});continue;}
  const {error}=await db.rpc("create_task_secure",{p_title:r.title,p_description:r.description||null,p_priority:r.priority,p_due_at:r.due_at||null,p_assignee_ids:assignees,p_leader_id:leader});
  if(error)errors.push({row:index+1,reason:"Task could not be saved (AHRAM-IMPORT-SAVE)"});else added++;
 }
 return NextResponse.json({added,skipped:errors.length,errors,notice:"Each valid task is committed individually; if some rows failed, the successful ones remain saved."});
}
