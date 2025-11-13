import React, { useState, useEffect, useRef } from 'react';
import { useAppContext } from '../../context/AppContext';
import { Member } from '../../types';
import MemberCard from '../Members/MemberCard';
import MemberModal from '../Modals/MemberModal';
import AddMemberModal from '../Modals/AddMemberModal';
import ContactModal from '../Modals/ContactModal';
import './Members.css';
import { mockClassLists } from '../../data/mockData';
import ClassCard from '../Class/ClassCard';
import { getCompanyUserProfile } from '../../api/User';
import { getCurrentUser } from '../../api/Authentication';
import { getCompanyMembersAccepted } from '../../api/CompanyDashboard/Menbers';

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
  const [activeTab, setActiveTab] = useState<'members' | 'class'>('members');

  const dropdownRef = useRef<HTMLDivElement>(null);
  const classLists = mockClassLists;
  const [members, setMembers] = useState<Member[]>([]);

  // --- Fetch des membres avec profil complet ---
  useEffect(() => {
    const fetchMembers = async () => {
      try {
        const currentUser = await getCurrentUser();
        const companyId = currentUser.data.available_contexts.companies[0].id;

        const membersRes = await getCompanyMembersAccepted(companyId);
        const basicMembers = membersRes.data.data;

        const detailedMembers = await Promise.all(
          basicMembers.map(async (m: any) => {
            try {
              const profileRes = await getCompanyUserProfile(m.id, companyId);
              const profile = profileRes.data;

              const member: Member = {
                id: m.id.toString(),
                firstName: profile.first_name,
                lastName: profile.last_name,
                fullName: `${profile.first_name} ${profile.last_name}`,
                email: profile.email,
                profession: profile.job || '',
                roles: [profile.role || m.role_in_company || ''],
                skills: profile.skills?.map((s: any) => s.name) || [],
                availability: profile.project_members?.flatMap((p: any) => p.project.skills.map((s: any) => s.name)) || [],
                avatar: m.avatar_url || '',
                isTrusted: profile.certify || false,
                badges: profile.badges_received?.map((b: any) => b.badge.id.toString()) || [],
                organization: profile.company_name || '',
                canProposeStage: !!profile.role_additional_information?.includes('stage'),
                canProposeAtelier: !!profile.role_additional_information?.includes('atelier'),
              };

              return member;
            } catch (err) {
              console.warn(`Erreur chargement profil membre ${m.id}:`, err);
              return null;
            }
          })
        );

        const validMembers = detailedMembers.filter((m): m is Member => m !== null);
        setMembers(validMembers);
      } catch (err) {
        console.error('Erreur récupération membres:', err);
      }
    };

    fetchMembers();
  }, []);

  // --- Filtres dynamiques ---
  const allCompetences = Array.from(new Set(members.flatMap(m => m.skills)));
  const allAvailabilities = Array.from(new Set(members.flatMap(m => m.availability)));

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsImportExportOpen(false);
      }
    };
    if (isImportExportOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isImportExportOpen]);

  const filteredMembers = members.filter(member => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      member.fullName?.toLowerCase().includes(term) ||
      member.email.toLowerCase().includes(term) ||
      member.skills.some(skill => skill.toLowerCase().includes(term));
    const matchesRole = !roleFilter || member.roles.includes(roleFilter);
    const matchesCompetence = !competenceFilter || member.skills.includes(competenceFilter);
    const matchesAvailability = !availabilityFilter || member.availability.includes(availabilityFilter);
    return matchesSearch && matchesRole && matchesCompetence && matchesAvailability;
  });

  const handleAddMember = (memberData: Omit<Member, 'id'>) => {
    addMember({ ...memberData, id: Date.now().toString() });
    setIsAddModalOpen(false);
  };

  const handleUpdateMember = (id: string, updates: Partial<Member>) => {
    updateMember(id, updates);
    if (selectedMember?.id === id) setSelectedMember({ ...selectedMember, ...updates });
  };

  const handleImportExport = (action: 'import' | 'export') => {
    console.log(`${action} members`);
    setIsImportExportOpen(false);
  };

  const handleMembershipRequests = () => setCurrentPage('membership-requests');

  return (
    <section className="members-container with-sidebar">
      {/* Header */}
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
                  <button className="dropdown-item" onClick={() => handleImportExport('import')}>
                    <i className="fas fa-upload"></i> Importer
                  </button>
                  <button className="dropdown-item" onClick={() => handleImportExport('export')}>
                    <i className="fas fa-download"></i> Exporter
                  </button>
                </div>
              )}
            </div>
          </div>
          <button className="btn btn-primary" onClick={() => setIsAddModalOpen(true)}>
            <i className="fas fa-plus"></i> Ajouter un membre
          </button>
        </div>
      </div>

      {/* Tabs visibles uniquement en mode edu */}
      {state.showingPageType === 'edu' && (
        <div className="tabs-container">
          <button
            className={`tab-btn ${activeTab === 'members' ? 'active' : ''}`}
            onClick={() => setActiveTab('members')}
          >
            Staff
          </button>
          <button
            className={`tab-btn ${activeTab === 'class' ? 'active' : ''}`}
            onClick={() => setActiveTab('class')}
          >
            Class
          </button>
        </div>
      )}

      {/* Contenu du tab “Membres” */}
      {activeTab === 'members' && (
        <>
          <div className="members-filters">
            <div className="search-bar">
              <i className="fas fa-search"></i>
              <input
                type="text"
                placeholder="Rechercher un membre..."
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
                {allCompetences.map(c => (
                  <option key={c} value={c}>{c}</option>
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
                {allAvailabilities.map(a => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="membership-requests-section">
            <button className="view-btn" onClick={handleMembershipRequests}>
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
              const totalBadgeCount = member.badges?.length || 0;
              return (
                <MemberCard
                  key={member.id}
                  member={member}
                  badgeCount={totalBadgeCount}
                  onClick={() => setSelectedMember(member)}
                  onContactClick={() => {
                    setContactEmail(member.email);
                    setIsContactModalOpen(true);
                  }}
                  onRoleChange={(newRole) => updateMember(member.id, { roles: [newRole] })}
                />
              );
            })}
          </div>
        </>
      )}

      {/* Contenu du tab “Classe” */}
      {activeTab === 'class' && (
        <div className="class-tab-content">
          <div className="members-grid">
            {classLists.map((classItem) => (
              <ClassCard
                key={classItem.id}
                name={classItem.name}
                teacher={classItem.teacher}
                studentCount={classItem.studentCount}
              />
            ))}
          </div>
        </div>
      )}

      {selectedMember && (
        <MemberModal
          member={selectedMember}
          onClose={() => setSelectedMember(null)}
          onUpdate={(updates) => handleUpdateMember(selectedMember.id, updates)}
          onDelete={() => deleteMember(selectedMember.id)}
          onContactClick={() => setIsContactModalOpen(true)}
        />
      )}

      {isAddModalOpen && (
        <AddMemberModal onClose={() => setIsAddModalOpen(false)} onAdd={handleAddMember} />
      )}

      {isContactModalOpen && (
        <ContactModal email={contactEmail} onClose={() => setIsContactModalOpen(false)} />
      )}
    </section>
  );
};

export default Members;
