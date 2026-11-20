import { isAttestSelectableApiProject } from './attestSelectableProjects';

describe('isAttestSelectableApiProject', () => {
  it('keeps in_progress non-formation projects', () => {
    expect(
      isAttestSelectableApiProject({
        status: 'in_progress',
        project_kind: 'standard',
        mlds_information: null,
      })
    ).toBe(true);
  });

  it('excludes coming, ended, and formation sessions', () => {
    expect(isAttestSelectableApiProject({ status: 'coming', project_kind: 'standard' })).toBe(
      false
    );
    expect(isAttestSelectableApiProject({ status: 'ended', project_kind: 'standard' })).toBe(
      false
    );
    expect(
      isAttestSelectableApiProject({ status: 'in_progress', project_kind: 'formation' })
    ).toBe(false);
    expect(
      isAttestSelectableApiProject({
        status: 'in_progress',
        project_kind: 'standard',
        formation_catalog_entry_id: 'abc',
      })
    ).toBe(false);
  });
});
