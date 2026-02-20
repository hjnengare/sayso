-- =============================================
-- FIX: replace_user_dealbreakers RPC
-- =============================================
-- Problem:
--   The RPC was setting onboarding_complete = TRUE and onboarding_step = 'complete'
--   before the user reached the /complete page. This made onboarding_completed_at
--   and onboarding_complete go out of sync, breaking the single source of truth.
--
-- Fix:
--   The RPC now only saves dealbreaker data and updates the count.
--   onboarding_step advancement is handled by the API layer (deal-breakers route.ts).
--   onboarding_complete and onboarding_completed_at are set exclusively by
--   /api/onboarding/complete when the user reaches the /complete page.

DROP FUNCTION IF EXISTS public.replace_user_dealbreakers(UUID, TEXT[]);

CREATE OR REPLACE FUNCTION public.replace_user_dealbreakers(
  p_user_id UUID,
  p_dealbreaker_ids TEXT[]
)
RETURNS TABLE(
  onboarding_step TEXT,
  onboarding_complete BOOLEAN,
  interests_count INTEGER,
  subcategories_count INTEGER,
  dealbreakers_count INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
  v_result RECORD;
BEGIN
  -- Delete existing dealbreakers
  DELETE FROM public.user_dealbreakers WHERE user_id = p_user_id;

  -- Insert new dealbreakers
  v_count := COALESCE(array_length(p_dealbreaker_ids, 1), 0);

  IF v_count > 0 THEN
    INSERT INTO public.user_dealbreakers (user_id, dealbreaker_id)
    SELECT p_user_id, unnest(p_dealbreaker_ids);
  END IF;

  -- Update only the count — do NOT touch onboarding_step, onboarding_complete,
  -- or onboarding_completed_at. Those are owned by the API layer and /complete page.
  UPDATE public.profiles
  SET
    dealbreakers_count = v_count,
    last_dealbreakers_updated = NOW(),
    updated_at = NOW()
  WHERE user_id = p_user_id
  RETURNING
    profiles.onboarding_step,
    profiles.onboarding_complete,
    profiles.interests_count,
    profiles.subcategories_count,
    profiles.dealbreakers_count
  INTO v_result;

  -- Return fresh state (step/complete reflect whatever was already in the profile)
  RETURN QUERY
  SELECT
    v_result.onboarding_step,
    v_result.onboarding_complete,
    v_result.interests_count,
    v_result.subcategories_count,
    v_result.dealbreakers_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.replace_user_dealbreakers(UUID, TEXT[]) TO authenticated;
