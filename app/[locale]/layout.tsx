import {notFound} from "next/navigation";
import {isLocale} from "@/lib/i18n";
import {SiteHeader} from "@/components/site-header";
import {SiteFooter} from "@/components/site-footer";
export function generateStaticParams(){return [{locale:"ar"},{locale:"en"}];}
export default async function LocaleLayout({children,params}:{children:React.ReactNode;params:Promise<{locale:string}>}){
 const {locale}=await params;
 if (!isLocale(locale)) notFound();
 return <div lang={locale} dir={locale==="ar"?"rtl":"ltr"} className={locale==="en"?"english":""}><SiteHeader locale={locale}/><main id="main">{children}</main><SiteFooter locale={locale}/></div>;
}
