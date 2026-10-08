import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getSelectedStudentsBadgeCartography } from '../../api/BadgeCartography';
import { Badge } from '../../types';
import { mapBackendUserBadgeToBadge } from '../../utils/badgeMapper';
import { translateRole } from '../../utils/roleTranslations';
import { displayCivilLabel, displayPersonName } from '../../utils/civilDataErased';
import BadgeCard from '../Badges/BadgeCard';
import CompetencesOrienterProgressCard from '../Badges/CompetencesOrienterProgressCard';
import BadgeAttributionsModal from '../Modals/BadgeAttributionsModal';
import { isSeriesWithCompetenceProgress } from '../../constants/badgeAxes';
import { isCpsCatalog, isSoftSkillsCatalog } from '../../constants/catalogSeries';
import { getLevelLabel } from '../../utils/badgeLevelLabels';
import './PublicBadgeCartography.css';

function normalizeLevel(level: string | undefined): string {
  if (!level) return 'Niveau 1';
  if (level.startsWith('Niveau')) return level;
  const num = level.replace('level_', '');
  return `Niveau ${num || '1'}`;
}

const LEVEL_SECTION_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444'] as const;

/** Series identity for carto helpers — catalog_key only (C2/C16). */
const seriesIdentity = (badge?: {
  catalog_key?: string | null;
  badge_series_id?: number | null;
  series?: string | null;
}): string =>
  badge?.catalog_key ||
  (badge?.badge_series_id != null ? String(badge.badge_series_id) : '') ||
  '';

const levelNumbersForSeriesSet = (seriesKeys: string[]): number[] => {
  if (seriesKeys.length === 0) return [1, 2, 3, 4];
  const onlyTwoLevel = seriesKeys.every(
    (s) => isSoftSkillsCatalog({ catalog_key: s }) || isCpsCatalog({ catalog_key: s })
  );
  return onlyTwoLevel ? [1, 2] : [1, 2, 3, 4];
};

