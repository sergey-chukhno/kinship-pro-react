import { CATALOG_KEY_SOFT_SKILLS, CATALOG_KEY_CPS } from '../constants/catalogSeries';
import { badgeMatchesSelectedCatalogKey } from './badgeSeriesMatch';

describe('badgeMatchesSelectedCatalogKey (C11/C12)', () => {
  it('matches on catalog_key even when display series name differs', () => {
    expect(
      badgeMatchesSelectedCatalogKey(
        { catalog_key: CATALOG_KEY_SOFT_SKILLS, series: 'Série TouKouLeur' },
        CATALOG_KEY_SOFT_SKILLS
      )
    ).toBe(true);
  });

  it('does not match a different catalog_key', () => {
    expect(
      badgeMatchesSelectedCatalogKey(
        { catalog_key: CATALOG_KEY_SOFT_SKILLS, series: 'Compétences transversales (soft skills)' },
        CATALOG_KEY_CPS
      )
    ).toBe(false);
  });

  it('dual-reads legacy series name when catalog_key is absent', () => {
    expect(
      badgeMatchesSelectedCatalogKey(
        { catalog_key: null, series: 'Compétences psychosociales' },
        CATALOG_KEY_CPS
      )
    ).toBe(true);
  });

  it('does not treat selected key as display-name equality on series', () => {
    expect(
      badgeMatchesSelectedCatalogKey(
        { catalog_key: null, series: CATALOG_KEY_SOFT_SKILLS },
        CATALOG_KEY_SOFT_SKILLS
      )
    ).toBe(false);
  });

  it('returns true when selected key is empty', () => {
    expect(badgeMatchesSelectedCatalogKey({ catalog_key: CATALOG_KEY_CPS, series: 'x' }, '')).toBe(
      true
    );
  });
});
