import { ParcoursProofData } from '../types/parcoursProof';

const CO_ATTESTANTS_ORG = [
  { initials: 'JM', name: 'Lycée Jean Moulin', subtitle: 'Établissement scolaire · Alpes-Maritimes', pill: 'Reconnu É.N.', color: '#003189' },
  { initials: 'TK', name: 'TouKouLeur', subtitle: "Association d'éducation populaire", pill: '✓ Vérifié', color: '#48A78D' },
  { initials: 'FA', name: "Fab'Azur", subtitle: 'Fab lab · Fabrication numérique', pill: '✓ Certifié', color: '#0891B2' },
];

const CO_ATTESTANTS_INST = [
  { initials: 'RN', name: 'Rectorat de Nice', subtitle: 'Académie de Nice', pill: '✦ Institution publique', color: '#003D8F' },
  { initials: 'CC', name: 'CCI Nice', subtitle: "Chambre de Commerce et d'Industrie", pill: '⬡ Nœud diplomant', color: '#7C3AED' },
  { initials: 'GC', name: 'Groupe Carrefour', subtitle: 'Partenaire entreprise', pill: '✓ Vérifié', color: '#48A78D' },
];

const CHRONO_ITEMS = [
  { type: 'PP' as const, title: 'Atelier Création Numérique', org: "Lycée Jean Moulin · TouKouLeur · Fab'Azur", period: 'sept. 2024 → juil. 2025', badges: '32', date: 'juil. 2025' },
  { type: 'PS' as const, title: "Stage — Fab'Azur", org: "Fab'Azur · Lycée Jean Moulin", period: 'janv. → mars 2025', badges: '8', date: 'mars 2025' },
  { type: 'PP' as const, title: 'Design Graphique Solidaire', org: 'TouKouLeur · Lycée Jean Moulin', period: 'sept. 2025 → jan. 2026', badges: '14', date: 'jan. 2026' },
];

const PROJECT_ROWS = [
  { type: 'PP' as const, title: 'Atelier Création Numérique', org: 'Lycée Jean Moulin' },
  { type: 'PS' as const, title: "Stage — Fab'Azur", org: "Fab'Azur" },
  { type: 'PP' as const, title: 'Design Graphique Solidaire', org: 'TouKouLeur' },
  { type: 'PS' as const, title: 'Stage — TouKouLeur', org: 'TouKouLeur' },
  { type: 'PP' as const, title: 'Robotique & IA Junior', org: 'Lycée Jean Moulin' },
];

const BADGE_SERIES = [
  { name: 'Numérique & Création', color: '#0891B2', count: 18, badges: ['Modélisation 3D', 'Impression numérique', 'Design graphique', 'Vidéo montage'] },
  { name: 'Communication', color: '#7C3AED', count: 14, badges: ['Prise de parole', 'Rédaction web', 'Médiation'] },
  { name: 'Collaboration', color: '#48A78D', count: 12, badges: ['Travail en équipe', 'Gestion de projet'] },
  { name: 'Engagement', color: '#FF616F', count: 10, badges: ['Citoyenneté active', 'Bénévolat'] },
];

const FRISE_SANS_PD = [
  { pct: 5, type: 'PP' as const, date: 'sept. 24', title: 'Atelier Création Numérique', org: 'Lycée Jean Moulin', period: 'sept. 2024 → juil. 2025' },
  { pct: 28, type: 'PS' as const, date: 'janv. 25', title: "Stage Fab'Azur", org: "Fab'Azur", period: 'janv. → mars 2025' },
  { pct: 54, type: 'PP' as const, date: 'sept. 25', title: 'Design Graphique Solidaire', org: 'TouKouLeur', period: 'sept. 2025 → jan. 2026' },
  { pct: 75, type: 'PS' as const, date: 'avr. 26', title: 'Stage TouKouLeur', org: 'TouKouLeur', period: 'avr. → juin 2026' },
  { pct: 95, type: 'PP' as const, date: 'fév. 26', title: 'Robotique & IA Junior', org: 'Lycée Jean Moulin', period: 'fév. → mai 2026' },
];

