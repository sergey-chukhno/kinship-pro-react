import {
  getLevelLabel,
  isSoftSkillsSeries,
  SOFT_SKILLS_SERIES_NAME,
  SOFT_SKILLS_SERIES_NAME_LEGACY,
} from './badgeLevelLabels';

describe('isSoftSkillsSeries', () => {
  it('recognizes current and legacy Soft Skills series names', () => {
    expect(isSoftSkillsSeries(SOFT_SKILLS_SERIES_NAME)).toBe(true);
    expect(isSoftSkillsSeries(SOFT_SKILLS_SERIES_NAME_LEGACY)).toBe(true);
    expect(isSoftSkillsSeries('Série Soft Skills 4LAB')).toBe(false);
    expect(isSoftSkillsSeries('Série Audiovisuelle')).toBe(false);
  });
});

describe('getLevelLabel Soft Skills', () => {
  it('uses Découverte / Appropriation for Soft Skills levels', () => {
    expect(getLevelLabel(SOFT_SKILLS_SERIES_NAME, '1')).toBe('Niveau 1: Découverte');
    expect(getLevelLabel(SOFT_SKILLS_SERIES_NAME, '2')).toBe('Niveau 2: Appropriation');
    expect(getLevelLabel(SOFT_SKILLS_SERIES_NAME_LEGACY, '2')).toBe('Niveau 2: Appropriation');
  });
});
