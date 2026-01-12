import React, { useState, useEffect, useMemo } from 'react';
import { getBadges } from '../../api/Badges';
import { BadgeAPI } from '../../types';
import { getLevelLabel } from '../../utils/badgeLevelLabels';
import { getLocalBadgeImage } from '../../utils/badgeImages';
import './BadgeExplorer.css';

interface BadgeExplorerProps {
  onBack: () => void;
}

// Mapping display names to database series names
const SERIES_DISPLAY_NAMES: Record<string, string> = {
  'Série Soft Skills 4LAB': 'Série TouKouLeur',
  'Série Parcours des possibles': 'Série Parcours des possibles',
  'Série Parcours professionnel': 'Série Parcours professionnel',
  'Série Audiovisuelle': 'Série Audiovisuelle',
};

// Reverse mapping: DB name to display name
const SERIES_DB_TO_DISPLAY: Record<string, string> = {
  'Série TouKouLeur': 'Série Soft Skills 4LAB',
  'Série Parcours des possibles': 'Série Parcours des possibles',
  'Série Parcours professionnel': 'Série Parcours professionnel',
  'Série Audiovisuelle': 'Série Audiovisuelle',
};

// Series descriptions mapping
const SERIES_DESCRIPTIONS: Record<string, string> = {
  'Série TouKouLeur': "Les badges 4LAB reconnaissent et valorisent les soft skills mises en oeuvre dans le cadre d'un projet individuel ou collectif",
  'Série Parcours des possibles': "La série du Centre des possibles permet de valoriser les compétences et talents des jeunes, pour les guider au mieux dans leur choix de développement de soi, de leurs compétences et de leur connaissance des métiers",
  'Série Parcours professionnel': "La Série Parcours professionnel vise à reconnaître et valoriser les expériences acquises tout au long du parcours professionnel, quels que soient le contexte ou le statut (emploi, stage, alternance, bénévolat, mission ponctuelle, etc.).",
  'Série Audiovisuelle': '', // Empty - don't display description
};

