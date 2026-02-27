// src/components/EventsPage/FilterTabs.tsx
"use client";

import FilterPillGroup from "../Filters/FilterPillGroup";

interface FilterTabsProps {
  selectedFilter: "all" | "event" | "special";
  onFilterChange: (filter: "all" | "event" | "special") => void;
}

const TABS = [
  { value: "all" as const, label: "All" },
  { value: "event" as const, label: "Events" },
  { value: "special" as const, label: "Specials" },
];

export default function FilterTabs({
  selectedFilter,
  onFilterChange,
}: FilterTabsProps) {
  return (
    <FilterPillGroup
      options={TABS}
      value={selectedFilter}
      onChange={(v) => onFilterChange(v ?? "all")}
      ariaLabel="Event type filter"
      size="md"
    />
  );
}
