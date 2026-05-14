"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import {
  ALLOWED_EMAILS,
  isAllowedEmail,
} from "@/lib/auth";
import { createBrowserSupabaseClient } from "@/lib/supabase";

function LoginForm() {
  const searchParams = useSearchParams();
  const initialError = searchParams.get("error");

  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(
    initialError === "not_allowed"
      ? "Tento email nemá prístup. Iba Lydka a Verča."
      : initialError === "exchange_failed"
        ? "Prihlásenie zlyhalo. Skús to znova."
        : null,
  );
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const normalized = email.trim().toLowerCase();

    if (!isAllowedEmail(normalized)) {
      setError("Tento email nie je v zozname. Prístup má iba Lydka a Verča.");
      return;
    }

    setSubmitting(true);
    const supabase = createBrowserSupabaseClient();
    const { error: authError } = await supabase.auth.signInWithOtp({
      email: normalized,
      options: {
        // Lydka aj Verča sú pozvaní cez Supabase Auth invitation; nikoho
        // nového nevyrábame z login formu. `shouldCreateUser: false` zabráni
        // chybe „signups not allowed" pri vypnutej registrácii.
        shouldCreateUser: false,
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    setSubmitting(false);
    if (authError) {
      setError(`Nepodarilo sa poslať magic link: ${authError.message}`);
      return;
    }
    setSent(true);
  }

  if (sent) {
    return (
      <div className="flex min-h-[80vh] flex-col">
        <div className="flex flex-1 flex-col justify-center text-center">
          <h1 className="mb-2 text-3xl font-bold text-ink">Skontroluj si email</h1>
          <p className="mb-6 text-sm text-gray-500">
            Poslali sme ti magic link na <strong>{email}</strong>. Klikni naň
            a budeš prihlásená.
          </p>
          <p className="text-xs text-gray-400">
            Link platí 1 hodinu. Ak nepríde, pozri si spam alebo skús znova.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[80vh] flex-col">
      <div className="flex flex-1 flex-col justify-center text-center">
        <h1 className="mb-2 text-3xl font-bold text-ink">Storky</h1>
        <p className="mb-12 text-sm text-gray-500">
          Prihlás sa pre prístup do appky
        </p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            type="email"
            required
            inputMode="email"
            autoComplete="email"
            placeholder="tvoj@email.sk"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input-base text-center"
          />
          <button type="submit" className="btn-primary" disabled={submitting}>
            {submitting ? "Posielam…" : "Poslať magic link"}
          </button>
          {error && (
            <p className="mt-2 text-xs text-red-600" role="alert">
              {error}
            </p>
          )}
        </form>
      </div>
      <p className="pb-2 text-center text-xs text-gray-400">
        Prístup: {ALLOWED_EMAILS.join(" · ")}
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="p-4 text-sm text-gray-500">Načítavam…</div>}>
      <LoginForm />
    </Suspense>
  );
}
