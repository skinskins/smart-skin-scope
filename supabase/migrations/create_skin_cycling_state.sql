-- Per-user, per-strong-active-category rotation state for the skin-cycling engine
create table if not exists public.skin_cycling_state (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  category text not null check (category in ('retinol', 'exfoliant')),
  last_applied_date date,
  current_interval_days integer not null default 3,
  tolerance_score numeric not null default 1.0 check (tolerance_score >= 0 and tolerance_score <= 1),
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,

  constraint skin_cycling_state_user_category_unique unique (user_id, category)
);

create index if not exists idx_skin_cycling_state_user
  on public.skin_cycling_state (user_id);

alter table public.skin_cycling_state enable row level security;

create policy "Users can read own skin_cycling_state"
  on public.skin_cycling_state for select
  using (auth.uid() = user_id);

create policy "Users can insert own skin_cycling_state"
  on public.skin_cycling_state for insert
  with check (auth.uid() = user_id);

create policy "Users can update own skin_cycling_state"
  on public.skin_cycling_state for update
  using (auth.uid() = user_id);

create policy "Users can delete own skin_cycling_state"
  on public.skin_cycling_state for delete
  using (auth.uid() = user_id);
