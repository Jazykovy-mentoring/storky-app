// Server-only auth helpers.
//
// `getCurrentUser()` a require* funkcie tu, lebo používajú
// `createServerSupabaseClient()` ktorý je server-only. Client komponenty
// (napr. `/login`) importujú client-safe helpers z `@/lib/auth` (whitelist,
// `isAllowedEmail`, `homePathForRole`).

import "server-only";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { getUserByEmail, type UserIdentity } from "@/lib/auth";

/**
 * Volá `supabase.auth.getUser()` (validuje token cez Supabase, nie len cookie).
 * Pre Server Components a API routes.
 */
export async function getCurrentUser(): Promise<UserIdentity | null> {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user?.email) return null;
  return getUserByEmail(user.email, user.id);
}

/**
 * Helper pre stránky, ktoré musia mať Lydku.
 * Vracia user alebo null (volajúci sa rozhodne, ako redirectne).
 */
export async function requireLydka(): Promise<UserIdentity | null> {
  const user = await getCurrentUser();
  if (!user || user.role !== "lydka") return null;
  return user;
}

/**
 * Helper pre stránky, ktoré musia mať Verču.
 */
export async function requireVerca(): Promise<UserIdentity | null> {
  const user = await getCurrentUser();
  if (!user || user.role !== "verca") return null;
  return user;
}
