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
 const {data:morePublished}=db?await db.from("articles").select("slug,title_ar,title_en,excerpt_ar,excerpt_en,category,published_at").eq("status","published").neq("slug",slug).order("published_at",{ascending:false}).limit(15):{data:null};
 const recommendations=[...(morePublished||[]).map(a=>({slug:a.slug,category:a.category,arTitle:a.title_ar,enTitle:a.title_en,arExcerpt:a.excerpt_ar,enExcerpt:a.excerpt_en})),...articles.filter(a=>a.slug!==slug).map(a=>({slug:a.slug,category:a.category,arTitle:a.arTitle,enTitle:a.enTitle,arExcerpt:a.arExcerpt,enExcerpt:a.enExcerpt}))];
 const unique=new Map(recommendations.filter(a=>a.slug!==slug).map(a=>[a.slug,a]));
 const related=[...unique.values()].sort((a,b)=>Number(b.category===(live?.category||fallback?.category))-Number(a.category===(live?.category||fallback?.category))).slice(0,3);
 return <><section className="page-head editorial-head"><div className="container"><div className="editorial-breadcrumb"><Link href={`/${locale}`}>{t("الرئيسية","Home")}</Link><span> / </span><Link href={`/${locale}/articles`}>{t("المقالات","Articles")}</Link></div><span className="eyebrow">AL AHRAM · LEGAL INSIGHTS</span><h1>{title}</h1><p>{(live?.published_at||fallback?.date||"").slice(0,10)} · {t("قراءة قانونية مبسطة","Legal insights explained")}</p></div></section>
 <section className="section editorial-section"><div className="container editorial-layout">
 <main className="editorial-main"><div className="article-cover editorial-cover" role="img" aria-label={t("تصميم هندسي مستوحى من الأهرامات والعدالة","Geometric legal illustration")}/><article className="editorial-prose">{content.map((p,i)=><p key={i}>{p}</p>)}</article><div className="notice warning">{t("هذه المادة معلومات عامة وليست استشارة قانونية بخصوص حالة معينة.","This article is general information and does not constitute individual legal advice.")}</div><div className="editorial-consult"><div><span className="eyebrow">LEGAL CONSULTANCY</span><h2>{t("هل تحتاج مساعدة قانونية متخصصة؟","Need tailored legal support?")}</h2><p>{t("تواصل معنا لبحث تفاصيل موقفك القانوني بسرية.","Contact us to discuss your situation privately.")}</p></div><Link className="button" href={`/${locale}/contact`}>{t("اطلب استشارة","Request a consultation")}</Link></div></main>
 <aside className="editorial-aside"><div className="card related-panel"><span className="eyebrow">RECOMMENDED</span><h2>{t("مقالات نرشحها لك","Recommended articles")}</h2>{related.map((a,i)=><Link className="related-item" key={a.slug} href={`/${locale}/articles/${a.slug}`}><span className="related-index">{String(i+1).padStart(2,"0")}</span><span><strong>{t(a.arTitle,a.enTitle)}</strong><small>{t(a.arExcerpt,a.enExcerpt)}</small></span></Link>)}</div></aside></div>
 <div className="container editorial-bottom"><div className="title-row"><div><span className="eyebrow">MORE INSIGHTS</span><h2>{t("قد يهمك أيضًا","You might also like")}</h2></div><Link className="button outline" href={`/${locale}/articles`}>{t("كل المقالات","All articles")}</Link></div><div className="grid">{related.map(a=><Link className="card editorial-recommendation" key={a.slug} href={`/${locale}/articles/${a.slug}`}><div className="article-cover"/><h3>{t(a.arTitle,a.enTitle)}</h3><p>{t(a.arExcerpt,a.enExcerpt)}</p><span className="read-more">{t("اقرأ المقال ←","Read article →")}</span></Link>)}</div></div></section></>; 
}
