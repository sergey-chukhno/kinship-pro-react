import {
  COMPETENCES_ORIENTER_COLLEGE_SERIES,
  METIERS_DE_LA_MER_SERIES,
} from '../constants/badgeAxes';
import { CATALOG_KEY_MER, CATALOG_KEY_ORIENTER } from '../constants/catalogSeries';
import {
  isCompetencesOrienterCollegeSeries,
  isMetiersDeLaMerSeries,
  isSingleSelectCompetenceSeries,
} from './badgeAssignmentCompetenceSelection';

describe('badgeAssignmentCompetenceSelection', () => {
  it('identifies Métiers de la mer series by name or catalog_key', () => {
    expect(isMetiersDeLaMerSeries(METIERS_DE_LA_MER_SERIES)).toBe(true);
    expect(isMetiersDeLaMerSeries(CATALOG_KEY_MER)).toBe(true);
    expect(isMetiersDeLaMerSeries('x', CATALOG_KEY_MER)).toBe(true);
    expect(isMetiersDeLaMerSeries(COMPETENCES_ORIENTER_COLLEGE_SERIES)).toBe(false);
  });

  it("identifies Compétences à s'orienter - Collège series by name or catalog_key", () => {
    expect(isCompetencesOrienterCollegeSeries(COMPETENCES_ORIENTER_COLLEGE_SERIES)).toBe(true);
    expect(isCompetencesOrienterCollegeSeries(CATALOG_KEY_ORIENTER)).toBe(true);
    expect(isCompetencesOrienterCollegeSeries(METIERS_DE_LA_MER_SERIES)).toBe(false);
  });

  it("only Compétences à s'orienter uses single-select", () => {
    expect(isSingleSelectCompetenceSeries(COMPETENCES_ORIENTER_COLLEGE_SERIES)).toBe(true);
    expect(isSingleSelectCompetenceSeries(METIERS_DE_LA_MER_SERIES)).toBe(false);
  });
});
