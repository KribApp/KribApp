-- Create a new storage bucket for household images
insert into storage.buckets (id, name, public)
values ('households', 'households', true)
on conflict (id) do nothing;

-- Set up RLS policies for the 'households' bucket

-- 1. Allow public read access to everyone
create policy "Public Access"
  on storage.objects for select
  using ( bucket_id = 'households' );

-- 2. Allow authenticated users to upload images
-- (Ideally, we'd check if they are in a household, but 'authenticated' is a good start for MVP)
create policy "Authenticated users can upload"
  on storage.objects for insert
  to authenticated
  with check ( bucket_id = 'households' );

-- 3. Allow users to update/delete their own uploads (or anyone in the household ideally)
-- For now, allow authenticated update if they are the owner or just authenticated (simplified for MVP)
create policy "Authenticated users can update"
  on storage.objects for update
  to authenticated
  using ( bucket_id = 'households' );
