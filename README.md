# Storky App (v0.3 — production)

Mobilná webapka pre Jazykový mentoring (firma Lýdie Hric Machovej). **Lydka** pridá fotky + raw komentár, AI agent v jej hlase vyrobí storku, **Verča** ju vidí, skopíruje text a publishne na Instagram.

---

## Tech stack

- Next.js 14 (App Router) + TypeScript
- Tailwind CSS (mobile-first)
- Supabase (Auth + Postgres + Storage) cez `@supabase/ssr`
- Claude API (`claude-sonnet-4-5`) cez `@anthropic-ai/sdk` s prompt cachingom
- Netlify deploy (`@netlify/plugin-nextjs`)
- Whitelist 2 emailov (Lydka + Verča) v `src/lib/auth.ts`

---

## Setup (lokálny dev)

1. **Install dependencies:**
   ```bash
   cd Tools/storky-app
   npm install
   ```

2. **Vytvor `.env.local`** zo šablóny:
   ```bash
   cp .env.example .env.local
   ```
   Doplň hodnoty zo Supabase dashbordu (`Project Settings → API`) a Anthropic console.

3. **Run dev server:**
   ```bash
   npm run dev
   ```
   Otvor `http://localhost:3000` (mobile alebo Chrome DevTools device toolbar).

Bez `NEXT_PUBLIC_SUPABASE_URL` middleware prepustí všetko (pre rýchle UI úpravy bez DB), ale ostatné fetche zlyhajú — pre plný flow potrebuješ Supabase.

---

## Supabase setup (1× per environment)

1. **Vytvor projekt** (free tier stačí) → skopíruj `URL` a `anon key` do `.env.local`.

2. **Spusti migrácie** v Supabase SQL editore (po poradí):
   - `supabase/migrations/001_initial_schema.sql` — tabuľky + indexy
   - `supabase/migrations/002_rls_policies.sql` — RLS policies
   - `supabase/migrations/003_storage_policies.sql` — bucket + storage RLS

3. **Auth → Users:** pozvi 2 emaily (Lydka + Verča). V `Auth → Providers → Email` vypni „Allow new users" (whitelist sa drží navyše aj v kóde a RLS).

4. **Email templates** (voliteľné): v `Auth → Email Templates → Magic Link` priprav slovenský preklad subjectu „Tvoj Storky link" a tela správy.

---

## Production deploy (Netlify)

1. **Push do GitHub** repa (`main` alebo `production` branch).

2. **V Netlify** → „Import from Git" → vybrať repo, nastav:
   - **Base directory:** `Tools/storky-app`
   - **Build command:** `npm run build`
   - **Publish directory:** `.next`
   - Plugin `@netlify/plugin-nextjs` sa pridá automaticky podľa `netlify.toml`.

3. **Environment variables** (Site settings → Environment variables):
   ```
   NEXT_PUBLIC_SUPABASE_URL
   NEXT_PUBLIC_SUPABASE_ANON_KEY
   SUPABASE_SERVICE_ROLE_KEY      # iba budúca admin operácia
   ANTHROPIC_API_KEY
   ANTHROPIC_MODEL=claude-sonnet-4-5
   LYDKA_EMAIL=lydia.machova@gmail.com
   VERCA_EMAIL=kamenicka.veronika@gmail.com
   ```

4. **Supabase Auth → Site URL:** nastav production URL (napr. `https://storky.netlify.app`). **Redirect URLs:** pridaj `https://storky.netlify.app/auth/callback` aj `http://localhost:3000/auth/callback`.

---

## Štruktúra

```
storky-app/
├── package.json
├── netlify.toml
├── .env.example
├── supabase/migrations/
│   ├── 001_initial_schema.sql
│   ├── 002_rls_policies.sql
│   └── 003_storage_policies.sql
└── src/
    ├── middleware.ts            # session refresh + role-based guard
    ├── app/
    │   ├── layout.tsx
    │   ├── globals.css
    │   ├── page.tsx             # / – Lydka home
    │   ├── login/page.tsx       # magic link login
    │   ├── auth/callback/route.ts  # OAuth code → session exchange
    │   ├── new/page.tsx
    │   ├── draft/[id]/page.tsx
    │   ├── done/[id]/page.tsx
    │   ├── verca/
    │   │   ├── page.tsx
    │   │   └── [storyId]/page.tsx
    │   └── api/generate/route.ts  # Claude proxy
    ├── components/
    │   ├── BackBar.tsx
    │   ├── PhotoGrid.tsx
    │   └── CopyButton.tsx
    └── lib/
        ├── supabase.ts          # browser + server + middleware clients
        ├── auth.ts              # whitelist + role detection
        ├── buildSystemPrompt.ts # inlinovaný voice guide
        ├── photoUpload.ts       # resize + upload helper
        ├── storyStatus.ts       # status label + thumb color helpery
        └── typography.ts        # en-dash + slovenské úvodzovky
```

---

## DB schéma

- `stories` — id, creator_id, status (`draft`|`approved`|`published`), original_comment, generated_text, timestamps.
- `story_photos` — id, story_id (cascade delete), storage_path, sort_order.
- Storage bucket `story-photos` — public read, upload iba do `{auth.uid()}/{story.id}/...`.

RLS:
- Lydka: full CRUD nad vlastnými stories + fotkami.
- Verča: read approved/published; môže update status z `approved` → `published`.

Detaily v `supabase/migrations/002_rls_policies.sql`.

---

## Pravidlá copy & typografie

- En-dash „–", **NIKDY** em-dash „—"
- Slovenské úvodzovky „...", **NIKDY** anglické "..."
- Diakritika všade
- UI bez emoji (emoji v storkách áno – v Lydkinom hlase)

`src/lib/typography.ts` má `fixTypography()` ako safety net na výstup z LLM.
