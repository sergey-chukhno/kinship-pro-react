import {
  catalogSessionSummary,
  createFormationSession,
  declareSessionStart,
  getSessionById,
  getSessionsNeedingStartDeclaration,
} from './formationSessionStore';

function clearStorage() {
  localStorage.clear();
  sessionStorage.clear();
}

describe('formationSessionStore', () => {
  beforeEach(() => {
    clearStorage();
  });

  it('creates a session linked to a catalogue entry', () => {
    const session = createFormationSession({
      catalogEntryId: 'cat-1',
      title: 'React avancé',
      modality: 'presentiel',
      financement: 'OPCO',
      euMc: false,
      orgName: 'École Demo',
      startDate: '2026-11-01',
      endDate: '2026-11-15',
      formateur: { source: 'structure', name: 'Camille Dupont', memberId: 'm1' },
    });

    expect(session.id).toMatch(/^sess-/);
    expect(getSessionById(session.id)?.title).toBe('React avancé');
    expect(catalogSessionSummary('cat-1').count).toBe(1);
  });

  it('flags sessions needing start declaration when start date passed', () => {
    const past = '2020-01-01';
    const session = createFormationSession({
      catalogEntryId: 'cat-2',
      title: 'Session passée',
      modality: 'hybride',
      financement: 'CPF',
      euMc: true,
      orgName: 'Company Demo',
      startDate: past,
      endDate: '2099-01-01',
      formateur: { source: 'email', name: 'Alex', email: 'a@example.com' },
    });

    expect(getSessionsNeedingStartDeclaration().some((s) => s.id === session.id)).toBe(true);
    declareSessionStart(session.id);
    expect(getSessionById(session.id)?.startDeclared).toBe(true);
    expect(getSessionsNeedingStartDeclaration().some((s) => s.id === session.id)).toBe(false);
  });
});
