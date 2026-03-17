import axiosClient from '../config';

export type CompanyGroup = {
  id: number;
  name: string;
  created_at: string;
  members_count?: number;
  created_by?: { id: number; full_name: string; email: string; avatar_url?: string | null } | null;
  members?: Array<{ id: number; full_name: string; email: string; avatar_url?: string | null }>;
};

export function getCompanyGroups(companyId: number) {
  return axiosClient.get(`/api/v1/companies/${companyId}/groups`);
}

export function getCompanyGroup(companyId: number, groupId: number) {
  return axiosClient.get(`/api/v1/companies/${companyId}/groups/${groupId}`);
}

export function createCompanyGroup(companyId: number, payload: { group: { name: string; member_ids: number[] } }) {
  return axiosClient.post(`/api/v1/companies/${companyId}/groups`, payload);
}

export function updateCompanyGroup(companyId: number, groupId: number, payload: { group: { name: string; member_ids: number[] } }) {
  return axiosClient.patch(`/api/v1/companies/${companyId}/groups/${groupId}`, payload);
}

export function deleteCompanyGroup(companyId: number, groupId: number) {
  return axiosClient.delete(`/api/v1/companies/${companyId}/groups/${groupId}`);
}

