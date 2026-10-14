const mockGet = jest.fn();
const mockPost = jest.fn();
const mockPatch = jest.fn();
const mockDelete = jest.fn();

jest.mock('./config', () => ({
  __esModule: true,
  default: {
    get: (...args: unknown[]) => mockGet(...args),
    post: (...args: unknown[]) => mockPost(...args),
    patch: (...args: unknown[]) => mockPatch(...args),
    delete: (...args: unknown[]) => mockDelete(...args),
  },
  axiosClientWithoutToken: {},
}));

import {
  applyCertificationCode,
  deleteCatalogueFiche,
  getCatalogue,
  getCatalogueFlags,
  listCatalogueFiche,
  previewCatalogueUpload,
  saveCatalogueFiche,
  withdrawCatalogueFiche,
} from './FormationCatalogue';
import { CatalogueOrgRef } from './formationCatalogOrg';
import { FormationFiche } from '../types/formationCatalogue';

const org: CatalogueOrgRef = {
  type: 'Company',
  id: 7,
  name: 'Test Co',
  initials: 'TC',
  key: 'company-7',
};

const draftFiche: FormationFiche = {
  id: 'uuid-1',
  status: 'draft',
  orgKey: org.key,
  orgName: org.name,
  orgInitials: org.initials,
  orgCertified: true,
  euMc: false,
  title: 'T',
  description: 'D',
  programmeMode: 'free_lines',
  programmeLines: [{ id: '1', text: 'P' }],
  durationHours: '10',
  modality: 'presentiel',
  financement: 'CPF',
  prerequisites: '',
  languages: ['Français'],
  practicalInfo: '',
  assessmentType: '',
  jury: false,
  createdAt: '',
  updatedAt: '',
};

describe('FormationCatalogue API facade', () => {
  beforeEach(() => {
    mockGet.mockReset();
    mockPost.mockReset();
    mockPatch.mockReset();
    mockDelete.mockReset();
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
    expect(mockGet).toHaveBeenCalledWith(
      '/api/v1/formation_catalog_entries',
      expect.objectContaining({
        params: expect.objectContaining({ organization_type: 'Company', organization_id: 7 }),
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
    expect(list[0].status).toBe('catalog');
    expect(list[0].modality).toBe('distanciel');
  });

  it('saveCatalogueFiche patches updatable fields', async () => {
    mockPatch.mockResolvedValue({
      data: { data: { id: 'uuid-1', status: 'draft', title: 'T', participation_mode: 'on_site' } },
    });
    const saved = await saveCatalogueFiche(draftFiche, org);
    expect(saved.id).toBe('uuid-1');
    expect(mockPatch).toHaveBeenCalled();
  });

  it('listCatalogueFiche posts list', async () => {
    mockPost.mockResolvedValue({
      data: { data: { id: 'uuid-1', status: 'listed', title: 'T' } },
    });
    const listed = await listCatalogueFiche('uuid-1', org);
    expect(listed.status).toBe('catalog');
    expect(mockPost).toHaveBeenCalledWith('/api/v1/formation_catalog_entries/uuid-1/list');
  });

  it('withdrawCatalogueFiche posts withdraw', async () => {
    mockPost.mockResolvedValue({
      data: { data: { id: 'uuid-1', status: 'withdrawn', title: 'T' } },
    });
    const w = await withdrawCatalogueFiche('uuid-1');
    expect(w.status).toBe('withdrawn');
  });

  it('deleteCatalogueFiche deletes draft', async () => {
    mockDelete.mockResolvedValue({});
    await deleteCatalogueFiche('uuid-1');
    expect(mockDelete).toHaveBeenCalledWith('/api/v1/formation_catalog_entries/uuid-1');
  });

  it('applyCertificationCode patches targeted_certification_code', async () => {
    mockPatch.mockResolvedValue({
      data: {
        data: {
          id: 'uuid-1',
          status: 'draft',
          targeted_certification_code: 'RNCP40281',
          targeted_certification_snapshot: { label: 'Journaliste', eqf_level: '6', blocks: [] },
        },
      },
    });
    const f = await applyCertificationCode('uuid-1', 'RNCP40281', org);
    expect(f.certificationCode).toBe('RNCP40281');
    expect(f.certificationRegistry?.label).toBe('Journaliste');
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
    const file = new File(['x'], 'fe62.xlsx');
    const preview = await previewCatalogueUpload(file, org);
    expect(preview.importId).toBe('imp-1');
    expect(preview.counts.catalog).toBe(1);
  });
});
