-- 001_initial_schema.sql
-- Storky App — základná schéma: stories + story_photos.

-- =====================================================================
-- ENUM: story_status
-- =====================================================================
do $$
begin
  if not exists (select 1 from pg_type where typname = 'story_status') then
    create type story_status as enum ('draft', 'approved', 'published');
  end if;
end$$;

-- =====================================================================
-- TABLE: stories
-- =====================================================================
create table if not exists public.stories (
  id                uuid primary key default gen_random_uuid(),
  creator_id        uuid not null references auth.users(id) on delete cascade,
  status            story_status not null default 'draft',
  original_comment  text not null,
  generated_text    text,
  created_at        timestamptz not null default now(),
  approved_at       timestamptz,
  published_at      timestamptz,
  published_by      uuid references auth.users(id)
);

-- =====================================================================
-- TABLE: story_photos (1-N na stories)
-- =====================================================================
create table if not exists public.story_photos (
  id            uuid primary key default gen_random_uuid(),
  story_id      uuid not null references public.stories(id) on delete cascade,
  storage_path  text not null,
  sort_order    int not null default 0,
  created_at    timestamptz not null default now()
);

-- =====================================================================
-- Indexes
-- =====================================================================
create index if not exists stories_creator_status_created_idx
  on public.stories (creator_id, status, created_at desc);

create index if not exists stories_status_approved_idx
  on public.stories (status, approved_at desc);

create index if not exists story_photos_story_order_idx
  on public.story_photos (story_id, sort_order);
