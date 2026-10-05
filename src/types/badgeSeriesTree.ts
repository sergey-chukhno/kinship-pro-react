/** F2 — GET /api/v1/badge_series/:id/tree | by_key/:catalog_key/tree */

export interface SeriesTreeBadge {
  id: number;
  name: string;
  level: string;
  level_label?: string | null;
}

export interface SeriesTreeCompetence {
  id: number;
  name: string;
  code?: string | null;
  position?: number;
  badges: SeriesTreeBadge[];
}

export interface SeriesTreeAxe {
  id: number;
  name: string;
  position?: number;
  competences: SeriesTreeCompetence[];
}

export interface SeriesTree {
  id: number;
  name: string;
  catalog_key?: string | null;
  level_label?: string | null;
  leaf_label: string;
  axes: SeriesTreeAxe[];
  competences: SeriesTreeCompetence[];
  badges: SeriesTreeBadge[];
}
