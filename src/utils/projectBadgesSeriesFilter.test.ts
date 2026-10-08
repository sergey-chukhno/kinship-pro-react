import {
  buildProjectBadgesSeriesIdentity,
  isKnownCatalogKey,
  showProjectBadgesLevelFilter,
} from './projectBadgesSeriesFilter';

describe('projectBadgesSeriesFilter (C13)', () => {
  it('isKnownCatalogKey accepts catalogue keys only', () => {
    expect(isKnownCatalogKey('soft_skills')).toBe(true);
    expect(isKnownCatalogKey('Compétences transversales (soft skills)')).toBe(false);
    expect(isKnownCatalogKey('Série Audiovisuelle')).toBe(false);
  });

  it('buildProjectBadgesSeriesIdentity sets catalog_key for known keys', () => {
    expect(buildProjectBadgesSeriesIdentity('soft_skills')).toEqual({ catalog_key: 'soft_skills' });
    expect(buildProjectBadgesSeriesIdentity('audiovisuelle')).toEqual({
      catalog_key: 'audiovisuelle',
    });
  });

  it('buildProjectBadgesSeriesIdentity omits series for display names / unknown', () => {
    expect(buildProjectBadgesSeriesIdentity('')).toEqual({});
    expect(buildProjectBadgesSeriesIdentity('Série Audiovisuelle')).toEqual({});
    expect(buildProjectBadgesSeriesIdentity('Compétences transversales (soft skills)')).toEqual({});
  });

  it('showProjectBadgesLevelFilter is key-only', () => {
    expect(showProjectBadgesLevelFilter('soft_skills')).toBe(true);
    expect(showProjectBadgesLevelFilter('Série TouKouLeur')).toBe(false);
    expect(showProjectBadgesLevelFilter('')).toBe(false);
  });
});
