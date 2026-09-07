-- Mémorise si l'utilisatrice a déjà accordé ou refusé la géolocalisation navigateur,
-- pour ne plus jamais la solliciter automatiquement une fois la décision connue
-- (persisté côté compte, pas dans le localStorage, pour suivre l'utilisatrice d'un appareil à l'autre).
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS geo_permission_state text NOT NULL DEFAULT 'unset'
    CHECK (geo_permission_state IN ('granted', 'denied', 'unset'));
