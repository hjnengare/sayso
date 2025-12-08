"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../contexts/AuthContext";
import { BusinessOwnershipService } from "../lib/services/businessOwnershipService";
import type { Business } from "../lib/types/database";

interface BusinessGuardOptions {
  /** Specific business ID the user must own. */
  businessId?: string;
  /** Optional redirect URL when access is denied. */
  redirectTo?: string;
  /** Skip automatic redirect handling even when redirectTo is provided. */
  skipRedirect?: boolean;
}

interface BusinessAccessState {
  isChecking: boolean;
  hasAccess: boolean;
  businesses: Business[];
}

/**
 * Client hook that ensures the current user has business-owner access.
 * If a `businessId` is provided, the user must own that business.
 * Otherwise, the hook checks if the user owns at least one business.
 */
export function useRequireBusinessOwner(options: BusinessGuardOptions = {}) {
  const { businessId, redirectTo, skipRedirect } = options;
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const requiresSpecificBusiness = Object.prototype.hasOwnProperty.call(options, "businessId");

  const [state, setState] = useState<BusinessAccessState>({
    isChecking: true,
    hasAccess: false,
    businesses: [],
  });

  useEffect(() => {
    let cancelled = false;

    const checkAccess = async () => {
      // Wait until auth state is resolved
      if (authLoading) {
        return;
      }

      // If we must verify a specific business, wait until the ID is available
      if (requiresSpecificBusiness && !businessId) {
        return;
      }

      // Unauthenticated users never have business access
      if (!user) {
        if (!cancelled) {
          setState({ isChecking: false, hasAccess: false, businesses: [] });
        }
        if (redirectTo && !skipRedirect) {
          router.replace(redirectTo);
        }
        return;
      }

      try {
        if (requiresSpecificBusiness) {
          const targetBusinessId = businessId as string;
          const ownsBusiness = await BusinessOwnershipService.isBusinessOwner(user.id, targetBusinessId);

          if (!cancelled) {
            setState({ isChecking: false, hasAccess: ownsBusiness, businesses: [] });
          }

          if (!ownsBusiness && redirectTo && !skipRedirect) {
            router.replace(redirectTo);
          }

          return;
        }

        const ownedBusinesses = await BusinessOwnershipService.getBusinessesForOwner(user.id);
        const hasAccess = ownedBusinesses.length > 0;

        if (!cancelled) {
          setState({ isChecking: false, hasAccess, businesses: ownedBusinesses });
        }

        if (!hasAccess && redirectTo && !skipRedirect) {
          router.replace(redirectTo);
        }
      } catch (error) {
        console.error("Error verifying business ownership access:", error);
        
        // Handle network errors gracefully
        if (error instanceof TypeError && error.message === 'Failed to fetch') {
          console.warn("Network error: Unable to connect to server. Please check your connection.");
        }

        if (!cancelled) {
          setState({ isChecking: false, hasAccess: false, businesses: [] });
        }

        if (redirectTo && !skipRedirect) {
          router.replace(redirectTo);
        }
      }
    };

    checkAccess();

    return () => {
      cancelled = true;
    };
  }, [authLoading, user?.id, businessId, redirectTo, skipRedirect, router, requiresSpecificBusiness]);

  const value = useMemo(() => ({
    isChecking: authLoading || state.isChecking,
    hasAccess: state.hasAccess,
    businesses: state.businesses,
  }), [authLoading, state.isChecking, state.hasAccess, state.businesses]);

  return value;
}


