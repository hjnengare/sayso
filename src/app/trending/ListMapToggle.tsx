"use client";

import { List, Map as MapIcon } from "@/app/lib/icons";

interface ListMapToggleProps {
  isMapMode: boolean;
  onListMode: () => void;
  onMapMode: () => void;
  mapBusinessCount: number;
}

export default function ListMapToggle({
  isMapMode,
  onListMode,
  onMapMode,
  mapBusinessCount,
}: ListMapToggleProps) {
  return (
    <div className="mb-4 px-2 flex items-center justify-end">
      <div className="flex items-center gap-1 bg-white/80 backdrop-blur-sm rounded-full p-1 border border-white/30 shadow-sm">
        <button
          onClick={() => {
            console.log('[Trending] Switching to List mode');
            onListMode();
          }}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 ${
            !isMapMode
              ? 'bg-card-bg text-white shadow-sm'
              : 'text-charcoal/70 hover:text-charcoal'
          }`}
        >
          <List className="w-3.5 h-3.5" />
          List
        </button>
        <button
          onClick={() => {
            console.log('[Trending] Switching to Map mode, businesses:', mapBusinessCount);
            onMapMode();
          }}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 ${
            isMapMode
              ? 'bg-coral text-white shadow-sm'
              : 'text-charcoal/70 hover:text-charcoal'
          }`}
        >
          <MapIcon className="w-3.5 h-3.5" />
          Map
        </button>
      </div>
    </div>
  );
}
