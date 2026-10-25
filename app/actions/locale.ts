"use server";
import {cookies} from "next/headers";
import {redirect} from "next/navigation";
export async function setWorkspaceLocale(form:FormData){
 const locale=form.get("locale")==="en"?"en":"ar";
 const requested=String(form.get("returnTo")||"/app");
 const returnTo=/^\/app(?:\/[^?#]*)?(?:\?[^#]*)?$/.test(requested)&&!requested.includes("\\")?requested:"/app";
 (await cookies()).set("ahram-locale",locale,{httpOnly:true,sameSite:"lax",secure:process.env.NODE_ENV==="production",path:"/",maxAge:31536000});
 redirect(returnTo);
}
