-- Ajouter les colonnes spécifiques pour la routine de soin dans la table profiles
alter table public.profiles
add column if not exists am_routine text[],
add column if not exists pm_routine text[];
