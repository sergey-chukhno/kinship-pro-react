import {
  filterAttestSelectableLevels,
  softSkillsPastilleLevels,
  uniqueLevelNumbers,
} from './attestSoftSkillsPastilles';
import { getLevelLabel } from './badgeLevelLabels';
import { CATALOG_KEY_SOFT_SKILLS, CATALOG_KEY_CPS } from '../constants/catalogSeries';

describe('uniqueLevelNumbers', () => {
  it('strips level_ prefix, dedupes and sorts', () => {
    expect(
      uniqueLevelNumbers([
        { name: 'Communication', level: 'level_2' },
        { name: 'Communication', level: 'level_1' },
        { name: 'Communication', level: 'level_1' },
      ])
    ).toEqual(['1', '2']);
  });

  it('defaults to ["1"] when empty', () => {
    expect(uniqueLevelNumbers([])).toEqual(['1']);
  });
});

describe('softSkillsPastilleLevels (parent competence cards)', () => {
  const seriesBadges = [
    { name: 'Communication', level: 'level_1', catalog_key: CATALOG_KEY_SOFT_SKILLS },
    { name: 'Communication', level: 'level_2', catalog_key: CATALOG_KEY_SOFT_SKILLS },
    { name: 'Communication', level: 'level_3', catalog_key: CATALOG_KEY_SOFT_SKILLS },
    { name: 'Coopération', level: 'level_1', catalog_key: CATALOG_KEY_SOFT_SKILLS },
    { name: 'Coopération', level: 'level_2', catalog_key: CATALOG_KEY_SOFT_SKILLS },
  ];

  it('returns only L1/L2 for a Soft Skills parent card (never L3)', () => {
    expect(softSkillsPastilleLevels(seriesBadges, ['Communication'])).toEqual(['1', '2']);
  });

  it('defaults to Découverte + Appropriation when card has no level badges yet', () => {
    expect(softSkillsPastilleLevels(seriesBadges, ['Inconnu'])).toEqual(['1', '2']);
  });

  it('scopes levels to the card badge names only', () => {
    expect(softSkillsPastilleLevels(seriesBadges, ['Coopération'])).toEqual(['1', '2']);
  });

  it('labels pastilles Découverte / Appropriation via Soft Skills catalog key', () => {
    const levels = softSkillsPastilleLevels(seriesBadges, ['Communication']);
    expect(levels.map((lv) => getLevelLabel(CATALOG_KEY_SOFT_SKILLS, lv))).toEqual([
      'Découverte',
      'Appropriation',
    ]);
  });
});

describe('filterAttestSelectableLevels (levelsFor Soft Skills / CPS)', () => {
  it('keeps only 1 and 2 when Soft Skills / CPS restriction is on', () => {
    expect(
      filterAttestSelectableLevels(['1', '2', '3'], { restrictToPhaseOrSoftLevels: true })
    ).toEqual(['1', '2']);
  });

  it('falls back to ["1"] if restriction removes everything', () => {
    expect(
      filterAttestSelectableLevels(['3', '4'], { restrictToPhaseOrSoftLevels: true })
    ).toEqual(['1']);
  });

  it('does not restrict other series (audiovisuelle etc.)', () => {
    expect(
      filterAttestSelectableLevels(['1', '2', '3', '4'], {
        restrictToPhaseOrSoftLevels: false,
      })
    ).toEqual(['1', '2', '3', '4']);
  });
});

describe('non-regression: CPS pastille labels stay Phase, Soft Skills stay Découverte/Appropriation', () => {
  it('does not confuse Soft Skills pastille labels with CPS Phase labels', () => {
    expect(getLevelLabel(CATALOG_KEY_SOFT_SKILLS, '1')).toBe('Découverte');
    expect(getLevelLabel(CATALOG_KEY_SOFT_SKILLS, '2')).toBe('Appropriation');
    expect(getLevelLabel(CATALOG_KEY_CPS, '1')).toBe('Phase 1');
    expect(getLevelLabel(CATALOG_KEY_CPS, '2')).toBe('Phase 2');
  });
});
