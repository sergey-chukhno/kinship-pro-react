import {
  CATALOG_KEY_CPS,
  CATALOG_KEY_SOFT_SKILLS,
  buildCartographyShareSeriesFilters,
  displayLabelForCatalogKey,
  isCpsCatalog,
  isSoftSkillsCatalog,
  resolveCatalogKey,
  seriesGroupKey,
  seriesOptionsFromBadges,
} from './catalogSeries';

describe('catalogSeries (R1 / Étape 2)', () => {
  it('maps catalog_key to display labels', () => {
    expect(displayLabelForCatalogKey(CATALOG_KEY_SOFT_SKILLS)).toBe(
      'Compétences transversales (soft skills)'
    );
    expect(displayLabelForCatalogKey(CATALOG_KEY_CPS)).toBe('Compétences psychosociales');
  });

  it('resolves Soft Skills from legacy display names', () => {
    expect(resolveCatalogKey({ series: 'Série TouKouLeur' })).toBe(CATALOG_KEY_SOFT_SKILLS);
    expect(isSoftSkillsCatalog({ series: 'Série TouKouLeur' })).toBe(true);
    expect(isSoftSkillsCatalog({ catalog_key: CATALOG_KEY_SOFT_SKILLS })).toBe(true);
  });

  it('detects CPS by key or name', () => {
    expect(isCpsCatalog({ catalog_key: CATALOG_KEY_CPS })).toBe(true);
    expect(isCpsCatalog({ series: 'Compétences psychosociales' })).toBe(true);
  });

  it('builds select options keyed by badge_series_id', () => {
    const options = seriesOptionsFromBadges([
      {
        id: 1,
        name: 'A',
        description: '',
        level: 'level_1',
        series: 'Compétences transversales (soft skills)',
        catalog_key: CATALOG_KEY_SOFT_SKILLS,
        badge_series_id: 10,
        domains: [],
        expertises: [],
      },
      {
        id: 2,
        name: 'B',
        description: '',
        level: 'level_1',
        series: 'Compétences transversales (soft skills)',
        catalog_key: CATALOG_KEY_SOFT_SKILLS,
        badge_series_id: 10,
        domains: [],
        expertises: [],
      },
    ]);
    expect(options).toHaveLength(1);
    expect(options[0].id).toBe(10);
    expect(options[0].catalog_key).toBe(CATALOG_KEY_SOFT_SKILLS);
    expect(options[0].label).toBe(displayLabelForCatalogKey(CATALOG_KEY_SOFT_SKILLS));
  });

  it('seriesGroupKey prefers badge_series_id then catalog_key then name', () => {
    expect(
      seriesGroupKey({ badge_series_id: 7, catalog_key: CATALOG_KEY_CPS, series: 'Compétences psychosociales' })
    ).toBe('id:7');
    expect(seriesGroupKey({ catalog_key: CATALOG_KEY_CPS, series: 'Compétences psychosociales' })).toBe(
      `key:${CATALOG_KEY_CPS}`
    );
    expect(seriesGroupKey({ series: 'Org Custom Series' })).toBe('name:Org Custom Series');
  });

  it('buildCartographyShareSeriesFilters sends catalog_key, id and display series', () => {
    expect(
      buildCartographyShareSeriesFilters({
        catalog_key: CATALOG_KEY_CPS,
        badge_series_id: 7,
        level: 'level_1',
        searchTerm: 'x',
      })
    ).toEqual({
      catalog_key: CATALOG_KEY_CPS,
      badge_series_id: 7,
      series: 'Compétences psychosociales',
      level: 'level_1',
      searchTerm: 'x',
    });
  });
});
