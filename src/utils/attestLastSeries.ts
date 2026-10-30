/** Last series used for Attester (P2.13) — FE-only until BE ticket (Sergey 2026-10-28). */

export function attestLastSeriesKey(userId: string | number, projectId: string | number): string {
  return `attest:lastSeries:${userId}:${projectId}`;
}

export type AttestLastSeriesPayload = {
  /** Series key as used in FE grouping (often display/API series name). */
  series: string;
  catalog_key?: string | null;
  badge_series_id?: number | null;
};

export function readAttestLastSeries(
  userId: string | number | null | undefined,
  projectId: string | number | null | undefined
): AttestLastSeriesPayload | null {
  if (userId == null || projectId == null || typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(attestLastSeriesKey(userId, projectId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AttestLastSeriesPayload;
    if (!parsed?.series || typeof parsed.series !== 'string') return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeAttestLastSeries(
  userId: string | number | null | undefined,
  projectId: string | number | null | undefined,
  payload: AttestLastSeriesPayload
): void {
  if (userId == null || projectId == null || !payload.series || typeof localStorage === 'undefined') {
    return;
  }
  try {
    localStorage.setItem(attestLastSeriesKey(userId, projectId), JSON.stringify(payload));
  } catch {
    // quota / private mode — ignore
  }
}
