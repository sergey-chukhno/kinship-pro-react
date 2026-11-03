const mockPost = jest.fn();

jest.mock('./config', () => ({
  __esModule: true,
  default: {
    post: (...args: unknown[]) => mockPost(...args),
  },
  axiosClientWithoutToken: {},
}));

import { preRegisterSessionParticipant } from './FormationSessionPreRegister';
import type { CatalogueOrgRef } from './formationCatalogOrg';

const org: CatalogueOrgRef = {
  type: 'Company',
  id: 19,
  name: 'CFPJ',
  initials: 'CF',
  key: 'company-19',
};

describe('preRegisterSessionParticipant', () => {
  beforeEach(() => {
    mockPost.mockReset();
  });

  it('POSTs body with org context and maps 201 response', async () => {
    mockPost.mockResolvedValue({
      data: {
        message: 'Participant inscrit',
        warnings: [{ code: 'under_15', message: 'date de naissance : moins de 15 ans' }],
        data: { id: 1 },
      },
    });

    const result = await preRegisterSessionParticipant(
      72,
      {
        first_name: 'Nadia',
        last_name: 'Benali',
        birthday: '2012-06-14',
        email: 'n.benali@exemple.fr',
      },
      org
    );

    expect(mockPost).toHaveBeenCalledWith('/api/v1/projects/72/pre_register', {
      first_name: 'Nadia',
      last_name: 'Benali',
      birthday: '2012-06-14',
      email: 'n.benali@exemple.fr',
      organization_id: 19,
      organization_type: 'Company',
    });
    expect(result.message).toBe('Participant inscrit');
    expect(result.warnings[0].code).toBe('under_15');
  });

  it('surfaces 422 already enrolled message', async () => {
    mockPost.mockRejectedValue({
      response: {
        status: 422,
        data: { message: 'Déjà inscrit à la session.' },
      },
    });

    await expect(
      preRegisterSessionParticipant(
        72,
        {
          first_name: 'Léa',
          last_name: 'Martin',
          birthday: '1996-06-14',
          email: 'lea.martin@exemple.fr',
        },
        org
      )
    ).rejects.toThrow(/Déjà inscrit à la session/);
  });
});
