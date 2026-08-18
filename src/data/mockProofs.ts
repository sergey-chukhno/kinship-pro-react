/**
 * Fausses données statiques pour les pages publiques /pb/:token, /pe/:token et /pik.
 * Aucun appel API — en attendant le branchement backend (T-BADGE-PREUVE).
 */
import { ProofData, ProofDocumentType } from '../types/proof';

export const MOCK_PB_NOMINAL: ProofData = {
  shareToken: '3K1A7M9QRT',
  documentType: 'PB',
  category: 'badge',
  proofType: 'PB',
  proofNumber: 'PB·2026·FR·3K1A7M9QRT',
  trustLevel: 'CERTIFIED',
  badgeIcon: 'CO',
  badgeTitle: 'Communication',
  badgeLevel: 'Niveau 1',
  eqfPill: 'EQF 3 — DigComp',
  seriesPill: 'Référentiel Kinship · Compétences citoyennes',
  statusBubble: '✓ Attestée',
  awardedDate: '25 jan. 2026',
  projectTitle: 'Atelier musique — Got Talent?',
  eventTitle: null,
  holderName: 'Lucas Dupont',
  holderInitials: 'LD',
  holderRole: 'Co-responsable du projet',
  holderMasked: false,
  senderName: 'Virginie Torrenti',
  senderInitials: 'VT',
  senderJob: 'Facilitatrice en intelligence collective',
  senderOrg: 'Jeunesse Villeneuvoise',
  senderCountryFlag: '🇫🇷',
  qaLabel: 'Certifié par Agrément JEP',
  authority: null,
  senderCivilErased: false,
  skills: [
    "Parle et argumente à l'oral de façon claire et organisée",
    'Écoute et prend en compte ses interlocuteurs',
    "Adapte son discours selon le contexte et l'audience",
  ],
  eventLanguage: null,
  presenceVerified: false,
  presenceDate: null,
  presenceLocation: null,
  evidence: {
    filename: 'presentation_got_talent.mp4',
    type: 'video',
    hash: 'c7a3f91e8b2d4f60a...',
  },
  senderComment:
    'Lucas a présenté son projet devant 40 personnes avec une clarté remarquable. Sa capacité à structurer son discours est au niveau attendu pour ce badge.',
  senderCommentLang: '🇫🇷 FR',
  payloadHash: '9114e6a1d7b4c2f8...',
  hashVersion: 'sha256-v1',
  retentionExpiry: '25 jan. 2031',
  ppProofNumber: 'PP·2026·FR·8K2M4N6PQR',
  shareUrl: 'kinshipedu.fr/pb/3K1A7M9QRT',
  showRightsLink: true,
};

export const MOCK_PB_MASKED: ProofData = {
  ...MOCK_PB_NOMINAL,
  shareToken: 'masked-demo',
  proofNumber: 'PB·2026·FR·7M8SK2PLQW',
  shareUrl: 'kinshipedu.fr/pb/masked-demo',
  holderName: 'Identité masquée',
  holderInitials: '?',
  holderMasked: true,
};