const BadgeExplorer: React.FC<BadgeExplorerProps> = ({ onBack }) => {
  // Use DB series name for API calls, default to TouKouLeur
  const [selectedSeries, setSelectedSeries] = useState<string>('Série TouKouLeur');
  const [badges, setBadges] = useState<BadgeAPI[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedDescriptions, setExpandedDescriptions] = useState<{ [key: string]: boolean }>({});

  // Fetch badges from API
  useEffect(() => {
    const fetchBadges = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const fetchedBadges = await getBadges({ series: selectedSeries });
        setBadges(fetchedBadges);
      } catch (err: any) {
        console.error('Error fetching badges:', err);
        setError('Erreur lors du chargement des badges');
        setBadges([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchBadges();
  }, [selectedSeries]);

  const toggleDescription = (badgeId: number) => {
    setExpandedDescriptions(prev => ({
      ...prev,
      [badgeId]: !prev[badgeId]
    }));
  };

  // Get series info from badges and mappings
  const seriesInfo = useMemo(() => {
    if (badges.length === 0) {
      return {
        title: SERIES_DB_TO_DISPLAY[selectedSeries] || selectedSeries,
        description: SERIES_DESCRIPTIONS[selectedSeries] || '',
        stats: { badges: 0, domains: 0, levels: 0 }
      };
    }

    // Get title from first badge's series
    const title = SERIES_DB_TO_DISPLAY[badges[0].series] || badges[0].series;
    
    // Get description from mapping
    const description = SERIES_DESCRIPTIONS[selectedSeries] || '';

    // Calculate stats dynamically
    const badgesCount = badges.length;
    
    // Count unique domains
    const uniqueDomains = new Set<string>();
    badges.forEach(badge => {
      badge.domains?.forEach(domain => {
        if (domain.name) {
          uniqueDomains.add(domain.name);
        }
      });
    });
    const domainsCount = uniqueDomains.size;

    // Count unique levels
    const uniqueLevels = new Set<string>();
    badges.forEach(badge => {
      if (badge.level) {
        uniqueLevels.add(badge.level);
      }
    });
    const levelsCount = uniqueLevels.size;

    return {
      title,
      description,
      stats: {
        badges: badgesCount,
        domains: domainsCount,
        levels: levelsCount
      }
    };
  }, [badges, selectedSeries]);

  // Group badges by level
  const badgesByLevel = useMemo(() => {
    const grouped: Record<string, BadgeAPI[]> = {
      level_1: [],
      level_2: [],
      level_3: [],
      level_4: []
    };

    badges.forEach(badge => {
      if (badge.level && grouped[badge.level]) {
        grouped[badge.level].push(badge);
      }
    });

    return grouped;
  }, [badges]);

  // Handle series selection change
  const handleSeriesChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const displayName = event.target.value;
    const dbName = SERIES_DISPLAY_NAMES[displayName] || displayName;
    setSelectedSeries(dbName);
    // Reset expanded descriptions when changing series
    setExpandedDescriptions({});
  };

  // Render badge card
  const renderBadgeCard = (badge: BadgeAPI, index: number) => {
    const badgeId = badge.id;
    const isExpanded = expandedDescriptions[badgeId] || false;
    const imageUrl = getLocalBadgeImage(badge.name, badge.level, badge.series);
    const hasDescription = badge.description && badge.description.trim() !== '';

    return (
      <div key={badge.id} className="badge-explorer-card">
        {imageUrl && (
          <div className="badge-icon">
            <img src={imageUrl} alt={badge.name} className="badge-image" />
          </div>
        )}
        <div className="badge-info">
          <h4>{badge.name}</h4>
          {hasDescription && (
            <div className="badge-description">
              <p className={`description-text ${isExpanded ? 'expanded' : ''}`}>
                {badge.description}
              </p>
              <button 
                className="toggle-description" 
                onClick={() => toggleDescription(badgeId)}
              >
                {isExpanded ? 'Voir moins' : 'Voir plus'}
              </button>
            </div>
          )}
          <div className={`badge-level level-${badge.level?.replace('level_', '') || '1'}`}>
            {badge.level ? getLevelLabel(badge.series, badge.level.replace('level_', '')) : 'Niveau 1'}
          </div>
        </div>
      </div>
    );
  };

  // Render level section
  const renderLevelSection = (level: string, levelNumber: string) => {
    const levelBadges = badgesByLevel[level] || [];
    const levelLabel = getLevelLabel(selectedSeries, levelNumber);
    
    // Get level color indicator class
    const levelClass = `level-${levelNumber}`;

    return (
      <div key={level} className={`badge-series level-series ${levelClass}-series`}>
        <div className="series-header">
          <h3 className="series-title">
            {levelLabel} <span className={`level-color-indicator ${levelClass}`}></span>
          </h3>
        </div>
        <div className="badge-series-grid">
          {levelBadges.length > 0 ? (
            levelBadges.map((badge, index) => renderBadgeCard(badge, index))
          ) : (
            <div className="empty-level-message">
              <p>Aucun badge disponible pour ce niveau</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="badge-explorer-page">
      <div className="badge-explorer-header">
        <div className="explorer-header-top">
          <button 
            className="back-button"
            onClick={onBack}
            title="Revenir à la cartographie"
          >
            <i className="fas fa-arrow-left"></i>
          </button>
          <h1>{seriesInfo.title}</h1>
        </div>
        
        {/* Series selector dropdown */}
        <div className="series-selector-container">
          <select
            className="series-select"
            value={SERIES_DB_TO_DISPLAY[selectedSeries] || selectedSeries}
            onChange={handleSeriesChange}
          >
            <option value="Série Soft Skills 4LAB">Série Soft Skills 4LAB</option>
            <option value="Série Parcours des possibles">Série Parcours des possibles</option>
            <option value="Série Parcours professionnel">Série Parcours professionnel</option>
            <option value="Série Audiovisuelle">Série Audiovisuelle</option>
          </select>
        </div>

        {/* Series description - only show if not empty */}
        {seriesInfo.description && (
          <p className="series-description">{seriesInfo.description}</p>
        )}
          
          <div className="series-stats">
            <div className="stat-item">
              <i className="fas fa-medal"></i>
              <span>{seriesInfo.stats.badges} badges</span>
            </div>
            <div className="stat-item">
              <i className="fas fa-layer-group"></i>
              <span>{seriesInfo.stats.domains} domaines</span>
            </div>
            <div className="stat-item">
              <i className="fas fa-chart-line"></i>
              <span>{seriesInfo.stats.levels} niveau{seriesInfo.stats.levels > 1 ? 'x' : ''}</span>
            </div>
          </div>
        </div>

      <div className="badge-explorer-content">
        {isLoading ? (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p className="loading-text">Chargement des badges...</p>
              </div>
        ) : error ? (
          <div className="error-container">
            <p className="error-text">{error}</p>
              </div>
        ) : (
          <>
            {/* Always render all 4 levels, even if empty */}
            {renderLevelSection('level_1', '1')}
            {renderLevelSection('level_2', '2')}
            {renderLevelSection('level_3', '3')}
            {renderLevelSection('level_4', '4')}
          </>
        )}
      </div>
    </div>
  );
};

export default BadgeExplorer;
