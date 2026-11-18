/** Formats an ISO timestamp as a short French date (e.g. "25 janv. 2031"). */
export function formatProofDateFr(timestamp?: string | null): string {
  if (!timestamp) return '—';
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
}

/**
 * Prefers retention_expiry_at; never returns raw policy codes (e.g. 5_YEARS).
 * No fallback to awardedDate — empty expiry → "—" (or lifetime label).
 */
export function formatRetentionExpiry(
  expiryAt?: string | null,
  policy?: string | null
): string {
  if (expiryAt) {
    const formatted = formatProofDateFr(expiryAt);
    if (formatted !== '—') return formatted;
  }
  if (policy === 'lifetime') return 'Conservation à vie';
  return '—';
}
