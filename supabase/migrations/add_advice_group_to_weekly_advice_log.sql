-- Type de conseil (observation | astuce | alerte | warning), même vocabulaire que
-- daily_advice_log.advice_group — absent jusqu'ici de weekly_advice_log, qui n'avait que
-- priority (haute/moyenne/basse). Les deux axes sont différents : priority classe
-- l'importance, advice_group classe la nature du conseil (ex. "Attention" vs "Astuce").
-- Nullable : les lignes générées avant cette migration n'ont pas de valeur (fallback
-- côté front sur la priorité, cf. pilierGroupFromPriority).
ALTER TABLE weekly_advice_log
  ADD COLUMN IF NOT EXISTS advice_group text;
