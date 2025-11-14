import React, { useState } from 'react';
import './Modal.css';

interface BadgeAnalyticsModalProps {
  onClose: () => void;
}

const BadgeAnalyticsModal: React.FC<BadgeAnalyticsModalProps> = ({ onClose }) => {
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [selectedLevel, setSelectedLevel] = useState('all');

  // Mock analytics data
  const analyticsData = {
    totalBadges: 24,
    badgesByLevel: {
      'Niveau 1': 8,
      'Niveau 2': 6,
      'Niveau 3': 5,
      'Niveau 4': 5
    },
    badgesByCategory: {
      'Compétences techniques': 12,
      'Compétences sociales': 6,
      'Compétences créatives': 4,
      'Compétences de leadership': 2
    },
    recentActivity: [
      { badge: 'Collaboration', member: 'Marie Dubois', date: '2024-01-20' },
      { badge: 'Créativité', member: 'Lucas Bernard', date: '2024-01-19' },
      { badge: 'Communication', member: 'Sophie Martin', date: '2024-01-18' }
    ]
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Analytics des Badges</h2>
          <button className="modal-close" onClick={onClose}>
            <i className="fas fa-times"></i>
          </button>
        </div>

        <div className="modal-body">
          {/* Filters */}
          <div className="analytics-filters">
            <div className="filter-group">
              <label>Période:</label>
              <select 
                value={selectedPeriod} 
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="form-select"
              >
                <option value="week">Cette semaine</option>
                <option value="month">Ce mois</option>
                <option value="quarter">Ce trimestre</option>
                <option value="year">Cette année</option>
              </select>
            </div>
            <div className="filter-group">
              <label>Niveau:</label>
              <select 
                value={selectedLevel} 
                onChange={(e) => setSelectedLevel(e.target.value)}
                className="form-select"
              >
                <option value="all">Tous les niveaux</option>
                <option value="Niveau 1">Niveau 1</option>
                <option value="Niveau 2">Niveau 2</option>
                <option value="Niveau 3">Niveau 3</option>
                <option value="Niveau 4">Niveau 4</option>
              </select>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="analytics-summary">
            <div className="summary-card">
              <div className="summary-icon">
                <i className="fas fa-award"></i>
              </div>
              <div className="summary-content">
                <h3>{analyticsData.totalBadges}</h3>
                <p>Total des badges</p>
              </div>
            </div>
            <div className="summary-card">
              <div className="summary-icon">
                <i className="fas fa-users"></i>
              </div>
              <div className="summary-content">
                <h3>156</h3>
                <p>Badges attribués</p>
              </div>
            </div>
            <div className="summary-card">
              <div className="summary-icon">
                <i className="fas fa-chart-line"></i>
              </div>
              <div className="summary-content">
                <h3>+12%</h3>
                <p>Croissance ce mois</p>
              </div>
            </div>
          </div>

          {/* Charts */}
          <div className="analytics-charts">
            <div className="chart-section">
              <h3>Répartition par niveau</h3>
              <div className="chart-container">
                <div className="chart-bars">
                  {Object.entries(analyticsData.badgesByLevel).map(([level, count]) => (
                    <div key={level} className="chart-bar">
                      <div className="bar-label">{level}</div>
                      <div className="bar-container">
                        <div 
                          className="bar-fill" 
                          style={{ 
                            width: `${(count / Math.max(...Object.values(analyticsData.badgesByLevel))) * 100}%`,
                            backgroundColor: level === 'Niveau 1' ? '#10b981' : 
                                          level === 'Niveau 2' ? '#3b82f6' :
                                          level === 'Niveau 3' ? '#f59e0b' : '#ef4444'
                          }}
                        ></div>
                        <span className="bar-value">{count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="chart-section">
              <h3>Répartition par catégorie</h3>
              <div className="chart-container">
                <div className="chart-pie">
                  {Object.entries(analyticsData.badgesByCategory).map(([category, count], index) => {
                    const percentage = (count / analyticsData.totalBadges) * 100;
                    const colors = ['#5570F1', '#10b981', '#f59e0b', '#ef4444'];
                    return (
                      <div key={category} className="pie-item">
                        <div 
                          className="pie-color" 
                          style={{ backgroundColor: colors[index % colors.length] }}
                        ></div>
                        <span className="pie-label">{category}</span>
                        <span className="pie-value">{count} ({percentage.toFixed(1)}%)</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="analytics-activity">
            <h3>Activité récente</h3>
            <div className="activity-list">
              {analyticsData.recentActivity.map((activity, index) => (
                <div key={index} className="activity-item">
                  <div className="activity-icon">
                    <i className="fas fa-award"></i>
                  </div>
                  <div className="activity-content">
                    <div className="activity-text">
                      <strong>{activity.member}</strong> a obtenu le badge <strong>{activity.badge}</strong>
                    </div>
                    <div className="activity-date">{activity.date}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onClose}>
            Fermer
          </button>
          <button className="btn btn-primary">
            <i className="fas fa-download"></i>
            Exporter le rapport
          </button>
        </div>
      </div>
    </div>
  );
};

export default BadgeAnalyticsModal;
