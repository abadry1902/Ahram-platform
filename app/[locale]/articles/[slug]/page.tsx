import {notFound} from "next/navigation";
import Link from "next/link";
import {articles} from "@/lib/content";
import {createClient} from "@/lib/supabase/server";
import {isLocale,localize} from "@/lib/i18n";
import type {Metadata} from "next";
export async function generateMetadata({params}:{params:Promise<{locale:string;slug:string}>}):Promise<Metadata>{
 const {locale,slug}=await params;
 const fallback=articles.find(a=>a.slug===slug);
 const db=await createClient();
 const {data:live}=db?await db.from("articles").select("slug,title_ar,title_en,excerpt_ar,excerpt_en").eq("slug",slug).eq("status","published").maybeSingle():{data:null};
 const title=locale==="en"?(live?.title_en||fallback?.enTitle):(live?.title_ar||fallback?.arTitle);
 const description=locale==="en"?(live?.excerpt_en||fallback?.enExcerpt):(live?.excerpt_ar||fallback?.arExcerpt);
 const root=(process.env.NEXT_PUBLIC_SITE_URL||"http://localhost:3000").replace(/\/$/,"");
 return {title:title||"Legal insights",description:description||"",alternates:{canonical:`${root}/${locale}/articles/${slug}`,languages:{ar:`${root}/ar/articles/${slug}`,en:`${root}/en/articles/${slug}`}}};
}
export default async function ArticlePage({params}:{params:Promise<{locale:string;slug:string}>}){
 const {locale,slug}=await params;if(!isLocale(locale))notFound();
 const db=await createClient();const {data:live}=db?await db.from("articles").select("*").eq("slug",slug).eq("status","published").maybeSingle():{data:null};
 const fallback=articles.find(a=>a.slug===slug);
 if(!live&&!fallback)notFound();
 const t=(a:string,e:string)=>localize(locale,a,e);
 const title=live?t(live.title_ar,live.title_en):t(fallback!.arTitle,fallback!.enTitle);
 const content=live?t(live.body_ar,live.body_en).split("\n").filter(Boolean):t(fallback!.arBody.join("\n"),fallback!.enBody.join("\n")).split("\n");
 const related=articles.filter(a=>a.slug!==slug&&a.category===(live?.category||fallback?.category)).slice(0,2);
 return <><section className="page-head"><div className="container"><Link href={`/${locale}/articles`} style={{color:"var(--blue)"}}>← {t("جميع المقالات","All articles")}</Link><h1 style={{marginTop:17}}>{title}</h1><p>{(live?.published_at||fallback?.date||"").slice(0,10)}</p></div></section><section className="section"><div className="container" style={{maxWidth:900}}><div className="article-cover" style={{height:250}}/><article>{content.map((p,i)=><p key={i} style={{fontSize:18,lineHeight:2.3}}>{p}</p>)}</article><div className="notice warning" style={{marginTop:30}}>{t("هذه المادة معلومات عامة وليست استشارة قانونية بخصوص حالة معينة.","This article is general information and does not constitute individual legal advice.")}</div><h2 style={{marginTop:40}}>{t("مقالات ذات صلة","Related reading")}</h2>{related.map(a=><p key={a.slug}><Link href={`/${locale}/articles/${a.slug}`} style={{color:"var(--blue)",fontWeight:800}}>{t(a.arTitle,a.enTitle)} ←</Link></p>)}</div></section></>;
}
