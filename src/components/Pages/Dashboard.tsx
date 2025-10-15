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

  // Chart data for different periods and activities
  const getChartData = (period: '1w' | '1m' | '6m', activity: 'projects' | 'badges') => {
    const isProjects = activity === 'projects';
    
    switch (period) {
      case '1w':
        return {
          bars: isProjects ? [3, 5, 2, 7, 4, 6, 3] : [12, 18, 8, 25, 15, 22, 14], // 7 days
          labels: ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'],
          color: isProjects ? '#5570F1' : '#16A34A'
        };
      case '1m':
        return {
          bars: isProjects ? [15, 18, 12, 22] : [45, 52, 38, 65], // 4 weeks
          labels: ['S1', 'S2', 'S3', 'S4'],
          color: isProjects ? '#5570F1' : '#16A34A'
        };
      case '6m':
        return {
          bars: isProjects ? [50, 72, 45, 85, 62, 78] : [55, 80, 48, 95, 68, 88], // 6 months with varied heights (normalized to 0-100%)
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
          <h1 className="welcome-title">Bonjour {state.user.name.split(' ')[0]} !</h1>
          <img src="/TouKouLeur-Jaune.png" alt="TouKouLeur" className="association-logo" />
        </div>
        <div className="section-title">
          <img src="/icons_logo/Icon=Tableau de bord.svg" alt="Tableau de bord" className="section-icon" />
          <span>Tableau de bord de l'Association TouKouLeur</span>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="dashboard-main-content">
        {/* Statistics Cards */}
        <div className="dashboard-stats">
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon">
                <img src="/icons_logo/Icon=Membres grand.svg" alt="Membres" />
              </div>
              <div className="stat-content">
                <div className="stat-value">{stats.totalMembers}</div>
                <div className="stat-label">Membres actifs</div>
                <div className="stat-change positive">+12% ce mois</div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon">
                <img src="/icons_logo/Icon=Projet grand.svg" alt="Projets" />
              </div>
              <div className="stat-content">
                <div className="stat-value">{stats.activeProjects}</div>
                <div className="stat-label">Projets en cours</div>
                <div className="stat-change positive">+3 nouveaux</div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon">
                <img src="/icons_logo/Icon=Badges.svg" alt="Badges" />
              </div>
              <div className="stat-content">
                <div className="stat-value">{stats.badgesAwarded}</div>
                <div className="stat-label">Badges attribués</div>
                <div className="stat-change positive">+28 cette semaine</div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon">
                <img src="/icons_logo/Icon=Event grand.svg" alt="Événements" />
              </div>
              <div className="stat-content">
                <div className="stat-value">{stats.upcomingEvents}</div>
                <div className="stat-label">Événements à venir</div>
                <div className="stat-change positive">Cette semaine</div>
              </div>
            </div>
          </div>
        </div>

        {/* Charts and Analytics */}
        <div className="dashboard-charts">
          <div className="chart-container">
            <div className="chart-header">
              <h3>Activité des membres</h3>
              <div className="chart-controls">
                {/* Activity Type Selection */}
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
                
                {/* Time Period Selection */}
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
              </div>
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

          <div className="chart-container">
            <div className="chart-header">
              <h3>Répartition des badges</h3>
            </div>
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

        {/* Recent Activity */}
        <div className="recent-activity">
          <div className="activity-header">
            <h3>Activité récente</h3>
            <button className="btn btn-outline btn-sm">Voir tout</button>
          </div>
          <div className="activity-list">
            <div className="activity-item">
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
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Dashboard;
