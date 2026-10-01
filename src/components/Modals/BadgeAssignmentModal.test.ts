import { getBadgeCompetencies } from './BadgeAssignmentModal';
import { BadgeAPI } from '../../types';
import { PSYCHOSOCIALES_SERIES } from '../../constants/badgeAxes';

const makeBadge = (overrides: Partial<BadgeAPI> = {}): BadgeAPI => ({
  id: 1,
  name: 'Communiquer de façon empathique (S1.2)',
  description: '',
  level: 'level_1',
  series: PSYCHOSOCIALES_SERIES,
  domains: [],
  expertises: [],
  ...overrides,
});

describe('getBadgeCompetencies', () => {
  it('includes domain-only ("savoir") items for the CPS series — regression test for the 30/09 bug where they were silently dropped', () => {
    const badge = makeBadge({
      domains: [{ id: 1, name: 'Connaître les caractéristiques de la communication empathique', category: 'domain' }],
      expertises: [
        { id: 2, name: 'Écouter de façon empathique', category: 'expertise' },
        { id: 3, name: 'Parler de façon empathique', category: 'expertise' },
      ],
    });
    const comps = getBadgeCompetencies(badge);
    expect(comps.map((c) => c.id).sort()).toEqual([1, 2, 3]);
    expect(comps.find((c) => c.id === 1)?.name).toBe('Connaître les caractéristiques de la communication empathique');
  });

  it('lists a "both" item (CPS S2.1 double-type) exactly once even though it is present in both domains and expertises', () => {
    const badge = makeBadge({
      domains: [{ id: 10, name: 'Savoir et savoir-faire item', category: 'both' }],
      expertises: [{ id: 10, name: 'Savoir et savoir-faire item', category: 'both' }],
    });
    const comps = getBadgeCompetencies(badge);
    expect(comps).toHaveLength(1);
    expect(comps[0].id).toBe(10);
  });

  it('does NOT merge domains for other series — e.g. Soft Skills "domaines d\'engagement" (Cognitives, Sociabilité...) are a different concept and must never appear as constat checklist items', () => {
    const badge = makeBadge({
      series: 'Compétences transversales (soft skills)',
      domains: [{ id: 20, name: 'Cognitives', category: 'domain' }],
      expertises: [{ id: 21, name: 'Une vraie compétence transversale', category: 'expertise' }],
    });
    const comps = getBadgeCompetencies(badge);
    expect(comps.map((c) => c.id)).toEqual([21]);
  });

  it('returns an empty list for a badge with no domains and no expertises (and no fallback)', () => {
    const badge = makeBadge({ name: 'Unknown Badge With No Fallback', domains: [], expertises: [] });
    expect(getBadgeCompetencies(badge)).toEqual([]);
  });

  it('returns [] for a null badge', () => {
    expect(getBadgeCompetencies(null)).toEqual([]);
  });
});
