create table if not exists public.skin_photos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  date date not null,
  storage_path text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,

  constraint skin_photos_user_date_unique unique (user_id, date)
);

create index if not exists idx_skin_photos_user_date
  on public.skin_photos (user_id, date desc);

alter table public.skin_photos enable row level security;

create policy "Users can read own skin_photos"
  on public.skin_photos for select
  using (auth.uid() = user_id);

create policy "Users can insert own skin_photos"
  on public.skin_photos for insert
  with check (auth.uid() = user_id);

create policy "Users can update own skin_photos"
  on public.skin_photos for update
  using (auth.uid() = user_id);

create policy "Users can delete own skin_photos"
  on public.skin_photos for delete
  using (auth.uid() = user_id);
