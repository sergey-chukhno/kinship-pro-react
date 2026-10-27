const mockGet = jest.fn();
const mockPost = jest.fn();

jest.mock('./config', () => ({
  __esModule: true,
  default: {
    get: (...args: unknown[]) => mockGet(...args),
    post: (...args: unknown[]) => mockPost(...args),
  },
  axiosClientWithoutToken: {},
}));

import {
  analyzeSessionParticipantsImport,
  downloadSessionParticipantsImportTemplate,
  importSessionParticipants,
} from './FormationSessionParticipantsImport';
import type { CatalogueOrgRef } from './formationCatalogOrg';

const org: CatalogueOrgRef = {
  type: 'Company',
  id: 19,
  name: 'CFPJ',
  initials: 'CF',
  key: 'company-19',
};

describe('FormationSessionParticipantsImport API', () => {
  beforeEach(() => {
    mockGet.mockReset();
    mockPost.mockReset();
  });

  it('analyze maps preview, warnings, and hard rejects (under_15 is soft)', async () => {
    mockPost.mockResolvedValue({
      data: {
        detected_count: 20,
        importable_count: 18,
        preview_rows: [
          {
            line: 2,
            first_name: 'Alice',
            last_name: 'Dupont',
            birthday: '2015-03-14',
            email: 'alice@example.org',
          },
        ],
        warnings: [
          {
            line: 2,
            code: 'under_15',
            message: 'date de naissance : moins de 15 ans',
          },
        ],
        reject_preview: [
          { line: 5, reason_code: 'unreadable_date', message: 'Date illisible' },
          { line: 6, reason_code: 'under_15', message: 'Moins de 15 ans' },
        ],
        limits: { max_rows: 5000, max_bytes: 20971520 },
      },
    });

    const file = new File(['Nom;Prénom'], 'participants.csv', { type: 'text/csv' });
    const result = await analyzeSessionParticipantsImport(71, file, org);

    expect(result.detected_count).toBe(20);
    expect(result.importable_count).toBe(18);
    expect(result.preview_rows[0].first_name).toBe('Alice');
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0].code).toBe('under_15');
    expect(result.reject_preview).toHaveLength(1);
    expect(result.reject_preview[0].reason_code).toBe('unreadable_date');
    expect(result).not.toHaveProperty('created');
    expect(result).not.toHaveProperty('matched');

    expect(mockPost).toHaveBeenCalledWith(
      '/api/v1/projects/71/participants/import/analyze',
      expect.any(FormData),
      expect.objectContaining({
        headers: { 'Content-Type': 'multipart/form-data' },
      })
    );
    const form = mockPost.mock.calls[0][1] as FormData;
    expect(form.get('file')).toBeTruthy();
    expect(form.get('organization_id')).toBe('19');
    expect(form.get('organization_type')).toBe('Company');
  });

  it('import maps inscribed_count and rejected only', async () => {
    mockPost.mockResolvedValue({
      data: {
        inscribed_count: 18,
        rejected: [{ line: 5, reason_code: 'already_enrolled', message: 'Déjà inscrit' }],
      },
    });

    const file = new File(['x'], 'participants.csv', { type: 'text/csv' });
    const result = await importSessionParticipants(71, file, org);

    expect(result.inscribed_count).toBe(18);
    expect(result.rejected).toHaveLength(1);
    expect(result.rejected[0].reason_code).toBe('already_enrolled');
    expect(Object.keys(result).sort()).toEqual(['inscribed_count', 'rejected']);
    expect(mockPost).toHaveBeenCalledWith(
      '/api/v1/projects/71/participants/import',
      expect.any(FormData),
      expect.any(Object)
    );
  });

  it('analyze surfaces file_required as French message', async () => {
    mockPost.mockRejectedValue({
      response: { status: 422, data: { error: 'file_required' } },
    });
    const file = new File(['x'], 'x.csv', { type: 'text/csv' });
    await expect(analyzeSessionParticipantsImport(71, file)).rejects.toThrow(
      /Choisissez un fichier/
    );
  });

  it('import surfaces 403 as unauthorized', async () => {
    mockPost.mockRejectedValue({ response: { status: 403, data: {} } });
    const file = new File(['x'], 'x.csv', { type: 'text/csv' });
    await expect(importSessionParticipants(71, file)).rejects.toThrow(/non autorisée/);
  });

  it('downloadSessionParticipantsImportTemplate fetches blob template', async () => {
    mockGet.mockResolvedValue({ data: new Blob(['Nom;Prénom'], { type: 'text/csv' }) });
    const createObjectURL = jest.fn(() => 'blob:mock');
    const revokeObjectURL = jest.fn();
    const urlProto = URL as unknown as {
      createObjectURL: typeof createObjectURL;
      revokeObjectURL: typeof revokeObjectURL;
    };
    urlProto.createObjectURL = createObjectURL;
    urlProto.revokeObjectURL = revokeObjectURL;
    const click = jest.fn();
    const originalCreate = document.createElement.bind(document);
    jest.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      const el = originalCreate(tag);
      if (tag === 'a') {
        Object.defineProperty(el, 'click', { value: click });
      }
      return el;
    });

    await downloadSessionParticipantsImportTemplate(71);

    expect(mockGet).toHaveBeenCalledWith('/api/v1/projects/71/participants/import/template', {
      responseType: 'blob',
    });
    expect(createObjectURL).toHaveBeenCalled();
    expect(click).toHaveBeenCalled();
    expect(revokeObjectURL).toHaveBeenCalled();
    (document.createElement as jest.Mock).mockRestore();
  });
});
