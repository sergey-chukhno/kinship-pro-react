import apiClient from './config';
import { SeriesTree } from '../types/badgeSeriesTree';

/** GET /api/v1/badge_series/by_key/:catalog_key/tree — public (F2 / Fatima Écran 3) */
export async function getBadgeSeriesTreeByKey(catalogKey: string): Promise<SeriesTree> {
  const response = await apiClient.get(
    `/api/v1/badge_series/by_key/${encodeURIComponent(catalogKey)}/tree`
  );
  return response.data as SeriesTree;
}

/** GET /api/v1/badge_series/:id/tree — public (F2) */
export async function getBadgeSeriesTreeById(id: number): Promise<SeriesTree> {
  const response = await apiClient.get(`/api/v1/badge_series/${id}/tree`);
  return response.data as SeriesTree;
}
