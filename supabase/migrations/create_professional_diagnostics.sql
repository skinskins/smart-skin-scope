create table if not exists public.professional_diagnostics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  source text,
  raw_metrics jsonb,
  summary text
);

create index if not exists idx_professional_diagnostics_user_created
  on public.professional_diagnostics (user_id, created_at desc);

alter table public.professional_diagnostics enable row level security;

create policy "Users can read own professional_diagnostics"
  on public.professional_diagnostics for select
  using (auth.uid() = user_id);

create policy "Users can insert own professional_diagnostics"
  on public.professional_diagnostics for insert
  with check (auth.uid() = user_id);

create policy "Users can update own professional_diagnostics"
  on public.professional_diagnostics for update
  using (auth.uid() = user_id);

create policy "Users can delete own professional_diagnostics"
  on public.professional_diagnostics for delete
  using (auth.uid() = user_id);
