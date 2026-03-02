'use client';

import React, { useState, useEffect, memo } from 'react';
import { useReviewHelpful } from '../../hooks/useReviewHelpful';
import { useReviewReplies } from '../../hooks/useReviewReplies';
import { useUserBadgesById } from '../../hooks/useUserBadges';
import { m } from 'framer-motion';
import Image from 'next/image';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
dayjs.extend(relativeTime);
import { useRouter } from 'next/navigation';
import { Trash2, Heart, MessageCircle, Edit, Flag, Loader2 } from "@/app/lib/icons";
import type { ReviewWithUser } from '../../lib/types/database';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { useReviewSubmission } from '../../hooks/useReviews';
import { useIsDesktop } from '../../hooks/useIsDesktop';
import { getDisplayUsername } from '../../utils/generateUsername';
import { ConfirmationDialog } from '@/app/components/molecules/ConfirmationDialog/ConfirmationDialog';
import BadgePill, { BadgePillData } from '../Badges/BadgePill';
import VerifiedBadge from '../VerifiedBadge/VerifiedBadge';
import { isOptimisticId, isValidUUID } from '../../lib/utils/validation';
import { ReviewFlagModal, type FlagReason } from './ReviewFlagModal';
import { ReviewGallery } from './ReviewGallery';
import { ReviewReplies } from './ReviewReplies';

interface ReviewCardProps {
  review: ReviewWithUser;
  onUpdate?: () => void;
  showBusinessInfo?: boolean;
  isOwnerView?: boolean; // If true, show owner-specific actions like "Message Customer"
  realtimeHelpfulCount?: number; // Real-time helpful count from subscription
}

