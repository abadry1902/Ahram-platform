import Link from "next/link";
export function Brand({href="/ar"}:{href?:string}){
 return <Link href={href} className="brand" aria-label="Al Ahram Legal Consultancy">
  <svg aria-hidden="true" viewBox="0 0 112 90" width="61" height="54" role="img" style={{flexShrink:0}}>
   <path fill="#F47B35" d="M56 0 43 17h26z"/>
   <path fill="#1546A0" d="M27 20h58v10H61v52h-10V30H27z"/>
   <path fill="#1546A0" fillRule="evenodd" d="M17 34 0 63h36L17 34Zm0 13-7 12h14z M95 34 76 63h36L95 34Zm0 13-7 12h14z"/>
   <path fill="#1546A0" d="M0 67h36l-10 10H10zM76 67h36l-10 10H86zM46 82h20l-10 8z"/>
   <path fill="#1546A0" d="M47 39 36 30h16v11zM65 39l11-9H60v11z"/>
  </svg>
  <span><span className="brand-name" style={{display:"block"}}>الأهرام</span><span style={{display:"block",font:"800 12px Montserrat,Arial,sans-serif",letterSpacing:".03em",lineHeight:1.2}}>AL AHRAM</span><span className="brand-sub">LEGAL CONSULTANCY</span></span>
 </Link>;
}
