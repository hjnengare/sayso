"use client";

import { memo } from "react";
import { motion } from "framer-motion";
import { Trophy } from "lucide-react";
import FallbackImage from "../FallbackImage/FallbackImage";

interface LeaderboardUser {
  rank: number;
  username: string;
  reviews: number;
  badge?: string;
  avatar: string;
}

interface LeaderboardPodiumProps {
  topReviewers: LeaderboardUser[];
}

function LeaderboardPodium({ topReviewers }: LeaderboardPodiumProps) {
  return (
    <div className="flex flex-row justify-center items-end gap-2 sm:gap-4 mb-6 sm:mb-8 md:mb-12 pt-6 sm:pt-8 md:pt-10 px-2 max-w-lg mx-auto">
      {/* 2nd Place */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.4 }}
        className="text-center group cursor-pointer flex-1 w-full sm:max-w-[180px] order-1"
      >
        <div className="relative mb-2 sm:mb-3">
          <div className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 relative rounded-full overflow-hidden border-3 sm:border-4 border-white shadow-[0_8px_30px_rgba(0,0,0,0.2)] mx-auto ring-3 sm:ring-4 ring-coral/30">
            <FallbackImage
              src={topReviewers[1].avatar}
              alt={topReviewers[1].username}
              fill
              className="object-cover"
              sizes="(max-width: 640px) 64px, (max-width: 768px) 80px, 96px"
              fallbackType="profile"
            />
          </div>
          <div className="absolute -top-1 -right-1 sm:-top-2 sm:-right-2 w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-coral to-coral/80 rounded-full flex items-center justify-center shadow-[0_4px_20px_rgba(0,0,0,0.3)] border-2 border-white ring-2 ring-white/50">
            <span className="text-body-sm sm:text-body font-bold text-white">2</span>
          </div>
        </div>
        <div className="font-urbanist text-body-sm sm:text-body font-700 text-charcoal mb-1 truncate px-2 max-w-full overflow-hidden min-h-[1.5rem] sm:min-h-[1.75rem]">@{topReviewers[1].username}</div>
        <div className="font-urbanist text-caption sm:text-body-sm text-charcoal/60 mb-2">
          <span className="font-700 text-charcoal">{topReviewers[1].reviews}</span> reviews
        </div>
        {/* Professional Podium Block */}
        <div className="relative mt-auto">
          <div className="bg-gradient-to-b from-coral/25 to-coral/15 rounded-t-xl h-20 sm:h-28 md:h-32 w-full shadow-[0_8px_30px_rgba(0,0,0,0.15)] border-coral relative overflow-hidden ring-1 ring-white/20">
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>
          </div>
        </div>
      </motion.div>

      {/* 1st Place */}
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.6 }}
        className="text-center group cursor-pointer flex-1 w-full sm:max-w-[200px] order-2"
      >
        <div className="relative mb-2 sm:mb-3">
          <div className="w-20 h-20 sm:w-24 sm:h-24 md:w-32 md:h-32 relative rounded-full overflow-hidden border-3 sm:border-4 border-white shadow-[0_12px_40px_rgba(0,0,0,0.25)] mx-auto ring-3 sm:ring-4 ring-sage">
            <FallbackImage
              src={topReviewers[0].avatar}
              alt={topReviewers[0].username}
              fill
              className="object-cover"
              sizes="(max-width: 640px) 80px, (max-width: 768px) 96px, 128px"
              fallbackType="profile"
            />
          </div>
          <div className="absolute -top-2 -right-2 sm:-top-3 sm:-right-3 w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-amber-400 to-amber-600 rounded-full flex items-center justify-center shadow-[0_8px_30px_rgba(0,0,0,0.3)] border-2 border-white ring-2 ring-white/50">
            <Trophy className="text-h3 sm:text-h2 text-white" />
          </div>
        </div>
        <div className="font-urbanist text-body sm:text-h3 font-700 text-charcoal mb-1 truncate px-2 max-w-full overflow-hidden min-h-[1.75rem] sm:min-h-[2rem]">@{topReviewers[0].username}</div>
        <div className="font-urbanist text-caption sm:text-body-sm text-charcoal/60 mb-2">
          <span className="font-700 text-charcoal">{topReviewers[0].reviews}</span> reviews
        </div>
        {/* Professional Podium Block */}
        <div className="relative mt-auto">
          <div className="bg-gradient-to-b from-sage/35 to-sage/20 rounded-t-xl h-24 sm:h-36 md:h-48 w-full shadow-[0_12px_40px_rgba(0,0,0,0.2)] relative overflow-hidden ring-1 ring-white/20">
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>
          </div>
        </div>
      </motion.div>

      {/* 3rd Place */}
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7, duration: 0.6 }}
        className="text-center group cursor-pointer flex-1 w-full sm:max-w-[180px] order-3"
      >
        <div className="relative mb-2 sm:mb-3">
          <div className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 relative rounded-full overflow-hidden border-3 sm:border-4 border-white shadow-[0_8px_30px_rgba(0,0,0,0.2)] mx-auto ring-3 sm:ring-4 ring-charcoal/20">
            <FallbackImage
              src={topReviewers[2].avatar}
              alt={topReviewers[2].username}
              fill
              className="object-cover"
              sizes="(max-width: 640px) 64px, (max-width: 768px) 80px, 96px"
              fallbackType="profile"
            />
          </div>
          <div className="absolute -top-1 -right-1 sm:-top-2 sm:-right-2 w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-charcoal/70 to-charcoal/50 rounded-full flex items-center justify-center shadow-[0_4px_20px_rgba(0,0,0,0.3)] border-2 border-white ring-2 ring-white/50">
            <span className="text-body-sm sm:text-body font-bold text-white">3</span>
          </div>
        </div>
        <div className="font-urbanist text-body-sm sm:text-body font-700 text-charcoal mb-1 truncate px-2 max-w-full overflow-hidden min-h-[1.5rem] sm:min-h-[1.75rem]">@{topReviewers[2].username}</div>
        <div className="font-urbanist text-caption sm:text-body-sm text-charcoal/60 mb-2">
          <span className="font-700 text-charcoal">{topReviewers[2].reviews}</span> reviews
        </div>
        {/* Professional Podium Block */}
        <div className="relative mt-auto">
          <div className="bg-gradient-to-b from-charcoal/20 to-charcoal/10 rounded-t-xl h-16 sm:h-24 md:h-28 w-full shadow-[0_8px_30px_rgba(0,0,0,0.15)] border-charcoal/50 relative overflow-hidden ring-1 ring-white/20">
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default memo(LeaderboardPodium);
