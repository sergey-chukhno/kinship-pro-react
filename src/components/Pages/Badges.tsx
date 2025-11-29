import React, { useState } from 'react';
// import { useAppContext } from '../../context/AppContext';
import { mockBadges, mockMembers } from '../../data/mockData';
import { Badge } from '../../types';
import BadgeCard from '../Badges/BadgeCard';
import BadgeModal from '../Modals/BadgeModal';
import BadgeAnalyticsModal from '../Modals/BadgeAnalyticsModal';
import BadgeAssignmentModal from '../Modals/BadgeAssignmentModal';
import BadgeExplorer from './BadgeExplorer';
import './Badges.css';

const Badges: React.FC = () => {
  // const { state, addBadge, updateBadge, deleteBadge } = useAppContext();
  const [selectedBadge, setSelectedBadge] = useState<Badge | null>(null);
  const [isBadgeModalOpen, setIsBadgeModalOpen] = useState(false);
  const [isAnalyticsModalOpen, setIsAnalyticsModalOpen] = useState(false);
  const [isAssignmentModalOpen, setIsAssignmentModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSeries, setSelectedSeries] = useState('TouKouLeur');
  const [selectedLevel, setSelectedLevel] = useState('');
  const [activeTab, setActiveTab] = useState<'cartography' | 'explorer'>('cartography');

  // Use mock data for now
  const badges = mockBadges;

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
    setSelectedBadge(badge);
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

  // Group badges by level/domain for cartography view
  const badgesByLevel = filteredBadges.reduce((acc, badge) => {
    let groupKey: string;
    if (selectedSeries === 'CPS') {
      // For CPS, group by domain
      groupKey = badge.domains[0] || 'other';
    } else {
      // For TouKouLeur, group by level
      groupKey = badge.level;
    }
    if (!acc[groupKey]) {
      acc[groupKey] = [];
    }
    acc[groupKey].push(badge);
    return acc;
  }, {} as Record<string, Badge[]>);

  // Define levels/domains based on selected series
  const getSections = () => {
    if (selectedSeries === 'CPS') {
      return [
        { key: 'emotionnelles', label: 'Emotionnelles', color: '#ef4444', icon: '/badges_psychosociales/Emotionnelles_final.png' },
        { key: 'cognitives', label: 'Cognitives', color: '#3b82f6', icon: '/badges_psychosociales/Cognitives.jpg' },
        { key: 'sociales', label: 'Sociales', color: '#9333ea', icon: '/badges_psychosociales/Sociales_final.png' }
      ];
    } else {
      return [
        { key: 'Niveau 1 - Découverte', label: 'Niveau 1 - Découverte', color: '#10b981', icon: undefined },
        { key: 'Niveau 2 - Application', label: 'Niveau 2 - Application', color: '#3b82f6', icon: undefined },
        { key: 'Niveau 3 - Maîtrise', label: 'Niveau 3 - Maîtrise', color: '#f59e0b', icon: undefined },
        { key: 'Niveau 4 - Expertise', label: 'Niveau 4 - Expertise', color: '#ef4444', icon: undefined }
      ];
    }
  };

  const sections = getSections();

  return (
    <section className="badges-container with-sidebar">
      <div className="badges-content">
        {/* Section Title + Actions */}
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

        {activeTab === 'cartography' && (
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
              className="filter-select"
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
          {sections.map((section) => (
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
                <div className="level-count  bg-red-500">
                  {badgesByLevel[section.key]?.length || 0} badges
                </div>
              </div>
              
              <div className="badges-grid">
                {badgesByLevel[section.key]?.map((badge) => (
                  <BadgeCard
                    key={badge.id}
                    badge={badge}
                    onClick={() => handleBadgeClick(badge)}
                    onEdit={() => handleEditBadge(badge)}
                    onDelete={() => handleDeleteBadge(badge.id)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
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
