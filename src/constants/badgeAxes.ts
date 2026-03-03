/**
 * Shared axe titles and badge-name lists for series that use axes in the badge explorer
 * and in the "Attribuer un badge" modal. Single source of truth to avoid duplication and mismatches.
 */

export const METIERS_DE_LA_MER_SERIES = "Série Métiers de la mer";
export const COMPETENCES_ORIENTER_COLLEGE_SERIES = "Série Compétences à s'orienter - Collège";

/** One axis: title (for dropdown/label) and list of badge names belonging to that axis */
export interface BadgeAxe {
  id: string;
  title: string;
  badgeNames: string[];
  /** Optional image URL for explorer (Métiers de la mer only) */
  imageUrl?: string;
}

// --- Série Métiers de la mer ---
const METIERS_MER_AXE1_TITLE = "Axe 1: Vie en collectivité";
const METIERS_MER_AXE2_TITLE = "Axe 2: Expérience de la mer et sécurité";
const METIERS_MER_AXE3_TITLE = "Axe 3: Engagement et construction du projet professionnel";

const METIERS_MER_AXE1_BADGE_NAMES: string[] = [
  "Niveau 1 - Se situer et s'adapter dans un collectif",
  "Niveau 1 - Respect des autres",
  "Niveau 1 - Respect du vivant et de l'environnement",
  "Niveau 2 - Contribuer activement au collectif"
];

const METIERS_MER_AXE2_BADGE_NAMES: string[] = [
  "Niveau 1 - Comprendre et appliquer les règles de sécurité maritime",
  "Niveau 1 - Responsabilité",
  "Niveau 2 - Agir avec autonomie et sens marin"
];

const METIERS_MER_AXE3_BADGE_NAMES: string[] = [
  "Niveau 1 - S'impliquer dans un parcours de découverte",
  "Niveau 2 - Se projeter et construire des perspectives"
];

export const METIERS_MER_AXE1_IMAGE = "/badges_metiers_de_la_mer/axe_1_vie_en_collectivite/axe_1.png";
export const METIERS_MER_AXE2_IMAGE = "/badges_metiers_de_la_mer/axe_2_experience_de_la_mer_et_securite/axe_2.png";
export const METIERS_MER_AXE3_IMAGE = "/badges_metiers_de_la_mer/axe_3_engagement_et_construction_du_projet_professionnel/axe_3.png";

const METIERS_MER_AXES: BadgeAxe[] = [
  { id: 'metiers_mer_1', title: METIERS_MER_AXE1_TITLE, badgeNames: METIERS_MER_AXE1_BADGE_NAMES, imageUrl: METIERS_MER_AXE1_IMAGE },
  { id: 'metiers_mer_2', title: METIERS_MER_AXE2_TITLE, badgeNames: METIERS_MER_AXE2_BADGE_NAMES, imageUrl: METIERS_MER_AXE2_IMAGE },
  { id: 'metiers_mer_3', title: METIERS_MER_AXE3_TITLE, badgeNames: METIERS_MER_AXE3_BADGE_NAMES, imageUrl: METIERS_MER_AXE3_IMAGE }
];

// --- Série Compétences à s'orienter - Collège ---
const COMPETENCES_ORIENTER_AXE1_TITLE = "Axe 1 – CONNAITRE ET SAVOIR S'INFORMER SUR LE MONDE : Découverte des environnements scolaires, professionnels, économiques et sociaux";
const COMPETENCES_ORIENTER_AXE2_TITLE = "Axe 2 – SE DÉCOUVRIR ET S'AFFIRMER : identification de soi, de ses intérêts, de ses compétences, de ses valeurs";
const COMPETENCES_ORIENTER_AXE3_TITLE = "Axe 3 – SE CONSTRUIRE ET SE PROJETER DANS UN MONDE EN MOUVEMENT";

