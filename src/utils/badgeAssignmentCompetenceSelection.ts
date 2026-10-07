import {
  CATALOG_KEY_MER,
  CATALOG_KEY_ORIENTER,
  isMerCatalog,
  isOrienterCatalog,
} from '../constants/catalogSeries';
import {
  COMPETENCES_ORIENTER_COLLEGE_SERIES,
  METIERS_DE_LA_MER_SERIES,
} from '../constants/badgeAxes';

export const isCompetencesOrienterCollegeSeries = (
  seriesOrKey?: string | null,
  catalogKey?: string | null
): boolean =>
  isOrienterCatalog({ catalog_key: catalogKey || seriesOrKey, series: seriesOrKey }) ||
  seriesOrKey === COMPETENCES_ORIENTER_COLLEGE_SERIES ||
  seriesOrKey === CATALOG_KEY_ORIENTER;

export const isMetiersDeLaMerSeries = (
  seriesOrKey?: string | null,
  catalogKey?: string | null
): boolean =>
  isMerCatalog({ catalog_key: catalogKey || seriesOrKey, series: seriesOrKey }) ||
  seriesOrKey === METIERS_DE_LA_MER_SERIES ||
  seriesOrKey === CATALOG_KEY_MER;

/** Only Compétences à s'orienter - Collège uses single-select; Métiers de la mer allows multiple. */
export const isSingleSelectCompetenceSeries = (
  seriesOrKey?: string | null,
  catalogKey?: string | null
): boolean => isCompetencesOrienterCollegeSeries(seriesOrKey, catalogKey);

export const isSeriesWithAxesCompetenceSelection = (
  seriesOrKey?: string | null,
  catalogKey?: string | null
): boolean =>
  isMetiersDeLaMerSeries(seriesOrKey, catalogKey) ||
  isCompetencesOrienterCollegeSeries(seriesOrKey, catalogKey);
