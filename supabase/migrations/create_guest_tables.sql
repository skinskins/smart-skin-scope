-- Table pour les profils invités créés lors de l'onboarding
create table if not exists public.guest_profiles (
  id uuid primary key default gen_random_uuid(),
  first_name text,
  last_name text,
  email text,
  profession text,
  used_channels text[],
  age integer,
  weight numeric,
  skin_type text,
  skin_problems text[],
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Table pour les données de checkin quotidien
create table if not exists public.guest_checkins (
  id uuid primary key default gen_random_uuid(),
  guest_id uuid references public.guest_profiles(id) on delete cascade,
  sleep_hours numeric,
  water_glasses integer,
  stress_level integer,
  cycle_phase text,
  diet_quality text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Activation de la sécurité au niveau des lignes (RLS)
alter table public.guest_profiles enable row level security;
alter table public.guest_checkins enable row level security;

-- Création de politiques très permissives pour permettre l'insertion de n'importe où
-- Ceci est typique pour un flux invité sans authentification.

create policy "Enable insert for everyone" on public.guest_profiles
  for insert with check (true);

create policy "Enable update for everyone" on public.guest_profiles
  for update using (true);
  
create policy "Enable read for everyone" on public.guest_profiles
  for select using (true);

create policy "Enable insert for everyone" on public.guest_checkins
  for insert with check (true);

create policy "Enable read for everyone" on public.guest_checkins
  for select using (true);
