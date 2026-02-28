"use client";

import { useMemo } from "react";
import { m } from "framer-motion";
import type { BadgeMapping } from "../lib/badgeMappings";
import { useIsDesktop } from "../hooks/useIsDesktop";
import { CATEGORY_META, SPECIALIST_CATEGORIES, containerVariants } from "./badgeConfig";
import { BadgeCard } from "./BadgeCard";

export function BadgeSection({
  groupKey,
  badges,
}: {
  groupKey: "explorer" | "specialist" | "milestone" | "community";
  badges: BadgeMapping[];
}) {
  const isDesktop = useIsDesktop();
  const meta = CATEGORY_META[groupKey];
  const IconComponent = meta.icon;

  // Group specialist badges by category
  const groupedBadges = useMemo(() => {
    if (groupKey !== "specialist") return { all: badges };

    const groups: Record<string, BadgeMapping[]> = {};
    badges.forEach(badge => {
      const key = badge.categoryKey || "other";
      if (!groups[key]) groups[key] = [];
      groups[key].push(badge);
    });
    return groups;
  }, [badges, groupKey]);

  return (
    <section className="mb-16 sm:mb-24">
      {/* Section Header */}
      {isDesktop ? (
        <m.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="mb-8 sm:mb-12"
        >
          <div className={`inline-flex items-center gap-3 px-4 py-2 rounded-full bg-gradient-to-r ${meta.gradient} border ${meta.borderColor} mb-4`}>
            <IconComponent className={`w-5 h-5 ${meta.accentColor}`} />
            <span
              className={`text-sm font-semibold ${meta.accentColor}`}
              style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
            >
              {meta.subtitle}
            </span>
          </div>
          <h2
            className="text-2xl sm:text-3xl md:text-4xl font-bold text-charcoal mb-3"
            style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
          >
            {meta.title}
          </h2>
          <p
            className="text-base sm:text-lg text-charcoal/70 max-w-2xl"
            style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
          >
            {meta.description}
          </p>
        </m.div>
      ) : (
        <div className="mb-8 sm:mb-12">
          <div className={`inline-flex items-center gap-3 px-4 py-2 rounded-full bg-gradient-to-r ${meta.gradient} border ${meta.borderColor} mb-4`}>
            <IconComponent className={`w-5 h-5 ${meta.accentColor}`} />
            <span
              className={`text-sm font-semibold ${meta.accentColor}`}
              style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
            >
              {meta.subtitle}
            </span>
          </div>
          <h2
            className="text-2xl sm:text-3xl md:text-4xl font-bold text-charcoal mb-3"
            style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
          >
            {meta.title}
          </h2>
          <p
            className="text-base sm:text-lg text-charcoal/70 max-w-2xl"
            style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
          >
            {meta.description}
          </p>
        </div>
      )}

      {/* Badge Grid */}
      {groupKey === "specialist" ? (
        // Specialist badges grouped by category
        <div className="space-y-12">
          {Object.entries(groupedBadges).map(([categoryKey, categoryBadges]) => {
            const categoryMeta = SPECIALIST_CATEGORIES[categoryKey as keyof typeof SPECIALIST_CATEGORIES];
            if (!categoryMeta) return null;

            return (
              <div key={categoryKey}>
                {isDesktop ? (
                  <m.div
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    className="flex items-center gap-3 mb-6"
                  >
                    <span className="text-2xl">{categoryMeta.emoji}</span>
                    <h3
                      className="text-xl font-semibold text-charcoal"
                      style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
                    >
                      {categoryMeta.title}
                    </h3>
                    <div className="flex-1 h-px bg-charcoal/10" />
                  </m.div>
                ) : (
                  <div className="flex items-center gap-3 mb-6">
                    <span className="text-2xl">{categoryMeta.emoji}</span>
                    <h3
                      className="text-xl font-semibold text-charcoal"
                      style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
                    >
                      {categoryMeta.title}
                    </h3>
                    <div className="flex-1 h-px bg-charcoal/10" />
                  </div>
                )}
                {isDesktop ? (
                  <m.div
                    variants={containerVariants}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, margin: "-50px" }}
                    className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6"
                  >
                    {categoryBadges.map((badge, index) => (
                      <BadgeCard key={badge.id} badge={badge} index={index} />
                    ))}
                  </m.div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                    {categoryBadges.map((badge, index) => (
                      <BadgeCard key={badge.id} badge={badge} index={index} />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : isDesktop ? (
        // Other badge groups (desktop: animated)
        <m.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6"
        >
          {badges.map((badge, index) => (
            <BadgeCard key={badge.id} badge={badge} index={index} />
          ))}
        </m.div>
      ) : (
        // Other badge groups (mobile: no animation)
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
          {badges.map((badge, index) => (
            <BadgeCard key={badge.id} badge={badge} index={index} />
          ))}
        </div>
      )}
    </section>
  );
}
