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
});
