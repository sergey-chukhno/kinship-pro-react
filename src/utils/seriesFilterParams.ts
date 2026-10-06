/**
 * Étape 2 — pure helpers for series filter query params (no axios).
 * Identity for API writes: catalog_key > badge_series_id only (never display name).
 */

export type AssignedBadgesSeriesFilter = {
  catalog_key?: string;
  badge_series_id?: number;
};

/** Apply series identity params (catalog_key > badge_series_id). */
export const applyAssignedBadgesSeriesFilter = (
  params: Record<string, unknown>,
  seriesFilter?: AssignedBadgesSeriesFilter
) => {
  if (!seriesFilter) return;
  if (seriesFilter.catalog_key) {
    params.catalog_key = seriesFilter.catalog_key;
  } else if (seriesFilter.badge_series_id != null) {
    params.badge_series_id = seriesFilter.badge_series_id;
  }
};

export type ProjectBadgesSeriesFilter = {
  catalog_key?: string;
  badge_series_id?: number;
};

/** Append series identity to URLSearchParams (catalog_key > badge_series_id). */
export const appendProjectBadgesSeriesParams = (
  params: URLSearchParams,
  filters?: ProjectBadgesSeriesFilter
) => {
  if (filters?.catalog_key) {
    params.append('catalog_key', filters.catalog_key);
  } else if (filters?.badge_series_id != null) {
    params.append('badge_series_id', String(filters.badge_series_id));
  }
};
