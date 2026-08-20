import { LearningOutcome } from './mockFormations';

export type EuMcProvenance = 'org' | 'kinship' | 'authority';

export interface EuMcSkill {
  id: string;
  name: string;
}

export interface EuMcDomain {
  id: string;
  name: string;
  skills: EuMcSkill[];
}

export interface EuMcSeries {
  id: string;
  name: string;
  subtitle?: string;
  provenance: EuMcProvenance;
  eqfLevel?: number;
  domains: EuMcDomain[];
}

export const EU_MC_LANGUAGES: { code: string; label: string; flag: string }[] = [
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'de', label: 'Deutsch', flag: '🇩🇪' },
  { code: 'es', label: 'Español', flag: '🇪🇸' },
  { code: 'it', label: 'Italiano', flag: '🇮🇹' },
  { code: 'nl', label: 'Nederlands', flag: '🇳🇱' },
  { code: 'pt', label: 'Português', flag: '🇵🇹' },
  { code: 'pl', label: 'Polski', flag: '🇵🇱' },
];

export const EU_MC_ASSESSMENT_SUGGESTIONS = [
  'QCM',
  'mise en situation',
  'projet évalué',
  'oral',
  'portfolio',
];

export const EU_MC_PREREQ_SUGGESTIONS = [
  'Aucun prérequis',
  'Maîtrise du français',
  'Savoir lire et écrire',
  'Premiers pas numériques',
];

export const DIGCOMP_SERIES: EuMcSeries = {
  id: 'digcomp-2-2',
  name: 'DigComp 2.2',
  subtitle: 'compétences numériques',
  provenance: 'kinship',
  eqfLevel: 3,
  domains: [
    {
      id: 'dc-d1',
      name: 'Domaine 1 — Information et données',
      skills: [
        { id: 'dc-d1-s1', name: 'Naviguer, rechercher, filtrer l’information' },
        { id: 'dc-d1-s2', name: 'Évaluer les données et l’information' },
        { id: 'dc-d1-s3', name: 'Gérer les données et contenus' },
      ],
    },
    {
      id: 'dc-d4',
      name: 'Domaine 4 — Sécurité',
      skills: [
        { id: 'dc-d4-s1', name: 'Protéger les appareils' },
        { id: 'dc-d4-s2', name: 'Protéger les données personnelles et la vie privée' },
        { id: 'dc-d4-s3', name: 'Protéger la santé et le bien-être' },
        { id: 'dc-d4-s4', name: 'Protéger l’environnement' },
      ],
    },
    {
      id: 'dc-d2',
      name: 'Domaine 2 — Communication et collaboration',
      skills: [
        { id: 'dc-d2-s1', name: 'Interagir via les technologies numériques' },
        { id: 'dc-d2-s2', name: 'Partager via les technologies numériques' },
        { id: 'dc-d2-s3', name: 'S’engager dans la citoyenneté numérique' },
        { id: 'dc-d2-s4', name: 'Collaborer via les technologies numériques' },
        { id: 'dc-d2-s5', name: 'Netiquette' },
        { id: 'dc-d2-s6', name: 'Gérer son identité numérique' },
      ],
    },
    {
      id: 'dc-d3',
      name: 'Domaine 3 — Création de contenu',
      skills: [
        { id: 'dc-d3-s1', name: 'Développer des contenus numériques' },
        { id: 'dc-d3-s2', name: 'Intégrer et réélaborer des contenus' },
        { id: 'dc-d3-s3', name: 'Droit d’auteur et licences' },
        { id: 'dc-d3-s4', name: 'Programmer' },
      ],
    },
    {
      id: 'dc-d5',
      name: 'Domaine 5 — Résolution de problèmes',
      skills: [
        { id: 'dc-d5-s1', name: 'Résoudre des problèmes techniques' },
        { id: 'dc-d5-s2', name: 'Identifier des besoins et des réponses technologiques' },
        { id: 'dc-d5-s3', name: 'Utiliser les technologies de façon créative' },
        { id: 'dc-d5-s4', name: 'Identifier les lacunes numériques' },
      ],
    },
  ],
};

