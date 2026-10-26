import {WorkCalendar} from "@/components/work-calendar";
import {requireUser} from "@/lib/auth";
import Link from "next/link";
import {formatDate} from "@/lib/i18n";
import {workspaceI18n} from "@/lib/workspace-locale";
import {PageHeading,EmptyState} from "@/components/ui";
import {TaskStatusBadge} from "@/components/task-status";
import type {TaskStatus} from "@/lib/types";
import {CalendarDays,Download} from "lucide-react";
export default async function CalendarPage(){const {db}=await requireUser();const {locale,t}=await workspaceI18n();const {data:tasks}=await db.from("tasks").select("id,title,status,due_at").is("deleted_at",null).not("due_at","is",null).order("due_at",{ascending:true}).limit(1000);return <><PageHeading eyebrow="CALENDAR" title={t("المواعيد والمهام")} description={t("قائمة زمنية بالمواعيد الخاصة بالمهام المسموح لك رؤيتها.")} action={<a href="/api/calendar.ics" className="button outline"><Download size={17}/>{t("تصدير تقويم خاص ICS")}</a>}/><WorkCalendar tasks={tasks||[]} locale={locale}/><p className="muted tiny" style={{marginTop:24}}>{t("يحتوي ملف ICS على معرف عام لكل مهمة وموعدها فقط؛ لا تتضمن البيانات تفاصيل قضايا العملاء. لا توجد مزامنة نشطة مع Google أو Apple دون تفويض مستقل.")}</p></>;}
