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
 * Revoke a shareable link
 */
export const revokeBadgeCartographyShare = async (shareId: number): Promise<void> => {
  await axiosClient.delete(`/api/v1/badges/cartography/shares/${shareId}`);
};

