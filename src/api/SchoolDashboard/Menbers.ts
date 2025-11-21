import axiosClient from "../config";

export function getSchoolMembersAccepted(SchoolId: number) {
    return axiosClient.get(`/api/v1/companies/${SchoolId}/members?status=confirmed`);
}

export function getSchoolMembersPending(SchoolId: number) {
    return axiosClient.get(`/api/v1/companies/${SchoolId}/members?status=pending`);
}

export function addSchoolMember(SchoolId: number, memberData: { user_id: number; role: string; }) {
    return axiosClient.post(`/api/v1/companies/${SchoolId}/members`, memberData);
}

export function removeSchoolMember(SchoolId: number, memberId: number) {
    return axiosClient.delete(`/api/v1/companies/${SchoolId}/members/${memberId}`);
}

export function updateSchoolMemberRole(SchoolId: number, memberId: number, newRole: string) {
    return axiosClient.put(`/api/v1/companies/${SchoolId}/members/${memberId}`, { role: newRole });
}

export function acceptSchoolMember(SchoolId: number, memberId: number) {
    return axiosClient.put(`/api/v1/companies/${SchoolId}/members/${memberId}`, {status: "confirmed"});
}