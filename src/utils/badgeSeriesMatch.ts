/**
 * C11/C12 — client-side series identity: catalog_key only (never display-name equality).
 * Dual-read via resolveCatalogKey when payload omits catalog_key (temporary until BE always returns key).
 */

import { resolveCatalogKey } from '../constants/catalogSeries';

export function badgeMatchesSelectedCatalogKey(
  badge: { catalog_key?: string | null; series?: string | null },
  selectedCatalogKey: string
): boolean {
  if (!selectedCatalogKey) return true;
  if (badge.catalog_key === selectedCatalogKey) return true;
  return resolveCatalogKey({ catalog_key: badge.catalog_key, series: badge.series }) === selectedCatalogKey;
}
