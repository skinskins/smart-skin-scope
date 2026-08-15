-- Plafond de régénérations manuelles du plan hebdomadaire (generate-weekly-advice avec
-- force:true) : 3 générations max par semaine, en comptant la génération automatique
-- initiale. weekly_advice_regen_week identifie la semaine (week_start) à laquelle
-- weekly_advice_regen_count s'applique — le compteur repart de 0 dès qu'on change de semaine.
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS weekly_advice_regen_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS weekly_advice_regen_week date;
