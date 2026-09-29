export type ProjectProofLevel = 'BASIC' | 'RICH' | 'PPMC' | 'EUMC';

export interface ProjectProofKpi {
  participants: number;
  coAttestants: number;
  badges: number;
  hours: string;
  eqf: string;
}

export interface ProjectProofCoAttestant {
  initials: string;
  name: string;
  description: string;
  pillLabel: string;
  pillColor: string;
  pillBorder: string;
  avatarBg: string;
  avatarColor: string;
}

export interface ProjectProofTimelineEvent {
  date: string;
  dateColor: string;
  title: string;
  description?: string;
  pills?: Array<{ label: string; bg: string; color: string }>;
  presence?: boolean;
}

export interface ProjectProofBadgeSeries {
  name: string;
  count: number;
  orgPill: { label: string; bg: string; color: string };
  badges: Array<{ name: string; orgColor: string }>;
  extraCount?: number;
}

export interface ProjectProofConformityElement {
  num: string;
  name: string;
  source: string;
  optional?: boolean;
}

export interface ProjectProofData {
  shareToken: string;
  proofNumber: string;
  level: ProjectProofLevel;
  projectTitle: string;
  dateRange: string;
  location: string;
  holderName: string;
  holderInitials: string;
  holderRole: string;
  holderAnonymous: boolean;
  orgName: string;
  orgTrust: string;
  calculatedDate: string;
  hashShort: string;
  description: string;
  learningOutcomes: string;
  kpis: ProjectProofKpi;
  coAttestants: ProjectProofCoAttestant[];
  sector: string;
  territory: string;
  participation: string;
  language: string;
  evaluationType: string;
  prerequisites: string;
  badgesReceived: number;
  badgeSeriesCount: number;
  badgeSeries: ProjectProofBadgeSeries[];
  timeline: ProjectProofTimelineEvent[];
  conformityElements: ProjectProofConformityElement[];
}
