-- Table pour stocker les logs de routine quotidienne
create table if not exists public.routine_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  date date not null,
  makeup_removed boolean,
  morning_routine_done boolean,
  evening_routine_done boolean,
  spf_applied boolean,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,

  constraint routine_logs_user_date_unique unique (user_id, date)
);

-- Index pour les requêtes fréquentes par utilisateur + plage de dates
create index if not exists idx_routine_logs_user_date
  on public.routine_logs (user_id, date desc);

-- Activation de la sécurité au niveau des lignes (RLS)
alter table public.routine_logs enable row level security;

-- Politiques RLS : chaque utilisateur ne peut lire/écrire que ses propres lignes
create policy "Users can read own routine_logs"
  on public.routine_logs for select
  using (auth.uid() = user_id);

create policy "Users can insert own routine_logs"
  on public.routine_logs for insert
  with check (auth.uid() = user_id);

create policy "Users can update own routine_logs"
  on public.routine_logs for update
  using (auth.uid() = user_id);

create policy "Users can delete own routine_logs"
  on public.routine_logs for delete
  using (auth.uid() = user_id);
