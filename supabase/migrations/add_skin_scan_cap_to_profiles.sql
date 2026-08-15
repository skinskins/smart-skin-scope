-- Plafond de 2 analyses de peau (skin-analysis) par semaine calendaire — même mécanique que
-- weekly_advice_regen_count/week : skin_scan_week identifie la semaine (lundi, calculée
-- côté serveur en UTC) à laquelle skin_scan_count s'applique, et repart de 0 à chaque
-- changement de semaine. Ne compte que les analyses réellement acceptées et sauvegardées
-- (pas les photos rejetées pour mauvaise qualité), cf. skin-analysis edge function.
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS skin_scan_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS skin_scan_week date;
