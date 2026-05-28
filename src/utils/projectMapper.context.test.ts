import { projectBelongsToOrganizationContext } from './projectMapper';

describe('projectBelongsToOrganizationContext', () => {
  const bretagneId = 137689;
  const niceId = 137684;

  it('returns true when primary organization matches school context', () => {
    expect(
      projectBelongsToOrganizationContext(
        {
          primary_organization_type: 'School',
          primary_organization_id: bretagneId,
        },
        bretagneId,
        'school'
      )
    ).toBe(true);
  });

  it('returns false when primary organization is another school', () => {
    expect(
      projectBelongsToOrganizationContext(
        {
          primary_organization_type: 'School',
          primary_organization_id: niceId,
        },
        bretagneId,
        'school'
      )
    ).toBe(false);
  });

  it('returns true when school_ids includes context school', () => {
    expect(
      projectBelongsToOrganizationContext(
        { school_ids: [bretagneId, niceId] },
        bretagneId,
        'school'
      )
    ).toBe(true);
  });

  it('returns true when a linked school level belongs to context school', () => {
    expect(
      projectBelongsToOrganizationContext(
        {
          school_levels: [{ id: 87, name: 'FOQUALE', school_id: bretagneId }],
        },
        bretagneId,
        'school'
      )
    ).toBe(true);
  });

  it('returns true when primary organization matches company context', () => {
    expect(
      projectBelongsToOrganizationContext(
        {
          primary_organization_type: 'Company',
          primary_organization_id: 42,
        },
        42,
        'company'
      )
    ).toBe(true);
  });
});
