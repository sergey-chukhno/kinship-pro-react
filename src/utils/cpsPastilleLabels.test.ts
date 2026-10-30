import {
  cpsPastilleLabelFromBadgeName,
  extractSpfCodesFromBadgeName,
  formatBadgeHeadingWithCode,
  phaseNumberFromCpsCompetenceCode,
  sortBadgeNamesBySpfCode,
  stripSpfCodesFromBadgeName,
} from './cpsPastilleLabels';

describe('cpsPastilleLabels', () => {
  it('extracts SPF codes from badge names', () => {
    expect(extractSpfCodesFromBadgeName("S'auto-évaluer positivement (C1.5)")).toEqual(['C1.5']);
    expect(
      extractSpfCodesFromBadgeName(
        'Renforcer sa connaissance de soi (C1.1) et penser de façon critique (C1.2)'
      )
    ).toEqual(['C1.1', 'C1.2']);
    expect(
      extractSpfCodesFromBadgeName(
        'Réguler ses émotions agréables (E.2.2.a) et désagréables (E2.2.b)'
      )
    ).toEqual(['E2.2.a', 'E2.2.b']);
  });

  it('pastille label is the fiche title verbatim (Patrick GO)', () => {
    expect(cpsPastilleLabelFromBadgeName("S'auto-évaluer positivement (C1.5)")).toBe(
      "S'auto-évaluer positivement (C1.5)"
    );
    expect(
      cpsPastilleLabelFromBadgeName(
        'Connaître ses valeurs, ses besoins psychologiques et ses buts personnels (C1.3) et Prendre des décisions constructives (C1.4)'
      )
    ).toBe(
      'Connaître ses valeurs, ses besoins psychologiques et ses buts personnels (C1.3) et Prendre des décisions constructives (C1.4)'
    );
  });

  it('sorts badge names by SPF code order', () => {
    expect(
      sortBadgeNamesBySpfCode([
        "S'auto-évaluer positivement (C1.5)",
        'Renforcer sa pleine attention – à soi (C1.6)',
        'Renforcer sa connaissance de soi (C1.1) et penser de façon critique (C1.2)',
        'Connaître ses valeurs, ses besoins psychologiques et ses buts personnels (C1.3) et Prendre des décisions constructives (C1.4)',
      ])
    ).toEqual([
      'Renforcer sa connaissance de soi (C1.1) et penser de façon critique (C1.2)',
      'Connaître ses valeurs, ses besoins psychologiques et ses buts personnels (C1.3) et Prendre des décisions constructives (C1.4)',
      "S'auto-évaluer positivement (C1.5)",
      'Renforcer sa pleine attention – à soi (C1.6)',
    ]);
    expect(
      sortBadgeNamesBySpfCode([
        'Résoudre les conflits de façon constructive (S2.2)',
        "S'affirmer (et résister à la pression sociale) par l'assertivité et le refus (S2.1)",
      ])
    ).toEqual([
      "S'affirmer (et résister à la pression sociale) par l'assertivité et le refus (S2.1)",
      'Résoudre les conflits de façon constructive (S2.2)',
    ]);
  });

  it('formats heading with code first (Patrick écran 3)', () => {
    expect(formatBadgeHeadingWithCode('Renforcer sa pleine attention – à soi (C1.6)')).toBe(
      'C1.6 · Renforcer sa pleine attention – à soi'
    );
    expect(stripSpfCodesFromBadgeName('Communiquer de façon empathique (S1.2)')).toBe(
      'Communiquer de façon empathique'
    );
  });

  it('maps competence code to phase number', () => {
    expect(phaseNumberFromCpsCompetenceCode('C1')).toBe('1');
    expect(phaseNumberFromCpsCompetenceCode('E2')).toBe('2');
    expect(phaseNumberFromCpsCompetenceCode(null)).toBeNull();
  });
});
