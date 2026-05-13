-- 003_storage_policies.sql
-- Storage bucket `story-photos` + RLS policies.
--
-- Bucket je PUBLIC (read), takže Verča aj IG fetch URL bez auth headera.
-- Upload je len pre authenticated users do vlastnej cesty (auth.uid()/...).

-- =====================================================================
-- Create bucket (idempotent)
-- =====================================================================
insert into storage.buckets (id, name, public)
values ('story-photos', 'story-photos', true)
on conflict (id) do update set public = excluded.public;

-- =====================================================================
-- Policies on storage.objects
-- =====================================================================

drop policy if exists "story_photos_public_read" on storage.objects;
drop policy if exists "story_photos_lydka_upload_own_folder" on storage.objects;
drop policy if exists "story_photos_lydka_update_own_folder" on storage.objects;
drop policy if exists "story_photos_lydka_delete_own_folder" on storage.objects;

-- Public read — bucket je verejný, takže ktokoľvek (vrátane unauthenticated
-- IG preview ferchov) môže čítať objekty. RLS pre SELECT necháme otvorené.
create policy "story_photos_public_read"
  on storage.objects
  for select
  using (bucket_id = 'story-photos');

-- Upload: iba do {auth.uid()}/{cokolvek}.{ext}.
create policy "story_photos_lydka_upload_own_folder"
  on storage.objects
  for insert
  with check (
    bucket_id = 'story-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- Update (cache headers, replace): rovnaký scope.
create policy "story_photos_lydka_update_own_folder"
  on storage.objects
  for update
  using (
    bucket_id = 'story-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- Delete: rovnaký scope (Lydka môže mazať svoje fotky).
create policy "story_photos_lydka_delete_own_folder"
  on storage.objects
  for delete
  using (
    bucket_id = 'story-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
