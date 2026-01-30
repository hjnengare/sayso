"use client";

import { createContext, useContext, useState, useCallback, useMemo, ReactNode } from "react";

interface HomeSearchContextValue {
  /** Current search query (used by header input) */
  searchQuery: string;
  /** Update search query (called by header on input change) */
  setSearchQuery: (query: string) => void;
  /** Whether search mode is active (query is non-empty) */
  isSearchActive: boolean;
  /** Clear search and exit search mode */
  clearSearch: () => void;
}

const HomeSearchContext = createContext<HomeSearchContextValue | null>(null);

export function HomeSearchProvider({ children }: { children: ReactNode }) {
  const [searchQuery, setSearchQueryState] = useState("");

  const setSearchQuery = useCallback((query: string) => {
    setSearchQueryState(query);
  }, []);

  const clearSearch = useCallback(() => {
    setSearchQueryState("");
  }, []);

  const isSearchActive = useMemo(() => searchQuery.trim().length > 0, [searchQuery]);

  const value = useMemo<HomeSearchContextValue>(
    () => ({
      searchQuery,
      setSearchQuery,
      isSearchActive,
      clearSearch,
    }),
    [searchQuery, setSearchQuery, isSearchActive, clearSearch]
  );

  return (
    <HomeSearchContext.Provider value={value}>
      {children}
    </HomeSearchContext.Provider>
  );
}

export function useHomeSearch(): HomeSearchContextValue {
  const context = useContext(HomeSearchContext);
  if (!context) {
    // Return a no-op context for pages that don't have the provider
    return {
      searchQuery: "",
      setSearchQuery: () => {},
      isSearchActive: false,
      clearSearch: () => {},
    };
  }
  return context;
}
