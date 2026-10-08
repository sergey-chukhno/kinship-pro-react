/**
 * CPS series helpers — competence key parsing & Phase labels
 */
import { getCpsCompetenceKeyFromBadgeName, getCpsLocalBadgeImage } from './cpsSeries';
import { getLevelLabel, getBadgeLevelDisplayLabel } from './badgeLevelLabels';
import { COMPETENCES_PSYCHOSOCIALES_SERIES } from './cpsSeries';

describe('cpsSeries', () => {
  it('parses competence keys from SPF badge names', () => {
    expect(getCpsCompetenceKeyFromBadgeName('Communiquer de façon empathique (S1.2)')).toBe('S1');
    expect(getCpsCompetenceKeyFromBadgeName("S'auto-évaluer positivement (C1.5)")).toBe('C1');
    expect(getCpsCompetenceKeyFromBadgeName('Réguler ses émotions agréables (E.2.2.a) et désagréables (E2.2.b)')).toBe('E2');
    expect(getCpsCompetenceKeyFromBadgeName('Atteindre ses buts personnels (C2.1)')).toBe('C2');
  });

  it('maps competence key to local icon path', () => {
    expect(getCpsLocalBadgeImage('Communiquer de façon empathique (S1.2)')).toBe(
      '/badges_competences_psychosociales/CPS_S1.png'
    );
  });
});

describe('getLevelLabel CPS', () => {
  it('returns Phase 1 / Phase 2 with nothing after', () => {
    expect(getLevelLabel(COMPETENCES_PSYCHOSOCIALES_SERIES, '1')).toBe('Phase 1');
    expect(getLevelLabel(COMPETENCES_PSYCHOSOCIALES_SERIES, '2')).toBe('Phase 2');
    expect(getBadgeLevelDisplayLabel(COMPETENCES_PSYCHOSOCIALES_SERIES, 'level_1')).toBe('Phase 1');
  });
});
