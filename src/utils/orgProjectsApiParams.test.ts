import {
  buildMyOrgProjectsParams,
  mapStatusFilterToApiStatuses,
} from './orgProjectsApiParams';

describe('orgProjectsApiParams', () => {
  it('maps default filter to exclude_mlds + active statuses + page', () => {
    expect(buildMyOrgProjectsParams(2, 'all')).toEqual({
      include_branches: true,
      page: 2,
      per_page: 12,
      exclude_mlds: true,
      statuses: ['coming', 'in_progress', 'ended'],
      search: undefined,
      sort_by: 'created_at',
      sort_direction: 'desc',
    });
  });

  it('maps status filter Terminée to ended only', () => {
    expect(mapStatusFilterToApiStatuses('Terminée')).toEqual(['ended']);
  });

  it('passes debounced search to API', () => {
    expect(buildMyOrgProjectsParams(1, 'all', 'alpha').search).toBe('alpha');
  });
});
