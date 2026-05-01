-- Add cycle tracking duration columns to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS cycle_duration integer DEFAULT 28;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS period_duration integer DEFAULT 5;
