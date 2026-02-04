import React, { useEffect, useMemo, useState } from 'react';
import { getBadges } from '../../api/Badges';
import { BadgeAPI } from '../../types';
import { getLevelLabel } from '../../utils/badgeLevelLabels';
import { getLocalBadgeImage } from '../../utils/badgeImages';
import './BadgeExplorer.css';

interface BadgeExplorerProps {
  onBack: () => void;
}

// Series entry: display name, optional DB name (null if à venir), comingSoon flag, description
interface SeriesEntry {
  displayName: string;
  dbName: string | null;
  comingSoon: boolean;
  description: string;
}

// Parcours theme color key (dashboard colors in CSS)
type ParcoursColorKey = 'green' | 'pink' | 'yellow' | 'blue';

// Parcours: title, objectif, list of series, theme color, icon (Font Awesome class or path)
interface Parcours {
  id: string;
  title: string;
  objectif: string;
  series: SeriesEntry[];
  colorKey: ParcoursColorKey;
  icon: string; // FA class e.g. 'fa-shapes', or image path
  iconType: 'fa' | 'img';
}

// Representative badge (name, level) per series dbName for series icon on parcours-detail view
const SERIES_REPRESENTATIVE_BADGE: Record<string, { name: string; level: string }> = {
  'Série TouKouLeur': { name: 'Adaptabilité', level: '1' },
  'Série Parcours des possibles': { name: 'Étape 1 : IMPLICATION INITIALE', level: '1' },
  'Série Parcours professionnel': { name: 'PARCOURS DE DÉCOUVERTE - COLLÈGE', level: '1' },
  'Série Audiovisuelle': { name: 'IMAGE', level: '1' }
};

// Single source of truth: Parcours and their series (display names, DB names, descriptions)
const PARCOURS: Parcours[] = [
  {
    id: '1',
    title: 'Parcours 1 – Soft Skills & Compétences transversales',
    objectif: "Développer les compétences clés nécessaires à la vie collective, à l'autonomie et à toute insertion professionnelle.",
    colorKey: 'green',
    icon: 'fa-people-group',
    iconType: 'fa',
    series: [
      {
        displayName: 'Série Soft Skills 4LAB',
        dbName: 'Série TouKouLeur',
        comingSoon: false,
        description: "Les badges 4LAB reconnaissent et valorisent les soft skills mises en oeuvre dans le cadre d'un projet individuel ou collectif"
      }
    ]
  },
  {
    id: '2',
    title: 'Parcours 2 – Parcours de développement personnel et relationnel',
    objectif: 'Renforcer les capacités émotionnelles, relationnelles et décisionnelles des jeunes.',
    colorKey: 'pink',
    icon: 'fa-heart-pulse',
    iconType: 'fa',
    series: [
      {
        displayName: "Série CPS - Compétences Psychosociales (à venir)",
        dbName: null,
        comingSoon: true,
        description: ''
      }
    ]
  },
  {
    id: '3',
    title: "Parcours 3 – Parcours Avenir (Orientation & projection)",
    objectif: "Accompagner les jeunes dans la construction de leur projet personnel et professionnel.",
    colorKey: 'yellow',
    icon: 'fa-compass',
    iconType: 'fa',
    series: [
      {
        displayName: 'Série Parcours des possibles',
        dbName: 'Série Parcours des possibles',
        comingSoon: false,
        description: "La série du Centre des possibles permet de valoriser les compétences et talents des jeunes, pour les guider au mieux dans leur choix de développement de soi, de leurs compétences et de leur connaissance des métiers"
      },
      {
        displayName: "Série Compétences à s'orienter - Collège (à venir)",
        dbName: null,
        comingSoon: true,
        description: ''
      },
      {
        displayName: "Série Compétences à s'orienter - Lycée (à venir)",
        dbName: null,
        comingSoon: true,
        description: ''
      }
    ]
  },
  {
    id: '4',
    title: 'Parcours 4 – Parcours Métiers & compétences professionnelles',
    objectif: "Permettre aux jeunes d'acquérir des compétences techniques et de découvrir des secteurs professionnels.",
    colorKey: 'blue',
    icon: 'fa-briefcase',
    iconType: 'fa',
    series: [
      {
        displayName: 'Série Parcours professionnel',
        dbName: 'Série Parcours professionnel',
        comingSoon: false,
        description: "La Série Parcours professionnel vise à reconnaître et valoriser les expériences acquises tout au long du parcours professionnel, quels que soient le contexte ou le statut (emploi, stage, alternance, bénévolat, mission ponctuelle, etc.)."
      },
      {
        displayName: 'Série Audiovisuelle',
        dbName: 'Série Audiovisuelle',
        comingSoon: false,
        description: ''
      },
      {
        displayName: "Série Métiers de la mer (à venir)",
        dbName: null,
        comingSoon: true,
        description: ''
      }
    ]
  }
];

