// Supabase clients pre Storky App (client + middleware variants).
//
// - `createBrowserSupabaseClient()` – pre client komponenty (singleton per tab).
// - `createMiddlewareSupabaseClient(req, res)` – pre `middleware.ts` (refresh session).
//
// Server-only `createServerSupabaseClient()` je v `supabase-server.ts` —
// oddelený lebo `next/headers` cookies funguje iba na serveri. Webpack by
// pri client importe `supabase.ts` hodil error, keby tu bol `cookies` import.
//
// Používame `@supabase/ssr` (oficiálny SSR package), NIE deprecated
// `@supabase/auth-helpers-nextjs`.

import { createBrowserClient, createServerClient, type CookieOptions } from "@supabase/ssr";
import type { NextRequest, NextResponse } from "next/server";

// =====================================================================
// TYPES (zostávajú stabilné aj voči mocku)
// =====================================================================

export type StoryStatus = "draft" | "approved" | "published";

export type StoryPhoto = {
  id: string;
  story_id: string;
  storage_path: string;
  sort_order: number;
  created_at: string;
  /** Public URL — počítané v lib helpera, nie v DB. */
  public_url?: string;
};

export type Story = {
  id: string;
  creator_id: string;
  status: StoryStatus;
  original_comment: string;
  generated_text: string | null;
  created_at: string;
  approved_at: string | null;
  published_at: string | null;
  published_by: string | null;
  /** JOIN-ovaná hodnota cez `story_photos` (relation v select querye). */
  story_photos?: StoryPhoto[];
};

// =====================================================================
// ENV detekcia
// =====================================================================

/**
 * Ak `NEXT_PUBLIC_SUPABASE_URL` chýba, beží mock fallback (in-memory store).
 * Slúži pre rýchly lokálny dev bez `.env.local`.
 */
export const isMockMode = !process.env.NEXT_PUBLIC_SUPABASE_URL;

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const STORY_PHOTOS_BUCKET = "story-photos";

// =====================================================================
// BROWSER CLIENT (client components)
// =====================================================================

export function createBrowserSupabaseClient() {
  return createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

// =====================================================================
// MIDDLEWARE CLIENT (session refresh)
// =====================================================================

export function createMiddlewareSupabaseClient(
  request: NextRequest,
  response: NextResponse,
) {
  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      get(name: string) {
        return request.cookies.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        request.cookies.set({ name, value, ...options });
        response.cookies.set({ name, value, ...options });
      },
      remove(name: string, options: CookieOptions) {
        request.cookies.set({ name, value: "", ...options });
        response.cookies.set({ name, value: "", ...options });
      },
    },
  });
}

// =====================================================================
// PUBLIC URL helper pre Storage
// =====================================================================

/**
 * Vyrobí public URL pre objekt v `story-photos` buckete.
 * Bucket je verejný (read), takže URL je stabilné a nepotrebuje signing.
 */
export function publicPhotoUrl(storagePath: string): string {
  if (!SUPABASE_URL) return storagePath;
  return `${SUPABASE_URL}/storage/v1/object/public/${STORY_PHOTOS_BUCKET}/${storagePath}`;
}
