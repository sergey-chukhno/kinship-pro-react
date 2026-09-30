import {
  getLevelLabel,
  isSoftSkillsSeries,
  SOFT_SKILLS_SERIES_NAME,
  SOFT_SKILLS_SERIES_NAME_LEGACY,
} from './badgeLevelLabels';
import { PSYCHOSOCIALES_SERIES } from '../constants/badgeAxes';

describe('isSoftSkillsSeries', () => {
  it('recognizes current and legacy Soft Skills series names', () => {
    expect(isSoftSkillsSeries(SOFT_SKILLS_SERIES_NAME)).toBe(true);
    expect(isSoftSkillsSeries(SOFT_SKILLS_SERIES_NAME_LEGACY)).toBe(true);
    expect(isSoftSkillsSeries('Série Soft Skills 4LAB')).toBe(false);
    expect(isSoftSkillsSeries('Série Audiovisuelle')).toBe(false);
  });
});

describe('getLevelLabel Soft Skills', () => {
  it('uses bare Découverte / Appropriation for Soft Skills levels, no "Niveau X" (Patrick 29/09)', () => {
    expect(getLevelLabel(SOFT_SKILLS_SERIES_NAME, '1')).toBe('Découverte');
    expect(getLevelLabel(SOFT_SKILLS_SERIES_NAME, '2')).toBe('Appropriation');
    expect(getLevelLabel(SOFT_SKILLS_SERIES_NAME_LEGACY, '2')).toBe('Appropriation');
  });
});

describe('getLevelLabel Compétences psychosociales', () => {
  it('uses "Phase X", never "Niveau X" (Patrick 29/09)', () => {
    expect(getLevelLabel(PSYCHOSOCIALES_SERIES, '1')).toBe('Phase 1');
    expect(getLevelLabel(PSYCHOSOCIALES_SERIES, '2')).toBe('Phase 2');
  });
});
