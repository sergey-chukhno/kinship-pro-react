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

export interface FormationSlot {
  id: string;
  label: string;
  dateLabel: string;
  timeRange: string;
  participantsCount: number;
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
      },
      {
        id: 's2',
        label: 'Après-midi',
        dateLabel: '15 septembre 2026',
        timeRange: '14h00 – 17h00',
        participantsCount: formationId === 'f3' ? 17 : 9,
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
      },
    ];
  }
  return [];
}