const INTRO_MESSAGE = "Explorez les parcours Kinship et les badges associés, qui permettent d'identifier et de valoriser les compétences développées par les jeunes à travers des projets, des expériences et des parcours métiers.";

type ViewMode = 'cards' | 'parcours-detail' | 'badge-list';

const BadgeExplorer: React.FC<BadgeExplorerProps> = ({ onBack }) => {
  const [view, setView] = useState<ViewMode>('cards');
  const [selectedParcours, setSelectedParcours] = useState<Parcours | null>(null);
  const [selectedSeries, setSelectedSeries] = useState<SeriesEntry | null>(null);
  const [selectedSeriesDbName, setSelectedSeriesDbName] = useState<string | null>(null);

  const [badges, setBadges] = useState<BadgeAPI[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedDescriptions, setExpandedDescriptions] = useState<Record<number, boolean>>({});
  // Filter on badge list: "Tous les badges" or specific badge id
  const [badgeFilter, setBadgeFilter] = useState<string>('all');

  // Fetch badges only when on badge-list view with a valid series
  useEffect(() => {
    if (view !== 'badge-list' || !selectedSeriesDbName) {
      setBadges([]);
      return;
    }
    const fetchBadges = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const fetchedBadges = await getBadges({ series: selectedSeriesDbName });
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
  }, [view, selectedSeriesDbName]);

  const toggleDescription = (badgeId: number) => {
    setExpandedDescriptions(prev => ({
      ...prev,
      [badgeId]: !prev[badgeId]
    }));
  };

  // Cards → Parcours detail
  const handleExplorerCeParcours = (parcours: Parcours) => {
    setSelectedParcours(parcours);
    setView('parcours-detail');
  };

  // Parcours detail → Badge list (for a series)
  const handleExplorerSeries = (series: SeriesEntry) => {
    if (series.comingSoon || !series.dbName) return;
    setSelectedSeries(series);
    setSelectedSeriesDbName(series.dbName);
    setBadgeFilter('all');
    setExpandedDescriptions({});
    setView('badge-list');
  };

  // Back from badge list → Parcours detail
  const handleBackFromBadgeList = () => {
    setView('parcours-detail');
    setSelectedSeries(null);
    setSelectedSeriesDbName(null);
    setBadges([]);
    setBadgeFilter('all');
  };

  // Back from Parcours detail → Cards
  const handleBackFromParcoursDetail = () => {
    setView('cards');
    setSelectedParcours(null);
  };

  // Representative image for a series (for parcours-detail list)
  const getSeriesIconUrl = (series: SeriesEntry): string | undefined => {
    if (series.comingSoon || !series.dbName) return undefined;
    const rep = SERIES_REPRESENTATIVE_BADGE[series.dbName];
    if (!rep) return undefined;
    const levelKey = rep.level.includes('level_') ? rep.level : `level_${rep.level}`;
    return getLocalBadgeImage(rep.name, levelKey, series.dbName);
  };

  // Filter badges by "Tous les badges" selection (all or specific badge)
  const filteredBadges = useMemo(() => {
    if (badgeFilter === 'all') return badges;
    const id = parseInt(badgeFilter, 10);
    if (Number.isNaN(id)) return badges;
    return badges.filter(b => b.id === id);
  }, [badges, badgeFilter]);

  // Group badges by level (for badge-list view)
  const badgesByLevel = useMemo(() => {
    const grouped: Record<string, BadgeAPI[]> = {
      level_1: [],
      level_2: [],
      level_3: [],
      level_4: []
    };
    filteredBadges.forEach(badge => {
      if (badge.level && grouped[badge.level]) {
        grouped[badge.level].push(badge);
      }
    });
    return grouped;
  }, [filteredBadges]);

  const renderBadgeCard = (badge: BadgeAPI, index: number) => {
    const imageUrl = getLocalBadgeImage(badge.name, badge.level, badge.series);
    const hasDescription = badge.description && badge.description.trim() !== '';
    const isExpanded = Boolean(expandedDescriptions[badge.id]);

    return (
      <div key={badge.id} className={`badge-explorer-card ${isExpanded ? 'expanded' : ''}`}>
        {imageUrl && (
          <div className="badge-icon">
            <img src={imageUrl} alt={badge.name} className="badge-image" />
          </div>
        )}
        <div className="badge-info">
          <h4>{badge.name}</h4>
          <div className={`badge-level level-${badge.level?.replace('level_', '') || '1'}`}>
            {badge.level ? getLevelLabel(badge.series, badge.level.replace('level_', '')) : 'Niveau 1'}
          </div>
          {hasDescription && (
            <>
              {!isExpanded && (
                <button
                  className="view-description-btn"
                  type="button"
                  onClick={() => toggleDescription(badge.id)}
                >
                  <span>Voir description</span>
                  <i className="fas fa-chevron-down"></i>
                </button>
              )}
              {isExpanded && (
                <div className="badge-description">
                  <p>{badge.description}</p>
                  <button
                    className="view-description-btn"
                    type="button"
                    onClick={() => toggleDescription(badge.id)}
                  >
                    <span>Masquer description</span>
                    <i className="fas fa-chevron-up"></i>
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    );
  };

  const renderLevelSection = (level: string, levelNumber: string) => {
    const levelBadges = badgesByLevel[level] || [];
    const levelLabel = getLevelLabel(selectedSeriesDbName || '', levelNumber);
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

  // —— Cards view (landing) ——
  if (view === 'cards') {
    return (
      <div className="badge-explorer-page">
        <div className="explorer-step-header">
          <button
            className="back-button"
            onClick={onBack}
            title="Revenir à la cartographie"
            type="button"
          >
            <i className="fas fa-arrow-left"></i>
          </button>
          <h1 className="badge-explorer-page-title">Explorer les parcours Kinship</h1>
        </div>
        <p className="badge-explorer-intro">{INTRO_MESSAGE}</p>
        <div className="badge-explorer-cards-grid">
          {PARCOURS.map((parcours) => {
            const isAllComingSoon = parcours.series.every(s => s.comingSoon);
            return (
              <div
                key={parcours.id}
                className={`badge-explorer-parcours-card parcours-${parcours.colorKey}`}
              >
                <div className="parcours-card-header">
                  {parcours.iconType === 'fa' ? (
                    <i className={`fas ${parcours.icon} parcours-card-icon`} aria-hidden />
                  ) : (
                    <img src={parcours.icon} alt="" className="parcours-card-icon-img" />
                  )}
                  <h2 className="parcours-card-title">{parcours.title}</h2>
                </div>
                <div className="parcours-card-body">
                  <p className="parcours-card-objectif"><strong>Objectif :</strong> {parcours.objectif}</p>
                  <ul className="parcours-card-series-list">
                    {parcours.series.map((s) => {
                      const seriesIconUrl = getSeriesIconUrl(s);
                      return (
                        <li key={s.displayName} className="parcours-card-series-item">
                          <div className="parcours-card-series-item-row">
                            {seriesIconUrl ? (
                              <img src={seriesIconUrl} alt="" className="parcours-card-series-item-icon" />
                            ) : (
                              <i className="fas fa-medal parcours-card-series-item-icon-fa" aria-hidden />
                            )}
                            <span className="parcours-card-series-name">{s.displayName}</span>
                          </div>
                          {s.description && (
                            <span className="parcours-card-series-desc">{s.description}</span>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                  <div className="parcours-card-actions">
                    <button
                      type="button"
                      className={`btn parcours-card-btn ${isAllComingSoon ? 'parcours-card-btn-disabled' : ''}`}
                      onClick={() => handleExplorerCeParcours(parcours)}
                    >
                      Explorer ce parcours
                    </button>
                    {isAllComingSoon && (
                      <p className="parcours-card-construction">Parcours en construction</p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // —— Parcours detail view (list of series) ——
  if (view === 'parcours-detail' && selectedParcours) {
    return (
      <div className="badge-explorer-page">
        <div className="explorer-step-header">
          <button
            className="back-button"
            onClick={handleBackFromParcoursDetail}
            title="Retour aux parcours"
            type="button"
          >
            <i className="fas fa-arrow-left"></i>
          </button>
          <h1 className="badge-explorer-page-title">{selectedParcours.title}</h1>
        </div>
        <div className="parcours-detail-series-list">
          {selectedParcours.series.map((series) => {
            const seriesIconUrl = getSeriesIconUrl(series);
            return (
              <div key={series.displayName} className="parcours-detail-series-item">
                <div className="parcours-detail-series-icon">
                  {seriesIconUrl ? (
                    <img src={seriesIconUrl} alt="" className="parcours-detail-series-icon-img" />
                  ) : (
                    <i className="fas fa-medal parcours-detail-series-icon-placeholder" aria-hidden />
                  )}
                </div>
                <div className="parcours-detail-series-content">
                  <h3 className="parcours-detail-series-name">{series.displayName}</h3>
                  {series.description && (
                    <p className="parcours-detail-series-desc">{series.description}</p>
                  )}
                  <button
                    type="button"
                    className={`btn parcours-detail-series-btn ${series.comingSoon ? 'parcours-detail-series-btn-disabled' : ''}`}
                    onClick={() => handleExplorerSeries(series)}
                    disabled={series.comingSoon}
                  >
                    {series.comingSoon ? 'À venir' : 'Explorer les badges de la série'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // —— Badge list view (series badges + "Tous les badges" filter) ——
  return (
    <div className="badge-explorer-page">
      <div className="badge-explorer-header">
        <div className="explorer-header-top">
          <div className="explorer-header-left">
            <button
              className="back-button"
              onClick={handleBackFromBadgeList}
              title="Retour à la liste des séries"
              type="button"
            >
              <i className="fas fa-arrow-left"></i>
            </button>
            <h1>{selectedSeries?.displayName ?? 'Série'}</h1>
          </div>
        </div>
        {selectedSeries?.description && (
          <p className="series-description">{selectedSeries.description}</p>
        )}
        {!isLoading && !error && badges.length > 0 && (
          <>
            <div className="series-stats">
              <div className="stat-item">
                <i className="fas fa-medal"></i>
                <span>{badges.length} badge{badges.length > 1 ? 's' : ''}</span>
              </div>
              <div className="stat-item">
                <i className="fas fa-chart-line"></i>
                <span>{Object.keys(badgesByLevel).filter(k => (badgesByLevel[k]?.length ?? 0) > 0).length} niveau{(Object.keys(badgesByLevel).filter(k => (badgesByLevel[k]?.length ?? 0) > 0).length) > 1 ? 'x' : ''}</span>
              </div>
            </div>
            <div className="badge-list-filter-wrap">
              <label htmlFor="badgeFilter" className="badge-list-filter-label">Tous les badges</label>
              <select
                id="badgeFilter"
                className="badge-list-filter-select"
                value={badgeFilter}
                onChange={(e) => setBadgeFilter(e.target.value)}
              >
                <option value="all">Tous les badges</option>
                {badges.map((b) => (
                  <option key={b.id} value={String(b.id)}>{b.name}</option>
                ))}
              </select>
            </div>
          </>
        )}
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
