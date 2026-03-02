"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { m } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  Sparkles,
  Star,
  Search,
  X
} from "@/app/lib/icons";
import Footer from "../components/Footer/Footer";
import { BADGE_MAPPINGS } from "../lib/badgeMappings";
import { useAuth } from "../contexts/AuthContext";
import { useIsDesktop } from "../hooks/useIsDesktop";
import { BADGE_DETAILS, containerVariants } from "./badgeConfig";
import { BadgeCard } from "./BadgeCard";
import { BadgeSection } from "./BadgeSection";

export default function BadgesPage() {
  const router = useRouter();
  const { user } = useAuth();
  const isDesktop = useIsDesktop();
  const discoverBusinessesHref = user ? "/for-you" : "/home";
  const [searchQuery, setSearchQuery] = useState("");

  // Group badges by category
  const badgesByGroup = useMemo(() => {
    const groups: Record<string, typeof BADGE_MAPPINGS[keyof typeof BADGE_MAPPINGS][]> = {
      explorer: [],
      specialist: [],
      milestone: [],
      community: [],
    };

    Object.values(BADGE_MAPPINGS).forEach(badge => {
      if (groups[badge.badgeGroup]) {
        groups[badge.badgeGroup].push(badge);
      }
    });

    return groups;
  }, []);

  // Filter badges by search
  const filteredBadges = useMemo(() => {
    if (!searchQuery.trim()) return null;

    const query = searchQuery.toLowerCase();
    return Object.values(BADGE_MAPPINGS).filter(badge => {
      const details = BADGE_DETAILS[badge.id];
      return (
        badge.name.toLowerCase().includes(query) ||
        details?.description?.toLowerCase().includes(query) ||
        details?.howToEarn?.toLowerCase().includes(query)
      );
    });
  }, [searchQuery]);

  return (
    <div className="min-h-dvh bg-off-white">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Background Gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-sage/10 via-off-white to-coral/5" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(157,171,155,0.15)_0%,_transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_rgba(114,47,55,0.08)_0%,_transparent_50%)]" />

        <div className="relative mx-auto w-full max-w-[1400px] px-4 sm:px-6 lg:px-8 pt-8 pb-16 sm:pt-12 sm:pb-24">
          {/* Back Link */}
          <m.div
            initial={isDesktop ? { opacity: 0, x: -20 } : false}
            animate={isDesktop ? { opacity: 1, x: 0 } : undefined}
            transition={isDesktop ? { duration: 0.4 } : undefined}
          >
            <button
              type="button"
              onClick={() => {
                if (typeof window !== "undefined" && window.history.length > 1) {
                  router.back();
                } else {
                  router.push("/leaderboard");
                }
              }}
              className="inline-flex items-center gap-2 text-charcoal/70 hover:text-charcoal transition-colors mb-8 group"
              style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
            >
              <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              <span className="text-sm font-medium">Back to previous page</span>
            </button>
          </m.div>

          {/* Hero Content */}
          <div className="max-w-3xl">
            <m.div
              initial={isDesktop ? { opacity: 0, y: 20 } : false}
              animate={isDesktop ? { opacity: 1, y: 0 } : undefined}
              transition={isDesktop ? { duration: 0.6, delay: 0.1 } : undefined}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/80 backdrop-blur-sm border border-sage/20 shadow-sm mb-6"
            >
              <Sparkles className="w-4 h-4 text-sage" />
              <span
                className="text-sm font-medium text-charcoal"
                style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
              >
                {Object.keys(BADGE_MAPPINGS).length} Badges to Collect
              </span>
            </m.div>

            <m.h1
              initial={isDesktop ? { opacity: 0, y: 20 } : false}
              animate={isDesktop ? { opacity: 1, y: 0 } : undefined}
              transition={isDesktop ? { duration: 0.6, delay: 0.2 } : undefined}
              className="text-4xl sm:text-5xl md:text-6xl font-bold text-charcoal mb-6 leading-tight"
              style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
            >
              Earn Badges.<br />
              <span className="text-sage">Show Your Expertise.</span>
            </m.h1>

            <m.p
              initial={isDesktop ? { opacity: 0, y: 20 } : false}
              animate={isDesktop ? { opacity: 1, y: 0 } : undefined}
              transition={isDesktop ? { duration: 0.6, delay: 0.3 } : undefined}
              className="text-lg sm:text-xl text-charcoal/70 mb-8 leading-relaxed"
              style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
            >
              Every review, photo, and helpful action earns you recognition. Collect badges that showcase your unique journey and expertise across Cape Town&apos;s best local businesses.
            </m.p>

            {/* Search */}
            <m.div
              initial={isDesktop ? { opacity: 0, y: 20 } : false}
              animate={isDesktop ? { opacity: 1, y: 0 } : undefined}
              transition={isDesktop ? { duration: 0.6, delay: 0.4 } : undefined}
              className="relative max-w-md"
            >
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-charcoal/40" />
              <input
                type="text"
                placeholder="Search badges..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-10 py-3.5 rounded-full bg-white border border-charcoal/10 shadow-sm focus:outline-none focus:ring-2 focus:ring-sage/30 focus:border-sage/50 transition-all text-charcoal placeholder:text-charcoal/40"
                style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-charcoal/5 transition-colors"
                >
                  <X className="w-4 h-4 text-charcoal/40" />
                </button>
              )}
            </m.div>
          </div>

          {/* Decorative Badges */}
          <div className="absolute right-8 top-1/2 -translate-y-1/2 hidden xl:block">
            <m.div
              initial={isDesktop ? { opacity: 0, scale: 0.8, rotate: -10 } : false}
              animate={isDesktop ? { opacity: 1, scale: 1, rotate: 0 } : undefined}
              transition={isDesktop ? { duration: 0.8, delay: 0.5 } : undefined}
              className="relative"
            >
              <div className="absolute -inset-4 bg-white/50 backdrop-blur-xl rounded-3xl shadow-lg" />
              <div className="relative grid grid-cols-3 gap-3 p-4">
                {[
                  "/badges/042-test.png",
                  "/badges/030-honeybee.png",
                  "/badges/039-gem.png",
                  "/badges/049-leadership.png",
                  "/badges/066-skydiving.png",
                  "/badges/035-sunglasses.png",
                ].map((src, i) => (
                  <m.div
                    key={src}
                    initial={isDesktop ? { opacity: 0, y: 20 } : false}
                    animate={isDesktop ? { opacity: 1, y: 0 } : undefined}
                    transition={isDesktop ? { delay: 0.6 + i * 0.1 } : undefined}
                    className="w-16 h-16 relative"
                  >
                    <Image
                      src={src}
                      alt=""
                      fill
                      className="object-contain"
                    />
                  </m.div>
                ))}
              </div>
            </m.div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main className="mx-auto w-full max-w-[1400px] px-4 sm:px-6 lg:px-8 py-8 sm:py-16">
        {/* Search Results */}
        {filteredBadges ? (
          <section className="mb-16">
            <div className="flex items-center justify-between mb-8">
              <h2
                className="text-xl sm:text-2xl font-semibold text-charcoal"
                style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
              >
                {filteredBadges.length} {filteredBadges.length === 1 ? 'badge' : 'badges'} found
              </h2>
              <button
                onClick={() => setSearchQuery("")}
                className="text-sm text-sage hover:text-sage/80 font-medium transition-colors"
                style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
              >
                Clear search
              </button>
            </div>
            {filteredBadges.length > 0 ? (
              isDesktop ? (
                <m.div
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                  className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6"
                >
                  {filteredBadges.map((badge, index) => (
                    <BadgeCard key={badge.id} badge={badge} index={index} />
                  ))}
                </m.div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                  {filteredBadges.map((badge, index) => (
                    <BadgeCard key={badge.id} badge={badge} index={index} />
                  ))}
                </div>
              )
            ) : (
              <div className="text-center py-16">
                <p className="text-charcoal/60" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>
                  No badges match your search. Try a different term.
                </p>
              </div>
            )}
          </section>
        ) : (
          <>
            {/* Badge Sections */}
            <BadgeSection groupKey="explorer" badges={badgesByGroup.explorer} />
            <BadgeSection groupKey="specialist" badges={badgesByGroup.specialist} />
            <BadgeSection groupKey="milestone" badges={badgesByGroup.milestone} />
            <BadgeSection groupKey="community" badges={badgesByGroup.community} />
          </>
        )}

        {/* CTA Section */}
        <m.section
          initial={isDesktop ? { opacity: 0, y: 40 } : false}
          whileInView={isDesktop ? { opacity: 1, y: 0 } : undefined}
          viewport={isDesktop ? { once: true } : undefined}
          transition={isDesktop ? { duration: 0.6 } : undefined}
          className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-sage to-sage/80 p-8 sm:p-12 md:p-16 text-center"
        >
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,_white_0%,_transparent_50%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,_white_0%,_transparent_50%)]" />
          </div>

          <div className="relative z-10">
            <Star className="w-12 h-12 text-white/80 mx-auto mb-6" />
            <h2
              className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-4"
              style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
            >
              Ready to Start Collecting?
            </h2>
            <p
              className="text-lg text-white/80 mb-8 max-w-xl mx-auto"
              style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
            >
              Every badge tells a story. Begin your journey by sharing your experiences at local businesses.
            </p>
            <Link
              href={discoverBusinessesHref}
              className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-white text-sage font-semibold hover:bg-white/90 transition-all duration-200 shadow-lg hover:shadow-xl hover:-translate-y-0.5"
              style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
            >
              <span>Discover Businesses</span>
              <Sparkles className="w-5 h-5" />
            </Link>
          </div>
        </m.section>
      </main>

      <Footer />
    </div>
  );
}
