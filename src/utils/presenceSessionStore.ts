/**
 * État démo session de présence (KIN_UX_TOTP V1.1.2) — sans API pour l'instant.
 * Permet au bandeau participant d'apparaître quand une session est ouverte.
 */

export type PresenceSessionStatus = 'idle' | 'open' | 'closed';

export interface ActivePresenceSession {
  status: PresenceSessionStatus;
  formationTitle: string;
  slotLabel: string; // ex. « Matinée »
  sessionDateLabel: string; // ex. « 15 septembre 2026 »
  confirmed: number;
  total: number;
  code: string;
}

const STORAGE_KEY = 'kinship_presence_session_demo';

const DEFAULT_SESSION: ActivePresenceSession = {
  status: 'idle',
  formationTitle: 'Titre professionnel ECM',
  slotLabel: 'Matinée',
  sessionDateLabel: '15 septembre 2026',
  confirmed: 12,
  total: 17,
  code: '472915',
};

function read(): ActivePresenceSession {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SESSION };
    return { ...DEFAULT_SESSION, ...JSON.parse(raw) };
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

export function openPresenceSession(partial?: Partial<ActivePresenceSession>): ActivePresenceSession {
  const next: ActivePresenceSession = {
    ...DEFAULT_SESSION,
    ...partial,
    status: 'open',
    code: generateCode(),
  };
  write(next);
  return next;
}

export function updatePresenceSession(partial: Partial<ActivePresenceSession>): ActivePresenceSession {
  const next = { ...read(), ...partial };
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
  window.dispatchEvent(new CustomEvent('kinship-presence-session', { detail: { ...DEFAULT_SESSION, status: 'idle' } }));
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
    cb(detail ?? read());
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
