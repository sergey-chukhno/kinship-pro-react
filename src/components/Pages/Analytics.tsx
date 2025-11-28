import React, { useState } from 'react';
import './Analytics.css';

const Analytics: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'projects' | 'badges'>('projects');

  // Mock data for charts
  const projectsData = {
    totalProjects: 0,
    activeProjects: 0,
    completedProjects: 0,
    totalParticipants: 0,
    averageDuration: 0,
    successRate: 0,
    pathwayDistribution: [
      { name: 'Citoyen', value: 0, percentage: 0 },
      { name: 'Créativité', value: 0, percentage: 0 },
      { name: 'Santé', value: 0, percentage: 0 },
      { name: 'Environnement', value: 0, percentage: 0 },
      { name: 'Innovation', value: 0, percentage: 0 },
      { name: 'Éducation', value: 0, percentage: 0 },
      { name: 'Technologie', value: 0, percentage: 0 }
    ],
    monthlyTrend: [
      { month: 'Jan', projects: 0 },
      { month: 'Fév', projects: 0 },
      { month: 'Mar', projects: 0 },
      { month: 'Avr', projects: 0 },
      { month: 'Mai', projects: 0 },
      { month: 'Juin', projects: 0 }
    ],
    statusDistribution: [
      { name: 'À venir', value: 0, percentage: 0 },
      { name: 'En cours', value: 0, percentage: 0 },
      { name: 'Terminé', value: 0, percentage: 0 }
    ]
  };

  const badgesData = {
    totalBadges: 0,
    badgesAwarded: 0,
    averagePerMember: 0,
    completionRate: 0,
    seriesDistribution: [
      { name: 'Soft Skills 4LAB', value: 0, percentage: 0 },
      // { name: 'CPS', value: 0, percentage: 0 },
      // { name: 'Audiovisuelle', value: 0, percentage: 0 }
    ],
    monthlyAttributions: [
      { month: 'Jan', badges: 0 },
      { month: 'Fév', badges: 0 },
      { month: 'Mar', badges: 0 },
      { month: 'Avr', badges: 0 },
      { month: 'Mai', badges: 0 },
      { month: 'Juin', badges: 0 }
    ],
    levelDistribution: [
      { name: 'Niveau 1', value: 0, percentage: 0 },
      { name: 'Niveau 2', value: 0, percentage: 0 },
      { name: 'Niveau 3', value: 0, percentage: 0 }
    ],
    radarData: [
      {
        level: 'Niveau 1',
        competencies: ['Communication', 'Coopération', 'Créativité'],
        badgesAttributed: 0
      },
      {
        level: 'Niveau 2',
        competencies: ['Adaptabilité', 'Engagement', 'Formation'],
        badgesAttributed: 0
      },
      {
        level: 'Niveau 3',
        competencies: ['Esprit Critique', 'Gestion de Projet', 'Innovation'],
        badgesAttributed: 0
      },
      {
        level: 'Niveau 4',
        competencies: ['Leadership', 'Stratégie', 'Mentorat'],
        badgesAttributed: 0
      }
    ]
  };

  const StatCard = ({ title, value, subtitle, icon, color, iconType = 'fontawesome' }: {
    title: string;
    value: string | number;
    subtitle?: string;
    icon: string;
    color: string;
    iconType?: 'fontawesome' | 'image';
  }) => (
    <div className="stat-card">
      <div className="stat-icon">
        {iconType === 'image' ? (
          <img src={icon} alt={title} />
        ) : (
          <i className={icon} style={{ color: color }}></i>
        )}
      </div>
      <div className="stat-content">
        <div className="stat-value">{value}</div>
        <div className="stat-label">{title}</div>
        {subtitle && <div className="stat-change positive">{subtitle}</div>}
      </div>
    </div>
  );

  const ChartCard = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="analytics-chart-card">
      <h3 className="chart-title">{title}</h3>
      <div className="chart-content">
        {children}
      </div>
    </div>
  );

  const DonutChart = ({ data, colors }: { data: Array<{ name: string; value: number; percentage: number }>; colors: string[] }) => {
    const [hoveredItem, setHoveredItem] = useState<{ name: string; value: number; percentage: number } | null>(null);
    const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

    return (
      <div className="donut-chart">
        <div className="donut-chart-container">
          <svg width="200" height="200" className="donut-svg">
            <circle
              cx="100"
              cy="100"
              r="80"
              fill="none"
              stroke="#e5e7eb"
              strokeWidth="20"
            />
            {data.map((item, index) => {
              const circumference = 2 * Math.PI * 80;
              const strokeDasharray = `${(item.percentage / 100) * circumference} ${circumference}`;
              const strokeDashoffset = data.slice(0, index).reduce((acc, prev) => acc - (prev.percentage / 100) * circumference, 0);

              return (
                <circle
                  key={item.name}
                  cx="100"
                  cy="100"
                  r="80"
                  fill="none"
                  stroke={colors[index % colors.length]}
                  strokeWidth="20"
                  strokeDasharray={strokeDasharray}
                  strokeDashoffset={strokeDashoffset}
                  transform="rotate(-90 100 100)"
                  className="donut-segment"
                  onMouseEnter={(e) => {
                    setHoveredItem(item);
                    setMousePosition({ x: e.clientX, y: e.clientY });
                  }}
                  onMouseMove={(e) => {
                    setMousePosition({ x: e.clientX, y: e.clientY });
                  }}
                  onMouseLeave={() => setHoveredItem(null)}
                  style={{ cursor: 'pointer' }}
                />
              );
            })}
          </svg>
          <div className="donut-center">
            <div className="donut-total">{data.reduce((sum, item) => sum + item.value, 0)}</div>
            <div className="donut-label">Total</div>
          </div>
        </div>
        <div className="donut-legend">
          {data.map((item, index) => (
            <div
              key={item.name}
              className={`legend-item ${hoveredItem?.name === item.name ? 'hovered' : ''}`}
              onMouseEnter={() => setHoveredItem(item)}
              onMouseLeave={() => setHoveredItem(null)}
              style={{ cursor: 'pointer' }}
            >
              <div className="legend-color" style={{ backgroundColor: colors[index % colors.length] }}></div>
              <span className="legend-label">{item.name}</span>
              <span className="legend-value">{item.value} ({item.percentage}%)</span>
            </div>
          ))}
        </div>
        {hoveredItem && (
          <div
            className="chart-tooltip"
            style={{
              left: mousePosition.x + 10,
              top: mousePosition.y - 10,
            }}
          >
            <div className="tooltip-title">{hoveredItem.name}</div>
            <div className="tooltip-value">{hoveredItem.value} projets</div>
            <div className="tooltip-percentage">{hoveredItem.percentage}%</div>
          </div>
        )}
      </div>
    );
  };

  const BarChart = ({ data, color }: { data: Array<{ month: string; projects?: number; badges?: number }>; color: string }) => {
    const [hoveredItem, setHoveredItem] = useState<{ month: string; value: number } | null>(null);
    const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

    // Different colors for each month
    const barColors = ['#5570F1', '#10B981', '#F59E0B', '#8B5CF6', '#EF4444', '#06B6D4', '#84CC16', '#EC4899', '#F97316', '#14B8A6', '#6366F1', '#F43F5E'];

    return (
      <div className="bar-chart horizontal">
        <div className="bar-chart-container-horizontal">
          {data.map((item, index) => {
            const value = item.projects || item.badges || 0;
            const maxValue = Math.max(...data.map(d => d.projects || d.badges || 0));
            const width = (value / maxValue) * 100;

            return (
              <div key={index} className="bar-item-horizontal">
                <div className="bar-label-horizontal">{item.month}</div>
                <div className="bar-wrapper-horizontal">
                  <div
                    className="bar-horizontal"
                    style={{
                      width: `${width}%`,
                      backgroundColor: barColors[index % barColors.length],
                      minWidth: value > 0 ? '30px' : '0px'
                    }}
                    onMouseEnter={(e) => {
                      setHoveredItem({ month: item.month, value });
                      setMousePosition({ x: e.clientX, y: e.clientY });
                    }}
                    onMouseMove={(e) => {
                      setMousePosition({ x: e.clientX, y: e.clientY });
                    }}
                    onMouseLeave={() => setHoveredItem(null)}
                  >
                    <span className="bar-value-horizontal">{value}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        {hoveredItem && (
          <div
            className="chart-tooltip"
            style={{
              left: mousePosition.x + 10,
              top: mousePosition.y - 10,
            }}
          >
            <div className="tooltip-title">{hoveredItem.month}</div>
            <div className="tooltip-value">{hoveredItem.value} {data[0].projects ? 'projets' : 'badges'}</div>
          </div>
        )}
      </div>
    );
  };

  const LineChart = ({ data, color }: { data: Array<{ month: string; projects?: number; badges?: number }>; color: string }) => {
    const [hoveredItem, setHoveredItem] = useState<{ month: string; value: number } | null>(null);
    const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

    return (
      <div className="line-chart">
        <svg width="100%" height="200" className="line-svg" viewBox="0 0 100 100" preserveAspectRatio="none">
          {/* Grid lines */}
          <defs>
            <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
              <path d="M 10 0 L 0 0 0 10" fill="none" stroke="#f3f4f6" strokeWidth="0.2" />
            </pattern>
          </defs>
          <rect width="100" height="100" fill="url(#grid)" />

          {/* Area under the line */}
          <polygon
            fill={`${color}20`}
            points={`0,100 ${data.map((item, index) => {
              const value = item.projects || item.badges || 0;
              const maxValue = Math.max(...data.map(d => d.projects || d.badges || 0));
              const x = (index / (data.length - 1)) * 100;
              const y = 100 - (value / maxValue) * 80;
              return `${x},${y}`;
            }).join(' ')} 100,100`}
          />

          {/* Main line */}
          <polyline
            fill="none"
            stroke={color}
            strokeWidth="1"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={data.map((item, index) => {
              const value = item.projects || item.badges || 0;
              const maxValue = Math.max(...data.map(d => d.projects || d.badges || 0));
              const x = (index / (data.length - 1)) * 100;
              const y = 100 - (value / maxValue) * 80;
              return `${x},${y}`;
            }).join(' ')}
            className="line-path"
            onMouseEnter={(e) => {
              // Find the closest data point for hover
              const rect = e.currentTarget.getBoundingClientRect();
              const x = e.clientX - rect.left;
              const relativeX = (x / rect.width) * 100;
              const closestIndex = Math.round((relativeX / 100) * (data.length - 1));
              const item = data[Math.min(closestIndex, data.length - 1)];
              const value = item.projects || item.badges || 0;
              setHoveredItem({ month: item.month, value });
              setMousePosition({ x: e.clientX, y: e.clientY });
            }}
            onMouseMove={(e) => {
              setMousePosition({ x: e.clientX, y: e.clientY });
            }}
            onMouseLeave={() => setHoveredItem(null)}
            style={{ cursor: 'pointer' }}
          />

        </svg>

        {/* X-axis labels */}
        <div className="line-chart-x-axis">
          {data.map((item, index) => (
            <div key={index} className="x-axis-label">
              {item.month}
            </div>
          ))}
        </div>

        {hoveredItem && (
          <div
            className="chart-tooltip"
            style={{
              left: mousePosition.x + 10,
              top: mousePosition.y - 10,
            }}
          >
            <div className="tooltip-title">{hoveredItem.month}</div>
            <div className="tooltip-value">{hoveredItem.value} {data[0].projects ? 'projets' : 'badges'}</div>
          </div>
        )}
      </div>
    );
  };

  const RadarChart = ({ data }: { data: Array<{ level: string; competencies: string[]; badgesAttributed: number }> }) => {
    const [hoveredItem, setHoveredItem] = useState<{ level: string; competencies: string[]; badgesAttributed: number } | null>(null);
    const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

    const centerX = 50;
    const centerY = 50;
    const maxRadius = 40;
    const levels = data.length;
    const angleStep = (2 * Math.PI) / levels;

    // Calculate points for each level
    const points = data.map((item, index) => {
      const angle = index * angleStep - Math.PI / 2; // Start from top
      const radius = (item.badgesAttributed / Math.max(...data.map(d => d.badgesAttributed))) * maxRadius;
      const x = centerX + radius * Math.cos(angle);
      const y = centerY + radius * Math.sin(angle);
      return { x, y, item, angle };
    });

    // Create path for the radar shape
    const pathData = points.map((point, index) =>
      `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`
    ).join(' ') + ' Z';

    return (
      <div className="radar-chart">
        <svg width="100%" height="200" className="radar-svg" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
          {/* Subtle grid circles */}
          {[0.2, 0.4, 0.6, 0.8, 1.0].map((scale, index) => (
            <circle
              key={index}
              cx={centerX}
              cy={centerY}
              r={maxRadius * scale}
              fill="none"
              stroke="#f8fafc"
              strokeWidth="0.2"
            />
          ))}

          {/* Subtle grid lines from center to each level */}
          {points.map((point, index) => (
            <line
              key={index}
              x1={centerX}
              y1={centerY}
              x2={centerX + maxRadius * Math.cos(point.angle)}
              y2={centerY + maxRadius * Math.sin(point.angle)}
              stroke="#f8fafc"
              strokeWidth="0.2"
            />
          ))}

          {/* Area fill */}
          <polygon
            points={points.map(p => `${p.x},${p.y}`).join(' ')}
            fill="rgba(85, 112, 241, 0.15)"
            stroke="none"
          />

          {/* Main radar line - thinner and more subtle */}
          <path
            d={pathData}
            fill="none"
            stroke="#5570F1"
            strokeWidth="0.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="radar-path"
            onMouseEnter={(e) => {
              setHoveredItem(data[0]); // Show first item on hover
              setMousePosition({ x: e.clientX, y: e.clientY });
            }}
            onMouseMove={(e) => {
              setMousePosition({ x: e.clientX, y: e.clientY });
            }}
            onMouseLeave={() => setHoveredItem(null)}
            style={{ cursor: 'pointer' }}
          />

          {/* Level labels */}
          {points.map((point, index) => (
            <text
              key={index}
              x={centerX + (maxRadius + 8) * Math.cos(point.angle)}
              y={centerY + (maxRadius + 8) * Math.sin(point.angle)}
              textAnchor="middle"
              dominantBaseline="middle"
              className="radar-label"
              fontSize="2.5"
              fill="#6b7280"
              fontWeight="500"
            >
              {point.item.level}
            </text>
          ))}
        </svg>

        {hoveredItem && (
          <div
            className="chart-tooltip"
            style={{
              left: mousePosition.x + 10,
              top: mousePosition.y - 10,
            }}
          >
            <div className="tooltip-title">{hoveredItem.level}</div>
            <div className="tooltip-value">{hoveredItem.badgesAttributed} badges attribués</div>
            <div className="tooltip-competencies">{hoveredItem.competencies.join(', ')}</div>
          </div>
        )}
      </div>
    );
  };

  return (
    <section className="analytics-container with-sidebar">
      <div className="analytics-content">
        {/* Section Title + Actions */}
        <div className="items-center section-title-row">
          <div className="flex flex-col gap-2 items-center">
          <div className="section-title-left">
            <img src="/icons_logo/Icon=Analytics.svg" alt="Statistiques et KPI" className="section-icon" />
            <h2>Statistiques et KPI</h2>
          </div>
            <span className="px-2 py-1 text-sm rounded-xl bg-[#F59E0B] text-white">Disponible très prochainement</span>
            </div>
          <div className="analytics-actions">
            <button className="btn btn-outline" onClick={() => console.log('Export analytics')}>
              <i className="fas fa-download"></i> Exporter
            </button>
          </div>
        </div>

        <div className="analytics-tabs">
          <button
            className={`tab-button ${activeTab === 'projects' ? 'active' : ''}`}
            onClick={() => setActiveTab('projects')}
          >
            Projets
          </button>
          <button
            className={`tab-button ${activeTab === 'badges' ? 'active' : ''}`}
            onClick={() => setActiveTab('badges')}
          >
            Badges
          </button>
        </div>

        {activeTab === 'projects' && (
          <div className="analytics-content">
            <div className="analytics-stats">
              <StatCard
                title="Projets totaux"
                value={projectsData.totalProjects}
                subtitle={`${projectsData.activeProjects} actifs`}
                icon="/icons_logo/Icon=Projet grand.svg"
                color="#5570F1"
                iconType="image"
              />
              <StatCard
                title="Participants"
                value={projectsData.totalParticipants}
                subtitle="Membres impliqués"
                icon="/icons_logo/Icon=Membres grand.svg"
                color="#10B981"
                iconType="image"
              />
              <StatCard
                title="Durée moyenne"
                value={`${projectsData.averageDuration} mois`}
                subtitle="Par projet"
                icon="fas fa-clock"
                color="#F59E0B"
              />
              <StatCard
                title="Taux de réussite"
                value={`${projectsData.successRate}%`}
                subtitle="Projets terminés"
                icon="fas fa-trophy"
                color="#EF4444"
              />
            </div>

            <div className="analytics-charts">
              <ChartCard title="Répartition par parcours">
                <DonutChart
                  data={projectsData.pathwayDistribution}
                  colors={['#5570F1', '#10B981', '#F59E0B', '#8B5CF6', '#EF4444', '#06B6D4', '#84CC16']}
                />
              </ChartCard>

              <ChartCard title="Évolution mensuelle">
                <BarChart
                  data={projectsData.monthlyTrend}
                  color="#5570F1"
                />
              </ChartCard>

              <ChartCard title="Statut des projets">
                <DonutChart
                  data={projectsData.statusDistribution}
                  colors={['#F59E0B', '#5570F1', '#10B981']}
                />
              </ChartCard>

              <ChartCard title="Tendance de création par mois">
                <LineChart
                  data={projectsData.monthlyTrend}
                  color="#5570F1"
                />
              </ChartCard>
            </div>
          </div>
        )}

        {activeTab === 'badges' && (
          <div className="analytics-content">
            <div className="analytics-stats">
              <StatCard
                title="Badges totaux"
                value={badgesData.totalBadges}
                subtitle={`${badgesData.badgesAwarded} attribués`}
                icon="/icons_logo/Icon=Badges.svg"
                color="#5570F1"
                iconType="image"
              />
              <StatCard
                title="Moyenne par membre"
                value={badgesData.averagePerMember}
                subtitle="Badges par personne"
                icon="fas fa-user-graduate"
                color="#10B981"
              />
              <StatCard
                title="Taux de complétion"
                value={`${badgesData.completionRate}%`}
                subtitle="Badges validés"
                icon="fas fa-check-circle"
                color="#F59E0B"
              />
              <StatCard
                title="Attributions ce mois"
                value="28"
                subtitle="Nouveaux badges"
                icon="fas fa-star"
                color="#EF4444"
              />
            </div>

            <div className="analytics-charts">
              <ChartCard title="Répartition par série">
                <DonutChart
                  data={badgesData.seriesDistribution}
                  colors={['#5570F1', '#10B981', '#F59E0B']}
                />
              </ChartCard>

              <ChartCard title="Attributions mensuelles">
                <BarChart
                  data={badgesData.monthlyAttributions}
                  color="#10B981"
                />
              </ChartCard>

              <ChartCard title="Compétences par niveau">
                <RadarChart
                  data={badgesData.radarData}
                />
              </ChartCard>

              <ChartCard title="Tendance d'attribution">
                <LineChart
                  data={badgesData.monthlyAttributions}
                  color="#10B981"
                />
              </ChartCard>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default Analytics;
