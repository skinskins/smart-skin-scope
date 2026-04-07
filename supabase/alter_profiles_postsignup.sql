-- Ajouter les colonnes spécifiques au Post-Signup dans la table profiles existante
alter table public.profiles
add column if not exists profession text,
add column if not exists skin_problems text[];
