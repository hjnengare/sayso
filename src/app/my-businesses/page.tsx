"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../contexts/AuthContext";
import { BusinessOwnershipService } from "../lib/services/businessOwnershipService";
import { PageLoader, Loader } from "../components/Loader";
import Header from "../components/Header/Header";
// import Footer from "../components/Footer/Footer";
import { Store } from "lucide-react";
import Link from "next/link";
import type { Business } from "../lib/types/database";
import HeaderSkeleton from "../components/Header/HeaderSkeleton";
import SkeletonHeader from "../components/shared/skeletons/SkeletonHeader";
import SkeletonList from "../components/shared/skeletons/SkeletonList";

export default function MyBusinessesPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBusinesses = async () => {
      if (authLoading) return;
      
      if (!user) {
        router.push('/login');
        return;
      }

      setIsLoading(true);
      try {
        const ownedBusinesses = await BusinessOwnershipService.getBusinessesForOwner(user.id);
        setBusinesses(ownedBusinesses);
      } catch (error) {
        console.error('Error fetching businesses:', error);
        setError('Failed to load your businesses');
      } finally {
        setIsLoading(false);
      }
    };

    fetchBusinesses();
  }, [user, authLoading, router]);

  // Refetch when page becomes visible (e.g., returning from edit page)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && user) {
        // Small delay to ensure edit page has finished redirecting
        setTimeout(async () => {
          try {
            const ownedBusinesses = await BusinessOwnershipService.getBusinessesForOwner(user.id);
            setBusinesses(ownedBusinesses);
          } catch (error) {
            console.error('Error refetching businesses:', error);
          }
        }, 100);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Also refetch on focus (when user returns to tab)
    const handleFocus = () => {
      if (user) {
        BusinessOwnershipService.getBusinessesForOwner(user.id)
          .then(setBusinesses)
          .catch(error => console.error('Error refetching businesses:', error));
      }
    };
    
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [user]);

  // Listen for business deletion events and remove from list
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    
    import('../lib/utils/businessUpdateEvents').then(({ businessUpdateEvents }) => {
      unsubscribe = businessUpdateEvents.onDelete((deletedBusinessId: string) => {
        // Remove deleted business from the list immediately
        setBusinesses(prev => prev.filter(b => b.id !== deletedBusinessId));
      });
    }).catch(err => {
      console.error('Error loading business update events:', err);
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // Loader removed: always show page content

  if (!user) {
    return null; // Will redirect
  }

  if (error) {
    return (
      <div className="min-h-dvh bg-off-white">
        <Header />
        <main className="pt-20 sm:pt-24 pb-28">
          <div className="mx-auto w-full max-w-[2000px] px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto text-center py-12">
              <p className="text-charcoal/70">{error}</p>
            </div>
          </div>
        </main>
        {/* <Footer /> */}
      </div>
    );
  }

  if (authLoading || isLoading) {
    // Skeleton loader for header, page title, description, and business cards
    return (
      <div className="min-h-dvh bg-off-white">
        <HeaderSkeleton />
        <main className="pt-20 sm:pt-24 pb-28">
          <div className="mx-auto w-full max-w-[2000px] px-2">
            <nav className="mb-4 sm:mb-6 px-2" aria-label="Breadcrumb">
              <SkeletonHeader width="w-1/3" height="h-6" className="mb-2" />
            </nav>
            <div className="mb-8 sm:mb-12 px-2">
              <SkeletonHeader width="w-2/3" height="h-10" className="mb-2" />
              <SkeletonHeader width="w-1/2" height="h-6" />
            </div>
            <div className="px-2">
              <SkeletonList count={3} />
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-off-white">
      <Header
        showSearch={false}
        variant="white"
        backgroundClassName="bg-navbar-bg"
        topPosition="top-0"
        reducedPadding={true}
        whiteText={true}
      />
      <div className="bg-gradient-to-b from-off-white/0 via-off-white/50 to-off-white">
        <main className="pt-20 sm:pt-24 pb-28">
          <div className="mx-auto w-full max-w-[2000px] px-2">
            {/* Empty state pattern from Saved page */}
            {(!businesses || businesses.length === 0) && (
              <div className="relative z-10 min-h-[calc(100vh-200px)] flex items-center justify-center">
                <div className="mx-auto w-full max-w-[2000px] px-2 font-urbanist w-full">
                  <div className="text-center w-full">
                    <div className="w-20 h-20 mx-auto mb-6 bg-charcoal/10 rounded-full flex items-center justify-center">
                      <Store className="w-10 h-10 text-charcoal/60" strokeWidth={1.5} />
                    </div>
                    <h3 className="text-h2 font-semibold text-charcoal mb-2">No businesses yet</h3>
                    <p className="text-body-sm text-charcoal/60 mb-6 max-w-md mx-auto" style={{ fontWeight: 500 }}>
                      Add your business to manage it here
                    </p>
                    <button
                      onClick={() => router.push("/add-business")}
                      className="inline-flex items-center gap-2 px-6 py-2.5 bg-sage text-white text-body font-semibold rounded-full hover:bg-sage/90 transition-all duration-300"
                    >
                      Add your business
                    </button>
                  </div>
                </div>
              </div>
            )}
            {/* ...existing code... */}
            {/* Breadcrumb, header, business list ... */}
            {/* ...existing code... */}
          </div>
        </main>
      </div>
    </div>
  );
}

