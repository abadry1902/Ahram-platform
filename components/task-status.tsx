"use client";
import type {TaskStatus} from "@/lib/types";
import {TASK_STATUS_LABELS} from "@/lib/types";
import {useWorkspaceI18n} from "./workspace-context";
export function TaskStatusBadge({status}:{status:TaskStatus}){const {t}=useWorkspaceI18n();return <span className={`status ${status}`}><i aria-hidden="true"/>{t(TASK_STATUS_LABELS[status]||status)}</span>;}
export function Progress({value}:{value:number}){const {t}=useWorkspaceI18n();const safe=Math.max(0,Math.min(100,value||0));return <div role="progressbar" aria-label={t("نسبة التقدم")} aria-valuenow={safe} aria-valuemin={0} aria-valuemax={100} className="progress"><div style={{width:`${safe}%`}}/></div>;}
