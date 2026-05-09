-- Table pour stocker les check-ins quotidiens des utilisateurs
create table if not exists public.daily_checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  date date not null,
  stress_level integer,
  sleep_hours numeric,
  water_glasses integer,
  food_quality text,
  did_sport boolean,
  sport_intensity text,
  alcohol_drinks integer,
  makeup_removed boolean,
  cycle_phase text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,

  constraint daily_checkins_user_date_unique unique (user_id, date)
);

-- Index pour les requêtes fréquentes par utilisateur + plage de dates
create index if not exists idx_daily_checkins_user_date
  on public.daily_checkins (user_id, date desc);

-- Activation de la sécurité au niveau des lignes (RLS)
alter table public.daily_checkins enable row level security;

-- Politiques RLS : chaque utilisateur ne peut lire/écrire que ses propres lignes
create policy "Users can read own daily_checkins"
  on public.daily_checkins for select
  using (auth.uid() = user_id);

create policy "Users can insert own daily_checkins"
  on public.daily_checkins for insert
  with check (auth.uid() = user_id);

create policy "Users can update own daily_checkins"
  on public.daily_checkins for update
  using (auth.uid() = user_id);

create policy "Users can delete own daily_checkins"
  on public.daily_checkins for delete
  using (auth.uid() = user_id);
