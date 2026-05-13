// OAuth / magic link callback.
//
// Supabase pošle z magic link emailu redirect na `${origin}/auth/callback?code=...`.
// Tu vymeníme `code` za session (server-side), overíme whitelist a redirectneme
// podľa role.

import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase";
import { getUserByEmail, homePathForRole } from "@/lib/auth";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`);
  }

  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.user?.email) {
    return NextResponse.redirect(`${origin}/login?error=exchange_failed`);
  }

  const identity = getUserByEmail(data.user.email, data.user.id);

  if (!identity) {
    // Email nie je vo whiteliste — vyhoď session a back to login.
    await supabase.auth.signOut();
    return NextResponse.redirect(`${origin}/login?error=not_allowed`);
  }

  return NextResponse.redirect(`${origin}${homePathForRole(identity.role)}`);
}
