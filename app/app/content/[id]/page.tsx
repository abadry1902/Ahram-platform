
import {Card,Input,Textarea,Button} from "@/components/ui";
import {workspaceI18n} from "@/lib/workspace-locale";
import {notFound} from "next/navigation";
import {requireUser} from "@/lib/auth";
import {updateArticle} from "@/app/actions/content";
import Link from "next/link";
export default async function EditArticle({params}:{params:Promise<{id:string}>}){
 const {locale,t:tr}=await workspaceI18n();
 const {id}=await params;const {db,profile}=await requireUser();if(profile.role==="employee")notFound();
 const {data:a}=await db.from("articles").select("*").eq("id",id).maybeSingle();if(!a)notFound();
 return <><div className="title-row"><div><Link href="/app/content" className="muted">{tr("← المقالات")}</Link><h1>{tr("تحرير المقال")}</h1><p className="muted">{tr("الحالة الحالية:")}{a.status}</p></div></div><Card className="card" style={{maxWidth:900}}><form action={updateArticle}><input type="hidden" name="id" value={id}/><label className="form-field">{tr("عنوان عربي")}<Input className="input" name="title_ar" defaultValue={a.title_ar} required/></label><label className="form-field">English title<Input className="input" name="title_en" defaultValue={a.title_en}/></label><label className="form-field">Slug<Input className="input english" name="slug" defaultValue={a.slug} required/></label><label className="form-field">{tr("تصنيف")}<Input className="input" name="category" defaultValue={a.category} required/></label><label className="form-field">{tr("ملخص عربي")}<Textarea className="input" name="excerpt_ar" defaultValue={a.excerpt_ar}/></label><label className="form-field">English excerpt<Textarea className="input" name="excerpt_en" defaultValue={a.excerpt_en}/></label><label className="form-field">{tr("محتوى عربي")}<Textarea className="input" name="body_ar" defaultValue={a.body_ar} required/></label><label className="form-field">English content<Textarea className="input" name="body_en" defaultValue={a.body_en}/></label><Button className="button alt">{tr("حفظ التعديل")}</Button></form>{a.status==="published"&&<p className="notice" style={{marginTop:15}}>{tr("تعديل المحتوى المنشور يحتاج موافقة المشرف.")}</p>}</Card></>;
}
