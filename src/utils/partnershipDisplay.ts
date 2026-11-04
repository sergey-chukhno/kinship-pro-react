/**
 * Display / search label for a confirmed partnership: the *other* organization's name.
 * Never prefer the synthetic `partnerships.name` (legacy "… Partnership" FE writes).
 */

export type PartnershipLike = {
  id?: number | string;
  name?: string | null;
  partnership_kind?: string | null;
  partners?: Array<{ id?: number | string; name?: string | null }>;
  confirmed_at?: string | null;
  updated_at?: string | null;
};

function normalizeOrgName(name?: string | null): string {
  return (name || '').trim().toLowerCase();
}

/** Strip legacy FE suffix if still present on stored name. */
export function stripPartnershipSuffix(name?: string | null): string {
  const n = (name || '').trim();
  if (n.endsWith(' Partnership')) return n.slice(0, -' Partnership'.length).trim();
  return n;
}

/**
 * Name of the counterparty org for the current structure.
 * Falls back to first partner, then cleaned partnership.name.
 */
export function partnershipOtherOrgName(
  p: PartnershipLike,
  currentOrgName?: string | null,
  currentOrgId?: number | string | null
): string {
  const partners = Array.isArray(p.partners) ? p.partners : [];
  const currentName = normalizeOrgName(currentOrgName);
  const currentId = currentOrgId != null && currentOrgId !== '' ? String(currentOrgId) : null;

  const other =
    partners.find((x) => {
      if (currentId && x.id != null && String(x.id) === currentId) return false;
      if (currentName && normalizeOrgName(x.name) === currentName) return false;
      return Boolean((x.name || '').trim());
    }) || partners.find((x) => Boolean((x.name || '').trim()));

  if (other?.name?.trim()) return other.name.trim();

  const cleaned = stripPartnershipSuffix(p.name);
  return cleaned || 'Partenaire';
}

export function partnershipMatchesQuery(
  p: PartnershipLike,
  query: string,
  currentOrgName?: string | null,
  currentOrgId?: number | string | null
): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const label = partnershipOtherOrgName(p, currentOrgName, currentOrgId).toLowerCase();
  if (label.includes(q)) return true;
  return (p.partners || []).some((x) => (x.name || '').toLowerCase().includes(q));
}

export function rankPartnershipsByRecency<T extends PartnershipLike>(list: T[]): T[] {
  return list.slice().sort((a, b) =>
    String(b.confirmed_at || b.updated_at || '').localeCompare(String(a.confirmed_at || a.updated_at || ''))
  );
}
