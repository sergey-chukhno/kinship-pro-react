import {
  catalogSessionSummary,
  createFormationSession,
  declareSessionStart,
  getSessionById,
  getSessionsNeedingStartDeclaration,
  participantCountLabel,
  sessionHeroStatus,
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

  it('exposes next date in catalogue summary and seeds a first séance', () => {
    createFormationSession({
      catalogEntryId: 'cat-3',
      title: 'Bureautique',
      modality: 'presentiel',
      financement: 'Entreprise',
      euMc: false,
      orgName: 'School Demo',
      startDate: '2027-02-01',
      endDate: '2027-03-01',
      formateur: { source: 'structure', name: 'Marc Lefèvre', memberId: 'm1' },
    });
    const summary = catalogSessionSummary('cat-3');
    expect(summary.count).toBe(1);
    expect(summary.nextDate).toBe('2027-02-01');
  });

  it('keeps hero status À VENIR until start is declared even if start date passed', () => {
    const session = createFormationSession({
      catalogEntryId: 'cat-4',
      title: 'Statut',
      modality: 'presentiel',
      financement: 'OPCO',
      euMc: false,
      orgName: 'School Demo',
      startDate: '2020-01-01',
      endDate: '2099-12-01',
      formateur: { source: 'structure', name: 'Camille', memberId: 'm1' },
    });
    expect(sessionHeroStatus(session)).toBe('coming');
    expect(session.status).toBe('coming');
    declareSessionStart(session.id);
    const after = getSessionById(session.id)!;
    expect(sessionHeroStatus(after)).toBe('in_progress');
  });

  it('labels participant counts in French singular/plural', () => {
    expect(participantCountLabel(0)).toBe('0 participant');
    expect(participantCountLabel(1)).toBe('1 participant');
    expect(participantCountLabel(3)).toBe('3 participants');
  });
});
