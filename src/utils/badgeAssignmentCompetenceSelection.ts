import {
  CATALOG_KEY_MER,
  CATALOG_KEY_ORIENTER,
  isMerCatalog,
  isOrienterCatalog,
} from '../constants/catalogSeries';

export const isCompetencesOrienterCollegeSeries = (
  seriesOrKey?: string | null,
  catalogKey?: string | null
): boolean => {
  const key = catalogKey || (seriesOrKey === CATALOG_KEY_ORIENTER ? seriesOrKey : null);
  return isOrienterCatalog({ catalog_key: key });
};

export const isMetiersDeLaMerSeries = (
  seriesOrKey?: string | null,
  catalogKey?: string | null
): boolean => {
  const key = catalogKey || (seriesOrKey === CATALOG_KEY_MER ? seriesOrKey : null);
  return isMerCatalog({ catalog_key: key });
};

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
