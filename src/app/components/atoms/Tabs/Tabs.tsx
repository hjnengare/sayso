'use client';

import React from 'react';

export interface Tab {
  id: string;
  label: string;
}

export interface TabsProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  className?: string;
}

export const Tabs: React.FC<TabsProps> = ({
  tabs,
  activeTab,
  onTabChange,
  className = '',
}) => {
  return (
    <div className={`inline-flex gap-1 sm:gap-2 p-1 bg-white/80 backdrop-blur-sm border-2 border-charcoal/20 rounded-full ${className}`}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`
              px-3 sm:px-4 md:px-6 py-2 sm:py-2.5 rounded-full font-google-sans font-semibold text-xs sm:text-sm
              transition-all duration-300
              focus:outline-none focus:ring-2 focus:ring-sage/30
              whitespace-nowrap
              ${
                isActive
                  ? 'bg-gradient-to-br from-sage to-sage/90 text-white shadow-md'
                  : 'text-charcoal/70 hover:text-charcoal hover:bg-charcoal/5'
              }
            `}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
};

Tabs.displayName = 'Tabs';

