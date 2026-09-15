-- Optional, lightweight "how did your skin react" signal — one row per user per day,
-- feeds the skin-cycling engine's tolerance/irritation logic (and is reusable elsewhere).
create table if not exists public.skin_feedback_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  date date not null,
  issues text[] not null default '{}',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,

  constraint skin_feedback_log_user_date_unique unique (user_id, date)
);

create index if not exists idx_skin_feedback_log_user_date
  on public.skin_feedback_log (user_id, date desc);

alter table public.skin_feedback_log enable row level security;

create policy "Users can read own skin_feedback_log"
  on public.skin_feedback_log for select
  using (auth.uid() = user_id);

create policy "Users can insert own skin_feedback_log"
  on public.skin_feedback_log for insert
  with check (auth.uid() = user_id);

create policy "Users can update own skin_feedback_log"
  on public.skin_feedback_log for update
  using (auth.uid() = user_id);

create policy "Users can delete own skin_feedback_log"
  on public.skin_feedback_log for delete
  using (auth.uid() = user_id);
