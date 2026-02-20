/**
 * Shared SWR configuration for API data fetching.
 * Provides stale-while-revalidate caching and deduplication.
 */

export const swrConfig = {
  revalidateOnFocus: false, // We handle visibility-based refetch in hooks
  dedupingInterval: 5000,   // Avoid duplicate requests within 5s
  revalidateOnReconnect: true,
} as const;
