"use client";

import { memo } from "react";
import { Sparkles, Grid3x3 } from "lucide-react";
import { Business } from "../BusinessCard/BusinessCard";
import SavedBusinessesGrid from "./SavedBusinessesGrid";
import EmptySavedState from "./EmptySavedState";

interface SavedContentProps {
  savedBusinesses: Business[];
}

function SavedContent({ savedBusinesses }: SavedContentProps) {
  return (
    <section
      className="relative"
      style={{
        fontFamily: '"Urbanist", system-ui, sans-serif',
      }}
    >
      <div className="mx-auto w-full max-w-[2000px] px-2 relative z-10">
        {savedBusinesses.length > 0 && (
          <div className="mb-6 flex items-center gap-3">
            <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-sage/10 to-coral/10 rounded-full backdrop-blur-sm border border-sage/20">
              <Sparkles className="w-4 h-4 text-sage" />
              <h2 className="font-urbanist text-sm font-600 text-charcoal">
                Your Collection
              </h2>
            </div>
            <div className="h-px flex-1 bg-gradient-to-r from-sage/20 via-transparent to-transparent" />
          </div>
        )}

        {savedBusinesses.length > 0 ? (
          <SavedBusinessesGrid savedBusinesses={savedBusinesses} />
        ) : (
          <EmptySavedState />
        )}
      </div>
    </section>
  );
}

export default memo(SavedContent);
