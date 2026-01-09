/**
 * Onboarding Data Manager
 * Simplified - DB is the single source of truth
 */

export interface OnboardingData {
  interests: string[];
  subcategories: string[];
  dealbreakers: string[];
}

/**
 * Load data from database
 * Optimized for performance with minimal overhead
 */
export async function loadFromDatabase(): Promise<Partial<OnboardingData>> {
  try {
    // Use fetch directly for better performance and control
    // Client-side fetch with no-cache for fresh data during onboarding
    const response = await fetch('/api/user/onboarding', {
      credentials: 'include',
      cache: 'no-store', // No cache during onboarding to ensure fresh data
    });

    if (!response.ok) {
      throw new Error(`Failed to load onboarding data: ${response.statusText}`);
    }

    const data = await response.json();
    
    return {
      interests: data.interests || [],
      subcategories: data.subcategories?.map((s: { subcategory_id: string }) => s.subcategory_id) || [],
      dealbreakers: data.dealbreakers || [],
    };
  } catch (error) {
    console.error('[Data Manager] Error loading from database:', error);
    // Return empty data instead of throwing to prevent blocking render
    return {
      interests: [],
      subcategories: [],
      dealbreakers: [],
    };
  }
}
