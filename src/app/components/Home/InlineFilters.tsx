"use client";

import { m, AnimatePresence, useReducedMotion, Easing } from "framer-motion";
import { MapPin, Star } from "@/app/lib/icons";
import FilterPillGroup from "../Filters/FilterPillGroup";

interface InlineFiltersProps {
  show: boolean;
  filters: {
    minRating: number | null;
    distance: string | null;
  };
  onDistanceChange: (distance: string) => void;
  onRatingChange: (rating: number) => void;
}

const DISTANCE_OPTIONS = [
  { value: "1 km", label: "1 km" },
  { value: "5 km", label: "5 km" },
  { value: "10 km", label: "10 km" },
  { value: "20 km", label: "20 km" },
];

const RATING_OPTIONS = [
  { value: 3.0, label: "3.0+", icon: <Star className="w-3 h-3 fill-current" /> },
  { value: 3.5, label: "3.5+", icon: <Star className="w-3 h-3 fill-current" /> },
  { value: 4.0, label: "4.0+", icon: <Star className="w-3 h-3 fill-current" /> },
  { value: 4.5, label: "4.5+", icon: <Star className="w-3 h-3 fill-current" /> },
];

const easeOut: Easing = [0.25, 0.46, 0.45, 0.94];
const easeIn: Easing = [0.4, 0, 0.6, 1];

export default function InlineFilters({
  show,
  filters,
  onDistanceChange,
  onRatingChange,
}: InlineFiltersProps) {
  const prefersReducedMotion = useReducedMotion();

  const containerVariants = prefersReducedMotion
    ? { hidden: { opacity: 0 }, visible: { opacity: 1 }, exit: { opacity: 0 } }
    : {
        hidden: { opacity: 0, y: -20, scale: 0.95 },
        visible: {
          opacity: 1,
          y: 0,
          scale: 1,
          transition: { duration: 0.4, ease: easeOut },
        },
        exit: {
          opacity: 0,
          y: -15,
          scale: 0.96,
          transition: { duration: 0.25, ease: easeIn },
        },
      };

  return (
    <AnimatePresence mode="wait">
      {show && (
        <m.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          className="overflow-hidden"
        >
          <div className="px-4 sm:px-6 pb-4 space-y-4">
            {/* Distance Filter Group */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-charcoal/70">
                <MapPin className="w-4 h-4" />
                <span style={{ fontFamily: "Urbanist, system-ui, sans-serif" }}>
                  Distance
                </span>
              </div>
              <FilterPillGroup
                options={DISTANCE_OPTIONS}
                value={filters.distance}
                onChange={(v) => { if (v !== null) onDistanceChange(v); }}
                ariaLabel="Distance filter"
                size="sm"
              />
            </div>

            {/* Rating Filter Group */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-charcoal/70">
                <Star className="w-4 h-4 fill-current" />
                <span style={{ fontFamily: "Urbanist, system-ui, sans-serif" }}>
                  Minimum Rating
                </span>
              </div>
              <FilterPillGroup
                options={RATING_OPTIONS}
                value={filters.minRating}
                onChange={(v) => { if (v !== null) onRatingChange(v); }}
                ariaLabel="Minimum rating filter"
                size="sm"
              />
            </div>
          </div>
        </m.div>
      )}
    </AnimatePresence>
  );
}
