"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "../../../contexts/AuthContext";
import { BusinessOwnershipService } from "../../../lib/services/businessOwnershipService";
import { PageLoader, Loader } from "../../../components/Loader";
import Header from "../../../components/Header/Header";
import Footer from "../../../components/Footer/Footer";
import { Store, MapPin, Star, MessageSquare, Edit, BarChart3, ArrowLeft, Eye, TrendingUp } from "lucide-react";
import Link from "next/link";
import { getBrowserSupabase } from "../../../lib/supabase/client";
import type { Business } from "../../../lib/types/database";

interface BusinessStats {
  average_rating: number | null;
  total_reviews: number;
}

export default function OwnerBusinessDashboard() {
  const router = useRouter();
  const params = useParams();
  const businessId = params?.id as string;
  const { user, isLoading: authLoading } = useAuth();
  const [business, setBusiness] = useState<Business | null>(null);
  const [stats, setStats] = useState<BusinessStats | null>(null);
  const [analytics, setAnalytics] = useState<{
    profileViews: number;
    newReviews: number;
    newConversations: number;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasAccess, setHasAccess] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (authLoading || !user || !businessId) return;

      setIsLoading(true);
      try {
        // Check ownership
        const ownedBusinesses = await BusinessOwnershipService.getBusinessesForOwner(user.id);
        const ownsThisBusiness = ownedBusinesses.some(b => b.id === businessId);
        
        if (!ownsThisBusiness) {
          setError('You do not have access to this business');
          setIsLoading(false);
          return;
        }

        setHasAccess(true);

        // Fetch business details
        const supabase = getBrowserSupabase();
        const { data: businessData, error: businessError } = await supabase
          .from('businesses')
          .select('*')
          .eq('id', businessId)
          .single();

        if (businessError || !businessData) {
          throw new Error('Business not found');
        }

        setBusiness(businessData as Business);

        // Fetch stats
        const { data: statsData, error: statsError } = await supabase
          .from('business_stats')
          .select('average_rating, total_reviews')
          .eq('business_id', businessId)
          .single();

        if (!statsError && statsData) {
          setStats({
            average_rating: statsData.average_rating,
            total_reviews: statsData.total_reviews || 0,
          });
        } else {
          // Default stats if not found
          setStats({
            average_rating: null,
            total_reviews: 0,
          });
        }

        // Fetch analytics (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        // Profile views (placeholder - would need a views table)
        const profileViews = 0; // TODO: Implement when views tracking is added

        // New reviews in last 30 days
        const { count: newReviewsCount } = await supabase
          .from('reviews')
          .select('*', { count: 'exact', head: true })
          .eq('business_id', businessId)
          .gte('created_at', thirtyDaysAgo.toISOString());

        // New conversations in last 30 days
        const { count: newConversationsCount } = await supabase
          .from('conversations')
          .select('*', { count: 'exact', head: true })
          .eq('business_id', businessId)
          .gte('created_at', thirtyDaysAgo.toISOString());

        setAnalytics({
          profileViews,
          newReviews: newReviewsCount || 0,
          newConversations: newConversationsCount || 0,
        });
      } catch (error) {
        console.error('Error fetching business data:', error);
        setError('Failed to load business data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [user, authLoading, businessId]);

  if (authLoading || isLoading) {
    return <PageLoader size="lg" variant="wavy" color="sage" />;
  }

  if (!user) {
    router.push('/business/login');
    return null;
  }

  if (error || !business) {
    return (
      <div className="min-h-dvh bg-off-white">
        <Header />
        <main className="pt-20 sm:pt-24 pb-28">
          <div className="mx-auto w-full max-w-[2000px] px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto text-center py-12">
              <p className="text-charcoal/70">{error || 'Business not found'}</p>
              <Link
                href="/owners"
                className="inline-flex items-center gap-2 mt-4 text-sage hover:text-sage/80"
                style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Your Businesses
              </Link>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-off-white">
      <Header />
      
      <main className="pt-20 sm:pt-24 pb-28">
        <div className="mx-auto w-full max-w-[2000px] px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto">
            {/* Back Button */}
            <Link
              href="/owners"
              className="inline-flex items-center gap-2 text-charcoal/70 hover:text-charcoal mb-6"
              style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Your Businesses
            </Link>

            {/* Header */}
            <div className="mb-8 sm:mb-12">
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-charcoal mb-2" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>
                {business.name}
              </h1>
              <div className="flex items-center gap-2 text-charcoal/70 text-sm sm:text-base">
                <MapPin className="w-4 h-4" />
                <span>{business.location}</span>
              </div>
            </div>

            {/* Stats Card */}
            <div className="bg-white border border-charcoal/10 rounded-lg shadow-sm p-6 mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-charcoal/70 mb-1" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>
                    Average Rating
                  </p>
                  <div className="flex items-center gap-2">
                    {stats?.average_rating ? (
                      <>
                        <Star className="w-5 h-5 text-coral fill-coral" />
                        <span className="text-2xl font-bold text-charcoal">
                          {stats.average_rating.toFixed(1)}
                        </span>
                      </>
                    ) : (
                      <span className="text-2xl font-bold text-charcoal/40">No ratings yet</span>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-charcoal/70 mb-1" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>
                    Total Reviews
                  </p>
                  <span className="text-2xl font-bold text-charcoal">
                    {stats?.total_reviews || 0}
                  </span>
                </div>
              </div>
            </div>

            {/* Analytics Card */}
            {analytics && (
              <div className="bg-white border border-charcoal/10 rounded-lg shadow-sm p-6 mb-6">
                <div className="flex items-center gap-2 mb-4">
                  <BarChart3 className="w-5 h-5 text-sage" />
                  <h2 className="text-lg font-semibold text-charcoal" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>
                    Last 30 Days
                  </h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-sage/10 rounded-full flex items-center justify-center">
                      <Eye className="w-5 h-5 text-sage" />
                    </div>
                    <div>
                      <p className="text-xs text-charcoal/70" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>
                        Profile Views
                      </p>
                      <p className="text-xl font-bold text-charcoal">
                        {analytics.profileViews}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-coral/10 rounded-full flex items-center justify-center">
                      <Star className="w-5 h-5 text-coral" />
                    </div>
                    <div>
                      <p className="text-xs text-charcoal/70" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>
                        New Reviews
                      </p>
                      <p className="text-xl font-bold text-charcoal">
                        {analytics.newReviews}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-charcoal/5 rounded-full flex items-center justify-center">
                      <MessageSquare className="w-5 h-5 text-charcoal" />
                    </div>
                    <div>
                      <p className="text-xs text-charcoal/70" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>
                        New Conversations
                      </p>
                      <p className="text-xl font-bold text-charcoal">
                        {analytics.newConversations}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-8">
              <Link
                href={`/owners/businesses/${businessId}/reviews`}
                className="bg-white border border-charcoal/10 rounded-lg shadow-sm hover:border-sage/30 hover:shadow-md transition-all duration-300 p-6"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 bg-sage/10 rounded-full flex items-center justify-center">
                    <MessageSquare className="w-6 h-6 text-sage" />
                  </div>
                  <h3 className="text-lg font-semibold text-charcoal" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>
                    View & Reply to Reviews
                  </h3>
                </div>
                <p className="text-sm text-charcoal/70" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>
                  Respond to customer feedback and manage your reputation
                </p>
              </Link>

              <Link
                href={`/dm?businessId=${businessId}`}
                className="bg-white border border-charcoal/10 rounded-lg shadow-sm hover:border-sage/30 hover:shadow-md transition-all duration-300 p-6"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 bg-coral/10 rounded-full flex items-center justify-center">
                    <MessageSquare className="w-6 h-6 text-coral" />
                  </div>
                  <h3 className="text-lg font-semibold text-charcoal" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>
                    Open Messages
                  </h3>
                </div>
                <p className="text-sm text-charcoal/70" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>
                  Connect with customers and respond to inquiries
                </p>
              </Link>

              <Link
                href={`/business/${businessId}/edit`}
                className="bg-white border border-charcoal/10 rounded-lg shadow-sm hover:border-sage/30 hover:shadow-md transition-all duration-300 p-6"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 bg-charcoal/5 rounded-full flex items-center justify-center">
                    <Edit className="w-6 h-6 text-charcoal" />
                  </div>
                  <h3 className="text-lg font-semibold text-charcoal" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>
                    Edit Business Details
                  </h3>
                </div>
                <p className="text-sm text-charcoal/70" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>
                  Update your business information and photos
                </p>
              </Link>
            </div>

            {/* Business Info Card */}
            <div className="bg-white border border-charcoal/10 rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold text-charcoal mb-4" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>
                Business Information
              </h2>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-charcoal/70 mb-1" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>
                    Category
                  </p>
                  <p className="text-charcoal" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>
                    {business.category}
                  </p>
                </div>
                {business.description && (
                  <div>
                    <p className="text-sm text-charcoal/70 mb-1" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>
                      Description
                    </p>
                    <p className="text-charcoal" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>
                      {business.description}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

