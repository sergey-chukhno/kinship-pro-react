/** Catalogue fiches (ticket 62) — distinct des sessions (FormationsHub). */

export type FicheStatus = 'draft' | 'catalog' | 'withdrawn';
export type ProgrammeMode = 'free_lines' | 'series' | 'none';
export type ParticipationMode = 'presentiel' | 'distanciel' | 'hybride';
export type FinancementType = 'CPF' | 'OPCO' | 'Entreprise' | 'Association' | 'Institution' | 'Autre';
export type EuMcGateReason = 'setting' | 'plan' | 'trust';

export interface EuMcGate {
  allowed: boolean;
  reason?: EuMcGateReason;
}

export interface CatalogueServerFlags {
  eu_mc_gate: EuMcGate;
  certification_links_enabled: boolean;
}

export interface ProgrammeLine {
  id: string;
  text: string;
}

export interface ProgrammeSeriesRef {
  id: string;
  label: string;
  competenceIds: string[];
  competenceLabels: string[];
}

export type CertificationTarget = 'title' | 'block';
export type IdentityAtAssessment =
  | 'unsupervised'
  | 'supervised_no_id'
  | 'supervised_online'
  | 'onsite_id'
  | '';

export interface CertificationRegistrySnapshot {
  label: string;
  level: string;
  certificateur: string;
  blocks: number;
}

export interface FormationFiche {
  id: string;
  status: FicheStatus;
  orgKey: string;
  orgName: string;
  orgInitials: string;
  orgCertified: boolean;
  euMc: boolean;
  title: string;
  description: string;
  programmeMode: ProgrammeMode;
  programmeLines: ProgrammeLine[];
  programmeSeries?: ProgrammeSeriesRef;
  durationHours: string;
  modality: ParticipationMode | '';
  financement: FinancementType | '';
  prerequisites: string;
  languages: string[];
  practicalInfo: string;
  assessmentType: string;
  jury: boolean | null;
  /** Affiché seulement si certification_links_enabled */
  certificationCode?: string;
  certificationLabel?: string;
  certificationTarget?: CertificationTarget;
  certificationRegistry?: CertificationRegistrySnapshot | null;
  certificationLookupError?: string | null;
  imageDataUrl?: string;
  schoolLabel?: string;
  categoryBand?: string;
  /** P4.3 bis — cadre européen (affichage mock) */
  eqfLevelDisplay?: string;
  workloadEcts?: string;
  validityUnlimited?: boolean;
  validityMonths?: string;
  identityAtAssessment?: IdentityAtAssessment;
  /** Compteur MC UE serveur (compliance) — source de vérité. */
  compliance?: {
    count: number;
    missingElements: string[];
    displayedLevel?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface CatalogueImportRowResult {
  line: number;
  title: string;
  durationHours: string;
  modality: string;
  financement: string;
  orgName?: string;
  state: 'catalog' | 'draft' | 'rejected';
  detail?: string;
}

export interface CatalogueImportPreview {
  fileName: string;
  /** Token lot serveur (confirm). */
  importId?: string;
  columnsFound: string[];
  columnsIgnored: string[];
  rncpColumnIgnored: boolean;
  rows: CatalogueImportRowResult[];
  counts: { read: number; catalog: number; draft: number; rejected: number };
}
