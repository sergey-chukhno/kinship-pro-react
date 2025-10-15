import React, { useState, useEffect, useRef } from 'react';
import { useAppContext } from '../../context/AppContext';
import { mockMembers } from '../../data/mockData';
import { Member } from '../../types';
import MemberCard from '../Members/MemberCard';
import MemberModal from '../Modals/MemberModal';
import AddMemberModal from '../Modals/AddMemberModal';
import ContactModal from '../Modals/ContactModal';
import './Members.css';

const Members: React.FC = () => {
  const { state, addMember, updateMember, deleteMember, setCurrentPage } = useAppContext();
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [contactEmail, setContactEmail] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [competenceFilter, setCompetenceFilter] = useState('');
  const [availabilityFilter, setAvailabilityFilter] = useState('');
  const [isImportExportOpen, setIsImportExportOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Use state members instead of mock data
  const members = state.members;

  // Get all unique competences and availabilities for filter options
  const allCompetences = Array.from(new Set(members.flatMap(member => member.skills)));
  const allAvailabilities = Array.from(new Set(members.flatMap(member => member.availability)));

  // Handle clicks outside dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsImportExportOpen(false);
      }
    };

    if (isImportExportOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isImportExportOpen]);

  const filteredMembers = members.filter(member => {
    const matchesSearch = member.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         member.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         member.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         member.skills.some(skill => skill.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesRole = !roleFilter || member.roles.includes(roleFilter);
    const matchesCompetence = !competenceFilter || member.skills.includes(competenceFilter);
    const matchesAvailability = !availabilityFilter || member.availability.includes(availabilityFilter);
    return matchesSearch && matchesRole && matchesCompetence && matchesAvailability;
  });

  const handleMemberClick = (member: Member) => {
    setSelectedMember(member);
  };

  const handleContactClick = (email: string) => {
    setContactEmail(email);
    setIsContactModalOpen(true);
  };

  const handleAddMember = (memberData: Omit<Member, 'id'>) => {
    const newMember: Member = {
      ...memberData,
      id: Date.now().toString()
    };
    addMember(newMember);
    setIsAddModalOpen(false);
  };

  const handleUpdateMember = (id: string, updates: Partial<Member>) => {
    updateMember(id, updates);
    // Update the selected member with the new data
    if (selectedMember && selectedMember.id === id) {
      setSelectedMember({ ...selectedMember, ...updates });
    }
  };

  const handleDeleteMember = (id: string) => {
    deleteMember(id);
    setSelectedMember(null);
  };

  const handleRoleChange = (memberId: string, newRole: string) => {
    updateMember(memberId, { roles: [newRole] });
  };

  const handleImportExport = (action: 'import' | 'export') => {
    if (action === 'import') {
      // TODO: Implement import functionality
      console.log('Import members');
    } else {
      // TODO: Implement export functionality
      console.log('Export members');
    }
    setIsImportExportOpen(false);
  };

  const handleMembershipRequests = () => {
    setCurrentPage('membership-requests');
  };

  return (
    <section className="members-container with-sidebar">
      <div className="members-header">
        <div className="section-title-left">
          <img src="/icons_logo/Icon=Membres.svg" alt="Membres" className="section-icon" />
          <h2>Gestion des Membres</h2>
        </div>
        <div className="page-actions">
          <div className="action-group">
            <div className="dropdown-container" ref={dropdownRef}>
              <button 
                className="btn btn-outline"
                onClick={() => setIsImportExportOpen(!isImportExportOpen)}
              >
                <i className="fas fa-download"></i>
                Importer/Exporter
                <i className="fas fa-chevron-down"></i>
              </button>
              {isImportExportOpen && (
                <div className="dropdown-menu">
                  <button 
                    className="dropdown-item"
                    onClick={() => handleImportExport('import')}
                  >
                    <i className="fas fa-upload"></i>
                    Importer
                  </button>
                  <button 
                    className="dropdown-item"
                    onClick={() => handleImportExport('export')}
                  >
                    <i className="fas fa-download"></i>
                    Exporter
                  </button>
                </div>
              )}
            </div>
          </div>
          <button 
            className="btn btn-primary"
            onClick={() => setIsAddModalOpen(true)}
          >
            <i className="fas fa-plus"></i>
            Ajouter un membre
          </button>
        </div>
      </div>

      <div className="members-filters">
        <div className="search-bar">
          <i className="fas fa-search"></i>
          <input
            type="text"
            placeholder="Rechercher un membre par nom, email, compétence..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="filter-group">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="filter-select"
          >
            <option value="">Tous les rôles</option>
            <option value="Admin">Admin</option>
            <option value="Référent">Référent</option>
            <option value="Membre">Membre</option>
            <option value="Intervenant">Intervenant</option>
          </select>
        </div>
        <div className="filter-group">
          <select
            value={competenceFilter}
            onChange={(e) => setCompetenceFilter(e.target.value)}
            className="filter-select"
          >
            <option value="">Toutes les compétences</option>
            {allCompetences.map(competence => (
              <option key={competence} value={competence}>{competence}</option>
            ))}
          </select>
        </div>
        <div className="filter-group">
          <select
            value={availabilityFilter}
            onChange={(e) => setAvailabilityFilter(e.target.value)}
            className="filter-select"
          >
            <option value="">Toutes les disponibilités</option>
            {allAvailabilities.map(availability => (
              <option key={availability} value={availability}>{availability}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Membership Requests Button */}
      <div className="membership-requests-section">
        <button 
          className="view-btn"
          onClick={handleMembershipRequests}
        >
          <i className="fas fa-user-plus"></i>
          Gérer demandes d'adhésion
          {state.membershipRequests.filter(req => req.status === 'pending').length > 0 && (
            <span className="count-pill">
              {state.membershipRequests.filter(req => req.status === 'pending').length}
            </span>
          )}
        </button>
      </div>

      <div className="members-grid">
        {filteredMembers.map((member) => {
          // Calculate total badge count (mock badges + attributed badges)
          const mockBadgeCount = member.badges?.length || 0;
          const attributedBadgeCount = state.badgeAttributions.filter(
            attribution => attribution.participantId === member.id
          ).length;
          const totalBadgeCount = mockBadgeCount + attributedBadgeCount;
          
          return (
            <MemberCard
              key={member.id}
              member={member}
              badgeCount={totalBadgeCount}
              onClick={() => handleMemberClick(member)}
              onContactClick={() => handleContactClick(member.email)}
              onRoleChange={(newRole) => handleRoleChange(member.id, newRole)}
            />
          );
        })}
      </div>

      {selectedMember && (
        <MemberModal
          member={selectedMember}
          onClose={() => setSelectedMember(null)}
          onUpdate={(updates) => handleUpdateMember(selectedMember.id, updates)}
          onDelete={() => handleDeleteMember(selectedMember.id)}
          onContactClick={() => handleContactClick(selectedMember.email)}
        />
      )}

      {isAddModalOpen && (
        <AddMemberModal
          onClose={() => setIsAddModalOpen(false)}
          onAdd={handleAddMember}
        />
      )}

      {isContactModalOpen && (
        <ContactModal
          email={contactEmail}
          onClose={() => setIsContactModalOpen(false)}
        />
      )}
    </section>
  );
};

export default Members;
