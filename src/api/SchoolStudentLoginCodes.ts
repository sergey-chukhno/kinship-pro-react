import axiosClient from './config';

export type SchoolStudentLoginCode = {
  id: number;
  code: string | null;
  status: 'active' | 'invalidated' | string;
  issued_at?: string | null;
};

export type SchoolStudentLoginCodesPayload = {
  codes: SchoolStudentLoginCode[];
};

const base = (schoolId: number, studentId: number | string) =>
  `/api/v1/schools/${schoolId}/students/${studentId}/student_login_codes`;

export function listSchoolStudentLoginCodes(schoolId: number, studentId: number | string) {
  return axiosClient.get<{ data: SchoolStudentLoginCodesPayload }>(base(schoolId, studentId));
}

export async function regenerateSchoolStudentLoginCode(
  schoolId: number,
  studentId: number | string
): Promise<{ code: string }> {
  const res = await axiosClient.post<{ data: { code: string } }>(base(schoolId, studentId) + '/regenerate');
  const code = res.data?.data?.code || (res.headers['x-student-login-code'] as string | undefined);
  if (!code) {
    throw new Error('Régénération impossible');
  }
  return { code };
}
