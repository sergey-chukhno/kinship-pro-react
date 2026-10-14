const mockGet = jest.fn();
const mockPost = jest.fn();

jest.mock('./config', () => ({
  __esModule: true,
  default: {
    get: (...args: unknown[]) => mockGet(...args),
    post: (...args: unknown[]) => mockPost(...args),
    patch: jest.fn(),
  },
  axiosClientWithoutToken: {},
}));

import {
  getCatalogue,
  getCatalogueFlags,
  previewCatalogueUpload,
} from './FormationCatalogue';
import { CatalogueOrgRef } from './formationCatalogOrg';

const org: CatalogueOrgRef = {
  type: 'Company',
  id: 7,
  name: 'Test Co',
  initials: 'TC',
  key: 'company-7',
};

describe('FormationCatalogue API facade', () => {
  beforeEach(() => {
    mockGet.mockReset();
    mockPost.mockReset();
  });

  it('getCatalogueFlags reads meta from index', async () => {
    mockGet.mockResolvedValue({
      data: {
        data: [],
        meta: {
          eu_mc_gate: { allowed: true, reason: null },
          certification_links_enabled: false,
        },
      },
    });

    const flags = await getCatalogueFlags(org);
    expect(flags.eu_mc_gate.allowed).toBe(true);
    expect(flags.certification_links_enabled).toBe(false);
    expect(mockGet).toHaveBeenCalledWith(
      '/api/v1/formation_catalog_entries',
      expect.objectContaining({
        params: expect.objectContaining({
          organization_type: 'Company',
          organization_id: 7,
        }),
      })
    );
  });

  it('getCatalogue maps listed rows', async () => {
    mockGet.mockResolvedValue({
      data: {
        data: [
          {
            id: 'a',
            status: 'listed',
            title: 'T',
            is_eu_mc_declared: false,
            participation_mode: 'online',
            financement_type: 'opco',
          },
        ],
        meta: {},
      },
    });

    const list = await getCatalogue(org);
    expect(list).toHaveLength(1);
    expect(list[0].status).toBe('catalog');
    expect(list[0].modality).toBe('distanciel');
  });

  it('previewCatalogueUpload posts FormData and maps analysis', async () => {
    mockPost.mockResolvedValue({
      data: {
        import_id: 'imp-1',
        analysis: {
          recognized_headers: ['Titre'],
          unknown_headers: [],
          counts: { read: 1, listed: 1, draft: 0, skipped: 0 },
          lines: [
            {
              line_number: 2,
              outcome: 'listed',
              attributes: {
                title: 'Import Excel Complet',
                workload_hours: 21,
                participation_mode: 'on_site',
                financement_type: 'cpf',
              },
              issues: [],
            },
          ],
        },
      },
    });

    const file = new File(['x'], 'fe62.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const preview = await previewCatalogueUpload(file, org);
    expect(preview.importId).toBe('imp-1');
    expect(preview.counts.catalog).toBe(1);
    expect(preview.rows[0].title).toBe('Import Excel Complet');
    expect(mockPost).toHaveBeenCalled();
  });
});
