-- Add onboarding_completed_at to profiles for completion tracking
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ;
