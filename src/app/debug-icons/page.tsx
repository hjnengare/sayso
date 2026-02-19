"use client";

import { Zap, Heart, Star, CheckCircle } from "lucide-react";
import PercentileChip from "../components/PercentileChip/PercentileChip";

export default function DebugIconsPage() {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <h1 className="text-lg font-bold">Icon Debug Page</h1>
        
        {/* Direct icon test */}
        <section className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Direct Lucide Icons Test</h2>
          <div className="flex gap-4 items-center">
            <div className="flex items-center gap-2">
              <Zap className="w-6 h-6 text-red-500" />
              <span>Zap (Red)</span>
            </div>
            <div className="flex items-center gap-2">
              <Heart className="w-6 h-6 text-red-500" />
              <span>Heart (Red)</span>
            </div>
            <div className="flex items-center gap-2">
              <Star className="w-6 h-6 text-red-500" />
              <span>Star (Red)</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-6 h-6 text-red-500" />
              <span>CheckCircle (Red)</span>
            </div>
          </div>
        </section>

        {/* Percentile chip test */}
        <section className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Percentile Chip Test</h2>
          <div className="flex gap-4 flex-wrap">
            <PercentileChip label="speed" value={85} />
            <PercentileChip label="hospitality" value={92} />
            <PercentileChip label="quality" value={78} />
            <PercentileChip label="unknown" value={65} />
          </div>
        </section>

        {/* Manual icon test with filled icons */}
        <section className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Manual Icon Test (Filled)</h2>
          <div className="flex gap-4 flex-wrap">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 shadow-sm border-none backdrop-blur-sm">
              <Zap className="w-3.5 h-3.5 text-sage flex-shrink-0" fill="currentColor" />
              <span className="font-urbanist text-sm font-700 text-sage whitespace-nowrap">85%</span>
            </div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 shadow-sm border-none backdrop-blur-sm">
              <Heart className="w-3.5 h-3.5 text-sage flex-shrink-0" fill="currentColor" />
              <span className="font-urbanist text-sm font-700 text-sage whitespace-nowrap">92%</span>
            </div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 shadow-sm border-none backdrop-blur-sm">
              <Star className="w-3.5 h-3.5 text-sage flex-shrink-0" fill="currentColor" />
              <span className="font-urbanist text-sm font-700 text-sage whitespace-nowrap">78%</span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
