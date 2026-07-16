import { ProjectProofData } from '../types/projectProof';

const CO_ATTESTANTS_FULL = [
  {
    initials: 'JM',
    name: 'Lycée Jean Moulin',
    description: 'Établissement scolaire · Alpes-Maritimes',
    pillLabel: 'Reconnu É.N.',
    pillColor: '#003189',
    pillBorder: '#003189',
    avatarBg: 'rgba(0,49,137,.1)',
    avatarColor: '#003189',
  },
  {
    initials: 'TK',
    name: 'TouKouLeur',
    description: "Association d'éducation populaire",
    pillLabel: '✓ Vérifié',
    pillColor: '#2A8A9F',
    pillBorder: '#49B6D7',
    avatarBg: 'rgba(73,182,215,.1)',
    avatarColor: '#2A8A9F',
  },
  {
    initials: 'FA',
    name: "Fab'Azur",
    description: 'Fab lab · Fabrication numérique',
    pillLabel: '✓ Certifié',
    pillColor: '#0891B2',
    pillBorder: '#0891B2',
    avatarBg: 'rgba(8,145,178,.1)',
    avatarColor: '#0891B2',
  },
];

const TIMELINE_FULL = [
  {
    date: 'Septembre 2024',
    dateColor: '#003189',
    title: 'Lancement du projet',
    description: 'Constitution des équipes · 24 participants rattachés',
  },
  {
    date: 'Novembre 2024',
    dateColor: '#0891B2',
    title: "Premiers ateliers Fab'Azur",
    description: '3 sessions de fabrication numérique',
    pills: [{ label: "Fab'Azur", bg: '#e0f7fa', color: '#0891B2' }],
    presence: true,
  },
  {
    date: 'Février 2025',
    dateColor: '#2A8A9F',
    title: 'Phase co-attestation TouKouLeur',
    description: 'Premiers badges engagement attribués',
    pills: [{ label: 'TouKouLeur', bg: '#e8f6fa', color: '#2A8A9F' }],
  },
  {
    date: 'Juin 2025',
    dateColor: '#D4960A',
    title: 'Restitution publique',
    description: 'Présentation des créations · 87 badges distribués',
    pills: [{ label: 'Lycée Jean Moulin', bg: '#e6eaf2', color: '#003189' }],
    presence: true,
  },
  {
    date: '15 juillet 2025',
    dateColor: '#48A78D',
    title: 'Clôture du projet · Preuve Projet® générée',
  },
];

const BADGE_SERIES_FULL = [
  {
    name: 'Création numérique',
    count: 5,
    orgPill: { label: 'Lycée Jean Moulin', bg: '#e6eaf2', color: '#003189' },
    badges: [
      { name: 'Modélisation 3D — avancé', orgColor: '#003189' },
      { name: 'Programmation Arduino', orgColor: '#003189' },
      { name: "Design d'interface", orgColor: '#003189' },
    ],
    extraCount: 2,
  },
  {
    name: 'Engagement citoyen',
    count: 4,
    orgPill: { label: 'TouKouLeur', bg: '#e8f6fa', color: '#2A8A9F' },
    badges: [
      { name: 'Engagement associatif', orgColor: '#2A8A9F' },
      { name: 'Médiation culturelle', orgColor: '#2A8A9F' },
      { name: 'Animation de groupe', orgColor: '#2A8A9F' },
      { name: 'Écoresponsabilité', orgColor: '#2A8A9F' },
    ],
  },
];

const CONFORMITY_ELEMENTS = [
  { num: '1', name: "Identification de l'apprenant", source: 'Header' },
  { num: '2', name: 'Intitulé de la microcertification', source: 'Header' },
  { num: '3', name: "Pays / région de l'émetteur", source: 'Header' },
  { num: '4', name: 'Organisme(s) émetteur(s)', source: 'Acteurs' },
  { num: '5', name: 'Date de délivrance', source: 'Header' },
  { num: '6', name: "Acquis d'apprentissage", source: 'Étapes' },
  { num: '7', name: 'Charge de travail / ECTS', source: 'Étapes' },
  { num: '8', name: 'Niveau EQF', source: 'Cadre' },
  { num: '9', name: "Type d'évaluation", source: 'Étapes' },
  { num: '10', name: 'Forme de participation', source: 'Cadre' },
  { num: '11', name: "Type d'assurance qualité", source: 'Acteurs' },
  { num: '12', name: 'Prérequis', source: 'Badges', optional: true },
  { num: 'O2', name: 'Supervision (présence vérifiée)', source: 'Événements', optional: true },
  { num: 'K1', name: 'Co-attestation multipartite', source: 'Acteurs', optional: true },
  { num: 'K2', name: 'Empreinte probatoire', source: 'Header', optional: true },
];

