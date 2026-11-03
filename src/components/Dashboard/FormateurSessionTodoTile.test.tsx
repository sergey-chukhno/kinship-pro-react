import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import FormateurSessionTodoTile from './FormateurSessionTodoTile';
import {
  createFormationSession,
  declareSessionStart,
  updateFormationSession,
} from '../../utils/formationSessionStore';

jest.mock(
  'react-router-dom',
  () => ({
    useNavigate: () => jest.fn(),
  }),
  { virtual: true }
);

jest.mock('../../api/FormationSessions', () => ({
  __esModule: true,
  syncOrgFormationSessions: () => Promise.resolve([]),
}));

jest.mock('../../context/AppContext', () => ({
  useAppContext: () => ({
    setCurrentPage: jest.fn(),
    state: {
      user: { id: '1', name: 'Alex', email: 'a@x.fr', role: 'admin', avatar: '' },
      showingPageType: 'edu',
    },
  }),
}));

jest.mock('../../api/formationCatalogOrg', () => ({
  resolveCatalogueOrg: () => ({
    type: 'School',
    id: 1,
    name: 'École Demo',
    initials: 'ED',
    key: 'school-1',
  }),
}));

describe('FormateurSessionTodoTile (P4.9 retouches)', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('does not show presence CTAs when attendanceSurveyOptIn is false', async () => {
    const session = createFormationSession({
      catalogEntryId: 'cat-f',
      title: 'Sans présence',
      modality: 'presentiel',
      financement: 'OPCO',
      euMc: false,
      orgName: 'School',
      startDate: '2020-01-01',
      endDate: '2099-01-01',
      formateur: { source: 'structure', name: 'Alex', memberId: '1', userId: 1 },
    });
    declareSessionStart(session.id);
    updateFormationSession(session.id, { attendanceSurveyOptIn: false });

    render(<FormateurSessionTodoTile />);
    await waitFor(() => {
      expect(screen.queryByText(/Ouvrir la session de présence/i)).toBeNull();
    });
    expect(screen.queryByText(/Clôturer la séance/i)).toBeNull();
  });

  it('shows presence CTAs when attendanceSurveyOptIn is true after start declared', async () => {
    const session = createFormationSession({
      catalogEntryId: 'cat-f2',
      title: 'Avec présence',
      modality: 'presentiel',
      financement: 'OPCO',
      euMc: false,
      orgName: 'School',
      startDate: '2020-01-01',
      endDate: '2099-01-01',
      formateur: { source: 'structure', name: 'Alex', memberId: '1', userId: 1 },
    });
    declareSessionStart(session.id);
    updateFormationSession(session.id, { attendanceSurveyOptIn: true });

    render(<FormateurSessionTodoTile />);
    await waitFor(() => {
      expect(screen.getAllByText(/Ouvrir la session de présence/i).length).toBeGreaterThan(0);
    });
  });
});
