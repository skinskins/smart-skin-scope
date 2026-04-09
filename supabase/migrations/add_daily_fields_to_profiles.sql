-- Add daily check-in columns to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS sleep_hours float;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS stress_level integer;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS water_glasses integer;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS alcohol_drinks integer;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS cycle_phase text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS did_sport boolean;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS makeup_removed boolean;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS food_quality text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS manual_location text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_checkin_date text;
