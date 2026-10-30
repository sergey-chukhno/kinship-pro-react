/**
 * Mock clôture session (P4.6 / P4.2-4·5 / P4.8 org) — aucun branchement API.
 */
import type { FormationSession } from '../types/formationSession';

const STORAGE_KEY = 'kinship_session_close_mock_v1';
const EVENT = 'kinship-session-close-mock';

export type JuryDecision = 'valid' | 'invalid';

export type MockPartner = {
  id: string;
  name: string;
  email: string;
  organization: string;
  functionLabel: string;
  token: string;
  invitedAt: string;
  coAttestedAt?: string;
};

export type MockCertificate = {
  participantId: string;
  name: string;
  status: 'sent' | 'failed';
  sentAt?: string;
  assiduity: string;
};

export type SessionCloseMock = {
  sessionId: string;
  endDeclared: boolean;
  endDeclaredAt?: string;
  endMessage?: string;
  closed: boolean;
  closedAt?: string;
  proofCode?: string;
  attachResults: boolean;
  showTrainerName: boolean;
  juryDecisions: Record<string, JuryDecision>;
  resultNotes: Record<string, string>;
  partners: MockPartner[];
  certificates: MockCertificate[];
};

type Store = Record<string, SessionCloseMock>;

function emit() {
  window.dispatchEvent(new CustomEvent(EVENT));
}

function read(): Store {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Store;
  } catch {
    return {};
  }
}

function write(store: Store) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  emit();
}

export function subscribeSessionCloseMock(cb: () => void): () => void {
  window.addEventListener(EVENT, cb);
  return () => window.removeEventListener(EVENT, cb);
}

function emptyMock(sessionId: string): SessionCloseMock {
  return {
    sessionId,
    endDeclared: false,
    closed: false,
    attachResults: false,
    showTrainerName: false,
    juryDecisions: {},
    resultNotes: {},
    partners: [],
    certificates: [],
  };
}

export function getSessionCloseMock(sessionId: string): SessionCloseMock {
  return read()[sessionId] || emptyMock(sessionId);
}

function upsert(sessionId: string, patch: Partial<SessionCloseMock>): SessionCloseMock {
  const store = read();
  const prev = store[sessionId] || emptyMock(sessionId);
  const next = { ...prev, ...patch, sessionId };
  store[sessionId] = next;
  write(store);
  return next;
}

export function deliversMicrocert(session: FormationSession): boolean {
  return Boolean(session.euMc);
}

export function declareSessionEndMock(
  sessionId: string,
  message?: string
): SessionCloseMock {
  const today = new Date().toISOString().slice(0, 10);
  return upsert(sessionId, {
    endDeclared: true,
    endDeclaredAt: today,
    endMessage: message?.trim() || undefined,
  });
}

export function ensureJuryDefaults(
  session: FormationSession,
  mock: SessionCloseMock
): SessionCloseMock {
  const participants = session.people.filter((p) => p.role === 'participant');
  if (participants.length === 0) return mock;
  let changed = false;
  const juryDecisions = { ...mock.juryDecisions };
  participants.forEach((p) => {
    if (!juryDecisions[p.id]) {
      juryDecisions[p.id] = 'valid';
      changed = true;
    }
  });
  return changed ? upsert(session.id, { juryDecisions }) : mock;
}

export function setJuryDecisionMock(
  sessionId: string,
  participantId: string,
  decision: JuryDecision
): SessionCloseMock {
  const mock = getSessionCloseMock(sessionId);
  return upsert(sessionId, {
    juryDecisions: { ...mock.juryDecisions, [participantId]: decision },
  });
}

export function setCloseOptionsMock(
  sessionId: string,
  opts: { attachResults?: boolean; showTrainerName?: boolean }
): SessionCloseMock {
  return upsert(sessionId, opts);
}

export function setResultNoteMock(
  sessionId: string,
  participantId: string,
  note: string
): SessionCloseMock {
  const mock = getSessionCloseMock(sessionId);
  return upsert(sessionId, {
    resultNotes: { ...mock.resultNotes, [participantId]: note },
  });
}

function proofCodeFor(sessionId: string): string {
  const tail = sessionId.replace(/\D/g, '').slice(-6) || '4K8NX2';
  const y = new Date().getFullYear();
  return `PF·${y}·FR·${tail.toUpperCase()}QM`;
}

export function closeAndDeliverMock(session: FormationSession): SessionCloseMock {
  const mock = ensureJuryDefaults(session, getSessionCloseMock(session.id));
  const today = new Date().toISOString().slice(0, 10);
  const participants = session.people.filter((p) => p.role === 'participant');
  const certificates: MockCertificate[] = participants.map((p, i) => ({
    participantId: p.id,
    name: p.name,
    status: i === participants.length - 1 && participants.length > 1 ? 'failed' : 'sent',
    sentAt: today,
    assiduity:
      i % 3 === 2
        ? '7 séances sur 8 — 7 présences vérifiées · Financement : CPF'
        : '8 séances sur 8 — 8 présences vérifiées · Financement : CPF',
  }));
  return upsert(session.id, {
    closed: true,
    closedAt: today,
    proofCode: proofCodeFor(session.id),
    certificates,
  });
}

export function addSessionPartnerMock(
  sessionId: string,
  input: { name: string; email: string; organization: string; functionLabel: string }
): SessionCloseMock {
  const mock = getSessionCloseMock(sessionId);
  const token = `coattest-${sessionId}-${Date.now().toString(36)}`;
  const partner: MockPartner = {
    id: `partner-${Date.now()}`,
    name: input.name.trim(),
    email: input.email.trim(),
    organization: input.organization.trim(),
    functionLabel: input.functionLabel.trim(),
    token,
    invitedAt: new Date().toISOString().slice(0, 10),
  };
  return upsert(sessionId, { partners: [...mock.partners, partner] });
}

export function findPartnerByToken(
  token: string
): { sessionId: string; partner: MockPartner; mock: SessionCloseMock } | null {
  const store = read();
  for (const mock of Object.values(store)) {
    const partner = mock.partners.find((p) => p.token === token);
    if (partner) return { sessionId: mock.sessionId, partner, mock };
  }
  return null;
}

export function coAttestPartnerMock(
  token: string,
  fields: { name: string; functionLabel: string; organization: string }
): SessionCloseMock | null {
  const hit = findPartnerByToken(token);
  if (!hit) return null;
  const partners = hit.mock.partners.map((p) =>
    p.token === token
      ? {
          ...p,
          name: fields.name.trim() || p.name,
          functionLabel: fields.functionLabel.trim() || p.functionLabel,
          organization: fields.organization.trim() || p.organization,
          coAttestedAt: new Date().toISOString().slice(0, 10),
        }
      : p
  );
  return upsert(hit.sessionId, { partners });
}

export function validInvalidCounts(mock: SessionCloseMock): {
  valid: number;
  invalid: number;
} {
  const values = Object.values(mock.juryDecisions);
  return {
    valid: values.filter((d) => d === 'valid').length,
    invalid: values.filter((d) => d === 'invalid').length,
  };
}

export function coAttestLinkFor(partner: MockPartner): string {
  return `/session-co-attest/${partner.token}`;
}
