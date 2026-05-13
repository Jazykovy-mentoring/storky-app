-- 002_rls_policies.sql
-- Row Level Security pre stories + story_photos.
--
-- Whitelist:
--   - Lydka: lydia.machova@gmail.com (creator) — môže CRUD svoje stories.
--   - Verča: kamenicka.veronika@gmail.com (consumer) — môže READ stories
--     so statusom approved/published a UPDATE status z approved → published.
--
-- DÔLEŽITÉ: Ak by sa email Lydky/Verče menil, prepíšte hodnoty nižšie.

-- =====================================================================
-- Enable RLS
-- =====================================================================
alter table public.stories enable row level security;
alter table public.story_photos enable row level security;

-- =====================================================================
-- STORIES — policies
-- =====================================================================

-- Drop existing (idempotent migration).
drop policy if exists "stories_lydka_select_own" on public.stories;
drop policy if exists "stories_lydka_insert_own" on public.stories;
drop policy if exists "stories_lydka_update_own" on public.stories;
drop policy if exists "stories_lydka_delete_own" on public.stories;
drop policy if exists "stories_verca_select_approved_published" on public.stories;
drop policy if exists "stories_verca_publish" on public.stories;

-- Lydka: full CRUD nad vlastnými storkami.
create policy "stories_lydka_select_own"
  on public.stories
  for select
  using (creator_id = auth.uid());

create policy "stories_lydka_insert_own"
  on public.stories
  for insert
  with check (creator_id = auth.uid());

create policy "stories_lydka_update_own"
  on public.stories
  for update
  using (creator_id = auth.uid())
  with check (creator_id = auth.uid());

create policy "stories_lydka_delete_own"
  on public.stories
  for delete
  using (creator_id = auth.uid());

-- Verča: read iba approved + published stories.
create policy "stories_verca_select_approved_published"
  on public.stories
  for select
  using (
    status in ('approved', 'published')
    and (auth.jwt() ->> 'email') = 'kamenicka.veronika@gmail.com'
  );

-- Verča: môže označiť approved story ako published.
-- (UPDATE policy s USING + WITH CHECK musí prejsť pre starý aj nový riadok.)
create policy "stories_verca_publish"
  on public.stories
  for update
  using (
    status = 'approved'
    and (auth.jwt() ->> 'email') = 'kamenicka.veronika@gmail.com'
  )
  with check (
    status = 'published'
    and (auth.jwt() ->> 'email') = 'kamenicka.veronika@gmail.com'
  );

-- =====================================================================
-- STORY_PHOTOS — policies (mirror principles)
-- =====================================================================

drop policy if exists "story_photos_lydka_select_own" on public.story_photos;
drop policy if exists "story_photos_lydka_insert_own" on public.story_photos;
drop policy if exists "story_photos_lydka_delete_own" on public.story_photos;
drop policy if exists "story_photos_verca_select_approved" on public.story_photos;

-- Lydka: full CRUD nad fotkami svojich storiek.
create policy "story_photos_lydka_select_own"
  on public.story_photos
  for select
  using (
    exists (
      select 1 from public.stories s
      where s.id = story_photos.story_id
        and s.creator_id = auth.uid()
    )
  );

create policy "story_photos_lydka_insert_own"
  on public.story_photos
  for insert
  with check (
    exists (
      select 1 from public.stories s
      where s.id = story_photos.story_id
        and s.creator_id = auth.uid()
    )
  );

create policy "story_photos_lydka_delete_own"
  on public.story_photos
  for delete
  using (
    exists (
      select 1 from public.stories s
      where s.id = story_photos.story_id
        and s.creator_id = auth.uid()
    )
  );

-- Verča: read fotky iba pre approved + published stories.
create policy "story_photos_verca_select_approved"
  on public.story_photos
  for select
  using (
    exists (
      select 1 from public.stories s
      where s.id = story_photos.story_id
        and s.status in ('approved', 'published')
    )
    and (auth.jwt() ->> 'email') = 'kamenicka.veronika@gmail.com'
  );
