import {NextResponse} from "next/server";
import {createClient} from "@/lib/supabase/server";
const safe=(value:string)=>value.replace(/\\/g,"\\\\").replace(/\n/g,"\\n").replace(/[,;]/g," ").replace(/[\r]/g,"");
export async function GET(){
 const db=await createClient();if(!db)return new NextResponse("Not configured",{status:503});
 const {data:{user}}=await db.auth.getUser();if(!user)return new NextResponse("Unauthorized",{status:401});
 const {data,error}=await db.from("tasks").select("id,due_at").is("deleted_at",null).not("due_at","is",null).limit(200);
 if(error)return new NextResponse("Unavailable",{status:503});
 const stamp=(value:string)=>new Date(value).toISOString().replace(/[-:]/g,"").replace(/\.\d{3}/,"");
 const events=(data||[]).map(t=>["BEGIN:VEVENT",`UID:${t.id}@ahram-platform`,`DTSTAMP:${stamp(new Date().toISOString())}`,`DTSTART:${stamp(t.due_at)}`,`SUMMARY:${safe("موعد مهمة في منصة الأهرام")}`,"END:VEVENT"].join("\r\n")).join("\r\n");
 return new NextResponse(["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//Al Ahram//Tasks//AR","CALSCALE:GREGORIAN",events,"END:VCALENDAR"].join("\r\n"),{headers:{"Content-Type":"text/calendar; charset=utf-8","Content-Disposition":"attachment; filename=ahram-tasks.ics","Cache-Control":"private, no-store"}});
}
