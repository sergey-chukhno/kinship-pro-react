import apiClient from './config';
import type { CatalogueOrgRef } from './formationCatalogOrg';
import type {
  SessionImportAnalyzeResponse,
  SessionImportReject,
  SessionImportResponse,
  SessionImportWarning,
} from '../types/formationSession';

function apiErrorMessage(err: any, fallback: string): string {
  const status = err?.response?.status;
  const data = err?.response?.data;
  if (status === 403) return 'Action non autorisée pour cette session.';
  if (!data) return err?.message || fallback;
  if (typeof data.message === 'string' && data.message) return data.message;
  const code = data.error;
  if (code === 'file_required') return 'Choisissez un fichier CSV ou Excel.';
  if (code === 'analyze_failed') return data.message || 'Analyse du fichier impossible.';
  if (code === 'import_failed') return data.message || 'Import impossible.';
  if (typeof code === 'string') return data.message || code;
  return fallback;
}

function normalizeReject(row: any): SessionImportReject {
  return {
    line: Number(row?.line) || 0,
    reason_code: String(row?.reason_code || 'validation_failed'),
    message: String(row?.message || 'Ligne écartée.'),
  };
}

function normalizeWarning(row: any): SessionImportWarning {
  return {
    line: Number(row?.line) || 0,
    code: String(row?.code || ''),
    message: String(row?.message || ''),
  };
}

/** under_15 is a soft warning (V1.3), not a reject — drop if BE still sends it in reject_preview. */
function isSoftAgeReject(r: SessionImportReject): boolean {
  return r.reason_code === 'under_15';
}

function buildFormData(file: File, org?: CatalogueOrgRef | null): FormData {
  const form = new FormData();
  form.append('file', file);
  if (org?.id != null) {
    form.append('organization_id', String(org.id));
    form.append('organization_type', org.type);
  }
  return form;
}

function basePath(projectId: string | number): string {
  return `/api/v1/projects/${projectId}/participants/import`;
}

/** GET template CSV — modele_import_participants_session.csv */
export async function downloadSessionParticipantsImportTemplate(
  projectId: string | number
): Promise<void> {
  try {
    const res = await apiClient.get(`${basePath(projectId)}/template`, {
      responseType: 'blob',
    });
    const blob = new Blob([res.data], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'modele_import_participants_session.csv';
    a.click();
    URL.revokeObjectURL(url);
  } catch (err: any) {
    throw new Error(apiErrorMessage(err, 'Téléchargement du modèle impossible.'));
  }
}

/** POST analyze — preview only, no write. */
export async function analyzeSessionParticipantsImport(
  projectId: string | number,
  file: File,
  org?: CatalogueOrgRef | null
): Promise<SessionImportAnalyzeResponse> {
  try {
    const res = await apiClient.post(`${basePath(projectId)}/analyze`, buildFormData(file, org), {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    const data = res.data?.data || res.data || {};
    const reject_preview = Array.isArray(data.reject_preview)
      ? data.reject_preview.map(normalizeReject).filter((r: SessionImportReject) => !isSoftAgeReject(r))
      : [];
    return {
      detected_count: Number(data.detected_count) || 0,
      importable_count: Number(data.importable_count) || 0,
      preview_rows: Array.isArray(data.preview_rows)
        ? data.preview_rows.map((r: any) => ({
            line: Number(r.line) || 0,
            first_name: String(r.first_name || ''),
            last_name: String(r.last_name || ''),
            birthday: String(r.birthday || ''),
            email: String(r.email || ''),
          }))
        : [],
      reject_preview,
      warnings: Array.isArray(data.warnings) ? data.warnings.map(normalizeWarning) : [],
      limits: {
        max_rows: Number(data.limits?.max_rows) || 5000,
        max_bytes: Number(data.limits?.max_bytes) || 20971520,
      },
    };
  } catch (err: any) {
    throw new Error(apiErrorMessage(err, 'Analyse du fichier impossible.'));
  }
}

/** POST import — write inscriptions. */
export async function importSessionParticipants(
  projectId: string | number,
  file: File,
  org?: CatalogueOrgRef | null
): Promise<SessionImportResponse> {
  try {
    const res = await apiClient.post(basePath(projectId), buildFormData(file, org), {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    const data = res.data?.data || res.data || {};
    return {
      inscribed_count: Number(data.inscribed_count) || 0,
      rejected: Array.isArray(data.rejected) ? data.rejected.map(normalizeReject) : [],
    };
  } catch (err: any) {
    throw new Error(apiErrorMessage(err, 'Import impossible.'));
  }
}
