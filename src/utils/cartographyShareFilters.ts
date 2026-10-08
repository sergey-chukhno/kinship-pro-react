/**
 * C15 — cartography share write identity (catalog_key / badge_series_id only).
 */

export type CartographyShareWriteFilters = {
  catalog_key?: string;
  badge_series_id?: number;
  level?: string;
  searchTerm?: string;
};

/** Strip display-name series; keep key/id identity fields for POST share. */
export function sanitizeCartographyShareFilters(filters: {
  catalog_key?: string;
  badge_series_id?: number;
  level?: string;
  searchTerm?: string;
  series?: string;
}): CartographyShareWriteFilters {
  return {
    catalog_key: filters.catalog_key || undefined,
    badge_series_id: filters.badge_series_id != null ? filters.badge_series_id : undefined,
    level: filters.level || undefined,
    searchTerm: filters.searchTerm || undefined,
  };
}
