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
    // Default to TouKouLeur labels as fallback
    return getTouKouLeurLabel(levelNumber);
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

  // Série Soft Skills 4LAB (TouKouLeur): Default labels
  // Also handles "Série TouKouLeur" and any other series as fallback
  return getTouKouLeurLabel(levelNumber);
};

/**
 * Get TouKouLeur level labels (default/fallback)
 */
const getTouKouLeurLabel = (levelNumber: string): string => {
  switch (levelNumber) {
    case '1':
      return 'Niveau 1: Découverte';
    case '2':
      return 'Niveau 2: Application';
    case '3':
      return 'Niveau 3: Maîtrise';
    case '4':
      return 'Niveau 4: Expertise';
    default:
      return `Niveau ${levelNumber}`;
  }
};

