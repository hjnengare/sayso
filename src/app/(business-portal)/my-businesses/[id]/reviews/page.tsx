"use client";

import { useRouter, useParams } from "next/navigation";
import { useAuth } from "../../../../contexts/AuthContext";
import { PageLoader } from "../../../../components/Loader";
import { ArrowLeft } from "@/app/lib/icons";
import Link from "next/link";
import ReviewsList from "../../../../components/Reviews/ReviewsList";
import { useOwnerBusinessDashboard } from "../../../../hooks/useOwnerBusinessDashboard";
import { useReviews } from "../../../../hooks/useReviews";

export default function OwnerReviewsPage() {
  const router = useRouter();
  const params = useParams();
  const businessId = params?.id as string;
  const { user, isLoading: authLoading } = useAuth();

  const {
    business,
    isLoading: dashboardLoading,
    error,
  } = useOwnerBusinessDashboard(authLoading ? null : user?.id, businessId);

  const { reviews, loading: reviewsLoading } = useReviews(business?.id);

  const isLoading = authLoading || dashboardLoading;

  if (authLoading || isLoading) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-6 max-w-5xl mx-auto font-urbanist animate-pulse">
        {/* Header skeleton */}
        <div className="mb-6">
          <div className="h-7 w-64 rounded-lg bg-charcoal/8 mb-2" />
          <div className="h-4 w-80 rounded-md bg-charcoal/6" />
        </div>

        {/* Back link skeleton */}
        <div className="h-4 w-36 rounded-md bg-charcoal/6 mb-6" />

        {/* Reviews card skeleton */}
        <div className="rounded-2xl border border-charcoal/10 bg-white shadow-premium p-6 sm:p-8 space-y-6">
          {/* Summary bar */}
          <div className="flex items-center gap-4 pb-5 border-b border-charcoal/8">
            <div className="h-12 w-12 rounded-full bg-charcoal/8" />
            <div className="flex-1 space-y-2">
              <div className="h-5 w-24 rounded-md bg-charcoal/8" />
              <div className="h-3 w-40 rounded-md bg-charcoal/6" />
            </div>
          </div>

          {/* Review items */}
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex gap-4 py-4 border-b border-charcoal/6 last:border-0">
              <div className="h-10 w-10 rounded-full bg-charcoal/8 flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-3">
                  <div className="h-4 w-28 rounded-md bg-charcoal/8" />
                  <div className="h-3 w-20 rounded-md bg-charcoal/6" />
                </div>
                <div className="flex gap-0.5">
                  {[...Array(5)].map((_, j) => (
                    <div key={j} className="h-4 w-4 rounded bg-charcoal/6" />
                  ))}
                </div>
                <div className="space-y-1.5">
                  <div className="h-3.5 w-full rounded-md bg-charcoal/6" />
                  <div className="h-3.5 w-3/4 rounded-md bg-charcoal/6" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!user) {
    router.push('/login');
    return null;
  }

  if (error || !business) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-8 max-w-5xl mx-auto">
        <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-red-800 text-sm font-urbanist mb-4">
          {error || 'Business not found'}
        </div>
        <Link
          href={`/my-businesses/${businessId}`}
          className="inline-flex items-center gap-2 text-navbar-bg hover:text-navbar-bg/80 font-urbanist text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 max-w-5xl mx-auto font-urbanist">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2.5 mb-1">
          <h1 className="font-urbanist text-2xl font-bold text-charcoal tracking-tight">
            Reviews for {business.name}
          </h1>
        </div>
        <p className="font-urbanist text-sm text-charcoal/55">
          Respond to customer feedback and manage your reputation
        </p>
      </div>

      <Link
        href={`/my-businesses/${businessId}`}
        className="inline-flex items-center gap-2 mb-6 text-charcoal/60 hover:text-charcoal font-urbanist text-sm transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Dashboard
      </Link>

      <div className="rounded-2xl border border-charcoal/10 bg-white shadow-premium p-6 sm:p-8">
        <ReviewsList
          reviews={reviews}
          loading={reviewsLoading}
          error={error}
          showBusinessInfo={false}
          businessId={businessId}
          emptyMessage="No reviews yet. Reviews from customers will appear here."
          isOwnerView={true}
        />
      </div>
    </div>
  );
}



