"use client";

import { useEffect, useMemo, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "../contexts/AuthContext";
import { ONBOARDING_STEPS } from "../contexts/onboarding-steps";
import { PageLoader } from "./Loader";

// Simple loading component
const PageLoading = () => <PageLoader size="lg" variant="wavy" color="sage" />;

interface OnboardingGuardProps {
  children: React.ReactNode;
}

export default function OnboardingGuard({ children }: OnboardingGuardProps) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  // Memoize expensive calculations
  const isOnboardingRoute = useMemo(() =>
    ONBOARDING_STEPS.some(step => pathname === step.path || pathname.startsWith(step.path)),
    [pathname]
  );

  // Simplified navigation logic - let middleware handle strict step enforcement
  // This guard only handles basic auth/verification checks to avoid blocking legitimate progression
  const handleNavigation = useCallback(() => {
    if (isLoading) return;

    // Skip guard for non-onboarding routes
    if (!isOnboardingRoute) return;

    // If user is already onboarded and trying to access ANY onboarding route, redirect to home
    // EXCEPT for the complete page, which should be allowed as the final step
    if (user?.profile?.onboarding_complete && pathname !== "/complete") {
      router.replace("/home");
      return;
    }

    // If no user and trying to access protected steps, redirect to start
    if (!user && pathname !== "/onboarding" && pathname !== "/register" && pathname !== "/login") {
      router.replace("/onboarding");
      return;
    }

    // For protected onboarding steps, check email verification
    // Note: We don't check step prerequisites here because:
    // 1. Middleware handles strict step-by-step enforcement with fresh DB data
    // 2. Client-side state is stale (data saves async, user state updates async)
    // 3. Pages themselves handle showing appropriate UI if data isn't ready
    const protectedSteps = ["/interests", "/subcategories", "/deal-breakers", "/complete"];
    if (user && protectedSteps.includes(pathname) && !user.email_verified) {
      router.replace("/verify-email");
      return;
    }

    // Allow navigation - middleware will handle step enforcement
    // This prevents the guard from blocking legitimate progression due to stale client state
  }, [user, isLoading, pathname, router, isOnboardingRoute]);

  useEffect(() => {
    handleNavigation();
  }, [handleNavigation]);

  // Show loading while checking auth
  if (isLoading) {
    return <PageLoading />;
  }

  return <>{children}</>;
}
