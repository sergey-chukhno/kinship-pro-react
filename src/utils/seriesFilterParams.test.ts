import {
  appendProjectBadgesSeriesParams,
  applyAssignedBadgesSeriesFilter,
} from './seriesFilterParams';

describe('seriesFilterParams (Étape 2)', () => {
  describe('applyAssignedBadgesSeriesFilter', () => {
    it('prefers catalog_key over id', () => {
      const params: Record<string, unknown> = {};
      applyAssignedBadgesSeriesFilter(params, {
        catalog_key: 'soft_skills',
        badge_series_id: 1,
      });
      expect(params).toEqual({ catalog_key: 'soft_skills' });
    });

    it('uses badge_series_id when catalog_key blank', () => {
      const params: Record<string, unknown> = {};
      applyAssignedBadgesSeriesFilter(params, { badge_series_id: 7 });
      expect(params).toEqual({ badge_series_id: 7 });
    });

    it('does not send anything when only a display name would have been available', () => {
      const params: Record<string, unknown> = {};
      // Name is no longer part of the filter type — empty filter no-ops.
      applyAssignedBadgesSeriesFilter(params, {});
      expect(params).toEqual({});
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
      });
      expect(params.get('catalog_key')).toBe('soft_skills');
      expect(params.get('badge_series_id')).toBeNull();
      expect(params.get('series')).toBeNull();
    });

    it('appends badge_series_id when key blank', () => {
      const params = new URLSearchParams();
      appendProjectBadgesSeriesParams(params, { badge_series_id: 7 });
      expect(params.get('badge_series_id')).toBe('7');
      expect(params.get('series')).toBeNull();
    });

    it('does not append series name', () => {
      const params = new URLSearchParams();
      appendProjectBadgesSeriesParams(params, {});
      expect(params.get('series')).toBeNull();
      expect(params.get('catalog_key')).toBeNull();
      expect(params.get('badge_series_id')).toBeNull();
    });
  });
});
