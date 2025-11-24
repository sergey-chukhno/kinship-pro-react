import React, { useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { mockDashboardStats } from '../../data/mockData';
import './Dashboard.css';

const Dashboard: React.FC = () => {
  const { state } = useAppContext();
  const stats = mockDashboardStats;
  const [selectedPeriod, setSelectedPeriod] = useState<'1w' | '1m' | '6m'>('1m');
  const [selectedActivity, setSelectedActivity] = useState<'projects' | 'badges'>('projects');
  const [hoveredBar, setHoveredBar] = useState<{ index: number; value: number; label: string } | null>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  // Chart data logic
  const getChartData = (period: '1w' | '1m' | '6m', activity: 'projects' | 'badges') => {
    const isProjects = activity === 'projects';
    
    switch (period) {
      case '1w':
        return {
          bars: isProjects ? [3, 5, 2, 7, 4, 6, 3] : [12, 18, 8, 25, 15, 22, 14],
          labels: ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'],
          color: isProjects ? '#5570F1' : '#16A34A'
        };
      case '1m':
        return {
          bars: isProjects ? [15, 18, 12, 22] : [45, 52, 38, 65],
          labels: ['S1', 'S2', 'S3', 'S4'],
          color: isProjects ? '#5570F1' : '#16A34A'
        };
      case '6m':
        return {
          bars: isProjects ? [50, 72, 45, 85, 62, 78] : [55, 80, 48, 95, 68, 88],
          labels: ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin'],
          color: isProjects ? '#5570F1' : '#16A34A'
        };
      default:
        return { bars: [], labels: [], color: '#5570F1' };
    }
  };

  const chartData = getChartData(selectedPeriod, selectedActivity);

  return (
    <section className="dashboard-main-layout active">
      {/* Welcome Message and Section Title */}
      <div className="dashboard-header">
        <div className="welcome-header">
          <img src="/TouKouLeur-Jaune.png" alt="TouKouLeur" className="association-logo" />
          <div className="section-title">
            <h1 className="welcome-title">Bonjour {state.user.name.split(' ')[0]} !</h1>
            <img src="/icons_logo/Icon=Tableau de bord.svg" alt="Tableau de bord" className="section-icon" />
            <span>Tableau de bord de l'Association TouKouLeur</span>
          </div>
        </div>
      </div>

      {/* Main Content Area - Flex Container */}
      <div className="dashboard-main-content">

{/* --- COLONNE DE GAUCHE (Stats + Nouvel Aperçu Membres + Projets + Charts) --- */}
        <div className="dashboard-left-column">
          {/* Statistics Cards (Pas de changement) */}
          <div className="dashboard-stats">
            <div className="stats-grid">
              {/* ... stat-card 1, 2, 3 ... */}
              <div className="stat-card">
                <div className="stat-icon"><img src="/icons_logo/Icon=Membres grand.svg" alt="Membres" /></div>
                <div className="stat-content">
                  <div className="stat-value">{stats.totalMembers}</div>
                  <div className="stat-label">Membres actifs</div>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon"><img src="/icons_logo/Icon=Event grand.svg" alt="Événements" /></div>
                <div className="stat-content">
                  <div className="stat-value">{stats.upcomingEvents}</div>
                  <div className="stat-label">Événements à venir</div>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon"><img src="/icons_logo/Icon=Reseau.svg" alt="Partenaires" /></div>
                <div className="stat-content">
                  <div className="stat-value">{stats.upcomingEvents}</div>
                  <div className="stat-label">Partenaires</div>
                </div>
              </div>

              <div className="stat-card2">
                <div className="stat-icon"><img src="/icons_logo/Icon=Projet grand.svg" alt="Projets" /></div>
                <div className="stat-content">
                  <div className="stat-value">{stats.activeProjects}</div>
                  <div className="stat-label2">Projets en cours</div>
                </div>
              </div>

              <div className="stat-card2">
                <div className="stat-icon"><img src="/icons_logo/Icon=Badges.svg" alt="Badges" /></div>
                <div className="stat-content">
                  <div className="stat-value">{stats.badgesAwarded}</div>
                  <div className="stat-label2">Badges attribués</div>
                </div>
              </div>
            </div>
          </div>

          <div className="projects-in-progress-container">
            <div className="projects-header">
              <div className="projects-title-group">
                <img src="/icons_logo/Icon=Projet grand.svg" alt="Projets" className="projects-icon" />
                <h3>Projets en cours</h3>
              </div>
              <button className="btn btn-primary">Créer un projet +</button>
            </div>

            <div className="project-list">
              {/* Projet 1 */}
              <div className="project-item">
                <div className="project-info">
                  <span className="project-name">Atelier Développement Durable</span>
                  <span className="project-badge badge-inprogress">En cours</span>
                </div>
                <div className="project-details-row">
                  <div className="project-dates">
                    15 Jan – 30 Mar 2024
                  </div>
                  <div className="project-progress">
                    <div className="progress-bar-wrapper">
                      {/* --- MODIFIÉ : 75% --- */}
                      <div className="progress-bar" style={{ width: '75%' }}></div>
                    </div>
                    <span className="progress-value">75%</span>
                  </div>
                </div>
              </div>

              {/* Projet 2 */}
              <div className="project-item">
                <div className="project-info">
                  <span className="project-name project-upcoming">Programme Santé Mentale</span>
                  <span className="project-badge badge-upcoming">À venir</span>
                </div>
                <div className="project-details-row">
                  <div className="project-dates">
                    1 Fév – 15 Avr 2024
                  </div>
                  <div className="project-progress">
                    <div className="progress-bar-wrapper">
                      {/* --- MODIFIÉ : 25% --- */}
                      <div className="progress-bar" style={{ width: '25%' }}></div>
                    </div>
                    <span className="progress-value">25%</span>
                  </div>
                </div>
              </div>

              {/* Projet 3 */}
              <div className="project-item">
                <div className="project-info">
                  <span className="project-name">Festival Artistique Interculturel</span>
                  <span className="project-badge badge-inprogress">En cours</span>
                </div>
                <div className="project-details-row">
                  <div className="project-dates">
                    10 Déc 2023 – 20 Mai 2024
                  </div>
                  <div className="project-progress">
                    <div className="progress-bar-wrapper">
                      {/* --- MODIFIÉ : 90% --- */}
                      <div className="progress-bar" style={{ width: '90%' }}></div>
                    </div>
                    <span className="progress-value">90%</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="projects-footer">
              <a href="#" className="btn btn-text">Voir tous les projets →</a>
            </div>
          </div>

          {/* NOUVELLE SECTION : Fusion Membres Récents + Activité */}
          <div className="members-overview-section">
            
            {/* PARTIE GAUCHE : Membres récents */}
            <div className="recent-members-container">
              <div className="recent-members-header">
                <img src="/icons_logo/Icon=Membres.svg" alt="Membres" className="members-icon" />
                <h3>Membres récents</h3>
              </div>
              
              <div className="member-list">
                {/* Membre 1 : Marie Dubois */}
                <div className="member-item">
                  <div className="member-avatar">
                    <img src="https://randomuser.me/api/portraits/women/44.jpg" alt="Marie Dubois" />
                  </div>
                  <div className="member-content">
                    <div className="member-name">Marie Dubois</div>
                    <div className="member-role">Développeur Front-End</div>
                  </div>
                </div>

                {/* Membre 2 : Thomas Leroy */}
                <div className="member-item">
                  <div className="member-avatar">
                    <img src="https://randomuser.me/api/portraits/men/32.jpg" alt="Thomas Leroy" />
                  </div>
                  <div className="member-content">
                    <div className="member-name">Thomas Leroy</div>
                    <div className="member-role">Designer UX/UI</div>
                  </div>
                </div>

                {/* Membre 3 : Sophie Martin */}
                <div className="member-item">
                  <div className="member-avatar">
                    <img src="https://randomuser.me/api/portraits/women/67.jpg" alt="Sophie Martin" />
                  </div>
                  <div className="member-content">
                    <div className="member-name">Sophie Martin</div>
                    <div className="member-role">Chef de Projet</div>
                  </div>
                </div>
              </div>
              
              <div className="members-footer">
                <a href="#" className="btn btn-text">Voir tous les membres →</a>
              </div>
            </div>
            
            {/* PARTIE DROITE : Activité des membres (Le graphique) */}
            <div className="chart-container member-activity-chart">
              {/* NOUVEL EN-TÊTE : Titre et Sélecteur d'activité sur la même ligne logique */}
              <div className="chart-header">
                <h3 className="chart-title">Activité des membres</h3>
                {/* Le sélecteur d'activité est placé dans le header pour la mise en page CSS */}
                <div className="activity-type-selector">
                  <button 
                    className={`btn btn-sm ${selectedActivity === 'projects' ? 'btn-primary' : 'btn-outline'}`}
                    onClick={() => setSelectedActivity('projects')}
                  >
                    Création des projets
                  </button>
                  <button 
                    className={`btn btn-sm ${selectedActivity === 'badges' ? 'btn-primary' : 'btn-outline'}`}
                    onClick={() => setSelectedActivity('badges')}
                  >
                    Attribution des badges
                  </button>
                </div>
              </div>
              
              <div className="chart-controls-and-graph">
                {/* Le sélecteur de période est placé ici, pour être au-dessus du graphique */}
                <div className="period-selector">
                  <button
                    className={`btn btn-sm ${selectedPeriod === '1w' ? 'btn-primary' : 'btn-outline'}`}
                    onClick={() => setSelectedPeriod('1w')}
                  >
                    1s
                  </button>
                  <button
                    className={`btn btn-sm ${selectedPeriod === '1m' ? 'btn-primary' : 'btn-outline'}`}
                    onClick={() => setSelectedPeriod('1m')}
                  >
                    1m
                  </button>
                  <button
                    className={`btn btn-sm ${selectedPeriod === '6m' ? 'btn-primary' : 'btn-outline'}`}
                    onClick={() => setSelectedPeriod('6m')}
                  >
                    6m
                  </button>
                </div>
              
                <div className="chart-placeholder">
                  <div className="chart-mock">
                    <div className="chart-bars">
                      {chartData.bars.map((height, index) => (
                        <div 
                          key={index}
                          className="chart-bar" 
                          style={{ 
                            height: `${height}%`,
                            backgroundColor: chartData.color
                          }}
                          onMouseEnter={(e) => {
                            setHoveredBar({ 
                              index, 
                              value: Math.round(height), 
                              label: chartData.labels[index] 
                            });
                            setMousePosition({ x: e.clientX, y: e.clientY });
                          }}
                          onMouseMove={(e) => {
                            setMousePosition({ x: e.clientX, y: e.clientY });
                          }}
                          onMouseLeave={() => setHoveredBar(null)}
                        ></div>
                      ))}
                    </div>
                    <div className="chart-labels">
                      {chartData.labels.map((label, index) => (
                        <span key={index}>{label}</span>
                      ))}
                    </div>
                  </div>
                  
                  {/* Tooltip */}
                  {hoveredBar && (
                    <div 
                      className="chart-tooltip"
                      style={{
                        left: mousePosition.x + 10,
                        top: mousePosition.y - 10,
                      }}
                    >
                      <div className="tooltip-label">{hoveredBar.label}</div>
                      <div className="tooltip-value">
                        {hoveredBar.value} {selectedActivity === 'projects' ? 'projets' : 'badges'}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          {/* FIN NOUVELLE SECTION */}



        </div>
        {/* --- FIN DE LA COLONNE DE GAUCHE --- */}

        {/* --- COLONNE DE DROITE (Recent Activity) --- */}
        <div className="dashboard-right-column">
          <div className="recent-activity">
            <div className="activity-header">
              <h3>Activités récentes</h3>
              <button className="btn btn-outline btn-sm">Voir tout</button>
            </div>
            <div className="activity-list">
              <p className="activity-empty">Aucune activité récente pour le moment</p>
              {/* <div className="activity-item">
                <div className="activity-avatar">
                  <img src="https://randomuser.me/api/portraits/women/44.jpg" alt="Sophie Martin" />
                </div>
                <div className="activity-content">
                  <div className="activity-text">
                    <strong>Sophie Martin</strong> a rejoint l'organisation
                  </div>
                  <div className="activity-time">Il y a 2 heures</div>
                </div>
              </div>
              <div className="activity-item">
                <div className="activity-avatar">
                  <img src="https://randomuser.me/api/portraits/men/32.jpg" alt="François Dupont" />
                </div>
                <div className="activity-content">
                  <div className="activity-text">
                    <strong>François Dupont</strong> a reçu le badge "Collaboration"
                  </div>
                  <div className="activity-time">Il y a 4 heures</div>
                </div>
              </div>
              <div className="activity-item">
                <div className="activity-avatar">
                  <img src="https://randomuser.me/api/portraits/men/67.jpg" alt="Lucas Bernard" />
                </div>
                <div className="activity-content">
                  <div className="activity-text">
                    <strong>Lucas Bernard</strong> a créé le projet "Atelier développement durable"
                  </div>
                  <div className="activity-time">Il y a 1 jour</div>
                </div>
              </div> */}
            </div>
          </div>

          {/* Charts and Analytics (On retire le graphique d'activité, on garde juste la répartition des badges) */}
          <div className="dashboard-charts">
            {/* On retire le premier chart-container (Activité des membres) */}

            <div className="chart-container">
              <div className="chart-header">
                <h3>Répartition des badges</h3>
              </div>
              {/* ... Contenu de la répartition des badges (pie chart) ... */}
              <div className="chart-placeholder">
                <div className="pie-chart-mock">
                  <div className="pie-segment segment-1"></div>
                  <div className="pie-segment segment-2"></div>
                  <div className="pie-segment segment-3"></div>
                  <div className="pie-segment segment-4"></div>
                </div>
                <div className="pie-legend">
                  <div className="legend-item">
                    <span className="legend-color" style={{ backgroundColor: '#10b981' }}></span>
                    <span>Niveau 1 (45%)</span>
                  </div>
                  <div className="legend-item">
                    <span className="legend-color" style={{ backgroundColor: '#3b82f6' }}></span>
                    <span>Niveau 2 (30%)</span>
                  </div>
                  <div className="legend-item">
                    <span className="legend-color" style={{ backgroundColor: '#f59e0b' }}></span>
                    <span>Niveau 3 (20%)</span>
                  </div>
                  <div className="legend-item">
                    <span className="legend-color" style={{ backgroundColor: '#ef4444' }}></span>
                    <span>Niveau 4 (5%)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Dashboard;