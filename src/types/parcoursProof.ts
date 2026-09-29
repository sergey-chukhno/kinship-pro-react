export type ParcoursTrustLevel = 'INST' | 'NOEUD' | 'PART' | 'ECOLE' | 'CERT' | 'VER';

export interface ParcoursCoAttestant {
  initials: string;
  name: string;
  subtitle: string;
  pill: string;
  color: string;
}

export interface ParcoursChronoItem {
  type: 'PP' | 'PS';
  title: string;
  org: string;
  period: string;
  badges: string;
  date: string;
}

export interface ParcoursProjectRow {
  type: 'PP' | 'PS';
  title: string;
  org: string;
}

export interface ParcoursBadgeSeries {
  name: string;
  color: string;
  count: number;
  badges: string[];
}

export interface ParcoursFriseJalon {
  pct: number;
  type: 'PP' | 'PS' | 'PD';
  date: string;
  title: string;
  org: string;
  period: string;
}

export interface ParcoursDiplomaInfo {
  title: string;
  barLabel: string;
  emitters: string;
  emitterLevel: string;
  holderName: string;
  code: string;
  rncp: string;
  session: string;
  hashShort: string;
}

export interface ParcoursProofData {
  shareToken: string;
  proofNumber: string;
  trustLevel: ParcoursTrustLevel;
  hasDiploma: boolean;
  parcoursTitle: string;
  subtitle: string;
  holderName: string;
  statusText: string;
  calculatedDate: string;
  hashShort: string;
  kpis: {
    projects: number;
    stages: number;
    badges: number;
    fourthValue: string;
    fourthLabel: string;
    fourthGold?: boolean;
  };
  coAttestants: ParcoursCoAttestant[];
  chronoItems: ParcoursChronoItem[];
  projectRows: ParcoursProjectRow[];
  badgeSeries: ParcoursBadgeSeries[];
  friseJalons: ParcoursFriseJalon[];
  friseStart: string;
  friseEnd: string;
  diploma?: ParcoursDiplomaInfo;
}
