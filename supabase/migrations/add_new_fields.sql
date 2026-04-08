-- Ajouter "gender" à la table des profils invités
ALTER TABLE public.guest_profiles ADD COLUMN IF NOT EXISTS gender text;

-- Ajouter les nouveaux champs à la table des check-ins
ALTER TABLE public.guest_checkins ADD COLUMN IF NOT EXISTS makeup_removed boolean;
ALTER TABLE public.guest_checkins ADD COLUMN IF NOT EXISTS location text;
ALTER TABLE public.guest_checkins ADD COLUMN IF NOT EXISTS weather jsonb;