const FRISE_AVEC_PD = [
  { pct: 5, type: 'PP' as const, date: 'sept. 24', title: 'Atelier Création Numérique', org: 'Lycée Jean Moulin', period: 'sept. 2024 → juil. 2025' },
  { pct: 24, type: 'PS' as const, date: 'janv. 25', title: "Stage Fab'Azur", org: "Fab'Azur", period: 'janv. → mars 2025' },
  { pct: 46, type: 'PP' as const, date: 'sept. 25', title: 'Design Graphique Solidaire', org: 'TouKouLeur', period: 'sept. 2025 → jan. 2026' },
  { pct: 65, type: 'PS' as const, date: 'avr. 26', title: 'Stage TouKouLeur', org: 'TouKouLeur', period: 'avr. → juin 2026' },
  { pct: 82, type: 'PP' as const, date: 'fév. 26', title: 'Robotique & IA Junior', org: 'Lycée Jean Moulin', period: 'fév. → mai 2026' },
  { pct: 95, type: 'PD' as const, date: 'juil. 26', title: 'BTS Commerce International', org: 'CCI Nice · Rectorat de Nice', period: 'Nice · session 2024–2026' },
];

export const MOCK_PA_LYCEE: ParcoursProofData = {
  shareToken: 'parcours-lycee-jm',
  proofNumber: 'PA·2026·NI·0007',
  trustLevel: 'ECOLE',
  hasDiploma: false,
  parcoursTitle: 'Parcours Lycée Jean Moulin',
  subtitle: 'Sept. 2025 → Août 2026 · 4 projets · 2 stages',
  holderName: 'Théo Marchand',
  statusText: 'Parcours agrégé — 3 structures co-attestantes',
  calculatedDate: '18 avr. 2026',
  hashShort: 'b7f2a1…d9c043',
  kpis: { projects: 4, stages: 2, badges: 54, fourthValue: '3', fourthLabel: 'structures' },
  coAttestants: CO_ATTESTANTS_ORG,
  chronoItems: CHRONO_ITEMS,
  projectRows: PROJECT_ROWS,
  badgeSeries: BADGE_SERIES,
  friseJalons: FRISE_SANS_PD,
  friseStart: 'sept. 2024',
  friseEnd: 'juin 2026',
};

export const MOCK_PA_BTS: ParcoursProofData = {
  shareToken: 'parcours-bts-ci',
  proofNumber: 'PA·2026·NI·0008',
  trustLevel: 'INST',
  hasDiploma: true,
  parcoursTitle: 'Parcours BTS Commerce Int.',
  subtitle: 'Sept. 2024 → Août 2026 · 5 projets · 1 stage · 1 diplôme',
  holderName: 'Marie Dupont',
  statusText: 'Parcours diplomant — 3 structures co-attestantes',
  calculatedDate: '18 avr. 2026',
  hashShort: 'b7f2a1…d9c043',
  kpis: { projects: 5, stages: 1, badges: 54, fourthValue: 'BTS', fourthLabel: 'diplôme', fourthGold: true },
  coAttestants: CO_ATTESTANTS_INST,
  chronoItems: CHRONO_ITEMS,
  projectRows: PROJECT_ROWS,
  badgeSeries: BADGE_SERIES,
  friseJalons: FRISE_AVEC_PD,
  friseStart: 'sept. 2024',
  friseEnd: 'juil. 2026',
  diploma: {
    title: 'BTS Commerce International',
    barLabel: ' BTS Commerce International · CCI Nice · Rectorat de Nice',
    emitters: 'CCI Nice · Rectorat de Nice',
    emitterLevel: 'Nœud diplomant',
    holderName: 'Marie Dupont',
    code: 'PD·2026·NI·0008',
    rncp: 'RNCP38455',
    session: '2024 – 2026',
    hashShort: '9e2b1f…c4a830',
  },
};

export const PARCOURS_PROOFS: ParcoursProofData[] = [MOCK_PA_LYCEE, MOCK_PA_BTS];

const MAP = Object.fromEntries(PARCOURS_PROOFS.map((p) => [p.shareToken, p]));

export function getMockParcoursProof(token: string): ParcoursProofData {
  return (
    MAP[token] ?? {
      ...MOCK_PA_LYCEE,
      shareToken: token,
      proofNumber: `PA·2026·NI·${token.toUpperCase().slice(0, 4)}`,
    }
  );
}
