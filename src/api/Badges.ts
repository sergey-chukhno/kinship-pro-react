import apiClient from './config';
import { BadgeAPI, BadgeSkillAPI, BadgeAssignmentResponse } from '../types';

export interface BadgeFilters {
  series?: string;
  level?: string;
  name?: string;
}

export interface AssignBadgeData {
  badge_id: number;
  recipient_ids: number[];
  badge_skill_ids?: number[];
  comment?: string;
  organization_id?: number;
}

/**
 * Récupère la liste de tous les badges disponibles
 * @param filters - Filtres optionnels (series, level, name)
 * @returns Promise<BadgeAPI[]>
 */
export const getBadges = async (filters?: BadgeFilters): Promise<BadgeAPI[]> => {
  const params = new URLSearchParams();
  
  if (filters?.series) {
    params.append('series', filters.series);
  }
  if (filters?.level) {
    params.append('level', filters.level);
  }
  if (filters?.name) {
    params.append('name', filters.name);
  }
  
  const queryString = params.toString();
  const url = `/api/v1/badges${queryString ? `?${queryString}` : ''}`;
  
  const response = await apiClient.get(url);
  return response.data || [];
};

/**
 * Récupère la liste des badges attribués dans un projet
 * @param projectId - ID du projet
 * @returns Promise<any[]>
 */
export const getProjectBadges = async (projectId: number): Promise<any[]> => {
  const response = await apiClient.get(`/api/v1/projects/${projectId}/badges`);
  return response.data?.data || [];
};

/**
 * Attribue un badge à un ou plusieurs membres du projet
 * @param projectId - ID du projet
 * @param badgeData - Données d'attribution
 * @param files - Fichiers optionnels à attacher (array de File)
 * @returns Promise<BadgeAssignmentResponse>
 */
export const assignBadge = async (
  projectId: number,
  badgeData: AssignBadgeData,
  files?: File[]
): Promise<BadgeAssignmentResponse> => {
  // If files are provided, use multipart/form-data
  if (files && files.length > 0) {
    const formData = new FormData();
    
    formData.append('badge_id', badgeData.badge_id.toString());
    badgeData.recipient_ids.forEach((id) => {
      formData.append('recipient_ids[]', id.toString());
    });
    
    if (badgeData.badge_skill_ids && badgeData.badge_skill_ids.length > 0) {
      badgeData.badge_skill_ids.forEach((id) => {
        formData.append('badge_skill_ids[]', id.toString());
      });
    }
    
    if (badgeData.comment) {
      formData.append('comment', badgeData.comment);
    }
    
    if (badgeData.organization_id) {
      formData.append('organization_id', badgeData.organization_id.toString());
    }
    
    // Append files
    files.forEach((file) => {
      formData.append('documents[]', file);
    });
    
    const response = await apiClient.post(
      `/api/v1/projects/${projectId}/badges`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    
    return response.data;
  } else {
    // Use JSON if no files
    const response = await apiClient.post(
      `/api/v1/projects/${projectId}/badges`,
      badgeData
    );
    
    return response.data;
  }
};

