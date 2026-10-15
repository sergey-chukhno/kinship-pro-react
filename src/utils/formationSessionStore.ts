/**
 * Store démo sessions formation (ticket 16) — School/Company, sans API.
 */
import type { FormationCard } from '../data/mockFormations';
import type { CreateSessionInput, FormationSession } from '../types/formationSession';
import {
  addFormationSlot,
  formatSlotDateLabel,
  setSelectedFormationId,
  upsertFormation,
} from './formationStore';

const STORAGE_KEY = 'kinship_formation_sessions_fe16';
const SELECTED_KEY = 'kinship_selected_session_id';
const EVENT = 'kinship-formation-sessions';

function emit() {
  window.dispatchEvent(new CustomEvent(EVENT));
}

function read(): FormationSession[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as FormationSession[];
  } catch {
    return [];
  }
}

function write(list: FormationSession[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  emit();
}

export function getFormationSessions(): FormationSession[] {
  return read();
}

export function getSessionsForCatalogEntry(catalogEntryId: string): FormationSession[] {
  return read().filter((s) => s.catalogEntryId === catalogEntryId);
}

export function getSessionById(id: string): FormationSession | undefined {
  return read().find((s) => s.id === id);
}

export function getSelectedSessionId(): string | null {
  return sessionStorage.getItem(SELECTED_KEY);
}

export function setSelectedSessionId(id: string | null) {
  if (id) sessionStorage.setItem(SELECTED_KEY, id);
  else sessionStorage.removeItem(SELECTED_KEY);
}

export function openSessionSpace(id: string) {
  setSelectedSessionId(id);
}

export function openSessionAffiche(id: string) {
  setSelectedSessionId(id);
  const session = getSessionById(id);
  if (session) syncSessionToFormationStore(session);
  setSelectedFormationId(id);
}

function deriveStatus(startDate: string, endDate: string): FormationSession['status'] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T23:59:59`);
  if (today > end) return 'ended';
  if (today >= start) return 'in_progress';
  return 'coming';
}

function syncSessionToFormationStore(session: FormationSession) {
  const hours = session.durationHours ? Number(String(session.durationHours).replace(',', '.')) : undefined;
  const card: FormationCard = {
    id: session.id,
    title: session.title,
    description: session.description,
    status: session.status === 'coming' ? 'coming' : session.status === 'ended' ? 'ended' : 'in_progress',
    financement: session.financement || undefined,
    isEuMcDeclared: session.euMc,
    startDate: session.startDate,
    endDate: session.endDate,
    attendanceSurveyOptIn: session.attendanceSurveyOptIn,
    durationHours: Number.isFinite(hours) ? hours : undefined,
    participationMode: session.modality || undefined,
    orgName: session.orgName,
    meta: `${session.formateur.name} · ${session.startDate}`,
    frameLocked: true,
  };
  upsertFormation(card);
}

export function createFormationSession(input: CreateSessionInput): FormationSession {
  const now = new Date().toISOString();
  const status = deriveStatus(input.startDate, input.endDate);
  const session: FormationSession = {
    id: `sess-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    catalogEntryId: input.catalogEntryId,
    title: input.title,
    description: input.description,
    durationHours: input.durationHours,
    modality: input.modality,
    financement: input.financement,
    euMc: input.euMc,
    orgName: input.orgName,
    startDate: input.startDate,
    endDate: input.endDate,
    formateur: input.formateur,
    practicalInfo: input.practicalInfo,
    imageDataUrl: input.imageDataUrl,
    status,
    startDeclared: false,
    attendanceSurveyOptIn: false,
    people: [
      {
        id: 'formateur-1',
        name: input.formateur.name,
        email: input.formateur.email,
        role: 'formateur',
      },
    ],
    seances: [
      {
        id: `seance-${Date.now()}`,
        label: 'Séance 1',
        dateIso: input.startDate,
        timeRange: '09h00 — 12h30',
        status: 'planned',
        place: 'À préciser',
      },
    ],
    createdAt: now,
    updatedAt: now,
  };
  write([session, ...read()]);
  setSelectedSessionId(session.id);
  syncSessionToFormationStore(session);
  const first = session.seances[0];
  if (first) {
    addFormationSlot(session.id, {
      id: first.id,
      label: first.label,
      dateLabel: formatSlotDateLabel(new Date(`${first.dateIso}T12:00:00`)),
      dateIso: first.dateIso,
      timeRange: first.timeRange,
      participantsCount: 0,
      place: first.place,
      status: 'planned',
    });
  }
  return session;
}

export function updateFormationSession(
  id: string,
  patch: Partial<FormationSession>
): FormationSession | null {
  const list = read();
  const idx = list.findIndex((s) => s.id === id);
  if (idx < 0) return null;
  const next = { ...list[idx], ...patch, updatedAt: new Date().toISOString() };
  if (patch.startDate || patch.endDate) {
    next.status = deriveStatus(next.startDate, next.endDate);
  }
  list[idx] = next;
  write(list);
  syncSessionToFormationStore(next);
  return next;
}

export function declareSessionStart(id: string): FormationSession | null {
  return updateFormationSession(id, { startDeclared: true, status: 'in_progress' });
}

/** Sessions dont le début est passé et non déclaré (TB formateur P4.9). */
export function getSessionsNeedingStartDeclaration(): FormationSession[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return read().filter((s) => {
    if (s.startDeclared || s.status === 'ended') return false;
    const start = new Date(`${s.startDate}T00:00:00`);
    return start <= today;
  });
}

export function catalogSessionSummary(catalogEntryId: string): {
  count: number;
  nextDate?: string;
} {
  const sessions = getSessionsForCatalogEntry(catalogEntryId).filter((s) => s.status !== 'ended');
  if (!sessions.length) return { count: 0 };
  const sorted = [...sessions].sort((a, b) => a.startDate.localeCompare(b.startDate));
  return { count: sessions.length, nextDate: sorted[0]?.startDate };
}

export function formatSessionDateFr(iso?: string): string {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

export function sessionStatusLabel(status: FormationSession['status']): string {
  if (status === 'coming') return 'À venir';
  if (status === 'in_progress') return 'En cours';
  return 'Terminée';
}

export function subscribeFormationSessions(cb: () => void): () => void {
  const handler = () => cb();
  const storage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) cb();
  };
  window.addEventListener(EVENT, handler);
  window.addEventListener('storage', storage);
  return () => {
    window.removeEventListener(EVENT, handler);
    window.removeEventListener('storage', storage);
  };
}
