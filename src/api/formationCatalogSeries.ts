import { getBadgeSeriesTreeByKey } from './BadgeSeries';
import {
  CATALOG_KEY_API_SERIES_NAME,
  CATALOG_KEY_AUDIOVISUELLE,
  CATALOG_KEY_CPS,
  CATALOG_KEY_MER,
  CATALOG_KEY_ORIENTER,
  CATALOG_KEY_SOFT_SKILLS,
} from '../constants/catalogSeries';
import { ProgrammeSeriesRef } from '../types/formationCatalogue';
import { SeriesTree } from '../types/badgeSeriesTree';

/** Séries proposées pour le programme fiche (F2 tree). */
export const PROGRAMME_SERIES_KEYS = [
  CATALOG_KEY_SOFT_SKILLS,
  CATALOG_KEY_CPS,
  CATALOG_KEY_ORIENTER,
  CATALOG_KEY_MER,
  CATALOG_KEY_AUDIOVISUELLE,
] as const;

export interface ProgrammeSeriesOption {
  catalogKey: string;
  label: string;
  seriesId: number;
  programme: ProgrammeSeriesRef;
}

function treeToProgramme(tree: SeriesTree): ProgrammeSeriesRef {
  const badges: { id: number; name: string }[] = [];
  const pushBadge = (b: { id: number; name: string }) => {
    if (!badges.some((x) => x.id === b.id)) badges.push(b);
  };
  (tree.badges || []).forEach(pushBadge);
  (tree.competences || []).forEach((c) => (c.badges || []).forEach(pushBadge));
  (tree.axes || []).forEach((a) =>
    (a.competences || []).forEach((c) => (c.badges || []).forEach(pushBadge))
  );

  return {
    id: String(tree.id),
    label: tree.name || CATALOG_KEY_API_SERIES_NAME[tree.catalog_key || ''] || `Série #${tree.id}`,
    competenceIds: badges.map((b) => String(b.id)),
    competenceLabels: badges.map((b) => b.name),
  };
}

export async function loadProgrammeSeriesOptions(): Promise<ProgrammeSeriesOption[]> {
  const results = await Promise.all(
    PROGRAMME_SERIES_KEYS.map(async (key) => {
      try {
        const tree = await getBadgeSeriesTreeByKey(key);
        if (!tree?.id) return null;
        return {
          catalogKey: key,
          label: tree.name || CATALOG_KEY_API_SERIES_NAME[key] || key,
          seriesId: tree.id,
          programme: treeToProgramme(tree),
        } as ProgrammeSeriesOption;
      } catch {
        return null;
      }
    })
  );
  return results.filter((r): r is ProgrammeSeriesOption => r != null);
}
