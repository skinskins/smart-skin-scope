ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS skin_diagnostic_baseline jsonb DEFAULT NULL;

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS skin_diagnostic_source text DEFAULT NULL;
