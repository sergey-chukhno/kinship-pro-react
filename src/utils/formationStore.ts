/**
 * Store démo formations OF — partagé hub ↔ fiche détail (sans API).
 */
import { FormationCard, MOCK_FORMATIONS } from '../data/mockFormations';

const STORAGE_KEY = 'kinship_formations_demo_p3';
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
        ...seed,
        ...f,
        description: f.description ?? seed.description,
        durationHours: f.durationHours ?? seed.durationHours,
        participationMode: f.participationMode ?? seed.participationMode,
        learningOutcomes: f.learningOutcomes ?? seed.learningOutcomes,
        frameLocked: f.frameLocked ?? seed.frameLocked,
        pfShareToken: f.pfShareToken ?? seed.pfShareToken,
        financement: (f.financement as string) === 'Associative' ? 'Association' : f.financement ?? seed.financement,
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

export function openFormationSpace(id: string, tab: 'informations' | 'gestion' = 'gestion') {
  setSelectedFormationId(id);
  sessionStorage.setItem('kinship_f2_tab', tab);
}

export function missingCadre(formation: FormationCard): string[] {
  const miss: string[] = [];
  if (!formation.durationHours) miss.push('la durée en heures');
  if (!formation.financement) miss.push('le financement');
  if (!(formation.learningOutcomes ?? []).some((o) => o.text.trim())) miss.push('le programme (acquis)');
  if (formation.isEuMcDeclared) {
    if (formation.eqfLevel == null) miss.push('le niveau EQF');
    if (!formation.assessmentType?.trim()) miss.push('le type d’évaluation');
  }
  return miss;
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

export type FormationPersonRole = 'Participant' | 'Formateur' | 'Intervenant';

export interface FormationParticipant {
  id: string;
  name: string;
  identityVerified: boolean;
  role?: FormationPersonRole;
  preRegistered?: boolean;
  pendingActivation?: boolean;
}

export interface FormationFunder {
  id: string;
  name: string;
  email?: string;
  shareMode: 'nominatif' | 'anonyme';
  initials: string;
}

export interface FormationPartner {
  id: string;
  name: string;
}

const PEOPLE_KEY = 'kinship_formation_people_demo';

type PeopleState = {
  participants: FormationParticipant[];
  funders: FormationFunder[];
  partners: FormationPartner[];
};

function defaultPeople(formationId: string): PeopleState {
  const base: FormationParticipant[] = [
    { id: 'p1', name: 'Amina Benali', identityVerified: true, role: 'Participant' },
    { id: 'p2', name: 'Lucas Martin', identityVerified: true, role: 'Participant' },
    { id: 'p3', name: 'Sofia Rossi', identityVerified: false, role: 'Participant', preRegistered: true, pendingActivation: true },
    { id: 'p4', name: 'Yanis Dupont', identityVerified: true, role: 'Participant' },
    { id: 'p5', name: 'Chloé Bernard', identityVerified: false, role: 'Participant', preRegistered: true, pendingActivation: true },
    { id: 'p6', name: 'Hugo Petit', identityVerified: true, role: 'Participant' },
    { id: 'p7', name: 'Inès Moreau', identityVerified: false, role: 'Participant' },
    { id: 'p8', name: 'Noah Garcia', identityVerified: true, role: 'Participant' },
    { id: 'p9', name: 'Léa Roux', identityVerified: true, role: 'Participant' },
  ];

  if (formationId === 'f2') {
    return { participants: [], funders: [], partners: [] };
  }
  if (formationId === 'f-debuter') {
    return {
      participants: [
        { id: 'nb', name: 'Nadia Belkacem', identityVerified: true, role: 'Participant' },
        { id: 'kt', name: 'Karim Tounsi', identityVerified: true, role: 'Participant' },
        { id: 'md', name: 'Marc Dubois', identityVerified: true, role: 'Participant' },
        ...base.slice(0, 9),
      ],
      funders: [
        { id: 'oa', name: 'OPCO Atlas', shareMode: 'nominatif', initials: 'OA' },
      ],
      partners: [],
    };
  }
  if (formationId === 'f3') {
    return {
      participants: [
        ...base,
        { id: 'p10', name: 'Adam Lefevre', identityVerified: true, role: 'Participant' },
        { id: 'p11', name: 'Emma Girard', identityVerified: true, role: 'Participant' },
        { id: 'p12', name: 'Jules Fontaine', identityVerified: true, role: 'Participant' },
        { id: 'p13', name: 'Manon Chevalier', identityVerified: true, role: 'Participant' },
        { id: 'p14', name: 'Tom Renard', identityVerified: true, role: 'Participant' },
        { id: 'p15', name: 'Léna Blanc', identityVerified: true, role: 'Participant' },
        { id: 'p16', name: 'Paul Mercier', identityVerified: true, role: 'Participant' },
        { id: 'p17', name: 'Jade Laurent', identityVerified: true, role: 'Participant' },
      ],
      funders: [],
      partners: [],
    };
  }
  if (formationId === 'f4') {
    return { participants: base, funders: [], partners: [] };
  }
  return { participants: [], funders: [], partners: [] };
}

function readPeopleMap(): Record<string, PeopleState> {
  try {
    const raw = localStorage.getItem(PEOPLE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, PeopleState>) : {};
  } catch {
    return {};
  }
}

function writePeople(formationId: string, state: PeopleState) {
  const map = readPeopleMap();
  map[formationId] = state;
  localStorage.setItem(PEOPLE_KEY, JSON.stringify(map));
  window.dispatchEvent(new CustomEvent('kinship-formation-people'));
}

export function getFormationPeople(formationId: string): PeopleState {
  return readPeopleMap()[formationId] ?? defaultPeople(formationId);
}

export function setFormationPeople(formationId: string, state: PeopleState) {
  writePeople(formationId, state);
}

export function verifyFormationIdentity(formationId: string, personId: string) {
  const people = getFormationPeople(formationId);
  const next = {
    ...people,
    participants: people.participants.map((p) =>
      p.id === personId ? { ...p, identityVerified: true, pendingActivation: false } : p
    ),
  };
  writePeople(formationId, next);
  window.dispatchEvent(new CustomEvent('kinship-formation-people'));
  return next;
}

export function subscribeFormationPeople(cb: () => void): () => void {
  const handler = () => cb();
  window.addEventListener('kinship-formation-people', handler);
  return () => window.removeEventListener('kinship-formation-people', handler);
}

/** Participants démo pour la fiche — la 26 : ✓ vert / ⚠ orange */
export function getMockParticipants(formationId: string): FormationParticipant[] {
  return getFormationPeople(formationId).participants;
}

export type FormationSlotStatus = 'planned' | 'open' | 'closed' | 'cancelled';

export interface FormationSlot {
  id: string;
  label: string;
  dateLabel: string;
  timeRange: string;
  participantsCount: number;
  status: FormationSlotStatus;
  description?: string;
  place?: string;
  participationMode?: 'presentiel' | 'distanciel' | 'hybride';
  animatedBy?: string;
  dateIso?: string;
  day?: string;
  month?: string;
  confirmedCount?: number;
  proofsCount?: number;
}

const SLOTS_STORAGE_KEY = 'kinship_formation_slots_p34';

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
    animatedBy: slot.animatedBy ?? 'vous',
  };
}

