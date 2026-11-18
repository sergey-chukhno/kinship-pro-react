import type { ProjectStep, ProjectStepEventType } from '../api/ProjectSteps';

/** Même options que EventModal « Programmer un événement ». */
export const PROJECT_STEP_DURATION_OPTIONS: Array<{ value: number; label: string }> = [
  { value: 30, label: '30 minutes' },
  { value: 60, label: '1 heure' },
  { value: 90, label: '1h30' },
  { value: 120, label: '2 heures' },
  { value: 240, label: '4 heures' },
  { value: 480, label: 'Journée complète' },
];

export const PROJECT_STEP_TYPE_OPTIONS: Array<{ value: ProjectStepEventType; label: string }> = [
  { value: 'workshop', label: 'Atelier' },
  { value: 'session', label: 'Séance' }, // affichage ; API reste `session` (Patrick)
  { value: 'meeting', label: 'Réunion' },
  { value: 'training', label: 'Formation' },
  { value: 'other', label: 'Autre' },
];

const TYPE_LABEL: Record<string, string> = Object.fromEntries(
  PROJECT_STEP_TYPE_OPTIONS.map((o) => [o.value, o.label])
);

export function projectStepTypeLabel(eventType?: string | null): string {
  if (!eventType) return 'Atelier';
  return TYPE_LABEL[eventType] || eventType;
}

/** Default type: Session for formation projects, Atelier elsewhere (Patrick). */
export function defaultProjectStepType(
  projectKind?: string | null
): ProjectStepEventType {
  return projectKind === 'formation' ? 'session' : 'workshop';
}

const MONTH_SHORT_FR = [
  'janv.',
  'févr.',
  'mars',
  'avr.',
  'mai',
  'juin',
  'juil.',
  'août',
  'sept.',
  'oct.',
  'nov.',
  'déc.',
];

/** Carte : mois abrégé + jour (ex. sept. / 16). */
export function projectStepDateParts(dateStr?: string | null): { month: string; day: string } {
  if (!dateStr) return { month: '—', day: '—' };
  const d = new Date(`${String(dateStr).slice(0, 10)}T12:00:00`);
  if (Number.isNaN(d.getTime())) return { month: '—', day: '—' };
  return { month: MONTH_SHORT_FR[d.getMonth()], day: String(d.getDate()) };
}

/** Input date YYYY-MM-DD from API date. */
export function projectStepDateInputValue(dateStr?: string | null): string {
  if (!dateStr) return '';
  return String(dateStr).slice(0, 10);
}

/** Input time HH:MM from API time (HH:MM:SS or HH:MM). */
export function projectStepTimeInputValue(timeStr?: string | null): string {
  if (!timeStr) return '';
  const s = String(timeStr);
  return s.length >= 5 ? s.slice(0, 5) : s;
}

/** Affichage court date FR pour Attester (ex. 16/09/2026). */
export function projectStepDateShortFr(dateStr?: string | null): string {
  if (!dateStr) return '';
  const d = new Date(`${String(dateStr).slice(0, 10)}T12:00:00`);
  if (Number.isNaN(d.getTime())) return String(dateStr).slice(0, 10);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${d.getFullYear()}`;
}

/** « Constaté pendant » — date · type · titre (Patrick). */
export function projectStepAttestLabel(step: {
  title?: string;
  date?: string;
  event_type?: string;
}): string {
  const date = projectStepDateShortFr(step.date);
  const type = projectStepTypeLabel(step.event_type);
  const title = (step.title || '').trim() || 'Étape';
  if (date) return `${date} · ${type} · ${title}`;
  return `${type} · ${title}`;
}

export function sortProjectStepsByDate(steps: ProjectStep[]): ProjectStep[] {
  return [...steps].sort((a, b) => {
    const da = `${projectStepDateInputValue(a.date)}T${projectStepTimeInputValue(a.time) || '00:00'}`;
    const db = `${projectStepDateInputValue(b.date)}T${projectStepTimeInputValue(b.time) || '00:00'}`;
    return da.localeCompare(db);
  });
}
