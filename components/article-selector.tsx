'use client';
import {useRouter} from 'next/navigation';
import {Select} from '@/components/ui';
export function ArticleSelector({articles,locale}:{articles:{id:string;title_ar:string;title_en:string}[];locale:string}){
 const router=useRouter();return <label className="form-field">{locale==='ar'?'اختر مقالًا للتحرير':'Choose an article to edit'}<Select defaultValue="" onChange={e=>{if(e.target.value)router.push(`/app/content/${e.target.value}`);}}><option value="">{locale==='ar'?'اختر من المقالات الموجودة…':'Select an existing article…'}</option>{articles.map(a=><option key={a.id} value={a.id}>{locale==='en'&&a.title_en?a.title_en:a.title_ar}</option>)}</Select></label>;
}
