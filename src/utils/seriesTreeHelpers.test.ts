import { SeriesTree } from '../types/badgeSeriesTree';
import {
  axesAsOptions,
  badgeNamesForAxe,
  badgeNamesForTree,
  treeHasAxes,
} from './seriesTreeHelpers';
import { resolveCatalogKeyForSeries, CATALOG_KEY_CPS, CATALOG_KEY_SOFT_SKILLS } from './seriesCatalogKey';

describe('seriesCatalogKey', () => {
  it('resolves Soft Skills and CPS display names to catalog_key', () => {
    expect(resolveCatalogKeyForSeries('Compétences transversales (soft skills)')).toBe(
      CATALOG_KEY_SOFT_SKILLS
    );
    expect(resolveCatalogKeyForSeries('Série TouKouLeur')).toBe(CATALOG_KEY_SOFT_SKILLS);
    expect(resolveCatalogKeyForSeries('Compétences psychosociales')).toBe(CATALOG_KEY_CPS);
  });
});

describe('seriesTreeHelpers (F2 Écran 3)', () => {
  const tree: SeriesTree = {
    id: 1,
    name: 'Compétences psychosociales',
    catalog_key: 'competences_psychosociales',
    leaf_label: 'CPS spécifique',
    axes: [
      {
        id: 10,
        name: 'Compétences cognitives',
        competences: [
          {
            id: 100,
            name: 'C1',
            badges: [
              { id: 1, name: 'C1 badge', level: 'level_1' },
              { id: 2, name: 'C1 badge', level: 'level_2' },
            ],
          },
        ],
      },
      {
        id: 11,
        name: 'Compétences émotionnelles',
        competences: [
          {
            id: 101,
            name: 'E1',
            badges: [{ id: 3, name: 'E1 badge', level: 'level_1' }],
          },
        ],
      },
    ],
    competences: [],
    badges: [],
  };

  it('detects axes and lists unique badge names per axe', () => {
    expect(treeHasAxes(tree)).toBe(true);
    expect(badgeNamesForAxe(tree.axes[0])).toEqual(['C1 badge']);
    expect(axesAsOptions(tree)).toHaveLength(2);
    expect(axesAsOptions(tree)[0].title).toBe('Compétences cognitives');
    expect(badgeNamesForTree(tree)).toEqual(['C1 badge', 'E1 badge']);
  });

  it('treats empty axes as no axe étage', () => {
    expect(treeHasAxes({ ...tree, axes: [] })).toBe(false);
  });
});
