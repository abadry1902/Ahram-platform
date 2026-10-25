import Link from "next/link";
import {ArrowUpLeft,ArrowUpRight} from "lucide-react";
import {localize,type Locale} from "@/lib/i18n";
export function ConsultationBanner({locale}:{locale:Locale}){
 const t=(a:string,e:string)=>localize(locale,a,e),Arrow=locale==="ar"?ArrowUpLeft:ArrowUpRight;
 return <section className="consultation-wrap"><div className="container consultation-banner"><div><span className="eyebrow">{t("خطوتك القادمة تبدأ هنا","YOUR NEXT STEP STARTS HERE")}</span><h2>{t("خلّينا نوضح لك الطريق.","Let’s make your next step clear.")}</h2><p>{t("كل سؤال يستحق إجابة واضحة. ابدأ بطلب استشارة.","Every question deserves a clear answer. Start a conversation.")}</p></div><Link className="button" href={`/${locale}/contact`}>{t("تواصل مع الأهرام","Talk to AL AHRAM")} <Arrow size={19}/></Link><span className="banner-geometry" aria-hidden="true"/></div></section>;
}
