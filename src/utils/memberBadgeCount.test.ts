import { formatPreuvesCountLabel, resolveMemberBadgeCount } from './memberBadgeCount';

describe('resolveMemberBadgeCount', () => {
  it('prefers badgesCount over badges.meta and latestBadges', () => {
    expect(
      resolveMemberBadgeCount({
        badgesCount: 7,
        badges: { meta: { total_count: 3 }, data: [{}, {}, {}] },
        latestBadges: [{}, {}],
      })
    ).toBe(7);
  });

  it('accepts badges_count from API snake_case', () => {
    expect(resolveMemberBadgeCount({ badges_count: 4, latestBadges: [{}, {}, {}] })).toBe(4);
  });

  it('uses badges.meta.total_count when top-level count missing', () => {
    expect(
      resolveMemberBadgeCount({
        badges: { meta: { total_count: 5 }, data: [{}, {}] },
        latestBadges: [{}],
      })
    ).toBe(5);
  });

  it('uses array badges length', () => {
    expect(resolveMemberBadgeCount({ badges: ['a', 'b'] })).toBe(2);
  });

  it('falls back to latestBadges length only as last resort', () => {
    expect(resolveMemberBadgeCount({ latestBadges: [{}, {}, {}] })).toBe(3);
  });

  it('returns 0 when nothing present', () => {
    expect(resolveMemberBadgeCount({})).toBe(0);
  });
});

describe('formatPreuvesCountLabel', () => {
  it('uses singular for 0 and 1', () => {
    expect(formatPreuvesCountLabel(0)).toBe('0 preuve');
    expect(formatPreuvesCountLabel(1)).toBe('1 preuve');
  });

  it('uses plural for N > 1', () => {
    expect(formatPreuvesCountLabel(2)).toBe('2 preuves');
    expect(formatPreuvesCountLabel(12)).toBe('12 preuves');
  });
});
