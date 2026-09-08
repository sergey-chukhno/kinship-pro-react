import axiosClient, { axiosClientWithoutToken } from './config';

export type FamillePageData = {
  school_name: string;
  school_city: string;
};

export type ParentLink = {
  id: number;
  linked_user_id: number;
  first_name: string;
  last_name: string;
  suspended: boolean;
};

export function getFamillePage(token: string) {
  return axiosClientWithoutToken.get<{ data: FamillePageData }>(`/api/v1/famille/${token}`);
}

export function listParentLinks() {
  return axiosClient.get<{ data: ParentLink[] }>('/api/v1/parent_links');
}

export function createParentLink(payload: { code: string; birthday: string }) {
  return axiosClient.post<{ message: string; data: ParentLink }>('/api/v1/parent_links', payload);
}

export function deleteParentLink(id: number) {
  return axiosClient.delete<{ message: string }>(`/api/v1/parent_links/${id}`);
}
