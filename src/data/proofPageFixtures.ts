import { ProofCore, ProofPageResponse } from '../types/proofPage';

/** Base formation_certified — véhicule P6.1 écrans 10 / 15 (socle). */
const baseProof: ProofCore = {
  proof_number: 'PF·2027·FR·4K8NX2QM',
  family: 'formation_certified',
  project_kind: 'formation',
  compliance_framework: 'KINSHIP_PROOF_BASIC',
  exportable: false,
  title: 'Débuter dans le numérique',
  start_date: '2027-01-05',
  end_date: '2027-03-27',
  ended_at: '2027-03-27T16:02:11Z',
  description: 'Huit séances pour prendre en main les démarches en ligne.',
  holder_display: 'Nadia Belkacem',
  holder_state: 'name',
  markers: [
    { value: '60 h', label: 'durée' },
    { value: '2', label: 'compétences' },
    { value: 'ESCO', label: 'référentiel européen' },
  ],
  organizations: [
    {
      ref: 'o1',
      name: 'Atelier Numérique Formation',
      role_label: 'Organisme de formation',
      country_code: 'FR',
      trust_level_at_closure: 'STRATEGIC_PARTNER',
      trust_label: '◆ Organisme de formation certifié',
      is_partner_without_account: false,
      sector: 'Formation professionnelle',
      territory: 'Bouches-du-Rhône',
    },
  ],
  act: {
    organization_ref: 'o1',
    host_company_name: null,
    host_company_by_tutor: null,
  },
  attestation_label: 'Réussite validée',
  jury_line: null,
  partner_lines: [],
  block: null,
  certification: null,
  condition: null,
  actors: {
    trainer_names_shown: false,
    trainers: [
      {
        full_name: null,
        job_title: 'Formatrice',
        organization_ref: 'o1',
        competences_count: 2,
      },
    ],
    participants_count: 12,
  },
  timeline: {
    opening: { date: '2027-01-05', participants_count: null },
    steps: [],
    sessions: null,
    acts: [],
  },
  proofs: {
    empty: false,
    validation: {
      date: '2027-03-27',
      label: 'Réussite validée',
      open_path: '/proof/demo-link/p/val',
    },
    series: [],
    program: [
      {
        badge_label: 'Utiliser une messagerie électronique',
        date: '2027-03-27',
        esco: { label: 'utiliser le courrier électronique', uri: 'https://example.esco/1', match: 'exact' },
        open_path: '/proof/demo-link/p/1',
      },
      {
        badge_label: 'Faire une démarche administrative en ligne',
        date: '2027-03-27',
        esco: null,
        open_path: '/proof/demo-link/p/2',
      },
    ],
    presences: null,
    results_note: null,
  },
  trust: {
    co_attesting_count: 1,
    tutor_coattested: null,
    certified_training_org: true,
    retention_expiry_at: '2033-03-27T00:00:00Z',
  },
  mc_frame: null,
  eu_elements: null,
};

function linkFixture(overrides?: Partial<ProofCore>): ProofPageResponse {
  return {
    proof_verify_api_enabled: false,
    european_export_ui_enabled: false,
    proof_pdf_enabled: false,
    rights_page_enabled: false,
    view: 'link',
    proof: { ...baseProof, ...overrides },
    holder_zone: null,
  };
}

function holderFixture(
  proofOverrides?: Partial<ProofCore>,
  zone?: ProofPageResponse['holder_zone']
): ProofPageResponse {
  return {
    proof_verify_api_enabled: false,
    european_export_ui_enabled: false,
    proof_pdf_enabled: false,
    rights_page_enabled: false,
    view: 'holder',
    proof: { ...baseProof, ...proofOverrides },
    holder_zone: zone ?? {
      sharing_closed: false,
      links_count: 1,
      links_max: 5,
      european_export: null,
    },
  };
}

/** Tokens mock étape 1 (smokes). */
export const PROOF_PAGE_FIXTURES: Record<string, ProofPageResponse> = {
  /** P6.1 écran 10 — visiteur, nom affiché */
  'demo-link': linkFixture(),
  /** P6.1 écran 15 — titulaire */
  'demo-holder': holderFixture(),
  /** 40 — Identité masquée */
  'demo-masked': linkFixture({
    holder_display: 'Identité masquée',
    holder_state: 'masked',
  }),
  /** 41 — mineur initiale */
  'demo-initial': linkFixture({
    holder_display: 'Théo M.',
    holder_state: 'initial',
  }),
  /** 42 — données civiles effacées */
  'demo-erased': linkFixture({
    holder_display: 'Données civiles effacées',
    holder_state: 'erased',
  }),
  /** 43 — élève sans email vérifié */
  'demo-sharing-closed': holderFixture(
    { holder_display: 'Léa Giniez', holder_state: 'name' },
    {
      sharing_closed: true,
      links_count: 0,
      links_max: 5,
      european_export: null,
    }
  ),
  /** 48/49 — mêmes flags off (défaut) + exportable true pour tester ★ gated */
  'demo-exportable-gated': linkFixture({ exportable: true }),
  /** Interrupteurs allumés (smoke inverse) */
  'demo-flags-on': {
    ...holderFixture({ exportable: true }),
    proof_verify_api_enabled: true,
    european_export_ui_enabled: true,
    proof_pdf_enabled: true,
    rights_page_enabled: true,
  },
};

/** projectId mock → holder view */
export const PROOF_PAGE_PROJECT_FIXTURES: Record<string, ProofPageResponse> = {
  '101': holderFixture(),
  '102': PROOF_PAGE_FIXTURES['demo-sharing-closed'],
};

export function getProofPageFixtureByToken(token: string): ProofPageResponse | null {
  return PROOF_PAGE_FIXTURES[token] ?? null;
}

export function getProofPageFixtureByProjectId(projectId: string | number): ProofPageResponse | null {
  return PROOF_PAGE_PROJECT_FIXTURES[String(projectId)] ?? null;
}
