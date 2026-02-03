/**
 * Cache TTL values in seconds.
 * Organized by data volatility.
 */
export const CACHE_TTL = {
  /** Static/rarely changing data - 1 hour */
  STATIC: 3600,

  /** Semi-static data like categories, types - 30 minutes */
  SEMI_STATIC: 1800,

  /** Detail pages - 30 minutes */
  DETAIL: 1800,

  /** List/search results - 10 minutes */
  LIST: 600,

  /** Featured/popular items - 15 minutes */
  FEATURED: 900,

  /** User-specific data - 5 minutes (shorter for freshness) */
  USER_DATA: 300,

  /** High-frequency user data like cart - 2 minutes */
  USER_VOLATILE: 120,
} as const;

export type CacheTTL = (typeof CACHE_TTL)[keyof typeof CACHE_TTL];
