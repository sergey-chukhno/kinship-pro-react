import axiosClient from './config';

const base = (schoolId: number, studentId: number | string) =>
  `/api/v1/schools/${schoolId}/students/${studentId}`;

export function updateStudentGuardianEmail(
  schoolId: number,
  studentId: number | string,
  guardianEmail: string
) {
  return axiosClient.patch<{ data: { id: number; guardian_email: string } }>(
    `${base(schoolId, studentId)}/guardian_email`,
    { guardian_email: guardianEmail }
  );
}

export function sendStudentGuardianInvitation(schoolId: number, studentId: number | string) {
  return axiosClient.post<{ message: string; data: { id: number; guardian_email: string } }>(
    `${base(schoolId, studentId)}/guardian_invitation`
  );
}
