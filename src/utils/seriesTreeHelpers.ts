import { SeriesTree, SeriesTreeAxe, SeriesTreeCompetence } from '../types/badgeSeriesTree';

/** Unique badge names under an axe (via competences → badges). */
export function badgeNamesForAxe(axe: SeriesTreeAxe): string[] {
  const names: string[] = [];
  for (const c of axe.competences || []) {
    for (const b of c.badges || []) {
      if (b.name && !names.includes(b.name)) names.push(b.name);
    }
  }
  return names;
}

export type TreeCompetenceCard = {
  key: string;
  axeTitle: string | null;
  competenceId: number;
  code: string | null;
  name: string;
  /** Unique badge names (CPS spécifiques) under this competence. */
  badgeNames: string[];
};

function competenceToCard(
  competence: SeriesTreeCompetence,
  axeTitle: string | null
): TreeCompetenceCard | null {
  const badgeNames: string[] = [];
  for (const b of competence.badges || []) {
    if (b.name && !badgeNames.includes(b.name)) badgeNames.push(b.name);
  }
  if (badgeNames.length === 0) return null;
  return {
    key: `comp:${competence.id}`,
    axeTitle,
    competenceId: competence.id,
    code: competence.code ?? null,
    name: competence.name,
    badgeNames,
  };
}

/**
 * P2.13 reprise 1 — cards = parent compétences (C1…), pastilles = badges enfants.
 * Returns [] when the tree has no competence étage (flat badge list).
 */
export function treeCompetencesAsCards(tree: SeriesTree | null | undefined): TreeCompetenceCard[] {
  if (!tree) return [];
  const cards: TreeCompetenceCard[] = [];
  for (const axe of tree.axes || []) {
    for (const c of axe.competences || []) {
      const card = competenceToCard(c, axe.name);
      if (card) cards.push(card);
    }
  }
  for (const c of tree.competences || []) {
    const card = competenceToCard(c, null);
    if (card) cards.push(card);
  }
  return cards;
}

export function treeHasCompetenceCards(tree: SeriesTree | null | undefined): boolean {
  return treeCompetencesAsCards(tree).length > 0;
}

/** Unique badge names for a whole tree (axes + root competences + root badges). */
export function badgeNamesForTree(tree: SeriesTree): string[] {
  const names: string[] = [];
  const push = (name: string) => {
    if (name && !names.includes(name)) names.push(name);
  };
  for (const axe of tree.axes || []) {
    badgeNamesForAxe(axe).forEach(push);
  }
  for (const c of tree.competences || []) {
    for (const b of c.badges || []) push(b.name);
  }
  for (const b of tree.badges || []) push(b.name);
  return names;
}

export function treeHasAxes(tree: SeriesTree | null | undefined): boolean {
  return Boolean(tree && Array.isArray(tree.axes) && tree.axes.length > 0);
}

/** Fallback BadgeAxe-shaped list from tree (title = axe.name). */
export function axesAsOptions(tree: SeriesTree): { id: string; title: string; badgeNames: string[] }[] {
  return (tree.axes || []).map((axe) => ({
    id: String(axe.id),
    title: axe.name,
    badgeNames: badgeNamesForAxe(axe),
  }));
}
