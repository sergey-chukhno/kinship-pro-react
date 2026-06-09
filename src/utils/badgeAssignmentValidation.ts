import type { BadgeAPI } from '../types';
import {
  isCompetencesOrienterCollegeSeries,
  isMetiersDeLaMerSeries,
} from './badgeAssignmentCompetenceSelection';

export type CompetencyValidationResult = {
  isValid: boolean;
  errorMessage: string | null;
};

/** Validation for Série Métiers de la mer and Compétences à s'orienter - Collège only. */
export const validateAxesSeriesCompetencies = (
  selectedExpertiseIds: number[],
  badge: BadgeAPI | null
): CompetencyValidationResult | null => {
  if (!badge) {
    return null;
  }

  if (isMetiersDeLaMerSeries(badge.series)) {
    if (selectedExpertiseIds.length < 1) {
      return {
        isValid: false,
        errorMessage: 'Veuillez sélectionner au moins une compétence.',
      };
    }
    return { isValid: true, errorMessage: null };
  }

  if (isCompetencesOrienterCollegeSeries(badge.series)) {
    if (selectedExpertiseIds.length !== 1) {
      return {
        isValid: false,
        errorMessage: 'Veuillez sélectionner une compétence.',
      };
    }
    return { isValid: true, errorMessage: null };
  }

  return null;
};
