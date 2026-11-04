import { mapApiProjectToFrontendProject } from './projectMapper';

describe('mapApiProjectToFrontendProject', () => {
  const baseApiProject = {
    id: 42,
    title: 'Projet test',
    description: 'Description',
    status: 'in_progress',
    private: false,
    tags: [],
    keywords: [],
    owner: {
      id: 7,
      first_name: 'Jane',
      last_name: 'Doe',
      full_name: 'Jane Doe',
      email: 'jane@example.org'
    }
  };

  it('maps show_end_date_warning=true to showEndDateWarning=true', () => {
    const mapped = mapApiProjectToFrontendProject(
      { ...baseApiProject, show_end_date_warning: true },
      'user'
    );

    expect(mapped.showEndDateWarning).toBe(true);
  });

  it('maps missing show_end_date_warning to false', () => {
    const mapped = mapApiProjectToFrontendProject(baseApiProject, 'user');

    expect(mapped.showEndDateWarning).toBe(false);
  });

  it('maps private true to visibility private', () => {
    const mapped = mapApiProjectToFrontendProject({ ...baseApiProject, private: true }, 'user');
    expect(mapped.visibility).toBe('private');
  });

  it('maps private false to visibility public', () => {
    const mapped = mapApiProjectToFrontendProject({ ...baseApiProject, private: false }, 'user');
    expect(mapped.visibility).toBe('public');
  });

  it('excludes project owner from coResponsibles even if present in co_owners', () => {
    const mapped = mapApiProjectToFrontendProject(
      {
        ...baseApiProject,
        owner_id: 7,
        co_owners: [
          { id: 7, first_name: 'Jane', last_name: 'Doe', full_name: 'Jane Doe' },
          { id: 9, first_name: 'Pat', last_name: 'Lee', full_name: 'Pat Lee' }
        ]
      },
      'user'
    );

    expect((mapped.coResponsibles ?? []).map((c) => c.id)).toEqual(['9']);
    expect(mapped.responsible?.id).toBe('7');
  });
});
