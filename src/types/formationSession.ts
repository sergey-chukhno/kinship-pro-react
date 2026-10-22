/** Sessions formation (ticket 16) — distinctes des fiches catalogue (62). */

import type { FinancementType, ParticipationMode } from './formationCatalogue';

export type FormationSessionStatus = 'coming' | 'in_progress' | 'ended';

export type FormateurSource = 'structure' | 'email';

export interface FormationSessionFormateur {
  source: FormateurSource;
  name: string;
  email?: string;
  memberId?: string;
  /** User id API (responsible_trainer_id) — required for declare_start. */
  userId?: number;
}

export interface FormationSessionPerson {
  id: string;
  name: string;
  email?: string;
  role: 'participant' | 'formateur' | 'intervenant' | 'jury';
  pending?: boolean;
  functionLabel?: string;
}

export interface FormationSessionSeance {
  id: string;
  label: string;
  dateIso: string;
  timeRange: string;
  status: 'planned' | 'open' | 'closed' | 'cancelled';
  place?: string;
}

export type FormationSessionOrgType = 'School' | 'Company';

export interface FormationSession {
  id: string;
  catalogEntryId: string;
  title: string;
  description?: string;
  durationHours?: string;
  modality: ParticipationMode | '';
  financement: FinancementType | '';
  euMc: boolean;
  orgName: string;
  /** Porteuse School/Company — required for TB org filter. */
  organizationId?: number;
  organizationType?: FormationSessionOrgType;
  startDate: string;
  endDate: string;
  formateur: FormationSessionFormateur;
  practicalInfo?: string;
  imageDataUrl?: string;
  status: FormationSessionStatus;
  /** Formateur a déclaré le début (P4.9 / P4.5). */
  startDeclared: boolean;
  attendanceSurveyOptIn: boolean;
  people: FormationSessionPerson[];
  seances: FormationSessionSeance[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateSessionInput {
  catalogEntryId: string;
  title: string;
  description?: string;
  durationHours?: string;
  modality: ParticipationMode | '';
  financement: FinancementType | '';
  euMc: boolean;
  orgName: string;
  organizationId?: number;
  organizationType?: FormationSessionOrgType;
  startDate: string;
  endDate: string;
  formateur: FormationSessionFormateur;
  practicalInfo?: string;
  imageDataUrl?: string;
}

/** P4.2 session participants import — BE contract (Sergey). */
export type SessionImportRejectReasonCode =
  | 'missing_required'
  | 'unreadable_date'
  | 'under_15'
  | 'already_enrolled'
  | 'validation_failed'
  | string;

export interface SessionImportReject {
  line: number;
  reason_code: SessionImportRejectReasonCode;
  message: string;
}

export interface SessionImportPreviewRow {
  line: number;
  first_name: string;
  last_name: string;
  birthday: string; // ISO YYYY-MM-DD
  email: string;
}

export interface SessionImportAnalyzeResponse {
  detected_count: number;
  importable_count: number;
  preview_rows: SessionImportPreviewRow[];
  reject_preview: SessionImportReject[];
  limits: {
    max_rows: number;
    max_bytes: number;
  };
}

export interface SessionImportResponse {
  inscribed_count: number;
  rejected: SessionImportReject[];
}
