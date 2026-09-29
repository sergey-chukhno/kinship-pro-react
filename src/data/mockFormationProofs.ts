import { FormationProofData } from '../types/formationProof';

const CO_ATTESTANTS = [
  {
    initials: 'AN',
    name: 'Atelier Numérique Formation',
    description: 'Organisme de formation · émettrice',
    pillLabel: '◆ Qualiopi',
    pillColor: '#FF616F',
    pillBorder: '#FF616F',
    avatarBg: 'rgba(255,97,111,.1)',
    avatarColor: '#FF616F',
  },
  {
    initials: 'CD',
    name: 'Cabinet Dutto',
    description: 'Co-attestée par R. Dutto, expert-comptable',
    pillLabel: '✓ Co-attestant',
    pillColor: '#2A8A9F',
    pillBorder: '#2A8A9F',
    avatarBg: 'rgba(42,138,159,.1)',
    avatarColor: '#2A8A9F',
  },
];

const TIMELINE = [
  {
    date: '5 janvier 2027',
    dateColor: '#FF616F',
    title: 'Démarrage de la formation',
    description: '12 inscrits · identités vérifiées à l’entrée',
  },
  {
    date: '6 janvier 2027',
    dateColor: '#FF616F',
    title: 'Séance 1 — Prise en main du poste',
    description: 'Sessions matinée et après-midi',
    pills: [{ label: 'Léa Fontaine', bg: '#feeaec', color: '#FF616F' }],
    presence: true,
  },
  {
    date: 'Janvier → mars 2027',
    dateColor: '#FF616F',
    title: 'Séances 2 à 7 — Bureautique · internet · démarches en ligne',
    description: 'Les compétences attestées au fil des séances',
    pills: [{ label: 'Léa Fontaine', bg: '#feeaec', color: '#FF616F' }],
    presence: true,
  },
  {
    date: '27 mars 2027',
    dateColor: '#2A8A9F',
    title: 'Séance 8 — Dernière séance · co-attestation',
    description: 'Mise en pratique finale',
    pills: [{ label: 'Cabinet Dutto', bg: '#e8f6fa', color: '#2A8A9F' }],
  },
  {
    date: '27 mars 2027',
    dateColor: '#48A78D',
    title: 'Clôture de la formation · Preuve Formation® générée',
  },
];

const SERIES = [
  {
    name: 'DigComp 2.2 — Domaine 1 · Information et données',
    count: 2,
    orgPill: { label: 'Atelier Numérique Formation', bg: '#feeaec', color: '#FF616F' },
    items: [
      { name: 'Utiliser un traitement de texte au quotidien · EQF 2', orgColor: '#FF616F', kind: 'PB' as const },
      { name: 'Réaliser ses démarches en ligne · EQF 2', orgColor: '#FF616F', kind: 'PB' as const },
    ],
  },
  {
    name: 'Présence vérifiée',
    count: 8,
    orgPill: { label: 'Atelier Numérique Formation', bg: '#feeaec', color: '#FF616F' },
    items: [
      { name: 'Présence vérifiée — Séance 1 · 06/01/2027', orgColor: '#FF616F', kind: 'PE' as const },
      { name: 'Présence vérifiée — Séance 2 · 13/01/2027', orgColor: '#FF616F', kind: 'PE' as const },
      { name: 'Présence vérifiée — Séance 3 · 20/01/2027', orgColor: '#FF616F', kind: 'PE' as const },
    ],
    extraCount: 5,
    extraLabel: 'présences supplémentaires',
  },
];

const FRAME_ELEMENTS = [
  { name: 'Co-attestation multipartite — émettrice + co-attestant, figés à la clôture', source: 'Acteurs' },
  { name: 'Présence vérifiée par séance — sessions horodatées', source: 'Séances' },
  { name: 'Empreinte probatoire — manifeste figé, vérifiable en ligne', source: 'Header' },
  { name: 'Empilabilité — les preuves de compétence et de présence dedans', source: 'Preuves' },
];

const CONFORMITY_ELEMENTS = [
  { num: '1', name: 'Identification de l’apprenant', source: 'Header' },
  { num: '2', name: 'Intitulé de la microcertification', source: 'Header' },
  { num: '3', name: 'Pays / région de l’émetteur', source: 'Header' },
  { num: '4', name: 'Organisme(s) émetteur(s)', source: 'Acteurs' },
  { num: '5', name: 'Date de délivrance', source: 'Header' },
  { num: '6', name: 'Acquis d’apprentissage', source: 'Séances' },
  { num: '7', name: 'Charge de travail / ECTS', source: 'Séances' },
  { num: '8', name: 'Niveau EQF', source: 'Cadre' },
  { num: '9', name: 'Type d’évaluation', source: 'Séances' },
  { num: '10', name: 'Forme de participation', source: 'Cadre' },
  { num: '11', name: 'Type d’assurance qualité', source: 'Acteurs' },
  { num: '12', name: 'Prérequis', source: 'Preuves', optional: true },
  { num: 'O2', name: 'Supervision (présence vérifiée)', source: 'Séances', optional: true },
  { num: 'O4', name: 'Empilabilité', source: 'Architecture', optional: true },
  { num: 'K1', name: 'Co-attestation multipartite', source: 'Acteurs', optional: true },
  { num: 'K2', name: 'Empreinte probatoire', source: 'Header', optional: true },
];

