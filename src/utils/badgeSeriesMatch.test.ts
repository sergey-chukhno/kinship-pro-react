import { CATALOG_KEY_SOFT_SKILLS, CATALOG_KEY_CPS } from '../constants/catalogSeries';
import {
  badgeMatchesSelectedCatalogKey,
  badgeMatchesSeriesIdentity,
  seriesIdentityValue,
} from './badgeSeriesMatch';

describe('badgeMatchesSelectedCatalogKey (C2/C16 — no dual-read)', () => {
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

  it('does not dual-read legacy series name when catalog_key is absent', () => {
    expect(
      badgeMatchesSelectedCatalogKey(
        { catalog_key: null, series: 'Compétences psychosociales' },
        CATALOG_KEY_CPS
      )
    ).toBe(false);
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

describe('badgeMatchesSeriesIdentity', () => {
  it('matches catalog_key string selection', () => {
    expect(
      badgeMatchesSeriesIdentity(
        { catalog_key: CATALOG_KEY_CPS, badge_series_id: 3, series: 'Compétences psychosociales' },
        CATALOG_KEY_CPS
      )
    ).toBe(true);
  });

  it('matches badge_series_id when key missing', () => {
    expect(
      badgeMatchesSeriesIdentity(
        { catalog_key: null, badge_series_id: 42, series: 'Org Series' },
        '42'
      )
    ).toBe(true);
  });

  it('does not match on display name alone', () => {
    expect(
      badgeMatchesSeriesIdentity(
        { catalog_key: null, badge_series_id: null, series: 'Compétences psychosociales' },
        CATALOG_KEY_CPS
      )
    ).toBe(false);
  });
});

describe('seriesIdentityValue', () => {
  it('prefers catalog_key over badge_series_id', () => {
    expect(
      seriesIdentityValue({ catalog_key: CATALOG_KEY_SOFT_SKILLS, badge_series_id: 9 })
    ).toBe(CATALOG_KEY_SOFT_SKILLS);
  });

  it('falls back to badge_series_id', () => {
    expect(seriesIdentityValue({ catalog_key: null, badge_series_id: 9 })).toBe('9');
  });
});
