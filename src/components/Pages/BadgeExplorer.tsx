import React, { useState } from 'react';
import './BadgeExplorer.css';

interface BadgeExplorerProps {
  onBack: () => void;
}

const BadgeExplorer: React.FC<BadgeExplorerProps> = ({ onBack }) => {
  const [selectedSeries, setSelectedSeries] = useState('toukouleur');
  const [expandedDescriptions, setExpandedDescriptions] = useState<{ [key: number]: boolean }>({});

  const toggleDescription = (index: number) => {
    setExpandedDescriptions(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  // Complete badge data from HTML dashboard
  const toukouleurBadges = {
    level1: [
      { name: 'Adaptabilité', description: 'Capacité à s\'ajuster aux changements et nouvelles situations', image: '/wetransfer_badges-kinship_2025-09-15_1406/NIV 1/Adaptabilite@2x.png' },
      { name: 'Communication', description: 'Échanger et partager des informations de manière efficace', image: '/wetransfer_badges-kinship_2025-09-15_1406/NIV 1/Communication@2x.png' },
      { name: 'Coopération', description: 'Travailler ensemble vers un objectif commun', image: '/wetransfer_badges-kinship_2025-09-15_1406/NIV 1/Cooperation@2x.png' },
      { name: 'Créativité', description: 'Développer des idées originales et innovantes', image: '/wetransfer_badges-kinship_2025-09-15_1406/NIV 1/Creativite@2x.png' },
      { name: 'Engagement', description: 'Se mobiliser activement dans des projets et causes', image: '/wetransfer_badges-kinship_2025-09-15_1406/NIV 1/Engagement@2x.png' },
      { name: 'Esprit Critique', description: 'Analyser et évaluer les informations de manière objective', image: '/wetransfer_badges-kinship_2025-09-15_1406/NIV 1/EspritCritique@2x.png' },
      { name: 'Formation', description: 'Capacité à s\'impliquer dans une dynamique d\'apprentissage continue individuellement et collectivement', image: '/wetransfer_badges-kinship_2025-09-15_1406/NIV 1/Formation@2x.png' },
      { name: 'Gestion de Projet', description: 'Capacité à transformer une idée en action réalisée', image: '/wetransfer_badges-kinship_2025-09-15_1406/NIV 1/GestionDePvrojet@2x.png' },
      { name: 'Sociabilité', description: 'Capacité à établir une relation à l\'autre et à évoluer au sein d\'un groupe social', image: '/wetransfer_badges-kinship_2025-09-15_1406/NIV 1/Sociabilite@2x.png' },
      { name: 'Organisation Opérationnelle', description: 'Capacité à mobiliser et à utiliser des ressources concrètes afin de produire un résultat', image: '/wetransfer_badges-kinship_2025-09-15_1406/NIV 1/OrganisationOpe@2x.png' },
      { name: 'Information Numérique', description: 'Utilise les outils informatiques et numériques', image: '/wetransfer_badges-kinship_2025-09-15_1406/NIV 1/Inform Numerique@2x.png' }
    ],
    level2: [
      { name: 'Adaptabilité', description: 'Appliquer l\'adaptabilité dans des contextes variés', image: '/wetransfer_badges-kinship_2025-09-15_1406/NIV 2 Kinship/Adaptabilite-8.png' },
      { name: 'Communication', description: 'Maîtriser différents modes de communication', image: '/wetransfer_badges-kinship_2025-09-15_1406/NIV 2 Kinship/Communication-8.png' },
      { name: 'Coopération', description: 'Diriger et participer efficacement au travail d\'équipe', image: '/wetransfer_badges-kinship_2025-09-15_1406/NIV 2 Kinship/Cooperation-8.png' },
      { name: 'Créativité', description: 'Résoudre des problèmes avec des solutions créatives', image: '/wetransfer_badges-kinship_2025-09-15_1406/NIV 2 Kinship/Creativite-8.png' },
      { name: 'Engagement', description: 'Mobiliser et motiver les autres dans des projets', image: '/wetransfer_badges-kinship_2025-09-15_1406/NIV 2 Kinship/Engagement.png' },
      { name: 'Esprit Critique', description: 'Évaluer et critiquer de manière constructive', image: '/wetransfer_badges-kinship_2025-09-15_1406/NIV 2 Kinship/EspritCritique-8.png' },
      { name: 'Formation', description: 'Former et accompagner les autres dans l\'apprentissage', image: '/wetransfer_badges-kinship_2025-09-15_1406/NIV 2 Kinship/Formation-8.png' },
      { name: 'Gestion de Projet', description: 'Gérer des projets complexes avec plusieurs parties prenantes', image: '/wetransfer_badges-kinship_2025-09-15_1406/NIV 2 Kinship/GestionDePvrojet-8.png' },
      { name: 'Sociabilité', description: 'Créer et maintenir des réseaux professionnels', image: '/wetransfer_badges-kinship_2025-09-15_1406/NIV 2 Kinship/Sociabilite-8.png' },
      { name: 'Organisation Opérationnelle', description: 'Optimiser les processus et les ressources', image: '/wetransfer_badges-kinship_2025-09-15_1406/NIV 2 Kinship/OrganisationOpe-8.png' },
      { name: 'Information Numérique', description: 'Maîtriser les outils numériques avancés', image: '/wetransfer_badges-kinship_2025-09-15_1406/NIV 2 Kinship/Inform Numerique-8.png' }
    ],
    level3: [
      { name: 'Adaptabilité', description: 'Diriger le changement et l\'innovation', image: '/wetransfer_badges-kinship_2025-09-15_1406/Niveau 3 Kinship/Adaptabilite-8.png' },
      { name: 'Communication', description: 'Communiquer avec impact et influence', image: '/wetransfer_badges-kinship_2025-09-15_1406/Niveau 3 Kinship/Communication-8.png' },
      { name: 'Coopération', description: 'Créer et diriger des alliances stratégiques', image: '/wetransfer_badges-kinship_2025-09-15_1406/Niveau 3 Kinship/Cooperation-8.png' },
      { name: 'Créativité', description: 'Innover et transformer les organisations', image: '/wetransfer_badges-kinship_2025-09-15_1406/Niveau 3 Kinship/Creativite-8.png' },
      { name: 'Engagement', description: 'Mobiliser les communautés et créer du changement social', image: '/wetransfer_badges-kinship_2025-09-15_1406/Niveau 3 Kinship/Engagement-8.png' },
      { name: 'Esprit Critique', description: 'Analyser et résoudre des problèmes complexes', image: '/wetransfer_badges-kinship_2025-09-15_1406/Niveau 3 Kinship/EspritCritique-8.png' },
      { name: 'Formation', description: 'Développer des programmes de formation innovants', image: '/wetransfer_badges-kinship_2025-09-15_1406/Niveau 3 Kinship/Formation-8.png' },
      { name: 'Gestion de Projet', description: 'Diriger des projets stratégiques de grande envergure', image: '/wetransfer_badges-kinship_2025-09-15_1406/Niveau 3 Kinship/GestionDePvrojet-8.png' },
      { name: 'Sociabilité', description: 'Construire et animer des réseaux d\'influence', image: '/wetransfer_badges-kinship_2025-09-15_1406/Niveau 3 Kinship/Sociabilite-8.png' },
      { name: 'Organisation Opérationnelle', description: 'Transformer les organisations et les processus', image: '/wetransfer_badges-kinship_2025-09-15_1406/Niveau 3 Kinship/OrganisationOpe-8.png' },
      { name: 'Information Numérique', description: 'Pionnier dans l\'utilisation des technologies émergentes', image: '/wetransfer_badges-kinship_2025-09-15_1406/Niveau 3 Kinship/Inform Numerique-8.png' }
    ],
    level4: [
      { name: 'Adaptabilité', description: 'Être un leader du changement et de l\'innovation', image: '/wetransfer_badges-kinship_2025-09-15_1406/Niv 4/Adaptabilite@2x.png' },
      { name: 'Communication', description: 'Influencer et transformer les discours publics', image: '/wetransfer_badges-kinship_2025-09-15_1406/Niv 4/Communication@2x.png' },
      { name: 'Coopération', description: 'Créer des mouvements et des coalitions durables', image: '/wetransfer_badges-kinship_2025-09-15_1406/Niv 4/Cooperation@2x.png' },
      { name: 'Créativité', description: 'Révolutionner les approches et créer de nouveaux paradigmes', image: '/wetransfer_badges-kinship_2025-09-15_1406/Niv 4/Creativite@2x.png' },
      { name: 'Engagement', description: 'Transformer la société et créer un impact durable', image: '/wetransfer_badges-kinship_2025-09-15_1406/Niv 4/Engagement@2x.png' },
      { name: 'Esprit Critique', description: 'Développer de nouvelles méthodologies d\'analyse', image: '/wetransfer_badges-kinship_2025-09-15_1406/Niv 4/EspritCritique@2x.png' },
      { name: 'Formation', description: 'Créer des écosystèmes d\'apprentissage innovants', image: '/wetransfer_badges-kinship_2025-09-15_1406/Niv 4/Formation@2x.png' },
      { name: 'Gestion de Projet', description: 'Diriger des transformations organisationnelles majeures', image: '/wetransfer_badges-kinship_2025-09-15_1406/Niv 4/GestionDePvrojet@2x.png' },
      { name: 'Sociabilité', description: 'Créer et animer des écosystèmes collaboratifs', image: '/wetransfer_badges-kinship_2025-09-15_1406/Niv 4/Sociabilite@2x.png' },
      { name: 'Organisation Opérationnelle', description: 'Révolutionner les modèles organisationnels', image: '/wetransfer_badges-kinship_2025-09-15_1406/Niv 4/OrganisationOpe@2x.png' },
      { name: 'Information Numérique', description: 'Pionnier de la transformation numérique', image: '/wetransfer_badges-kinship_2025-09-15_1406/Niv 4/Inform Numerique@2x.png' }
    ]
  };

  const psychosocialeBadges = {
    cognitives: [
      { name: 'Pensée critique', description: 'Analyser et évaluer les informations de manière objective et rationnelle', icon: 'fas fa-brain' },
      { name: 'Résolution de problèmes', description: 'Identifier, analyser et résoudre des problèmes complexes de manière méthodique', icon: 'fas fa-puzzle-piece' },
      { name: 'Prise de décision', description: 'Évaluer les options et prendre des décisions éclairées et responsables', icon: 'fas fa-balance-scale' }
    ],
    emotionnelles: [
      { name: 'Gestion des émotions', description: 'Reconnaître, comprendre et gérer ses émotions de manière adaptée', icon: 'fas fa-heart' },
      { name: 'Confiance en soi', description: 'Développer une image positive de soi et une estime de soi stable', icon: 'fas fa-star' },
      { name: 'Gérer son stress', description: 'Gestion des émotions difficiles et adaptation face aux situations stressantes', icon: 'fas fa-shield-alt' }
    ],
    sociales: [
      { name: 'Empathie', description: 'Comprendre et partager les émotions et perspectives des autres', icon: 'fas fa-users' },
      { name: 'Communication assertive', description: 'S\'exprimer de manière claire, respectueuse et efficace', icon: 'fas fa-comments' },
      { name: 'Réguler ses émotions', description: 'Adaptation face aux situations sociales et régulation des interactions', icon: 'fas fa-handshake' }
    ]
  };

  const audiovisuelleBadges = [
    { name: 'Production Vidéo', description: 'Créer et produire des contenus vidéo de qualité professionnelle', image: '/wetransfer_badges-kinship_2025-09-15_1406/NIV 1/Communication@2x.png' },
    { name: 'Montage Audio', description: 'Maîtriser les techniques de montage et de post-production audio', image: '/wetransfer_badges-kinship_2025-09-15_1406/NIV 1/Creativite@2x.png' },
    { name: 'Photographie', description: 'Capturer et traiter des images avec une approche artistique et technique', image: '/wetransfer_badges-kinship_2025-09-15_1406/NIV 1/Formation@2x.png' },
    { name: 'Animation', description: 'Créer des animations et des effets visuels dynamiques', image: '/wetransfer_badges-kinship_2025-09-15_1406/NIV 1/Engagement@2x.png' },
    { name: 'Scénarisation', description: 'Développer des récits et des structures narratives cohérentes', image: '/wetransfer_badges-kinship_2025-09-15_1406/NIV 1/GestionDePvrojet@2x.png' }
  ];

  const getSeriesInfo = () => {
    switch (selectedSeries) {
      case 'toukouleur':
        return {
          title: 'Série Soft Skills 4LAB',
          description: 'Les badges 4LAB reconnaissent et valorisent les soft skills mises en oeuvre dans le cadre d\'un projet individuel ou collectif',
          stats: { badges: 44, domains: 4, levels: 4 }
        };
      case 'psychosociale':
        return {
          title: 'Série Compétences Psychosociales',
          description: 'Compétences essentielles pour le développement personnel et social, basées sur le cadre de référence de l\'OMS. Cette série couvre les trois domaines fondamentaux : Cognitives, Émotionnelles et Sociales.',
          stats: { badges: 9, domains: 3, levels: 1 }
        };
      case 'audiovisuelle':
        return {
          title: 'Série Audiovisuelle',
          description: 'Les badges audiovisuels développent les compétences techniques et créatives dans la production de contenus multimédias.',
          stats: { badges: 5, domains: 3, levels: 1 }
        };
      default:
        return {
          title: 'Série Soft Skills 4LAB',
          description: 'Les badges 4LAB reconnaissent et valorisent les soft skills mises en oeuvre dans le cadre d\'un projet individuel ou collectif',
          stats: { badges: 44, domains: 4, levels: 4 }
        };
    }
  };

  const seriesInfo = getSeriesInfo();

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
          <p className="series-description">{seriesInfo.description}</p>
          
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
        {selectedSeries === 'toukouleur' && (
          <>
            {/* Niveau 1 - Découverte */}
            <div className="badge-series level-series level-1-series">
              <div className="series-header">
                <h3 className="series-title">Niveau 1 - Découverte <span className="level-color-indicator level-1"></span></h3>
              </div>
              <div className="series-description">
                <p>Badges de découverte des compétences psychosociales fondamentales</p>
              </div>
              <div className="badge-series-grid">
                {toukouleurBadges.level1.map((badge, index) => (
                  <div key={index} className="badge-explorer-card">
                    <div className="badge-icon">
                      <img src={badge.image} alt={badge.name} className="badge-image" />
                    </div>
                    <div className="badge-info">
                      <h4>{badge.name}</h4>
                      <div className="badge-description">
                        <p className={`description-text ${expandedDescriptions[index] ? 'expanded' : ''}`}>{badge.description}</p>
                        <button className="toggle-description" onClick={() => toggleDescription(index)}>
                          {expandedDescriptions[index] ? 'Voir moins' : 'Voir plus'}
                        </button>
                      </div>
                      <div className="badge-level level-1">Niveau 1</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Niveau 2 - Application */}
            <div className="badge-series level-series level-2-series">
              <div className="series-header">
                <h3 className="series-title">Niveau 2 - Application <span className="level-color-indicator level-2"></span></h3>
              </div>
              <div className="series-description">
                <p>Badges d'application des compétences dans des contextes variés</p>
              </div>
              <div className="badge-series-grid">
                {toukouleurBadges.level2.map((badge, index) => (
                  <div key={index} className="badge-explorer-card">
                    <div className="badge-icon">
                      <img src={badge.image} alt={badge.name} className="badge-image" />
                    </div>
                    <div className="badge-info">
                      <h4>{badge.name}</h4>
                      <div className="badge-description">
                        <p className={`description-text ${expandedDescriptions[index + 100] ? 'expanded' : ''}`}>{badge.description}</p>
                        <button className="toggle-description" onClick={() => toggleDescription(index + 100)}>
                          {expandedDescriptions[index + 100] ? 'Voir moins' : 'Voir plus'}
                        </button>
                      </div>
                      <div className="badge-level level-2">Niveau 2</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Niveau 3 - Maîtrise */}
            <div className="badge-series level-series level-3-series">
              <div className="series-header">
                <h3 className="series-title">Niveau 3 - Maîtrise <span className="level-color-indicator level-3"></span></h3>
              </div>
              <div className="series-description">
                <p>Badges de maîtrise et d'expertise avancée</p>
              </div>
              <div className="badge-series-grid">
                {toukouleurBadges.level3.map((badge, index) => (
                  <div key={index} className="badge-explorer-card">
                    <div className="badge-icon">
                      <img src={badge.image} alt={badge.name} className="badge-image" />
                    </div>
                    <div className="badge-info">
                      <h4>{badge.name}</h4>
                      <div className="badge-description">
                        <p className={`description-text ${expandedDescriptions[index + 200] ? 'expanded' : ''}`}>{badge.description}</p>
                        <button className="toggle-description" onClick={() => toggleDescription(index + 200)}>
                          {expandedDescriptions[index + 200] ? 'Voir moins' : 'Voir plus'}
                        </button>
                      </div>
                      <div className="badge-level level-3">Niveau 3</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Niveau 4 - Expertise */}
            <div className="badge-series level-series level-4-series">
              <div className="series-header">
                <h3 className="series-title">Niveau 4 - Expertise <span className="level-color-indicator level-4"></span></h3>
              </div>
              <div className="series-description">
                <p>Badges d'expertise et de leadership transformationnel</p>
              </div>
              <div className="badge-series-grid">
                {toukouleurBadges.level4.map((badge, index) => (
                  <div key={index} className="badge-explorer-card">
                    <div className="badge-icon">
                      <img src={badge.image} alt={badge.name} className="badge-image" />
                    </div>
                    <div className="badge-info">
                      <h4>{badge.name}</h4>
                      <div className="badge-description">
                        <p className={`description-text ${expandedDescriptions[index + 300] ? 'expanded' : ''}`}>{badge.description}</p>
                        <button className="toggle-description" onClick={() => toggleDescription(index + 300)}>
                          {expandedDescriptions[index + 300] ? 'Voir moins' : 'Voir plus'}
                        </button>
                      </div>
                      <div className="badge-level level-4">Niveau 4</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {selectedSeries === 'psychosociale' && (
          <>
            {/* Cognitives Domain */}
            <div className="badge-series level-series">
              <div className="series-header">
                <div className="domain-header">
                  <div className="domain-icon">
                    <img src="/wetransfer_badges-kinship_2025-09-15_1406/badges_psychosociales/Cognitives.jpg" alt="Cognitives Domain" className="domain-image" />
                  </div>
                  <h3 className="series-title">COGNITIVES</h3>
                </div>
              </div>
              <div className="series-description">
                <p>Compétences cognitives et de résolution de problèmes</p>
              </div>
              <div className="badge-series-grid">
                {psychosocialeBadges.cognitives.map((badge, index) => (
                  <div key={index} className="badge-explorer-card">
                    <div className="badge-icon">
                      <i className={badge.icon}></i>
                    </div>
                    <div className="badge-info">
                      <h4>{badge.name}</h4>
                      <div className="badge-description">
                        <p className={`description-text ${expandedDescriptions[index] ? 'expanded' : ''}`}>{badge.description}</p>
                        <button className="toggle-description" onClick={() => toggleDescription(index)}>
                          {expandedDescriptions[index] ? 'Voir moins' : 'Voir plus'}
                        </button>
                      </div>
                      <div className="badge-level level-1">Niveau 1</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Émotionnelles Domain */}
            <div className="badge-series level-series">
              <div className="series-header">
                <div className="domain-header">
                  <div className="domain-icon">
                    <img src="/wetransfer_badges-kinship_2025-09-15_1406/badges_psychosociales/Emotionnelles_final.png" alt="Émotionnelles Domain" className="domain-image" />
                  </div>
                  <h3 className="series-title">ÉMOTIONNELLES</h3>
                </div>
              </div>
              <div className="series-description">
                <p>Gestion des émotions et régulation émotionnelle</p>
              </div>
              <div className="badge-series-grid">
                {psychosocialeBadges.emotionnelles.map((badge, index) => (
                  <div key={index} className="badge-explorer-card">
                    <div className="badge-icon">
                      <i className={badge.icon}></i>
                    </div>
                    <div className="badge-info">
                      <h4>{badge.name}</h4>
                      <div className="badge-description">
                        <p className={`description-text ${expandedDescriptions[index + 100] ? 'expanded' : ''}`}>{badge.description}</p>
                        <button className="toggle-description" onClick={() => toggleDescription(index + 100)}>
                          {expandedDescriptions[index + 100] ? 'Voir moins' : 'Voir plus'}
                        </button>
                      </div>
                      <div className="badge-level level-1">Niveau 1</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Sociales Domain */}
            <div className="badge-series level-series">
              <div className="series-header">
                <div className="domain-header">
                  <div className="domain-icon">
                    <img src="/wetransfer_badges-kinship_2025-09-15_1406/badges_psychosociales/Sociales_final.png" alt="Sociales Domain" className="domain-image" />
                  </div>
                  <h3 className="series-title">SOCIALES</h3>
                </div>
              </div>
              <div className="series-description">
                <p>Interactions sociales et communication interpersonnelle</p>
              </div>
              <div className="badge-series-grid">
                {psychosocialeBadges.sociales.map((badge, index) => (
                  <div key={index} className="badge-explorer-card">
                    <div className="badge-icon">
                      <i className={badge.icon}></i>
                    </div>
                    <div className="badge-info">
                      <h4>{badge.name}</h4>
                      <div className="badge-description">
                        <p className={`description-text ${expandedDescriptions[index + 200] ? 'expanded' : ''}`}>{badge.description}</p>
                        <button className="toggle-description" onClick={() => toggleDescription(index + 200)}>
                          {expandedDescriptions[index + 200] ? 'Voir moins' : 'Voir plus'}
                        </button>
                      </div>
                      <div className="badge-level level-1">Niveau 1</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {selectedSeries === 'audiovisuelle' && (
          <>
            <div className="badge-series level-series">
              <div className="series-header">
                <h3 className="series-title">Compétences Audiovisuelles</h3>
              </div>
              <div className="series-description">
                <p>Badges de compétences audiovisuelles</p>
              </div>
              <div className="badge-series-grid">
                {audiovisuelleBadges.map((badge, index) => (
                  <div key={index} className="badge-explorer-card">
                    <div className="badge-icon">
                      <img src={badge.image} alt={badge.name} className="badge-image" />
                    </div>
                    <div className="badge-info">
                      <h4>{badge.name}</h4>
                      <div className="badge-description">
                        <p className={`description-text ${expandedDescriptions[index] ? 'expanded' : ''}`}>{badge.description}</p>
                        <button className="toggle-description" onClick={() => toggleDescription(index)}>
                          {expandedDescriptions[index] ? 'Voir moins' : 'Voir plus'}
                        </button>
                      </div>
                      <div className="badge-level level-1">Niveau 1</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default BadgeExplorer;
