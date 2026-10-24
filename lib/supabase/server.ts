import { cookies } from "next/headers";
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

export async function createClient() {
  const cookieStore = await cookies();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createServerClient(url, key, {
    cookies: {
      getAll() { return cookieStore.getAll(); },
      setAll(items: CookieItem[]) {
        try { items.forEach(({name, value, options}) => cookieStore.set(name, value, options)); }
        catch { /* Server component render cannot set cookies; middleware refreshes sessions. */ }
      }
    }
  });
}
