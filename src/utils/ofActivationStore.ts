/**
 * Activation OF — démo locale (F0).
 * L’espace reste à la couleur de la structure pendant toute l’activation ;
 * le pétrole n’arrive qu’à la validation (espace OF).
 */

export type OfActivationStatus = 'idle' | 'submitted' | 'verifying' | 'rejected' | 'activated';
export type OfRejectField = 'nda' | 'qualiopi' | 'siret';

export interface OfActivationDoc {
  name: string;
}

export interface OfActivationChecks {
  siret: boolean;
  nda: boolean;
  qualiopi: boolean;
}

export interface OfActivationDossier {
  id: string;
  orgName: string;
  siret: string;
  nda: string;
  qualiopiUntil: string;
  qualiopiDocName?: string;
  extraDocs: OfActivationDoc[];
  opcoRef?: string;
  submittedAt: string;
  status: OfActivationStatus;
  checks: OfActivationChecks;
  cguAccepted: boolean;
  rejectMotif?: string;
  rejectField?: OfRejectField;
  calledAt?: string;
  isMine?: boolean;
}

const MINE_KEY = 'kinship_of_activation_mine';
const QUEUE_KEY = 'kinship_of_activation_queue';
const EVENT = 'kinship-of-activation';

const OF_CONTEXT_ID = 'of-demo';
const RESTORE_FLAG = 'kinship_of_role_restored_v1';

const DEFAULT_MINE: OfActivationDossier = {
  id: 'mine',
  orgName: 'Atelier Numérique Formation',
  siret: '842 517 693 00027',
  nda: '93 13 01234 13',
  qualiopiUntil: '12/03/2027',
  extraDocs: [],
  submittedAt: '',
  status: 'activated',
  checks: { siret: true, nda: true, qualiopi: true },
  cguAccepted: true,
  isMine: true,
};

const SEED_QUEUE: OfActivationDossier[] = [
  {
    id: 'q-alm',
    orgName: 'Atelier Langues & Métiers',
    siret: '531 204 887 00019',
    nda: '76 34 09112 34',
    qualiopiUntil: '',
    extraDocs: [{ name: 'habilitation-rncp.pdf' }, { name: 'recepisse-nda.pdf' }],
    opcoRef: 'Uniformation',
    submittedAt: new Date(Date.now() - 28 * 3600 * 1000).toISOString(),
    status: 'submitted',
    checks: { siret: false, nda: false, qualiopi: false },
    cguAccepted: true,
  },
  {
    id: 'q-ihs',
    orgName: 'Institut Horizon Santé',
    siret: '489 112 003 00045',
    nda: '84 69 11207 69',
    qualiopiUntil: '02/11/2026',
    qualiopiDocName: 'certificat-qualiopi-2026.pdf',
    extraDocs: [],
    submittedAt: new Date(Date.now() - 52 * 3600 * 1000).toISOString(),
    status: 'verifying',
    checks: { siret: true, nda: true, qualiopi: true },
    cguAccepted: true,
  },
];

function emit() {
  window.dispatchEvent(new CustomEvent(EVENT));
}

function readMine(): OfActivationDossier {
  try {
    const raw = localStorage.getItem(MINE_KEY);
    if (!raw) return { ...DEFAULT_MINE };
    const stored = { ...DEFAULT_MINE, ...(JSON.parse(raw) as OfActivationDossier), isMine: true };
    return stored;
  } catch {
    return { ...DEFAULT_MINE };
  }
}

/** Entre dans l’espace OF (pétrole) — switcher + couleur d’espace. */
export function enterOfSpace() {
  localStorage.setItem('selectedPageType', 'of');
  localStorage.setItem('selectedContextType', 'formation');
  localStorage.setItem('selectedContextId', OF_CONTEXT_ID);
}

/** Valide le dossier OF démo et pose le rôle dans le switcher. */
export function activateMyOf(): OfActivationDossier {
  const current = readMine();
  const next: OfActivationDossier = {
    ...current,
    orgName: current.orgName || DEFAULT_MINE.orgName,
    nda: current.nda || DEFAULT_MINE.nda,
    qualiopiUntil: current.qualiopiUntil || DEFAULT_MINE.qualiopiUntil,
    status: 'activated',
    checks: { siret: true, nda: true, qualiopi: true },
    cguAccepted: true,
    isMine: true,
  };
  writeMine(next);
  return next;
}

/** Une fois : active l’OF et bascule l’espace courant dessus. */
export function restoreOfRoleContext(): OfActivationDossier {
  const next = activateMyOf();
  enterOfSpace();
  localStorage.setItem(RESTORE_FLAG, '1');
  return next;
}

