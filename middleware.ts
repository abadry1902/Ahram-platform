import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

type CookieItem = {
  name: string;
  value: string;
  options?: {
    domain?: string;
    path?: string;
    expires?: Date;
    maxAge?: number;
    secure?: boolean;
    httpOnly?: boolean;
    sameSite?: "strict" | "lax" | "none" | boolean;
    priority?: "low" | "medium" | "high";
    partitioned?: boolean;
  };
};

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({request});
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return response;
  const supabase = createServerClient(url,key,{
    cookies:{
      getAll:()=>request.cookies.getAll(),
      setAll(items: CookieItem[]){
        items.forEach(({name,value})=>request.cookies.set(name,value));
        response=NextResponse.next({request});
        items.forEach(({name,value,options})=>response.cookies.set(name,value,options));
      }
    }
  });
  await supabase.auth.getUser();
  return response;
}
export const config = {matcher:["/app/:path*","/login"]};
