/**
 * État démo session de présence (KIN_UX_TOTP V1.1.2) — sans API pour l'instant.
 * Permet au bandeau participant d'apparaître quand une session est ouverte.
 */

export type PresenceSessionStatus = 'idle' | 'open' | 'closed';

export interface ActivePresenceSession {
  status: PresenceSessionStatus;
  /** Identifiant unique de l’ouverture de session (nouveau à chaque ouverture) */
  sessionId: string;
  /** Formation liée */
  formationId: string;
  /** Créneau lié dans l’onglet Sessions (pas de nouvelle ligne à la clôture) */
  slotId: string;
  formationTitle: string;
  slotLabel: string; // ex. « Matinée »
  sessionDateLabel: string; // ex. « 15 septembre 2026 »
  confirmed: number;
  total: number;
  code: string;
  /** Démo participant : présence déjà confirmée pour cette ouverture (survit au refresh) */
  participantConfirmed: boolean;
}

const STORAGE_KEY = 'kinship_presence_session_demo';

const DEFAULT_SESSION: ActivePresenceSession = {
  status: 'idle',
  sessionId: '',
  formationId: '',
  slotId: '',
  formationTitle: 'Titre professionnel ECM',
  slotLabel: 'Matinée',
  sessionDateLabel: '15 septembre 2026',
  confirmed: 12,
  total: 17,
  code: '472915',
  participantConfirmed: false,
};

function normalize(raw: Partial<ActivePresenceSession> | null | undefined): ActivePresenceSession {
  const session: ActivePresenceSession = {
    ...DEFAULT_SESSION,
    ...(raw ?? {}),
    participantConfirmed: Boolean(raw?.participantConfirmed),
  };

  // Sessions ouvertes avant l’ajout de sessionId : en attribuer un stable (sans régénérer le code)
  if (session.status === 'open' && !session.sessionId) {
    session.sessionId = generateSessionId();
  }

  return session;
}

function read(): ActivePresenceSession {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SESSION };
    const session = normalize(JSON.parse(raw));
    // Persister le sessionId migré pour que la confirmation reste stable au refresh
    if (session.status === 'open' && session.sessionId) {
      const parsed = JSON.parse(raw) as Partial<ActivePresenceSession>;
      if (!parsed.sessionId) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
      }
    }
    return session;
  } catch {
    return { ...DEFAULT_SESSION };
  }
}

function write(session: ActivePresenceSession) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  window.dispatchEvent(new CustomEvent('kinship-presence-session', { detail: session }));
}

export function getPresenceSession(): ActivePresenceSession {
  return read();
}

export function generateSessionId(): string {
  return `ps-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Participant a déjà confirmé cette ouverture de session */
export function hasConfirmedPresenceSession(session?: ActivePresenceSession | null): boolean {
  const s = session ?? read();
  return s.status === 'open' && s.participantConfirmed === true;
}

/** Mémorise la confirmation pour cette session (pas pour les suivantes) */
export function markPresenceSessionConfirmed(): ActivePresenceSession {
  const current = read();
  if (current.status !== 'open') return current;
  const next: ActivePresenceSession = {
    ...current,
    sessionId: current.sessionId || generateSessionId(),
    participantConfirmed: true,
  };
  write(next);
  return next;
}

export function openPresenceSession(partial?: Partial<ActivePresenceSession>): ActivePresenceSession {
  const next: ActivePresenceSession = {
    ...DEFAULT_SESSION,
    ...partial,
    status: 'open',
    sessionId: generateSessionId(),
    code: generateCode(),
    // Nouvelle ouverture → redemander le code, même si partial contenait une ancienne conf
    participantConfirmed: false,
  };
  write(next);
  return next;
}

export function updatePresenceSession(partial: Partial<ActivePresenceSession>): ActivePresenceSession {
  const current = read();
  const next = normalize({
    ...current,
    ...partial,
    // Ne pas perdre la confirmation lors d’une rotation de code
    participantConfirmed:
      partial.participantConfirmed !== undefined
        ? Boolean(partial.participantConfirmed)
        : current.participantConfirmed,
  });
  write(next);
  return next;
}

export function closePresenceSession(): ActivePresenceSession {
  const next = { ...read(), status: 'closed' as const };
  write(next);
  return next;
}

export function clearPresenceSession(): void {
  localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(
    new CustomEvent('kinship-presence-session', { detail: { ...DEFAULT_SESSION, status: 'idle' } })
  );
}

export function generateCode(): string {
  let code = '';
  for (let i = 0; i < 6; i++) code += Math.floor(Math.random() * 10).toString();
  return code;
}

export function formatCodeDisplay(code: string): string {
  return code.split('').join(' ');
}

export function subscribePresenceSession(cb: (s: ActivePresenceSession) => void): () => void {
  const handler = (e: Event) => {
    const detail = (e as CustomEvent<ActivePresenceSession>).detail;
    cb(detail ? normalize(detail) : read());
  };
  const storageHandler = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) cb(read());
  };
  window.addEventListener('kinship-presence-session', handler);
  window.addEventListener('storage', storageHandler);
  return () => {
    window.removeEventListener('kinship-presence-session', handler);
    window.removeEventListener('storage', storageHandler);
  };
}
