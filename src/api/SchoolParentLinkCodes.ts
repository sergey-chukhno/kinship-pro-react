import axiosClient from './config';

export type SchoolParentLinkCode = {
  id: number;
  code: string | null;
  status: 'unused' | 'used' | 'invalidated' | string;
  issued_at?: string | null;
  used_at?: string | null;
};

export type SchoolParentActiveLink = {
  id: number;
  label: string;
  suspended: boolean;
};

export type SchoolParentLinkCodesPayload = {
  codes: SchoolParentLinkCode[];
  active_links: SchoolParentActiveLink[];
};

const base = (schoolId: number, studentId: number | string) =>
  `/api/v1/schools/${schoolId}/students/${studentId}/parent_link_codes`;

export function listSchoolParentLinkCodes(schoolId: number, studentId: number | string) {
  return axiosClient.get<{ data: SchoolParentLinkCodesPayload }>(base(schoolId, studentId));
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

export async function regenerateSchoolParentLinkCode(
  schoolId: number,
  studentId: number | string
): Promise<{ code: string | null }> {
  const res = await axiosClient.post(base(schoolId, studentId) + '/regenerate', null, {
    responseType: 'blob',
  });
  const codeHeader = res.headers['x-parent-link-code'] as string | undefined;
  const disposition = res.headers['content-disposition'] as string | undefined;
  const match = disposition ? /filename="?([^"]+)"?/i.exec(disposition) : null;
  downloadBlob(res.data, match?.[1] || `coupon-${studentId}.pdf`);
  return { code: codeHeader || null };
}
