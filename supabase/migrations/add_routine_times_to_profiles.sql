-- Horaires de routine matin/soir renseignés par l'utilisatrice, base pour les futures
-- notifications de rappel (non implémentées ici — cette migration ne fait que stocker l'heure).
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS morning_routine_time time,
  ADD COLUMN IF NOT EXISTS evening_routine_time time;
