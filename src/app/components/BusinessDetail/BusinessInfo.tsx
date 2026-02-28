// src/components/BusinessDetail/BusinessInfo.tsx
"use client";

import { m } from "framer-motion";
import { MapPin } from "lucide-react";
import GoldStar from "../Icons/GoldStar";

interface BusinessInfoProps {
  name: string;
  rating: number;
  location: string;
  category?: string;
  sharedTitleLayoutId?: string;
}

export default function BusinessInfo({ name, rating, location, category, sharedTitleLayoutId }: BusinessInfoProps) {
  return (
    <m.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2, duration: 0.6 }}
    >
      <m.h1
        layoutId={sharedTitleLayoutId}
        className="font-google-sans text-2xl sm:text-3xl md:text-4xl font-bold text-charcoal mb-3"
        style={{ fontFamily: '"Google Sans", -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
      >
        {name}
      </m.h1>

      <div className="flex items-center gap-3 mb-4 flex-wrap">
        {/* Rating Badge - matching BusinessCard style */}
        <div className="inline-flex items-center gap-1 rounded-full bg-off-white/95 backdrop-blur-xl px-3 py-1.5 text-charcoal border-none">
          <GoldStar size={14} className="w-3.5 h-3.5" />
          <span
            className="text-body-sm font-semibold text-charcoal"
            style={{ 
              fontFamily: '"Google Sans", -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
              fontWeight: 600
            }}
          >
            {Number(rating).toFixed(1)}
          </span>
        </div>
        {category && (
          <div className="inline-flex items-center gap-1.5 text-charcoal/70">
            <span
              className="text-body-sm font-medium"
              style={{ fontFamily: '"Google Sans", -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
            >
              {category}
            </span>
          </div>
        )}
        <div className="flex items-center gap-1.5 text-charcoal/70">
          <span className="grid h-6 w-6 flex-shrink-0 place-items-center rounded-full bg-off-white/70 hover:bg-off-white/90 transition-colors">
            <MapPin className="w-3 h-3 text-charcoal/85" />
          </span>
          <span
            className="text-body-sm font-medium"
            style={{ fontFamily: '"Google Sans", -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
          >
            {location}
          </span>
        </div>
      </div>
    </m.div>
  );
}






