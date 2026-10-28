"use server";
import {revalidatePath} from "next/cache";
import {redirect} from "next/navigation";
import {requireUser,requireSupervisor} from "@/lib/auth";
import {z} from "zod";
const schema=z.object({slug:z.string().trim().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/).max(100),category:z.string().trim().min(1).max(50),categories:z.array(z.string().trim().min(1).max(50)).min(1).max(20),image_url:z.union([z.string().url().startsWith("https://").max(2048),z.null()]),title_ar:z.string().trim().min(5).max(200),title_en:z.string().trim().max(200),excerpt_ar:z.string().trim().max(500),excerpt_en:z.string().trim().max(500),body_ar:z.string().trim().min(10).max(30000),body_en:z.string().trim().max(30000)});
function parse(form:FormData){const categories=[...new Set(form.getAll("categories").map(String).map(s=>s.trim()).filter(Boolean))];return schema.safeParse({...Object.fromEntries(["slug","title_ar","title_en","excerpt_ar","excerpt_en","body_ar","body_en"].map(k=>[k,String(form.get(k)||"").trim()])),category:categories[0]||"general",categories:categories.length?categories:["general"],image_url:String(form.get("image_url")||"").trim()||null});}
export async function createArticle(form:FormData){
 const {db,profile,user}=await requireUser();if(profile.role==="employee")redirect("/app");
 const parsed=parse(form);if(!parsed.success)redirect("/app/content?error=validation");
 const {error}=await db.from("articles").insert({...parsed.data,author_id:user.id,status:"draft"});
 revalidatePath("/app/content");redirect(error?"/app/content?error=save":"/app/content?ok=1");
}
export async function updateArticle(form:FormData){
 const {db,profile}=await requireUser();if(profile.role==="employee")redirect("/app");
 const id=String(form.get("id")||"");const parsed=parse(form);
 if(!/^[a-f0-9-]{36}$/.test(id)||!parsed.success)redirect("/app/content?error=validation");
 const {error}=await db.from("articles").update(parsed.data).eq("id",id);
 revalidatePath("/app/content");redirect(error?"/app/content?error=save":"/app/content?ok=1");
}
export async function setArticleState(form:FormData){
 const {db,profile}=await requireUser();if(profile.role==="employee")redirect("/app");
 const id=String(form.get("id")||"");const requested=String(form.get("status")||"");
 if(!/^[a-f0-9-]{36}$/.test(id)||!["draft","review","published"].includes(requested))return;
 if(requested==="published"&&profile.role!=="supervisor")return;
 const {error}=await db.from("articles").update({status:requested}).eq("id",id);
 revalidatePath("/app/content");revalidatePath("/ar/articles");revalidatePath("/en/articles");
 redirect(error?"/app/content?error=transition":"/app/content?ok=1");
}
export async function addUsefulLink(form:FormData){
 const {db}=await requireSupervisor();
 const schema=z.object({name_ar:z.string().min(3).max(180),name_en:z.string().max(180),description_ar:z.string().max(300),description_en:z.string().max(300),category:z.string().max(60),image_url:z.union([z.string().url().startsWith("https://").max(2048),z.literal("")]),href:z.string().url().startsWith("https://")});
 const p=schema.safeParse(Object.fromEntries(["name_ar","name_en","description_ar","description_en","category","href","image_url"].map(k=>[k,String(form.get(k)||"").trim()])));
 if(!p.success)redirect("/app/links?error=validation");
 const {error}=await db.from("useful_links").insert({...p.data,image_url:p.data.image_url||null,is_published:false});
 revalidatePath("/app/links");redirect(error?"/app/links?error=save":"/app/links?ok=1");
}
export async function toggleUsefulLink(form:FormData){
 const {db}=await requireSupervisor();const id=String(form.get("id")||"");
 if(!/^[a-f0-9-]{36}$/.test(id))return;
 const {data:link}=await db.from("useful_links").select("is_published").eq("id",id).maybeSingle();
 if(link)await db.from("useful_links").update({is_published:!link.is_published}).eq("id",id);
 revalidatePath("/app/links");revalidatePath("/ar/links");revalidatePath("/en/links");
}

export async function savePublicImage(form:FormData){
 const {db}=await requireSupervisor();const kind=String(form.get('kind')),id=String(form.get('id')),url=String(form.get('image_url')||'').trim();
 if(url&&!z.string().url().startsWith('https://').max(2048).safeParse(url).success)redirect('/app/links?error=image');
 if(kind==='service'){
 if(!['corporate','litigation','real-estate','labor','family','advisory'].includes(id))redirect('/app/links?error=invalid');
 const {error}=url?await db.from('service_media').upsert({service_key:id,image_url:url}):await db.from('service_media').delete().eq('service_key',id);if(error)redirect('/app/links?error=save');
 }else{
 if(!z.string().uuid().safeParse(id).success)redirect('/app/links?error=invalid');const {error}=await db.from('useful_links').update({image_url:url||null}).eq('id',id);if(error)redirect('/app/links?error=save');
 }
 revalidatePath('/ar','layout');revalidatePath('/en','layout');revalidatePath('/app/links');redirect('/app/links?ok=1');
}
