import {
  COMPETENCES_ORIENTER_COLLEGE_SERIES,
  METIERS_DE_LA_MER_SERIES,
} from '../constants/badgeAxes';
import type { BadgeAPI } from '../types';
import { validateAxesSeriesCompetencies } from './badgeAssignmentValidation';

const metiersBadge = {
  series: METIERS_DE_LA_MER_SERIES,
  level: 'level_1',
  name: "Niveau 1 - Se situer et s'adapter dans un collectif",
} as BadgeAPI;

const orienterBadge = {
  series: COMPETENCES_ORIENTER_COLLEGE_SERIES,
  level: 'level_1',
  name: 'Apprendre à me connaître',
} as BadgeAPI;

describe('validateAxesSeriesCompetencies', () => {
  describe('Série Métiers de la mer', () => {
    it('requires at least one competence', () => {
      const result = validateAxesSeriesCompetencies([], metiersBadge);
      expect(result).toEqual({
        isValid: false,
        errorMessage: 'Veuillez sélectionner au moins une compétence.',
      });
    });

    it('accepts a single competence', () => {
      const result = validateAxesSeriesCompetencies([1], metiersBadge);
      expect(result).toEqual({ isValid: true, errorMessage: null });
    });

    it('accepts multiple competences', () => {
      const result = validateAxesSeriesCompetencies([1, 2, 3], metiersBadge);
      expect(result).toEqual({ isValid: true, errorMessage: null });
    });
  });

  describe("Série Compétences à s'orienter - Collège", () => {
    it('requires exactly one competence', () => {
      expect(validateAxesSeriesCompetencies([], orienterBadge)).toEqual({
        isValid: false,
        errorMessage: 'Veuillez sélectionner une compétence.',
      });
      expect(validateAxesSeriesCompetencies([1, 2], orienterBadge)).toEqual({
        isValid: false,
        errorMessage: 'Veuillez sélectionner une compétence.',
      });
    });

    it('accepts exactly one competence', () => {
      const result = validateAxesSeriesCompetencies([2], orienterBadge);
      expect(result).toEqual({ isValid: true, errorMessage: null });
    });
  });

  it('returns null for other series', () => {
    const otherBadge = { series: 'Série Audiovisuelle', level: 'level_1', name: 'ACTING' } as BadgeAPI;
    expect(validateAxesSeriesCompetencies([1], otherBadge)).toBeNull();
  });
});
