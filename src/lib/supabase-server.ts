// Server-only Supabase client.
//
// Tento súbor je oddelený od `supabase.ts`, pretože `next/headers` (cookies)
// funguje IBA v Server Components / Route Handlers. Keby bol `cookies()` import
// v `supabase.ts`, Webpack by hodil error pri každom client komponente, ktorý
// importuje hocičo z `supabase.ts` (aj keby šlo o čistý typ).
//
// Pravidlo: ak server, importuj odtiaľto. Ak client, importuj z `@/lib/supabase`.

import "server-only";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export function createServerSupabaseClient() {
  const cookieStore = cookies();

  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        try {
          cookieStore.set({ name, value, ...options });
        } catch {
          // V Server Component sa `set` nedá volať; ignorujeme — middleware
          // session refresh sa stará o cookie lifecycle.
        }
      },
      remove(name: string, options: CookieOptions) {
        try {
          cookieStore.set({ name, value: "", ...options });
        } catch {
          // viď vyššie
        }
      },
    },
  });
}
