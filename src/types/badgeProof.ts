export type BadgeProofQaClass =
  | 'qa-accreditation-pub'
  | 'qa-externe-renf'
  | 'qa-externe-sup'
  | 'qa-externe'
  | 'qa-interne'
  | 'qa-standard';

export interface BadgeProofPerson {
  initials: string;
  name: string;
  subtitle: string;
  avatarBg: string;
  avatarColor: string;
  /** Zone 2 — show_owner_name = false */
  masked?: boolean;
}

export interface BadgeProofQaBadge {
  label: string;
  qaClass: BadgeProofQaClass;
  qualityFramework?: string;
}

export interface BadgeProofContextItem {
  label: string;
  value: string;
}

/** Zone 3 — Option C (D-OPTION-C-DISPLAY-01) */
export interface BadgeProofOptionC {
  issuedByOrg: string;
  issuedByQa: BadgeProofQaBadge;
  accreditedByOrg: string;
  accreditedByQa: BadgeProofQaBadge;
}

export type BadgeProofZone4Mode = 'skills' | 'presence';

export interface BadgeProofViewData {
  /** Zone 1 — Header */
  headerColor: string;
  badgeAcronym: string;
  badgeTitle: string;
  levelPill: string | null;
  seriesPill: string | null;
  eqfFrameworkPill: string | null;
  proofNumber: string | null;
  contextItems: BadgeProofContextItem[];

  /** Zone 2 — Porteur */
  receiver: BadgeProofPerson;
  /** Nom visible si show_owner_name = true (pour basculer l’aperçu) */
  receiverUnmasked: BadgeProofPerson;
  showOwnerName: boolean;
  /** Porteur adulte sur sa propre preuve — peut activer le masquage */
  canControlOwnerVisibility: boolean;
  userBadgeId: string | number | null;

  /** Zone 3 — Émetteur */
  senderCivilErased: boolean;
  sender: BadgeProofPerson | null;
  hideOrganizationName: boolean;
  orgName: string | null;
  countryFlag: string;
  qaBadge: BadgeProofQaBadge;
  optionC: BadgeProofOptionC | null;

  /** Zone 4 — Compétences ou présence */
  zone4Mode: BadgeProofZone4Mode;
  skills: string[];
  presenceDate?: string;
  presenceLocation?: string;

  /** Zone 5 — Justificatif */
  evidenceEmpty: boolean;
  evidenceName: string;
  evidenceHash: string | null;
  evidenceIcon: string;
  comment: string | null;
  commentLanguage: string | null;
  payloadHash: string | null;
  hashVersion: string | null;
  retentionText: string;
  projectProofPending: boolean;
  projectProofNumber: string | null;

  /** Zone 6 — URL affichée (tronquée, style maquette) */
  shareUrl: string;
  /** Zone 6 — URL complète pour « Copier le lien » */
  shareUrlCopy: string;
  footerRetentionNote: string;
  jsonExportDisabled: boolean;
}
