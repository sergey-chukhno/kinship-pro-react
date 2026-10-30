import type { FormationSession } from '../types/formationSession';
import {
  addSessionPartnerMock,
  closeAndDeliverMock,
  coAttestPartnerMock,
  declareSessionEndMock,
  deliversMicrocert,
  findPartnerByToken,
  getSessionCloseMock,
  setJuryDecisionMock,
  validInvalidCounts,
} from './sessionCloseMock';

const session = (over: Partial<FormationSession> = {}): FormationSession => ({
  id: '76',
  catalogEntryId: 'c1',
  title: 'Test session',
  modality: 'hybride',
  financement: 'CPF',
  euMc: false,
  orgName: 'CFPJ',
  startDate: '2026-01-04',
  endDate: '2026-04-16',
  formateur: { source: 'structure', name: 'Wassim Vidal', userId: 1 },
  status: 'in_progress',
  startDeclared: true,
  attendanceSurveyOptIn: true,
  people: [
    { id: 'p1', name: 'Alice Dupont', role: 'participant' },
    { id: 'p2', name: 'Leo Martin', role: 'participant' },
  ],
  seances: [],
  createdAt: '',
  updatedAt: '',
  ...over,
});

describe('sessionCloseMock', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('declares end then closes and delivers certificates', () => {
    declareSessionEndMock('76', 'Message jury');
    let mock = getSessionCloseMock('76');
    expect(mock.endDeclared).toBe(true);
    expect(mock.endMessage).toBe('Message jury');

    setJuryDecisionMock('76', 'p2', 'invalid');
    mock = closeAndDeliverMock(session());
    expect(mock.closed).toBe(true);
    expect(mock.proofCode).toMatch(/^PF·/);
    expect(mock.certificates).toHaveLength(2);
    const counts = validInvalidCounts(mock);
    expect(counts.invalid).toBe(1);
  });

  it('uses microcert wording flag from euMc', () => {
    expect(deliversMicrocert(session({ euMc: true }))).toBe(true);
    expect(deliversMicrocert(session({ euMc: false }))).toBe(false);
  });

  it('invites partner and co-attests via token', () => {
    const afterAdd = addSessionPartnerMock('76', {
      name: 'R. Dutto',
      email: 'dutto@example.org',
      organization: 'Dutto Conseil',
      functionLabel: 'Expert-comptable',
    });
    const partner = afterAdd.partners[0];
    expect(partner.token).toMatch(/^coattest-/);
    expect(findPartnerByToken(partner.token)?.partner.email).toBe('dutto@example.org');

    const after = coAttestPartnerMock(partner.token, {
      name: 'R. Dutto',
      functionLabel: 'Expert-comptable',
      organization: 'Dutto Conseil',
    });
    expect(after?.partners[0].coAttestedAt).toBeTruthy();
  });
});
