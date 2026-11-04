import {
  partnershipOtherOrgName,
  partnershipMatchesQuery,
  stripPartnershipSuffix,
  rankPartnershipsByRecency,
} from './partnershipDisplay';

describe('partnershipDisplay', () => {
  const ligue = {
    id: 1,
    name: 'TouKouLeur Partnership',
    confirmed_at: '2026-11-03T10:00:00Z',
    partners: [
      { id: 10, name: 'Association TouKouLeur' },
      { id: 20, name: "Ligue de l'enseignement 13" },
    ],
  };

  it('strips Partnership suffix', () => {
    expect(stripPartnershipSuffix('Ligue Sud de voile Partnership')).toBe('Ligue Sud de voile');
  });

  it('prefers other org name over synthetic partnership.name', () => {
    expect(partnershipOtherOrgName(ligue, 'Association TouKouLeur', 10)).toBe(
      "Ligue de l'enseignement 13"
    );
  });

  it('matches search on other org name even when name has no ligue', () => {
    expect(partnershipMatchesQuery(ligue, 'ligue', 'Association TouKouLeur', 10)).toBe(true);
  });

  it('ranks by confirmed_at desc', () => {
    const a = { ...ligue, id: 1, confirmed_at: '2026-11-01T00:00:00Z' };
    const b = { ...ligue, id: 2, confirmed_at: '2026-11-03T00:00:00Z' };
    expect(rankPartnershipsByRecency([a, b]).map((x) => x.id)).toEqual([2, 1]);
  });
});