const COMPETENCES_ORIENTER_AXE1_BADGE_NAMES: string[] = [
  "Compétence 1 – Chercher et trier l'information",
  "Compétence 2 – Connaitre les personnes, lieux, ressources qui peuvent m'aider",
  "Compétence 3 – Apprendre à découvrir les parcours de formation",
  "Compétence 4 – Apprendre à découvrir les métiers et le monde du travail",
  "Compétence 5 – M'interroger sur les clichés"
];

const COMPETENCES_ORIENTER_AXE2_BADGE_NAMES: string[] = [
  "Compétence 1 – Apprendre à me connaitre",
  "Compétence 2 – Définir mes projets en fonction de qui je suis",
  "Compétence 3 – M'autoriser à rêver et à avoir des ambitions",
  "Compétence 4 – Savoir me présenter et m'affirmer",
  "Compétence 5 – Identifier ce que j'ai appris et ce que je sais faire"
];

const COMPETENCES_ORIENTER_AXE3_BADGE_NAMES: string[] = [
  "Compétence 1 – Accepter les imprévus et saisir les occasions",
  "Compétence 2 – M'ouvrir au monde et aux autres",
  "Compétence 3 – Me préparer aux transitions et aux changements",
  "Compétence 4 – Me projeter et comprendre les conséquences de mes choix"
];

const COMPETENCES_ORIENTER_AXES: BadgeAxe[] = [
  { id: 'competences_orienter_1', title: COMPETENCES_ORIENTER_AXE1_TITLE, badgeNames: COMPETENCES_ORIENTER_AXE1_BADGE_NAMES },
  { id: 'competences_orienter_2', title: COMPETENCES_ORIENTER_AXE2_TITLE, badgeNames: COMPETENCES_ORIENTER_AXE2_BADGE_NAMES },
  { id: 'competences_orienter_3', title: COMPETENCES_ORIENTER_AXE3_TITLE, badgeNames: COMPETENCES_ORIENTER_AXE3_BADGE_NAMES }
];

/** Series that use axes in the assignment modal (Axe dropdown) */
export const SERIES_WITH_AXES = [METIERS_DE_LA_MER_SERIES, COMPETENCES_ORIENTER_COLLEGE_SERIES] as const;

export function isSeriesWithAxes(seriesName: string): boolean {
  return SERIES_WITH_AXES.includes(seriesName as typeof SERIES_WITH_AXES[number]);
}

/**
 * Returns the list of axes for a series that uses axes, or empty array if the series does not use axes.
 */
export function getAxesForSeries(seriesName: string): BadgeAxe[] {
  if (seriesName === METIERS_DE_LA_MER_SERIES) return METIERS_MER_AXES;
  if (seriesName === COMPETENCES_ORIENTER_COLLEGE_SERIES) return COMPETENCES_ORIENTER_AXES;
  return [];
}

/**
 * Returns badge names for a given series and axe title (for filtering API badges by axe).
 */
export function getBadgeNamesForAxe(seriesName: string, axeTitle: string): string[] {
  const axes = getAxesForSeries(seriesName);
  const axe = axes.find((a) => a.title === axeTitle);
  return axe ? axe.badgeNames : [];
}

/** Badge name + level for Série Métiers de la mer (for building static badge list in Explorer) */
export interface MetiersMerBadgeDef {
  name: string;
  level: 'level_1' | 'level_2';
  axe: 1 | 2 | 3;
}

/**
 * Returns all Métiers de la mer badges with name and level, derived from axe badge names.
 * Single source of truth for names; level is inferred from "Niveau 1" / "Niveau 2" in the name.
 */
export function getMetiersMerBadgesWithLevel(): MetiersMerBadgeDef[] {
  const result: MetiersMerBadgeDef[] = [];
  METIERS_MER_AXES.forEach((axe, idx) => {
    const axeNum = (idx + 1) as 1 | 2 | 3;
    axe.badgeNames.forEach((name) => {
      const level: 'level_1' | 'level_2' = name.startsWith('Niveau 1 -') ? 'level_1' : 'level_2';
      result.push({ name, level, axe: axeNum });
    });
  });
  return result;
}
