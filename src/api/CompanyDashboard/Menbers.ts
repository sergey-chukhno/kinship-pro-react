import axiosClient from "../config";

export function getCompanyMembersAccepted(companyId: number) {
    return axiosClient.get(`/api/v1/companies/${companyId}/members?status=confirmed`);
}

export function getCompanyMembersPending(companyId: number) {
    return axiosClient.get(`/api/v1/companies/${companyId}/members?status=pending`);
}

export function addCompanyMember(companyId: number, memberData: { user_id: number; role: string; }) {
    return axiosClient.post(`/api/v1/companies/${companyId}/members`, memberData);
}

export function removeCompanyMember(companyId: number, memberId: number) {
    return axiosClient.delete(`/api/v1/companies/${companyId}/members/${memberId}`);
}

export function updateCompanyMemberRole(companyId: number, memberId: number, newRole: string) {
    return axiosClient.put(`/api/v1/companies/${companyId}/members/${memberId}`, { role: newRole });
}

export function acceptMember(companyId: number, memberId: number) {
    return axiosClient.put(`/api/v1/companies/${companyId}/members/${memberId}`, {status: "confirmed"});
}