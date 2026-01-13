"use client";

import React, { useState, useRef, useEffect } from 'react';
import { MapPin, ChevronDown, Star, SlidersHorizontal, X } from 'lucide-react';
import { useFilters } from '@/app/contexts/FilterContext';
import { DistanceOption } from '@/app/types/filters';

export function FilterBar() {
  const {
    filters,
    setLocation,
    setMinRating,
    toggleAdvanced,
    hasActiveFilters,
    resetFilters,
  } = useFilters();

  const [showLocationMenu, setShowLocationMenu] = useState(false);
  const [showRatingMenu, setShowRatingMenu] = useState(false);

  const locationRef = useRef<HTMLDivElement>(null);
  const ratingRef = useRef<HTMLDivElement>(null);

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (locationRef.current && !locationRef.current.contains(event.target as Node)) {
        setShowLocationMenu(false);
      }
      if (ratingRef.current && !ratingRef.current.contains(event.target as Node)) {
        setShowRatingMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleDistanceChange = (km: DistanceOption) => {
    setLocation({
      ...filters.location,
      radiusKm: km,
    });
    setShowLocationMenu(false);
  };

  const handleRatingChange = (rating: number) => {
    setMinRating(rating);
    setShowRatingMenu(false);
  };

  const distanceOptions: DistanceOption[] = [1, 5, 10, 20];
  const ratingOptions = [3.0, 3.5, 4.0, 4.5];

  return (
    <div className="sticky top-0 z-30 bg-off-white border-b border-charcoal/10 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar">
          {/* Location/Distance Filter */}
          <div ref={locationRef} className="relative flex-shrink-0">
            <button
              onClick={() => setShowLocationMenu(!showLocationMenu)}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-charcoal/20 rounded-full text-sm font-semibold text-charcoal hover:border-sage hover:bg-sage/5 transition-all duration-200"
              style={{ fontFamily: 'Urbanist, system-ui, sans-serif', fontWeight: 600 }}
            >
              <MapPin className="w-4 h-4" />
              <span>{filters.location.radiusKm === 20 ? 'Near Me' : `Within ${filters.location.radiusKm} km`}</span>
              <ChevronDown className={`w-4 h-4 transition-transform ${showLocationMenu ? 'rotate-180' : ''}`} />
            </button>

            {showLocationMenu && (
              <div className="absolute top-full left-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-charcoal/10 py-2 z-50">
                {distanceOptions.map((km) => (
                  <button
                    key={km}
                    onClick={() => handleDistanceChange(km)}
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-sage/10 transition-colors ${
                      filters.location.radiusKm === km ? 'bg-sage/20 font-semibold text-sage' : 'text-charcoal'
                    }`}
                    style={{ fontFamily: 'Urbanist, system-ui, sans-serif' }}
                  >
                    {km === 20 ? 'Near Me (within 20km)' : `Within ${km} km`}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Rating Filter */}
          <div ref={ratingRef} className="relative flex-shrink-0">
            <button
              onClick={() => setShowRatingMenu(!showRatingMenu)}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-charcoal/20 rounded-full text-sm font-semibold text-charcoal hover:border-sage hover:bg-sage/5 transition-all duration-200"
              style={{ fontFamily: 'Urbanist, system-ui, sans-serif', fontWeight: 600 }}
            >
              <Star className="w-4 h-4 fill-current" />
              <span>{filters.minRating}+</span>
              <ChevronDown className={`w-4 h-4 transition-transform ${showRatingMenu ? 'rotate-180' : ''}`} />
            </button>

            {showRatingMenu && (
              <div className="absolute top-full left-0 mt-2 w-40 bg-white rounded-xl shadow-lg border border-charcoal/10 py-2 z-50">
                {ratingOptions.map((rating) => (
                  <button
                    key={rating}
                    onClick={() => handleRatingChange(rating)}
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-sage/10 transition-colors flex items-center gap-2 ${
                      filters.minRating === rating ? 'bg-sage/20 font-semibold text-sage' : 'text-charcoal'
                    }`}
                    style={{ fontFamily: 'Urbanist, system-ui, sans-serif' }}
                  >
                    <Star className="w-3 h-3 fill-current" />
                    {rating}+ stars
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* More Filters Button */}
          <button
            onClick={toggleAdvanced}
            className={`flex items-center gap-2 px-4 py-2 border rounded-full text-sm font-semibold transition-all duration-200 flex-shrink-0 ${
              hasActiveFilters
                ? 'bg-sage text-white border-sage'
                : 'bg-white text-charcoal border-charcoal/20 hover:border-sage hover:bg-sage/5'
            }`}
            style={{ fontFamily: 'Urbanist, system-ui, sans-serif', fontWeight: 600 }}
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span>More Filters</span>
            {hasActiveFilters && (
              <span className="bg-white text-sage rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">
                {filters.activeFiltersCount}
              </span>
            )}
          </button>

          {/* Reset Filters Button (only show if filters are active) */}
          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-charcoal/70 hover:text-charcoal transition-colors flex-shrink-0"
              style={{ fontFamily: 'Urbanist, system-ui, sans-serif' }}
            >
              <X className="w-4 h-4" />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
