import ArticlePage,{generateMetadata as articleMetadata} from "../../[slug]/page";
type Props={params:Promise<{locale:string;slug:string}>};
const guideParams=async(params:Props['params'])=>{const p=await params;return {...p,slug:`guides/${p.slug}`};};
export async function generateMetadata({params}:Props){return articleMetadata({params:guideParams(params)});}
export default async function GuidePage({params}:Props){return ArticlePage({params:guideParams(params)});}
