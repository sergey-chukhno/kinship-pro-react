import apiClient from './config';
import { getCompanyProjects, getSchoolProjects } from './Dashboard';
import { getProjectMembers } from './Projects';
import type { CatalogueOrgRef } from './formationCatalogOrg';
import type { CreateSessionInput, FormationSession } from '../types/formationSession';
import {
  financementToBe,
  modalityToBe,
  projectToFormationSession,
  type FormationSessionOrgStamp,
} from '../utils/formationSessionApiMapper';
import { formationEndCloseErrorMessage } from '../utils/sessionCloseCopy';
import { cacheFormationSession, getSessionById } from '../utils/formationSessionStore';

function apiErrorMessage(err: any, fallback: string): string {
  const data = err?.response?.data;
  if (!data) return err?.message || fallback;
  if (typeof data.message === 'string' && data.message) return data.message;
  const code = data.error;
  if (code === 'reason_required') return 'Le motif du report est obligatoire.';
  if (code === 'start_already_declared') {
    return 'Les dates ne se modifient plus : le début a été déclaré.';
  }
  if (code === 'missing_fields') {
    const missing = Array.isArray(data.details?.missing)
      ? data.details.missing.join(', ')
      : '';
    return missing ? `Champs manquants : ${missing}` : 'Champs manquants.';
  }
  if (code === 'Forbidden') return 'Action non autorisée.';
  if (code === 'not_coming') return 'La session n’est plus à venir.';
  if (code === 'not_catalog_session') return 'Session catalogue introuvable.';
  if (typeof code === 'string') return data.message || code;
  return fallback;
}

function isCatalogFormationProject(p: any): boolean {
  return Boolean(p?.formation_catalog_entry_id) && p?.project_kind === 'formation';
}

function mergeLocalFlags(session: FormationSession): FormationSession {
  const prev = getSessionById(session.id);
  if (!prev) return session;
  return {
    ...session,
    organizationId: session.organizationId ?? prev.organizationId,
    organizationType: session.organizationType ?? prev.organizationType,
    attendanceSurveyOptIn: prev.attendanceSurveyOptIn,
    seances: prev.seances?.length ? prev.seances : session.seances,
    // Prefer API people when it includes participants (post-import refresh).
    people: session.people.some((x) => x.role === 'participant')
      ? session.people
      : prev.people?.length && prev.people.some((x) => x.role === 'participant')
        ? prev.people
        : session.people,
  };
}

function orgStampFromInput(input: CreateSessionInput): FormationSessionOrgStamp | null {
  if (input.organizationId == null || !input.organizationType) return null;
  return {
    id: Number(input.organizationId),
    type: input.organizationType,
    name: input.orgName,
  };
}

function orgStampFromRef(org: CatalogueOrgRef): FormationSessionOrgStamp {
  return { id: org.id, type: org.type, name: org.name };
}

/**
 * Ensure project_members are present (trainer name + imported participants).
 * Skip fetch when the payload already includes members.
 */
async function enrichProjectWithMembers(project: any): Promise<any> {
  if (!project?.id) return project;
  if (Array.isArray(project.project_members) && project.project_members.length > 0) {
    return project;
  }
  try {
    const members = await getProjectMembers(Number(project.id));
    return { ...project, project_members: members };
  } catch {
    return project;
  }
}

function mapAndCache(
  project: any,
  orgNameFallback = '',
  org?: FormationSessionOrgStamp | null
): FormationSession {
  const session = mergeLocalFlags(projectToFormationSession(project, orgNameFallback, org));
  cacheFormationSession(session);
  return session;
}

export async function openCatalogSession(
  catalogEntryId: string,
  input: CreateSessionInput
): Promise<FormationSession> {
  const sessionBody: Record<string, unknown> = {
    start_date: input.startDate,
    end_date: input.endDate,
    financement_type: financementToBe(input.financement),
  };
  const mode = modalityToBe(input.modality);
  if (mode) sessionBody.participation_mode = mode;
  if (input.practicalInfo) sessionBody.practical_information = input.practicalInfo;

  if (input.formateur.source === 'structure' && input.formateur.userId) {
    sessionBody.user_id = input.formateur.userId;
  } else if (input.formateur.source === 'email') {
    const parts = input.formateur.name.trim().split(/\s+/);
    const first_name = parts[0] || input.formateur.name;
    const last_name = parts.slice(1).join(' ') || first_name;
    sessionBody.responsible_trainer = {
      email: input.formateur.email,
      first_name,
      last_name,
    };
  } else {
    throw new Error('Formateur responsable requis.');
  }

  try {
    const res = await apiClient.post(
      `/api/v1/formation_catalog_entries/${catalogEntryId}/sessions`,
      { session: sessionBody }
    );
    let project = res.data?.data || res.data;
    // Prefer name from create form when serializer omits co_owners briefly
    if (input.formateur.name) {
      project = {
        ...project,
        co_owners: [
          ...(Array.isArray(project.co_owners) ? project.co_owners : []),
          {
            id: project.responsible_trainer_id || input.formateur.userId,
            full_name: input.formateur.name,
            email: input.formateur.email,
          },
        ],
      };
    }
    project = await enrichProjectWithMembers(project);
    return mapAndCache(project, input.orgName, orgStampFromInput(input));
  } catch (err: any) {
    throw new Error(apiErrorMessage(err, 'Création de session impossible.'));
  }
}

