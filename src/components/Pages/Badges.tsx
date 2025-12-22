import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAppContext } from '../../context/AppContext';
import { mockMembers } from '../../data/mockData';
import { Badge } from '../../types';
import BadgeCard from '../Badges/BadgeCard';
import BadgeModal from '../Modals/BadgeModal';
import BadgeAnalyticsModal from '../Modals/BadgeAnalyticsModal';
import BadgeAssignmentModal from '../Modals/BadgeAssignmentModal';
import BadgeAttributionsModal from '../Modals/BadgeAttributionsModal';
import BadgeExplorer from './BadgeExplorer';
import { getUserBadges } from '../../api/Badges';
import { getSchoolAssignedBadges, getCompanyAssignedBadges, getTeacherAssignedBadges } from '../../api/Dashboard';
import { mapBackendUserBadgeToBadge } from '../../utils/badgeMapper';
import { getOrganizationId } from '../../utils/projectMapper';
import './Badges.css';

const Badges: React.FC = () => {
  const { state } = useAppContext();
  const [selectedBadge, setSelectedBadge] = useState<Badge | null>(null);
  const [isBadgeModalOpen, setIsBadgeModalOpen] = useState(false);
  const [isAnalyticsModalOpen, setIsAnalyticsModalOpen] = useState(false);
  const [isAssignmentModalOpen, setIsAssignmentModalOpen] = useState(false);
  const [isAttributionsModalOpen, setIsAttributionsModalOpen] = useState(false);
  const [selectedBadgeForAttributions, setSelectedBadgeForAttributions] = useState<{ name: string; level: string; badgeId?: string } | null>(null);
  
  // Store raw badge data to access badge IDs
  const [rawBadgeData, setRawBadgeData] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSeries, setSelectedSeries] = useState('TouKouLeur');
  const [selectedLevel, setSelectedLevel] = useState('');
  const [activeTab, setActiveTab] = useState<'cartography' | 'explorer'>('cartography');

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

  // Fetch badges based on context
  const fetchBadges = useCallback(async (page: number = 1) => {
    setIsLoadingBadges(true);
    setBadgesError(null);

    try {
      let response;
      
      if (state.showingPageType === 'user') {
        // Personal user: fetch received badges
        const filters: any = {};
        if (selectedSeries === 'TouKouLeur') {
          filters.series = 'toukouleur';
        } else if (selectedSeries === 'CPS') {
          filters.series = 'psychosociale';
        } else if (selectedSeries === 'Audiovisuelle') {
          filters.series = 'audiovisuelle';
        }
        
        if (selectedLevel) {
          filters.level = selectedLevel.replace('Niveau ', 'level_');
        }
        
        response = await getUserBadges(page, perPage, filters);
        const mapped = (response.data || []).map(mapBackendUserBadgeToBadge);
        setBadges(mapped);
        setTotalPages(response.meta?.total_pages || 1);
        setTotalBadges(response.meta?.total_count || 0);
      } else if (state.showingPageType === 'edu' && organizationId) {
        // School: fetch assigned badges
        // Note: getSchoolAssignedBadges doesn't support filters in current API, filter client-side
        response = await getSchoolAssignedBadges(Number(organizationId), perPage);
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
        response = await getCompanyAssignedBadges(Number(organizationId), perPage);
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

  const filteredBadges = badges.filter(badge => {
    const matchesSearch = badge.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         badge.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         badge.category.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Series filtering
    let matchesSeries = true;
    if (selectedSeries === 'TouKouLeur') {
      matchesSeries = badge.series === 'toukouleur' || badge.series === 'universelle';
    } else if (selectedSeries === 'CPS') {
      matchesSeries = badge.series === 'psychosociale';
    } else if (selectedSeries === 'Audiovisuelle') {
      matchesSeries = badge.series === 'audiovisuelle';
    }
    
    // Level/Domain filtering
    let matchesLevel = true;
    if (selectedLevel) {
      if (selectedSeries === 'TouKouLeur') {
        matchesLevel = badge.level.includes(selectedLevel);
      } else if (selectedSeries === 'CPS') {
        matchesLevel = badge.domains.includes(selectedLevel);
      }
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
    // TODO: Implement export functionality
    console.log('Export badges');
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
        
        let groupKey: string;
        if (selectedSeries === 'CPS') {
          // For CPS, group by domain
          groupKey = badge.domains[0] || 'other';
        } else {
          // For TouKouLeur, group by level
          groupKey = badge.level; // This will be "Niveau 1", "Niveau 2", etc.
        }
        
        if (!grouped[groupKey]) {
          grouped[groupKey] = [];
        }
        grouped[groupKey].push(badge);
      }
    });
    
    return grouped;
  }, [filteredBadges, selectedSeries]);

  // Define levels/domains based on selected series
  const getSections = () => {
    if (selectedSeries === 'CPS') {
      return [
        { key: 'emotionnelles', label: 'Emotionnelles', color: '#ef4444', icon: '/badges_psychosociales/Emotionnelles_final.png' },
        { key: 'cognitives', label: 'Cognitives', color: '#3b82f6', icon: '/badges_psychosociales/Cognitives.jpg' },
        { key: 'sociales', label: 'Sociales', color: '#9333ea', icon: '/badges_psychosociales/Sociales_final.png' }
      ];
    } else {
      // Use keys that match badge.level format ("Niveau 1", "Niveau 2", etc.)
      return [
        { key: 'Niveau 1', label: 'Niveau 1 - Découverte', color: '#10b981', icon: undefined },
        { key: 'Niveau 2', label: 'Niveau 2 - Application', color: '#3b82f6', icon: undefined },
        { key: 'Niveau 3', label: 'Niveau 3 - Maîtrise', color: '#f59e0b', icon: undefined },
        { key: 'Niveau 4', label: 'Niveau 4 - Expertise', color: '#ef4444', icon: undefined }
      ];
    }
  };

  const sections = getSections();

  return (
    <section className="badges-container with-sidebar">
      <div className="badges-content">
        {/* Section Title + Actions */}
        {activeTab === 'cartography' && (
          <div className="section-title-row">
            <div className="section-title-left">
              <img src="/icons_logo/Icon=Badges.svg" alt="Badges" className="section-icon" />
              <h2>{state.showingPageType === 'user' ? 'Cartographie de mes badges' : 'Cartographie des badges attribués'}</h2>
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

        {activeTab === 'cartography' && (
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
              <>
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
                      <option value="TouKouLeur">Série Soft Skills 4LAB</option>
                      <option value="CPS" disabled>Série CPS</option>
                      <option value="Audiovisuelle" disabled>Série Audiovisuelle</option>
                    </select>
                  </div>
                  {selectedSeries === 'TouKouLeur' && (
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
                  )}
                  {selectedSeries === 'CPS' && (
                    <div className="filter-group">
                      <select
                        value={selectedLevel}
                        onChange={(e) => setSelectedLevel(e.target.value)}
                        className="filter-select"
                      >
                        <option value="">Tous les domaines</option>
                        <option value="emotionnelles">Emotionnelles</option>
                        <option value="cognitives">Cognitives</option>
                        <option value="sociales">Sociales</option>
                      </select>
                    </div>
                  )}
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
              </>
            )}
          </>
        )}

        {activeTab === 'explorer' && (
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
