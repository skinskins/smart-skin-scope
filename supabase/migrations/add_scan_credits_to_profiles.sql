-- Système de crédits de scan hebdomadaire (5/semaine après la fenêtre gratuite de 24h post-inscription).
-- Le reset n'est pas un cron calendaire : il est déclenché individuellement par generate-weekly-advice
-- pour chaque utilisatrice (cf. last_weekly_advice_at). Les crédits non utilisés sont perdus au reset
-- (use-it-or-lose-it), pas de rollover.
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS scan_credits_remaining integer NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS last_weekly_advice_at timestamptz,
  ADD COLUMN IF NOT EXISTS routine_regen_pending_since timestamptz;
