import axiosClient from "../config";

export function getSchoolLevels(SchoolId: number, page: number = 1, per_page: number = 12) {
    return axiosClient.get(`/api/v1/schools/${SchoolId}/levels?page=${page}&per_page=${per_page}`);
}

export function getSchoolMembersPending(SchoolId: number) {
    return axiosClient.get(`/api/v1/schools/${SchoolId}/members?status=pending`);
}

export function addSchoolLevel(SchoolId: number, levelData: { level: { name: string; level: string; teacher_ids?: number[] } }) {
    return axiosClient.post(`/api/v1/schools/${SchoolId}/levels`, levelData);
}

export function removeSchoolMember(SchoolId: number, memberId: number) {
    return axiosClient.delete(`/api/v1/schools/${SchoolId}/members/${memberId}`);
}

export function updateSchoolMemberRole(SchoolId: number, memberId: number, newRole: string) {
    return axiosClient.put(`/api/v1/schools/${SchoolId}/members/${memberId}`, { role: newRole });
}

export function acceptSchoolMember(SchoolId: number, memberId: number) {
    return axiosClient.put(`/api/v1/schools/${SchoolId}/members/${memberId}`, {status: "confirmed"});
}

export function createLevelStudent(schoolId: number, levelId: number, studentData: {
    student: {
        first_name: string;
        last_name: string;
        email?: string;
        birthday: string;
        role: string;
        role_additional_information?: string;
    }
}) {
    return axiosClient.post(`/api/v1/schools/${schoolId}/levels/${levelId}/students`, studentData);
}

// Add an existing student to a class (level) using their email/role
export function addExistingStudentToLevel(schoolId: number, levelId: number, studentData: {
    student: {
        email: string;
        role: string;
        first_name?: string;
        last_name?: string;
    }
}) {
    return axiosClient.post(`/api/v1/schools/${schoolId}/levels/${levelId}/students`, studentData);
}

export function getLevelStudents(schoolId: number, levelId: number, perPage: number = 100) {
    return axiosClient.get(`/api/v1/schools/${schoolId}/levels/${levelId}/students`, {
        params: { per_page: perPage }
    });
}

export function getSchoolLevel(schoolId: number, levelId: number) {
    return axiosClient.get(`/api/v1/schools/${schoolId}/levels/${levelId}`);
}

export function deleteSchoolLevel(schoolId: number, levelId: number) {
    return axiosClient.delete(`/api/v1/schools/${schoolId}/levels/${levelId}`);
}

export function updateSchoolLevel(schoolId: number, levelId: number, levelData: { level: { name: string; level: string; teacher_ids?: number[] } }) {
    return axiosClient.patch(`/api/v1/schools/${schoolId}/levels/${levelId}`, levelData);
}