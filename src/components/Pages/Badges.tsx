import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAppContext } from '../../context/AppContext';
import { mockMembers } from '../../data/mockData';
import { Badge } from '../../types';
import BadgeCard from '../Badges/BadgeCard';
import BadgeModal from '../Modals/BadgeModal';
import BadgeAnalyticsModal from '../Modals/BadgeAnalyticsModal';
import BadgeAssignmentModal from '../Modals/BadgeAssignmentModal';
import BadgeAttributionsModal from '../Modals/BadgeAttributionsModal';
import BadgeExportModal from '../Modals/BadgeExportModal';
import BadgeExplorer from './BadgeExplorer';
import { getBadges, getUserBadges } from '../../api/Badges';
import { RadarChartByCompetenceStats } from '../Charts/RadarChartByCompetenceStats';
import { getSchoolAssignedBadges, getCompanyAssignedBadges, getTeacherAssignedBadges } from '../../api/Dashboard';
import { getAllUserProjects } from '../../api/Project';
import { mapBackendUserBadgeToBadge } from '../../utils/badgeMapper';
import { displaySeries } from '../../utils/badgeMapper';
import { getLevelLabel } from '../../utils/badgeLevelLabels';
import { getOrganizationId } from '../../utils/projectMapper';
import './Analytics.css';
import './Badges.css';

