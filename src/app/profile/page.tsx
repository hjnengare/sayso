"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useAuth } from "@/app/contexts/AuthContext";
import { usePredefinedPageTitle } from "@/app/hooks/usePageTitle";
import {
  Check,
  AlertTriangle,
  ChevronRight,
  Navigation,
  Loader2,
} from "@/app/lib/icons";
import { getBrowserSupabase } from "@/app/lib/supabase/client";

// Import components directly for faster loading
import Footer from "@/app/components/Footer/Footer";
import { ReviewsList } from "@/components/organisms/ReviewsList";
import { DangerAction } from "@/components/molecules/DangerAction";
import { ConfirmationDialog } from "@/components/molecules/ConfirmationDialog";
import { useSavedItems } from "@/app/contexts/SavedItemsContext";
import { useBusinessDistanceLocation } from "@/app/hooks/useBusinessDistanceLocation";
import { EditProfileModal } from "@/app/components/EditProfile/EditProfileModal";
import { useReviewSubmission } from "@/app/hooks/useReviews";
import { useRouter } from "next/navigation";

// SWR hooks
import { useUserProfile } from "@/app/hooks/useUserProfile";
import { useUserStats } from "@/app/hooks/useUserStats";
import { useUserReviews } from "@/app/hooks/useUserReviews";
import { useUserBadges } from "@/app/hooks/useUserBadges";
import { useSavedBusinessesPreview } from "@/app/hooks/useSavedBusinessesDetails";
import { ProfileHeader } from "@/app/components/Profile/ProfileHeader";
import { ProfileStats } from "@/app/components/Profile/ProfileStats";
import { ProfileAchievements } from "@/app/components/Profile/ProfileAchievements";
import { ProfileSavedItems } from "@/app/components/Profile/ProfileSavedItems";

// Types

// Skeleton Components
function ProfileHeaderSkeleton() {
  return (
    <article className="w-full sm:mx-0">
      <div className="bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 backdrop-blur-xl border-none rounded-[12px] shadow-md relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-sage/10 to-transparent rounded-full blur-lg"></div>
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-coral/10 to-transparent rounded-full blur-lg"></div>
        <div className="relative z-10 p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            {/* Avatar Skeleton */}
            <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full bg-card-bg/20 animate-pulse flex-shrink-0" />
            <div className="flex-1 min-w-0 w-full space-y-4">
              {/* Name Skeleton */}
              <div className="h-8 bg-white/30 rounded-lg w-48 animate-pulse" />
              {/* Bio Skeleton */}
              <div className="space-y-2">
                <div className="h-4 bg-white/20 rounded w-full max-w-md animate-pulse" />
                <div className="h-4 bg-white/20 rounded w-3/4 max-w-sm animate-pulse" />
              </div>
              {/* Meta Info Skeleton */}
              <div className="flex items-center gap-4 flex-wrap">
                <div className="h-4 bg-white/20 rounded w-28 animate-pulse" />
                <div className="h-4 bg-white/20 rounded w-36 animate-pulse" />
              </div>
              {/* Button Skeleton */}
              <div className="h-10 bg-coral/20 rounded-full w-32 animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

function StatsGridSkeleton() {
  return (
    <section className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 backdrop-blur-xl border-none rounded-[12px] shadow-md p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-5 h-5 bg-card-bg/20 rounded animate-pulse" />
            <div className="h-4 bg-white/20 rounded w-20 animate-pulse" />
          </div>
          <div className="h-8 bg-white/30 rounded w-12 animate-pulse mb-1" />
          <div className="h-3 bg-white/20 rounded w-16 animate-pulse" />
        </div>
      ))}
    </section>
  );
}

