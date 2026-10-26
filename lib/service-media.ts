import {createClient} from '@/lib/supabase/server';
export async function serviceImages(){const db=await createClient();if(!db)return new Map<string,string>();const {data}=await db.from('service_media').select('service_key,image_url');return new Map<string,string>((data||[]).map(x=>[x.service_key,x.image_url]));}
export function defaultServiceImage(id:string){return ['labor','family','advisory'].includes(id)?'/images/v4/consultation.webp':'/images/v4/architectural-journey.webp';}