function seance(partial: FormationSlot): FormationSlot {
  return normalizeSlot(partial);
}

export function getMockSlots(formationId: string): FormationSlot[] {
  if (formationId === 'f2' || formationId === 'f-debuter') {
    const closed = formationId === 'f-debuter';
    return [
      seance({
        id: 's1',
        label: 'Découverte du poste et de la souris',
        dateLabel: '6 janvier 2027',
        dateIso: '2027-01-06',
        day: '06',
        month: 'jan',
        timeRange: '9h00 — 12h30',
        place: 'Salle 2',
        animatedBy: 'vous',
        participantsCount: 12,
        confirmedCount: 11,
        proofsCount: 11,
        status: 'closed',
      }),
      seance({
        id: 's2',
        label: 'Le clavier : écrire son premier texte',
        dateLabel: '13 janvier 2027',
        dateIso: '2027-01-13',
        day: '13',
        month: 'jan',
        timeRange: '9h00 — 12h30',
        place: 'Salle 2',
        animatedBy: 'vous',
        participantsCount: 12,
        status: closed ? 'closed' : 'open',
        confirmedCount: closed ? 12 : undefined,
      }),
      seance({
        id: 's3',
        label: 'Traitement de texte au quotidien',
        dateLabel: '20 janvier 2027',
        dateIso: '2027-01-20',
        day: '20',
        month: 'jan',
        timeRange: '9h00 — 12h30',
        place: 'Salle 2',
        animatedBy: 'Léa F. (Formatrice)',
        participantsCount: 12,
        status: closed ? 'closed' : 'planned',
      }),
      seance({
        id: 's4',
        label: 'Atelier libre',
        dateLabel: '27 janvier 2027',
        dateIso: '2027-01-27',
        day: '27',
        month: 'jan',
        timeRange: '9h00 — 12h30',
        place: 'Salle 2',
        animatedBy: 'vous',
        participantsCount: 12,
        status: 'cancelled',
      }),
    ];
  }
  if (formationId === 'f3' || formationId === 'f4') {
    return [
      seance({
        id: 's1',
        label: 'Matinée',
        dateLabel: '15 septembre 2026',
        dateIso: '2026-09-15',
        day: '15',
        month: 'sep',
        timeRange: '9h00 — 12h30',
        participantsCount: formationId === 'f3' ? 17 : 9,
        status: 'planned',
        animatedBy: 'vous',
        place: 'Centre',
      }),
      seance({
        id: 's2',
        label: 'Après-midi',
        dateLabel: '15 septembre 2026',
        dateIso: '2026-09-15',
        day: '15',
        month: 'sep',
        timeRange: '14h00 — 17h00',
        participantsCount: formationId === 'f3' ? 17 : 9,
        status: 'planned',
        animatedBy: 'vous',
        place: 'Centre',
      }),
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
  const slot = normalizeSlot({
    ...partial,
    id: partial.id ?? `s-${Date.now()}`,
    status: partial.status ?? 'planned',
  });
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
      return "aujourd'hui";
    case 'closed':
      return 'terminée';
    case 'cancelled':
      return 'annulée';
    default:
      return 'à venir';
  }
}
