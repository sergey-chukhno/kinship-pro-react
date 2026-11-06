import {
  getSoftSkillKeyFromName,
  getSoftSkillsAxeColor,
  getSoftSkillsLocalPicto,
} from './softSkillsSeries';

describe('softSkillsSeries pictos', () => {
  it('maps Communication / Coopération to transversales SVGs', () => {
    expect(getSoftSkillKeyFromName('Communication')).toBe('communication');
    expect(getSoftSkillsLocalPicto('Communication')).toBe(
      '/badges_competences_transversales/communication.svg'
    );
    expect(getSoftSkillsLocalPicto('Coopération')).toBe(
      '/badges_competences_transversales/cooperation.svg'
    );
    expect(getSoftSkillsAxeColor('Communication')).toBe('#FF616F');
  });

  it('maps Informatique & numérique', () => {
    expect(getSoftSkillsLocalPicto('Informatique & numérique')).toContain(
      'informatique_numerique'
    );
  });

  it('maps catalog name Information Numérique (staging alias)', () => {
    expect(getSoftSkillKeyFromName('Information Numérique')).toBe(
      'informatique_numerique'
    );
    expect(getSoftSkillsLocalPicto('Information Numérique')).toBe(
      '/badges_competences_transversales/informatique_numerique.svg'
    );
    expect(getSoftSkillsAxeColor('Information Numérique')).toBe('#783A7F');
  });
});
