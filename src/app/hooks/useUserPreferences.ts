/**
 * Hook to fetch and manage user's interests, subcategories, and deal-breakers
 */

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';

export interface UserPreference {
  id: string;
  name: string;
}

export interface UserPreferences {
  interests: UserPreference[];
  subcategories: UserPreference[];
  dealbreakers: UserPreference[];
}

export interface UseUserPreferencesResult extends UserPreferences {
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export interface UseUserPreferencesOptions {
  initialData?: UserPreferences;
  skipInitialFetch?: boolean;
}

/**
 * Hook to fetch user's preferences (interests, subcategories, dealbreakers)
 */
export function useUserPreferences(options: UseUserPreferencesOptions = {}): UseUserPreferencesResult {
  const { user, isLoading: authLoading } = useAuth();
  const [interests, setInterests] = useState<UserPreference[]>(options.initialData?.interests ?? []);
  const [subcategories, setSubcategories] = useState<UserPreference[]>(options.initialData?.subcategories ?? []);
  const [dealbreakers, setDealbreakers] = useState<UserPreference[]>(options.initialData?.dealbreakers ?? []);
  const [loading, setLoading] = useState(!(options.skipInitialFetch && options.initialData));
  const [error, setError] = useState<string | null>(null);
  const hasSkippedRef = useRef(false);
  const lastUserIdRef = useRef<string | null>(null);
  const initialUserIdRef = useRef<string | null | undefined>(undefined);

  const fetchPreferences = async () => {
    console.log('[useUserPreferences] fetchPreferences called', {
      user: user ? 'exists' : 'null',
      authLoading,
    });
    
    // ✅ CRITICAL: If auth is still loading, do nothing yet (avoid flicker/reset)
    if (authLoading) {
      console.log('[useUserPreferences] Auth still loading, keeping loading state');
      setLoading(true);
      return;
    }
    
    // ✅ If auth is done and user is null => logged out (now safe to return empty)
    if (!user) {
      console.log('[useUserPreferences] Auth finished, no user - returning empty preferences');
      setInterests([]);
      setSubcategories([]);
      setDealbreakers([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/user/preferences', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Ensure cookies/session are sent
      });
      
      console.log('[useUserPreferences] response status:', response.status);
      
      if (!response.ok) {
        // Handle 404 specifically - route might not exist or user not authenticated
        if (response.status === 404) {
          console.warn('[useUserPreferences] API route not found (404). This may be expected if user is not authenticated or route is not available.');
        } else {
          console.error('[useUserPreferences] API returned error:', response.status, response.statusText);
        }
        // Don't throw - return empty preferences instead
        setInterests([]);
        setSubcategories([]);
        setDealbreakers([]);
        setLoading(false);
        return;
      }

      const data = await response.json();
      
      setInterests(data.interests || []);
      setSubcategories(data.subcategories || []);
      setDealbreakers(data.dealbreakers || []);
      
      console.log('[useUserPreferences] Loaded preferences:', {
        interests: data.interests?.length || 0,
        subcategories: data.subcategories?.length || 0,
        dealbreakers: data.dealbreakers?.length || 0,
      });
    } catch (err: any) {
      console.error('[useUserPreferences] Error fetching user preferences:', err);
      // Gracefully handle errors - return empty arrays instead of breaking UI
      setInterests([]);
      setSubcategories([]);
      setDealbreakers([]);
      setError(null); // Don't show error to user
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const currentUserId = user?.id ?? null;
    const userChanged = lastUserIdRef.current !== currentUserId;
    lastUserIdRef.current = currentUserId;

    const hasInitialData = !!options.initialData;

    if (options.skipInitialFetch && hasInitialData) {
      if (!hasSkippedRef.current) {
        hasSkippedRef.current = true;
        return;
      }

      if (authLoading) {
        return;
      }

      if (initialUserIdRef.current === undefined) {
        initialUserIdRef.current = currentUserId;
      }

      if (!userChanged || currentUserId === initialUserIdRef.current) {
        return;
      }
    }

    if (authLoading) {
      return;
    }

    fetchPreferences();
  }, [user?.id, authLoading]); // ✅ Also depend on authLoading to prevent premature fetches

  return {
    interests,
    subcategories,
    dealbreakers,
    loading,
    error,
    refetch: fetchPreferences,
  };
}

/**
 * Hook to get user's interest IDs (useful for filtering)
 */
export function useUserInterestIds(): string[] {
  const { interests, subcategories } = useUserPreferences();
  return interests.map(i => i.id).concat(subcategories.map(s => s.id));
}