const ACTOR_TIPS = {
  formation: {
    name: 'Débuter dans le numérique',
    meta: '12 participants · 104 preuves émises · 8 séances · 60 heures',
    badges: '',
  },
  of: {
    name: 'Atelier Numérique Formation',
    meta: 'Organisme de formation · émettrice · ◆ Reconnu et certifié par Qualiopi',
    badges: '104 preuves émises',
  },
  dutto: {
    name: 'Cabinet Dutto',
    meta: 'Co-attestée par R. Dutto, expert-comptable · co-attestant à la clôture (sans compte)',
    badges: '',
  },
  lea: {
    name: 'Léa Fontaine',
    meta: 'Formatrice · Atelier Numérique Formation',
    badges: '104 preuves attribuées',
  },
};

const BASE_PF: Omit<FormationProofData, 'shareToken' | 'level'> = {
  proofNumber: 'PF·2027·FR·4K8NX2QM',
  formationTitle: 'Débuter dans le numérique — bureautique, internet, démarches en ligne',
  dateRange: '5 janv. → 27 mars 2027',
  modality: 'présentiel',
  holderName: 'Nadia Belkacem',
  holderInitials: 'NB',
  holderRole: 'Apprenante',
  orgName: 'Atelier Numérique Formation',
  orgTrust: '◆ Reconnu et certifié par Qualiopi',
  orgTrustColor: '#FF616F',
  calculatedDate: '27 mars 2027',
  hashShort: 'b7e4a1…f293',
  description:
    'Soixante heures pour prendre en main l’ordinateur, la bureautique et les services en ligne du quotidien — vers l’autonomie numérique. La formation alterne huit séances en présentiel : prise en main du poste, traitement de texte, navigation et recherche sur internet, démarches administratives en ligne. Les compétences sont attestées au fil des séances et la preuve se scelle à la clôture de la formation.',
  learningOutcomes:
    'À l’issue de la formation, l’apprenant est capable d’utiliser un traitement de texte au quotidien, de naviguer et rechercher sur internet, et de réaliser ses démarches administratives en ligne en autonomie. Le programme suit le référentiel DigComp 2.2 — Domaine 1 (Information et données), complété d’acquis pratiques attestés en séance.',
  kpis: {
    participants: 12,
    sessions: 8,
    proofs: 104,
    hours: '60h',
    ects: '2 ECTS',
    eqf: 'EQF 2',
  },
  coAttestants: CO_ATTESTANTS,
  sessionsClosedLabel: '8 — toutes closes',
  referential: 'DigComp 2.2 — Domaine 1',
  participation: 'Présentiel',
  language: 'Français',
  evaluationType: 'mise en pratique en séance',
  prerequisitesTitle: 'Aucun prérequis',
  prerequisites: 'Formation ouverte aux débutants.',
  proofsReceived: 10,
  proofsSummary: '2 compétences · 8 présences',
  series: SERIES,
  timeline: TIMELINE,
  frameElements: FRAME_ELEMENTS,
  conformityElements: CONFORMITY_ELEMENTS,
  rgpdNote:
    '12 participants · non affichés (RGPD) · seuls l’émettrice, la formatrice et le co-attestant apparaissent',
  actorTips: ACTOR_TIPS,
};

export const MOCK_PF_NUMERIQUE: FormationProofData = {
  ...BASE_PF,
  shareToken: 'pf-debuter-numerique',
  level: 'PF',
};

export const MOCK_PF_MC_UE: FormationProofData = {
  ...BASE_PF,
  shareToken: 'pf-debuter-numerique-mc',
  level: 'EUMC',
};

export const FORMATION_PROOFS: FormationProofData[] = [MOCK_PF_NUMERIQUE, MOCK_PF_MC_UE];

const MAP = Object.fromEntries(FORMATION_PROOFS.map((p) => [p.shareToken, p]));

export function getMockFormationProof(token: string): FormationProofData {
  return (
    MAP[token] ?? {
      ...MOCK_PF_NUMERIQUE,
      shareToken: token,
      proofNumber: `PF·2027·FR·${token.toUpperCase().slice(0, 8)}`,
    }
  );
}
