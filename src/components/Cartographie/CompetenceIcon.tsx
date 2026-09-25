import React from 'react';
import { COMPETENCE_ICONS } from '../../constants/competenceIcons';

interface Props {
  /** Nom d'affichage de la compétence (après displayCompetenceName). */
  name: string;
  size?: number;
  className?: string;
}

/** true si une icône spécifique (maquette KIN_UX_CARTOGRAPHIE_V1_1) existe pour ce nom. */
export const hasCompetenceIcon = (name: string): boolean => Boolean(COMPETENCE_ICONS[name]);

/**
 * Icône spécifique d'une compétence, extraite de la maquette de référence
 * KIN_UX_CARTOGRAPHIE_V1_1 (src/constants/competenceIcons.ts). Remplace les
 * anciens visuels de badgeImages.ts pour le centre des anneaux vides.
 * Ne rend rien si aucune icône n'existe pour ce nom — l'appelant doit alors
 * retomber sur un autre visuel (ou laisser CompetenceRing afficher l'étoile
 * par défaut).
 */
const CompetenceIcon: React.FC<Props> = ({ name, size = 26, className }) => {
  const svg = COMPETENCE_ICONS[name];
  if (!svg) return null;
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
};

export default CompetenceIcon;
