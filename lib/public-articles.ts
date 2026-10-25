import {cache} from "react";
import {articles} from "@/lib/content";
import {createClient} from "@/lib/supabase/server";
import {mergePublishedWithGuides} from "@/lib/article-selection.mjs";
export type PublicArticle=(typeof articles)[number];
type PublishedRow={slug:string;category:string;published_at:string|null;title_ar:string;title_en:string;excerpt_ar:string;excerpt_en:string;body_ar:string;body_en:string};
const fields="slug,category,published_at,title_ar,title_en,excerpt_ar,excerpt_en,body_ar,body_en";
const normalize=(a:PublishedRow):PublicArticle=>({slug:a.slug,category:a.category,date:a.published_at||"",arTitle:a.title_ar,enTitle:a.title_en,arExcerpt:a.excerpt_ar,enExcerpt:a.excerpt_en,arBody:a.body_ar.split("\n").filter(Boolean),enBody:a.body_en.split("\n").filter(Boolean)});
const guides=[...articles].sort((a,b)=>b.date.localeCompare(a.date));
export const getPublicArticles=cache(async():Promise<PublicArticle[]>=>{
 const db=await createClient();
 if(!db)return guides;
 const {data,error}=await db.from("articles").select(fields).eq("status","published").order("published_at",{ascending:false}).limit(200);
 // Guide URLs are explicitly separate from CMS URLs, even during an outage.
 return mergePublishedWithGuides(!error&&data?data.map(normalize):[],guides);
});
export const getPublicArticle=cache(async(slug:string):Promise<PublicArticle|undefined>=>{
 if(slug.startsWith("guides/")){const guide=guides.find(a=>a.slug===slug.slice(7));return guide?{...guide,slug}:undefined;}
 const db=await createClient();
 if(!db)return guides.find(a=>a.slug===slug);
 const {data,error}=await db.from("articles").select(fields).eq("slug",slug).eq("status","published").maybeSingle();
 // Once configured, a CMS route never falls back to a guide or draft.
 return !error&&data?normalize(data):undefined;
});
export const categoryLabels:Record<string,[string,string]>={corporate:["الشركات والاستثمار","Corporate"],"real-estate":["العقارات والتوثيق","Property"],labor:["قانون العمل","Employment"],litigation:["تسوية النزاعات","Disputes"],family:["الأحوال الشخصية","Family"],general:["معرفة قانونية","Legal insights"]};
