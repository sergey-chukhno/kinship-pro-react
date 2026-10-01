/**
 * Compétences psychosociales (Santé publique France) — FE constants & helpers.
 * Icons: public/badges_competences_psychosociales/CPS_{C1|C2|E1|E2|S1|S2}.png
 * Intentionally NOT in SERIES_WITH_COMPETENCE_PROGRESS (Orienter-style bar).
 */

export const COMPETENCES_PSYCHOSOCIALES_SERIES = "Compétences psychosociales";

export type CpsCompetenceKey = "C1" | "C2" | "E1" | "E2" | "S1" | "S2";

/** Axis pastille colors (planche Patrick 29/09) */
export const CPS_AXE_COLORS: Record<"cognitives" | "emotionnelles" | "sociales", string> = {
  cognitives: "#164FA0",
  emotionnelles: "#C4404C",
  sociales: "#5B21B6",
};

export const CPS_COMPETENCE_AXE: Record<CpsCompetenceKey, keyof typeof CPS_AXE_COLORS> = {
  C1: "cognitives",
  C2: "cognitives",
  E1: "emotionnelles",
  E2: "emotionnelles",
  S1: "sociales",
  S2: "sociales",
};

const CPS_ICON_BY_KEY: Record<CpsCompetenceKey, string> = {
  C1: "/badges_competences_psychosociales/CPS_C1.png",
  C2: "/badges_competences_psychosociales/CPS_C2.png",
  E1: "/badges_competences_psychosociales/CPS_E1.png",
  E2: "/badges_competences_psychosociales/CPS_E2.png",
  S1: "/badges_competences_psychosociales/CPS_S1.png",
  S2: "/badges_competences_psychosociales/CPS_S2.png",
};

export function isCompetencesPsychosocialesSeries(series?: string | null): boolean {
  return series === COMPETENCES_PSYCHOSOCIALES_SERIES;
}

/** Parse SPF code from badge name, e.g. "(C1.5)", "(E.2.2.a)", "(S1.2)" → C1 / E2 / S1 */
export function getCpsCompetenceKeyFromBadgeName(badgeName?: string): CpsCompetenceKey | undefined {
  if (!badgeName) return undefined;
  const m = badgeName.match(/\(([CES])\.?(\d+)/i);
  if (!m) return undefined;
  const key = `${m[1].toUpperCase()}${m[2]}` as CpsCompetenceKey;
  return CPS_ICON_BY_KEY[key] ? key : undefined;
}

export function getCpsLocalBadgeImage(badgeName?: string): string | undefined {
  const key = getCpsCompetenceKeyFromBadgeName(badgeName);
  return key ? CPS_ICON_BY_KEY[key] : undefined;
}

export function getCpsAxeColor(badgeName?: string): string | undefined {
  const key = getCpsCompetenceKeyFromBadgeName(badgeName);
  if (!key) return undefined;
  return CPS_AXE_COLORS[CPS_COMPETENCE_AXE[key]];
}
