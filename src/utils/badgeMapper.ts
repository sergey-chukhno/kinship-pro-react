import { Badge } from '../types';
import { getLocalBadgeImage } from './badgeImages';

/**
 * Convertit le nom de série backend en nom d'affichage
 */
export const displaySeries = (seriesName?: string): string => {
  return seriesName?.toLowerCase().includes('toukouleur') ? 'Série Soft Skills 4LAB' : seriesName || 'Série Soft Skills 4LAB';
};

/**
 * Mappe un UserBadge du backend vers le format Badge du frontend
 * @param userBadge - Données UserBadge du backend
 * @returns Badge formaté pour l'affichage
 */
export const mapBackendUserBadgeToBadge = (userBadge: any): Badge => {
  const badge = userBadge?.badge || {};
  const badgeName = badge.name || 'Badge';
  const badgeSeriesRaw = badge.series || '';
  // Use exact database series name for filtering (not normalized)
  const badgeSeries = badgeSeriesRaw; // Keep exact database series name
  const badgeLevel = badge.level ? badge.level.replace('level_', '') : '1';
  
  // Déterminer l'image : backend image_url > mapping local > placeholder
  const badgeLevelKey = badge.level || 'level_1';
  const imageUrl = badge.image_url || getLocalBadgeImage(badgeName, badgeLevelKey, badgeSeriesRaw) || '/TouKouLeur-Jaune.png';
  
  // Construire le format Badge attendu par Badges.tsx
  return {
    id: userBadge.id?.toString() || `badge-${Date.now()}-${Math.random()}`,
    name: badgeName,
    description: badge.description || '',
    level: `Niveau ${badgeLevel}`,
    levelClass: `level-${badgeLevel}`,
    icon: imageUrl,
    image: imageUrl,
    category: badgeSeriesRaw, // Garder l'original pour l'affichage
    series: badgeSeries, // Use exact database series name for filtering
    recipients: 0, // Non utilisé dans la cartographie
    created: userBadge.assigned_at || userBadge.created_at || new Date().toISOString(),
    domains: badge.domains || [],
    expertises: badge.expertises || [],
    recipients_list: [],
    files: userBadge.documents?.map((doc: any) => ({
      name: doc.filename || 'Document',
      type: doc.content_type || 'file',
      size: doc.byte_size ? `${(doc.byte_size / 1024).toFixed(1)} KB` : '0 KB',
    })) || [],
    requirements: [],
    skills: badge.expertises?.map((exp: any) => exp.name || exp) || [],
  };
};

