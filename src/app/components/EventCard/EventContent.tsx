// src/components/EventCard/EventContent.tsx
"use client";

import Link from "next/link";
import { MapPin } from "@/app/lib/icons";

interface EventContentProps {
  title: string;
  location: string;
  description?: string;
  href?: string;
}

export default function EventContent({ title, location, description, href }: EventContentProps) {
  return (
    <div className="pt-4 pb-4 px-4 relative flex-shrink-0 z-10 flex flex-col justify-between min-h-0 bg-gradient-to-b from-transparent to-card-bg/50">
      <div className="flex-shrink-0">
        <div className="mb-1">
          <h3 className="text-base font-400 text-charcoal/90 text-center line-clamp-2 tracking-tight font-sf-pro">
            {title}
          </h3>
        </div>

        <div className="mb-2 flex items-center justify-center gap-1.5 text-sm sm:text-xs text-charcoal/70 font-urbanist">
          <MapPin className="w-3 h-3 text-charcoal/70" />
          <span className="truncate font-medium">{location}</span>
        </div>
      </div>


      {/* Learn More Button - Fixed at bottom */}
      <div className="flex justify-center mt-auto pt-3 pb-2 flex-shrink-0">
        <button className="w-full max-w-[300px] py-2 bg-gradient-to-r from-coral to-coral/90 text-white text-sm sm:text-xs font-600 font-urbanist rounded-full hover:from-coral/90 hover:to-coral/80 transition-all duration-300 hover:shadow-lg hover:scale-105 shadow-md">
          Learn More
        </button>
      </div>

      {/* Decorative bottom accent */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-16 h-1 bg-gradient-to-r from-transparent via-coral/30 to-transparent rounded-full" />
    </div>
  );
}
