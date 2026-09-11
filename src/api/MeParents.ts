import axiosClient from './axiosClient';

export type MeParentLink = {
  id: number;
  parent_first_name: string | null;
  parent_last_name: string | null;
  suspended: boolean;
  status_label: string;
};

export type MeParentsMeta = {
  digital_majority_reached: boolean;
  can_toggle_follow: boolean;
  follow_active: boolean;
  shareable_code?: string | null;
};

export type MeParentsResponse = {
  data: MeParentLink[];
  meta: MeParentsMeta;
};

export function listMeParents() {
  return axiosClient.get<MeParentsResponse>('/api/v1/me/parents');
}

export function updateMeParentsFollow(active: boolean) {
  return axiosClient.patch<MeParentsResponse>('/api/v1/me/parents/follow', { active });
}
