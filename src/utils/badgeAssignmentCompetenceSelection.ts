import {
  COMPETENCES_ORIENTER_COLLEGE_SERIES,
  METIERS_DE_LA_MER_SERIES,
} from '../constants/badgeAxes';

export const isCompetencesOrienterCollegeSeries = (series: string): boolean =>
  series === COMPETENCES_ORIENTER_COLLEGE_SERIES;

export const isMetiersDeLaMerSeries = (series: string): boolean =>
  series === METIERS_DE_LA_MER_SERIES;

/** Only Compétences à s'orienter - Collège uses single-select; Métiers de la mer allows multiple. */
export const isSingleSelectCompetenceSeries = (series: string): boolean =>
  isCompetencesOrienterCollegeSeries(series);

export const isSeriesWithAxesCompetenceSelection = (series: string): boolean =>
  isMetiersDeLaMerSeries(series) || isCompetencesOrienterCollegeSeries(series);
