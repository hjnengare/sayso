"use client";

import Image from "next/image";
import { m } from "framer-motion";
import type { BadgeMapping } from "../lib/badgeMappings";
import { useIsDesktop } from "../hooks/useIsDesktop";
import { BADGE_DETAILS, itemVariants } from "./badgeConfig";

export function BadgeCard({ badge, index }: { badge: BadgeMapping; index: number }) {
  const isDesktop = useIsDesktop();
  const details = BADGE_DETAILS[badge.id];

  return (
    <m.div
      variants={isDesktop ? itemVariants : undefined}
      initial={isDesktop ? "hidden" : false}
      animate={isDesktop ? "visible" : undefined}
      className="group relative bg-white rounded-2xl border border-black/5 shadow-premium hover:shadow-premiumHover transition-all duration-300 overflow-hidden"
    >
      {/* Card Content */}
      <div className="p-5">
        {/* Badge Image */}
        <div className="relative w-20 h-20 mx-auto mb-4">
          <div className="absolute inset-0 bg-gradient-to-br from-sage/10 to-sage/5 rounded-full" />
          <Image
            src={badge.pngPath}
            alt={badge.name}
            fill
            className="object-contain p-2 group-hover:scale-110 transition-transform duration-300"
          />
        </div>

        {/* Badge Name */}
        <h3
          className="text-lg font-semibold text-charcoal text-center mb-2"
          style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
        >
          {badge.name}
        </h3>

        {/* Description */}
        <p
          className="text-sm text-charcoal/70 text-center mb-4 leading-relaxed min-h-[3rem]"
          style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
        >
          {details?.description || "A special badge recognizing your contributions."}
        </p>

        {/* How to Earn */}
        <div className="bg-card-bg/5 rounded-xl px-4 py-3 border border-sage/10">
          <p
            className="text-xs font-medium text-sage uppercase tracking-wide mb-1"
            style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
          >
            How to earn
          </p>
          <p
            className="text-sm text-charcoal/80"
            style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
          >
            {details?.howToEarn || "Keep exploring and contributing!"}
          </p>
        </div>
      </div>

      {/* Hover Glow Effect */}
      <div className="absolute inset-0 bg-gradient-to-t from-sage/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
    </m.div>
  );
}
