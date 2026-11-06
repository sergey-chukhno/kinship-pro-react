/**
 * Soft Skills pastilles on AttestCompetenceModal (Patrick 06/11):
 * parent cards show Découverte / Appropriation (levels 1–2 only), never CPS-style name chips.
 */

export type AttestLevelBadge = {
  name: string;
  level: string;
  catalog_key?: string | null;
  series?: string | null;
};

/** Unique level numbers from badges (strip `level_`), sorted, default `['1']`. */
export function uniqueLevelNumbers(badges: AttestLevelBadge[]): string[] {
  const levels = badges
    .map((b) => b.level.replace(/^level_/, ''))
    .filter((v, i, a) => a.indexOf(v) === i)
    .sort();
  return levels.length ? levels : ['1'];
}

/**
 * Levels shown as Soft Skills pastilles for a parent competence card.
 * Only L1/L2; if none present in data, default to both Découverte + Appropriation.
 */
export function softSkillsPastilleLevels(
  seriesBadges: AttestLevelBadge[],
  badgeNames: string[]
): string[] {
  const scoped = seriesBadges.filter((b) => badgeNames.includes(b.name));
  // Do not use uniqueLevelNumbers here: empty scoped must yield ['1','2'], not ['1'].
  const lv = scoped
    .map((b) => b.level.replace(/^level_/, ''))
    .filter((v, i, a) => a.indexOf(v) === i)
    .filter((v) => v === '1' || v === '2')
    .sort();
  return lv.length ? lv : ['1', '2'];
}

/**
 * Filter available levels for attest selection (CPS + Soft Skills → Phase/Découverte|Appropriation only).
 */
export function filterAttestSelectableLevels(
  levels: string[],
  opts: { restrictToPhaseOrSoftLevels: boolean }
): string[] {
  if (!opts.restrictToPhaseOrSoftLevels) return levels;
  const filtered = levels.filter((lv) => lv === '1' || lv === '2');
  return filtered.length ? filtered : ['1'];
}