export const MOCK_PP_ATELIER: ProjectProofData = {
  shareToken: 'atelier-numerique',
  proofNumber: 'PP·2025·FR·A7K2M9QRXT',
  level: 'PPMC',
  projectTitle: 'Atelier Création Numérique',
  dateRange: 'sept. 2024 → 15 juil. 2025',
  location: 'Nice · Alpes-Maritimes',
  holderName: 'Théo Marchand',
  holderInitials: 'TM',
  holderRole: 'Porteur du projet',
  holderAnonymous: false,
  orgName: 'Lycée Jean Moulin',
  orgTrust: "Reconnu et supervisé par l'É.N.",
  calculatedDate: '15 juil. 2025',
  hashShort: 'a3f9e2…c841',
  description:
    "Un atelier de création numérique où 24 jeunes ont conçu et fabriqué des objets connectés en collaboration avec un lycée, une association d'éducation populaire et un fab lab. Le projet mêle apprentissage technique, travail collaboratif et restitution publique.",
  learningOutcomes:
    "À l'issue du projet, le participant est capable de concevoir un objet connecté simple, de le prototyper avec des outils de fabrication numérique, et de présenter son travail à un public.",
  kpis: {
    participants: 24,
    coAttestants: 3,
    badges: 87,
    hours: '120h',
    eqf: 'EQF 4',
  },
  coAttestants: CO_ATTESTANTS_FULL,
  sector: 'Éducation',
  territory: 'Alpes-Maritimes',
  participation: 'Présentiel',
  language: 'Français',
  evaluationType: 'par les pairs',
  prerequisites: 'Aucun prérequis technique. Ouvert à tous les élèves du lycée.',
  badgesReceived: 14,
  badgeSeriesCount: 4,
  badgeSeries: BADGE_SERIES_FULL,
  timeline: TIMELINE_FULL,
  conformityElements: CONFORMITY_ELEMENTS,
};

export const MOCK_PP_GOT_TALENT: ProjectProofData = {
  ...MOCK_PP_ATELIER,
  shareToken: 'pp-got-talent',
  proofNumber: 'PP·2026·FR·8K2M4N6PQR',
  level: 'BASIC',
  projectTitle: 'Atelier musique — Got Talent?',
  dateRange: 'jan. → 25 jan. 2026',
  location: 'Nice',
  holderName: 'Lucas Dupont',
  holderInitials: 'LD',
  orgName: 'Jeunesse Villeneuvoise',
  orgTrust: 'Certifié par Agrément JEP',
  calculatedDate: '25 jan. 2026',
  kpis: { participants: 12, coAttestants: 1, badges: 18, hours: '40h', eqf: 'EQF 3' },
  coAttestants: [CO_ATTESTANTS_FULL[1]],
  timeline: TIMELINE_FULL.slice(0, 2),
  badgeSeries: BADGE_SERIES_FULL.slice(0, 1),
  badgesReceived: 5,
  badgeSeriesCount: 1,
};

export const MOCK_PP_MLDS: ProjectProofData = {
  ...MOCK_PP_ATELIER,
  shareToken: 'pp-mlds-nsi',
  proofNumber: 'PP·2026·FR·5N2R8K4WXP',
  level: 'RICH',
  projectTitle: 'IA & Société — Terminale NSI',
  dateRange: 'oct. 2025 → 12 mars 2026',
  location: 'Nice · Alpes-Maritimes',
  holderName: 'Lucas Dupont',
  holderInitials: 'LD',
  orgName: 'Lycée Victor Hugo — Nice',
  orgTrust: 'Établissement scolaire',
  calculatedDate: '12 mars 2026',
  kpis: { participants: 28, coAttestants: 2, badges: 45, hours: '80h', eqf: 'EQF 4' },
  coAttestants: CO_ATTESTANTS_FULL.slice(0, 2),
};

export const MOCK_PP_EUMC: ProjectProofData = {
  ...MOCK_PP_ATELIER,
  shareToken: 'pp-eumc-demo',
  proofNumber: 'PP·2026·FR·9E4U7M2CXP',
  level: 'EUMC',
  projectTitle: 'Parcours microcertification européenne',
  dateRange: 'sept. 2025 → 30 juin 2026',
  location: 'France · UE',
  holderName: 'Théo Marchand',
  holderInitials: 'TM',
  calculatedDate: '30 juin 2026',
  kpis: { participants: 24, coAttestants: 3, badges: 87, hours: '120h · 4 ECTS', eqf: 'EQF 4' },
};

export const PROJECT_PROOFS: ProjectProofData[] = [
  MOCK_PP_ATELIER,
  MOCK_PP_GOT_TALENT,
  MOCK_PP_MLDS,
  MOCK_PP_EUMC,
];

const PROJECT_PROOF_MAP = Object.fromEntries(
  PROJECT_PROOFS.map((p) => [p.shareToken, p])
);

export function getMockProjectProof(token: string): ProjectProofData {
  return (
    PROJECT_PROOF_MAP[token] ?? {
      ...MOCK_PP_ATELIER,
      shareToken: token,
      proofNumber: `PP·2026·FR·${token.toUpperCase().slice(0, 10)}`,
    }
  );
}