export async function getFormationSession(
  projectId: string | number,
  orgNameFallback = '',
  org?: FormationSessionOrgStamp | null
): Promise<FormationSession | null> {
  try {
    const res = await apiClient.get(`/api/v1/projects/${projectId}`);
    let project = res.data?.data || res.data;
    if (!project?.id) return null;
    project = await enrichProjectWithMembers(project);
    return mapAndCache(project, orgNameFallback, org);
  } catch (err: any) {
    if (err?.response?.status === 404) return null;
    throw new Error(apiErrorMessage(err, 'Chargement de la session impossible.'));
  }
}

/** Sync catalog formation sessions for School/Company into local cache (TB + navigation). */
export async function syncOrgFormationSessions(
  org: CatalogueOrgRef
): Promise<FormationSession[]> {
  const stamp = orgStampFromRef(org);
  const res =
    org.type === 'School'
      ? await getSchoolProjects(org.id, { per_page: 50, page: 1, sort_by: 'created_at', sort_direction: 'desc' })
      : await getCompanyProjects(org.id, { per_page: 50, page: 1, sort_by: 'created_at', sort_direction: 'desc' });
  const rows = Array.isArray(res.data?.data) ? res.data.data : [];
  const catalog = rows.filter(isCatalogFormationProject);
  const sessions: FormationSession[] = [];
  for (const p of catalog) {
    const enriched = await enrichProjectWithMembers(p);
    sessions.push(mapAndCache(enriched, org.name, stamp));
  }
  return sessions;
}

export async function rescheduleFormationSession(
  projectId: string | number,
  startDate: string,
  endDate: string,
  reason: string
): Promise<FormationSession> {
  try {
    const res = await apiClient.post(`/api/v1/projects/${projectId}/reschedule`, {
      start_date: startDate,
      end_date: endDate,
      reason: reason.trim(),
    });
    let project = res.data?.data || res.data;
    project = await enrichProjectWithMembers(project);
    return mapAndCache(project);
  } catch (err: any) {
    throw new Error(apiErrorMessage(err, 'Modification des dates impossible.'));
  }
}

export async function declareFormationSessionStart(
  projectId: string | number
): Promise<FormationSession> {
  try {
    const res = await apiClient.post(`/api/v1/projects/${projectId}/declare_start`);
    let project = res.data?.data || res.data;
    project = await enrichProjectWithMembers(project);
    return mapAndCache(project);
  } catch (err: any) {
    throw new Error(apiErrorMessage(err, 'Déclaration du début impossible.'));
  }
}

export type FormationEndDeclarationPayload = {
  active: boolean;
  declared_at?: string | null;
  note?: string | null;
  declared_by_id?: number | null;
  can_declare_end?: boolean;
  can_withdraw_end?: boolean;
};

export type CloseParticipantOutcome = {
  user_id: number;
  validated: boolean;
  result_note?: string;
};

export type CloseFormationSessionInput = {
  assessment_results_attached: boolean;
  trainer_names_shown: boolean;
  participant_outcomes: CloseParticipantOutcome[];
};

function endCloseError(err: any, fallback: string): string {
  const data = err?.response?.data;
  const code = data?.code || data?.error;
  if (code) {
    const mapped = formationEndCloseErrorMessage(code, '');
    if (mapped) return mapped;
  }
  return apiErrorMessage(err, fallback);
}

/** POST /api/v1/projects/:id/declare_end — V15 §6ter */
export async function declareFormationSessionEnd(
  projectId: string | number,
  note?: string
): Promise<FormationEndDeclarationPayload> {
  try {
    const body = note?.trim() ? { note: note.trim() } : {};
    const res = await apiClient.post(`/api/v1/projects/${projectId}/declare_end`, body);
    return (res.data?.data || res.data) as FormationEndDeclarationPayload;
  } catch (err: any) {
    throw new Error(endCloseError(err, 'Déclaration de la fin impossible.'));
  }
}

/** POST /api/v1/projects/:id/withdraw_end */
export async function withdrawFormationSessionEnd(
  projectId: string | number
): Promise<FormationEndDeclarationPayload> {
  try {
    const res = await apiClient.post(`/api/v1/projects/${projectId}/withdraw_end`);
    return (res.data?.data || res.data) as FormationEndDeclarationPayload;
  } catch (err: any) {
    throw new Error(endCloseError(err, 'Retrait de la déclaration impossible.'));
  }
}

/** GET /api/v1/projects/:id/end_declaration */
export async function getFormationEndDeclaration(
  projectId: string | number
): Promise<FormationEndDeclarationPayload> {
  try {
    const res = await apiClient.get(`/api/v1/projects/${projectId}/end_declaration`);
    return (res.data?.data || res.data) as FormationEndDeclarationPayload;
  } catch (err: any) {
    throw new Error(endCloseError(err, 'Lecture de la déclaration impossible.'));
  }
}

/** POST /api/v1/projects/:id/close — V15 §6 (jury + options) */
export async function closeFormationSession(
  projectId: string | number,
  input: CloseFormationSessionInput
): Promise<FormationSession> {
  try {
    const res = await apiClient.post(`/api/v1/projects/${projectId}/close`, {
      assessment_results_attached: input.assessment_results_attached,
      trainer_names_shown: input.trainer_names_shown,
      participant_outcomes: input.participant_outcomes,
    });
    let project = res.data?.data || res.data;
    project = await enrichProjectWithMembers(project);
    return mapAndCache(project);
  } catch (err: any) {
    throw new Error(endCloseError(err, 'Clôture de la session impossible.'));
  }
}
