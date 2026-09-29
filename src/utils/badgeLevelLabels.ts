/**
 * Soft Skills series — renamed 28/09/2026 (Patrick).
 * Legacy DB name kept for local/staging until rename is applied everywhere.
 */
export const SOFT_SKILLS_SERIES_NAME = 'Compétences transversales (soft skills)';
export const SOFT_SKILLS_SERIES_NAME_LEGACY = 'Série TouKouLeur';
/** Marketing label shown in the assign-badge modal (4LAB). */
export const SOFT_SKILLS_SERIES_DISPLAY_NAME = 'Série Soft Skills 4LAB';

export const isSoftSkillsSeries = (seriesName: string | null | undefined): boolean => {
  if (!seriesName) return false;
  const normalized = seriesName.toLowerCase();
  return (
    seriesName === SOFT_SKILLS_SERIES_NAME ||
    seriesName === SOFT_SKILLS_SERIES_NAME_LEGACY ||
    normalized.includes('toukouleur') ||
    normalized.includes('compétences transversales') ||
    normalized.includes('competences transversales')
  );
};

/**
 * Get the level label for a badge series and level number
 * Returns the appropriate label based on the series, matching the logic used in BadgeAssignmentModal
 *
 * @param series - The badge series name (exact database name)
 * @param levelNumber - The level number as a string ("1", "2", "3", "4")
 * @returns The formatted level label
 */
export const getLevelLabel = (series: string, levelNumber: string): string => {
  // Handle empty/null series
  if (!series) {
    return getSoftSkillsLabel(levelNumber);
  }

  // Soft Skills: Découverte / Appropriation only (Patrick 29/09)
  if (isSoftSkillsSeries(series)) {
    return getSoftSkillsLabel(levelNumber);
  }

  // Série Parcours des possibles: "Niveau 1", "Niveau 2" (no suffix)
  if (series === 'Série Parcours des possibles') {
    return `Niveau ${levelNumber}`;
  }

  // Série Audiovisuelle: "Niveau 1: Observable", etc.
  if (series === 'Série Audiovisuelle') {
    switch (levelNumber) {
      case '1':
        return 'Niveau 1: Observable';
      case '2':
        return 'Niveau 2: Preuve';
      case '3':
        return 'Niveau 3: Universitaire ou Associatif';
      case '4':
        return 'Niveau 4: Expérience professionnelle';
      default:
        return `Niveau ${levelNumber}`;
    }
  }

  // Série Parcours professionnel: "Niveau 1: Découverte", etc.
  if (series === 'Série Parcours professionnel') {
    switch (levelNumber) {
      case '1':
        return 'Niveau 1: Découverte';
      case '2':
        return 'Niveau 2: Formation';
      case '3':
        return 'Niveau 3: Professionnalisation';
      case '4':
        return 'Niveau 4: Expériences Professionnelles';
      default:
        return `Niveau ${levelNumber}`;
    }
  }

  // Série Métiers de la mer: "Niveau 1", "Niveau 2" (no suffix)
  if (series === 'Série Métiers de la mer') {
    return `Niveau ${levelNumber}`;
  }

  // Série Compétences à s'orienter - Collège
  if (series === "Série Compétences à s'orienter - Collège") {
    switch (levelNumber) {
      case '1':
        return 'Niveau 1 – Aperçu';
      case '2':
        return 'Niveau 2 - Appropriation';
      case '3':
        return 'Niveau 3 - Application';
      case '4':
        return 'Niveau 4 - Autonomie';
      default:
        return `Niveau ${levelNumber}`;
    }
  }

  return getSoftSkillsLabel(levelNumber);
};

/**
 * Soft Skills level labels (Découverte / Appropriation).
 * L3/L4 labels kept only for legacy display of existing proofs — not offered for new awards.
 */
const getSoftSkillsLabel = (levelNumber: string): string => {
  switch (levelNumber) {
    case '1':
      return 'Niveau 1: Découverte';
    case '2':
      return 'Niveau 2: Appropriation';
    case '3':
      return 'Niveau 3: Maîtrise';
    case '4':
      return 'Niveau 4: Expertise';
    default:
      return `Niveau ${levelNumber}`;
  }
};
