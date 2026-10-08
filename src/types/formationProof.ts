export type FormationProofLevel = 'PF' | 'EUMC';

export interface FormationProofKpi {
  participants: number;
  sessions: number;
  proofs: number;
  hours: string;
  ects: string;
  eqf: string;
}

export interface FormationProofCoAttestant {
  initials: string;
  name: string;
  description: string;
  pillLabel: string;
  pillColor: string;
  pillBorder: string;
  avatarBg: string;
  avatarColor: string;
}

export interface FormationProofTimelineEvent {
  date: string;
  dateColor: string;
  title: string;
  description?: string;
  pills?: Array<{ label: string; bg: string; color: string }>;
  presence?: boolean;
}

export interface FormationProofItem {
  name: string;
  orgColor: string;
  kind: 'PB' | 'PE';
}

export interface FormationProofSeries {
  name: string;
  count: number;
  orgPill: { label: string; bg: string; color: string };
  items: FormationProofItem[];
  extraCount?: number;
  extraLabel?: string;
}

export interface FormationProofConformityElement {
  num: string;
  name: string;
  source: string;
  optional?: boolean;
}

export interface FormationProofFrameElement {
  name: string;
  source: string;
}

export interface FormationProofActorTip {
  name: string;
  meta: string;
  badges: string;
}

export interface FormationProofData {
  shareToken: string;
  proofNumber: string;
  level: FormationProofLevel;
  formationTitle: string;
  dateRange: string;
  modality: string;
  holderName: string;
  holderInitials: string;
  holderRole: string;
  orgName: string;
  orgTrust: string;
  orgTrustColor: string;
  calculatedDate: string;
  hashShort: string;
  description: string;
  learningOutcomes: string;
  kpis: FormationProofKpi;
  coAttestants: FormationProofCoAttestant[];
  sessionsClosedLabel: string;
  referential: string;
  participation: string;
  language: string;
  evaluationType: string;
  prerequisitesTitle: string;
  prerequisites: string;
  proofsReceived: number;
  proofsSummary: string;
  series: FormationProofSeries[];
  timeline: FormationProofTimelineEvent[];
  frameElements: FormationProofFrameElement[];
  conformityElements: FormationProofConformityElement[];
  rgpdNote: string;
  actorTips: Record<string, FormationProofActorTip>;
}
