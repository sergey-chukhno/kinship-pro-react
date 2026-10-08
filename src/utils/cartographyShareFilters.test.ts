import { sanitizeCartographyShareFilters } from './cartographyShareFilters';

describe('sanitizeCartographyShareFilters (C15)', () => {
  it('keeps catalog_key and badge_series_id and drops series', () => {
    const out = sanitizeCartographyShareFilters({
      catalog_key: 'soft_skills',
      badge_series_id: 1,
      series: 'Compétences transversales (soft skills)',
      level: 'level_1',
      searchTerm: 'luc',
    });
    expect(out).toEqual({
      catalog_key: 'soft_skills',
      badge_series_id: 1,
      level: 'level_1',
      searchTerm: 'luc',
    });
    expect(out).not.toHaveProperty('series');
  });

  it('omits empty identity fields', () => {
    expect(
      sanitizeCartographyShareFilters({
        level: '',
        searchTerm: '',
      })
    ).toEqual({
      catalog_key: undefined,
      badge_series_id: undefined,
      level: undefined,
      searchTerm: undefined,
    });
  });
});
