import {
  analysisToPreview,
  entryToFiche,
  ficheToPayload,
  flagsFromMeta,
} from './formationCatalogMapper';
import { CatalogueOrgRef } from './formationCatalogOrg';
import { FormationFiche } from '../types/formationCatalogue';

const org: CatalogueOrgRef = {
  type: 'Company',
  id: 42,
  name: 'Acme Formation',
  initials: 'AF',
  key: 'company-42',
};

describe('formationCatalogMapper', () => {
  it('maps meta flags', () => {
    expect(
      flagsFromMeta({
        eu_mc_gate: { allowed: false, reason: 'plan' },
        certification_links_enabled: true,
      })
    ).toEqual({
      eu_mc_gate: { allowed: false, reason: 'plan' },
      certification_links_enabled: true,
    });
  });

  it('maps listed entry to catalog fiche with compliance', () => {
    const fiche = entryToFiche(
      {
        id: 'uuid-1',
        status: 'listed',
        is_eu_mc_declared: true,
        title: 'Droit européen',
        description: 'Desc',
        workload_hours: '48.0',
        participation_mode: 'on_site',
        financement_type: 'cpf',
        assessment_type: 'QCM',
        has_jury: false,
        teaching_languages: ['fr'],
        compliance: { count: 8, missing_elements: ['learning_outcomes'], displayed_level: 'NOT_APPLICABLE' },
        created_at: '2026-01-01',
        updated_at: '2026-01-02',
      },
      org
    );
    expect(fiche.status).toBe('catalog');
    expect(fiche.euMc).toBe(true);
    expect(fiche.modality).toBe('presentiel');
    expect(fiche.financement).toBe('CPF');
    expect(fiche.compliance?.count).toBe(8);
  });

  it('maps fiche payload enums to BE', () => {
    const fiche: FormationFiche = {
      id: 'local-1',
      status: 'draft',
      orgKey: org.key,
      orgName: org.name,
      orgInitials: org.initials,
      orgCertified: true,
      euMc: false,
      title: 'Assertivité',
      description: 'Desc',
      programmeMode: 'free_lines',
      programmeLines: [{ id: '1', text: 'Module A' }],
      durationHours: '14',
      modality: 'hybride',
      financement: 'OPCO',
      prerequisites: '',
      languages: ['Français'],
      practicalInfo: '',
      assessmentType: '',
      jury: false,
      createdAt: '',
      updatedAt: '',
    };
    const payload = ficheToPayload(fiche, org);
    expect(payload.participation_mode).toBe('blended');
    expect(payload.financement_type).toBe('opco');
    expect(payload.program_lines).toBe('Module A');
    expect(payload.is_eu_mc_declared).toBe(false);
  });

  it('maps import analysis listed/draft/skipped', () => {
    const preview = analysisToPreview(
      't.csv',
      {
        recognized_headers: ['Titre'],
        unknown_headers: [],
        certification_links_enabled: false,
        counts: { read: 3, listed: 1, draft: 1, skipped: 1 },
        lines: [
          {
            line_number: 2,
            outcome: 'listed',
            attributes: { title: 'A', workload_hours: 21, participation_mode: 'on_site', financement_type: 'cpf' },
            issues: [],
          },
          {
            line_number: 3,
            outcome: 'draft',
            attributes: { title: 'B' },
            issues: ['missing_description'],
          },
          {
            line_number: 4,
            outcome: 'skipped',
            attributes: { title: 'C' },
            issues: ['duplicate_title'],
          },
        ],
      },
      'token-1'
    );
    expect(preview.importId).toBe('token-1');
    expect(preview.counts).toEqual({ read: 3, catalog: 1, draft: 1, rejected: 1 });
    expect(preview.rows[0].durationHours).toBe('21');
    expect(preview.rows[0].state).toBe('catalog');
  });
});
