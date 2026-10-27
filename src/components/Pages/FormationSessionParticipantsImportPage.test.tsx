import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import FormationSessionParticipantsImportPage from './FormationSessionParticipantsImportPage';
import { createFormationSession } from '../../utils/formationSessionStore';

const mockNavigate = jest.fn();
const mockAnalyze = jest.fn();
const mockImport = jest.fn();
const mockDownload = jest.fn();
const mockGetSession = jest.fn();

jest.mock(
  'react-router-dom',
  () => ({
    useNavigate: () => mockNavigate,
    useLocation: () => ({ pathname: '/formation-session-import/sess-test' }),
  }),
  { virtual: true }
);

jest.mock('../../api/FormationSessionParticipantsImport', () => ({
  analyzeSessionParticipantsImport: (...args: unknown[]) => mockAnalyze(...args),
  importSessionParticipants: (...args: unknown[]) => mockImport(...args),
  downloadSessionParticipantsImportTemplate: (...args: unknown[]) => mockDownload(...args),
}));

jest.mock('../../api/FormationSessions', () => ({
  getFormationSession: (...args: unknown[]) => mockGetSession(...args),
}));

jest.mock('../../context/AppContext', () => ({
  useAppContext: () => ({
    setCurrentPage: jest.fn(),
    state: {
      user: { id: '1', name: 'Claire', email: 'c@x.fr', role: 'admin', avatar: '' },
      showingPageType: 'pro',
    },
  }),
}));

jest.mock('../../api/formationCatalogOrg', () => ({
  resolveCatalogueOrg: () => ({
    type: 'Company',
    id: 19,
    name: 'CFPJ',
    initials: 'CF',
    key: 'company-19',
  }),
}));

describe('FormationSessionParticipantsImportPage', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    mockNavigate.mockReset();
    mockAnalyze.mockReset();
    mockImport.mockReset();
    mockDownload.mockReset();
    mockGetSession.mockReset();
    mockGetSession.mockResolvedValue(null);

    createFormationSession({
      catalogEntryId: 'cat-1',
      title: 'Journaliste',
      modality: 'presentiel',
      financement: 'OPCO',
      euMc: false,
      orgName: 'CFPJ',
      organizationId: 19,
      organizationType: 'Company',
      startDate: '2026-11-01',
      endDate: '2026-11-15',
      formateur: { source: 'structure', name: 'Antoine', memberId: '1', userId: 1 },
    });
    // Force id used in useLocation mock
    const raw = localStorage.getItem('kinship_formation_sessions_fe16');
    const list = raw ? JSON.parse(raw) : [];
    if (list[0]) {
      list[0].id = 'sess-test';
      localStorage.setItem('kinship_formation_sessions_fe16', JSON.stringify(list));
    }
  });

  it('renders pick state without stepper and with CSV template link', () => {
    render(<FormationSessionParticipantsImportPage />);
    expect(screen.getByText(/Importer la liste des participants/i)).toBeInTheDocument();
    expect(screen.getByText(/Télécharger le modèle \(CSV\)/i)).toBeInTheDocument();
    expect(screen.queryByText(/1 · Catalogue/i)).toBeNull();
    expect(screen.queryByText(/Options de la session/i)).toBeNull();
    expect(screen.queryByText(/créés/i)).toBeNull();
    expect(screen.queryByText(/rapprochés/i)).toBeNull();
  });

  it('shows analyze preview then import recap with inscribed_count only', async () => {
    mockAnalyze.mockResolvedValue({
      detected_count: 20,
      importable_count: 18,
      preview_rows: [
        {
          line: 2,
          first_name: 'Alice',
          last_name: 'Dupont',
          birthday: '2015-03-14',
          email: 'alice@example.org',
        },
      ],
      warnings: [
        {
          line: 2,
          code: 'under_15',
          message: 'date de naissance : moins de 15 ans',
        },
      ],
      reject_preview: [{ line: 5, reason_code: 'unreadable_date', message: 'Date illisible' }],
      limits: { max_rows: 5000, max_bytes: 20971520 },
    });
    mockImport.mockResolvedValue({
      inscribed_count: 18,
      rejected: [{ line: 5, reason_code: 'unreadable_date', message: 'Date illisible' }],
    });

    const { container } = render(<FormationSessionParticipantsImportPage />);
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['Nom;Prénom'], 'participants.csv', { type: 'text/csv' });
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText(/20 participants détectés/i)).toBeInTheDocument();
    });
    expect(screen.getByText('Dupont')).toBeInTheDocument();
    expect(screen.getByText(/date de naissance : moins de 15 ans/i)).toBeInTheDocument();
    expect(screen.getByText(/Ligne 5 — Date illisible/i)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Importer les 18 participants/i })
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Importer les 18 participants/i }));

    await waitFor(() => {
      expect(screen.getByText(/Import terminé/i)).toBeInTheDocument();
    });
    expect(screen.getByText('18')).toBeInTheDocument();
    expect(screen.getByText(/^inscrits$/i)).toBeInTheDocument();
    expect(screen.queryByText(/créés/i)).toBeNull();
    expect(screen.queryByText(/rapprochés/i)).toBeNull();
    expect(mockImport).toHaveBeenCalled();
  });
});