export const STATIC_EU_MC_SERIES: EuMcSeries[] = [
  DIGCOMP_SERIES,
  {
    id: 'entrecomp',
    name: 'EntreComp',
    subtitle: 'esprit d’entreprendre',
    provenance: 'kinship',
    eqfLevel: 4,
    domains: [
      {
        id: 'ec-d1',
        name: 'Idées et opportunités',
        skills: [
          { id: 'ec-d1-s1', name: 'Repérer des opportunités' },
          { id: 'ec-d1-s2', name: 'Créativité' },
          { id: 'ec-d1-s3', name: 'Vision' },
        ],
      },
      {
        id: 'ec-d2',
        name: 'Ressources',
        skills: [
          { id: 'ec-d2-s1', name: 'Conscience de soi et auto-efficacité' },
          { id: 'ec-d2-s2', name: 'Motivation et persévérance' },
          { id: 'ec-d2-s3', name: 'Mobiliser des ressources' },
        ],
      },
      {
        id: 'ec-d3',
        name: 'Mise en action',
        skills: [
          { id: 'ec-d3-s1', name: 'Prendre des initiatives' },
          { id: 'ec-d3-s2', name: 'Planifier et gérer' },
          { id: 'ec-d3-s3', name: 'Faire face à l’incertitude' },
        ],
      },
    ],
  },
  {
    id: 'lifecomp',
    name: 'LifeComp',
    subtitle: 'compétences de vie',
    provenance: 'kinship',
    eqfLevel: 3,
    domains: [
      {
        id: 'lc-d1',
        name: 'Personnel',
        skills: [
          { id: 'lc-d1-s1', name: 'Conscience de soi' },
          { id: 'lc-d1-s2', name: 'Flexibilité' },
          { id: 'lc-d1-s3', name: 'Bien-être' },
        ],
      },
      {
        id: 'lc-d2',
        name: 'Social',
        skills: [
          { id: 'lc-d2-s1', name: 'Empathie' },
          { id: 'lc-d2-s2', name: 'Communication' },
          { id: 'lc-d2-s3', name: 'Collaboration' },
        ],
      },
      {
        id: 'lc-d3',
        name: 'Apprendre à apprendre',
        skills: [
          { id: 'lc-d3-s1', name: 'Mentalité de croissance' },
          { id: 'lc-d3-s2', name: 'Pensée critique' },
          { id: 'lc-d3-s3', name: 'Gérer son apprentissage' },
        ],
      },
    ],
  },
];

export function newLearningOutcome(kind: LearningOutcome['kind'], text = ''): LearningOutcome {
  return { id: `lo-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, text, kind };
}

export function seriesReferenceLabel(series: EuMcSeries, domain?: EuMcDomain): string {
  if (domain) {
    const n = domain.skills.length;
    const eqf = series.eqfLevel ? ` · EQF ${series.eqfLevel}` : '';
    return `📚 ${series.name} — ${domain.name} · ${n} compétence${n > 1 ? 's' : ''}${eqf}`;
  }
  const skillCount = series.domains.reduce((sum, d) => sum + d.skills.length, 0);
  const eqf = series.eqfLevel ? ` · EQF ${series.eqfLevel}` : '';
  return `📚 ${series.name} · ${series.domains.length} domaines · ${skillCount} compétences${eqf}`;
}

export function serializeLearningOutcomes(outcomes: LearningOutcome[]): string | undefined {
  const lines = outcomes.map((o) => o.text.trim()).filter(Boolean);
  return lines.length ? lines.join('\n') : undefined;
}

export function parseLearningOutcomes(text?: string | null): LearningOutcome[] {
  if (!text?.trim()) return [];
  return text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => newLearningOutcome(line.startsWith('📚') ? 'series' : 'free', line));
}

export function languageDisplay(code: string): string {
  const lang = EU_MC_LANGUAGES.find((l) => l.code === code);
  return lang ? `${lang.flag} ${lang.label}` : code;
}

export function frameworkLabel(type?: string | null): string {
  if (type === 'QF_EHEA') return 'QF-EHEA — enseignement supérieur (CC-EEES)';
  return 'EQF — cadre européen (CEC)';
}

export function formatWorkloadHours(value?: string | number | null): string {
  if (value == null || value === '') return '';
  const n = Number(value);
  if (Number.isNaN(n)) return String(value);
  const label = Number.isInteger(n) ? String(n) : String(n);
  return `${label} heure${n > 1 ? 's' : ''}`;
}
