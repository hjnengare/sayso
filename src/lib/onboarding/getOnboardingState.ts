// src/lib/onboarding/getOnboardingState.ts

import type { SupabaseClient } from "@supabase/supabase-js";

export type OnboardingState = {
  interestsCount: number;
  subcategoriesCount: number;
  dealbreakersCount: number;
  nextRoute: "/interests" | "/subcategories" | "/deal-breakers" | "/complete";
  isComplete: boolean;
};

/**
 * Derives onboarding state from the actual join tables (source of truth)
 * This prevents state desync issues that occur when relying on onboarding_step field
 * 
 * @param supabase - Supabase client instance
 * @param userId - User ID to check onboarding state for
 * @returns OnboardingState with counts and next route
 */
export async function getOnboardingState(
  supabase: SupabaseClient,
  userId: string
): Promise<OnboardingState> {
  // Count from the actual join tables = source of truth
  // Using head: true and count: "exact" for efficient counting without fetching rows
  const [iRes, sRes, dRes] = await Promise.all([
    supabase
      .from("user_interests")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId),
    supabase
      .from("user_subcategories")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId),
    supabase
      .from("user_dealbreakers")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId),
  ]);

  // If any count query fails, throw (you want to see this)
  if (iRes.error) {
    console.error('[getOnboardingState] Error counting interests:', iRes.error);
    throw iRes.error;
  }
  if (sRes.error) {
    console.error('[getOnboardingState] Error counting subcategories:', sRes.error);
    throw sRes.error;
  }
  if (dRes.error) {
    console.error('[getOnboardingState] Error counting dealbreakers:', dRes.error);
    throw dRes.error;
  }

  const interestsCount = iRes.count ?? 0;
  const subcategoriesCount = sRes.count ?? 0;
  const dealbreakersCount = dRes.count ?? 0;

  // Determine next route based on what's missing
  let nextRoute: OnboardingState["nextRoute"] = "/complete";
  if (interestsCount === 0) {
    nextRoute = "/interests";
  } else if (subcategoriesCount === 0) {
    nextRoute = "/subcategories";
  } else if (dealbreakersCount === 0) {
    nextRoute = "/deal-breakers";
  }

  const isComplete = nextRoute === "/complete";

  return { 
    interestsCount, 
    subcategoriesCount, 
    dealbreakersCount, 
    nextRoute, 
    isComplete 
  };
}

