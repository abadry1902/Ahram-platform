export type Locale = "ar" | "en";
export const locales: Locale[] = ["ar","en"];
export function isLocale(locale: string): locale is Locale { return locales.includes(locale as Locale); }
export function localize(locale: Locale, ar: string, en: string) { return locale === "ar" ? ar : en; }
export function formatDate(date: string | null | undefined, locale: Locale = "ar") {
  if (!date) return "—";
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-EG" : "en-GB", {dateStyle:"medium"}).format(new Date(date));
}
