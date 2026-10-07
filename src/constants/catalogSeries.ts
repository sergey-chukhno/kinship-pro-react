/**
 * Catalogue series identity — R1 / Étape 2 FE Rimma.
 * Defaults / fetch identity = catalog_key; user selects = badge_series_id; display = series name only.
 * Org/project/share filters use catalog_key (BE Étape 1 dual filter).
 */

import { BadgeAPI } from '../types';
import {
  SOFT_SKILLS_SERIES_NAME,
  SOFT_SKILLS_SERIES_NAME_LEGACY,
  isSoftSkillsSeries as isSoftSkillsSeriesByName,
} from '../utils/badgeLevelLabels';

export const CATALOG_KEY_SOFT_SKILLS = 'soft_skills';
export const CATALOG_KEY_CPS = 'competences_psychosociales';
export const CATALOG_KEY_ORIENTER = 'competences_orienter_college';
export const CATALOG_KEY_MER = 'metiers_de_la_mer';
export const CATALOG_KEY_AUDIOVISUELLE = 'audiovisuelle';
export const CATALOG_KEY_PARCOURS_DES_POSSIBLES = 'parcours_des_possibles';
export const CATALOG_KEY_PARCOURS_PROFESSIONNEL = 'parcours_professionnel';

/** Display labels for catalogue keys (UI / PDF only — not filter identity). */
export const CATALOG_KEY_API_SERIES_NAME: Record<string, string> = {
  [CATALOG_KEY_SOFT_SKILLS]: SOFT_SKILLS_SERIES_NAME,
  [CATALOG_KEY_CPS]: 'Compétences psychosociales',
  [CATALOG_KEY_ORIENTER]: "Série Compétences à s'orienter - Collège",
  [CATALOG_KEY_MER]: 'Série Métiers de la mer',
  [CATALOG_KEY_AUDIOVISUELLE]: 'Série Audiovisuelle',
  [CATALOG_KEY_PARCOURS_DES_POSSIBLES]: 'Série Parcours des possibles',
  [CATALOG_KEY_PARCOURS_PROFESSIONNEL]: 'Série Parcours professionnel',
};

/** Cartographie V1.1 tab order — catalogue keys (not display names). */
export const CARTOGRAPHIE_V1_1_CATALOG_KEYS = [
  CATALOG_KEY_SOFT_SKILLS,
  CATALOG_KEY_ORIENTER,
  CATALOG_KEY_MER,
  CATALOG_KEY_CPS,
] as const;

export type CartographieCatalogKey = (typeof CARTOGRAPHIE_V1_1_CATALOG_KEYS)[number];

export interface CatalogSeriesOption {
  /** badge_series_id when known from API; null for key-only defaults before load */
  id: number | null;
  catalog_key: string | null;
  label: string;
  /** Current API display / legacy filter name */
  apiSeriesName: string;
}

/** Resolve catalog_key from key, badge payload, or legacy display name. */
export function resolveCatalogKey(input?: {
  catalog_key?: string | null;
  series?: string | null;
}): string | null {
  if (input?.catalog_key) return input.catalog_key;
  const series = input?.series;
  if (!series) return null;
  if (isSoftSkillsSeriesByName(series) || series === 'Série TouKouLeur') {
    return CATALOG_KEY_SOFT_SKILLS;
  }
  const entry = Object.entries(CATALOG_KEY_API_SERIES_NAME).find(([, name]) => name === series);
  return entry ? entry[0] : null;
}

export function isSoftSkillsCatalog(input?: {
  catalog_key?: string | null;
  series?: string | null;
}): boolean {
  if (input?.catalog_key === CATALOG_KEY_SOFT_SKILLS) return true;
  return isSoftSkillsSeriesByName(input?.series) || input?.series === 'Série TouKouLeur';
}

export function isCpsCatalog(input?: {
  catalog_key?: string | null;
  series?: string | null;
}): boolean {
  if (input?.catalog_key === CATALOG_KEY_CPS) return true;
  return input?.series === 'Compétences psychosociales';
}

export function isOrienterCatalog(input?: {
  catalog_key?: string | null;
  series?: string | null;
}): boolean {
  if (input?.catalog_key === CATALOG_KEY_ORIENTER) return true;
  return input?.series === CATALOG_KEY_API_SERIES_NAME[CATALOG_KEY_ORIENTER];
}

export function isMerCatalog(input?: {
  catalog_key?: string | null;
  series?: string | null;
}): boolean {
  if (input?.catalog_key === CATALOG_KEY_MER) return true;
  return input?.series === CATALOG_KEY_API_SERIES_NAME[CATALOG_KEY_MER];
}

export function displayLabelForCatalogKey(catalogKey: string): string {
  if (catalogKey === CATALOG_KEY_SOFT_SKILLS) return SOFT_SKILLS_SERIES_NAME;
  return CATALOG_KEY_API_SERIES_NAME[catalogKey] || catalogKey;
}

/** Stable group key for attestation / event series lists (id > catalog_key > name). */
export function seriesGroupKey(badge: {
  badge_series_id?: number | null;
  catalog_key?: string | null;
  series?: string | null;
}): string {
  if (badge.badge_series_id != null) return `id:${badge.badge_series_id}`;
  if (badge.catalog_key) return `key:${badge.catalog_key}`;
  return `name:${badge.series || ''}`;
}

/** Build cartography share/export series filters (Étape 2).
 * Identity only: catalog_key and/or badge_series_id — never display name.
 */
export function buildCartographyShareSeriesFilters(input: {
  catalog_key?: string | null;
  badge_series_id?: number | null;
  level?: string;
  searchTerm?: string;
}): {
  catalog_key?: string;
  badge_series_id?: number;
  level?: string;
  searchTerm?: string;
} {
  const catalog_key = input.catalog_key || undefined;
  return {
    catalog_key,
    badge_series_id: input.badge_series_id != null ? input.badge_series_id : undefined,
    level: input.level,
    searchTerm: input.searchTerm,
  };
}

/** Unique series options from catalogue badges — select value = badge_series_id when present. */
export function seriesOptionsFromBadges(badges: BadgeAPI[]): CatalogSeriesOption[] {
  const byId = new Map<string, CatalogSeriesOption>();
  for (const b of badges) {
    const key = b.catalog_key ?? resolveCatalogKey({ series: b.series });
    const id = b.badge_series_id ?? null;
    const mapKey = id != null ? `id:${id}` : `key:${key || b.series}`;
    if (byId.has(mapKey)) continue;
    const apiSeriesName =
      (key && CATALOG_KEY_API_SERIES_NAME[key]) ||
      b.series ||
      '';
    const label =
      key === CATALOG_KEY_SOFT_SKILLS
        ? SOFT_SKILLS_SERIES_NAME
        : apiSeriesName || SOFT_SKILLS_SERIES_NAME;
    byId.set(mapKey, {
      id,
      catalog_key: key,
      label,
      apiSeriesName: apiSeriesName || label,
    });
  }
  return Array.from(byId.values()).sort((a, b) => a.label.localeCompare(b.label, 'fr'));
}

/** Soft Skills legacy names still accepted by dual-read BE / old rows. */
export const SOFT_SKILLS_LEGACY_API_NAMES = [
  SOFT_SKILLS_SERIES_NAME,
  SOFT_SKILLS_SERIES_NAME_LEGACY,
  'Série TouKouLeur',
] as const;
