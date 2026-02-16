"use client";

import Link from "next/link";
import Image from "next/image";
import { useMemo, useState, useEffect } from "react";
import { Review, Reviewer } from "../../types/community";
import ProfilePicture from "./ProfilePicture";
import ReviewerStats from "./ReviewerStats";
import ReviewContent from "./ReviewContent";
import VerifiedBadge from "../VerifiedBadge/VerifiedBadge";
import BadgePill, { BadgePillData } from "../Badges/BadgePill";

import {
  Star,
  User,
} from "lucide-react";


interface ReviewerCardProps {
  review?: Review;
  reviewer?: Reviewer;
  latestReview?: Review;
  variant?: "reviewer" | "review";
  index?: number;
}

export default function ReviewerCard({
  review,
  reviewer,
  latestReview,
  variant = "review",
  index = 0,
}: ReviewerCardProps) {
  const reviewerData = reviewer || review?.reviewer;
  const userIdForBadges = reviewerData?.id ?? (review as any)?.user?.id;
  const idForSnap = useMemo(
    () => `reviewer-${reviewerData?.id ?? userIdForBadges}`,
    [reviewerData?.id, userIdForBadges]
  );
  const revealStyle = useMemo(() => {
    const bucket = Math.abs(index) % 6;
    const x = bucket === 1 ? -6 : bucket === 2 ? 6 : bucket === 4 ? -3 : bucket === 5 ? 3 : 0;
    const y = 10 + (bucket % 3);
    const delay = Math.min(90, bucket * 18);
    return {
      ['--reveal-x' as any]: `${x}px`,
      ['--reveal-y' as any]: `${y}px`,
      ['--reveal-delay' as any]: `${delay}ms`,
    } as React.CSSProperties;
  }, [index]);
  const [imgError, setImgError] = useState(false);
  const [userBadges, setUserBadges] = useState<BadgePillData[]>([]);

  // Use badges from reviewer prop (batch-fetched by /api/reviewers/top) when available.
  // Falls back to per-card fetch only when prop badges are not provided.
  const MAX_VISIBLE_BADGES = 3;
  const propBadges = reviewerData?.badges;

  useEffect(() => {
    // If badges were provided via props, use those directly (no N+1)
    if (propBadges && propBadges.length > 0) {
      const priorityOrder = ['milestone', 'specialist', 'explorer', 'community'];
      const sorted = [...propBadges].sort((a, b) => {
        const aIdx = priorityOrder.indexOf(a.badge_group || '');
        const bIdx = priorityOrder.indexOf(b.badge_group || '');
        return aIdx - bIdx;
      });
      setUserBadges(sorted);
      return;
    }

    // Fallback: fetch per-card (for contexts that don't provide prop badges)
    if (!userIdForBadges) return;

    async function fetchUserBadges() {
      try {
        const response = await fetch(`/api/badges/user?user_id=${userIdForBadges}`, { cache: 'no-store' });
        if (response.ok) {
          const data = await response.json();
          const earnedBadges = (data.badges || [])
            .filter((b: any) => b.earned)
            .map((b: any) => ({
              id: b.id,
              name: b.name,
              icon_path: b.icon_path,
              badge_group: b.badge_group,
            }));

          const priorityOrder = ['milestone', 'specialist', 'explorer', 'community'];
          const sortedBadges = earnedBadges.sort((a: any, b: any) => {
            const aIndex = priorityOrder.indexOf(a.badge_group);
            const bIndex = priorityOrder.indexOf(b.badge_group);
            return aIndex - bIndex;
          });

          setUserBadges(sortedBadges);
        }
      } catch (err) {
        console.error('Error fetching user badges:', err);
      }
    }

    fetchUserBadges();
  }, [userIdForBadges, propBadges]);

  const visibleBadges = userBadges.slice(0, MAX_VISIBLE_BADGES);
  const overflowCount = Math.max(0, userBadges.length - MAX_VISIBLE_BADGES);


  if (variant === "reviewer" || reviewer) {
    return (
      <div
        id={idForSnap}
        className="snap-start snap-always w-full sm:w-[240px] flex-shrink-0"
        data-reveal
        style={revealStyle}
      >
        <Link
          href={`/reviewer/${reviewerData?.id || ''}`}
          className="block group/card"
        >
          <div
            className="relative bg-card-bg rounded-[12px] overflow-hidden cursor-pointer h-[260px] border border-sage/20 shadow-md hover:shadow-lg transition-shadow duration-300">

            {/* Content */}
            <div className="relative p-4 h-full flex flex-col">
              {/* Header with profile pic, name, location */}
              <div className="flex items-start gap-3 mb-3">
                {!imgError && reviewerData?.profilePicture && reviewerData.profilePicture.trim() !== '' ? (
                  <div className="relative flex-shrink-0">
                    {/* Profile picture container */}
                    <div className="relative">
                      <Image
                        src={reviewerData.profilePicture}
                        alt={reviewerData?.name || "User avatar"}
                        width={40}
                        height={40}
                        className="w-10 h-10 object-cover rounded-full ring-2 ring-sage/30"
                        priority={false}
                        onError={() => setImgError(true)}
                      />
                    </div>
                    {reviewerData?.badge === "verified" && (
                      <div className="absolute -right-1 -top-1 z-20">
                        <div className="bg-sage rounded-full p-1 ring-2 ring-white">
                          <VerifiedBadge size="sm" />
                        </div>
                      </div>
                    )}
                    {reviewerData?.badge === "top" && (
                      <div className="absolute inset-0 rounded-full bg-gradient-to-br from-coral/30 to-coral/20 blur-lg animate-pulse" />
                    )}
                  </div>
                ) : (
                  <div className="relative">
                    <div className="w-10 h-10 flex items-center justify-center bg-off-white rounded-full border border-sage/20">
                      <User className="text-navbar-bg" size={18} />
                    </div>
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-bold text-charcoal truncate" style={{
                    fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
                    fontWeight: 700,
                  }}>
                    {reviewerData?.name}
                  </h3>
                  {/* Badges replace location */}
                  {visibleBadges.length > 0 ? (
                    <div className="flex items-center gap-1 mt-1 flex-wrap">
                      {visibleBadges.map((badge) => (
                        <BadgePill key={badge.id} badge={badge} size="sm" />
                      ))}
                      {overflowCount > 0 && (
                        <span className="bg-sage/10 text-sage border border-sage/20 text-xs font-bold px-1.5 py-0.5 rounded-full">
                          +{overflowCount}
                        </span>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 mt-1">
                      <div className="w-1.5 h-1.5 bg-sage rounded-full opacity-60" />
                      <p className="text-sm text-charcoal/70 font-medium" style={{
                        fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
                      }}>
                        {reviewerData?.location}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Stats section */}
              <div className="mb-3">
                <div className="flex items-center justify-center">
                  <div className="bg-off-white rounded-[12px] px-4 py-2 border border-sage/20">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-charcoal" style={{
                        fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
                        fontWeight: 800,
                      }}>
                        <span>{reviewerData?.reviewCount}</span>
                      </div>
                      <div className="text-xs text-charcoal/70 font-semibold uppercase tracking-wider" style={{
                        fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
                      }}>Reviews</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Latest Review Preview */}
              {latestReview && (
                <div className="flex-1 min-h-0">
                  <div className="bg-off-white rounded-[12px] px-3 py-2.5 border border-sage/20">
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className="flex items-center gap-0.5">
                        <Star className="w-3 h-3 fill-coral text-coral" />
                        <Star className="w-3 h-3 fill-coral text-coral" />
                        <Star className="w-3 h-3 fill-coral text-coral" />
                        <Star className="w-3 h-3 fill-coral text-coral" />
                        <Star className="w-3 h-3 fill-coral text-coral" />
                      </div>
                      <span className="text-[10px] text-charcoal/60 font-semibold uppercase tracking-wide" style={{
                        fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
                      }}>Latest</span>
                    </div>
                    <p className="text-sm text-charcoal/80 leading-snug line-clamp-2 font-medium" style={{
                      fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
                      fontStyle: 'italic',
                    }}>
                      &ldquo;{latestReview.reviewText}&rdquo;
                    </p>
                  </div>
                </div>
              )}


            </div>
          </div>
        </Link>
      </div>
    );
  }

  // --- REVIEW CARD VARIANT ---
  return (
    <li className="w-[calc(50vw-12px)] sm:w-auto sm:min-w-[213px] flex-shrink-0">
      <Link
        href={`/reviewer/${review?.reviewer?.id || (review as any)?.user?.id || ''}`}
        className="block"
      >
        <div
          className="bg-card-bg rounded-[12px] group cursor-pointer h-[187px] flex flex-col relative overflow-hidden border border-sage/20 shadow-md"
        >
           <div className="flex items-start gap-1.5 p-2 pb-0">
            <div className="relative flex-shrink-0">
              <ProfilePicture
                src={review?.reviewer.profilePicture || ""}
                alt={review?.reviewer.name || ""}
                size="md"
                badge={review?.reviewer.badge}
              />
              {review?.reviewer.badge === "verified" && (
                <div className="absolute -right-1 -top-1 z-20">
                  <VerifiedBadge />
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-bold text-charcoal  truncate transition-colors duration-300" style={{
                fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
                fontWeight: 700,
                WebkitFontSmoothing: 'antialiased',
                MozOsxFontSmoothing: 'grayscale',
                letterSpacing: '-0.01em',
              }}>
                {review?.reviewer.name}
              </h3>
              <ReviewerStats
                reviewCount={review?.reviewer.reviewCount || 0}
                location={review?.reviewer.location || ""}
              />
            </div>
          </div>

          {/* Badges row - compact, under reviewer header */}
          {visibleBadges.length > 0 && (
            <div className="px-2 pt-1 pb-0.5 flex items-center gap-1 flex-wrap">
              {visibleBadges.map((badge) => (
                <BadgePill key={badge.id} badge={badge} size="sm" />
              ))}
              {overflowCount > 0 && (
                <span
                  className="inline-flex items-center px-1.5 py-[3px] rounded-full bg-charcoal/8 text-[10px] font-bold text-charcoal/45 border border-charcoal/10"
                  style={{ fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif" }}
                >
                  +{overflowCount}
                </span>
              )}
            </div>
          )}

          <ReviewContent
            businessName={review?.businessName || ""}
            businessType={review?.businessType || ""}
            reviewText={review?.reviewText || ""}
            date={review?.date || ""}
            likes={review?.likes || 0}
            images={review?.images}
          />
        </div>
      </Link>
    </li>
  );
}
