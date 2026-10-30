import { SeriesTree } from '../types/badgeSeriesTree';
import {
  axesAsOptions,
  badgeNamesForAxe,
  badgeNamesForTree,
  treeCompetencesAsCards,
  treeHasAxes,
  treeHasCompetenceCards,
} from './seriesTreeHelpers';

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
            code: 'C1',
            name: 'Renforcer sa conscience de soi',
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
            code: 'E1',
            name: 'Renforcer sa conscience des émotions',
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

  it('builds parent competence cards for P2.13 reprise 1', () => {
    expect(treeHasCompetenceCards(tree)).toBe(true);
    const cards = treeCompetencesAsCards(tree);
    expect(cards).toHaveLength(2);
    expect(cards[0]).toMatchObject({
      code: 'C1',
      name: 'Renforcer sa conscience de soi',
      axeTitle: 'Compétences cognitives',
      badgeNames: ['C1 badge'],
    });
  });
});
