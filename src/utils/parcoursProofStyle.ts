import { ParcoursTrustLevel } from '../types/parcoursProof';

export interface ParcoursTrustStyle {
  color: string;
  dark: string;
  label: string;
  pillPrefix: string;
}

export const PARCOURS_TRUST_STYLES: Record<ParcoursTrustLevel, ParcoursTrustStyle> = {
  INST: { color: '#003D8F', dark: '#002d7a', label: 'Institutionnel', pillPrefix: '✦ Institution publique' },
  NOEUD: { color: '#7C3AED', dark: '#5b21b6', label: 'Nœud diplomant', pillPrefix: '⬡ Accréditation publique' },
  PART: { color: '#FF616F', dark: '#d94f5c', label: 'Partenaire stratégique', pillPrefix: '◆ Reconnu et certifié' },
  ECOLE: { color: '#003189', dark: '#002570', label: 'Établissement scolaire', pillPrefix: 'Reconnu et supervisé' },
  CERT: { color: '#0891B2', dark: '#0a7a99', label: 'Bleu certifié', pillPrefix: '✓ Certifié par' },
  VER: { color: '#48A78D', dark: '#3a8a74', label: 'Bleu vérifié', pillPrefix: '✓ Vérifié' },
};

export function getParcoursTrustStyle(level: ParcoursTrustLevel): ParcoursTrustStyle {
  return PARCOURS_TRUST_STYLES[level];
}

export const PARCOURS_GOLD = '#D4AF37';
export const PARCOURS_GOLD_DARK = '#78350f';
