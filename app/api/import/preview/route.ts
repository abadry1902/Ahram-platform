import {NextRequest,NextResponse} from "next/server";
import {createClient} from "@/lib/supabase/server";
import {parseImport} from "@/lib/import-parser";
export const runtime="nodejs";
export async function POST(request:NextRequest){
 const db=await createClient();if(!db)return NextResponse.json({error:"Database not configured"},{status:503});
 const {data:{user}}=await db.auth.getUser();if(!user)return NextResponse.json({error:"Unauthorized"},{status:401});
 const {data:profile}=await db.from("profiles").select("role").eq("id",user.id).maybeSingle();
 if(profile?.role!=="supervisor")return NextResponse.json({error:"Forbidden"},{status:403});
 const form=await request.formData();const file=form.get("file");
 if(!(file instanceof File))return NextResponse.json({error:"File is required"},{status:400});
 if(!/\.(xlsx|csv|docx)$/i.test(file.name))return NextResponse.json({error:"Allowed: XLSX, CSV, DOCX"},{status:400});
 try{
  const rows=await parseImport(file);
  return NextResponse.json({rows,count:rows.length,warning:"Preview only: no tasks have been added yet."});
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:"Invalid file"},{status:400});}
}
