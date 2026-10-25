"use client";
import {createContext,useContext} from "react";
import type {Locale} from "@/lib/i18n";
import {workspaceTranslator} from "@/lib/workspace-strings";
export const WorkspaceLocaleContext=createContext<Locale>("ar");
export function useWorkspaceI18n(){const locale=useContext(WorkspaceLocaleContext);return {locale,t:workspaceTranslator(locale)};}
