/**
 * Store démo formations OF — partagé hub ↔ fiche détail (sans API).
 */
import { FormationCard, MOCK_FORMATIONS } from '../data/mockFormations';

const STORAGE_KEY = 'kinship_formations_demo';
const SELECTED_ID_KEY = 'kinship_selected_formation_id';

function read(): FormationCard[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      write([...MOCK_FORMATIONS]);
      return [...MOCK_FORMATIONS];
    }
    const stored = JSON.parse(raw) as FormationCard[];
    // Complète les champs manquants (ex. description) depuis les mocks d’origine
    return stored.map((f) => {
      const seed = MOCK_FORMATIONS.find((m) => m.id === f.id);
      if (!seed) return f;
      return {
        ...f,
        description: f.description ?? seed.description,
      };
    });
  } catch {
    return [...MOCK_FORMATIONS];
  }
}

function write(formations: FormationCard[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(formations));
  window.dispatchEvent(new CustomEvent('kinship-formations', { detail: formations }));
}

export function getFormations(): FormationCard[] {
  return read();
}

export function getFormationById(id: string): FormationCard | undefined {
  return read().find((f) => f.id === id);
}

/** Formation courante (fiche / PF) — hors URL */
export function getSelectedFormationId(): string | null {
  return sessionStorage.getItem(SELECTED_ID_KEY);
}

export function setSelectedFormationId(id: string | null) {
  if (id) sessionStorage.setItem(SELECTED_ID_KEY, id);
  else sessionStorage.removeItem(SELECTED_ID_KEY);
  window.dispatchEvent(new CustomEvent('kinship-selected-formation', { detail: id }));
}

export function getSelectedFormation(): FormationCard | undefined {
  const id = getSelectedFormationId();
  return id ? getFormationById(id) : undefined;
}

export function setFormations(formations: FormationCard[]) {
  write(formations);
}

export function upsertFormation(formation: FormationCard) {
  const list = read();
  const idx = list.findIndex((f) => f.id === formation.id);
  if (idx >= 0) list[idx] = formation;
  else list.unshift(formation);
  write(list);
  return formation;
}

export function updateFormation(id: string, patch: Partial<FormationCard>) {
  const list = read();
  const idx = list.findIndex((f) => f.id === id);
  if (idx < 0) return null;
  list[idx] = { ...list[idx], ...patch };
  write(list);
  return list[idx];
}

export function deleteFormation(id: string) {
  write(read().filter((f) => f.id !== id));
}

export function subscribeFormations(cb: (list: FormationCard[]) => void): () => void {
  const handler = (e: Event) => {
    const detail = (e as CustomEvent<FormationCard[]>).detail;
    cb(detail ?? read());
  };
  const storageHandler = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) cb(read());
  };
  window.addEventListener('kinship-formations', handler);
  window.addEventListener('storage', storageHandler);
  return () => {
    window.removeEventListener('kinship-formations', handler);
    window.removeEventListener('storage', storageHandler);
  };
}

export interface FormationParticipant {
  id: string;
  name: string;
  identityVerified: boolean;
}

/** Participants démo pour la fiche — la 26 : ✓ vert / ⚠ orange */
export function getMockParticipants(formationId: string): FormationParticipant[] {
  const base: FormationParticipant[] = [
    { id: 'p1', name: 'Amina Benali', identityVerified: true },
    { id: 'p2', name: 'Lucas Martin', identityVerified: true },
    { id: 'p3', name: 'Sofia Rossi', identityVerified: false },
    { id: 'p4', name: 'Yanis Dupont', identityVerified: true },
    { id: 'p5', name: 'Chloé Bernard', identityVerified: false },
    { id: 'p6', name: 'Hugo Petit', identityVerified: true },
    { id: 'p7', name: 'Inès Moreau', identityVerified: false },
    { id: 'p8', name: 'Noah Garcia', identityVerified: true },
    { id: 'p9', name: 'Léa Roux', identityVerified: true },
  ];

  if (formationId === 'f3') {
    return [
      ...base,
      { id: 'p10', name: 'Adam Lefevre', identityVerified: true },
      { id: 'p11', name: 'Emma Girard', identityVerified: true },
      { id: 'p12', name: 'Jules Fontaine', identityVerified: true },
      { id: 'p13', name: 'Manon Chevalier', identityVerified: true },
      { id: 'p14', name: 'Tom Renard', identityVerified: true },
      { id: 'p15', name: 'Léna Blanc', identityVerified: true },
      { id: 'p16', name: 'Paul Mercier', identityVerified: true },
      { id: 'p17', name: 'Jade Laurent', identityVerified: true },
    ];
  }
  if (formationId === 'f2') {
    return base.slice(0, 12);
  }
  if (formationId === 'f4') {
    return base;
  }
  return base.slice(0, 6);
}

export type FormationSlotStatus = 'planned' | 'open' | 'closed';

export interface FormationSlot {
  id: string;
  label: string;
  dateLabel: string;
  timeRange: string;
  participantsCount: number;
  status: FormationSlotStatus;
}

const SLOTS_STORAGE_KEY = 'kinship_formation_slots_demo';

type SlotsByFormation = Record<string, FormationSlot[]>;

