create table if not exists public.skin_symptoms (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  date date not null,
  acne_trend text check (acne_trend = ANY (ARRAY['moins', 'pareil', 'plus'])),
  redness_trend text check (redness_trend = ANY (ARRAY['moins', 'pareil', 'plus'])),
  dryness_trend text check (dryness_trend = ANY (ARRAY['moins', 'pareil', 'plus'])),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,

  constraint skin_symptoms_user_date_unique unique (user_id, date)
);

create index if not exists idx_skin_symptoms_user_date
  on public.skin_symptoms (user_id, date desc);

alter table public.skin_symptoms enable row level security;

create policy "Users can read own skin_symptoms"
  on public.skin_symptoms for select
  using (auth.uid() = user_id);

create policy "Users can insert own skin_symptoms"
  on public.skin_symptoms for insert
  with check (auth.uid() = user_id);

create policy "Users can update own skin_symptoms"
  on public.skin_symptoms for update
  using (auth.uid() = user_id);

create policy "Users can delete own skin_symptoms"
  on public.skin_symptoms for delete
  using (auth.uid() = user_id);
