import type {MetadataRoute} from "next";
import {articles} from "@/lib/content";
export default function sitemap():MetadataRoute.Sitemap{
 const origin=(process.env.NEXT_PUBLIC_SITE_URL||"http://localhost:3000").replace(/\/$/,"");
 const paths=["","about","services","articles","links","contact",...articles.map(a=>`articles/${a.slug}`)];
 return (["ar","en"] as const).flatMap(locale=>paths.map(path=>({url:`${origin}/${locale}${path?"/"+path:""}`,lastModified:new Date(),changeFrequency:path.startsWith("articles/")?"monthly":"weekly" as const,priority:path?0.65:1})));
}