const Badges: React.FC = () => {
  const { state, setCurrentPage: setAppCurrentPage } = useAppContext();
  const navigate = useNavigate();
  const location = useLocation();
  const [selectedBadge, setSelectedBadge] = useState<Badge | null>(null);
  const [isBadgeModalOpen, setIsBadgeModalOpen] = useState(false);
  const [isAnalyticsModalOpen, setIsAnalyticsModalOpen] = useState(false);
  const [isAssignmentModalOpen, setIsAssignmentModalOpen] = useState(false);
  const [isAttributionsModalOpen, setIsAttributionsModalOpen] = useState(false);
  const [selectedBadgeForAttributions, setSelectedBadgeForAttributions] = useState<{ name: string; level: string; badgeId?: string } | null>(null);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  
  // Store raw badge data to access badge IDs
  const [rawBadgeData, setRawBadgeData] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSeries, setSelectedSeries] = useState('Série TouKouLeur');
  const [selectedLevel, setSelectedLevel] = useState('');
  const [activeTab, setActiveTab] = useState<'cartography' | 'explorer'>('cartography');

  // Personal user: main tab "Ma cartographie" | "Mes statistiques" (default cartography)
  const [userMainTab, setUserMainTab] = useState<'cartography' | 'statistics'>('cartography');
  // Mes statistiques: Compétences par niveau
  const [selectedSeriesStats, setSelectedSeriesStats] = useState<string>('Série TouKouLeur');
  const [selectedProjectIdStats, setSelectedProjectIdStats] = useState<string>('');
  const [userBadgesForChart, setUserBadgesForChart] = useState<any[]>([]);
  const [loadingUserBadgesForChart, setLoadingUserBadgesForChart] = useState(false);
  const [badgeSeriesOptionsStats, setBadgeSeriesOptionsStats] = useState<string[]>([]);
  const [projectOptionsUser, setProjectOptionsUser] = useState<Array<{ id: number; title: string }>>([]);
  const [loadingSeriesStats, setLoadingSeriesStats] = useState(false);
  const [loadingProjectsUser, setLoadingProjectsUser] = useState(false);

  // API data states
  const [badges, setBadges] = useState<Badge[]>([]);
  const [isLoadingBadges, setIsLoadingBadges] = useState(false);
  const [badgesError, setBadgesError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalBadges, setTotalBadges] = useState(0);
  const perPage = 50; // Load more badges per page for cartography

  // Get organization ID and context
  const organizationId = useMemo(() => {
    if (!state.user) return undefined;
    return getOrganizationId(state.user, state.showingPageType);
  }, [state.showingPageType, state.user]);

  // Read tab query parameter from URL to open statistics tab directly
  useEffect(() => {
    if (state.showingPageType === 'user') {
      const searchParams = new URLSearchParams(location.search);
      const tabParam = searchParams.get('tab');
      if (tabParam === 'statistics') {
        setUserMainTab('statistics');
        // Clean up URL by removing the query parameter after applying
        navigate('/badges', { replace: true });
      }
    }
  }, [location.search, state.showingPageType, navigate]);

  // Fetch badges based on context
  const fetchBadges = useCallback(async (page: number = 1) => {
    setIsLoadingBadges(true);
    setBadgesError(null);

    try {
      let response;
      
      if (state.showingPageType === 'user') {
        // Personal user: fetch received badges
        const filters: any = {};
        if (selectedSeries) {
          filters.series = selectedSeries; // Use exact database series name
        }
        
        if (selectedLevel) {
          filters.level = selectedLevel.replace('Niveau ', 'level_');
        }
        
        response = await getUserBadges(page, perPage, filters);
        const payload = Array.isArray(response.data) ? response.data : [];
        setRawBadgeData(payload); // Store raw for PDF export (same as orgs)
        const mapped = payload.map(mapBackendUserBadgeToBadge);
        setBadges(mapped);
        setTotalPages(response.meta?.total_pages || 1);
        setTotalBadges(response.meta?.total_count || 0);
      } else if (state.showingPageType === 'edu' && organizationId) {
        // School: fetch assigned badges
        response = await getSchoolAssignedBadges(Number(organizationId), perPage, undefined, page, selectedSeries || undefined);
        const payload = response.data?.data ?? response.data ?? [];
        setRawBadgeData(payload); // Store raw data for badge ID lookup
        const mapped = (Array.isArray(payload) ? payload : []).map(mapBackendUserBadgeToBadge);
        setBadges(mapped);
        // Use pagination meta from backend if available
        const meta = response.data?.meta;
        setTotalPages(meta?.total_pages || 1);
        setTotalBadges(meta?.total_count || mapped.length);
      } else if (state.showingPageType === 'pro' && organizationId) {
        // Company: fetch assigned badges
        response = await getCompanyAssignedBadges(Number(organizationId), perPage, undefined, page, selectedSeries || undefined);
        const payload = response.data?.data ?? response.data ?? [];
        setRawBadgeData(payload); // Store raw data for badge ID lookup
        const mapped = (Array.isArray(payload) ? payload : []).map(mapBackendUserBadgeToBadge);
        setBadges(mapped);
        // Use pagination meta from backend if available
        const meta = response.data?.meta;
        setTotalPages(meta?.total_pages || 1);
        setTotalBadges(meta?.total_count || mapped.length);
      } else if (state.showingPageType === 'teacher') {
        // Teacher: fetch assigned badges
        response = await getTeacherAssignedBadges(perPage);
        const payload = response.data?.data ?? response.data ?? [];
        setRawBadgeData(payload); // Store raw data for badge ID lookup
        const mapped = (Array.isArray(payload) ? payload : []).map(mapBackendUserBadgeToBadge);
        setBadges(mapped);
        // Use pagination meta from backend if available
        const meta = response.data?.meta;
        setTotalPages(meta?.total_pages || 1);
        setTotalBadges(meta?.total_count || mapped.length);
      } else {
        setBadges([]);
        setTotalPages(1);
        setTotalBadges(0);
      }
    } catch (error: any) {
      console.error('Error fetching badges:', error);
      setBadgesError('Erreur lors du chargement des badges');
      setBadges([]);
    } finally {
      setIsLoadingBadges(false);
    }
  }, [state.showingPageType, organizationId, selectedSeries, selectedLevel, perPage]);

  // Load badges when component mounts or filters change
  useEffect(() => {
    setCurrentPage(1);
    fetchBadges(1);
  }, [fetchBadges]);

  // Mes statistiques (personal user): fetch badge series options
  useEffect(() => {
    if (state.showingPageType !== 'user') return;
    const fetchSeries = async () => {
      setLoadingSeriesStats(true);
      try {
        const list = await getBadges();
        const seriesSet = new Set<string>();
        (Array.isArray(list) ? list : []).forEach((b: any) => { if (b.series) seriesSet.add(b.series); });
        setBadgeSeriesOptionsStats(Array.from(seriesSet));
      } catch (e) {
        console.error('Error fetching badge series', e);
      } finally {
        setLoadingSeriesStats(false);
      }
    };
    fetchSeries();
  }, [state.showingPageType]);

  // Mes statistiques (personal user): fetch user's projects for "Par projet" filter
  useEffect(() => {
    if (state.showingPageType !== 'user') return;
    const fetchProjects = async () => {
      setLoadingProjectsUser(true);
      try {
        const res = await getAllUserProjects({ per_page: 200, page: 1 });
        const data = res.data?.data ?? res.data ?? [];
        const list = Array.isArray(data) ? data : [];
        setProjectOptionsUser(list.map((p: any) => ({ id: p.id, title: p.title ?? p.name ?? String(p.id) })));
      } catch (e) {
        console.error('Error fetching user projects', e);
      } finally {
        setLoadingProjectsUser(false);
      }
    };
    fetchProjects();
  }, [state.showingPageType]);

  // Mes statistiques (personal user): fetch user badges for chart (single call per_page=500), then filter by project client-side
  useEffect(() => {
    if (state.showingPageType !== 'user' || userMainTab !== 'statistics' || !selectedSeriesStats) return;
    const fetchUserBadgesForChart = async () => {
      setLoadingUserBadgesForChart(true);
      setUserBadgesForChart([]);
      try {
        const response = await getUserBadges(1, 500, { series: selectedSeriesStats });
        let list = Array.isArray(response.data) ? response.data : [];
        if (selectedProjectIdStats) {
          const projectIdNum = parseInt(selectedProjectIdStats, 10);
          list = list.filter((ub: any) => (ub.project?.id ?? ub.project_id) === projectIdNum);
        }
        setUserBadgesForChart(list);
      } catch (e) {
        console.error('Error fetching user badges for chart', e);
      } finally {
        setLoadingUserBadgesForChart(false);
      }
    };
    fetchUserBadgesForChart();
  }, [state.showingPageType, userMainTab, selectedSeriesStats, selectedProjectIdStats]);

  const filteredBadges = badges.filter(badge => {
    const matchesSearch = badge.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         badge.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         badge.category.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Series filtering - use exact database series name
    let matchesSeries = true;
    if (selectedSeries) {
      matchesSeries = badge.series === selectedSeries;
    }
    
    // Level filtering - works for all series
    let matchesLevel = true;
    if (selectedLevel) {
      matchesLevel = badge.level.includes(selectedLevel);
    }
    
    return matchesSearch && matchesSeries && matchesLevel;
  });

  const handleBadgeClick = (badge: Badge) => {
    // Find the badge ID from raw data
    const rawBadge = rawBadgeData.find((item: any) => {
      const badgeName = item?.badge?.name;
      const badgeLevel = item?.badge?.level;
      const levelMatch = badgeLevel === badge.level.replace('Niveau ', 'level_') || 
                        badgeLevel === badge.level;
      return badgeName === badge.name && levelMatch;
    });
    
    const badgeId = rawBadge?.badge?.id?.toString();
    
    setSelectedBadgeForAttributions({
      name: badge.name,
      level: badge.level,
      badgeId: badgeId
    });
    setIsAttributionsModalOpen(true);
  };

  const handleEditBadge = (badge: Badge) => {
    setSelectedBadge(badge);
    setIsBadgeModalOpen(true);
  };

  const handleDeleteBadge = (id: string) => {
    console.log('Delete badge:', id);
  };

  const handleSaveBadge = (badgeData: Omit<Badge, 'id'>) => {
    console.log('Save badge:', badgeData);
    setIsBadgeModalOpen(false);
    setSelectedBadge(null);
  };

  const handleExportBadges = () => {
    setIsExportModalOpen(true);
  };

  const handleSaveAssignment = (assignmentData: any) => {
    console.log('Assign badge:', assignmentData);
    setIsAssignmentModalOpen(false);
  };

  // Count attributions per badge (name + level combination)
  const badgeAttributionCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredBadges.forEach((badge) => {
      // Create a unique key from badge name and level
      const key = `${badge.name}|${badge.level}`;
      counts[key] = (counts[key] || 0) + 1;
    });
    return counts;
  }, [filteredBadges]);

  // Group badges by level/domain for cartography view
  // Also deduplicate badges (show unique badge name + level combinations)
  const badgesByLevel = useMemo(() => {
    const grouped: Record<string, Badge[]> = {};
    const seen = new Set<string>();
    
    filteredBadges.forEach((badge) => {
      const key = `${badge.name}|${badge.level}`;
      
      // Only add unique badge (name + level) to the group
      if (!seen.has(key)) {
        seen.add(key);
        
        // All series use level-based grouping
        const groupKey = badge.level; // This will be "Niveau 1", "Niveau 2", etc.
        
        if (!grouped[groupKey]) {
          grouped[groupKey] = [];
        }
        grouped[groupKey].push(badge);
      }
    });
    
    return grouped;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredBadges]); // selectedSeries is already captured in filteredBadges dependency

  // Define levels based on selected series - all series use level-based sections
  const getSections = (series: string) => {
    // Use keys that match badge.level format ("Niveau 1", "Niveau 2", etc.)
    // Labels are dynamically generated based on the series
    return [
      { key: 'Niveau 1', label: getLevelLabel(series, '1'), color: '#10b981', icon: undefined },
      { key: 'Niveau 2', label: getLevelLabel(series, '2'), color: '#3b82f6', icon: undefined },
      { key: 'Niveau 3', label: getLevelLabel(series, '3'), color: '#f59e0b', icon: undefined },
      { key: 'Niveau 4', label: getLevelLabel(series, '4'), color: '#ef4444', icon: undefined }
    ];
  };

  const sections = getSections(selectedSeries || 'Série TouKouLeur');

  // Mes statistiques: Compétences par niveau (same logic as Analytics)
  const LEVEL_COLORS_STATS = ['#5570F1', '#10B981', '#F59E0B', '#EC4899'];
  const LEVEL_LABELS_STATS = ['Niveau 1', 'Niveau 2', 'Niveau 3', 'Niveau 4'];
  const radarCompetenceData = useMemo(() => {
    const byCompetenceAndLevel: Record<string, Record<string, number>> = {};
    userBadgesForChart.forEach((ub: any) => {
      const name = ub.badge?.name;
      const level = ub.badge?.level;
      if (!name || !level) return;
      if (!byCompetenceAndLevel[name]) byCompetenceAndLevel[name] = { level_1: 0, level_2: 0, level_3: 0, level_4: 0 };
      const key = level as 'level_1' | 'level_2' | 'level_3' | 'level_4';
      if (key in byCompetenceAndLevel[name]) byCompetenceAndLevel[name][key] += 1;
    });
    const axes = Object.keys(byCompetenceAndLevel).sort();
    if (axes.length === 0) return { axes: [], series: [] };
    const series = LEVEL_LABELS_STATS.map((label, idx) => {
      const levelKey = `level_${idx + 1}` as 'level_1' | 'level_2' | 'level_3' | 'level_4';
      const values = axes.map((comp) => (byCompetenceAndLevel[comp]?.[levelKey] ?? 0));
      return { level: label, values, color: LEVEL_COLORS_STATS[idx] ?? '#5570F1' };
    });
    return { axes, series };
  }, [userBadgesForChart]);

  const ChartCardStats = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="analytics-chart-card badges-stats-chart-card">
      <h3 className="chart-title">{title}</h3>
      <div className="chart-content">{children}</div>
    </div>
  );

  return (
    <section className="badges-container with-sidebar">
      <div className="badges-content">
        {/* User personal view: single title "Mes badges", Explorer/Exporter only on Ma cartographie, tabs below (pink underline style). Hidden when Explorer is active so Explorer appears as separate page. */}
        {state.showingPageType === 'user' && (
          <div className="dashboard-back-link-wrap">
            <button type="button" className="dashboard-back-link" onClick={() => { setAppCurrentPage('dashboard'); navigate('/dashboard'); }}>
              ← Vers mon tableau de bord
            </button>
          </div>
        )}
        {state.showingPageType === 'user' && activeTab === 'cartography' && (
          <>
            <div className="section-title-row">
              <div className="section-title-left">
                <img src="/icons_logo/Icon=Badges.svg" alt="Badges" className="section-icon" />
                <h2>Mes badges</h2>
              </div>
              {userMainTab === 'cartography' && (
                <div className="badges-actions">
                  <button className="btn btn-outline" onClick={() => setActiveTab('explorer')}>
                    <i className="fas fa-search"></i> Explorer les badges
                  </button>
                  <button className="btn btn-outline" onClick={handleExportBadges}>
                    <i className="fas fa-download"></i> Exporter
                  </button>
                </div>
              )}
            </div>
            <div className="badges-user-tabs">
              <button
                type="button"
                className={`badges-user-tab ${userMainTab === 'cartography' ? 'active' : ''}`}
                onClick={() => setUserMainTab('cartography')}
              >
                Ma cartographie
              </button>
              <button
                type="button"
                className={`badges-user-tab ${userMainTab === 'statistics' ? 'active' : ''}`}
                onClick={() => setUserMainTab('statistics')}
              >
                Mes statistiques
              </button>
            </div>
          </>
        )}

        {/* Mes statistiques: Compétences par niveau (filters + radar chart) */}
        {state.showingPageType === 'user' && userMainTab === 'statistics' && (
          <ChartCardStats title="Compétences par niveau">
            <div className="analytics-chart-filters">
              <div className="analytics-filter-group">
                <label>Par série des badges</label>
                <select
                  value={selectedSeriesStats}
                  onChange={(e) => setSelectedSeriesStats(e.target.value)}
                  disabled={loadingSeriesStats}
                >
                  {badgeSeriesOptionsStats.length === 0 && <option value="Série TouKouLeur">Série Soft Skills 4LAB</option>}
                  {badgeSeriesOptionsStats.map((s) => (
                    <option key={s} value={s}>{displaySeries(s)}</option>
                  ))}
                </select>
              </div>
              <div className="analytics-filter-group">
                <label>Par projet</label>
                <select
                  value={selectedProjectIdStats}
                  onChange={(e) => setSelectedProjectIdStats(e.target.value)}
                  disabled={loadingProjectsUser}
                >
                  <option value="">Tous les projets</option>
                  {projectOptionsUser.map((p) => (
                    <option key={p.id} value={String(p.id)}>{p.title}</option>
                  ))}
                </select>
              </div>
            </div>
            {loadingUserBadgesForChart ? (
              <div className="badges-loading"><i className="fas fa-spinner fa-spin"></i> Chargement...</div>
            ) : (
              <RadarChartByCompetenceStats axes={radarCompetenceData.axes} series={radarCompetenceData.series} />
            )}
          </ChartCardStats>
        )}

        {/* Pro/edu only: Section Title + Actions (no second title for user) */}
        {state.showingPageType !== 'user' && activeTab === 'cartography' && (
          <div className="section-title-row">
            <div className="section-title-left">
              <img src="/icons_logo/Icon=Badges.svg" alt="Badges" className="section-icon" />
              <h2>Cartographie des badges attribués</h2>
            </div>
            <div className="badges-actions">
              <button className="btn btn-outline" onClick={() => setActiveTab('explorer')}>
                <i className="fas fa-search"></i> Explorer les badges
              </button>
              <button className="btn btn-outline" onClick={handleExportBadges}>
                <i className="fas fa-download"></i> Exporter
              </button>
            </div>
          </div>
        )}

        {(state.showingPageType !== 'user' || userMainTab === 'cartography') && activeTab === 'cartography' && (
          <>
            {/* Loading/Error States */}
            {isLoadingBadges && (
              <div className="badges-loading">
                <i className="fas fa-spinner fa-spin"></i>
                <p>Chargement des badges...</p>
              </div>
            )}
            
            {badgesError && (
              <div className="badges-error">
                <i className="fas fa-exclamation-circle"></i>
                <p>{badgesError}</p>
              </div>
            )}

            {!isLoadingBadges && !badgesError && (
              <div className="badge-cartography-view">
                {/* Search and Filters */}
                <div className="badges-filters">
                  <div className="search-bar">
                    <i className="fas fa-search"></i>
                    <input
                      type="text"
                      placeholder="Rechercher un badge par nom, catégorie, niveau..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <div className="filter-group">
                    <select
                      value={selectedSeries}
                      onChange={(e) => setSelectedSeries(e.target.value)}
                      className="filter-select big-select"
                    >
                      <option value="Série TouKouLeur">Série Soft Skills 4LAB</option>
                      <option value="Série Parcours des possibles">Série Parcours des possibles</option>
                      <option value="Série Audiovisuelle">Série Audiovisuelle</option>
                      <option value="Série Parcours professionnel">Série Parcours professionnel</option>
                    </select>
                  </div>
                  <div className="filter-group">
                    <select
                      value={selectedLevel}
                      onChange={(e) => setSelectedLevel(e.target.value)}
                      className="filter-select"
                    >
                      <option value="">Tous les niveaux</option>
                      <option value="Niveau 1">Niveau 1</option>
                      <option value="Niveau 2">Niveau 2</option>
                      <option value="Niveau 3">Niveau 3</option>
                      <option value="Niveau 4">Niveau 4</option>
                    </select>
                  </div>
                </div>

        {/* Badge Cartography Header */}
         {/*<div className="cartography-header">
          <h2>
            {selectedSeries === 'CPS' 
              ? 'Cartographie des badges par domaine par série CPS'
              : 'Cartographie des badges par niveaux par série TouKouLeur'
            }
          </h2>
        </div> */}

                {/* Badges Content - Organized by Levels/Domains */}
                <div className="badges-content">
                  {badges.length === 0 ? (
                    <div className="badges-empty">
                      <i className="fas fa-award"></i>
                      <h4>Aucun badge trouvé</h4>
                      <p>Les badges attribués apparaîtront ici.</p>
                    </div>
                  ) : (
                    sections.map((section) => {
                      const sectionBadges = badgesByLevel[section.key] || [];
                      if (sectionBadges.length === 0) return null;
                      
                      return (
                        <div key={section.key} className="level-divider">
                          <div className="level-header">
                            <div className="level-title" style={{ color: section.color }}>
                              {section.icon ? (
                                <img src={section.icon} alt={section.label} className="domain-icon" />
                              ) : (
                                <div className="level-color-square" style={{ backgroundColor: section.color }}></div>
                              )}
                              <span>{section.label}</span>
                            </div>
                            <div className="bg-red-500 level-count">
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
                                  key={badge.id}
                                  badge={badge}
                                  onClick={() => handleBadgeClick(badge)}
                                  onEdit={() => handleEditBadge(badge)}
                                  onDelete={() => handleDeleteBadge(badge.id)}
                                  attributionCount={attributionCount}
                                />
                              );
                            })}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="badges-pagination">
                    <button
                      className="btn btn-outline"
                      onClick={() => {
                        const newPage = currentPage - 1;
                        setCurrentPage(newPage);
                        fetchBadges(newPage);
                      }}
                      disabled={currentPage === 1 || isLoadingBadges}
                    >
                      <i className="fas fa-chevron-left"></i> Précédent
                    </button>
                    <span className="pagination-info">
                      Page {currentPage} sur {totalPages} ({totalBadges} badge{totalBadges > 1 ? 's' : ''})
                    </span>
                    <button
                      className="btn btn-outline"
                      onClick={() => {
                        const newPage = currentPage + 1;
                        setCurrentPage(newPage);
                        fetchBadges(newPage);
                      }}
                      disabled={currentPage >= totalPages || isLoadingBadges}
                    >
                      Suivant <i className="fas fa-chevron-right"></i>
                    </button>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {(state.showingPageType !== 'user' || userMainTab === 'cartography') && activeTab === 'explorer' && (
          <BadgeExplorer onBack={() => setActiveTab('cartography')} />
        )}

      </div>

      {/* Badge Modal */}
      {isBadgeModalOpen && (
        <BadgeModal
          badge={selectedBadge}
          onClose={() => {
            setIsBadgeModalOpen(false);
            setSelectedBadge(null);
          }}
          onSave={handleSaveBadge}
        />
      )}

      {/* Badge Attributions Modal */}
      {isAttributionsModalOpen && selectedBadgeForAttributions && (
        <BadgeAttributionsModal
          isOpen={isAttributionsModalOpen}
          onClose={() => {
            setIsAttributionsModalOpen(false);
            setSelectedBadgeForAttributions(null);
          }}
          badgeName={selectedBadgeForAttributions.name}
          badgeLevel={selectedBadgeForAttributions.level}
          badgeId={selectedBadgeForAttributions.badgeId}
        />
      )}

      {/* Badge Export Modal */}
      {isExportModalOpen && (
        <BadgeExportModal
          isOpen={isExportModalOpen}
          onClose={() => setIsExportModalOpen(false)}
          badges={filteredBadges}
          rawAttributions={filteredBadges.map((fb) => rawBadgeData.find((r: any) => String(r?.id) === String(fb.id))).filter(Boolean)}
          filters={{
            series: selectedSeries,
            level: selectedLevel,
            searchTerm: searchTerm
          }}
          context={{
            showingPageType: state.showingPageType,
            organizationId: organizationId ? Number(organizationId) : undefined,
            organizationName: state.user?.available_contexts?.companies?.find((c: any) => c.id === organizationId)?.name ||
                              state.user?.available_contexts?.schools?.find((s: any) => s.id === organizationId)?.name
          }}
        />
      )}

      {/* Analytics Modal */}
      {isAnalyticsModalOpen && (
        <BadgeAnalyticsModal
          onClose={() => setIsAnalyticsModalOpen(false)}
        />
      )}


      {/* Badge Assignment Modal */}
      {isAssignmentModalOpen && (
        <BadgeAssignmentModal
          onClose={() => setIsAssignmentModalOpen(false)}
          onAssign={handleSaveAssignment}
          participants={mockMembers.map(member => ({
            id: member.id,
            memberId: member.id,
            name: `${member.firstName} ${member.lastName}`,
            avatar: member.avatar
          }))}
        />
      )}
    </section>
  );
};

export default Badges;
