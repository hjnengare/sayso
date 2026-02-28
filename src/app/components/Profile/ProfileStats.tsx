"use client";

import React from "react";
import Link from "next/link";
import {
  Award,
  Briefcase,
  ChevronRight,
  Eye,
  Star as StarIcon,
  ThumbsUp,
} from "lucide-react";
import type { UserStats } from "@/app/lib/types/user";

interface ProfileStatsProps {
  userStats: UserStats | null;
  helpfulVotesCount: number;
  reviewsCount: number;
  badgesCount: number;
  interestsCount: number;
  totalSavedCount: number;
  savedBusinessesCount: number;
}

export function ProfileStats({
  userStats,
  helpfulVotesCount,
  reviewsCount,
  badgesCount,
  interestsCount,
  totalSavedCount,
  savedBusinessesCount,
}: ProfileStatsProps) {
  return (
    <section
      className="grid grid-cols-2 sm:grid-cols-4 gap-4"
      aria-label="Profile statistics"
    >
      <div className="bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 backdrop-blur-xl border-none rounded-[12px] shadow-md p-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-full bg-off-white/70 hover:bg-off-white/90 transition-colors">
            <ThumbsUp className="w-4 h-4 text-charcoal/85" />
          </span>
          <span className="text-sm text-charcoal/70">Helpful votes</span>
        </div>
        <p className="text-2xl font-bold text-charcoal">
          {helpfulVotesCount}
        </p>
        <p className="text-xs text-charcoal/60">Received</p>
      </div>
      <div className="bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 backdrop-blur-xl border-none rounded-[12px] shadow-md p-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-full bg-off-white/70 hover:bg-off-white/90 transition-colors">
            <StarIcon className="w-4 h-4 text-charcoal/85" />
          </span>
          <span className="text-sm text-charcoal/70">Reviews</span>
        </div>
        <p className="text-2xl font-bold text-charcoal">
          {reviewsCount}
        </p>
        <p className="text-xs text-charcoal/60">Total written</p>
      </div>
      <div className="bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 backdrop-blur-xl border-none rounded-[12px] shadow-md p-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-full bg-off-white/70 hover:bg-off-white/90 transition-colors">
            <Award className="w-4 h-4 text-charcoal/85" />
          </span>
          <span className="text-sm text-charcoal/70">Badges</span>
        </div>
        <p className="text-2xl font-bold text-charcoal">{badgesCount}</p>
        <p className="text-xs text-charcoal/60">Achievements unlocked</p>
      </div>
      <div className="bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 backdrop-blur-xl border-none rounded-[12px] shadow-md p-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-full bg-off-white/70 hover:bg-off-white/90 transition-colors">
            <Eye className="w-4 h-4 text-charcoal/85" />
          </span>
          <span className="text-sm text-charcoal/70">Interests</span>
        </div>
        <p className="text-2xl font-bold text-charcoal">{interestsCount}</p>
        <p className="text-xs text-charcoal/60">Communities followed</p>
      </div>
      {userStats && (
        <div className="bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 backdrop-blur-xl border-none rounded-[12px] shadow-md p-4 sm:col-span-2">
          <div className="flex items-center gap-2 mb-2">
            <span className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-full bg-off-white/70 hover:bg-off-white/90 transition-colors">
              <Briefcase className="w-4 h-4 text-charcoal/85" />
            </span>
            <span className="text-sm text-charcoal/70">Saved</span>
          </div>
          <p className="text-2xl font-bold text-charcoal">
            {totalSavedCount}
          </p>
          <p className="text-xs text-charcoal/60">
            {savedBusinessesCount > 0 ? `${savedBusinessesCount} businesses` : 'Your saved gems'}
          </p>
          <Link
            href="/saved"
            className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-navbar-bg hover:text-charcoal transition-colors"
            aria-label="View all saved items"
          >
            <span>View saved</span>
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      )}
    </section>
  );
}
