import { FormationFiche } from '../types/formationCatalogue';

const STORAGE_KEY = 'kinship.formationCatalogue.v1';

type Listener = () => void;

let fiches: FormationFiche[] = load();
const listeners = new Set<Listener>();

function load(): FormationFiche[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return seedDemo();
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : seedDemo();
  } catch {
    return seedDemo();
  }
}

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(fiches));
  } catch {
    /* ignore quota */
  }
  listeners.forEach((l) => l());
}

function seedDemo(): FormationFiche[] {
  const now = new Date().toISOString();
  return [
    {
      id: 'fiche-demo-journaliste',
      status: 'catalog',
      orgKey: 'skolae',
      orgName: 'Skolae — CFPJ',
      orgInitials: 'SK',
      orgCertified: true,
      euMc: true,
      title: 'Devenir journaliste',
      description: 'Titre Journaliste — parcours long CFPJ.',
      programmeMode: 'series',
      programmeLines: [],
      programmeSeries: {
        id: 'rncp-demo',
        label: '📚 Titre Journaliste · 4 blocs',
        competenceIds: ['b1', 'b2', 'b3', 'b4'],
        competenceLabels: ['Bloc 1', 'Bloc 2', 'Bloc 3', 'Bloc 4'],
      },
      durationHours: '513,5',
      modality: 'presentiel',
      financement: 'CPF',
      prerequisites: '',
      languages: ['Français'],
      practicalInfo: '',
      assessmentType: 'Mise en situation évaluée',
      jury: true,
      schoolLabel: 'CFPJ',
      categoryBand: 'Titre RNCP · niveau 6',
      certificationCode: 'RNCP40281',
      certificationLabel: 'Journaliste',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'fiche-demo-assertivite',
      status: 'catalog',
      orgKey: 'skolae',
      orgName: 'Skolae — EFE',
      orgInitials: 'SK',
      orgCertified: true,
      euMc: false,
      title: 'Assertivité',
      description: 'Formation courte communication.',
      programmeMode: 'free_lines',
      programmeLines: [
        { id: 'l1', text: 'Oser s’exprimer' },
        { id: 'l2', text: 'Écouter sans juger' },
      ],
      durationHours: '14',
      modality: 'presentiel',
      financement: 'OPCO',
      prerequisites: '',
      languages: ['Français'],
      practicalInfo: '',
      assessmentType: 'Oral',
      jury: false,
      schoolLabel: 'EFE',
      categoryBand: 'Certificat de l’organisme',
      createdAt: now,
      updatedAt: now,
    },
  ];
}

export function subscribeCatalogue(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function listFiches(): FormationFiche[] {
  return [...fiches];
}

export function getFiche(id: string): FormationFiche | undefined {
  return fiches.find((f) => f.id === id);
}

export function upsertFiche(fiche: FormationFiche): FormationFiche {
  const idx = fiches.findIndex((f) => f.id === fiche.id);
  const next = { ...fiche, updatedAt: new Date().toISOString() };
  if (idx >= 0) fiches[idx] = next;
  else fiches = [next, ...fiches];
  persist();
  return next;
}

export function replaceAllFiches(next: FormationFiche[]) {
  fiches = next;
  persist();
}

export function resetCatalogueDemo() {
  fiches = seedDemo();
  persist();
}
