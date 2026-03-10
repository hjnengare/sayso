"use client";

import { useState, useEffect } from "react";
import { useDebounce } from "./useDebounce";

export interface QuerySuggestion {
  query: string;
  type: "category" | "location";
  count: number;
}

export function useSearchSuggestions({
  query,
  debounceMs = 200,
}: {
  query: string;
  debounceMs?: number;
}) {
  const debouncedQuery = useDebounce(query, debounceMs);
  const [suggestions, setSuggestions] = useState<QuerySuggestion[]>([]);
  const [loading, setLoading] = useState(false);

  // Clear immediately when the raw query drops below the minimum — prevents
  // stale suggestions from showing while the next debounce is still pending.
  useEffect(() => {
    if (query.trim().length < 2) {
      setSuggestions([]);
    }
  }, [query]);

  // Fetch with an AbortController so superseded requests are cancelled and
  // their responses never update state.
  useEffect(() => {
    const trimmed = debouncedQuery.trim();
    if (trimmed.length < 2) {
      setSuggestions([]);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    let cancelled = false;

    setLoading(true);

    fetch(`/api/search/suggestions?q=${encodeURIComponent(trimmed)}`, {
      signal: controller.signal,
    })
      .then((res) => (res.ok ? res.json() : { suggestions: [] }))
      .then((data) => {
        if (!cancelled) setSuggestions(data.suggestions ?? []);
      })
      .catch(() => {
        if (!cancelled) setSuggestions([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [debouncedQuery]);

  return { suggestions, loading };
}
