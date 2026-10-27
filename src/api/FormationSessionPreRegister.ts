import apiClient from './config';
import type { CatalogueOrgRef } from './formationCatalogOrg';
import type {
  SessionPreRegisterPayload,
  SessionPreRegisterResponse,
  SessionPreRegisterWarning,
} from '../types/formationSession';

function apiErrorMessage(err: any, fallback: string): string {
  const status = err?.response?.status;
  const data = err?.response?.data;
  if (status === 403) return 'Action non autorisée pour cette session.';
  if (!data) return err?.message || fallback;
  if (typeof data.message === 'string' && data.message) return data.message;
  const details = data.details;
  if (Array.isArray(details) && typeof details[0] === 'string' && details[0]) {
    return details[0];
  }
  if (typeof data.error === 'string' && data.error) {
    return data.message || data.error;
  }
  return fallback;
}

function normalizeWarnings(raw: unknown): SessionPreRegisterWarning[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((w: any) => ({
    code: String(w?.code || ''),
    message: String(w?.message || ''),
  }));
}

/**
 * POST /api/v1/projects/:id/pre_register — contrat KINSHIP 49 V1.3 §11 B.
 * 201 → message « Participant inscrit » + warnings[] (ex. under_15).
 * 422 → e-mail absent / déjà inscrit.
 */
export async function preRegisterSessionParticipant(
  projectId: string | number,
  payload: SessionPreRegisterPayload,
  org?: CatalogueOrgRef | null
): Promise<SessionPreRegisterResponse> {
  if (!org?.id) {
    throw new Error('Organisation manquante pour l’inscription.');
  }
  try {
    const body: Record<string, string | number> = {
      first_name: payload.first_name.trim(),
      last_name: payload.last_name.trim(),
      birthday: payload.birthday.trim(),
      email: payload.email.trim(),
      organization_id: org.id,
      organization_type: org.type,
    };
    if (payload.phone?.trim()) {
      body.phone = payload.phone.trim();
    }

    const res = await apiClient.post(`/api/v1/projects/${projectId}/pre_register`, body);
    const data = res.data || {};
    return {
      message:
        typeof data.message === 'string' && data.message
          ? data.message
          : 'Participant inscrit',
      warnings: normalizeWarnings(data.warnings),
      data: data.data,
    };
  } catch (err: any) {
    throw new Error(apiErrorMessage(err, 'Inscription impossible.'));
  }
}