const SelectedStudentsBadgeCartography: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [badges, setBadges] = useState<Badge[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [shareInfo, setShareInfo] = useState<any>(null);
  const [rawAttributions, setRawAttributions] = useState<any[]>([]); // Store raw attribution data
  const [selectedBadge, setSelectedBadge] = useState<Badge | null>(null);
  const [isAttributionsModalOpen, setIsAttributionsModalOpen] = useState(false);

  useEffect(() => {
    if (!token) {
      setError('Token manquant');
      setIsLoading(false);
      return;
    }

    const fetchCartography = async () => {
      try {
        setIsLoading(true);
        const data = await getSelectedStudentsBadgeCartography(token);
        
        if (data.error) {
          setError(data.error);
          return;
        }

        setShareInfo({
          ...data.share,
          filters: data.filters,
          context: data.context
        });
        
        // Store raw attributions data for use in modal
        setRawAttributions(data.badges || []);
        
        // Transform backend badges to frontend format
        const transformedBadges = data.badges.map((badgeData: any) => {
          return mapBackendUserBadgeToBadge(badgeData);
        });

        setBadges(transformedBadges);
      } catch (err: any) {
        console.error('Error fetching selected students cartography:', err);
        setError(err.response?.data?.error || 'Erreur lors du chargement de la cartographie');
      } finally {
        setIsLoading(false);
      }
    };

    fetchCartography();
  }, [token]);

  // Count attributions per badge (name + level combination)
  const badgeAttributionCounts = React.useMemo(() => {
    const counts: Record<string, number> = {};
    badges.forEach((badge) => {
      // Create a unique key from badge name and level
      const key = `${badge.name}|${badge.level}`;
      counts[key] = (counts[key] || 0) + 1;
    });
    return counts;
  }, [badges]);

  // Group badges by level and deduplicate (show unique badge name + level combinations)
  const badgesByLevel = React.useMemo(() => {
    const grouped: Record<string, Badge[]> = {};
    const seen = new Set<string>();
    
    badges.forEach((badge) => {
      const key = `${badge.name}|${badge.level}`;
      
      // Only add unique badge (name + level) to the group
      if (!seen.has(key)) {
        seen.add(key);
        
        const groupKey = badge.level; // "Niveau 1", "Niveau 2", etc.
        
        if (!grouped[groupKey]) {
          grouped[groupKey] = [];
        }
        grouped[groupKey].push(badge);
      }
    });
    
    return grouped;
  }, [badges]);

  const progressItemsByLevel = React.useMemo(() => {
    const progressRaw = rawAttributions.filter((item: any) => {
      const id = seriesIdentity(item?.badge);
      return id && isSeriesWithCompetenceProgress(id);
    });
    if (progressRaw.length === 0) return {} as Record<string, Array<{ badge: Badge; fullExpertiseNames: string[]; receivedExpertiseNames: string[] }>>;
    const groupKey = (item: any) => `${item?.badge?.name ?? ''}|${normalizeLevel(item?.badge?.level)}`;
    const groups = new Map<string, any[]>();
    progressRaw.forEach((item: any) => {
      const key = groupKey(item);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(item);
    });
    const list: Array<{ badge: Badge; fullExpertiseNames: string[]; receivedExpertiseNames: string[] }> = [];
    groups.forEach((groupItems) => {
      const first = groupItems[0];
      const expertises = first?.badge?.expertises ?? [];
      const fullExpertiseNames = expertises.map((e: any) => (typeof e === 'string' ? e : e?.name ?? '')).filter(Boolean);
      const receivedSet = new Set<string>();
      groupItems.forEach((ub: any) => {
        (ub.skills_indicated || []).forEach((s: string) => {
          if (fullExpertiseNames.includes(s)) receivedSet.add(s);
        });
      });
      const receivedExpertiseNames = Array.from(receivedSet);
      const badge = mapBackendUserBadgeToBadge(first);
      list.push({ badge, fullExpertiseNames, receivedExpertiseNames });
    });
    const byLevel: Record<string, typeof list> = {};
    list.forEach((item) => {
      const levelKey = item.badge.level;
      if (!byLevel[levelKey]) byLevel[levelKey] = [];
      byLevel[levelKey].push(item);
    });
    return byLevel;
  }, [rawAttributions]);

  const normalBadgesByLevel = React.useMemo(() => {
    const levelKeys = levelNumbersForSeriesSet(
      Array.from(new Set(badges.map((b) => seriesIdentity(b)).filter(Boolean)))
    ).map((n) => `Niveau ${n}`);
    const progressKeysByLevel: Record<string, Set<string>> = {};
    levelKeys.forEach((level) => {
      const set = new Set<string>();
      (progressItemsByLevel[level] || []).forEach((item) => set.add(`${item.badge.name}|${item.badge.level}`));
      progressKeysByLevel[level] = set;
    });
    const result: Record<string, Badge[]> = {};
    levelKeys.forEach((level) => {
      const progressSet = progressKeysByLevel[level];
      result[level] = (badgesByLevel[level] || []).filter((b) => !progressSet.has(`${b.name}|${b.level}`));
    });
    return result;
  }, [badges, badgesByLevel, progressItemsByLevel]);

  const sections = React.useMemo(() => {
    const seriesNames = Array.from(new Set(badges.map((b) => seriesIdentity(b)).filter(Boolean)));
    const labelSeries = seriesNames[0] || '';
    return levelNumbersForSeriesSet(seriesNames).map((n) => ({
      key: `Niveau ${n}`,
      label: labelSeries ? getLevelLabel(labelSeries, String(n)) : `Niveau ${n}`,
      color: LEVEL_SECTION_COLORS[n - 1],
      icon: null as null,
    }));
  }, [badges]);

  if (isLoading) {
    return (
      <div className="public-cartography-container">
        <div className="public-cartography-loading">
          <i className="fas fa-spinner fa-spin"></i>
          <p>Chargement de la cartographie des étudiants sélectionnés...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="public-cartography-container">
        <div className="public-cartography-error">
          <i className="fas fa-exclamation-circle"></i>
          <h2>Erreur</h2>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  // Check if the share has expired (use date comparison, not string)
  const expiresAt = shareInfo?.share?.expires_at || shareInfo?.expires_at;
  const isExpired = expiresAt ? new Date(expiresAt) < new Date() : false;

  if (isExpired) {
    return (
      <div className="public-cartography-container">
        <div className="public-cartography-error">
          <i className="fas fa-clock"></i>
          <h2>Lien expiré</h2>
          <p>Ce lien de partage a expiré le {new Date(expiresAt).toLocaleDateString('fr-FR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })}.</p>
          <p>Veuillez demander un nouveau lien de partage.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="public-cartography-container">
      <div className="public-cartography-header">
        <h1>Cartographie des preuves de compétences - <span className="capitalize">{displayCivilLabel(shareInfo?.context?.student?.holder_display, displayPersonName(shareInfo?.context?.student?.full_name, shareInfo?.context?.student?.first_name, shareInfo?.context?.student?.last_name))}</span></h1>
      </div>

      <div className="public-cartography-content">
        {badges.length === 0 ? (
          <div className="public-cartography-empty">
            <i className="fas fa-award"></i>
            <h4>Aucune preuve de compétences trouvée</h4>
            <p>Cette cartographie ne contient aucune preuve de compétences.</p>
          </div>
        ) : (
          sections.map((section) => {
            const progressItems = progressItemsByLevel[section.key] || [];
            const normalBadges = normalBadgesByLevel[section.key] || [];
            if (progressItems.length === 0 && normalBadges.length === 0) return null;

            const sectionLabel =
              progressItems.length > 0 && progressItems[0].badge.series
                ? getLevelLabel(progressItems[0].badge.series, section.key.replace('Niveau ', ''))
                : section.label;
            const totalCount = progressItems.length + normalBadges.length;

            return (
              <div key={section.key} className="level-divider">
                <div className="level-header">
                  <div className="level-title" style={{ color: section.color }}>
                    <div className="level-color-square" style={{ backgroundColor: section.color }}></div>
                    <span>{sectionLabel}</span>
                  </div>
                  <div className="level-count">
                    {totalCount} compétence{totalCount > 1 ? 's' : ''}
                  </div>
                </div>

                <div className="badges-grid">
                  {progressItems.map((item) => (
                    <CompetencesOrienterProgressCard
                      key={`progress-${item.badge.name}|${item.badge.level}`}
                      badge={item.badge}
                      fullExpertiseNames={item.fullExpertiseNames}
                      receivedExpertiseNames={item.receivedExpertiseNames}
                      onClick={() => {
                        setSelectedBadge(item.badge);
                        setIsAttributionsModalOpen(true);
                      }}
                    />
                  ))}
                  {normalBadges.map((badge) => {
                    const badgeKey = `${badge.name}|${badge.level}`;
                    const attributionCount = badgeAttributionCounts[badgeKey] || 0;
                    return (
                      <BadgeCard
                        key={`${badge.name}-${badge.level}-${badge.id}`}
                        badge={badge}
                        onClick={() => {
                          setSelectedBadge(badge);
                          setIsAttributionsModalOpen(true);
                        }}
                        onEdit={() => {}}
                        onDelete={() => {}}
                        attributionCount={attributionCount}
                        showClickHint={true}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Badge Attributions Modal */}
      {selectedBadge && (() => {
        // Filter attributions for the selected badge
        const levelKey = selectedBadge.level.replace('Niveau ', 'level_');
        const filteredAttributions = rawAttributions
          .filter((attr: any) => {
            const badge = attr.badge;
            return badge && 
                   badge.name === selectedBadge.name && 
                   (badge.level === levelKey || badge.level === selectedBadge.level);
          })
          .map((attr: any) => ({
            id: attr.id,
            badge: {
              id: attr.badge.id,
              name: attr.badge.name,
              level: attr.badge.level,
              series: attr.badge.series,
              image_url: attr.badge.image_url || null
            },
            receiver: {
              id: attr.receiver.id,
              full_name: attr.receiver.full_name,
              // Famille A (annexe §8bis) : affichage via holder_display uniquement.
              holder_display: displayCivilLabel(
                attr.receiver.holder_display,
                displayPersonName(attr.receiver.full_name, attr.receiver.first_name, attr.receiver.last_name)
              ),
              email: attr.receiver.email || '',
              is_deleted: attr.receiver.is_deleted || false
            },
            sender: {
              id: attr.sender.id,
              full_name: displayPersonName(attr.sender.full_name, attr.sender.first_name, attr.sender.last_name),
              email: attr.sender.email || '',
              role: translateRole(attr.sender.role) || '',
              is_deleted: attr.sender.is_deleted || false
            },
            project: attr.project ? {
              id: attr.project.id,
              title: attr.project.title,
              description: attr.project.description || null
            } : null,
            event: attr.event ? {
              id: attr.event.id,
              title: attr.event.title,
              description: attr.event.description || null
            } : null,
            assigned_at: attr.assigned_at,
            comment: attr.comment || null,
            documents: attr.documents || []
          }));

        // Get badge image from first attribution if available
        const badgeImage = filteredAttributions.length > 0 
          ? filteredAttributions[0].badge?.image_url || null
          : null;

        return (
          <BadgeAttributionsModal
            isOpen={isAttributionsModalOpen}
            onClose={() => {
              setIsAttributionsModalOpen(false);
              setSelectedBadge(null);
            }}
            badgeName={selectedBadge.name}
            badgeLevel={selectedBadge.level}
            badgeId={selectedBadge.id}
            preloadedAttributions={filteredAttributions}
            badgeImageUrl={badgeImage}
          />
        );
      })()}
    </div>
  );
};

export default SelectedStudentsBadgeCartography;



