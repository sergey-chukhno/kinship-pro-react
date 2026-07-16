import { ProofCategory, ProofData, ProofDocumentType } from '../types/proof';
import {
  MOCK_PA_PARCOURS,
  MOCK_PB_MASKED,
  MOCK_PB_NOMINAL,
  MOCK_PD_DIPLOME,
  MOCK_PE_EVENT,
  MOCK_PE_PRESENCE,
  MOCK_PP_GOT_TALENT,
  MOCK_PP_MLDS,
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
    slug: 'badge-evenement',
    label: 'Preuves badge – événement',
    description: 'Preuves de compétence (PB) et preuves d’événement (PE).',
  },
  {
    slug: 'parcours',
    label: 'Preuves parcours',
    description: 'Preuves agrégées de parcours (PA).',
  },
  {
    slug: 'diplome',
    label: 'Preuves diplômes',
    description: 'Preuves de diplôme (PD).',
  },
];

export const PROOFS_BY_CATEGORY: Record<ProofCategory, ProofData[]> = {
  projet: [MOCK_PP_GOT_TALENT, MOCK_PP_MLDS],
  'badge-evenement': [MOCK_PB_NOMINAL, MOCK_PB_MASKED, MOCK_PE_EVENT, MOCK_PE_PRESENCE],
  parcours: [MOCK_PA_PARCOURS],
  diplome: [MOCK_PD_DIPLOME],
};

export function getCategoryConfig(slug: string): ProofCategoryConfig | undefined {
  return PROOF_CATEGORIES.find((c) => c.slug === slug);
}

export function isProofCategory(slug: string): slug is ProofCategory {
  return PROOF_CATEGORIES.some((c) => c.slug === slug);
}

export function isProofDocumentType(value: string): value is ProofDocumentType {
  return ['PP', 'PB', 'PE', 'PA', 'PD'].includes(value.toUpperCase());
}
