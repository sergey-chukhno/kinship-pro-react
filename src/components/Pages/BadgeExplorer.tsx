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

// Parcours: title, objectif, list of series
interface Parcours {
  id: string;
  title: string;
  objectif: string;
  series: SeriesEntry[];
}

// Single source of truth: Parcours and their series (display names, DB names, descriptions)
const PARCOURS: Parcours[] = [
  {
    id: '1',
    title: 'Parcours 1 – Soft Skills & Compétences transversales',
    objectif: "Développer les compétences clés nécessaires à la vie collective, à l'autonomie et à toute insertion professionnelle.",
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

const BadgeExplorer: React.FC<BadgeExplorerProps> = ({ onBack }) => {
  // Step flow: 1 = intro + choose Parcours, 2 = objectif + choose series, 3 = badges
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [selectedParcours, setSelectedParcours] = useState<Parcours | null>(null);
  const [selectedSeries, setSelectedSeries] = useState<SeriesEntry | null>(null);
  // When user goes to step 3, we fetch by this DB name (only set for non–à venir series)
  const [selectedSeriesDbName, setSelectedSeriesDbName] = useState<string | null>(null);

  const [badges, setBadges] = useState<BadgeAPI[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedDescriptions, setExpandedDescriptions] = useState<Record<number, boolean>>({});

  // Fetch badges only when on step 3 with a valid series (not à venir)
  useEffect(() => {
    if (currentStep !== 3 || !selectedSeriesDbName) {
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
  }, [currentStep, selectedSeriesDbName]);

  const toggleDescription = (badgeId: number) => {
    setExpandedDescriptions(prev => ({
      ...prev,
      [badgeId]: !prev[badgeId]
    }));
  };

  // Step 1: select Parcours (by id) then Suivant
  const handleParcoursChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    if (!id) {
      setSelectedParcours(null);
      return;
    }
    const parcours = PARCOURS.find(p => p.id === id) ?? null;
    setSelectedParcours(parcours);
    setSelectedSeries(null);
  };

  const handleGoToStep2 = () => {
    if (selectedParcours) {
      setSelectedSeries(null);
      setCurrentStep(2);
    }
  };

  // Step 2: select series (by displayName within selected Parcours)
  const handleSeriesChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const displayName = e.target.value;
    if (!selectedParcours || !displayName) {
      setSelectedSeries(null);
      return;
    }
    const series = selectedParcours.series.find(s => s.displayName === displayName) ?? null;
    setSelectedSeries(series);
  };

  const handleGoToStep3 = () => {
    if (selectedSeries && !selectedSeries.comingSoon && selectedSeries.dbName) {
      setSelectedSeriesDbName(selectedSeries.dbName);
      setCurrentStep(3);
      setExpandedDescriptions({});
    }
  };

  // Back from step 3: stay on step 2, clear only series choice
  const handleBackFromStep3 = () => {
    setCurrentStep(2);
    setSelectedSeries(null);
    setSelectedSeriesDbName(null);
    setBadges([]);
  };

  // Back from step 2 to step 1
  const handleBackFromStep2 = () => {
    setCurrentStep(1);
    setSelectedParcours(null);
    setSelectedSeries(null);
  };

  // Group badges by level (for step 3)
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

  // —— Step 1: Intro + Choisir un Parcours ——
  if (currentStep === 1) {
    return (
      <div className="badge-explorer-page">
        <div className="badge-explorer-step badge-explorer-step-1">
          <div className="explorer-step-header">
            <button
              className="back-button"
              onClick={onBack}
              title="Revenir à la cartographie"
              type="button"
            >
              <i className="fas fa-arrow-left"></i>
            </button>
          </div>
          <p className="badge-explorer-intro">{INTRO_MESSAGE}</p>
          <h2 className="badge-explorer-step-title">Choisir un Parcours</h2>
          <div className="badge-explorer-select-wrap">
            <select
              className="series-select parcours-select"
              value={selectedParcours?.id ?? ''}
              onChange={handleParcoursChange}
            >
              <option value="">Sélectionnez un parcours</option>
              {PARCOURS.map(p => (
                <option key={p.id} value={p.id}>{p.title}</option>
              ))}
            </select>
          </div>
          <div className="badge-explorer-step-actions">
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleGoToStep2}
              disabled={!selectedParcours}
            >
              Suivant
            </button>
          </div>
        </div>
      </div>
    );
  }

  // —— Step 2: Objectif + Choisir une série (à venir message below if selected) ——
  if (currentStep === 2 && selectedParcours) {
    const showComingSoon = selectedSeries?.comingSoon ?? false;

    return (
      <div className="badge-explorer-page">
        <div className="badge-explorer-step badge-explorer-step-2">
          <div className="explorer-step-header">
            <button
              className="back-button"
              onClick={handleBackFromStep2}
              title="Retour au choix du parcours"
              type="button"
            >
              <i className="fas fa-arrow-left"></i>
            </button>
            <h2 className="badge-explorer-step-title">{selectedParcours.title}</h2>
          </div>
          <p className="badge-explorer-objectif"><strong>Objectif :</strong> {selectedParcours.objectif}</p>
          <h3 className="badge-explorer-step-subtitle">Choisir une série de badges</h3>
          <div className="badge-explorer-select-wrap">
            <select
              className="series-select"
              value={selectedSeries?.displayName ?? ''}
              onChange={handleSeriesChange}
            >
              <option value="">Sélectionnez une série</option>
              {selectedParcours.series.map(s => (
                <option key={s.displayName} value={s.displayName}>{s.displayName}</option>
              ))}
            </select>
          </div>
          {showComingSoon && (
            <div className="badge-explorer-coming-soon">
              <p>Cette série n&apos;a pas encore de badges. À venir.</p>
            </div>
          )}
          {selectedSeries && !selectedSeries.comingSoon && (
            <div className="badge-explorer-step-actions">
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleGoToStep3}
              >
                Suivant
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // —— Step 3: Series name + description + badges (only when non–à venir series was chosen) ——
  return (
    <div className="badge-explorer-page">
      <div className="badge-explorer-header">
        <div className="explorer-header-top">
          <div className="explorer-header-left">
            <button
              className="back-button"
              onClick={handleBackFromStep3}
              title="Retour au choix de la série"
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
