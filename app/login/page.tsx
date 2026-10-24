import Link from "next/link";
import {Brand} from "@/components/brand";
import {signIn} from "@/app/actions/auth";
import {LockKeyhole} from "lucide-react";
export default async function Login({searchParams}:{searchParams:Promise<{error?:string}>}){
 const {error}=await searchParams;
 return <main dir="rtl" style={{minHeight:"100vh",background:"#eaf1fc",display:"grid",placeItems:"center",padding:20}}><div className="card" style={{width:"min(440px,100%)",padding:36}}><div style={{display:"flex",justifyContent:"center"}}><Brand/></div><div style={{textAlign:"center",margin:"28px 0"}}><div className="icon-tile" style={{margin:"auto"}}><LockKeyhole/></div><h1 style={{fontSize:26}}>بوابة فريق العمل</h1><p className="muted">تسجيل الدخول للموظفين والمشرف العام</p></div>
 {error&&<div role="alert" className="notice warning" style={{marginBottom:20}}>{error==="configuration"?"لم يتم ربط قاعدة البيانات بعد.":"تعذر تسجيل الدخول. راجع الحساب وإعدادات الوصول."}</div>}
 <form action={signIn}><div className="form-field"><label htmlFor="email">البريد الإلكتروني</label><input id="email" name="email" type="email" className="input" required autoComplete="username"/></div><div className="form-field"><label htmlFor="password">كلمة المرور</label><input id="password" name="password" type="password" className="input" required autoComplete="current-password"/></div><button className="button alt" style={{width:"100%"}}>دخول المنصة</button></form><p className="muted tiny" style={{marginTop:24,textAlign:"center"}}>حسابات الفريق تُنشأ من خلال إدارة المكتب فقط.</p><div style={{textAlign:"center"}}><Link href="/ar" style={{color:"var(--blue)"}}>← العودة إلى الموقع</Link></div></div></main>;
}