function ReviewCard({
  review,
  onUpdate,
  showBusinessInfo = false,
  isOwnerView = false,
  realtimeHelpfulCount,
}: ReviewCardProps) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();
  const { likeReview, deleteReview } = useReviewSubmission();
  const isDesktop = useIsDesktop();
  const isTransientReviewId = isOptimisticId(review.id) || !isValidUUID(review.id);

  // Helper function to check if current user owns this review with fallback logic
  const isReviewOwner = (): boolean => {
    if (!user) return false;

    // Primary check: user ID matches review user_id
    if (user.id === review.user_id) return true;

    // Fallback 1: user ID matches review.user.id
    if (user.id === review.user?.id) return true;

    // Fallback 2: email match (if both exist)
    if (user.email && review.user?.email && user.email === review.user.email) return true;

    // Fallback 3: email + display_name combination (if both exist)
    const userIdentifier = user.email && user.profile?.display_name
      ? `${user.email}:${user.profile.display_name}`
      : null;
    const reviewIdentifier = review.user?.email && review.user?.display_name
      ? `${review.user.email}:${review.user.display_name}`
      : null;
    if (userIdentifier && reviewIdentifier && userIdentifier === reviewIdentifier) return true;

    return false;
  };

  const [showReplyForm, setShowReplyForm] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isFlagged, setIsFlagged] = useState(false);
  const [flagging, setFlagging] = useState(false);
  const [checkingFlagStatus, setCheckingFlagStatus] = useState(false);
  const [showFlagModal, setShowFlagModal] = useState(false);

  // SWR-backed badges for the review author
  const authorId = review.user_id || review.user?.id;
  const { badges: fetchedAuthorBadges } = useUserBadgesById(authorId ?? null);
  const userBadges: BadgePillData[] = fetchedAuthorBadges.slice(0, 3);

  // SWR-backed helpful status and count (with optimistic toggle)
  const {
    count: helpfulCount,
    isHelpful: isLiked,
    loading: loadingHelpful,
    toggle: toggleHelpful,
  } = useReviewHelpful(review.id, typeof review.helpful_count === 'number' ? review.helpful_count : 0);

  // SWR-backed replies (only need count for the Reply button label)
  const { replies } = useReviewReplies(review.id);

  const handleLike = async () => {
    if (!user) return;
    await toggleHelpful();
  };

  const handleEdit = () => {
    if (!review.id) return;
    const pathParts = window.location.pathname.split('/');
    const businessSlugOrId = pathParts[pathParts.indexOf('business') + 1] || review.business_id;
    router.push(`/business/${businessSlugOrId}/review?edit=${review.id}`);
  };

  const handleDelete = () => {
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    setShowDeleteDialog(false);
    const success = await deleteReview(review.id);
    if (success && onUpdate) {
      onUpdate();
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Recently';

    try {
      let date: Date;

      if (typeof dateString === 'string' && (dateString.includes('T') || dateString.includes('Z'))) {
        date = new Date(dateString);
      } else {
        date = new Date(dateString);
      }

      if (isNaN(date.getTime())) {
        console.warn('Invalid date string:', dateString);
        return 'Recently';
      }

      return dayjs(date).fromNow();
    } catch (error) {
      console.warn('Error formatting date:', dateString, error);
      return 'Recently';
    }
  };

  const isAnonymousReview = !review.user_id;
  const isOwner = isReviewOwner();
  const reportButtonDisabled =
    isOwner || flagging || isFlagged || isTransientReviewId || checkingFlagStatus;

  useEffect(() => {
    let cancelled = false;

    if (!user || isOwner || isTransientReviewId) {
      setIsFlagged(false);
      setCheckingFlagStatus(false);
      return;
    }

    const checkFlagStatus = async () => {
      setCheckingFlagStatus(true);
      try {
        const res = await fetch(`/api/reviews/${review.id}/flag`);
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) {
          setIsFlagged(Boolean(data?.flagged));
        }
      } catch (error) {
        console.error('Error checking review flag status:', error);
      } finally {
        if (!cancelled) {
          setCheckingFlagStatus(false);
        }
      }
    };

    void checkFlagStatus();

    return () => {
      cancelled = true;
    };
  }, [user?.id, review.id, isOwner, isTransientReviewId]);

  const handleOpenFlagModal = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();

    if (reportButtonDisabled) return;

    if (!user) {
      showToast('Please log in to report reviews.', 'error');
      return;
    }

    setShowFlagModal(true);
  };

  const submitFlag = async (reason: FlagReason, details: string) => {
    if (!user || reportButtonDisabled) return;

    setFlagging(true);
    try {
      const res = await fetch(`/api/reviews/${review.id}/flag`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason, details: details.trim() || undefined }),
      });

      if (res.ok) {
        setIsFlagged(true);
        setShowFlagModal(false);
        showToast('Review reported. Thank you for your feedback.', 'success');
        return;
      }

      const err = await res.json().catch(() => ({}));
      const errorMessage =
        typeof err?.error === 'string' ? err.error : 'Failed to report review';

      if (
        res.status === 400 &&
        errorMessage.toLowerCase().includes('already flagged')
      ) {
        setIsFlagged(true);
        setShowFlagModal(false);
      }

      showToast(errorMessage, 'error');
    } catch (error) {
      console.error('Error reporting review:', error);
      showToast('Failed to report review', 'error');
    } finally {
      setFlagging(false);
    }
  };

  return (
    <m.div
      whileHover={isDesktop ? undefined : { scale: 1.01, x: 5 }}
      className={`relative bg-gradient-to-br from-off-white via-off-white to-off-white/95 backdrop-blur-sm rounded-lg p-6 border-none ${
        isDesktop ? '' : 'transition-all duration-300 group hover:border-white/80 hover:-translate-y-1'
      }`}
    >
      <div className="flex items-start space-x-4">
        {/* Avatar */}
        <m.div
          whileHover={isDesktop ? undefined : { scale: 1.1, rotate: 5 }}
          transition={isDesktop ? undefined : { duration: 0.3 }}
          className="flex-shrink-0"
        >
          {review.user.avatar_url ? (
            <div className="relative">
              <div className="w-12 h-12 rounded-full p-0.5 bg-off-white ring-2 ring-white/40">
                <Image
                  src={review.user.avatar_url}
                  alt={review.user?.name || getDisplayUsername(
                    review.user?.username,
                    review.user?.display_name,
                    review.user?.email,
                    review.user_id
                  )}
                  width={48}
                  height={48}
                  className={`w-full h-full rounded-full object-cover ${
                    isDesktop ? '' : 'group-hover:ring-2 group-hover:ring-sage/40 transition-all duration-300'
                  }`}
                />
              </div>
            </div>
          ) : (
            <div className="w-12 h-12 bg-gradient-to-br from-sage/20 to-sage/10 rounded-full flex items-center justify-center ring-2 ring-white/40 transition-shadow duration-300">
              <span className="font-urbanist text-lg font-700 text-sage">
                {(review.user?.name || getDisplayUsername(
                  review.user?.username,
                  review.user?.display_name,
                  review.user?.email,
                  review.user_id
                ))?.[0]?.toUpperCase() || 'U'}
              </span>
            </div>
          )}
        </m.div>

        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-3 space-y-2 md:space-y-0">
            <div className="flex min-w-0 items-start sm:items-center gap-2">
              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                <div className="flex min-w-0 flex-nowrap items-center gap-2">
                  <span
                    className={`min-w-0 truncate font-urbanist text-lg font-600 leading-tight text-charcoal-700 ${
                      isDesktop ? '' : 'transition-colors duration-300 group-hover:text-sage'
                    }`}
                    title={review.user?.name || getDisplayUsername(
                      review.user?.username,
                      review.user?.display_name,
                      review.user?.email,
                      review.user_id
                    )}
                  >
                    {review.user?.name || getDisplayUsername(
                      review.user?.username,
                      review.user?.display_name,
                      review.user?.email,
                      review.user_id
                    )}
                  </span>
                  {isAnonymousReview ? (
                    <span className="inline-flex flex-shrink-0 items-center rounded-full bg-charcoal/12 px-2 py-0.5 text-xs font-semibold text-charcoal/75">
                      Anonymous
                    </span>
                  ) : (
                    <span className="inline-flex flex-shrink-0 items-center">
                      <VerifiedBadge size="sm" />
                    </span>
                  )}
                </div>
                {/* Achievement badges - review author's earned badges */}
                {userBadges.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5">
                    {userBadges.slice(0, 3).map((badge) => (
                      <span
                        key={badge.id}
                        className="inline-flex origin-left scale-[1.03] rounded-full shadow-premium-sm sm:scale-100"
                      >
                        <BadgePill badge={badge} size="sm" />
                      </span>
                    ))}
                    {userBadges.length > 3 && (
                      <span className="inline-flex items-center rounded-full border border-charcoal/15 bg-charcoal/10 px-2 py-0.5 text-[10px] font-bold text-charcoal/60 shadow-premium-sm">
                        +{userBadges.length - 3}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-start justify-between sm:justify-end gap-2 sm:gap-3">
              <div className="flex flex-col items-start sm:items-end gap-1">
                <div className="flex items-center space-x-1">
                  <svg width="0" height="0" className="absolute">
                    <defs>
                      <linearGradient id="reviewCardGoldStar" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#F5D547" />
                        <stop offset="100%" stopColor="#E6A547" />
                      </linearGradient>
                    </defs>
                  </svg>
                  {[...Array(5)].map((_, i) => (
                    <m.div key={i}>
                      <svg
                        className="w-4 h-4 sm:w-5 sm:h-5"
                        viewBox="0 0 24 24"
                        aria-hidden
                      >
                        <path
                          d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                          fill={i < review.rating ? "url(#reviewCardGoldStar)" : "none"}
                          stroke={i < review.rating ? "url(#reviewCardGoldStar)" : "#9ca3af"}
                          strokeWidth={i < review.rating ? 0 : 2}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </m.div>
                  ))}
                </div>
                <span className="font-urbanist text-xs sm:text-sm font-600 text-charcoal/60">
                  {formatDate(review.created_at)}
                </span>
              </div>

              {/* Direct action icons - Mobile-first design */}
              <div className="flex items-center gap-1 sm:gap-1.5">
                {isOwner && (
                  <>
                    <m.button
                      whileHover={isDesktop ? undefined : { scale: 1.1 }}
                      whileTap={isDesktop ? undefined : { scale: 0.9 }}
                      onClick={handleEdit}
                      className={`min-w-[44px] min-h-[44px] sm:min-w-[28px] sm:min-h-[28px] w-11 h-11 sm:w-7 sm:h-7 bg-navbar-bg rounded-full flex items-center justify-center active:scale-95 touch-manipulation ${
                        isDesktop ? '' : 'hover:bg-navbar-bg/90 transition-all duration-300'
                      }`}
                      aria-label="Edit review"
                      title="Edit review"
                    >
                      <Edit className="w-5 h-5 sm:w-[18px] sm:h-[18px] text-white" />
                    </m.button>
                    <m.button
                      whileHover={isDesktop ? undefined : { scale: 1.1 }}
                      whileTap={isDesktop ? undefined : { scale: 0.9 }}
                      onClick={handleDelete}
                      className={`min-w-[44px] min-h-[44px] sm:min-w-[28px] sm:min-h-[28px] w-11 h-11 sm:w-7 sm:h-7 bg-navbar-bg rounded-full flex items-center justify-center active:scale-95 touch-manipulation ${
                        isDesktop ? '' : 'hover:bg-navbar-bg/90 transition-all duration-300'
                      }`}
                      aria-label="Delete review"
                      title="Delete review"
                    >
                      <Trash2 className="w-5 h-5 sm:w-[18px] sm:h-[18px] text-white" />
                    </m.button>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Review Title */}
          {review.title && (
            <h4
              className={`font-urbanist text-xl font-600 text-charcoal mb-2 ${
                isDesktop ? '' : 'group-hover:text-sage transition-colors duration-300'
              }`}
            >
              {review.title}
            </h4>
          )}

          {/* Business Info (if showing) */}
          {showBusinessInfo && 'business' in review && (
            <div className="mb-3 p-2 bg-card-bg/10 rounded-lg">
              <span className="font-urbanist text-sm font-500 text-sage">
                Review for: {(review as ReviewWithUser & { business: { name: string } }).business?.name}
              </span>
            </div>
          )}

          {/* Review Text */}
          <p className="font-urbanist text-base font-600 text-charcoal/90 leading-relaxed mb-4">
            {review.content}
          </p>

          {/* Tags */}
          {review.tags && review.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {review.tags.map((tag, index) => (
                <m.span
                  key={tag}
                  whileHover={isDesktop ? undefined : { scale: 1.05 }}
                  className={`inline-flex items-center px-3 py-1 bg-card-bg/10 text-sage text-sm font-500 rounded-full border border-sage/20 ${
                    isDesktop ? '' : 'hover:bg-card-bg/20 transition-colors duration-300'
                  }`}
                >
                  {tag}
                </m.span>
              ))}
            </div>
          )}

          {/* Images */}
          <ReviewGallery images={review.images || []} isDesktop={isDesktop} />

          {/* Actions */}
          <div
            className={`flex items-center justify-between pt-3 border-t border-sage/10 ${
              user && !isOwner ? 'pr-12 sm:pr-14' : ''
            }`}
          >
            <div className="flex items-center gap-3">
              {!isOwnerView && (
                <m.button
                  whileHover={isDesktop ? undefined : { scale: 1.05 }}
                  whileTap={isDesktop ? undefined : { scale: 0.95 }}
                  onClick={handleLike}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-full ${
                    isDesktop ? '' : 'transition-all duration-300'
                  } ${
                    isLiked
                      ? 'bg-card-bg/10 text-sage'
                      : isDesktop
                        ? 'text-charcoal/60'
                        : 'text-charcoal/60 hover:bg-card-bg/10 hover:text-sage'
                  } ${loadingHelpful ? 'opacity-60 cursor-not-allowed' : ''}`}
                  disabled={!user || loadingHelpful}
                >
                  <Heart size={18} fill={isLiked ? "currentColor" : "none"} />
                  <span className="font-urbanist text-sm font-500">
                    Helpful ({helpfulCount})
                  </span>
                </m.button>
              )}

              {/* Reply button - available to all authenticated users */}
              {user && (
                <m.button
                  whileHover={isDesktop ? undefined : { scale: 1.05 }}
                  whileTap={isDesktop ? undefined : { scale: 0.95 }}
                  onClick={() => setShowReplyForm(!showReplyForm)}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-full font-semibold ${
                    isDesktop ? '' : 'transition-all duration-300'
                  } ${
                    isOwnerView
                      ? isDesktop
                        ? 'bg-card-bg text-white px-4'
                        : 'bg-card-bg text-white hover:bg-card-bg/90 px-4'
                      : isDesktop
                        ? 'text-charcoal/60'
                        : 'text-charcoal/60 hover:bg-card-bg/10 hover:text-sage'
                  }`}
                >
                  <MessageCircle size={isOwnerView ? 16 : 18} />
                  <span className="font-urbanist text-sm">
                    Reply{replies.length > 0 ? ` (${replies.length})` : ''}
                  </span>
                </m.button>
              )}

              {/* Owner-only: Message Customer */}
              {isOwnerView && user && review.user_id && (
                <m.button
                  whileHover={isDesktop ? undefined : { scale: 1.05 }}
                  whileTap={isDesktop ? undefined : { scale: 0.95 }}
                  onClick={() => router.push(`/my-businesses/messages?user_id=${review.user_id}&business_id=${review.business_id}`)}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-full bg-coral text-white font-semibold ${
                    isDesktop ? '' : 'transition-all duration-300 hover:bg-coral/90'
                  }`}
                >
                  <MessageCircle size={16} />
                  <span className="font-urbanist text-sm">
                    Message Customer
                  </span>
                </m.button>
              )}
            </div>

            {!user && !isOwnerView && (
              <span className="font-urbanist text-sm sm:text-xs text-charcoal/60">
                Login to interact
              </span>
            )}
          </div>

          {/* Flag button */}
          {user && !isOwner && (
            <button
              type="button"
              onClick={handleOpenFlagModal}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.stopPropagation();
                }
              }}
              disabled={reportButtonDisabled}
              aria-label="Report review"
              title={isFlagged ? 'Review already reported' : 'Report review'}
              className={`absolute bottom-4 right-4 sm:bottom-5 sm:right-5 z-10 inline-flex h-10 w-10 sm:h-9 sm:w-9 items-center justify-center rounded-full touch-manipulation ${
                isDesktop ? '' : 'transition-all duration-200'
              } focus:outline-none focus-visible:ring-2 focus-visible:ring-red-300/70 focus-visible:ring-offset-2 focus-visible:ring-offset-off-white ${
                isFlagged
                  ? 'text-red-500 bg-red-50/70 cursor-not-allowed'
                  : isDesktop
                    ? 'text-charcoal/50'
                    : 'text-charcoal/50 hover:text-red-500 hover:bg-red-50/70'
              } ${reportButtonDisabled && !isFlagged ? 'opacity-60 cursor-not-allowed' : ''}`}
            >
              {flagging ? (
                <Loader2 className="w-[18px] h-[18px] sm:w-4 sm:h-4 animate-spin" />
              ) : (
                <Flag className="w-[18px] h-[18px] sm:w-4 sm:h-4" />
              )}
            </button>
          )}

          {/* Reply Form + Replies List */}
          <ReviewReplies
            reviewId={review.id}
            user={user}
            isOwnerView={isOwnerView}
            isDesktop={isDesktop}
            formatDate={formatDate}
            showReplyForm={showReplyForm}
            onCloseReplyForm={() => setShowReplyForm(false)}
          />
        </div>
      </div>

      {showFlagModal && (
        <ReviewFlagModal
          onClose={() => setShowFlagModal(false)}
          onSubmit={submitFlag}
          submitting={flagging}
        />
      )}

      {/* Delete Review Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={confirmDelete}
        title="Delete Review"
        message="Are you sure you want to delete this review? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />
    </m.div>
  );
}

// Memoize to prevent re-renders when parent updates
export default memo(ReviewCard);
