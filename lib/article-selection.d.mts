export function articleIdentity(slug:string):string;
export function selectRecommended<T extends {slug:string;category:string}>(items:T[],slug:string,category:string,count?:number):T[];
export function mergePublishedWithGuides<T extends {slug:string}>(published:T[],guides:T[]):T[];