function writeMine(dossier: OfActivationDossier) {
  localStorage.setItem(MINE_KEY, JSON.stringify({ ...dossier, isMine: true }));
  emit();
}

function readQueue(): OfActivationDossier[] {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    if (!raw) {
      localStorage.setItem(QUEUE_KEY, JSON.stringify(SEED_QUEUE));
      return [...SEED_QUEUE];
    }
    return JSON.parse(raw) as OfActivationDossier[];
  } catch {
    return [...SEED_QUEUE];
  }
}

function writeQueue(list: OfActivationDossier[]) {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(list));
  emit();
}

export function getMyOfActivation(): OfActivationDossier {
  return readMine();
}

export function getOfActivationStatus(): OfActivationStatus {
  return readMine().status;
}

export function isOfActivated(): boolean {
  return readMine().status === 'activated';
}

export function canBrowseFormationsReadOnly(): boolean {
  const status = readMine().status;
  return status === 'verifying' || status === 'activated';
}

export function canCreateFormation(): boolean {
  return readMine().status === 'activated';
}

export function saveMyOfDraft(patch: Partial<OfActivationDossier>): OfActivationDossier {
  const next = { ...readMine(), ...patch, isMine: true };
  writeMine(next);
  return next;
}

export function submitMyOfDossier(patch: Partial<OfActivationDossier>): OfActivationDossier {
  const next: OfActivationDossier = {
    ...readMine(),
    ...patch,
    id: 'mine',
    status: 'submitted',
    submittedAt: new Date().toISOString(),
    checks: { siret: true, nda: false, qualiopi: false },
    rejectMotif: undefined,
    rejectField: undefined,
    cguAccepted: true,
    isMine: true,
  };
  writeMine(next);
  const queue = readQueue().filter((d) => d.id !== 'mine');
  writeQueue([next, ...queue]);
  return next;
}

export function getOfActivationQueue(): OfActivationDossier[] {
  const queue = readQueue();
  const mine = readMine();
  if (mine.status === 'submitted' || mine.status === 'verifying' || mine.status === 'rejected') {
    const without = queue.filter((d) => d.id !== 'mine');
    return [mine, ...without];
  }
  return queue;
}

export function updateOfQueueDossier(
  id: string,
  patch: Partial<OfActivationDossier>
): OfActivationDossier | null {
  if (id === 'mine') {
    const next = { ...readMine(), ...patch, isMine: true };
    writeMine(next);
    const queue = readQueue().map((d) => (d.id === 'mine' ? next : d));
    if (!queue.some((d) => d.id === 'mine') && (next.status === 'submitted' || next.status === 'verifying')) {
      writeQueue([next, ...queue]);
    } else {
      writeQueue(queue.filter((d) => d.id !== 'mine' || next.status !== 'activated'));
    }
    return next;
  }
  const list = readQueue();
  const idx = list.findIndex((d) => d.id === id);
  if (idx < 0) return null;
  list[idx] = { ...list[idx], ...patch };
  writeQueue(list);
  return list[idx];
}

export function markOfChecks(id: string, checks: OfActivationChecks): OfActivationDossier | null {
  const allDone = checks.siret && checks.nda && checks.qualiopi;
  return updateOfQueueDossier(id, {
    checks,
    status: allDone ? 'verifying' : 'submitted',
  });
}

export function callOfDossier(id: string): OfActivationDossier | null {
  return updateOfQueueDossier(id, { calledAt: new Date().toISOString() });
}

export function validateOfDossier(id: string): OfActivationDossier | null {
  return updateOfQueueDossier(id, { status: 'activated' });
}

export function refuseOfDossier(
  id: string,
  motif: string,
  field: OfRejectField = 'nda'
): OfActivationDossier | null {
  return updateOfQueueDossier(id, {
    status: 'rejected',
    rejectMotif: motif,
    rejectField: field,
  });
}

export function subscribeOfActivation(cb: () => void): () => void {
  const handler = () => cb();
  const storage = (e: StorageEvent) => {
    if (e.key === MINE_KEY || e.key === QUEUE_KEY) cb();
  };
  window.addEventListener(EVENT, handler);
  window.addEventListener('storage', storage);
  return () => {
    window.removeEventListener(EVENT, handler);
    window.removeEventListener('storage', storage);
  };
}

export function delayLabel(iso: string): { text: string; overdue: boolean } {
  if (!iso) return { text: '—', overdue: false };
  const hours = Math.max(0, (Date.now() - new Date(iso).getTime()) / 36e5);
  const days = Math.floor(hours / 24);
  return { text: `J+${days}`, overdue: days >= 2 };
}

export function formatSubmittedAt(iso: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