export const MOCK_PE_EVENT: ProofData = {
  shareToken: '9A4CM8PZQR',
  documentType: 'PE',
  category: 'evenement',
  proofType: 'PE',
  proofNumber: 'PE·2026·FR·9A4CM8PZQR',
  trustLevel: 'DIPLOMA_NODE',
  badgeIcon: 'SC',
  badgeTitle: 'Sécurité chantier',
  badgeLevel: 'Niveau 2',
  eqfPill: null,
  seriesPill: 'Référentiel Kinship · Sécurité professionnelle',
  statusBubble: '✓ Attestée',
  awardedDate: '3 avr. 2026',
  projectTitle: 'Formation CAP Maçonnerie — Promo 2026',
  eventTitle: 'Forum Métiers & Apprentissage 2026',
  holderName: 'Lucas Dupont',
  holderInitials: 'LD',
  holderRole: 'Co-responsable du projet',
  holderMasked: false,
  senderName: 'Marc Dubois',
  senderInitials: 'MD',
  senderJob: 'Formateur sécurité',
  senderOrg: 'CFA Compagnons du Devoir — Aix',
  senderCountryFlag: '🇫🇷',
  qaLabel: '⬡ Accréditation publique',
  authority: null,
  senderCivilErased: false,
  skills: [
    'Applique les règles de sécurité sur un chantier',
    'Identifie les risques et alerte les responsables',
    "Coordonne l'évacuation en situation d'urgence",
  ],
  eventLanguage: '🇫🇷 Français',
  presenceVerified: false,
  presenceDate: null,
  presenceLocation: null,
  evidence: {
    filename: 'attestation_forum.pdf',
    type: 'pdf',
    hash: 'b2e8f4a1c9d3e7f0...',
  },
  senderComment: null,
  senderCommentLang: null,
  payloadHash: 'f3a8c21d9e7b4a6c...',
  hashVersion: 'sha256-v1',
  retentionExpiry: '3 avr. 2031',
  ppProofNumber: 'PP·2026·FR·2H5J8K1MNP',
  shareUrl: 'kinshipedu.fr/pe/9A4CM8PZQR',
  showRightsLink: true,
};

export const MOCK_PE_PRESENCE: ProofData = {
  ...MOCK_PE_EVENT,
  shareToken: 'presence-demo',
  proofNumber: 'PE·2026·FR·4B7XN2K8WP',
  shareUrl: 'kinshipedu.fr/pe/presence-demo',
  statusBubble: '✓ Vérifiée',
  presenceVerified: true,
  presenceDate: '5 mai 2026',
  presenceLocation: 'CFA Compagnons du Devoir — Aix-en-Provence',
  skills: [],
  eventTitle: 'Atelier sécurité chantier — Session du 5 mai',
};

export const MOCK_PP_GOT_TALENT: ProofData = {
  ...MOCK_PB_NOMINAL,
  shareToken: 'pp-got-talent',
  documentType: 'PP',
  category: 'projet',
  proofType: 'PB',
  proofNumber: 'PP·2026·FR·8K2M4N6PQR',
  badgeIcon: 'GT',
  badgeTitle: 'Atelier musique — Got Talent?',
  badgeLevel: 'Projet',
  eqfPill: null,
  seriesPill: 'Preuve de projet Kinship',
  shareUrl: 'kinshipedu.fr/pp/pp-got-talent',
  ppProofNumber: null,
};

export const MOCK_PP_MLDS: ProofData = {
  ...MOCK_PP_GOT_TALENT,
  shareToken: 'pp-mlds-nsi',
  proofNumber: 'PP·2026·FR·5N2R8K4WXP',
  badgeIcon: 'IA',
  badgeTitle: 'IA & Société — Terminale NSI',
  awardedDate: '12 mars 2026',
  retentionExpiry: '12 mars 2031',
  projectTitle: 'IA & Société — Terminale NSI',
  senderOrg: 'Lycée Victor Hugo — Nice',
  qaLabel: 'Établissement scolaire',
  trustLevel: 'SCHOOL',
  shareUrl: 'kinshipedu.fr/pp/pp-mlds-nsi',
};

export const MOCK_PA_PARCOURS: ProofData = {
  ...MOCK_PB_NOMINAL,
  shareToken: 'pa-citoyennete',
  documentType: 'PA',
  category: 'parcours',
  proofType: 'PB',
  proofNumber: 'PA·2026·FR·6P3A9K2MNR',
  badgeIcon: 'PC',
  badgeTitle: 'Parcours citoyenneté numérique',
  badgeLevel: 'Parcours',
  eqfPill: 'EQF 4',
  seriesPill: 'Parcours agrégé Kinship',
  projectTitle: '3 projets · 2 événements',
  eventTitle: null,
  awardedDate: '15 juin 2026',
  retentionExpiry: '15 juin 2031',
  shareUrl: 'kinshipedu.fr/pa/pa-citoyennete',
  ppProofNumber: null,
  skills: [
    'Mobilise des compétences numériques dans des projets variés',
    'Collabore au sein de communautés éducatives',
    'S’engage dans une démarche citoyenne',
  ],
};

