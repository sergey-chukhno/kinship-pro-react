/**
 * C13 — ProjectManagement series filter identity (catalog_key only).
 */

import { CATALOG_KEY_API_SERIES_NAME } from '../constants/catalogSeries';

const KNOWN_CATALOG_KEYS = new Set(Object.keys(CATALOG_KEY_API_SERIES_NAME));

/** True when value is an Étape-2 catalogue key (not a display name). */
export function isKnownCatalogKey(value: string): boolean {
  return KNOWN_CATALOG_KEYS.has(value);
}

export type ProjectBadgesIdentityFilter = {
  catalog_key?: string;
  level?: string;
  sender_id?: number;
  receiver_query?: string;
};

/** Build getProjectBadges series identity — never includes display-name `series`. */
export function buildProjectBadgesSeriesIdentity(
  badgeSeriesFilter: string
): Pick<ProjectBadgesIdentityFilter, 'catalog_key'> {
  if (!badgeSeriesFilter) return {};
  if (isKnownCatalogKey(badgeSeriesFilter)) {
    return { catalog_key: badgeSeriesFilter };
  }
  return {};
}

/** Level filter UI is shown only for these project-badge select keys. */
export const PROJECT_BADGES_LEVEL_FILTER_CATALOG_KEYS = [
  'soft_skills',
  'parcours_des_possibles',
  'audiovisuelle',
  'parcours_professionnel',
] as const;

export function showProjectBadgesLevelFilter(badgeSeriesFilter: string): boolean {
  return (PROJECT_BADGES_LEVEL_FILTER_CATALOG_KEYS as readonly string[]).includes(badgeSeriesFilter);
}
