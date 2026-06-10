export type BadgeProofVerifyStatus = 'authentic' | 'anomaly' | 'not_found';

export interface BadgeProofVerifySummaryField {
  label: string;
  value: string;
  mono?: boolean;
}

export interface BadgeProofVerifyStep {
  num: number;
  label: string;
  description: string;
}

export interface BadgeProofVerifyResult {
  status: BadgeProofVerifyStatus;
  verifiedAt: string;
  subtitle: string;
  summary: BadgeProofVerifySummaryField[];
  steps: BadgeProofVerifyStep[];
}
