import {
  COMPETENCES_ORIENTER_COLLEGE_SERIES,
  METIERS_DE_LA_MER_SERIES,
} from '../constants/badgeAxes';
import {
  isCompetencesOrienterCollegeSeries,
  isMetiersDeLaMerSeries,
  isSingleSelectCompetenceSeries,
} from './badgeAssignmentCompetenceSelection';

describe('badgeAssignmentCompetenceSelection', () => {
  it('identifies Métiers de la mer series', () => {
    expect(isMetiersDeLaMerSeries(METIERS_DE_LA_MER_SERIES)).toBe(true);
    expect(isMetiersDeLaMerSeries(COMPETENCES_ORIENTER_COLLEGE_SERIES)).toBe(false);
  });

  it("identifies Compétences à s'orienter - Collège series", () => {
    expect(isCompetencesOrienterCollegeSeries(COMPETENCES_ORIENTER_COLLEGE_SERIES)).toBe(true);
    expect(isCompetencesOrienterCollegeSeries(METIERS_DE_LA_MER_SERIES)).toBe(false);
  });

  it("only Compétences à s'orienter uses single-select", () => {
    expect(isSingleSelectCompetenceSeries(COMPETENCES_ORIENTER_COLLEGE_SERIES)).toBe(true);
    expect(isSingleSelectCompetenceSeries(METIERS_DE_LA_MER_SERIES)).toBe(false);
  });
});
