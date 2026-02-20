/**
 * useCompletePage Hook (Simplified - Read-only summary page)
 * Encapsulates verification and navigation for the complete page
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useOnboarding } from '../contexts/OnboardingContext';
import { useAuth } from '../contexts/AuthContext';

export interface UseCompletePageReturn {
  isVerifying: boolean;
  error: string | null;
  handleContinue: () => void;
  interests: string[];
  subcategories: string[];
  dealbreakers: string[];
}

export function useCompletePage(): UseCompletePageReturn {
  const router = useRouter();
  const { user, isLoading: authLoading, refreshUser } = useAuth();
  const {
    selectedInterests,
    selectedSubInterests,
    selectedDealbreakers,
  } = useOnboarding();
  const [isVerifying, setIsVerifying] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasVerified, setHasVerified] = useState(false);
  const hasMarkedComplete = useRef(false);

  // Get data from localStorage (OnboardingContext)
  const interests: string[] = selectedInterests || [];
  const subcategories: string[] = selectedSubInterests || [];
  const dealbreakers: string[] = selectedDealbreakers || [];

  // Verify user is at correct step and redirect if not
  useEffect(() => {
    let cancelled = false;

    const verifyAccess = async () => {
      // Only verify once to prevent re-render loops
      if (hasVerified) {
        return;
      }

      try {
        // Wait for auth to load
        if (authLoading) {
          return;
        }

        // No user - redirect to login
        if (!user) {
          if (!cancelled) {
            setHasVerified(true);
            setIsVerifying(false);
            router.replace('/login');
          }
          return;
        }

        // Let middleware own onboarding step enforcement.
        // This prevents client-side stale profile data from skipping the complete page.
        if (!cancelled) {
          setHasVerified(true);
          setIsVerifying(false);
          console.log('[useCompletePage] Access verified, allowing page to handle navigation');
        }
      } catch (error) {
        console.error('[Complete] Error verifying access:', error);
        // On error, fail closed to login.
        if (!cancelled) {
          setError('Failed to verify access');
          setHasVerified(true);
          setIsVerifying(false);
          router.replace('/login');
        }
      }
    };

    verifyAccess();

    return () => {
      cancelled = true;
    };
  }, [user, authLoading, router, hasVerified]);

  // Mark onboarding complete via API then navigate based on user role.
  // This is the ONLY place that sets onboarding_completed_at in the database.
  const handleContinue = useCallback(async () => {
    // Prevent duplicate calls (auto-redirect + manual click racing)
    if (hasMarkedComplete.current) return;
    hasMarkedComplete.current = true;

    try {
      // Call /api/onboarding/complete to set onboarding_completed_at
      const res = await fetch('/api/onboarding/complete', {
        method: 'POST',
        credentials: 'include',
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        console.error('[useCompletePage] Failed to mark onboarding complete:', body);
        // Don't block navigation — profile may already be complete or prerequisites may be
        // satisfied. Proceed to home so the user isn't stuck on the celebration page.
      }

      // Refresh auth context so ProtectedRoute on /home sees the updated onboarding state
      await refreshUser();

      const currentRole = user?.profile?.account_role || 'user';
      const destination = currentRole === 'business_owner' ? '/claim-business' : '/home';
      router.replace(destination);
    } catch (error) {
      console.error('[useCompletePage] Error completing onboarding:', error);
      router.replace('/home');
    }
  }, [user, router, refreshUser]);

  return {
    isVerifying,
    error,
    handleContinue,
    interests,
    subcategories,
    dealbreakers,
  };
}


