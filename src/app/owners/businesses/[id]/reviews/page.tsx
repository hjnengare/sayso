"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "../../../../contexts/AuthContext";
import { BusinessOwnershipService } from "../../../../lib/services/businessOwnershipService";
import { PageLoader, Loader } from "../../../../components/Loader";
import Header from "../../../../components/Header/Header";
import Footer from "../../../../components/Footer/Footer";
import { ArrowLeft, Star, User, Edit2, Trash2, Send } from "lucide-react";
import Link from "next/link";
import { getBrowserSupabase } from "../../../../lib/supabase/client";
import type { Business } from "../../../../lib/types/database";

interface Review {
  id: string;
  user_id: string;
  rating: number;
  title: string | null;
  content: string;
  created_at: string;
  profile?: {
    user_id: string;
    display_name: string;
    avatar_url: string | null;
  };
  review_replies?: Array<{
    id: string;
    content: string;
    created_at: string;
    updated_at: string;
  }>;
}

export default function OwnerReviewsPage() {
  const router = useRouter();
  const params = useParams();
  const businessId = params?.id as string;
  const { user, isLoading: authLoading } = useAuth();
  const [business, setBusiness] = useState<Business | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasAccess, setHasAccess] = useState(false);
  const [editingReply, setEditingReply] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState<string | null>(null);

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

        // Fetch reviews with replies
        const { data: reviewsData, error: reviewsError } = await supabase
          .from('reviews')
          .select(`
            id,
            user_id,
            rating,
            title,
            content,
            created_at,
            profile:profiles!reviews_user_id_fkey (
              user_id,
              display_name,
              avatar_url
            ),
            review_replies (
              id,
              content,
              created_at,
              updated_at
            )
          `)
          .eq('business_id', businessId)
          .order('created_at', { ascending: false });

        if (reviewsError) {
          throw reviewsError;
        }

        // Transform reviews to match our interface
        const transformedReviews = (reviewsData || []).map((review: any) => ({
          ...review,
          profile: Array.isArray(review.profile) ? review.profile[0] : review.profile,
          review_replies: Array.isArray(review.review_replies) ? review.review_replies : [],
        }));

        setReviews(transformedReviews);
      } catch (error) {
        console.error('Error fetching data:', error);
        setError('Failed to load reviews');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [user, authLoading, businessId]);

  const handleReply = async (reviewId: string) => {
    const content = replyContent[reviewId]?.trim();
    if (!content) return;

    setSubmitting(reviewId);
    try {
      const response = await fetch(`/api/reviews/${reviewId}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save reply');
      }

      const { reply } = await response.json();

      // Update local state
      setReviews(prev => prev.map(review => {
        if (review.id === reviewId) {
          return {
            ...review,
            review_replies: [reply],
          };
        }
        return review;
      }));

      setReplyContent(prev => ({ ...prev, [reviewId]: '' }));
      setEditingReply(null);
    } catch (error) {
      console.error('Error saving reply:', error);
      alert(error instanceof Error ? error.message : 'Failed to save reply');
    } finally {
      setSubmitting(null);
    }
  };

  const handleDeleteReply = async (reviewId: string) => {
    if (!confirm('Are you sure you want to delete this reply?')) return;

    try {
      const response = await fetch(`/api/reviews/${reviewId}/reply`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete reply');
      }

      // Update local state
      setReviews(prev => prev.map(review => {
        if (review.id === reviewId) {
          return {
            ...review,
            review_replies: [],
          };
        }
        return review;
      }));
    } catch (error) {
      console.error('Error deleting reply:', error);
      alert('Failed to delete reply');
    }
  };

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
                href={`/owners/businesses/${businessId}`}
                className="inline-flex items-center gap-2 mt-4 text-sage hover:text-sage/80"
                style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Dashboard
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
          <div className="max-w-4xl mx-auto">
            {/* Back Button */}
            <Link
              href={`/owners/businesses/${businessId}`}
              className="inline-flex items-center gap-2 text-charcoal/70 hover:text-charcoal mb-6"
              style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </Link>

            {/* Header */}
            <div className="mb-8">
              <h1 className="text-2xl sm:text-3xl font-bold text-charcoal mb-2" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>
                Reviews for {business.name}
              </h1>
              <p className="text-charcoal/70 text-sm sm:text-base" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>
                Respond to customer feedback and manage your reputation
              </p>
            </div>

            {/* Reviews List */}
            {reviews.length === 0 ? (
              <div className="bg-white border border-charcoal/10 rounded-lg shadow-sm p-8 sm:p-12 text-center">
                <p className="text-charcoal/70" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>
                  No reviews yet. Reviews from customers will appear here.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {reviews.map((review) => {
                  const reply = review.review_replies?.[0];
                  const isEditing = editingReply === review.id;

                  return (
                    <div key={review.id} className="bg-white border border-charcoal/10 rounded-lg shadow-sm p-5 sm:p-6">
                      {/* Review Header */}
                      <div className="flex items-start gap-4 mb-4">
                        <div className="w-10 h-10 bg-sage/10 rounded-full flex items-center justify-center flex-shrink-0">
                          {review.profile?.avatar_url ? (
                            <img
                              src={review.profile.avatar_url}
                              alt={review.profile.display_name || 'User'}
                              className="w-10 h-10 rounded-full object-cover"
                            />
                          ) : (
                            <User className="w-5 h-5 text-sage" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-charcoal" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>
                              {review.profile?.display_name || 'User'}
                            </h3>
                            <div className="flex items-center gap-1">
                              {[...Array(5)].map((_, i) => (
                                <Star
                                  key={i}
                                  className={`w-4 h-4 ${
                                    i < review.rating
                                      ? 'text-coral fill-coral'
                                      : 'text-charcoal/20'
                                  }`}
                                />
                              ))}
                            </div>
                          </div>
                          <p className="text-xs text-charcoal/60" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>
                            {new Date(review.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>

                      {/* Review Content */}
                      {review.title && (
                        <h4 className="font-semibold text-charcoal mb-2" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>
                          {review.title}
                        </h4>
                      )}
                      <p className="text-charcoal/80 mb-4 whitespace-pre-wrap" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>
                        {review.content}
                      </p>

                      {/* Owner Reply */}
                      {reply ? (
                        <div className="bg-sage/5 border-l-4 border-sage rounded p-4 mb-4">
                          <div className="flex items-start justify-between mb-2">
                            <p className="text-sm font-semibold text-charcoal" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>
                              Your Reply
                            </p>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => {
                                  setEditingReply(review.id);
                                  setReplyContent(prev => ({ ...prev, [review.id]: reply.content }));
                                }}
                                className="p-1 text-charcoal/60 hover:text-charcoal transition-colors"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteReply(review.id)}
                                className="p-1 text-charcoal/60 hover:text-red-600 transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                          {isEditing ? (
                            <div className="space-y-2">
                              <textarea
                                value={replyContent[review.id] || reply.content}
                                onChange={(e) => setReplyContent(prev => ({ ...prev, [review.id]: e.target.value }))}
                                className="w-full p-3 border border-charcoal/20 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-sage focus:border-transparent"
                                rows={3}
                                placeholder="Write your reply..."
                                style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
                              />
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => handleReply(review.id)}
                                  disabled={submitting === review.id || !replyContent[review.id]?.trim()}
                                  className="px-4 py-2 bg-sage text-white rounded-full text-sm font-semibold hover:bg-sage/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                  style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
                                >
                                  <Send className="w-4 h-4" />
                                  {submitting === review.id ? 'Saving...' : 'Save'}
                                </button>
                                <button
                                  onClick={() => {
                                    setEditingReply(null);
                                    setReplyContent(prev => ({ ...prev, [review.id]: reply.content }));
                                  }}
                                  className="px-4 py-2 border border-charcoal/20 text-charcoal rounded-full text-sm font-semibold hover:bg-charcoal/5 transition-colors"
                                  style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <p className="text-charcoal/80 whitespace-pre-wrap" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>
                              {reply.content}
                            </p>
                          )}
                        </div>
                      ) : (
                        <div>
                          {isEditing ? (
                            <div className="space-y-2">
                              <textarea
                                value={replyContent[review.id] || ''}
                                onChange={(e) => setReplyContent(prev => ({ ...prev, [review.id]: e.target.value }))}
                                className="w-full p-3 border border-charcoal/20 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-sage focus:border-transparent"
                                rows={3}
                                placeholder="Write your reply..."
                                style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
                              />
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => handleReply(review.id)}
                                  disabled={submitting === review.id || !replyContent[review.id]?.trim()}
                                  className="px-4 py-2 bg-sage text-white rounded-full text-sm font-semibold hover:bg-sage/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                  style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
                                >
                                  <Send className="w-4 h-4" />
                                  {submitting === review.id ? 'Saving...' : 'Reply'}
                                </button>
                                <button
                                  onClick={() => {
                                    setEditingReply(null);
                                    setReplyContent(prev => ({ ...prev, [review.id]: '' }));
                                  }}
                                  className="px-4 py-2 border border-charcoal/20 text-charcoal rounded-full text-sm font-semibold hover:bg-charcoal/5 transition-colors"
                                  style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <button
                              onClick={() => setEditingReply(review.id)}
                              className="px-4 py-2 bg-sage text-white rounded-full text-sm font-semibold hover:bg-sage/90 transition-colors"
                              style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
                            >
                              Write a Reply
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

