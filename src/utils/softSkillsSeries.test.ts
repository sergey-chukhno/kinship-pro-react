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

  it('informatique_numerique.svg uses fill for CSS mask (not stroke-only)', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const fs = require('fs') as typeof import('fs');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const path = require('path') as typeof import('path');
    const svg = fs.readFileSync(
      path.join(
        __dirname,
        '../../public/badges_competences_transversales/informatique_numerique.svg'
      ),
      'utf8'
    );
    expect(svg).toMatch(/fill="currentColor"/);
    expect(svg).not.toMatch(/stroke="currentColor"/);
  });
});
