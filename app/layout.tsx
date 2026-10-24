import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {title:{default:"الأهرام | Al Ahram Legal Consultancy",template:"%s | الأهرام"},description:"الأهرام للاستشارات القانونية | خدمات واستشارات قانونية للأفراد والشركات."};
export default function RootLayout({children}:{children:React.ReactNode}) {
  return <html lang="ar"><body>{children}</body></html>;
}
