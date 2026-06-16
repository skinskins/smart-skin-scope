ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS default_factors jsonb DEFAULT NULL;
