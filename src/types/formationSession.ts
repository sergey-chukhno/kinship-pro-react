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
