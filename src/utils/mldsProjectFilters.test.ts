import {
  countMldsByType,
  filterRawMldsProjects,
  getMldsTypeFromProject,
  type MldsFilterParams,
} from './mldsProjectFilters';

const baseParams = (overrides: Partial<MldsFilterParams> = {}): MldsFilterParams => ({
  typeFilter: 'perseverance',
  searchTerm: '',
  requestedBy: 'all',
  targetAudience: 'all',
  actionObjectives: 'all',
  organizationFilter: 'all',
  statusFilter: 'all',
  startDate: '',
  endDate: '',
  ...overrides,
});

const makeMldsProject = (id: number, overrides: Record<string, unknown> = {}) => ({
  id,
  title: `Project ${id}`,
  description: '',
  status: 'in_progress',
  mlds_information: {
    type_mlds: 'perseverance',
    school_level_ids: [87],
    ...((overrides.mlds_information as object) || {}),
  },
  ...overrides,
});

describe('mldsProjectFilters', () => {
  it('getMldsTypeFromProject treats missing type as perseverance', () => {
    expect(getMldsTypeFromProject({ mlds_information: {} })).toBe('perseverance');
    expect(getMldsTypeFromProject({ mlds_information: { type_mlds: 'remediation' } })).toBe('remediation');
  });

  it('filterRawMldsProjects finds project on virtual page 2 via search', () => {
    const raw = Array.from({ length: 25 }, (_, i) =>
      makeMldsProject(i + 1, { title: i === 14 ? 'Unique MLDS Title' : `Project ${i + 1}` })
    );

    const filtered = filterRawMldsProjects(raw, baseParams({ searchTerm: 'Unique MLDS' }));
    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe(15);
  });

  it('filterRawMldsProjects filters by class school_level_id across full list', () => {
    const raw = [
      makeMldsProject(1, { mlds_information: { type_mlds: 'perseverance', school_level_ids: [87] } }),
      makeMldsProject(2, { mlds_information: { type_mlds: 'perseverance', school_level_ids: [88] } }),
      makeMldsProject(3, { mlds_information: { type_mlds: 'perseverance', school_level_ids: [87] } }),
    ];

    const filtered = filterRawMldsProjects(raw, baseParams({ organizationFilter: '87' }));
    expect(filtered.map((p) => p.id)).toEqual([1, 3]);
  });

  it('filterRawMldsProjects separates remediation from perseverance', () => {
    const raw = [
      makeMldsProject(1, { mlds_information: { type_mlds: 'perseverance', school_level_ids: [87] } }),
      makeMldsProject(2, { mlds_information: { type_mlds: 'remediation', school_level_ids: [87] } }),
    ];

    expect(filterRawMldsProjects(raw, baseParams({ typeFilter: 'perseverance' }))).toHaveLength(1);
    expect(filterRawMldsProjects(raw, baseParams({ typeFilter: 'remediation' }))).toHaveLength(1);
  });

  it('countMldsByType counts only non-archived MLDS projects', () => {
    const raw = [
      makeMldsProject(1),
      makeMldsProject(2, { mlds_information: { type_mlds: 'remediation', school_level_ids: [87] } }),
      { id: 3, status: 'archived', mlds_information: { type_mlds: 'perseverance' } },
      { id: 4, status: 'in_progress', mlds_information: null },
    ];
    expect(countMldsByType(raw)).toEqual({ perseverance: 1, remediation: 1 });
  });
});
