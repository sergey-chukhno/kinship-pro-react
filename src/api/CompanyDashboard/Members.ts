import axiosClient from "../config";

export function getCompanyMembersAccepted(companyId: number, perPage: number = 12, options?: { includeDetails?: boolean }) {
    return axiosClient.get(`/api/v1/companies/${companyId}/members`, {
        params: {
            status: 'confirmed',
            per_page: perPage,
            include_details: options?.includeDetails
        }
    });
}

export function getCompanyMembersPending(companyId: number) {
    return axiosClient.get(`/api/v1/companies/${companyId}/members?status=pending`);
}

export function addCompanyMember(
  companyId: number, 
  memberData: {
    email?: string;
    first_name: string;
    last_name: string;
    birthday?: string;  // Required if no email
    role?: string;      // Company role (member, admin, superadmin) - defaults to 'member'
    user_role?: string; // System role (voluntary, employee, etc.)
  }
) {
    return axiosClient.post(`/api/v1/companies/${companyId}/members`, memberData);
}

export function removeCompanyMember(companyId: number, memberId: number) {
    return axiosClient.delete(`/api/v1/companies/${companyId}/members/${memberId}`);
}

export function updateCompanyMemberRole(companyId: number, memberId: number, newRole: string) {
    return axiosClient.put(`/api/v1/companies/${companyId}/members/${memberId}`, { role: newRole });
}

export function acceptMember(companyId: number, memberId: number, role?: string) {
    const payload: { status: string; role?: string } = { status: "confirmed" };
    if (role) {
        payload.role = role;
    }
    return axiosClient.put(`/api/v1/companies/${companyId}/members/${memberId}`, payload);
}