export const MOCK_PD_DIPLOME: ProofData = {
  ...MOCK_PE_EVENT,
  shareToken: 'pd-cap-macon',
  documentType: 'PD',
  category: 'parcours',
  proofType: 'PE',
  proofNumber: 'PD·2026·FR·7D4K8M2NXP',
  badgeIcon: 'CM',
  badgeTitle: 'CAP Maçonnerie',
  badgeLevel: 'Diplôme',
  eqfPill: 'EQF 3',
  seriesPill: 'Certification professionnelle',
  projectTitle: 'Formation CAP Maçonnerie — Promo 2026',
  eventTitle: null,
  awardedDate: '30 juin 2026',
  retentionExpiry: '30 juin 2031',
  trustLevel: 'DIPLOMA_NODE',
  shareUrl: 'kinshipedu.fr/pd/pd-cap-macon',
  ppProofNumber: 'PA·2026·FR·6P3A9K2MNR',
};

const ALL_MOCKS: ProofData[] = [
  MOCK_PB_NOMINAL,
  MOCK_PB_MASKED,
  MOCK_PE_EVENT,
  MOCK_PE_PRESENCE,
  MOCK_PP_GOT_TALENT,
  MOCK_PP_MLDS,
  MOCK_PA_PARCOURS,
  MOCK_PD_DIPLOME,
];

const MOCK_BY_KEY: Record<string, ProofData> = Object.fromEntries(
  ALL_MOCKS.map((p) => [`${p.documentType}:${p.shareToken}`, p])
);

function buildFallbackProof(documentType: ProofDocumentType, token: string): ProofData {
  const bases: Record<ProofDocumentType, ProofData> = {
    PP: MOCK_PP_GOT_TALENT,
    PB: MOCK_PB_NOMINAL,
    PE: MOCK_PE_EVENT,
    PA: MOCK_PA_PARCOURS,
    PD: MOCK_PD_DIPLOME,
  };
  const base = bases[documentType];
  const proofNumber = `${documentType}·2026·FR·${token.toUpperCase().slice(0, 10)}`;
  const publicPrefix =
    documentType === 'PB' || documentType === 'PE'
      ? documentType.toLowerCase()
      : documentType.toLowerCase();

  return {
    ...base,
    shareToken: token,
    documentType,
    proofType: documentType === 'PE' ? 'PE' : 'PB',
    proofNumber,
    shareUrl: `kinshipedu.fr/${publicPrefix}/${token}`,
  };
}

/** Retourne toujours des fausses données — pages publiques PB/PE. */
export function getMockProof(proofType: 'PB' | 'PE', token: string): ProofData {
  return getMockProofByDocument(proofType, token);
}

/** Retourne toujours des fausses données — toutes familles de preuves. */
export function getMockProofByDocument(documentType: ProofDocumentType, token: string): ProofData {
  const key = `${documentType}:${token}`;
  if (MOCK_BY_KEY[key]) return MOCK_BY_KEY[key];
  if (documentType === 'PB' && token === 'demo') return MOCK_PB_NOMINAL;
  if (documentType === 'PE' && token === 'demo') return MOCK_PE_EVENT;
  return buildFallbackProof(documentType, token);
}

/** Échantillons affichés sur la page générale /proof */
export const SAMPLE_PROOFS: ProofData[] = [
  MOCK_PB_NOMINAL,
  MOCK_PB_MASKED,
  MOCK_PE_EVENT,
  MOCK_PE_PRESENCE,
];
