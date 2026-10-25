import Link from "next/link";
import assets from "@/lib/brand-assets.json";
// Register only an original, user-supplied asset. Never trace the mark.
export function Brand({href="/ar",variant="horizontal"}:{href?:string;variant?:"horizontal"|"compact"}) {
 const src=variant==="compact"?(assets.compact||assets.horizontal):assets.horizontal;
 return <Link href={href} className={`brand brand-${variant}`} aria-label="الأهرام — AL AHRAM Legal Consultancy">{src?<img src={src} alt="الأهرام — AL AHRAM Legal Consultancy" className="brand-image"/>:<span className="brand-text" data-logo-status="awaiting-approved-source"><span className="brand-name">الأهرام</span><span className="brand-english">AL AHRAM</span><span className="brand-sub">LEGAL CONSULTANCY</span></span>}</Link>;
}
