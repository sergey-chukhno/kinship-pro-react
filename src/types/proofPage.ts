/** Proof page entière — V1.8.7 §7.7 (snake_case, server-shaped). */

export type ProofPageView = 'holder' | 'link' | 'organization';

export type ProofFamily =
  | 'project_basic'
  | 'project_enriched'
  | 'stage'
  | 'microcredential'
  | 'formation_certified'
  | 'formation_other';

export type HolderState = 'name' | 'initial' | 'masked' | 'erased';

export interface ProofMarker {
  value: string;
  label: string;
}

export interface ProofOrganization {
  ref: string;
  name: string;
  role_label: string;
  country_code: string | null;
  trust_level_at_closure: string | null;
  trust_label: string | null;
  is_partner_without_account: boolean;
  sector: string | null;
  territory: string | null;
}

export interface ProofAct {
  organization_ref: string | null;
  host_company_name: string | null;
  host_company_by_tutor: string | null;
}

export interface ProofJuryLine {
  full_name: string;
  job_title: string;
}

export interface ProofPartnerLine {
  full_name: string;
  job_title: string;
  organization_ref: string;
}

export interface ProofTrainer {
  full_name: string | null;
  job_title: string;
  organization_ref: string;
  competences_count: number;
}

export interface ProofActors {
  trainer_names_shown: boolean;
  trainers: ProofTrainer[];
  participants_count: number;
}

export interface ProofTimelineOpening {
  date: string;
  participants_count: number | null;
}

export interface ProofTimelineStep {
  type: string;
  title: string;
  location: string | null;
  date: string;
  proofs_count: number;
}

export interface ProofTimeline {
  opening: ProofTimelineOpening;
  steps: ProofTimelineStep[];
  sessions: { attended: number; total: number } | null;
  acts: unknown[];
}

export interface ProofEsco {
  label: string;
  uri: string;
  match: string;
}

export interface ProofProgramItem {
  badge_label: string;
  date: string | null;
  esco: ProofEsco | null;
  open_path: string;
}

export interface ProofSeriesItem {
  badge_label: string;
  date: string;
  level_label: string | null;
  esco: ProofEsco | null;
  open_path: string;
}

export interface ProofSeries {
  series_name: string;
  items: ProofSeriesItem[];
}

export interface ProofProofsBlock {
  empty: boolean;
  validation: { date: string; label: string; open_path: string } | null;
  series: ProofSeries[];
  program: ProofProgramItem[];
  presences: { count: number; items: { date: string; open_path: string }[] } | null;
  results_note: string | null;
}

export interface ProofTrust {
  co_attesting_count: number;
  tutor_coattested: boolean | null;
  certified_training_org: boolean | null;
  retention_expiry_at: string | null;
}

export interface ProofBlock {
  code: string;
  rank: number;
  title: string;
}

export interface ProofCertification {
  code: string;
  title: string;
  european_level: string | null;
}

export interface ProofCondition {
  certification_code: string;
  certification_title: string;
  text: string;
}

export interface ProofMcFrame {
  participation_mode: 'on_site' | 'online' | 'blended';
  online_hours: number | null;
  teaching_languages: string[] | null;
  assessment_type: string | null;
  workload_hours: number | null;
  workload_ects: number | null;
}

export interface ProofEuElement {
  number: number;
  official_title: string;
  value: string;
}

export interface ProofEuElements {
  elements: ProofEuElement[];
  optional: { official_title: string; value: string }[];
}

export interface ProofCore {
  proof_number: string;
  family: ProofFamily;
  project_kind: string;
  compliance_framework: string;
  exportable: boolean;
  title: string;
  start_date: string;
  end_date: string;
  ended_at: string;
  description: string | null;
  holder_display: string;
  holder_state: HolderState;
  markers: ProofMarker[];
  organizations: ProofOrganization[];
  act: ProofAct;
  attestation_label: string | null;
  jury_line: ProofJuryLine | null;
  partner_lines: ProofPartnerLine[];
  block: ProofBlock | null;
  certification: ProofCertification | null;
  condition: ProofCondition | null;
  actors: ProofActors;
  timeline: ProofTimeline;
  proofs: ProofProofsBlock;
  trust: ProofTrust;
  mc_frame: ProofMcFrame | null;
  eu_elements: ProofEuElements | null;
}

export interface HolderZone {
  sharing_closed: boolean;
  links_count: number;
  links_max: number;
  european_export: { paid: boolean; exported_at: string | null } | null;
}

export interface ProofPageResponse {
  proof_verify_api_enabled: boolean;
  european_export_ui_enabled: boolean;
  proof_pdf_enabled: boolean;
  rights_page_enabled: boolean;
  view: ProofPageView;
  proof: ProofCore;
  holder_zone: HolderZone | null;
}

export class ProofPageGoneError extends Error {
  constructor(message = 'Proof link gone') {
    super(message);
    this.name = 'ProofPageGoneError';
  }
}

export class ProofPageNotFoundError extends Error {
  constructor(message = 'Proof not found') {
    super(message);
    this.name = 'ProofPageNotFoundError';
  }
}
