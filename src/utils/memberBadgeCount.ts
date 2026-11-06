/** Resolve MemberCard preuve count: prefer badges_count, never use latestBadges as total when a real count exists. */
export function resolveMemberBadgeCount(member: {
  badgesCount?: number | null;
  badges_count?: number | null;
  badges?: unknown;
  latestBadges?: unknown[] | null;
}): number {
  const fromTop =
    member.badgesCount ??
    member.badges_count ??
    null;
  if (typeof fromTop === 'number' && Number.isFinite(fromTop) && fromTop >= 0) {
    return fromTop;
  }

  const badges = member.badges;
  if (badges && typeof badges === 'object' && !Array.isArray(badges)) {
    const metaCount = (badges as { meta?: { total_count?: number } }).meta?.total_count;
    if (typeof metaCount === 'number' && Number.isFinite(metaCount) && metaCount >= 0) {
      return metaCount;
    }
    const dataLen = (badges as { data?: unknown[] }).data?.length;
    if (typeof dataLen === 'number' && dataLen >= 0) {
      return dataLen;
    }
  }

  if (Array.isArray(badges)) {
    return badges.length;
  }

  return Array.isArray(member.latestBadges) ? member.latestBadges.length : 0;
}

/** Label for MemberCard indicator: 0/1 → « preuve », N>1 → « preuves ». */
export function formatPreuvesCountLabel(count: number): string {
  const n = Number.isFinite(count) && count >= 0 ? Math.floor(count) : 0;
  return `${n} ${n <= 1 ? 'preuve' : 'preuves'}`;
}
