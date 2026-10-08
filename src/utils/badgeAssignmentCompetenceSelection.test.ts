import { CATALOG_KEY_MER, CATALOG_KEY_ORIENTER } from '../constants/catalogSeries';
import {
  isCompetencesOrienterCollegeSeries,
  isMetiersDeLaMerSeries,
  isSingleSelectCompetenceSeries,
} from './badgeAssignmentCompetenceSelection';

describe('badgeAssignmentCompetenceSelection (C2 — key only)', () => {
  it('identifies Métiers de la mer by catalog_key only', () => {
    expect(isMetiersDeLaMerSeries('Série Métiers de la mer')).toBe(false);
    expect(isMetiersDeLaMerSeries(CATALOG_KEY_MER)).toBe(true);
    expect(isMetiersDeLaMerSeries('x', CATALOG_KEY_MER)).toBe(true);
    expect(isMetiersDeLaMerSeries(null, CATALOG_KEY_ORIENTER)).toBe(false);
  });

  it("identifies Compétences à s'orienter by catalog_key only", () => {
    expect(isCompetencesOrienterCollegeSeries("Série Compétences à s'orienter - Collège")).toBe(
      false
    );
    expect(isCompetencesOrienterCollegeSeries(CATALOG_KEY_ORIENTER)).toBe(true);
    expect(isCompetencesOrienterCollegeSeries(null, CATALOG_KEY_MER)).toBe(false);
  });

  it("only Compétences à s'orienter uses single-select", () => {
    expect(isSingleSelectCompetenceSeries(CATALOG_KEY_ORIENTER)).toBe(true);
    expect(isSingleSelectCompetenceSeries(CATALOG_KEY_MER)).toBe(false);
  });
});
