import translations from "./workspace-translations.json";
import type {Locale} from "./i18n";
export function workspaceTranslator(locale:Locale){return (text:string)=>locale==="en"?((translations as Record<string,string>)[text]||text):text;}
