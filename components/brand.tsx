import Link from "next/link";
import assets from "@/lib/brand-assets.json";
// Supplied derived PNGs are temporary; the approved master is still pending.
export function Brand({href="/ar",variant="horizontal",tone="light"}:{
 href?:string;variant?:"horizontal"|"compact";tone?:"light"|"dark";
}) {
 const asset=variant==="compact"
  ? (tone==="dark"?assets.compactDark:assets.compact)
  : (tone==="dark"?assets.horizontalDark:assets.horizontal);
 return <Link href={href} className={`brand brand-${variant} brand-on-${tone}`} aria-label="الأهرام — AL AHRAM Legal Consultancy" data-logo-status={assets.status}>
  <img src={asset.src} width={asset.width} height={asset.height} alt="الأهرام — AL AHRAM Legal Consultancy" className="brand-image"/>
 </Link>;
}
