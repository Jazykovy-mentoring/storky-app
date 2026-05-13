// Middleware: refresh session + role-based route guard.
//
// Pattern z https://supabase.com/docs/guides/auth/server-side/nextjs.
// Beží na každý request okrem static assetov (viď `config.matcher`).

import { NextResponse, type NextRequest } from "next/server";
import { createMiddlewareSupabaseClient } from "@/lib/supabase";
import { getUserByEmail } from "@/lib/auth";

const PUBLIC_PATHS = ["/login", "/auth/callback"];

const LYDKA_ONLY_PREFIXES = ["/new", "/draft", "/done"];
const LYDKA_ONLY_EXACT = ["/"];
const VERCA_ONLY_PREFIXES = ["/verca"];

function isLydkaOnly(pathname: string): boolean {
  if (LYDKA_ONLY_EXACT.includes(pathname)) return true;
  return LYDKA_ONLY_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

function isVercaOnly(pathname: string): boolean {
  return VERCA_ONLY_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public paths (login, auth callback) prejdú bez kontroly,
  // ale ešte refreshneme cookies pre prípadnú aktívnu session.
  let response = NextResponse.next({ request });

  // Mock mode (chýba ENV) — nesnažíme sa volať Supabase, prepustíme všetko.
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return response;
  }

  const supabase = createMiddlewareSupabaseClient(request, response);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Public paths — žiadny ďalší guard.
  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return response;
  }

  // API: nech si endpoint riadi auth sám (vraciame 401 z route handlera,
  // nie redirect z middleware).
  if (pathname.startsWith("/api/")) {
    return response;
  }

  if (!user?.email) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const identity = getUserByEmail(user.email, user.id);
  if (!identity) {
    await supabase.auth.signOut();
    return NextResponse.redirect(
      new URL("/login?error=not_allowed", request.url),
    );
  }

  // Role-based guard.
  if (identity.role === "lydka" && isVercaOnly(pathname)) {
    return NextResponse.redirect(new URL("/", request.url));
  }
  if (identity.role === "verca" && isLydkaOnly(pathname)) {
    return NextResponse.redirect(new URL("/verca", request.url));
  }

  return response;
}

export const config = {
  matcher: [
    // Všetko okrem static assetov, Next interných ciest a obrázkov.
    "/((?!_next/static|_next/image|favicon.ico|manifest.json|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
