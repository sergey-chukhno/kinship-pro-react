import { SeriesTree, SeriesTreeAxe } from '../types/badgeSeriesTree';

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