function readSlotsMap(): SlotsByFormation {
  try {
    const raw = localStorage.getItem(SLOTS_STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as SlotsByFormation;
  } catch {
    return {};
  }
}

function writeSlotsMap(map: SlotsByFormation) {
  localStorage.setItem(SLOTS_STORAGE_KEY, JSON.stringify(map));
  window.dispatchEvent(new CustomEvent('kinship-formation-slots', { detail: map }));
}

function normalizeSlot(slot: Partial<FormationSlot> & Pick<FormationSlot, 'id' | 'label' | 'dateLabel' | 'timeRange' | 'participantsCount'>): FormationSlot {
  return {
    ...slot,
    status: slot.status ?? 'planned',
  };
}

export function getMockSlots(formationId: string): FormationSlot[] {
  if (formationId === 'f3' || formationId === 'f4') {
    return [
      {
        id: 's1',
        label: 'Matinée',
        dateLabel: '15 septembre 2026',
        timeRange: '9h00 – 12h30',
        participantsCount: formationId === 'f3' ? 17 : 9,
        status: 'planned',
      },
      {
        id: 's2',
        label: 'Après-midi',
        dateLabel: '15 septembre 2026',
        timeRange: '14h00 – 17h00',
        participantsCount: formationId === 'f3' ? 17 : 9,
        status: 'planned',
      },
    ];
  }
  if (formationId === 'f2') {
    return [
      {
        id: 's1',
        label: 'Matinée',
        dateLabel: '5 janvier 2027',
        timeRange: '9h00 – 12h30',
        participantsCount: 12,
        status: 'planned',
      },
    ];
  }
  return [];
}

/** Créneaux d’une formation (seed mock ou sessions de base persistées). */
export function getFormationSlots(formationId: string): FormationSlot[] {
  const map = readSlotsMap();
  const stored = map[formationId];
  if (stored) return stored.map((s) => normalizeSlot(s));
  return getMockSlots(formationId);
}

/** Crée la session de base du jour de formation si aucune n’existe encore. */
export function ensureBaseFormationSlot(
  formationId: string,
  opts?: { dateLabel?: string; participantsCount?: number; label?: string; timeRange?: string }
): FormationSlot {
  const existing = getFormationSlots(formationId);
  if (existing.length > 0) return existing[0];

  const slot: FormationSlot = {
    id: `s-base-${formationId}`,
    label: opts?.label ?? 'Session',
    dateLabel: opts?.dateLabel ?? formatSlotDateLabel(),
    timeRange: opts?.timeRange ?? '9h00 – 17h00',
    participantsCount: opts?.participantsCount ?? 0,
    status: 'planned',
  };
  const map = readSlotsMap();
  map[formationId] = [slot];
  writeSlotsMap(map);
  return slot;
}

/** Première session ouvrable : en cours, sinon planifiée. Jamais une session clôturée. */
export function getOpenableFormationSlot(formationId: string): FormationSlot | null {
  const slots = getFormationSlots(formationId);
  return (
    slots.find((s) => s.status === 'open') ||
    slots.find((s) => s.status === 'planned') ||
    null
  );
}

export function hasOpenableFormationSlot(formationId: string): boolean {
  return getOpenableFormationSlot(formationId) !== null;
}

export function updateFormationSlot(
  formationId: string,
  slotId: string,
  patch: Partial<Omit<FormationSlot, 'id'>>
): FormationSlot | null {
  const map = readSlotsMap();
  const current = (map[formationId] ?? getMockSlots(formationId)).map((s) => normalizeSlot(s));
  const idx = current.findIndex((s) => s.id === slotId);
  if (idx < 0) return null;
  // Une session clôturée n'est plus rouvrable
  if (current[idx].status === 'closed' && patch.status === 'open') {
    return current[idx];
  }
  current[idx] = { ...current[idx], ...patch };
  map[formationId] = current;
  writeSlotsMap(map);
  return current[idx];
}

export function addFormationSlot(
  formationId: string,
  partial: Omit<FormationSlot, 'id' | 'status'> & { id?: string; status?: FormationSlotStatus }
): FormationSlot {
  const map = readSlotsMap();
  const current = (map[formationId] ?? getMockSlots(formationId)).map((s) => normalizeSlot(s));
  const slot: FormationSlot = {
    id: partial.id ?? `s-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    label: partial.label,
    dateLabel: partial.dateLabel,
    timeRange: partial.timeRange,
    participantsCount: partial.participantsCount,
    status: partial.status ?? 'planned',
  };
  map[formationId] = [...current, slot];
  writeSlotsMap(map);
  return slot;
}

export function subscribeFormationSlots(
  cb: (map: SlotsByFormation) => void
): () => void {
  const handler = (e: Event) => {
    const detail = (e as CustomEvent<SlotsByFormation>).detail;
    cb(detail ?? readSlotsMap());
  };
  const storageHandler = (e: StorageEvent) => {
    if (e.key === SLOTS_STORAGE_KEY) cb(readSlotsMap());
  };
  window.addEventListener('kinship-formation-slots', handler);
  window.addEventListener('storage', storageHandler);
  return () => {
    window.removeEventListener('kinship-formation-slots', handler);
    window.removeEventListener('storage', storageHandler);
  };
}

export function formatSlotDateLabel(date: Date = new Date()): string {
  return date.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function formatSlotTimeNow(date: Date = new Date()): string {
  const h = date.getHours();
  const m = date.getMinutes();
  return m === 0 ? `${h}h00` : `${h}h${String(m).padStart(2, '0')}`;
}

export function slotStatusLabel(status: FormationSlotStatus): string {
  switch (status) {
    case 'open':
      return 'En cours';
    case 'closed':
      return 'Clôturée';
    default:
      return 'Planifiée';
  }
}
