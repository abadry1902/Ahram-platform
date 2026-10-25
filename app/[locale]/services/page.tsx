import Link from "next/link";
import {notFound} from "next/navigation";
import {ArrowUpLeft,ArrowUpRight,Scale,Building2,BriefcaseBusiness,Users,ShieldCheck,MessagesSquare} from "lucide-react";
import {services} from "@/lib/content";
import {isLocale,localize} from "@/lib/i18n";
import {ConsultationBanner} from "@/components/consultation-banner";
export default async function Services({params}:{params:Promise<{locale:string}>}){
 const {locale}=await params;if(!isLocale(locale))notFound();const t=(a:string,e:string)=>localize(locale,a,e);const Arrow=locale==="ar"?ArrowUpLeft:ArrowUpRight;const icons=[BriefcaseBusiness,Scale,Building2,Users,ShieldCheck,MessagesSquare];
 return <><section className="page-head"><div className="container"><span className="eyebrow">{t("مجالات خبرتنا","OUR EXPERTISE")}</span><h1>{t("حلول قانونية تفهم احتياجك.","Legal support that understands your needs.")}</h1><p>{t("للأفراد والشركات، نرتّب الخيارات ونوضّح الطريق إلى الخطوة التالية.","For people and businesses. We put your options in order and make the next step clearer.")}</p></div></section><section className="section"><div className="container"><div className="services-detail-grid">{services.map((s,i)=>{const Icon=icons[i];return <article className="service-detail" id={s.id} key={s.id}><div className="service-top"><Icon strokeWidth={1.3}/><span>{String(i+1).padStart(2,"0")}</span></div><h2>{t(s.ar,s.en)}</h2><p>{t(s.arText,s.enText)}</p><Link className="text-link" href={`/${locale}/contact?service=${s.id}`}>{t("استفسر عن هذه الخدمة","Discuss this service")} <Arrow size={17}/></Link></article>;})}</div></div></section><ConsultationBanner locale={locale}/></>;
}
