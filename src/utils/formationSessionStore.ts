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
const SPACE_TAB_KEY = 'kinship_session_space_tab';
const VIEWER_ROLE_KEY = 'kinship_session_viewer_role';
const EVENT = 'kinship-formation-sessions';

export type SessionSpaceTab = 'informations' | 'gestion';
export type SessionViewerRole = 'structure' | 'formateur';

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

/** Upsert API-backed session into local cache (TB + navigation). */
export function cacheFormationSession(session: FormationSession): FormationSession {
  const list = read();
  const idx = list.findIndex((s) => s.id === session.id);
  if (idx >= 0) list[idx] = session;
  else list.unshift(session);
  write(list);
  setSelectedSessionId(session.id);
  syncSessionToFormationStore(session);
  return session;
}

export function getSelectedSessionId(): string | null {
  return sessionStorage.getItem(SELECTED_KEY);
}

export function setSelectedSessionId(id: string | null) {
  if (id) sessionStorage.setItem(SELECTED_KEY, id);
  else sessionStorage.removeItem(SELECTED_KEY);
}

export function getSessionSpaceTab(): SessionSpaceTab {
  const t = sessionStorage.getItem(SPACE_TAB_KEY);
  return t === 'informations' ? 'informations' : 'gestion';
}

export function setSessionSpaceTab(tab: SessionSpaceTab) {
  sessionStorage.setItem(SPACE_TAB_KEY, tab);
}

export function openSessionSpace(id: string, tab: SessionSpaceTab = 'gestion') {
  setSelectedSessionId(id);
  setSessionSpaceTab(tab);
  setSessionViewerRole('structure');
}

export function getSessionViewerRole(): SessionViewerRole {
  return sessionStorage.getItem(VIEWER_ROLE_KEY) === 'formateur' ? 'formateur' : 'structure';
}

export function setSessionViewerRole(role: SessionViewerRole) {
  sessionStorage.setItem(VIEWER_ROLE_KEY, role);
}

export function openSessionAffiche(id: string, role: SessionViewerRole = 'structure') {
  setSelectedSessionId(id);
  setSessionViewerRole(role);
  const session = getSessionById(id);
  if (session) syncSessionToFormationStore(session);
  setSelectedFormationId(id);
}

/** Chip / hero: À VENIR until formateur declares start — never EN COURS from date alone. */
export function sessionHeroStatus(
  session: Pick<FormationSession, 'startDeclared' | 'startDate' | 'endDate' | 'status'>
): 'coming' | 'in_progress' | 'ended' {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const end = new Date(`${session.endDate}T23:59:59`);
  if (session.startDeclared && today > end) return 'ended';
  if (session.startDeclared) return 'in_progress';
  return 'coming';
}

function deriveStoredStatus(
  startDate: string,
  endDate: string,
  startDeclared: boolean
): FormationSession['status'] {
  return sessionHeroStatus({ startDeclared, startDate, endDate, status: 'coming' });
}

function syncSessionToFormationStore(session: FormationSession) {
  const hours = session.durationHours ? Number(String(session.durationHours).replace(',', '.')) : undefined;
  const hero = sessionHeroStatus(session);
  const card: FormationCard = {
    id: session.id,
    title: session.title,
    description: session.description,
    status: hero === 'coming' ? 'coming' : hero === 'ended' ? 'ended' : 'in_progress',
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
    status: 'coming',
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
  next.status = deriveStoredStatus(next.startDate, next.endDate, next.startDeclared);
  list[idx] = next;
  write(list);
  syncSessionToFormationStore(next);
  return next;
}

export function declareSessionStart(id: string): FormationSession | null {
  return updateFormationSession(id, { startDeclared: true, status: 'in_progress' });
}

export function addSessionSeance(
  id: string,
  partial?: Partial<FormationSession['seances'][0]>
): FormationSession | null {
  const session = getSessionById(id);
  if (!session) return null;
  const n = session.seances.length + 1;
  const seance = {
    id: `seance-${Date.now()}`,
    label: partial?.label || `Séance ${n}`,
    dateIso: partial?.dateIso || session.startDate,
    timeRange: partial?.timeRange || '09h00 — 12h30',
    status: (partial?.status || 'planned') as FormationSession['seances'][0]['status'],
    place: partial?.place,
  };
  addFormationSlot(id, {
    id: seance.id,
    label: seance.label,
    dateLabel: formatSlotDateLabel(new Date(`${seance.dateIso}T12:00:00`)),
    dateIso: seance.dateIso,
    timeRange: seance.timeRange,
    participantsCount: session.people.filter((p) => p.role === 'participant').length,
    place: seance.place,
    status: 'planned',
  });
  return updateFormationSession(id, { seances: [...session.seances, seance] });
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
  const sessions = getSessionsForCatalogEntry(catalogEntryId).filter(
    (s) => sessionHeroStatus(s) !== 'ended'
  );
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

export function participantCountLabel(count: number): string {
  return count === 1 ? '1 participant' : `${count} participants`;
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
