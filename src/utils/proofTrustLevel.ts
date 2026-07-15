import { ProofData, TrustLevelKey } from '../types/proof';

export interface TrustLevelStyle {
  headerClass: string;
  accentColor: string;
  qaClass: string;
  avatarStyle: { background: string; color: string };
}

export const TRUST_LEVEL_STYLES: Record<TrustLevelKey, TrustLevelStyle> = {
  INSTITUTIONAL: {
    headerClass: 'proof-z1-institutional',
    accentColor: '#003D8F',
    qaClass: 'proof-qa-institutional',
    avatarStyle: { background: '#003D8F20', color: '#003D8F' },
  },
  DIPLOMA_NODE: {
    headerClass: 'proof-z1-diploma-node',
    accentColor: '#7C3AED',
    qaClass: 'proof-qa-diploma-node',
    avatarStyle: { background: '#7C3AED20', color: '#7C3AED' },
  },
  STRATEGIC_PARTNER: {
    headerClass: 'proof-z1-strategic',
    accentColor: '#FF616F',
    qaClass: 'proof-qa-strategic',
    avatarStyle: { background: '#FF616F20', color: '#E04A58' },
  },
  SCHOOL: {
    headerClass: 'proof-z1-school',
    accentColor: '#003189',
    qaClass: 'proof-qa-school',
    avatarStyle: { background: '#00318920', color: '#003189' },
  },
  CERTIFIED: {
    headerClass: 'proof-z1-certified',
    accentColor: '#0891B2',
    qaClass: 'proof-qa-certified',
    avatarStyle: { background: '#0891B220', color: '#0891B2' },
  },
  VERIFIED: {
    headerClass: 'proof-z1-verified',
    accentColor: '#48A78D',
    qaClass: 'proof-qa-verified',
    avatarStyle: { background: '#48A78D20', color: '#3A8A74' },
  },
  STANDARD: {
    headerClass: 'proof-z1-standard',
    accentColor: '#374151',
    qaClass: 'proof-qa-standard',
    avatarStyle: { background: '#37415120', color: '#374151' },
  },
};

export function getProofSurtitle(proofType: ProofData['proofType']): string {
  return proofType === 'PE' ? 'Preuve Kinship · Événement' : 'Preuve Kinship · Compétence';
}

export function getProofRoute(proof: ProofData): string {
  const prefix = proof.proofType === 'PE' ? '/pe' : '/pb';
  return `${prefix}/${proof.shareToken}`;
}

export function truncateProofNumber(proofNumber: string, compact = false): string {
  if (!compact) return proofNumber;
  const parts = proofNumber.split('·');
  if (parts.length >= 4) {
    return `${parts[0]}·${parts[1]}·${parts[2]}·${parts[3].slice(0, 4)}…`;
  }
  return proofNumber;
}
