import { buildMldsClassicSeed, formatMldsClassicRecap } from './mldsToClassicSeed';

describe('buildMldsClassicSeed', () => {
  it('reprend la description, les compétences développées, les partenariats et les co-responsables', () => {
    const seed = buildMldsClassicSeed({
      title: 'Atelier persévérance',
      description: 'Remobiliser les élèves de 4e.',
      start_date: '2026-03-01T00:00:00.000Z',
      end_date: '2026-06-30',
      owner: { id: 1 },
      partnership_details: [
        { partnership_id: 12, partner_organizations: [{ name: 'Mission locale' }] },
        { partnership_id: 12, partner_organizations: [{ name: 'Mission locale' }] },
        { partnership_id: 4, partnership_name: 'DCIO Partnership' },
      ],
      co_responsibles: [
        { id: 1, first_name: 'Ada', last_name: 'Owner' },
        {
          id: 8,
          first_name: 'Lina',
          last_name: 'Martin',
          added_from_organization: { organization_type: 'Company', organization_id: 3 },
        },
        { user_id: 8, first_name: 'Lina', last_name: 'Martin' },
      ],
      main_picture_url: ' http://localhost:3000/rails/active_storage/blobs/redirect/abc--def/cover.jpg ',
      mlds_information: {
        objectives: 'Tenir jusqu’au brevet.',
        action_objectives: ['professional_discovery'],
        competencies_developed: 'S’exprimer à l’oral\nTravailler en équipe',
      },
    });

    expect(seed.description).toBe('Remobiliser les élèves de 4e.');
    expect(seed.learningOutcomes).toBe('S’exprimer à l’oral\nTravailler en équipe');
    expect(seed.partnershipIds).toEqual([12, 4]);
    expect(seed.partnershipNames).toEqual(['Mission locale', 'DCIO']);
    expect(seed.coResponsibleIds).toEqual([8]);
    expect(seed.coResponsibleNames).toEqual(['Lina Martin']);
    expect(seed.coResponsibleContexts).toEqual([
      { user_id: 8, member_context_type: 'Company', member_context_id: 3 },
    ]);
    expect(seed.mainPictureUrl).toBe('http://localhost:3000/rails/active_storage/blobs/redirect/abc--def/cover.jpg');
    expect(seed.mainPictureSignedId).toBe('abc--def');
    expect(formatMldsClassicRecap(seed)).toContain('Présentiel');
    expect(formatMldsClassicRecap(seed)).toContain('Reprise');
    expect(formatMldsClassicRecap(seed)).toContain('S’exprimer à l’oral');
    expect(formatMldsClassicRecap(seed)).not.toContain('Tenir jusqu’au brevet');
  });
});
