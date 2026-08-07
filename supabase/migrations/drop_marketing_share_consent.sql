-- Retrait du consentement "Partage marketing" (onboarding + RGPD)
ALTER TABLE public.profiles DROP COLUMN IF EXISTS marketing_share_consent;
