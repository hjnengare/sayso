"use client";

import { memo } from "react";
import SubcategoryGroup from "./SubcategoryGroup";

interface SubcategoryItem {
  id: string;
  label: string;
  interest_id: string;
}

interface GroupedSubcategories {
  [interestId: string]: {
    title: string;
    items: SubcategoryItem[];
  };
}

interface SubcategoryGridProps {
  groupedSubcategories: GroupedSubcategories;
  selectedSubcategories: Array<{ id: string; interest_id: string }>;
  maxSelections: number;
  onToggle: (id: string, interestId: string) => void;
  subcategories: SubcategoryItem[];
  loading: boolean;
  shakingIds?: Set<string>;
}

function SubcategoryGrid({ 
  groupedSubcategories, 
  selectedSubcategories, 
  maxSelections,
  onToggle, 
  subcategories, 
  loading,
  shakingIds = new Set()
}: SubcategoryGridProps) {
  const sfPro = {
    fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
  };

  return (
    <div
      className="space-y-6 animate-fade-in-up"
    >
      {Object.entries(groupedSubcategories).map(([interestId, group], groupIndex) => (
        <SubcategoryGroup
          key={interestId}
          interestId={interestId}
          title={group.title}
          items={group.items}
          selectedSubcategories={selectedSubcategories}
          maxSelections={maxSelections}
          onToggle={onToggle}
          groupIndex={groupIndex}
          shakingIds={shakingIds}
        />
      ))}

      {subcategories.length === 0 && !loading && (
        <div
          className="text-center text-charcoal/60 py-8 animate-fade-in-up"
          style={sfPro}
        >
          <p>No subcategories found for your selected interests.</p>
        </div>
      )}
    </div>
  );
}

export default memo(SubcategoryGrid);
