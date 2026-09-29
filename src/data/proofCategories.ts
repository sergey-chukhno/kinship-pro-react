import { ProofCategory, ProofData, ProofDocumentType } from '../types/proof';
import {
  MOCK_PB_MASKED,
  MOCK_PB_NOMINAL,
  MOCK_PE_EVENT,
  MOCK_PE_PRESENCE,
} from './mockProofs';

export interface ProofCategoryConfig {
  slug: ProofCategory;
  label: string;
  description: string;
}

export const PROOF_CATEGORIES: ProofCategoryConfig[] = [
  {
    slug: 'projet',
    label: 'Preuves projets',
    description: 'Preuves de projet (PP) rattachées à vos expériences.',
  },
  {
    slug: 'badge',
    label: 'Preuves badge',
    description: 'Preuves de compétence (PB) attestant vos savoir-faire.',
  },
  {
    slug: 'evenement',
    label: 'Preuves événement',
    description: 'Preuves d’événement (PE) liées à votre participation.',
  },
  {
    slug: 'parcours',
    label: 'Preuves parcours',
    description: 'Preuves de parcours (PA) et de formation (PF).',
  },
];

export const PROOFS_BY_CATEGORY: Record<ProofCategory, ProofData[]> = {
  projet: [],
  badge: [MOCK_PB_NOMINAL, MOCK_PB_MASKED],
  evenement: [MOCK_PE_EVENT, MOCK_PE_PRESENCE],
  parcours: [],
};

export function getCategoryConfig(slug: string): ProofCategoryConfig | undefined {
  return PROOF_CATEGORIES.find((c) => c.slug === slug);
}

export function isProofCategory(slug: string): slug is ProofCategory {
  return PROOF_CATEGORIES.some((c) => c.slug === slug);
}

export function isProofDocumentType(value: string): value is ProofDocumentType {
  return ['PP', 'PB', 'PE', 'PA', 'PD', 'PF'].includes(value.toUpperCase());
}
