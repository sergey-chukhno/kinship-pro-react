import { COMPETENCES_PSYCHOSOCIALES_SERIES, isCompetencesPsychosocialesSeries } from './cpsSeries';

/**
 * Soft Skills series — renamed 28/09/2026 (Patrick).
 * Legacy DB name kept for local/staging until rename is applied everywhere.
 */
export const SOFT_SKILLS_SERIES_NAME = 'Compétences transversales (soft skills)';
export const SOFT_SKILLS_SERIES_NAME_LEGACY = 'Série TouKouLeur';
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
  if (!series) {
    return getSoftSkillsLabel(levelNumber);
  }

  // Soft Skills: Découverte / Appropriation only (Patrick 29/09)
  if (isSoftSkillsSeries(series)) {
    return getSoftSkillsLabel(levelNumber);
  }

  // Compétences psychosociales: "Phase 1" / "Phase 2" only (Patrick — nothing after)
  if (series === COMPETENCES_PSYCHOSOCIALES_SERIES) {
    return `Phase ${levelNumber}`;
  }

  if (series === 'Série Parcours des possibles') {
    return `Niveau ${levelNumber}`;
  }

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

  if (series === 'Série Métiers de la mer') {
    return `Niveau ${levelNumber}`;
  }

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
 * Display label for a badge level enum (level_1…) given its series.
 */
export const getBadgeLevelDisplayLabel = (
  series: string | undefined | null,
  level: string | undefined | null
): string => {
  const num = (level || 'level_1').replace(/^level_/, '');
  return getLevelLabel(series || '', num);
};

/**
 * Level label for a SET of series mixed together (cross-series aggregates : distribution par
 * niveau sur un dashboard/une vue analytics, qui peut mélanger plusieurs séries). Reprend
 * exactement la logique déjà en place pour le radar du Dashboard (Niveau N générique sauf si
 * toutes les séries présentes partagent le même mot, ou si le mélange est Soft Skills + CPS).
 *
 * @param seriesList - Toutes les séries présentes dans l'ensemble agrégé (peut contenir des doublons/vides)
 * @param levelNumber - Le numéro de niveau ("1", "2", "3", "4")
 */
export const getLevelLabelForSeriesSet = (
  seriesList: Array<string | null | undefined>,
  levelNumber: string
): string => {
  const present = Array.from(new Set(seriesList.filter((s): s is string => !!s)));
  if (present.length === 0) return `Niveau ${levelNumber}`;

  const allSoft = present.every((s) => isSoftSkillsSeries(s));
  const allCps = present.every((s) => isCompetencesPsychosocialesSeries(s));
  const mixedSoftCps =
    present.some((s) => isSoftSkillsSeries(s)) && present.some((s) => isCompetencesPsychosocialesSeries(s));

  if (allCps) return getLevelLabel(COMPETENCES_PSYCHOSOCIALES_SERIES, levelNumber);
  if (allSoft) return getLevelLabel(SOFT_SKILLS_SERIES_NAME, levelNumber);
  if (mixedSoftCps) {
    if (levelNumber === '1') return 'Découverte / Phase 1';
    if (levelNumber === '2') return 'Appropriation / Phase 2';
    return `Niveau ${levelNumber}`;
  }
  // Plusieurs séries génériques mélangées, sans mot commun : pas de faux-sens, on reste sur "Niveau N".
  return `Niveau ${levelNumber}`;
};

/**
 * Soft Skills level labels (Découverte / Appropriation) — words only, no « Niveau » prefix (Patrick).
 * L3/L4 labels kept only for legacy display of existing proofs — not offered for new awards.
 */
const getSoftSkillsLabel = (levelNumber: string): string => {
  switch (levelNumber) {
    case '1':
      return 'Découverte';
    case '2':
      return 'Appropriation';
    case '3':
      return 'Maîtrise';
    case '4':
      return 'Expertise';
    default:
      return `Niveau ${levelNumber}`;
  }
};
