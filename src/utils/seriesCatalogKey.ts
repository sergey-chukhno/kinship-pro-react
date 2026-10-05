/**
 * Minimal catalog_key resolver for F2 tree-by-key (Fatima 3/7).
 * Independent of Rimma FE branch — display name → stable key.
 */

import { isSoftSkillsSeries } from '../constants/badgeAxes';
import { SOFT_SKILLS_SERIES_NAME } from './badgeLevelLabels';

export const CATALOG_KEY_SOFT_SKILLS = 'soft_skills';
export const CATALOG_KEY_CPS = 'competences_psychosociales';
export const CATALOG_KEY_ORIENTER = 'competences_orienter_college';
export const CATALOG_KEY_MER = 'metiers_de_la_mer';
export const CATALOG_KEY_AUDIOVISUELLE = 'audiovisuelle';
export const CATALOG_KEY_PARCOURS_DES_POSSIBLES = 'parcours_des_possibles';
export const CATALOG_KEY_PARCOURS_PROFESSIONNEL = 'parcours_professionnel';

const NAME_TO_KEY: Record<string, string> = {
  [SOFT_SKILLS_SERIES_NAME]: CATALOG_KEY_SOFT_SKILLS,
  'Série TouKouLeur': CATALOG_KEY_SOFT_SKILLS,
  'Compétences psychosociales': CATALOG_KEY_CPS,
  "Série Compétences à s'orienter - Collège": CATALOG_KEY_ORIENTER,
  'Série Métiers de la mer': CATALOG_KEY_MER,
  'Série Audiovisuelle': CATALOG_KEY_AUDIOVISUELLE,
  'Série Parcours des possibles': CATALOG_KEY_PARCOURS_DES_POSSIBLES,
  'Série Parcours professionnel': CATALOG_KEY_PARCOURS_PROFESSIONNEL,
};

/** Resolve catalogue key from API series display name (or key itself). */
export function resolveCatalogKeyForSeries(series?: string | null): string | null {
  if (!series) return null;
  if (NAME_TO_KEY[series]) return NAME_TO_KEY[series];
  if (Object.values(NAME_TO_KEY).includes(series)) return series;
  if (isSoftSkillsSeries(series)) return CATALOG_KEY_SOFT_SKILLS;
  return null;
}
