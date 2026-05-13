// User identity + role detection nad Supabase Auth.
//
// Whitelist 2 hardcoded emailov žije tu (env override pre prípad,
// že by Lydka/Verča potrebovali iný email). Server aj client side
// volajú `getUserByEmail()` na rozhodnutie role.

import { createServerSupabaseClient } from "@/lib/supabase";

export type UserRole = "lydka" | "verca";

export type UserIdentity = {
  /** Supabase auth user id (uuid). Null v client mock fallback. */
  id: string | null;
  email: string;
  role: UserRole;
  /** UI-friendly meno pre headery („Ahoj, Lydka" / „Ahoj, Verča"). */
  displayName: string;
};

const LYDKA_EMAIL = (process.env.LYDKA_EMAIL ?? "lydia.machova@gmail.com")
  .trim()
  .toLowerCase();
const VERCA_EMAIL = (process.env.VERCA_EMAIL ?? "kamenicka.veronika@gmail.com")
  .trim()
  .toLowerCase();

export const ALLOWED_USERS: Record<string, Omit<UserIdentity, "id">> = {
  [LYDKA_EMAIL]: {
    email: LYDKA_EMAIL,
    role: "lydka",
    displayName: "Lydka",
  },
  [VERCA_EMAIL]: {
    email: VERCA_EMAIL,
    role: "verca",
    displayName: "Verča",
  },
};

export const ALLOWED_EMAILS = Object.keys(ALLOWED_USERS);

export function isAllowedEmail(email: string): boolean {
  return Object.prototype.hasOwnProperty.call(
    ALLOWED_USERS,
    email.trim().toLowerCase(),
  );
}

export function getUserByEmail(
  email: string,
  id: string | null = null,
): UserIdentity | null {
  const base = ALLOWED_USERS[email.trim().toLowerCase()];
  if (!base) return null;
  return { ...base, id };
}

/**
 * Po-login redirect target podľa role.
 * Lydka → home (`/`), Verča → jej home (`/verca`).
 */
export function homePathForRole(role: UserRole): string {
  return role === "lydka" ? "/" : "/verca";
}

// =====================================================================
// SERVER-SIDE: getCurrentUser
// =====================================================================
//
// Volá `supabase.auth.getUser()` (na rozdiel od `getSession()` — getUser
// validuje token cez Supabase a vracia overené hodnoty, nie len cookie).
// Pre Server Components a API routes.

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
