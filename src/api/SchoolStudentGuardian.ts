import axiosClient from './config';

export type StudentGuardianPayload = {
  id: number;
  guardian_email: string | null;
  pending_guardian_email: string | null;
};

const base = (schoolId: number, studentId: number | string) =>
  `/api/v1/schools/${schoolId}/students/${studentId}`;

export function updateStudentGuardianEmail(
  schoolId: number,
  studentId: number | string,
  guardianEmail: string
) {
  return axiosClient.patch<{ data: StudentGuardianPayload }>(
    `${base(schoolId, studentId)}/guardian_email`,
    { guardian_email: guardianEmail }
  );
}

export function sendStudentGuardianInvitation(schoolId: number, studentId: number | string) {
  return axiosClient.post<{ message: string; data: StudentGuardianPayload }>(
    `${base(schoolId, studentId)}/guardian_invitation`
  );
}
