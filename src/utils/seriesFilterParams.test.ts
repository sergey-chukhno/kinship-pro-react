import {
  appendProjectBadgesSeriesParams,
  applyAssignedBadgesSeriesFilter,
} from './seriesFilterParams';

describe('seriesFilterParams (Étape 2)', () => {
  describe('applyAssignedBadgesSeriesFilter', () => {
    it('prefers catalog_key over id and legacy name', () => {
      const params: Record<string, unknown> = {};
      applyAssignedBadgesSeriesFilter(params, {
        catalog_key: 'soft_skills',
        badge_series_id: 1,
        badge_series: 'Compétences transversales (soft skills)',
      });
      expect(params).toEqual({ catalog_key: 'soft_skills' });
    });

    it('uses badge_series_id when catalog_key blank', () => {
      const params: Record<string, unknown> = {};
      applyAssignedBadgesSeriesFilter(params, { badge_series_id: 7 });
      expect(params).toEqual({ badge_series_id: 7 });
    });

    it('falls back to legacy badge_series name', () => {
      const params: Record<string, unknown> = {};
      applyAssignedBadgesSeriesFilter(params, {
        badge_series: 'Compétences psychosociales',
      });
      expect(params).toEqual({ badge_series: 'Compétences psychosociales' });
    });

    it('no-ops when filter absent', () => {
      const params: Record<string, unknown> = { per_page: 12 };
      applyAssignedBadgesSeriesFilter(params, undefined);
      expect(params).toEqual({ per_page: 12 });
    });
  });

  describe('appendProjectBadgesSeriesParams', () => {
    it('appends catalog_key first', () => {
      const params = new URLSearchParams();
      appendProjectBadgesSeriesParams(params, {
        catalog_key: 'soft_skills',
        badge_series_id: 1,
        series: 'Compétences transversales (soft skills)',
      });
      expect(params.get('catalog_key')).toBe('soft_skills');
      expect(params.get('badge_series_id')).toBeNull();
      expect(params.get('series')).toBeNull();
    });

    it('appends badge_series_id when key blank', () => {
      const params = new URLSearchParams();
      appendProjectBadgesSeriesParams(params, { badge_series_id: 7 });
      expect(params.get('badge_series_id')).toBe('7');
    });

    it('falls back to series name', () => {
      const params = new URLSearchParams();
      appendProjectBadgesSeriesParams(params, { series: 'Série Audiovisuelle' });
      expect(params.get('series')).toBe('Série Audiovisuelle');
    });
  });
});
