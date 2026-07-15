-- La migration create_skin_photos.sql et les types générés (src/types/supabase.ts)
-- ne référencent pas de colonne analysis_json, alors que skin-analysis, inci-analysis
-- et generate-advice l'utilisent tous. Si cette colonne n'existe pas réellement en
-- base, tous ces appels échouent silencieusement (ou en erreur) sur skin_photos.
-- Migration idempotente : no-op si la colonne existe déjà.

alter table public.skin_photos
  add column if not exists analysis_json jsonb;
