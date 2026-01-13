"use client";

import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { MapPin, Star } from "lucide-react";

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
  { value: 3.0, label: "3.0+" },
  { value: 3.5, label: "3.5+" },
  { value: 4.0, label: "4.0+" },
  { value: 4.5, label: "4.5+" },
];

export default function InlineFilters({
  show,
  filters,
  onDistanceChange,
  onRatingChange,
}: InlineFiltersProps) {
  const prefersReducedMotion = useReducedMotion();

  const containerVariants = prefersReducedMotion
    ? {
        hidden: { opacity: 0 },
        visible: { opacity: 1 },
      }
    : {
        hidden: { opacity: 0, y: -6, height: 0 },
        visible: { opacity: 1, y: 0, height: "auto" },
      };

  const groupVariants = prefersReducedMotion
    ? {}
    : {
        hidden: { opacity: 0 },
        visible: {
          opacity: 1,
          transition: {
            staggerChildren: 0.04,
          },
        },
      };

  const chipVariants = prefersReducedMotion
    ? {}
    : {
        hidden: { opacity: 0, scale: 0.9 },
        visible: { opacity: 1, scale: 1 },
      };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          exit="hidden"
          transition={{ duration: 0.18, ease: "easeOut" }}
          className="overflow-hidden"
        >
          <div className="px-4 sm:px-6 pb-4 space-y-4">
            {/* Distance Filter Group */}
            <motion.div
              variants={groupVariants}
              initial="hidden"
              animate="visible"
              className="space-y-2"
            >
              <div className="flex items-center gap-2 text-sm font-semibold text-charcoal/70">
                <MapPin className="w-4 h-4" />
                <span style={{ fontFamily: 'Urbanist, system-ui, sans-serif' }}>Distance</span>
              </div>
              <div className="flex gap-2 flex-wrap">
                {DISTANCE_OPTIONS.map((option) => (
                  <motion.button
                    key={option.value}
                    variants={chipVariants}
                    onClick={() => onDistanceChange(option.value)}
                    className={`px-4 py-2 rounded-full text-sm font-semibold transition-all duration-200 ${
                      filters.distance === option.value
                        ? "bg-sage text-white shadow-md"
                        : "bg-white/80 text-charcoal/70 border border-charcoal/20 hover:border-sage hover:bg-sage/10"
                    }`}
                    style={{ fontFamily: 'Urbanist, system-ui, sans-serif', fontWeight: 600 }}
                  >
                    {option.label}
                  </motion.button>
                ))}
              </div>
            </motion.div>

            {/* Rating Filter Group */}
            <motion.div
              variants={groupVariants}
              initial="hidden"
              animate="visible"
              className="space-y-2"
            >
              <div className="flex items-center gap-2 text-sm font-semibold text-charcoal/70">
                <Star className="w-4 h-4 fill-current" />
                <span style={{ fontFamily: 'Urbanist, system-ui, sans-serif' }}>Minimum Rating</span>
              </div>
              <div className="flex gap-2 flex-wrap">
                {RATING_OPTIONS.map((option) => (
                  <motion.button
                    key={option.value}
                    variants={chipVariants}
                    onClick={() => onRatingChange(option.value)}
                    className={`px-4 py-2 rounded-full text-sm font-semibold transition-all duration-200 flex items-center gap-1.5 ${
                      filters.minRating === option.value
                        ? "bg-coral text-white shadow-md"
                        : "bg-white/80 text-charcoal/70 border border-charcoal/20 hover:border-coral hover:bg-coral/10"
                    }`}
                    style={{ fontFamily: 'Urbanist, system-ui, sans-serif', fontWeight: 600 }}
                  >
                    <Star className="w-3.5 h-3.5 fill-current" />
                    {option.label}
                  </motion.button>
                ))}
              </div>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
