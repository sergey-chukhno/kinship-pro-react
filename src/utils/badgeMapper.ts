import { Badge } from '../types';
import { isSoftSkillsSeries } from '../constants/badgeAxes';
import { SOFT_SKILLS_SERIES_NAME } from './badgeLevelLabels';
import { getLocalBadgeImage } from './badgeImages';
import { getBadgeLevelDisplayLabel } from './badgeLevelLabels';

/**
 * Convertit le nom de série backend en nom d'affichage
 */
export const displaySeries = (seriesName?: string): string => {
  if (!seriesName || isSoftSkillsSeries(seriesName)) return SOFT_SKILLS_SERIES_NAME;
  return seriesName;
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
  const badgeSeries = badgeSeriesRaw;
  const badgeLevel = badge.level ? badge.level.replace('level_', '') : '1';

  const badgeLevelKey = badge.level || 'level_1';
  const imageUrl = badge.image_url || getLocalBadgeImage(badgeName, badgeLevelKey, badgeSeriesRaw) || '/TouKouLeur-Jaune.png';

  return {
    id: userBadge.id?.toString() || `badge-${Date.now()}-${Math.random()}`,
    name: badgeName,
    description: badge.description || '',
    level: getBadgeLevelDisplayLabel(badgeSeriesRaw, badge.level),
    levelClass: `level-${badgeLevel}`,
    icon: imageUrl,
    image: imageUrl,
    category: badgeSeriesRaw,
    series: badgeSeries,
    recipients: 0,
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
