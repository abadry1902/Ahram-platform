import Link from "next/link";
import {articles} from "@/lib/content";
import {createClient} from "@/lib/supabase/server";
import {isLocale,localize} from "@/lib/i18n";
import {notFound} from "next/navigation";
export default async function Articles({params,searchParams}:{params:Promise<{locale:string}>;searchParams:Promise<{q?:string;category?:string}>}){
 const {locale}=await params;if(!isLocale(locale))notFound();const {q="",category=""}=await searchParams;const t=(a:string,e:string)=>localize(locale,a,e);
 const db=await createClient(); const {data:published}=db?await db.from("articles").select("slug,title_ar,title_en,excerpt_ar,excerpt_en,category,published_at").eq("status","published").order("published_at",{ascending:false}).limit(50):{data:null};
 const items=published&&published.length?published.map(a=>({slug:a.slug,category:a.category,date:a.published_at,arTitle:a.title_ar,enTitle:a.title_en,arExcerpt:a.excerpt_ar,enExcerpt:a.excerpt_en})):articles;
 const filtered=items.filter(a=>(!category||a.category===category)&&(!q||[a.arTitle,a.enTitle,a.arExcerpt,a.enExcerpt].join(" ").toLowerCase().includes(q.toLowerCase())));
 return <><section className="page-head"><div className="container"><span className="eyebrow">LEGAL INSIGHTS</span><h1>{t("مقالات ومعرفة قانونية","Articles & insights")}</h1><p>{t("معلومات قانونية تثقيفية بلغة واضحة.","Useful legal information, in plain language.")}</p></div></section><section className="section"><div className="container">
 <form className="search-row"><input name="q" aria-label={t("بحث","Search")} className="input" defaultValue={q} placeholder={t("ابحث في المقالات...","Search articles...")}/><select name="category" className="input" style={{maxWidth:220}} defaultValue={category}><option value="">{t("كل التصنيفات","All categories")}</option><option value="corporate">{t("الشركات","Corporate")}</option><option value="real-estate">{t("العقارات","Property")}</option></select><button className="button alt">{t("بحث","Search")}</button></form>
 {filtered.length?<div className="grid">{filtered.map(a=><Link key={a.slug} href={`/${locale}/articles/${a.slug}`} className="card"><div className="article-cover"/><span className="article-date">{a.date?.slice(0,10)}</span><h3>{t(a.arTitle,a.enTitle)}</h3><p>{t(a.arExcerpt,a.enExcerpt)}</p><span style={{color:"var(--blue)",fontWeight:800}}>{t("اقرأ المقال","Read article")} ←</span></Link>)}</div>:<div className="empty">{t("لا توجد مقالات مطابقة.","No matching articles found.")}</div>}
 <p className="muted tiny" style={{marginTop:30}}>{t("محتوى توعوي لا يغني عن استشارة قانونية متخصصة.","General information; not a substitute for tailored legal advice.")}</p>
 </div></section></>;
}
