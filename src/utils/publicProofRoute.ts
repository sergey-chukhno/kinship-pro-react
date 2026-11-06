/** Public proof page path from share_token (+ optional proof_type). Never use numeric user_badge id. */
export function getPublicProofPath(
  shareToken?: string | null,
  proofType?: string | null
): string | null {
  const token = String(shareToken || '').trim();
  if (!token) return null;
  return proofType === 'PE' ? `/pe/${token}` : `/pb/${token}`;
}
