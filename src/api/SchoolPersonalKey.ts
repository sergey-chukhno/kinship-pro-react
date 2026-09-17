import axiosClient from './config';
import { messageFromBlobError } from './ParticipantImports';

export type SchoolPersonalKeyStatus = {
  pik_remitted_at: string | null;
  pik_last_printed_at: string | null;
  can_print: boolean;
  remitted_label: string;
};

const base = (schoolId: number, studentId: number | string) =>
  `/api/v1/schools/${schoolId}/students/${studentId}/personal_key`;

export function getSchoolPersonalKeyStatus(schoolId: number, studentId: number | string) {
  return axiosClient.get<{ data: SchoolPersonalKeyStatus }>(base(schoolId, studentId));
}

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

export async function printSchoolPersonalKey(
  schoolId: number,
  studentId: number | string
): Promise<void> {
  try {
    const res = await axiosClient.post(base(schoolId, studentId) + '/print', null, {
      responseType: 'blob',
    });
    const contentType = String(res.headers['content-type'] || '');
    if (contentType.includes('application/json')) {
      const text = await (res.data as Blob).text();
      const parsed = JSON.parse(text);
      throw Object.assign(new Error(parsed?.message || parsed?.error || 'Impression impossible'), {
        response: { data: parsed, status: res.status },
      });
    }
    const disposition = res.headers['content-disposition'] as string | undefined;
    const match = disposition ? /filename="?([^"]+)"?/i.exec(disposition) : null;
    downloadBlob(res.data, match?.[1] || `cle-personnelle-${studentId}.pdf`);
  } catch (err: any) {
    const message = await messageFromBlobError(err, 'Impression impossible');
    throw Object.assign(new Error(message), { response: err?.response, cause: err });
  }
}
