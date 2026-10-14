import {
  __setMockCatalogueFlags,
  CATALOGUE_CSV_TEMPLATE,
  commitCatalogueImport,
  parseCatalogueCsv,
  previewCatalogueUpload,
} from './FormationCatalogue';
import { replaceAllFiches } from '../utils/formationCatalogueStore';

describe('parseCatalogueCsv', () => {
  beforeEach(() => {
    __setMockCatalogueFlags({
      eu_mc_gate: { allowed: true },
      certification_links_enabled: false,
    });
  });

  it('parses the template: catalog + draft rows', () => {
    const preview = parseCatalogueCsv(CATALOGUE_CSV_TEMPLATE, 'modele.csv');
    expect(preview.counts.read).toBe(2);
    expect(preview.counts.catalog).toBe(2);
    expect(preview.counts.rejected).toBe(0);
    expect(preview.rncpColumnIgnored).toBe(false);
  });

  it('marks incomplete rows as draft and duplicates as rejected', () => {
    const csv = `Titre;Description;Programme;Durée en heures;Modalité;Financement
Complete;Desc;Prog;10;Présentiel;CPF
Incomplete;;;;Présentiel;
Complete;Desc;Prog;10;Présentiel;CPF
`;
    const preview = parseCatalogueCsv(csv, 't.csv');
    expect(preview.rows[0].state).toBe('catalog');
    expect(preview.rows[1].state).toBe('draft');
    expect(preview.rows[1].title).toBe('Incomplete');
    expect(preview.rows[2].state).toBe('rejected');
    expect(preview.rows[2].detail).toMatch(/même titre/);
  });

  it('ignores RNCP column when certification_links_enabled is false', () => {
    const csv = `Titre;Description;Programme;Durée en heures;Modalité;Financement;Code RNCP/RS
A;d;p;1;Présentiel;CPF;RNCP1
`;
    const preview = parseCatalogueCsv(csv, 'rncp.csv');
    expect(preview.rncpColumnIgnored).toBe(true);
  });

  it('throws when Titre column is missing', () => {
    expect(() => parseCatalogueCsv('Foo;Bar\n1;2', 'bad.csv')).toThrow(/Titre/);
  });
});

describe('previewCatalogueUpload', () => {
  it('parses CSV via File without conversion', async () => {
    const file = new File([CATALOGUE_CSV_TEMPLATE], 'modele.csv', { type: 'text/csv' });
    const preview = await previewCatalogueUpload(file);
    expect(preview.counts.catalog).toBe(2);
  });

  it('accepts .xlsx as opaque upload (mock server preview)', async () => {
    const file = new File([new Uint8Array([0x50, 0x4b])], 'fe62-test6-catalogue.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const preview = await previewCatalogueUpload(file);
    expect(preview.fileName).toMatch(/\.xlsx$/);
    expect(preview.counts.read).toBe(2);
    expect(preview.counts.catalog).toBe(1);
    expect(preview.counts.draft).toBe(1);
  });
});

describe('commitCatalogueImport', () => {
  beforeEach(() => {
    replaceAllFiches([]);
  });

  it('creates catalog and draft fiches, skips rejected', async () => {
    const preview = parseCatalogueCsv(
      `Titre;Description;Programme;Durée en heures;Modalité;Financement
Ok;d;p;8;Présentiel;OPCO
Draft;;;
Dup;d;p;8;Présentiel;OPCO
Dup;d;p;8;Présentiel;OPCO
`,
      'x.csv'
    );
    const created = await commitCatalogueImport(preview, {
      key: 'of-test',
      name: 'OF Test',
      initials: 'OT',
    });
    // Ok + Draft + first Dup ; second Dup rejected
    expect(created).toHaveLength(3);
    expect(created.filter((f) => f.status === 'catalog')).toHaveLength(2);
    expect(created.filter((f) => f.status === 'draft')).toHaveLength(1);
    expect(preview.counts.rejected).toBe(1);
  });
});
