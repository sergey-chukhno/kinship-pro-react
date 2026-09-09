import axiosClient from './config';

export type ParticipantImportLineStatus =
  | 'ready'
  | 'create'
  | 'matched'
  | 'pending'
  | 'ambiguous'
  | 'class_conflict';

export type ParticipantImportCandidate = {
  candidate_token: string;
  city?: string | null;
};

export type ParticipantImportLine = {
  line_id: string;
  status: ParticipantImportLineStatus | string;
  birthday?: string | null;
  proposed_level?: string | null;
  identity?: {
    prenom?: string;
    nom?: string;
    date_de_naissance?: string;
    classe?: string;
    email_du_representant_legal?: string;
  };
  candidates?: ParticipantImportCandidate[];
  issues?: Array<{ type?: string; message?: string; classes?: string[] }>;
  resolution?: string | { chosen_classe?: string } | null;
};

export type ParticipantImportClassPreview = {
  name: string;
  proposed_level?: string;
  level_step?: number;
  siecle_code_unanimous?: boolean;
  editable?: boolean;
};

export type ParticipantImportBatchPayload = {
  counts?: Record<string, number>;
  source_format?: string;
  column_map?: Record<string, number | string>;
  recognized_headers?: string[];
  classes?: ParticipantImportClassPreview[];
  class_conflicts?: Array<{
    line_ids?: string[];
    classes?: string[];
    prompt?: string;
  }>;
  lines?: ParticipantImportLine[];
  removals?: Array<{
    first_name?: string;
    last_name?: string;
    class_names?: string[];
  }>;
  email_notice?: string;
};

export type ParticipantImportBatch = {
  public_token: string;
  status: string;
  expires_at: string;
  created_at?: string;
  resolved_count: number;
  operator_id?: number;
  operator_first_name?: string | null;
  operator_last_initial?: string | null;
  payload?: ParticipantImportBatchPayload;
};

export type LiveBatchConflict = {
  error?: string;
  code: 'LIVE_BATCH_EXISTS';
  message?: string;
  live_batch: ParticipantImportBatch;
};

export type ValidateImportResult = {
  batch: ParticipantImportBatch;
  recap: {
    public_token: string;
    counts: Record<string, number>;
  };
};

export type RecapSummary = {
  public_token: string;
  counts?: Record<string, number>;
  source_format?: string;
  batch_public_token?: string;
  validated_at?: string;
  nominative_present: boolean;
};

export type RecapDocumentIndex = {
  public_token: string;
  nominative_present: boolean;
  direction_note_available: boolean;
  classes: Array<{
    class_name: string;
    student_count: number;
    coupons_available: boolean;
    route_sheet_available: boolean;
  }>;
};

const base = (schoolId: number) => `/api/v1/schools/${schoolId}/participant_imports`;
const recapBase = (schoolId: number, token: string) =>
  `/api/v1/schools/${schoolId}/participant_import_recaps/${token}`;

function downloadBlob(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

function filenameFromDisposition(header: string | undefined, fallback: string) {
  if (!header) return fallback;
  const match = /filename="?([^"]+)"?/i.exec(header);
  return match?.[1] || fallback;
}

/** Axios blob errors carry a Blob body — recover message for UI. */
export async function messageFromBlobError(err: any, fallback = 'Téléchargement impossible'): Promise<string> {
  const data = err?.response?.data;
  if (data instanceof Blob) {
    try {
      const text = await data.text();
      const parsed = JSON.parse(text);
      if (typeof parsed?.message === 'string' && parsed.message.trim()) return parsed.message;
      if (typeof parsed?.error === 'string' && parsed.error.trim()) return parsed.error;
    } catch {
      /* ignore */
    }
  }
  if (typeof data?.message === 'string' && data.message.trim()) return data.message;
  return err?.message || fallback;
}

export function createParticipantImport(
  schoolId: number,
  file: File,
  options?: { replace?: boolean }
) {
  const form = new FormData();
  form.append('file', file);
  if (options?.replace) form.append('replace', 'true');
  return axiosClient.post<ParticipantImportBatch>(base(schoolId), form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
}

export function getParticipantImport(schoolId: number, publicToken: string) {
  return axiosClient.get<ParticipantImportBatch>(`${base(schoolId)}/${publicToken}`);
}

export function resolveParticipantImportLine(
  schoolId: number,
  publicToken: string,
  payload: {
    line_id: string;
    decision: 'match' | 'create' | 'choose_class';
    chosen_candidate_token?: string;
    chosen_classe?: string;
  }
) {
  return axiosClient.patch<ParticipantImportBatch>(
    `${base(schoolId)}/${publicToken}/resolve`,
    payload
  );
}

export function validateParticipantImport(
  schoolId: number,
  publicToken: string,
  classLevels: Record<string, string>
) {
  return axiosClient.post<ValidateImportResult>(`${base(schoolId)}/${publicToken}/validate`, {
    class_levels: classLevels,
  });
}

export function destroyParticipantImport(schoolId: number, publicToken: string) {
  return axiosClient.delete(`${base(schoolId)}/${publicToken}`);
}

export function getParticipantImportRecap(schoolId: number, publicToken: string) {
  return axiosClient.get<RecapSummary>(recapBase(schoolId, publicToken));
}

export function getParticipantImportDocumentIndex(schoolId: number, publicToken: string) {
  return axiosClient.get<RecapDocumentIndex>(`${recapBase(schoolId, publicToken)}/document_index`);
}

export async function downloadRecapCoupons(
  schoolId: number,
  publicToken: string,
  classNames?: string[]
) {
  try {
    const res = await axiosClient.get(`${recapBase(schoolId, publicToken)}/coupons`, {
      params: classNames?.length ? { class_names: classNames } : undefined,
      responseType: 'blob',
    });
    downloadBlob(
      res.data,
      filenameFromDisposition(res.headers['content-disposition'], `coupons-${publicToken}.pdf`)
    );
  } catch (err) {
    throw new Error(await messageFromBlobError(err, 'Téléchargement des coupons impossible'));
  }
}

export async function downloadRecapRouteSheets(
  schoolId: number,
  publicToken: string,
  classNames?: string[]
) {
  try {
    const res = await axiosClient.get(`${recapBase(schoolId, publicToken)}/route_sheets`, {
      params: classNames?.length ? { class_names: classNames } : undefined,
      responseType: 'blob',
    });
    downloadBlob(
      res.data,
      filenameFromDisposition(res.headers['content-disposition'], `feuille-de-route-${publicToken}.pdf`)
    );
  } catch (err) {
    throw new Error(await messageFromBlobError(err, 'Téléchargement de la feuille de route impossible'));
  }
}

export async function downloadRecapDirectionNote(schoolId: number, publicToken: string) {
  try {
    const res = await axiosClient.get(`${recapBase(schoolId, publicToken)}/direction_note`, {
      responseType: 'blob',
    });
    downloadBlob(
      res.data,
      filenameFromDisposition(res.headers['content-disposition'], `note-direction-${publicToken}.pdf`)
    );
  } catch (err) {
    throw new Error(await messageFromBlobError(err, 'Téléchargement de la note direction impossible'));
  }
}

export function eraseRecapNominative(schoolId: number, publicToken: string) {
  return axiosClient.delete<{ message: string; nominative_present: boolean }>(
    `${recapBase(schoolId, publicToken)}/nominative`
  );
}
