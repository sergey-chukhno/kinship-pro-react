import {
  financementFromBe,
  financementToBe,
  modalityFromBe,
  modalityToBe,
  projectToFormationSession,
} from './formationSessionApiMapper';

describe('formationSessionApiMapper', () => {
  it('maps modality and financement FE ↔ BE', () => {
    expect(modalityToBe('presentiel')).toBe('on_site');
    expect(modalityToBe('distanciel')).toBe('online');
    expect(modalityToBe('hybride')).toBe('blended');
    expect(modalityFromBe('on_site')).toBe('presentiel');
    expect(financementToBe('CPF')).toBe('cpf');
    expect(financementFromBe('opco')).toBe('OPCO');
  });

  it('maps project to session with À VENIR until start_declared_at', () => {
    const session = projectToFormationSession(
      {
        id: 42,
        title: 'Import Excel',
        status: 'coming',
        start_date: '2026-10-17T00:00:00.000Z',
        end_date: '2026-10-23T00:00:00.000Z',
        formation_catalog_entry_id: 'abc',
        financement_type: 'cpf',
        participation_mode: 'on_site',
        practical_information: 'Salle A',
        responsible_trainer_id: 7,
        start_declared_at: null,
        primary_organization_name: 'École primaire Victor Hugo',
        co_owners: [{ id: 7, first_name: 'Antoine', last_name: 'Morel', full_name: 'Antoine Morel' }],
      },
      'Fallback',
      { id: 99, type: 'School', name: 'École primaire Victor Hugo' }
    );

    expect(session.id).toBe('42');
    expect(session.orgName).toBe('École primaire Victor Hugo');
    expect(session.organizationId).toBe(99);
    expect(session.organizationType).toBe('School');
    expect(session.startDeclared).toBe(false);
    expect(session.status).toBe('coming');
    expect(session.formateur.name).toBe('Antoine Morel');
    expect(session.formateur.userId).toBe(7);
    expect(session.modality).toBe('presentiel');
    expect(session.financement).toBe('CPF');
  });

  it('sets EN COURS when start_declared_at is present', () => {
    const session = projectToFormationSession({
      id: 1,
      title: 'X',
      status: 'in_progress',
      start_date: '2026-10-01',
      end_date: '2026-10-10',
      formation_catalog_entry_id: 'e1',
      responsible_trainer_id: 2,
      start_declared_at: '2026-10-19T10:00:00Z',
      co_owners: [],
    });
    expect(session.startDeclared).toBe(true);
    expect(session.status).toBe('in_progress');
  });

  it('maps project_members role member as participants', () => {
    const session = projectToFormationSession({
      id: 72,
      title: 'Journaliste',
      status: 'coming',
      start_date: '2026-10-22',
      end_date: '2026-10-25',
      formation_catalog_entry_id: 'e1',
      responsible_trainer_id: 7,
      start_declared_at: null,
      co_owners: [{ id: 7, full_name: 'Antoine Morel' }],
      project_members: [
        {
          id: 1,
          role: 'co_owner',
          status: 'confirmed',
          user: { id: 7, full_name: 'Antoine Morel', email: 'a@x.fr' },
        },
        {
          id: 2,
          role: 'member',
          status: 'confirmed',
          user_id: 101,
          user: {
            id: 101,
            first_name: 'Zoé',
            last_name: 'Aubert',
            full_name: 'Zoé Aubert',
            email: 'zoe.aubert@example.org',
          },
        },
        {
          id: 3,
          role: 'member',
          status: 'pending',
          user: { id: 102, full_name: 'Yanis Blanc', email: 'yanis@example.org' },
        },
      ],
    });

    const participants = session.people.filter((p) => p.role === 'participant');
    expect(participants).toHaveLength(2);
    expect(participants[0]).toMatchObject({
      id: '101',
      name: 'Zoé Aubert',
      email: 'zoe.aubert@example.org',
      pending: false,
    });
    expect(participants[1]).toMatchObject({
      id: '102',
      name: 'Yanis Blanc',
      pending: true,
    });
    expect(session.people.filter((p) => p.role === 'formateur')).toHaveLength(1);
  });
});
