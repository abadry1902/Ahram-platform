import {cookies} from "next/headers";
import type {Locale} from "./i18n";
import {workspaceTranslator} from "./workspace-strings";
export async function workspaceI18n(){
 const locale:Locale=(await cookies()).get("ahram-locale")?.value==="en"?"en":"ar";
 return {locale,t:workspaceTranslator(locale)};
}
