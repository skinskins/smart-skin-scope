-- Permet de joindre une photo/capture d'écran à un feedback (bug report)
alter table public.feedback add column if not exists photo_path text;

-- Bucket de stockage dédié aux photos jointes aux feedbacks
insert into storage.buckets (id, name, public)
values ('feedback-photos', 'feedback-photos', false)
on conflict (id) do nothing;

drop policy if exists "Users can upload own feedback photos" on storage.objects;
create policy "Users can upload own feedback photos"
  on storage.objects for insert
  with check (
    bucket_id = 'feedback-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users can read own feedback photos" on storage.objects;
create policy "Users can read own feedback photos"
  on storage.objects for select
  using (
    bucket_id = 'feedback-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
