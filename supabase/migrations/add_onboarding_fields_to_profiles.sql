-- Add missing columns to the profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS profession text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS used_channels text[];
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS age integer;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS gender text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS skin_type text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS skin_problems text[];
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS skin_goals text[];
