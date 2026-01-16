import axiosClient, { axiosClientWithoutToken } from './config';

/**
 * Create a shareable link for badge cartography
 */
export const createBadgeCartographyShare = async (filters: {
  series: string;
  level: string;
  searchTerm: string;
}, context: {
  showingPageType: 'user' | 'pro' | 'edu' | 'teacher';
  organizationId?: number;
  organizationName?: string;
}): Promise<{ shareable_url: string; token: string; expires_at: string }> => {
  const response = await axiosClient.post('/api/v1/badges/cartography/share', {
    filters,
    context
  });
  return response.data;
};

/**
 * Get public badge cartography data by token
 * Uses axiosClientWithoutToken since this is a public endpoint
 */
export const getPublicBadgeCartography = async (token: string): Promise<any> => {
  const response = await axiosClientWithoutToken.get(`/badge-cartography/${token}`);
  return response.data;
};

/**
 * Create a shareable link for a specific student's badge cartography
 */
export const createStudentBadgeCartographyShare = async (
  schoolId: number,
  studentId: string | number
): Promise<{ shareable_url: string; token: string; expires_at: string }> => {
  const response = await axiosClient.post(`/api/v1/schools/${schoolId}/badges/cartography/share`, {
    filters: {
      student_id: studentId.toString()
    }
  });
  return response.data;
};

/**
 * Create a shareable link for multiple selected students' badge cartography
 */
export const createSelectedStudentsBadgeCartographyShare = async (
  schoolId: number,
  studentIds: (string | number)[]
): Promise<{ shareable_url: string; token: string; expires_at: string }> => {
  const response = await axiosClient.post(`/api/v1/schools/${schoolId}/badges/cartography/share`, {
    filters: {
      student_ids: studentIds.map(id => id.toString())
    }
  });
  return response.data;
};

/**
 * Revoke a shareable link
 */
export const revokeBadgeCartographyShare = async (shareId: number): Promise<void> => {
  await axiosClient.delete(`/api/v1/badges/cartography/shares/${shareId}`);
};

