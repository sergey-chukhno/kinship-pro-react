/**
 * C11/C12 + C2/C16 — client-side series identity: catalog_key / badge_series_id only.
 * No display-name equality and no name→key dual-read (Patrick: server carries the key).
 */

export function badgeMatchesSelectedCatalogKey(
  badge: { catalog_key?: string | null; series?: string | null },
  selectedCatalogKey: string
): boolean {
  if (!selectedCatalogKey) return true;
  return badge.catalog_key === selectedCatalogKey;
}

/** Affiche / filters: match by catalog_key, else badge_series_id. Never by series display name. */
export function badgeMatchesSeriesIdentity(
  badge: {
    catalog_key?: string | null;
    badge_series_id?: number | null;
    series?: string | null;
  },
  selected: { catalog_key?: string | null; badge_series_id?: number | null } | string
): boolean {
  if (typeof selected === 'string') {
    if (!selected) return true;
    if (badge.catalog_key && badge.catalog_key === selected) return true;
    if (badge.badge_series_id != null && String(badge.badge_series_id) === selected) return true;
    return false;
  }
  if (!selected.catalog_key && selected.badge_series_id == null) return true;
  if (selected.catalog_key && badge.catalog_key === selected.catalog_key) return true;
  if (
    selected.badge_series_id != null &&
    badge.badge_series_id != null &&
    badge.badge_series_id === selected.badge_series_id
  ) {
    return true;
  }
  return false;
}

/** Stable option value for selects: catalog_key preferred, else badge_series_id. */
export function seriesIdentityValue(badge: {
  catalog_key?: string | null;
  badge_series_id?: number | null;
}): string | null {
  if (badge.catalog_key) return badge.catalog_key;
  if (badge.badge_series_id != null) return String(badge.badge_series_id);
  return null;
}
