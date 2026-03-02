"use client";

import { Bookmark } from "@/app/lib/icons";

export default function EmptySavedState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-16 h-16 mb-4 bg-charcoal/8 rounded-full flex items-center justify-center">
        <Bookmark className="w-8 h-8 text-charcoal/35" strokeWidth={1.5} aria-hidden />
      </div>
      <p
        className="text-[15px] font-semibold text-charcoal/50"
        style={{ fontFamily: "'Urbanist', system-ui, sans-serif" }}
      >
        No saved items yet
      </p>
      <p
        className="text-[13px] text-charcoal/38 mt-1"
        style={{ fontFamily: "'Urbanist', system-ui, sans-serif" }}
      >
        Tap the bookmark icon on any business to save it here
      </p>
    </div>
  );
}