function AchievementsSkeleton() {
  return (
    <section className="bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 backdrop-blur-xl border-none rounded-[12px] shadow-md p-6 sm:p-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-card-bg/20 rounded-full animate-pulse" />
        <div className="h-5 bg-white/30 rounded w-40 animate-pulse" />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex flex-col items-center p-4 bg-white/50 rounded-[16px] border-none">
            <div className="w-12 h-12 bg-card-bg/20 rounded-full animate-pulse mb-3" />
            <div className="h-4 bg-white/30 rounded w-20 animate-pulse mb-2" />
            <div className="h-3 bg-white/20 rounded w-24 animate-pulse" />
          </div>
        ))}
      </div>
    </section>
  );
}

function ReviewsSkeleton() {
  return (
    <section className="bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 backdrop-blur-xl border-none rounded-[12px] shadow-md p-6 sm:p-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-card-bg/20 rounded-full animate-pulse" />
        <div className="h-5 bg-white/30 rounded w-40 animate-pulse" />
      </div>
      <div className="space-y-4">
        {[1, 2].map((i) => (
          <div key={i} className="p-4 bg-white/50 rounded-[16px] border-none">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-[12px] bg-card-bg/20 animate-pulse flex-shrink-0" />
              <div className="flex-1 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="h-4 bg-white/30 rounded w-32 animate-pulse" />
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <div key={s} className="w-4 h-4 bg-white/20 rounded animate-pulse" />
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="h-3 bg-white/20 rounded w-full animate-pulse" />
                  <div className="h-3 bg-white/20 rounded w-3/4 animate-pulse" />
                </div>
                <div className="h-3 bg-white/20 rounded w-20 animate-pulse" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

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
  // Enhanced profile fields
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

function ProfileContent() {
  const { user, updateUser, isLoading, logout } = useAuth();
  const { savedItems } = useSavedItems();
  const { deleteReview } = useReviewSubmission();
  const router = useRouter();
  const { status: locationStatus, requestLocation } = useBusinessDistanceLocation();

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarKey, setAvatarKey] = useState(0);
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleteAccountDialogOpen, setIsDeleteAccountDialogOpen] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [deleteAccountError, setDeleteAccountError] = useState<string | null>(null);
  const [isDeactivateDialogOpen, setIsDeactivateDialogOpen] = useState(false);
  const [isDeactivating, setIsDeactivating] = useState(false);
  const [deactivateError, setDeactivateError] = useState<string | null>(null);
  const [imgError, setImgError] = useState(false);
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false);
  const supabase = getBrowserSupabase();

  const [reviewToDelete, setReviewToDelete] = useState<string | null>(null);
  const [reviewToEdit, setReviewToEdit] = useState<{ reviewId: string; businessSlug: string } | null>(null);

  // SWR hooks — replace all raw fetch/useEffect pairs
  const { profile: enhancedProfile, loading: profileLoading, mutate: profileMutate } = useUserProfile();
  const { stats: userStats, loading: statsLoading } = useUserStats();
  const { reviews: userReviews, loading: reviewsLoading, mutate: reviewsMutate } = useUserReviews();
  const { achievements, loading: achievementsLoading, mutate: badgesMutate } = useUserBadges();
  const { businesses: savedBusinesses } = useSavedBusinessesPreview();

  useEffect(() => {
    if (isEditOpen) {
      setError(null);
    }
  }, [isEditOpen]);

  // Realtime subscription for user's badges and reviews
  useEffect(() => {
    if (!user?.id) return;

    const THROTTLE_MS = 3000;
    let lastRefresh = 0;

    const badgesChannel = supabase
      .channel(`profile-badges-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'user_badges',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          const now = Date.now();
          if (now - lastRefresh < THROTTLE_MS) return;
          lastRefresh = now;
          badgesMutate();
        }
      )
      .subscribe((status) => {
        setIsRealtimeConnected(status === 'SUBSCRIBED');
      });

    const reviewsChannel = supabase
      .channel(`profile-reviews-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'reviews',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          reviewsMutate();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(badgesChannel);
      supabase.removeChannel(reviewsChannel);
      setIsRealtimeConnected(false);
    };
  }, [user?.id, supabase, badgesMutate, reviewsMutate]);

  const handleSaveProfile = async (data?: { username: string; displayName: string; avatarFile: File | null }) => {
    if (!user) return;
    setSaving(true);
    setError(null);

    const usernameToSave = data?.username || username;
    const displayNameToSave = data?.displayName || displayName;
    const avatarFileToSave = data?.avatarFile !== undefined ? data.avatarFile : avatarFile;

    try {
      let avatar_url = profile.avatar_url || null;

      if (avatarFileToSave === null && data?.avatarFile === null) {
        avatar_url = null;

        if (profile.avatar_url) {
          try {
            const urlParts = profile.avatar_url.split('/');
            const fileName = urlParts[urlParts.length - 1].split('?')[0];
            const path = `${user.id}/${fileName}`;

            const { error: deleteError } = await supabase.storage
              .from('avatars')
              .remove([path]);

            if (deleteError) {
              console.warn('Error deleting old avatar:', deleteError);
            }
          } catch (deleteErr) {
            console.warn('Error deleting old avatar:', deleteErr);
          }
        }
      } else if (avatarFileToSave) {
        try {
          const maxSize = 5 * 1024 * 1024;
          if (avatarFileToSave.size > maxSize) {
            throw new Error('Image file is too large. Maximum size is 5MB.');
          }

          const timestamp = Date.now();
          const fileExt = avatarFileToSave.name.split('.').pop() || 'jpg';
          const path = `${user.id}/avatar-${timestamp}.${fileExt}`;

          const { error: uploadErr } = await supabase.storage
            .from('avatars')
            .upload(path, avatarFileToSave, {
              upsert: true,
              cacheControl: '3600',
              contentType: avatarFileToSave.type || `image/${fileExt}`
            });

          if (uploadErr) {
            let errorMessage = 'Failed to upload avatar image';
            if (uploadErr.message) {
              errorMessage = uploadErr.message;

              if (uploadErr.message.includes('413') || uploadErr.message.includes('too large')) {
                errorMessage = 'Image file is too large. Please choose a smaller image.';
              } else if (uploadErr.message.includes('401') || uploadErr.message.includes('403') || uploadErr.message.includes('permission') || uploadErr.message.includes('unauthorized')) {
                errorMessage = 'Permission denied. Please check your account permissions.';
              } else if (uploadErr.message.includes('duplicate') || uploadErr.message.includes('already exists')) {
                // continue to get URL
              } else {
                errorMessage = `Upload failed: ${uploadErr.message}`;
              }
            }

            if (!uploadErr.message?.includes('duplicate') && !uploadErr.message?.includes('already exists')) {
              throw new Error(errorMessage);
            }
          }

          const { data: pubData } = supabase.storage.from('avatars').getPublicUrl(path);

          if (!pubData?.publicUrl) {
            throw new Error('Failed to get public URL for uploaded image');
          }

          avatar_url = pubData.publicUrl;

          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (uploadError: any) {
          throw new Error(uploadError.message || 'Failed to upload profile image. Please try again.');
        }
      }

      const usernameValue = usernameToSave.trim() || null;
      const displayNameValue = displayNameToSave.trim() || null;

      await updateUser({
        profile: {
          ...(user.profile || {}),
          avatar_url: avatar_url,
          username: usernameValue,
          display_name: displayNameValue,
        } as any,
      });

      // Revalidate profile via SWR
      profileMutate();

      if (data) {
        setUsername(usernameToSave);
        setDisplayName(displayNameToSave);
        setAvatarFile(avatarFileToSave);
      }

      setAvatarKey(prev => prev + 1);
      setIsEditOpen(false);
      setAvatarFile(null);
    } catch (e: any) {
      setError(e?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const formatMemberSince = (d: string) => {
    const date = new Date(d);
    const year = date.getFullYear().toString().slice(-2);
    return `${date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    })} '${year}`;
  };

  const handleLogout = async () => {
    await logout();
    window.location.href = "/login";
  };

  const handleDeactivate = () => {
    setIsDeactivateDialogOpen(true);
  };

  const confirmDeactivateAccount = async () => {
    setIsDeactivating(true);
    setDeactivateError(null);

    try {
      const response = await fetch('/api/user/deactivate-account', {
        method: 'POST',
        cache: 'no-store',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to deactivate account');
      }

      setIsDeactivateDialogOpen(false);
      window.location.href = '/login?message=Account deactivated. Log in to reactivate.';
    } catch (error: any) {
      console.error('Error deactivating account:', error);
      setIsDeactivating(false);
      setDeactivateError(`Failed to deactivate account: ${error.message}`);
    }
  };

  const handleDeleteAccount = () => {
    setIsDeleteAccountDialogOpen(true);
  };

  const confirmDeleteAccount = async () => {
    setIsDeletingAccount(true);
    setDeleteAccountError(null);

    try {
      const response = await fetch('/api/user/delete-account', {
        method: 'DELETE',
        cache: 'no-store',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete account');
      }

      setIsDeleteAccountDialogOpen(false);
      window.location.href = '/onboarding';
    } catch (error: any) {
      console.error('Error deleting account:', error);
      setIsDeletingAccount(false);
      setDeleteAccountError(`Failed to delete account: ${error.message}`);
    }
  };

  const profile = React.useMemo((): UserProfile => {
    const rawProfile: any = user?.profile || {};
    const enhanced: any = enhancedProfile || {};

    const profileData: UserProfile = {
      user_id: user?.id || '',
      username: (enhanced.username ?? rawProfile.username ?? (user?.email ? user.email.split('@')[0] : 'user')) as string | null,
      display_name: (enhanced.display_name ?? rawProfile.display_name ?? null) as string | null,
      avatar_url: (enhanced.avatar_url ?? rawProfile.avatar_url ?? null) as string | null,
      locale: (rawProfile.locale || 'en') as string,
      onboarding_step: (rawProfile.onboarding_step || 'interests') as string,
      is_top_reviewer: rawProfile.is_top_reviewer ?? false,
      reviews_count: rawProfile.reviews_count ?? 0,
      badges_count: rawProfile.badges_count ?? 0,
      interests_count: rawProfile.interests_count ?? 0,
      last_interests_updated: (rawProfile.last_interests_updated ?? null) as string | null,
      created_at: (enhanced.created_at ?? rawProfile.created_at ?? (user?.created_at ?? new Date().toISOString())) as string,
      updated_at: (enhanced.updated_at ?? rawProfile.updated_at ?? new Date().toISOString()) as string,
      bio: enhanced.bio as string | undefined,
      location: enhanced.location as string | undefined,
      website_url: enhanced.website_url as string | undefined,
      social_links: (enhanced.social_links || {}) as Record<string, string> | undefined,
      privacy_settings: enhanced.privacy_settings as { showActivity?: boolean; showStats?: boolean; showSavedBusinesses?: boolean } | undefined,
      last_active_at: enhanced.last_active_at as string | undefined,
    };
    return profileData;
  }, [user?.profile, enhancedProfile, user?.email, user?.created_at, user?.id]);

  const displayLabel =
    profile.display_name?.trim() ||
    profile.username ||
    user?.email?.split("@")[0] ||
    "Your Profile";
  const rawProfileLocation = enhancedProfile?.location || profile.location || "";
  const profileLocation = (() => {
    const normalizedLocation = rawProfileLocation.trim();
    if (!normalizedLocation) return "Location not set";
    // Ignore locale codes such as "en" or "en-ZA" leaking into the location slot.
    if (/^[a-z]{2}(?:-[A-Z]{2})?$/.test(normalizedLocation)) {
      return "Location not set";
    }
    return normalizedLocation;
  })();
  const reviewsCount = userReviews.length > 0 ? userReviews.length : (userStats?.totalReviewsWritten ?? profile.reviews_count ?? 0);
  const badgesCount = achievements.length;
  const interestsCount = profile.interests_count ?? 0;
  const helpfulVotesCount = userStats?.helpfulVotesReceived ?? 0;
  const savedBusinessesCount = savedItems.length > 0 ? savedItems.length : (userStats?.totalBusinessesSaved ?? 0);
  const totalSavedCount = savedBusinessesCount;
  const memberSinceLabel = userStats?.accountCreationDate
    ? formatMemberSince(userStats.accountCreationDate)
    : profile.created_at
      ? formatMemberSince(profile.created_at)
      : "—";

  const handleEditReview = (reviewId: string, businessSlug: string) => {
    router.push(`/business/${businessSlug}/review?edit=${reviewId}`);
  };

  const handleDeleteReviewClick = (reviewId: string) => {
    setReviewToDelete(reviewId);
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDeleteReview = async () => {
    if (!reviewToDelete) return;

    setIsDeleting(true);
    setDeleteError(null);

    try {
      const success = await deleteReview(reviewToDelete);
      if (success) {
        // Optimistically remove from cache, then revalidate
        reviewsMutate(
          (prev) => (prev ?? []).filter((r) => r.id !== reviewToDelete),
          { revalidate: true }
        );
        // Refresh badges since review count changed
        badgesMutate();

        setIsDeleteDialogOpen(false);
        setReviewToDelete(null);
      } else {
        setDeleteError('Failed to delete review');
      }
    } catch (err) {
      console.error('Error deleting review:', err);
      setDeleteError('Failed to delete review');
    } finally {
      setIsDeleting(false);
    }
  };

  const reviewsData = userReviews.map((review) => {
    const businessSlug = (review as any).business_slug || review.id;
    return {
      businessName: review.business_name,
      businessImageUrl: review.business_image_url,
      rating: review.rating,
      reviewText: review.review_text,
      isFeatured: review.is_featured,
      createdAt: review.created_at,
      onViewClick: () => {
        if (businessSlug) {
          window.location.href = `/business/${businessSlug}`;
        }
      },
      onEdit: () => handleEditReview(review.id, businessSlug),
      onDelete: () => handleDeleteReviewClick(review.id),
    };
  });

  return (
    <>
      <style jsx global>{`
        .font-urbanist {
          font-family: "Urbanist", -apple-system, BlinkMacSystemFont, "Helvetica Neue", Helvetica, Arial, system-ui,
            sans-serif;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
          font-feature-settings: "kern" 1, "liga" 1, "calt" 1;
        }
      `}</style>
      <style jsx>{`
        .profile-load-item {
          opacity: 0;
          transform: translateY(6px);
          animation: profileSectionLoadIn 420ms cubic-bezier(0.22, 1, 0.36, 1) both;
          will-change: opacity, transform;
        }
        .profile-load-delay-0 { animation-delay: 0ms; }
        .profile-load-delay-1 { animation-delay: 70ms; }
        .profile-load-delay-2 { animation-delay: 120ms; }
        .profile-load-delay-3 { animation-delay: 170ms; }
        .profile-load-delay-4 { animation-delay: 220ms; }
        .profile-load-delay-5 { animation-delay: 270ms; }
        .profile-load-delay-6 { animation-delay: 320ms; }
        .profile-load-delay-7 { animation-delay: 370ms; }
        @keyframes profileSectionLoadIn {
          0% {
            opacity: 0;
            transform: translateY(6px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .profile-load-item {
            animation: none;
            opacity: 1;
            transform: none;
          }
        }
      `}</style>
        <div
          className="min-h-dvh bg-off-white relative overflow-hidden font-urbanist"
          style={{
            fontFamily:
              "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
          }}
        >
          {/* Background Gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-sage/10 via-off-white to-coral/5" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(157,171,155,0.15)_0%,_transparent_50%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_rgba(114,47,55,0.08)_0%,_transparent_50%)]" />

          <div className="min-h-[100dvh] bg-gradient-to-b from-off-white/0 via-off-white/50 to-off-white relative z-10">
              <main
                className="relative font-urbanist"
                id="main-content"
                role="main"
                aria-label="User profile content"
              >
                <div className="mx-auto w-full max-w-[2000px] px-2 sm:px-4 lg:px-6 2xl:px-8 relative z-10">
                  {/* Breadcrumb Navigation */}
                  <nav className="pb-1 profile-load-item profile-load-delay-0" aria-label="Breadcrumb">
                    <ol className="flex items-center gap-2 text-sm sm:text-base">
                      <li>
                        <Link href="/home" className="text-charcoal/70 hover:text-charcoal transition-colors duration-200 font-medium" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>
                          Home
                        </Link>
                      </li>
                      <li className="flex items-center">
                        <ChevronRight className="w-4 h-4 text-charcoal/60" />
                      </li>
                      <li>
                        <span className="text-charcoal font-semibold" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>
                          Profile
                        </span>
                      </li>
                    </ol>
                  </nav>
                  <div className="pt-2 pb-12 sm:pb-16 md:pb-20">
                    <div className="space-y-6">
                      {profileLoading ? (
                        <ProfileHeaderSkeleton />
                      ) : (
                        <ProfileHeader
                          profile={profile}
                          user={user}
                          enhancedProfile={enhancedProfile}
                          displayLabel={displayLabel}
                          profileLocation={profileLocation}
                          memberSinceLabel={memberSinceLabel}
                          reviewsCount={reviewsCount}
                          avatarKey={avatarKey}
                          imgError={imgError}
                          isRealtimeConnected={isRealtimeConnected}
                          onEditClick={() => setIsEditOpen(true)}
                          onImgError={() => setImgError(true)}
                        />
                      )}

                  <div className="profile-load-item profile-load-delay-2">
                    {statsLoading ? (
                      <StatsGridSkeleton />
                    ) : (
                      <ProfileStats
                        userStats={userStats}
                        helpfulVotesCount={helpfulVotesCount}
                        reviewsCount={reviewsCount}
                        badgesCount={badgesCount}
                        interestsCount={interestsCount}
                        totalSavedCount={totalSavedCount}
                        savedBusinessesCount={savedBusinessesCount}
                      />
                    )}
                  </div>

                      {savedBusinesses.length > 0 && (
                        <div className="profile-load-item profile-load-delay-3">
                          <ProfileSavedItems savedBusinesses={savedBusinesses} />
                        </div>
                      )}

                      <div className="profile-load-item profile-load-delay-4">
                        {achievementsLoading ? (
                          <AchievementsSkeleton />
                        ) : (
                          <ProfileAchievements achievements={achievements} />
                        )}
                      </div>

                      <div className="profile-load-item profile-load-delay-5">
                        {reviewsLoading ? (
                          <ReviewsSkeleton />
                        ) : (
                        <section
                          className="bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 backdrop-blur-xl border-none rounded-[12px] shadow-md p-6 sm:p-8"
                          aria-label="Your contributions"
                        >
                        {reviewsData.length > 0 ? (
                          <ReviewsList
                            reviews={reviewsData}
                            title="Your Contributions"
                            initialDisplayCount={2}
                            showToggle={true}
                          />
                        ) : (
                          <div className="text-center py-8">
                            <p className="text-charcoal/70">You haven't written any reviews yet.</p>
                          </div>
                        )}
                        </section>
                        )}
                      </div>
                      {/* Preferences */}
                      <section
                        className="bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 backdrop-blur-xl border-none rounded-[12px] shadow-md p-6 sm:p-8 space-y-4 profile-load-item profile-load-delay-6"
                        aria-label="Preferences"
                      >
                        <div className="flex items-center gap-3">
                          <span className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-full bg-off-white/70 hover:bg-off-white/90 transition-colors">
                            <Navigation className="w-4 h-4 text-charcoal/85" />
                          </span>
                          <h3 className="text-base font-semibold text-charcoal">
                            Preferences
                          </h3>
                        </div>

                        {/* Location Distance */}
                        <div className="flex items-center justify-between gap-4 py-3 border-t border-white/40">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-charcoal">Location Distance</p>
                            <p className="text-xs text-charcoal/60 mt-0.5">
                              {locationStatus === 'granted'
                                ? 'Enabled — distances are shown on business cards'
                                : locationStatus === 'denied'
                                  ? 'Blocked — update in your browser settings, then tap retry'
                                  : 'Allow location to see how far businesses are from you'}
                            </p>
                          </div>

                          {locationStatus === 'granted' ? (
                            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-sage/15 text-sage text-xs font-semibold whitespace-nowrap border border-sage/20">
                              <Check size={14} strokeWidth={2.5} />
                              Enabled
                            </span>
                          ) : (
                            <button
                              onClick={requestLocation}
                              disabled={locationStatus === 'loading'}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-coral/90 hover:bg-coral text-white text-xs font-semibold whitespace-nowrap transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed shadow-sm"
                            >
                              {locationStatus === 'loading' ? (
                                <>
                                  <Loader2 size={14} className="animate-spin" />
                                  Requesting...
                                </>
                              ) : locationStatus === 'denied' ? (
                                <>
                                  <Navigation size={14} />
                                  Retry
                                </>
                              ) : (
                                <>
                                  <Navigation size={14} />
                                  Allow
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      </section>

                      <section
                        className="bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 backdrop-blur-xl border-none rounded-[12px] shadow-md p-6 sm:p-8 space-y-4 profile-load-item profile-load-delay-7"
                        aria-label="Account actions"
                      >
                        <div className="flex items-center gap-3">
                          <span className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-full bg-off-white/70 hover:bg-off-white/90 transition-colors">
                            <AlertTriangle className="w-4 h-4 text-charcoal/85" />
                          </span>
                          <h3 className="text-base font-semibold text-charcoal">
                            Account Actions
                          </h3>
                        </div>
                        <div className="space-y-4">
                          <DangerAction
                            title="Log Out"
                            description="Sign out of your account on this device."
                            buttonText="Log Out"
                            onAction={handleLogout}
                            variant="primary"
                            showBorder={false}
                          />

                          <DangerAction
                            title="Delete Account"
                            description="Permanently delete your account and all associated data. This action cannot be undone."
                            buttonText="Delete Account"
                            onAction={handleDeleteAccount}
                            variant="secondary"
                            showBorder={true}
                          />
                        </div>
                      </section>
                    </div>
                  </div>
                </div>
              </main>
          </div>

          <Footer />
        </div>

      {/* Edit Profile Modal */}
      <EditProfileModal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        onSave={async (data) => {
          await handleSaveProfile(data);
        }}
        currentUsername={profile.username || ""}
        currentDisplayName={profile.display_name || null}
        currentAvatarUrl={profile.avatar_url || null}
        saving={saving}
        error={error}
      />

      {/* Delete Review Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => {
          setIsDeleteDialogOpen(false);
          setReviewToDelete(null);
          setDeleteError(null);
        }}
        onConfirm={handleConfirmDeleteReview}
        title="Delete Review"
        message="Are you sure you want to delete this review? This action cannot be undone."
        confirmText={isDeleting ? "Deleting..." : "Delete"}
        cancelText="Cancel"
        variant="danger"
        isLoading={isDeleting}
        error={deleteError}
      />

      {/* Delete Account Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={isDeleteAccountDialogOpen}
        onClose={() => {
          setIsDeleteAccountDialogOpen(false);
          setDeleteAccountError(null);
        }}
        onConfirm={confirmDeleteAccount}
        title="Delete Account"
        message="Are you sure you want to permanently delete your account? This action cannot be undone and all your data will be permanently removed."
        confirmText={isDeletingAccount ? "Deleting..." : "Delete Account"}
        cancelText="Cancel"
        variant="danger"
        isLoading={isDeletingAccount}
        error={deleteAccountError}
        requireConfirmText="DELETE"
      />
    </>
  );
}

export default function ProfilePage() {
  usePredefinedPageTitle('profile');
  return <ProfileContent />;
}
