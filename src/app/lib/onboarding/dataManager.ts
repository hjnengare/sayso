/**
 * Onboarding Data Manager
 * Simplified - DB is the single source of truth
 */

export interface OnboardingData {
  interests: string[];
  subcategories: string[];
  dealbreakers: string[];
}

import { apiClient } from '../api/apiClient';

/**
 * Load data from database
 */
export async function loadFromDatabase(): Promise<Partial<OnboardingData>> {
  try {
    // Use shared API client with deduplication but NO caching for onboarding
    // Onboarding data changes frequently during the flow, so we need fresh data
    const data = await apiClient.fetch<{
      interests?: string[];
      subcategories?: { subcategory_id: string }[];
      dealbreakers?: string[];
    }>(
      '/api/user/onboarding',
      {},
      {
        ttl: 0, // No cache TTL
        useCache: false, // Disable caching for onboarding data
        cacheKey: '/api/user/onboarding',
      }
    );
    
    return {
      interests: data.interests || [],
      subcategories: data.subcategories?.map((s: { subcategory_id: string }) => s.subcategory_id) || [],
      dealbreakers: data.dealbreakers || [],
    };
  } catch (error) {
    console.error('[Data Manager] Error loading from database:', error);
    return {};
  }
}
