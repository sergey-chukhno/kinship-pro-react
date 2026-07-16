export type ProofType = 'PB' | 'PE';

export type ProofDocumentType = 'PP' | 'PB' | 'PE' | 'PA' | 'PD';

export type ProofCategory = 'projet' | 'badge-evenement' | 'parcours' | 'diplome';

export type TrustLevelKey =
  | 'INSTITUTIONAL'
  | 'DIPLOMA_NODE'
  | 'STRATEGIC_PARTNER'
  | 'SCHOOL'
  | 'CERTIFIED'
  | 'VERIFIED'
  | 'STANDARD';

export type ProofCardVariant = 'full' | 'compact' | 'intermediate';

export interface ProofAuthority {
  name: string;
  qaLabel: string;
  trustLevel: TrustLevelKey;
}

export interface ProofEvidence {
  filename: string | null;
  type: 'video' | 'image' | 'pdf' | 'document' | null;
  hash: string | null;
}

export interface ProofData {
  shareToken: string;
  documentType: ProofDocumentType;
  category: ProofCategory;
  proofType: ProofType;
  proofNumber: string;
  trustLevel: TrustLevelKey;
  badgeIcon: string;
  badgeTitle: string;
  badgeLevel: string;
  eqfPill: string | null;
  seriesPill: string;
  statusBubble: 'Attestée' | 'Vérifiée';
  awardedDate: string;
  projectTitle: string | null;
  eventTitle: string | null;
  holderName: string;
  holderInitials: string;
  holderRole: string;
  holderMasked: boolean;
  senderName: string;
  senderInitials: string;
  senderJob: string | null;
  senderOrg: string | null;
  senderCountryFlag: string;
  qaLabel: string;
  authority: ProofAuthority | null;
  senderCivilErased: boolean;
  skills: string[];
  eventLanguage: string | null;
  presenceVerified: boolean;
  presenceDate: string | null;
  presenceLocation: string | null;
  evidence: ProofEvidence;
  senderComment: string | null;
  senderCommentLang: string | null;
  payloadHash: string;
  hashVersion: string;
  retentionExpiry: string;
  ppProofNumber: string | null;
  shareUrl: string;
  showRightsLink: boolean;
}
