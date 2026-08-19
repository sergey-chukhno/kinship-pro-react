export type FunderSignalKind =
  | 'dates'
  | 'cancelled'
  | 'manual'
  | 'gap';

export interface FunderSignal {
  kind: FunderSignalKind;
  label: string;
  detail: string;
}

export interface FunderSession {
  id: string;
  title: string;
  meta: string;
  duration?: string;
  recap?: string;
  kind: 'done' | 'group' | 'next' | 'upcoming';
  collapsedDetail?: string;
}

export interface FunderOutcome {
  text: string;
  source: string;
}

export interface FunderFollowData {
  token: string;
  closed: boolean;
  closedOn?: string;
  title: string;
  org: string;
  dateRange: string;
  financement: string;
  statusLabel: string;
  qualiopi: boolean;
  attendanceSurvey: boolean;
  hoursDone: string;
  hoursTotal: string;
  hoursPercent: number;
  attendanceRate: string;
  sessionsDone: number;
  sessionsTotal: number;
  identitiesDone: number;
  identitiesTotal: number;
  showIdentities: boolean;
  informedOn?: string;
  reportDue?: string;
  phase: 'informed' | 'live' | 'report';
  location: string;
  level: string;
  language: string;
  description: string;
  outcomes: FunderOutcome[];
  sessions: FunderSession[];
  signals: FunderSignal[];
}

export interface FunderHubCard {
  token: string;
  title: string;
  org: string;
  meta: string;
  status: 'en_cours' | 'terminee';
  progressLabel: string;
  progressPercent: number;
  signal?: FunderSignal;
  reportReceived?: string;
  closedYear: number;
}

const DEBUTER_SESSIONS: FunderSession[] = [
  {
    id: 's5',
    kind: 'done',
    title: '✓ Séance 5',
    meta: 'jeu 05/02 · 9h00—12h30',
    duration: '3h30',
    recap: '9 présences vérifiées par code · 2 attestées par le formateur · 1 sans saisie',
  },
  {
    id: 's4',
    kind: 'done',
    title: '✓ Séance 4',
    meta: 'jeu 29/01 · 9h00—12h30',
    duration: '3h30',
    recap: '10 vérifiées · 1 attestée · 1 sans saisie',
  },
  {
    id: 's3',
    kind: 'done',
    title: '✓ Séance 3',
    meta: 'jeu 22/01 · 9h00—12h30',
    duration: '3h30',
    recap: '11 vérifiées · 1 attestée',
  },
  {
    id: 's12',
    kind: 'group',
    title: '✓ Séances 1—2',
    meta: '08/01 · 15/01 — déplier ▾',
    collapsedDetail: 'Séances tenues — mêmes compteurs d’assiduité, jamais de nom.',
  },
  {
    id: 's6',
    kind: 'next',
    title: '→ Séance 6',
    meta: 'jeu 12/02 · 9h00—12h30',
    recap: '— la prochaine',
  },
  {
    id: 's78',
    kind: 'upcoming',
    title: 'Séances 7—8',
    meta: '26/02 · 12/03',
  },
];

const DEBUTER_OUTCOMES: FunderOutcome[] = [
  { text: 'Utiliser un traitement de texte', source: 'DigComp' },
  { text: 'Gérer sa messagerie et ses pièces jointes', source: 'DigComp' },
  { text: 'Naviguer et rechercher une information fiable', source: 'DigComp' },
  { text: 'Réaliser une démarche administrative en ligne', source: 'acquis propre' },
];

export const MOCK_FOLLOW_DEBUTER: FunderFollowData = {
  token: 'debuter',
  closed: false,
  title: 'Débuter dans le numérique — bureautique, internet, démarches en ligne',
  org: 'Atelier Numérique Formation',
  dateRange: '5 janv. → 27 mars 2027',
  financement: 'CPF',
  statusLabel: 'EN COURS',
  qualiopi: true,
  attendanceSurvey: true,
  hoursDone: '31h30',
  hoursTotal: '60h',
  hoursPercent: 52,
  attendanceRate: '92 %',
  sessionsDone: 5,
  sessionsTotal: 8,
  identitiesDone: 12,
  identitiesTotal: 12,
  showIdentities: true,
  informedOn: '05/01',
  reportDue: '27 mars',
  phase: 'live',
  location: 'Présentiel · Montreuil',
  level: 'Niveau EQF 2',
  language: 'Français',
  description:
    'Acquérir les gestes numériques du quotidien : poste de travail, messagerie, navigation, démarches administratives en ligne — pour un public éloigné du numérique.',
  outcomes: DEBUTER_OUTCOMES,
  sessions: DEBUTER_SESSIONS,
  signals: [],
};

