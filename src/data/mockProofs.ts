/**
 * Fausses données statiques pour les pages publiques /pb/:token et /pe/:token.
 * Aucun appel API — en attendant le branchement backend (T-BADGE-PREUVE).
 */
import { ProofData } from '../types/proof';

export const MOCK_PB_NOMINAL: ProofData = {
  shareToken: '3K1A7M9QRT',
  proofType: 'PB',
  proofNumber: 'PB·2026·FR·3K1A7M9QRT',
  trustLevel: 'CERTIFIED',
  badgeIcon: 'CO',
  badgeTitle: 'Communication',
  badgeLevel: 'Niveau 1',
  eqfPill: 'EQF 3 — DigComp',
  seriesPill: 'Référentiel Kinship · Compétences citoyennes',
  statusBubble: 'Attestée',
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
  proofType: 'PE',
  proofNumber: 'PE·2026·FR·9A4CM8PZQR',
  trustLevel: 'DIPLOMA_NODE',
  badgeIcon: 'SC',
  badgeTitle: 'Sécurité chantier',
  badgeLevel: 'Niveau 2',
  eqfPill: null,
  seriesPill: 'Référentiel Kinship · Sécurité professionnelle',
  statusBubble: 'Attestée',
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
  statusBubble: 'Vérifiée',
  presenceVerified: true,
  presenceDate: '5 mai 2026',
  presenceLocation: 'CFA Compagnons du Devoir — Aix-en-Provence',
  skills: [],
  eventTitle: 'Atelier sécurité chantier — Session du 5 mai',
};

const PB_MOCKS: Record<string, ProofData> = {
  [MOCK_PB_NOMINAL.shareToken]: MOCK_PB_NOMINAL,
  [MOCK_PB_MASKED.shareToken]: MOCK_PB_MASKED,
  demo: MOCK_PB_NOMINAL,
};

const PE_MOCKS: Record<string, ProofData> = {
  [MOCK_PE_EVENT.shareToken]: MOCK_PE_EVENT,
  [MOCK_PE_PRESENCE.shareToken]: MOCK_PE_PRESENCE,
  demo: MOCK_PE_EVENT,
};

function buildFallbackProof(proofType: 'PB' | 'PE', token: string): ProofData {
  const base = proofType === 'PE' ? MOCK_PE_EVENT : MOCK_PB_NOMINAL;
  const prefix = proofType === 'PE' ? 'PE' : 'PB';
  const proofNumber = `${prefix}·2026·FR·${token.toUpperCase().slice(0, 10)}`;

  return {
    ...base,
    shareToken: token,
    proofType,
    proofNumber,
    shareUrl: `kinshipedu.fr/${proofType === 'PE' ? 'pe' : 'pb'}/${token}`,
  };
}

/** Retourne toujours des fausses données — aucun appel API. */
export function getMockProof(proofType: 'PB' | 'PE', token: string): ProofData {
  const store = proofType === 'PE' ? PE_MOCKS : PB_MOCKS;
  return store[token] ?? buildFallbackProof(proofType, token);
}

/** Échantillons affichés sur la page générale /proof */
export const SAMPLE_PROOFS: ProofData[] = [
  MOCK_PB_NOMINAL,
  MOCK_PB_MASKED,
  MOCK_PE_EVENT,
  MOCK_PE_PRESENCE,
];
