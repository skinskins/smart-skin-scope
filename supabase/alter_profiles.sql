-- Ajouter les colonnes spécifiques au Daily Check-in dans la table profiles existante
alter table public.profiles
add column if not exists heart_rate integer,
add column if not exists sleep_hours numeric,
add column if not exists water_glasses integer,
add column if not exists alcohol_drinks integer,
add column if not exists cycle_phase text,
add column if not exists stress_level integer,
add column if not exists food_quality text;