export const MOCK_FOLLOW_GESTES: FunderFollowData = {
  ...MOCK_FOLLOW_DEBUTER,
  token: 'gestes',
  title: 'Gestes qui sauvent — initiation aux premiers secours',
  org: 'Form’Santé Occitanie',
  dateRange: '12 janv. → 20 févr. 2027',
  financement: 'OPCO',
  hoursDone: '16h',
  hoursTotal: '20h',
  hoursPercent: 80,
  attendanceRate: '88 %',
  sessionsDone: 4,
  sessionsTotal: 5,
  identitiesDone: 8,
  identitiesTotal: 8,
  attendanceSurvey: false,
  qualiopi: true,
  location: 'Présentiel · Toulouse',
  description: 'Initiation aux gestes de premiers secours en milieu professionnel.',
  outcomes: [{ text: 'Réaliser les gestes qui sauvent', source: 'acquis propre' }],
  sessions: DEBUTER_SESSIONS.slice(0, 4),
  signals: [
    {
      kind: 'manual',
      label: 'Présences attestées à la main',
      detail:
        'sur cette formation, les présences sont attestées par le formateur, sans code de session',
    },
  ],
};

export const MOCK_FOLLOW_FRANCAIS: FunderFollowData = {
  ...MOCK_FOLLOW_DEBUTER,
  token: 'francais',
  title: 'Remise à niveau — français professionnel',
  org: 'Passerelles Formation',
  dateRange: '12 janv. → 3 avr. 2027',
  financement: 'OPCO',
  hoursDone: '18h',
  hoursTotal: '60h',
  hoursPercent: 30,
  attendanceRate: '81 %',
  sessionsDone: 3,
  sessionsTotal: 10,
  identitiesDone: 10,
  identitiesTotal: 10,
  attendanceSurvey: false,
  location: 'Présentiel · Lyon',
  description: 'Remise à niveau en français professionnel pour un public en insertion.',
  outcomes: [{ text: 'Rédiger un écrit professionnel court', source: 'acquis propre' }],
  sessions: DEBUTER_SESSIONS.slice(0, 3),
  signals: [
    {
      kind: 'dates',
      label: 'Dates reportées',
      detail: 'le 02/02 — nouvelles dates : 12/01 → 03/04',
    },
  ],
};

export const MOCK_FOLLOW_ECART: FunderFollowData = {
  ...MOCK_FOLLOW_DEBUTER,
  token: 'ecart',
  attendanceSurvey: true,
  signals: [
    {
      kind: 'gap',
      label: 'Constat d’écart — vérification d’assiduité',
      detail:
        'Écart confirmé entre la durée déclarée et les remontées apprenants — séance du 29/01.',
    },
  ],
};

export const MOCK_FOLLOW_CLOSED: FunderFollowData = {
  ...MOCK_FOLLOW_DEBUTER,
  token: 'cloturee',
  closed: true,
  closedOn: '27 mars 2027',
};

const FOLLOWS: Record<string, FunderFollowData> = {
  debuter: MOCK_FOLLOW_DEBUTER,
  gestes: MOCK_FOLLOW_GESTES,
  francais: MOCK_FOLLOW_FRANCAIS,
  ecart: MOCK_FOLLOW_ECART,
  cloturee: MOCK_FOLLOW_CLOSED,
};

export function getFunderFollow(token: string): FunderFollowData | undefined {
  return FOLLOWS[token];
}

export const MOCK_FUNDER_HUB_CARDS: FunderHubCard[] = [
  {
    token: 'debuter',
    title: 'Débuter dans le numérique — bureautique, internet, démarches en ligne',
    org: 'Atelier Numérique Formation',
    meta: '5 janv. → 27 mars 2027 · CPF',
    status: 'en_cours',
    progressLabel: '5/8 séances',
    progressPercent: 62,
    closedYear: 2027,
  },
  {
    token: 'gestes',
    title: 'Gestes qui sauvent — initiation aux premiers secours',
    org: 'Form’Santé Occitanie',
    meta: '12 janv. → 20 févr. 2027 · OPCO',
    status: 'en_cours',
    progressLabel: '4/5 séances',
    progressPercent: 80,
    signal: MOCK_FOLLOW_GESTES.signals[0],
    closedYear: 2027,
  },
  {
    token: 'francais',
    title: 'Remise à niveau — français professionnel',
    org: 'Passerelles Formation',
    meta: '12 janv. → 3 avr. 2027 · OPCO',
    status: 'en_cours',
    progressLabel: '3/10 séances',
    progressPercent: 30,
    signal: MOCK_FOLLOW_FRANCAIS.signals[0],
    closedYear: 2027,
  },
  {
    token: 'cloturee',
    title: 'Bureautique avancée — tableurs et publipostage',
    org: 'Atelier Numérique Formation',
    meta: 'clôturée le 6 févr. 2027 · CPF',
    status: 'terminee',
    progressLabel: '',
    progressPercent: 100,
    reportReceived: '06/02/2027',
    closedYear: 2027,
  },
];

export const MOCK_FUNDER_ARCHIVES: Record<
  number,
  { title: string; meta: string; token: string }[]
> = {
  2026: [
    {
      title: 'Initiation bureautique — session automne',
      meta: 'Atelier Numérique · clôturée le 19/12/2026',
      token: 'cloturee',
    },
    {
      title: 'Accueil et relation client',
      meta: 'Passerelles Formation · clôturée le 30/10/2026',
      token: 'cloturee',
    },
  ],
  2025: [],
};
