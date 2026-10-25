export const articleIdentity=slug=>slug.replace(/^guides\//,'');
export function selectRecommended(items,slug,category,count=3){
 const unique=new Map();const current=articleIdentity(slug);
 for(const item of items){const identity=articleIdentity(item.slug);if(identity!==current&&!unique.has(identity))unique.set(identity,item);}
 return [...unique.values()].sort((a,b)=>Number(b.category===category)-Number(a.category===category)).slice(0,count);
}
// Built-in guides have reserved paths: CMS slugs cannot contain a slash.
export function mergePublishedWithGuides(published,guides){
 const result=new Map();
 for(const item of published)result.set(articleIdentity(item.slug),item);
 for(const item of guides)if(!result.has(item.slug))result.set(item.slug,{...item,slug:`guides/${item.slug}`});
 return [...result.values()];
}
