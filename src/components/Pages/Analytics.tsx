import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAppContext } from '../../context/AppContext';
import { getBadges } from '../../api/Badges';
import { getSchoolAssignedBadges, getCompanyAssignedBadges, getSchoolProjects, getCompanyProjects } from '../../api/Dashboard';
import { getSchoolMembersAccepted } from '../../api/SchoolDashboard/Members';
import { getCompanyMembersAccepted } from '../../api/CompanyDashboard/Members';
import { getOrganizationId } from '../../utils/projectMapper';
import { displaySeries } from '../../utils/badgeMapper';
import './Analytics.css';

const LEVEL_COLORS = ['#5570F1', '#10B981', '#F59E0B', '#EC4899'];
const LEVEL_LABELS = ['Niveau 1', 'Niveau 2', 'Niveau 3', 'Niveau 4'];

/** Split a long axis label into multiple lines to avoid overflow and overlap. */
function wrapRadarLabel(label: string, maxCharsPerLine = 22): string[] {
  if (!label || label.length <= maxCharsPerLine) return [label];
  const parts = label.split(/\s*-\s*/).filter(Boolean);
  const lines: string[] = [];
  let current = '';
  for (const part of parts) {
    const next = current ? `${current}-${part}` : part;
    if (next.length <= maxCharsPerLine) {
      current = next;
    } else {
      if (current) lines.push(current);
      if (part.length > maxCharsPerLine) {
        const words = part.split(/\s+/);
        let line = '';
        for (const w of words) {
          const candidate = line ? `${line} ${w}` : w;
          if (candidate.length <= maxCharsPerLine) {
            line = candidate;
          } else {
            if (line) lines.push(line);
            line = w;
          }
        }
        current = line;
      } else {
        current = part;
      }
    }
  }
  if (current) lines.push(current);
  return lines.length ? lines : [label];
}

