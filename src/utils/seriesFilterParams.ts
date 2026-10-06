/**
 * Étape 2 — pure helpers for series filter query params (no axios).
 */

export type AssignedBadgesSeriesFilter = {
  catalog_key?: string;
  badge_series_id?: number;
  /** legacy display name — avoid from UI after Étape 2 */
  badge_series?: string;
};

/** Apply series identity params (key > id > legacy name). */
export const applyAssignedBadgesSeriesFilter = (
  params: Record<string, unknown>,
  seriesFilter?: AssignedBadgesSeriesFilter
) => {
  if (!seriesFilter) return;
  if (seriesFilter.catalog_key) {
    params.catalog_key = seriesFilter.catalog_key;
  } else if (seriesFilter.badge_series_id != null) {
    params.badge_series_id = seriesFilter.badge_series_id;
  } else if (seriesFilter.badge_series) {
    params.badge_series = seriesFilter.badge_series;
  }
};

export type ProjectBadgesSeriesFilter = {
  catalog_key?: string;
  badge_series_id?: number;
  series?: string;
};

/** Append series identity to URLSearchParams (key > id > name). */
export const appendProjectBadgesSeriesParams = (
  params: URLSearchParams,
  filters?: ProjectBadgesSeriesFilter
) => {
  if (filters?.catalog_key) {
    params.append('catalog_key', filters.catalog_key);
  } else if (filters?.badge_series_id != null) {
    params.append('badge_series_id', String(filters.badge_series_id));
  } else if (filters?.series) {
    params.append('series', filters.series);
  }
};
