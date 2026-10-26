import Link from 'next/link';
import {defaultServiceImage} from '@/lib/service-media';
import assets from '@/lib/brand-assets.json';
import type {services} from '@/lib/content';
export function ServiceCard({service:s,locale,image,detail=false}:{service:typeof services[number];locale:string;image?:string;detail?:boolean}){const ar=locale==='ar';return <Link id={detail?s.id:undefined} className="service-card service-media-card" href={detail?`/${locale}/contact?service=${s.id}`:`/${locale}/services#${s.id}`}><img src={image||defaultServiceImage(s.id)} alt="" loading="lazy" referrerPolicy="no-referrer"/><div className="media-card-body"><img className="brand-mini" src={assets.compact.src} width={24} height={20} alt=""/><h3>{ar?s.ar:s.en}</h3>{detail&&<p>{ar?s.arText:s.enText}</p>}</div></Link>;}
