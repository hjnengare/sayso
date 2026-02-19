-- For You feed: ensure recommendation functions bypass RLS so they return the full
-- business catalog regardless of the caller. This fixes the issue where only
-- user-uploaded (owner) businesses were shown when SUPABASE_SERVICE_ROLE_KEY
-- was missing or the API fell back to the user's auth client.
-- SECURITY DEFINER makes these functions run with the owner's privileges,
-- returning all active businesses for discovery.

-- Helper functions called by recommend_for_you_v2 (must bypass RLS when invoked)
ALTER FUNCTION public.generate_candidates_personalized(uuid, text[], text[], uuid[], integer)
  SECURITY DEFINER;
ALTER FUNCTION public.generate_candidates_top_rated(uuid[], integer)
  SECURITY DEFINER;
ALTER FUNCTION public.generate_candidates_fresh(uuid[], integer)
  SECURITY DEFINER;
ALTER FUNCTION public.generate_candidates_explore(uuid[], text[], integer)
  SECURITY DEFINER;
ALTER FUNCTION public.rank_candidates(uuid[], text[], text[], double precision, double precision, integer)
  SECURITY DEFINER;

-- Cold start (preference-only, no stats)
ALTER FUNCTION public.recommend_for_you_cold_start(text[], text[], text[], double precision, double precision, integer, text)
  SECURITY DEFINER;

-- V2 two-stage recommender
ALTER FUNCTION public.recommend_for_you_v2(uuid, text[], text[], double precision, double precision, integer, text[], integer)
  SECURITY DEFINER;

-- Seeded wrapper around V2
ALTER FUNCTION public.recommend_for_you_v2_seeded(uuid, text[], text[], double precision, double precision, integer, text[], integer, text)
  SECURITY DEFINER;

COMMENT ON FUNCTION public.recommend_for_you_cold_start(text[], text[], text[], double precision, double precision, integer, text) IS
'Preference-only cold start For You feed. SECURITY DEFINER ensures full catalog visibility regardless of caller.';
