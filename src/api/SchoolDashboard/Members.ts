import axiosClient from "../config";

export function getSchoolMembersAccepted(SchoolId: number) {
    // Use members endpoint to include staff + students; filtering is done on the frontend
    return axiosClient.get(`/api/v1/schools/${SchoolId}/members?status=confirmed`);
}

export function getSchoolMembersPending(SchoolId: number) {
    return axiosClient.get(`/api/v1/schools/${SchoolId}/members?status=pending`);
}

export function addSchoolMember(SchoolId: number, memberData: { user_id: number; role: string; }) {
    return axiosClient.post(`/api/v1/schools/${SchoolId}/members`, memberData);
}

export function removeSchoolMember(SchoolId: number, memberId: number) {
    return axiosClient.delete(`/api/v1/schools/${SchoolId}/members/${memberId}`);
}

export function updateSchoolMemberRole(SchoolId: number, memberId: number, newRole: string) {
    return axiosClient.put(`/api/v1/schools/${SchoolId}/members/${memberId}`, { role: newRole });
}

export function acceptSchoolMember(SchoolId: number, memberId: number, role?: string) {
    const payload: { status: string; role?: string } = { status: "confirmed" };
    if (role) {
        payload.role = role;
    }
    return axiosClient.put(`/api/v1/schools/${SchoolId}/members/${memberId}`, payload);
}

export function createSchoolStudent(schoolId: number, studentData: {
    first_name: string;
    last_name: string;
    birthday: string;
    user_role: string;
    role: string;
}) {
    return axiosClient.post(`/api/v1/schools/${schoolId}/members`, studentData);
}

export function getSchoolVolunteers(schoolId: number, status: string = 'confirmed') {
    return axiosClient.get(`/api/v1/schools/${schoolId}/volunteers?status=${status}`);
}