const Analytics: React.FC = () => {
  const { state } = useAppContext();
  const [activeTab, setActiveTab] = useState<'projects' | 'badges'>('projects');

  const organizationId = useMemo(() => {
    if (!state.user) return undefined;
    return getOrganizationId(state.user, state.showingPageType);
  }, [state.showingPageType, state.user]);

  const isEduOrPro = state.showingPageType === 'edu' || state.showingPageType === 'pro';

  // Badge series options (same list as "Attribuer un badge" modal)
  const [badgeSeriesOptions, setBadgeSeriesOptions] = useState<string[]>([]);
  const [projectOptions, setProjectOptions] = useState<Array<{ id: number; title: string }>>([]);
  const [loadingSeries, setLoadingSeries] = useState(false);
  const [loadingProjects, setLoadingProjects] = useState(false);

  // Répartition par série: filter Par projet only
  const [selectedProjectIdSeriesChart, setSelectedProjectIdSeriesChart] = useState<string>('');
  const [assignedBadgesForSeriesChart, setAssignedBadgesForSeriesChart] = useState<any[]>([]);
  const [loadingSeriesChart, setLoadingSeriesChart] = useState(false);

  // Attributions mensuelles: filters Par série + Par projet
  const [selectedSeriesMonthlyChart, setSelectedSeriesMonthlyChart] = useState<string>('Série TouKouLeur');
  const [selectedProjectIdMonthlyChart, setSelectedProjectIdMonthlyChart] = useState<string>('');
  const [assignedBadgesMonthlyChart, setAssignedBadgesMonthlyChart] = useState<any[]>([]);
  const [loadingMonthlyChart, setLoadingMonthlyChart] = useState(false);

  // Tendances d'attribution: filters Par série + Par projet
  const [selectedSeriesTrendChart, setSelectedSeriesTrendChart] = useState<string>('Série TouKouLeur');
  const [selectedProjectIdTrendChart, setSelectedProjectIdTrendChart] = useState<string>('');
  const [assignedBadgesTrendChart, setAssignedBadgesTrendChart] = useState<any[]>([]);
  const [loadingTrendChart, setLoadingTrendChart] = useState(false);

  // Compétences par niveau: filters Par série + Par projet
  const [selectedSeries, setSelectedSeries] = useState<string>('Série TouKouLeur');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [assignedBadgesRaw, setAssignedBadgesRaw] = useState<any[]>([]);
  const [loadingAssignedBadges, setLoadingAssignedBadges] = useState(false);

  // Stats cards (org-wide): total badges, average per member, attributions this month
  const [assignedBadgesForStats, setAssignedBadgesForStats] = useState<any[]>([]);
  const [loadingStatsBadges, setLoadingStatsBadges] = useState(false);
  const [memberCount, setMemberCount] = useState<number>(0);
  const [loadingMemberCount, setLoadingMemberCount] = useState(false);

  useEffect(() => {
    if (activeTab !== 'badges' || !isEduOrPro) return;
    const fetchSeries = async () => {
      setLoadingSeries(true);
      try {
        const badges = await getBadges();
        const seriesSet = new Set<string>();
        (badges || []).forEach((b: any) => {
          if (b.series) seriesSet.add(b.series);
        });
        setBadgeSeriesOptions(Array.from(seriesSet));
      } catch (e) {
        console.error('Error fetching badge series', e);
      } finally {
        setLoadingSeries(false);
      }
    };
    fetchSeries();
  }, [activeTab, isEduOrPro]);

  useEffect(() => {
    if (activeTab !== 'badges' || !isEduOrPro || !organizationId) return;
    const fetchProjects = async () => {
      setLoadingProjects(true);
      try {
        if (state.showingPageType === 'edu') {
          const res = await getSchoolProjects(Number(organizationId), false, 200, 1);
          const data = res.data?.data ?? res.data ?? [];
          const list = Array.isArray(data) ? data : [];
          setProjectOptions(list.map((p: any) => ({ id: p.id, title: p.title ?? p.name ?? String(p.id) })));
        } else {
          const res = await getCompanyProjects(Number(organizationId), false, 200, 1);
          const data = res.data?.data ?? res.data ?? [];
          const list = Array.isArray(data) ? data : [];
          setProjectOptions(list.map((p: any) => ({ id: p.id, title: p.title ?? p.name ?? String(p.id) })));
        }
      } catch (e) {
        console.error('Error fetching projects', e);
      } finally {
        setLoadingProjects(false);
      }
    };
    fetchProjects();
  }, [activeTab, isEduOrPro, organizationId, state.showingPageType]);

  // Répartition par série: fetch by project only (no series filter)
  useEffect(() => {
    if (activeTab !== 'badges' || !isEduOrPro || !organizationId) return;
    const fetchSeriesChart = async () => {
      setLoadingSeriesChart(true);
      setAssignedBadgesForSeriesChart([]);
      try {
        const perPage = 500;
        const projectIdParam = selectedProjectIdSeriesChart ? Number(selectedProjectIdSeriesChart) : undefined;
        let all: any[] = [];
        let page = 1;
        let totalPages = 1;
        do {
          let res: any;
          if (state.showingPageType === 'edu') {
            res = await getSchoolAssignedBadges(Number(organizationId), perPage, undefined, page, undefined, projectIdParam);
          } else {
            res = await getCompanyAssignedBadges(Number(organizationId), perPage, undefined, page, undefined, projectIdParam);
          }
          const data = res.data?.data ?? res.data ?? [];
          const list = Array.isArray(data) ? data : [];
          all = all.concat(list);
          totalPages = res.data?.meta?.total_pages ?? 1;
          page += 1;
        } while (page <= totalPages);
        setAssignedBadgesForSeriesChart(all);
      } catch (e) {
        console.error('Error fetching badges for series chart', e);
      } finally {
        setLoadingSeriesChart(false);
      }
    };
    fetchSeriesChart();
  }, [activeTab, isEduOrPro, organizationId, selectedProjectIdSeriesChart, state.showingPageType]);

  // Attributions mensuelles: fetch by series + project
  useEffect(() => {
    if (activeTab !== 'badges' || !isEduOrPro || !organizationId || !selectedSeriesMonthlyChart) return;
    const fetchMonthlyChart = async () => {
      setLoadingMonthlyChart(true);
      setAssignedBadgesMonthlyChart([]);
      try {
        const perPage = 500;
        const projectIdParam = selectedProjectIdMonthlyChart ? Number(selectedProjectIdMonthlyChart) : undefined;
        let all: any[] = [];
        let page = 1;
        let totalPages = 1;
        do {
          let res: any;
          if (state.showingPageType === 'edu') {
            res = await getSchoolAssignedBadges(Number(organizationId), perPage, undefined, page, selectedSeriesMonthlyChart, projectIdParam);
          } else {
            res = await getCompanyAssignedBadges(Number(organizationId), perPage, undefined, page, selectedSeriesMonthlyChart, projectIdParam);
          }
          const data = res.data?.data ?? res.data ?? [];
          const list = Array.isArray(data) ? data : [];
          all = all.concat(list);
          totalPages = res.data?.meta?.total_pages ?? 1;
          page += 1;
        } while (page <= totalPages);
        setAssignedBadgesMonthlyChart(all);
      } catch (e) {
        console.error('Error fetching badges for monthly chart', e);
      } finally {
        setLoadingMonthlyChart(false);
      }
    };
    fetchMonthlyChart();
  }, [activeTab, isEduOrPro, organizationId, selectedSeriesMonthlyChart, selectedProjectIdMonthlyChart, state.showingPageType]);

  // Tendances d'attribution: fetch by series + project
  useEffect(() => {
    if (activeTab !== 'badges' || !isEduOrPro || !organizationId || !selectedSeriesTrendChart) return;
    const fetchTrendChart = async () => {
      setLoadingTrendChart(true);
      setAssignedBadgesTrendChart([]);
      try {
        const perPage = 500;
        const projectIdParam = selectedProjectIdTrendChart ? Number(selectedProjectIdTrendChart) : undefined;
        let all: any[] = [];
        let page = 1;
        let totalPages = 1;
        do {
          let res: any;
          if (state.showingPageType === 'edu') {
            res = await getSchoolAssignedBadges(Number(organizationId), perPage, undefined, page, selectedSeriesTrendChart, projectIdParam);
          } else {
            res = await getCompanyAssignedBadges(Number(organizationId), perPage, undefined, page, selectedSeriesTrendChart, projectIdParam);
          }
          const data = res.data?.data ?? res.data ?? [];
          const list = Array.isArray(data) ? data : [];
          all = all.concat(list);
          totalPages = res.data?.meta?.total_pages ?? 1;
          page += 1;
        } while (page <= totalPages);
        setAssignedBadgesTrendChart(all);
      } catch (e) {
        console.error('Error fetching badges for trend chart', e);
      } finally {
        setLoadingTrendChart(false);
      }
    };
    fetchTrendChart();
  }, [activeTab, isEduOrPro, organizationId, selectedSeriesTrendChart, selectedProjectIdTrendChart, state.showingPageType]);

  // Compétences par niveau: fetch by series + project
  useEffect(() => {
    if (activeTab !== 'badges' || !isEduOrPro || !organizationId || !selectedSeries) return;
    const fetchAssignedBadges = async () => {
      setLoadingAssignedBadges(true);
      setAssignedBadgesRaw([]);
      try {
        const perPage = 500;
        const projectIdParam = selectedProjectId ? Number(selectedProjectId) : undefined;
        let all: any[] = [];
        let page = 1;
        let totalPages = 1;
        do {
          let res: any;
          if (state.showingPageType === 'edu') {
            res = await getSchoolAssignedBadges(Number(organizationId), perPage, undefined, page, selectedSeries, projectIdParam);
          } else {
            res = await getCompanyAssignedBadges(Number(organizationId), perPage, undefined, page, selectedSeries, projectIdParam);
          }
          const data = res.data?.data ?? res.data ?? [];
          const list = Array.isArray(data) ? data : [];
          all = all.concat(list);
          totalPages = res.data?.meta?.total_pages ?? 1;
          page += 1;
        } while (page <= totalPages);
        setAssignedBadgesRaw(all);
      } catch (e) {
        console.error('Error fetching assigned badges', e);
      } finally {
        setLoadingAssignedBadges(false);
      }
    };
    fetchAssignedBadges();
  }, [activeTab, isEduOrPro, organizationId, selectedSeries, selectedProjectId, state.showingPageType]);

  // Stats cards: org-wide assigned badges (no series, no project)
  useEffect(() => {
    if (activeTab !== 'badges' || !isEduOrPro || !organizationId) return;
    const fetchStatsBadges = async () => {
      setLoadingStatsBadges(true);
      setAssignedBadgesForStats([]);
      try {
        const perPage = 500;
        let all: any[] = [];
        let page = 1;
        let totalPages = 1;
        do {
          let res: any;
          if (state.showingPageType === 'edu') {
            res = await getSchoolAssignedBadges(Number(organizationId), perPage, undefined, page, undefined, undefined);
          } else {
            res = await getCompanyAssignedBadges(Number(organizationId), perPage, undefined, page, undefined, undefined);
          }
          const data = res.data?.data ?? res.data ?? [];
          const list = Array.isArray(data) ? data : [];
          all = all.concat(list);
          totalPages = res.data?.meta?.total_pages ?? 1;
          page += 1;
        } while (page <= totalPages);
        setAssignedBadgesForStats(all);
      } catch (e) {
        console.error('Error fetching badges for stats', e);
      } finally {
        setLoadingStatsBadges(false);
      }
    };
    fetchStatsBadges();
  }, [activeTab, isEduOrPro, organizationId, state.showingPageType]);

  // Stats cards: member count (confirmed) for average per member
  useEffect(() => {
    if (activeTab !== 'badges' || !isEduOrPro || !organizationId) return;
    const fetchMemberCount = async () => {
      setLoadingMemberCount(true);
      setMemberCount(0);
      try {
        let res: any;
        if (state.showingPageType === 'edu') {
          res = await getSchoolMembersAccepted(Number(organizationId), 1000);
        } else {
          res = await getCompanyMembersAccepted(Number(organizationId), 1000);
        }
        const data = res.data?.data ?? res.data ?? [];
        const list = Array.isArray(data) ? data : [];
        const total = res.data?.meta?.total_count ?? list.length;
        setMemberCount(typeof total === 'number' ? total : list.length);
      } catch (e) {
        console.error('Error fetching member count', e);
      } finally {
        setLoadingMemberCount(false);
      }
    };
    fetchMemberCount();
  }, [activeTab, isEduOrPro, organizationId, state.showingPageType]);

  const MONTH_LABELS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sept', 'Oct', 'Nov', 'Déc'];

  function buildMonthlyAttributions(assignedBadges: any[]): Array<{ month: string; badges: number }> {
    const now = new Date();
    const order: string[] = [];
    const byMonth: Record<string, number> = {};
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      order.push(key);
      byMonth[key] = 0;
    }
    assignedBadges.forEach((ub: any) => {
      const at = ub.assigned_at || ub.created_at;
      if (!at) return;
      const date = new Date(at);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (key in byMonth) byMonth[key] += 1;
    });
    return order.map((key) => {
      const [y, m] = key.split('-');
      const monthIndex = parseInt(m, 10) - 1;
      const yearShort = String(y).slice(2);
      return { month: `${MONTH_LABELS[monthIndex]} '${yearShort}`, badges: byMonth[key] };
    });
  }

  const seriesDistribution = useMemo(() => {
    const bySeries: Record<string, number> = {};
    assignedBadgesForSeriesChart.forEach((ub: any) => {
      const s = ub.badge?.series;
      if (!s) return;
      bySeries[s] = (bySeries[s] ?? 0) + 1;
    });
    const total = Object.values(bySeries).reduce((a, b) => a + b, 0);
    return Object.entries(bySeries).map(([series, value]) => ({
      name: displaySeries(series),
      value,
      percentage: total > 0 ? Math.round((value / total) * 100) : 0
    }));
  }, [assignedBadgesForSeriesChart]);

  const monthlyAttributions = useMemo(() => buildMonthlyAttributions(assignedBadgesMonthlyChart), [assignedBadgesMonthlyChart]);

  const trendAttributions = useMemo(() => buildMonthlyAttributions(assignedBadgesTrendChart), [assignedBadgesTrendChart]);

  // Stats cards: derived from org-wide assigned badges + member count
  const totalBadges = useMemo(() => assignedBadgesForStats.length, [assignedBadgesForStats]);
  const badgesThisMonth = useMemo(() => {
    const now = new Date();
    const currentKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    return assignedBadgesForStats.filter((ub: any) => {
      const at = ub.assigned_at || ub.created_at;
      if (!at) return false;
      const date = new Date(at);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      return key === currentKey;
    }).length;
  }, [assignedBadgesForStats]);
  const averagePerMember = useMemo(() => {
    if (memberCount <= 0) return 0;
    return Math.round((totalBadges / memberCount) * 10) / 10;
  }, [totalBadges, memberCount]);

  const radarCompetenceData = useMemo(() => {
    const byCompetenceAndLevel: Record<string, Record<string, number>> = {};
    assignedBadgesRaw.forEach((ub: any) => {
      const name = ub.badge?.name;
      const level = ub.badge?.level;
      if (!name || !level) return;
      if (!byCompetenceAndLevel[name]) byCompetenceAndLevel[name] = { level_1: 0, level_2: 0, level_3: 0, level_4: 0 };
      const key = level as 'level_1' | 'level_2' | 'level_3' | 'level_4';
      if (key in byCompetenceAndLevel[name]) byCompetenceAndLevel[name][key] += 1;
    });
    const axes = Object.keys(byCompetenceAndLevel).sort();
    if (axes.length === 0) return { axes: [], series: [] };
    const series = LEVEL_LABELS.map((label, idx) => {
      const levelKey = `level_${idx + 1}` as 'level_1' | 'level_2' | 'level_3' | 'level_4';
      const values = axes.map((comp) => (byCompetenceAndLevel[comp]?.[levelKey] ?? 0));
      return { level: label, values, color: LEVEL_COLORS[idx] ?? '#5570F1' };
    });
    return { axes, series };
  }, [assignedBadgesRaw]);

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

  const DonutChart = ({ data, colors, valueLabel = 'projets' }: { data: Array<{ name: string; value: number; percentage: number }>; colors: string[]; valueLabel?: string }) => {
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
            <div className="tooltip-value">{hoveredItem.value} {valueLabel}</div>
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

  const RadarChartByCompetence = ({ axes, series }: { axes: string[]; series: Array<{ level: string; values: number[]; color: string }> }) => {
    const [hoveredSeries, setHoveredSeries] = useState<{ level: string; values: number[]; color: string } | null>(null);
    const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

    const centerX = 50;
    const centerY = 50;
    const maxRadius = 38;
    const n = axes.length;
    if (n === 0) return <div className="radar-chart-empty">Aucune compétence</div>;
    const angleStep = (2 * Math.PI) / n;
    const maxVal = Math.max(1, ...series.flatMap((s) => s.values));

    return (
      <div className="radar-chart">
        <svg width="100%" height="220" className="radar-svg" viewBox="0 0 100 110" preserveAspectRatio="xMidYMid meet">
          {/* Grid circles */}
          {[0.25, 0.5, 0.75, 1.0].map((scale, i) => (
            <circle key={i} cx={centerX} cy={centerY} r={maxRadius * scale} fill="none" stroke="#f0f0f0" strokeWidth="0.3" />
          ))}
          {/* Grid lines from center to each competence axis */}
          {axes.map((_, i) => {
            const angle = i * angleStep - Math.PI / 2;
            const x2 = centerX + maxRadius * Math.cos(angle);
            const y2 = centerY + maxRadius * Math.sin(angle);
            return <line key={i} x1={centerX} y1={centerY} x2={x2} y2={y2} stroke="#f0f0f0" strokeWidth="0.3" />;
          })}
          {/* One polygon per level */}
          {series.map((s, seriesIdx) => {
            const points = s.values.map((val, i) => {
              const angle = i * angleStep - Math.PI / 2;
              const r = maxVal > 0 ? (val / maxVal) * maxRadius : 0;
              return { x: centerX + r * Math.cos(angle), y: centerY + r * Math.sin(angle) };
            });
            const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ' Z';
            return (
              <g key={s.level}>
                <polygon
                  points={points.map((p) => `${p.x},${p.y}`).join(' ')}
                  fill={`${s.color}20`}
                  stroke="none"
                />
                <path
                  d={pathD}
                  fill="none"
                  stroke={s.color}
                  strokeWidth="0.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  onMouseEnter={(e) => {
                    setHoveredSeries(s);
                    setMousePosition({ x: e.clientX, y: e.clientY });
                  }}
                  onMouseMove={(e) => setMousePosition({ x: e.clientX, y: e.clientY })}
                  onMouseLeave={() => setHoveredSeries(null)}
                  style={{ cursor: 'pointer' }}
                />
              </g>
            );
          })}
          {/* Axis labels (competences) - wrapped to multiple lines when long */}
          {axes.map((label, i) => {
            const angle = i * angleStep - Math.PI / 2;
            const dist = maxRadius + 12;
            const x = centerX + dist * Math.cos(angle);
            const y = centerY + dist * Math.sin(angle);
            const lines = wrapRadarLabel(label);
            return (
              <text
                key={i}
                x={x}
                y={y}
                textAnchor="middle"
                dominantBaseline="middle"
                className="radar-label"
                fontSize="2.9"
                fill="#6b7280"
              >
                {lines.map((line, j) => (
                  <tspan key={j} x={x} dy={j === 0 ? `${(lines.length - 1) * -0.6}em` : '1.2em'}>
                    {line}
                  </tspan>
                ))}
              </text>
            );
          })}
        </svg>
        <div className="radar-legend">
          {series.map((s, i) => (
            <span key={i} className="radar-legend-item" style={{ color: s.color }}>
              <span className="radar-legend-dot" style={{ backgroundColor: s.color }} /> {s.level}
            </span>
          ))}
        </div>
        {hoveredSeries && (
          <div className="chart-tooltip" style={{ left: mousePosition.x + 10, top: mousePosition.y - 10 }}>
            <div className="tooltip-title">{hoveredSeries.level}</div>
            <div className="tooltip-value">{hoveredSeries.values.reduce((a, b) => a + b, 0)} badges</div>
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
            <div className="analytics-stats analytics-stats--badges">
              {!isEduOrPro || !organizationId ? (
                <div className="analytics-stats-message">Sélectionnez un contexte organisation pour voir les statistiques.</div>
              ) : loadingStatsBadges || loadingMemberCount ? (
                <div className="analytics-stats-message">Chargement…</div>
              ) : (
                <>
                  <StatCard
                    title="Badges totaux"
                    value={totalBadges}
                    subtitle={`${totalBadges} attribués`}
                    icon="/icons_logo/Icon=Badges.svg"
                    color="#5570F1"
                    iconType="image"
                  />
                  <StatCard
                    title="Moyenne par membre"
                    value={averagePerMember}
                    subtitle="Badges par personne"
                    icon="fas fa-user-graduate"
                    color="#10B981"
                  />
                  <StatCard
                    title="Attributions ce mois"
                    value={badgesThisMonth}
                    subtitle="Nouveaux badges"
                    icon="fas fa-star"
                    color="#EF4444"
                  />
                </>
              )}
            </div>

            <div className="analytics-charts">
              <ChartCard title="Répartition par série">
                {isEduOrPro && organizationId && (
                  <div className="analytics-chart-filters">
                    <div className="analytics-filter-group">
                      <label htmlFor="analytics-series-chart-project">Par projet</label>
                      <select
                        id="analytics-series-chart-project"
                        className="analytics-select"
                        value={selectedProjectIdSeriesChart}
                        onChange={(e) => setSelectedProjectIdSeriesChart(e.target.value)}
                        disabled={loadingProjects}
                      >
                        <option value="">Tous les projets</option>
                        {projectOptions.map((p) => (
                          <option key={p.id} value={String(p.id)}>{p.title}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
                {!isEduOrPro || !organizationId ? (
                  <div className="analytics-chart-empty">Sélectionnez un contexte organisation pour voir les données.</div>
                ) : loadingSeriesChart ? (
                  <div className="analytics-chart-loading">Chargement…</div>
                ) : seriesDistribution.length === 0 ? (
                  <div className="analytics-chart-empty">Aucune donnée pour les critères sélectionnés.</div>
                ) : (
                  <DonutChart
                    data={seriesDistribution}
                    colors={['#5570F1', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899']}
                    valueLabel="badges"
                  />
                )}
              </ChartCard>

              <ChartCard title="Attributions mensuelles">
                {isEduOrPro && organizationId && (
                  <div className="analytics-chart-filters">
                    <div className="analytics-filter-group">
                      <label htmlFor="analytics-monthly-series">Par série des badges</label>
                      <select
                        id="analytics-monthly-series"
                        className="analytics-select"
                        value={selectedSeriesMonthlyChart}
                        onChange={(e) => setSelectedSeriesMonthlyChart(e.target.value)}
                        disabled={loadingSeries}
                      >
                        {badgeSeriesOptions.map((s) => (
                          <option key={s} value={s}>{displaySeries(s)}</option>
                        ))}
                      </select>
                    </div>
                    <div className="analytics-filter-group">
                      <label htmlFor="analytics-monthly-project">Par projet</label>
                      <select
                        id="analytics-monthly-project"
                        className="analytics-select"
                        value={selectedProjectIdMonthlyChart}
                        onChange={(e) => setSelectedProjectIdMonthlyChart(e.target.value)}
                        disabled={loadingProjects}
                      >
                        <option value="">Tous les projets</option>
                        {projectOptions.map((p) => (
                          <option key={p.id} value={String(p.id)}>{p.title}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
                {!isEduOrPro || !organizationId ? (
                  <div className="analytics-chart-empty">Sélectionnez un contexte organisation pour voir les données.</div>
                ) : loadingMonthlyChart ? (
                  <div className="analytics-chart-loading">Chargement…</div>
                ) : (
                  <BarChart
                    data={monthlyAttributions}
                    color="#10B981"
                  />
                )}
              </ChartCard>

              <ChartCard title="Tendances d'attribution">
                {isEduOrPro && organizationId && (
                  <div className="analytics-chart-filters">
                    <div className="analytics-filter-group">
                      <label htmlFor="analytics-trend-series">Par série des badges</label>
                      <select
                        id="analytics-trend-series"
                        className="analytics-select"
                        value={selectedSeriesTrendChart}
                        onChange={(e) => setSelectedSeriesTrendChart(e.target.value)}
                        disabled={loadingSeries}
                      >
                        {badgeSeriesOptions.map((s) => (
                          <option key={s} value={s}>{displaySeries(s)}</option>
                        ))}
                      </select>
                    </div>
                    <div className="analytics-filter-group">
                      <label htmlFor="analytics-trend-project">Par projet</label>
                      <select
                        id="analytics-trend-project"
                        className="analytics-select"
                        value={selectedProjectIdTrendChart}
                        onChange={(e) => setSelectedProjectIdTrendChart(e.target.value)}
                        disabled={loadingProjects}
                      >
                        <option value="">Tous les projets</option>
                        {projectOptions.map((p) => (
                          <option key={p.id} value={String(p.id)}>{p.title}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
                {!isEduOrPro || !organizationId ? (
                  <div className="analytics-chart-empty">Sélectionnez un contexte organisation pour voir les données.</div>
                ) : loadingTrendChart ? (
                  <div className="analytics-chart-loading">Chargement…</div>
                ) : (
                  <LineChart
                    data={trendAttributions}
                    color="#10B981"
                  />
                )}
              </ChartCard>

              <ChartCard title="Compétences par niveau">
                {isEduOrPro && organizationId && (
                  <div className="analytics-chart-filters">
                    <div className="analytics-filter-group">
                      <label htmlFor="analytics-badge-series">Par série des badges</label>
                      <select
                        id="analytics-badge-series"
                        className="analytics-select"
                        value={selectedSeries}
                        onChange={(e) => setSelectedSeries(e.target.value)}
                        disabled={loadingSeries}
                      >
                        {badgeSeriesOptions.map((s) => (
                          <option key={s} value={s}>{displaySeries(s)}</option>
                        ))}
                      </select>
                    </div>
                    <div className="analytics-filter-group">
                      <label htmlFor="analytics-project">Par projet</label>
                      <select
                        id="analytics-project"
                        className="analytics-select"
                        value={selectedProjectId}
                        onChange={(e) => setSelectedProjectId(e.target.value)}
                        disabled={loadingProjects}
                      >
                        <option value="">Tous les projets</option>
                        {projectOptions.map((p) => (
                          <option key={p.id} value={String(p.id)}>{p.title}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
                {!isEduOrPro || !organizationId ? (
                  <div className="analytics-chart-empty">Sélectionnez un contexte organisation (établissement ou entreprise) pour voir les données.</div>
                ) : loadingAssignedBadges ? (
                  <div className="analytics-chart-loading">Chargement des données…</div>
                ) : radarCompetenceData.axes.length === 0 ? (
                  <div className="analytics-chart-empty">Aucune donnée pour les critères sélectionnés.</div>
                ) : (
                  <RadarChartByCompetence axes={radarCompetenceData.axes} series={radarCompetenceData.series} />
                )}
              </ChartCard>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default Analytics;
