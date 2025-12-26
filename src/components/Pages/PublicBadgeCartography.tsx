import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { getPublicBadgeCartography } from '../../api/BadgeCartography';
import { Badge } from '../../types';
import { mapBackendUserBadgeToBadge } from '../../utils/badgeMapper';
import BadgeCard from '../Badges/BadgeCard';
import './PublicBadgeCartography.css';

const PublicBadgeCartography: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [badges, setBadges] = useState<Badge[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [shareInfo, setShareInfo] = useState<any>(null);

  useEffect(() => {
    if (!token) {
      setError('Token manquant');
      setIsLoading(false);
      return;
    }

    const fetchCartography = async () => {
      try {
        setIsLoading(true);
        const data = await getPublicBadgeCartography(token);
        
        if (data.error) {
          setError(data.error);
          return;
        }

        setShareInfo({
          ...data.share,
          filters: data.filters,
          context: data.context
        });
        
        // Transform backend badges to frontend format
        const transformedBadges = data.badges.map((badgeData: any) => {
          return mapBackendUserBadgeToBadge(badgeData);
        });

        setBadges(transformedBadges);
      } catch (err: any) {
        console.error('Error fetching public cartography:', err);
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

  const sections = [
    { key: 'Niveau 1', label: 'Niveau 1 - Découverte', color: '#10b981', icon: null },
    { key: 'Niveau 2', label: 'Niveau 2 - Application', color: '#3b82f6', icon: null },
    { key: 'Niveau 3', label: 'Niveau 3 - Maîtrise', color: '#f59e0b', icon: null },
    { key: 'Niveau 4', label: 'Niveau 4 - Expertise', color: '#ef4444', icon: null }
  ];

  if (isLoading) {
    return (
      <div className="public-cartography-container">
        <div className="public-cartography-loading">
          <i className="fas fa-spinner fa-spin"></i>
          <p>Chargement de la cartographie...</p>
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

  return (
    <div className="public-cartography-container">
      <div className="public-cartography-header">
        <h1>Cartographie des badges</h1>
        {shareInfo && (
          <div className="public-cartography-meta">
            <p>
              <i className="fas fa-clock"></i>
              Expire le {new Date(shareInfo.expires_at).toLocaleDateString('fr-FR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
              })}
            </p>
          </div>
        )}
      </div>

      <div className="public-cartography-content">
        {badges.length === 0 ? (
          <div className="public-cartography-empty">
            <i className="fas fa-award"></i>
            <h4>Aucun badge trouvé</h4>
            <p>Cette cartographie ne contient aucun badge.</p>
          </div>
        ) : (
          sections.map((section) => {
            const sectionBadges = badgesByLevel[section.key] || [];
            if (sectionBadges.length === 0) return null;

            return (
              <div key={section.key} className="level-divider">
                <div className="level-header">
                  <div className="level-title" style={{ color: section.color }}>
                    <div className="level-color-square" style={{ backgroundColor: section.color }}></div>
                    <span>{section.label}</span>
                  </div>
                  <div className="level-count">
                    {sectionBadges.length} badge{sectionBadges.length > 1 ? 's' : ''}
                  </div>
                </div>

                <div className="badges-grid">
                  {sectionBadges.map((badge) => {
                    // Get attribution count for this badge (name + level)
                    const badgeKey = `${badge.name}|${badge.level}`;
                    const attributionCount = badgeAttributionCounts[badgeKey] || 0;
                    
                    return (
                      <BadgeCard
                        key={`${badge.name}-${badge.level}-${badge.id}`}
                        badge={badge}
                        onClick={() => {}} // No action needed for public view
                        onEdit={() => {}} // No edit in public view
                        onDelete={() => {}} // No delete in public view
                        attributionCount={attributionCount}
                        showClickHint={false} // Hide click hint on public shared page
                      />
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default PublicBadgeCartography;

