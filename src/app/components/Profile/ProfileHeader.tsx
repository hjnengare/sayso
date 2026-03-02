"use client";

import React from "react";
import Image from "next/image";
import { m } from "framer-motion";
import {
  Award,
  Calendar,
  MapPin,
  MessageSquare,
  ThumbsUp,
  User,
  Check,
  Briefcase,
} from "@/app/lib/icons";
import { LiveIndicator } from "@/app/components/Realtime/RealtimeIndicators";
import { ProfileBadgeRibbon } from "@/app/components/Badges/ProfileBadgeRibbon";
import type { AuthUser } from "@/app/lib/types/database";
import type { EnhancedProfile } from "@/app/lib/types/user";

interface UserProfile {
  user_id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  locale: string;
  onboarding_step: string;
  is_top_reviewer: boolean;
  reviews_count: number;
  badges_count: number;
  interests_count: number;
  last_interests_updated: string | null;
  created_at: string;
  updated_at: string;
  bio?: string;
  location?: string;
  website_url?: string;
  social_links?: Record<string, string>;
  privacy_settings?: {
    showActivity?: boolean;
    showStats?: boolean;
    showSavedBusinesses?: boolean;
  };
  last_active_at?: string;
}

interface ProfileHeaderProps {
  profile: UserProfile;
  user: AuthUser | null;
  enhancedProfile: EnhancedProfile | null;
  displayLabel: string;
  profileLocation: string;
  memberSinceLabel: string;
  reviewsCount: number;
  avatarKey: number;
  imgError: boolean;
  isRealtimeConnected: boolean;
  onEditClick: () => void;
  onImgError: () => void;
}

export function ProfileHeader({
  profile,
  user,
  enhancedProfile,
  displayLabel,
  profileLocation,
  memberSinceLabel,
  reviewsCount,
  avatarKey,
  imgError,
  isRealtimeConnected,
  onEditClick,
  onImgError,
}: ProfileHeaderProps) {
  return (
    <article
      className="w-full sm:mx-0 profile-load-item profile-load-delay-1"
      aria-labelledby="profile-heading"
    >
      <div className="bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 backdrop-blur-xl border-none rounded-[12px] shadow-md relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-sage/10 to-transparent rounded-full blur-lg pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-coral/10 to-transparent rounded-full blur-lg pointer-events-none"></div>

        <div className="relative z-10 p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            <m.div layoutId="profile-avatar" className="relative flex-shrink-0">
              {!imgError && profile.avatar_url && profile.avatar_url.trim() !== "" ? (
                <div className="relative">
                  <Image
                    key={`${profile.avatar_url || "avatar"}-${avatarKey}`}
                    src={profile.avatar_url}
                    alt={displayLabel}
                    width={120}
                    height={120}
                    className="w-24 h-24 sm:w-32 sm:h-32 object-cover rounded-full shadow-xl"
                    priority
                    onError={onImgError}
                  />
                  {profile.is_top_reviewer && (
                    <div className="absolute -bottom-1 -right-1 z-20">
                      <div className="w-8 h-8 bg-card-bg rounded-full flex items-center justify-center ring-4 ring-white">
                        <Check className="text-white" size={14} strokeWidth={3} />
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="w-24 h-24 sm:w-32 sm:h-32 flex items-center justify-center bg-off-white/80 rounded-full shadow-xl">
                  <User className="text-charcoal/80" size={44} strokeWidth={2.5} />
                </div>
              )}
            </m.div>

            <div className="flex-1 min-w-0 w-full">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <h2
                  id="profile-heading"
                  className="text-h1 sm:text-hero font-semibold text-charcoal"
                  style={{ fontFamily: 'Urbanist, system-ui, sans-serif' }}
                >
                  {displayLabel}
                </h2>
                {profile.is_top_reviewer && (
                  <div className="px-2 py-1 rounded-full text-caption font-semibold flex items-center gap-1 bg-card-bg/20 text-sage">
                    <Award size={12} />
                    <span className="capitalize">Top Reviewer</span>
                  </div>
                )}
                {isRealtimeConnected && <LiveIndicator isLive={isRealtimeConnected} />}
              </div>
              {/* Bio */}
              {enhancedProfile?.bio && (
                <p className="text-body-sm text-charcoal/80 mb-4 leading-relaxed">
                  {enhancedProfile.bio}
                </p>
              )}

              <div className="flex items-center gap-3 mb-4 text-body-sm text-charcoal/70 flex-wrap">
                {profileLocation && profileLocation !== "Location not set" && (
                  <div className="flex items-center gap-1.5">
                    <span className="grid h-6 w-6 flex-shrink-0 place-items-center rounded-full bg-off-white/70 hover:bg-off-white/90 transition-colors">
                      <MapPin className="w-3 h-3 text-charcoal/85" />
                    </span>
                    <span>{profileLocation}</span>
                  </div>
                )}
                <div className="flex items-center gap-1.5">
                  <span className="grid h-6 w-6 flex-shrink-0 place-items-center rounded-full bg-off-white/70 hover:bg-off-white/90 transition-colors">
                    <Calendar className="w-3 h-3 text-charcoal/85" />
                  </span>
                  <span>Member since {memberSinceLabel}</span>
                </div>
                {enhancedProfile?.website_url && (
                  <a
                    href={enhancedProfile.website_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 hover:text-coral transition-colors"
                  >
                    <span className="grid h-6 w-6 flex-shrink-0 place-items-center rounded-full bg-off-white/70 hover:bg-off-white/90 transition-colors">
                      <Briefcase className="w-3 h-3 text-charcoal/85" />
                    </span>
                    <span>Website</span>
                  </a>
                )}
              </div>

              {/* Social Links */}
              {enhancedProfile?.social_links && Object.keys(enhancedProfile.social_links).length > 0 && (
                <div className="flex items-center gap-3 mb-4">
                  {Object.entries(enhancedProfile.social_links).map(([platform, url]) => {
                    if (!url) return null;
                    const platformIcons: Record<string, string> = {
                      instagram: '📷',
                      x: '𝕏',
                      twitter: '🐦',
                      tiktok: '🎵',
                      facebook: '👤',
                      linkedin: '💼',
                      youtube: '▶️',
                    };
                    return (
                      <a
                        key={platform}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-charcoal/70 hover:text-coral transition-colors"
                        aria-label={platform}
                      >
                        {platformIcons[platform.toLowerCase()] || '🔗'}
                      </a>
                    );
                  })}
                </div>
              )}
              <div className="flex items-center gap-6 mb-4 flex-wrap">
                <div className="text-sm text-charcoal/70">
                  {reviewsCount} reviews
                </div>
              </div>

              <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                <button
                  type="button"
                  onClick={onEditClick}
                  className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 bg-coral/90 hover:bg-charcoal/90 hover:border-white/30 text-white rounded-full text-caption sm:text-body-sm font-semibold transition-all duration-300 hover:scale-105 active:scale-95 shadow-md shadow-sage/20 border border-sage/20 whitespace-nowrap"
                  aria-label="Edit profile"
                >
                  <MessageSquare size={14} strokeWidth={2.5} className="sm:w-4 sm:h-4" />
                  <span>Edit Profile</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
