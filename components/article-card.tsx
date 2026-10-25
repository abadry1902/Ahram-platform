import Link from "next/link";
import {ArrowUpLeft,ArrowUpRight} from "lucide-react";
import {localize,type Locale} from "@/lib/i18n";
import {categoryLabels,type PublicArticle} from "@/lib/public-articles";
export function ArticleArt({category,large=false}:{category:string;large?:boolean}){
 const image=category==="labor"||category==="family"?"/images/v4/consultation.webp":"/images/v4/architectural-journey.webp";
 return <div className={`insight-art art-${category}${large?" art-large":""}`} aria-hidden="true"><img src={image} alt="" loading="lazy"/></div>;
}
export function ArticleCard({article,locale}:{article:PublicArticle;locale:Locale}){
 const t=(a:string,e:string)=>localize(locale,a,e),a=article,Arrow=locale==="ar"?ArrowUpLeft:ArrowUpRight,label=categoryLabels[a.category]||categoryLabels.general;
 return <Link className="insight-card" href={`/${locale}/articles/${a.slug}`}><ArticleArt category={a.category}/><div className="insight-body"><div className="article-meta"><span>{t(...label)}</span><time dateTime={a.date}>{a.date.slice(0,10)}</time></div><h3>{t(a.arTitle,a.enTitle)}</h3><p>{t(a.arExcerpt,a.enExcerpt)}</p><span className="text-link">{t("اقرأ المقال","Read insight")} <Arrow size={18}/></span></div></Link>;
}
