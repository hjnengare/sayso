"use client";

import { RefObject } from "react";
import SearchInput from "../components/SearchInput/SearchInput";
import { FilterState } from "../components/FilterModal/FilterModal";
import ActiveFilterBadges from "../components/FilterActiveBadges/ActiveFilterBadges";
import InlineFilters from "../components/Home/InlineFilters";

interface SearchFilterBarProps {
  searchWrapRef: RefObject<HTMLDivElement>;
  isSearching: boolean;
  filters: FilterState;
  onSearch: (query: string) => void;
  onSubmitQuery: (query: string) => void;
  onDistanceChange: (distance: string) => void;
  onRatingChange: (rating: number) => void;
  onRemoveFilter: (filterType: 'minRating' | 'distance') => void;
  onUpdateFilter: (filterType: 'minRating' | 'distance', value: number | string | null) => void;
  onClearAll: () => void;
}

export default function SearchFilterBar({
  searchWrapRef,
  isSearching,
  filters,
  onSearch,
  onSubmitQuery,
  onDistanceChange,
  onRatingChange,
  onRemoveFilter,
  onUpdateFilter,
  onClearAll,
}: SearchFilterBarProps) {
  return (
    <>
      {/* Search Input */}
      <div ref={searchWrapRef} className="relative z-10 py-3 sm:py-4 px-4">
        <SearchInput
          variant="header"
          placeholder="Search trending businesses..."
          mobilePlaceholder="Search trending..."
          onSearch={onSearch}
          onSubmitQuery={onSubmitQuery}
          showFilter={false}
          enableSuggestions={true}
        />
      </div>

      {/* Inline Filters - Only show when searching */}
      <InlineFilters
        show={isSearching}
        filters={filters}
        onDistanceChange={onDistanceChange}
        onRatingChange={onRatingChange}
      />

      {/* Active Filter Badges - Show when filters are active */}
      <ActiveFilterBadges
        filters={filters}
        onRemoveFilter={(filterType) => {
          onRemoveFilter(filterType);
        }}
        onUpdateFilter={onUpdateFilter}
        onClearAll={onClearAll}
      />
    </>
  );
}
