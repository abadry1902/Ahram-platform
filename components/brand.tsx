import Link from "next/link";
export function Brand({href="/ar"}:{href?:string}){
 return <Link href={href} className="brand" aria-label="Al Ahram Legal Consultancy">
  <span aria-hidden="true" className="brand-mark"><span/><span/><span/></span>
  <span><span className="brand-name" style={{display:"block"}}>الأهرام</span><span className="brand-sub">AL AHRAM · LEGAL CONSULTANCY</span></span>
 </Link>;
}
