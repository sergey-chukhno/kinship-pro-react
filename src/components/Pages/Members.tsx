import React, { useState, useEffect, useRef } from 'react';
import { useAppContext } from '../../context/AppContext';
import { ClassList, Member } from '../../types';
import MemberCard from '../Members/MemberCard';
import MemberModal from '../Modals/MemberModal';
import AddMemberModal from '../Modals/AddMemberModal';
import ContactModal from '../Modals/ContactModal';
import './Members.css';
import { mockClassLists } from '../../data/mockData';
import ClassCard from '../Class/ClassCard';
import { getCompanyUserProfile, getSchoolUserProfile } from '../../api/User';
import { getCurrentUser } from '../../api/Authentication';
import { getCompanyMembersAccepted, updateCompanyMemberRole } from '../../api/CompanyDashboard/Members';
import { getSchoolMembersAccepted, updateSchoolMemberRole } from '../../api/SchoolDashboard/Members'
import AddClassModal from '../Modals/AddClassModal';
import { getSchoolLevels, addSchoolLevel } from '../../api/SchoolDashboard/Levels';
import { useToast } from '../../hooks/useToast';
import AddStudentModal from '../Modals/AddStudentModal';
import ClassStudentsModal from '../Modals/ClassStudentsModal';


const Members: React.FC = () => {
  const { state, addMember, updateMember, deleteMember, setCurrentPage } = useAppContext();
  const { showSuccess, showError } = useToast();
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [contactEmail, setContactEmail] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [competenceFilter, setCompetenceFilter] = useState('');
  const [availabilityFilter, setAvailabilityFilter] = useState('');
  const [isImportExportOpen, setIsImportExportOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'members' | 'class' | 'community'>('members');
  const [isAddClassModalOpen, setIsAddClassModalOpen] = useState(false);
  const [isClassStudentsModalOpen, setIsClassStudentsModalOpen] = useState(false);
  const [selectedClass, setSelectedClass] = useState<{ id: number; name: string } | null>(null);

  const dropdownRef = useRef<HTMLDivElement>(null);
  // const classLists = mockClassLists;
  const [classLists, setClassLists] = useState<ClassList[]>([])
  const [members, setMembers] = useState<Member[]>([]);
  const [communityLists, setCommunityLists] = useState<Member[]>([]);
  const [page, setPage] = useState(1);
  const [per_page, setPerPage] = useState(12);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchMembers = async () => {
    try {
      const currentUser = await getCurrentUser();
      const isEdu = state.showingPageType === 'edu';

      // 1. Bascule de l'ID (Company vs School)
      const contextId = isEdu
        ? currentUser.data?.available_contexts?.schools?.[0]?.id
        : currentUser.data?.available_contexts?.companies?.[0]?.id;

      if (!contextId) return;

      // 2. Bascule de l'appel API (Liste de base)
      const membersRes = isEdu
        ? await getSchoolMembersAccepted(contextId)
        : await getCompanyMembersAccepted(contextId);

      const basicMembers = membersRes.data.data || membersRes.data || [];

      const detailedMembers = await Promise.all(
        basicMembers.map(async (m: any) => {
          try {
            // 3. Bascule de la récupération du profil détaillé
            // Note: Si vous n'avez pas getSchoolUserProfile, vérifiez si getCompanyUserProfile fonctionne avec un ID école, sinon il faudra créer cette fonction.
            const profileRes = isEdu
              ? await getSchoolUserProfile(m.id, contextId) // Hypothèse : cette fonction existe
              : await getCompanyUserProfile(m.id, contextId);

            const profile = profileRes.data.data || profileRes.data;

            // ... (Logique de traitement availability, roles, mapping inchangée) ...

            // --- TRAITEMENT DE LA DISPONIBILITÉ (copie de votre code existant) ---
            const availData = profile.availability || {};
            const availabilityList: string[] = [];
            if (availData.monday) availabilityList.push('Lundi');
            if (availData.tuesday) availabilityList.push('Mardi');
            if (availData.wednesday) availabilityList.push('Mercredi');
            if (availData.thursday) availabilityList.push('Jeudi');
            if (availData.friday) availabilityList.push('Vendredi');
            if (availData.saturday) availabilityList.push('Samedi');
            if (availData.sunday) availabilityList.push('Dimanche');
            if (availData.available && availabilityList.length === 0) availabilityList.push('Disponible');

            let rawRole = profile.role_in_company || m.role_in_company || profile.role_in_school || m.role_in_school || 'Membre';
            const displayRole = rawRole.charAt(0).toUpperCase() + rawRole.slice(1);

            return {
              id: (profile.id || m.id).toString(),
              firstName: profile.first_name,
              lastName: profile.last_name,
              fullName: profile.full_name || `${profile.first_name} ${profile.last_name}`,
              email: profile.email,
              profession: profile.role_in_system || '',
              roles: [displayRole],
              skills: profile.skills?.map((s: any) => s.name || s) || [],
              availability: availabilityList,
              avatar: profile.avatar_url || m.avatar_url || '',
              isTrusted: profile.status === 'confirmed',
              badges: profile.badges?.data?.map((b: any) => b.id?.toString()) || [],
              organization: '',
              canProposeStage: false,
              canProposeAtelier: false,
              claimToken: profile.claim_token || m.claim_token,
              hasTemporaryEmail: profile.has_temporary_email || m.has_temporary_email || false,
            } as Member;

          } catch (err) {
            console.warn(`Profil détaillé non trouvé pour ${m.id}, utilisation fallback.`);
            // FALLBACK
            return {
              // ... (votre code fallback inchangé)
              id: m.id.toString(),
              firstName: m.first_name || 'Utilisateur',
              lastName: m.last_name || '',
              fullName: m.first_name && m.last_name ? `${m.first_name} ${m.last_name}` : (m.email || 'Inconnu'),
              email: m.email || '',
              profession: m.job || '',
              roles: [m.role_in_company || m.role_in_school || 'Membre'],
              skills: [],
              availability: [],
              avatar: m.avatar_url || '',
              isTrusted: false,
              badges: [],
              organization: '',
              canProposeStage: false,
              canProposeAtelier: false,
              claimToken: m.claim_token,
              hasTemporaryEmail: m.has_temporary_email || false,
            } as Member;
          }
        })
      );

      const validMembers = detailedMembers.filter((m): m is Member => m !== null);
      setMembers(validMembers);
    } catch (err) {
      console.error('Erreur critique récupération liste membres:', err);
      showError('Impossible de récupérer la liste des membres');
    }
  };

  const fetchLevels = async () => {
    try {
      const currentUser = await getCurrentUser();
      const isEdu = state.showingPageType === 'edu' || state.showingPageType === 'teacher';
      const contextId = isEdu ? currentUser.data?.available_contexts?.schools?.[0]?.id : null;
      if (!contextId) return;
      const levelsRes = await getSchoolLevels(contextId, page, per_page);
      const levels = levelsRes.data.data || levelsRes.data || [];
      setClassLists(levels);
    } catch (err) {
      console.error('Erreur critique récupération liste niveaux:', err);
      showError('Impossible de récupérer la liste des classes');
    } finally {
      setLoading(false);
    }
  };

    // --- Filtres dynamiques ---
    const allCompetences = Array.from(new Set(members.flatMap(m => m.skills)));
    const allAvailabilities = Array.from(new Set(members.flatMap(m => m.availability)));

  useEffect(() => {
    fetchLevels();
    fetchMembers();
  }, [page, per_page]);

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

  const handleAddStudent = (studentData: Omit<Member, 'id'>) => {
    // showSuccess(`L'étudiant ${studentData.fullName} a été ajouté avec succès`);
    setIsAddModalOpen(false);
  };

  const handleStudentCreated = async () => {
    await fetchMembers();
    await fetchLevels();
  };

  const handleClassClick = (classItem: ClassList) => {
    setSelectedClass({
      id: Number(classItem.id),
      name: classItem.name
    });
    setIsClassStudentsModalOpen(true);
  };

  const handleStudentDetails = (student: any) => {
    setIsClassStudentsModalOpen(false);
    setSelectedClass(null);

    const member = members.find((m) => m.id === student.id?.toString());
    if (member) {
      setSelectedMember(member);
      return;
    }

    const fallbackMember: Member = {
      id: student.id?.toString() || `${Date.now()}`,
      firstName: student.first_name || student.full_name?.split(' ')[0] || 'Inconnu',
      lastName: student.last_name || student.full_name?.split(' ')[1] || '',
      fullName: student.full_name,
      email: student.email || '',
      profession: student.role_in_system || '',
      roles: [student.role_in_system || 'Élève'],
      skills: [],
      availability: [],
      avatar: student.avatar_url || '',
      isTrusted: student.status === 'confirmed',
      badges: [],
      organization: '',
      canProposeStage: false,
      canProposeAtelier: false,
      claimToken: student.claim_token,
      hasTemporaryEmail: student.has_temporary_email,
      birthday: student.birthday,
      role: student.role_in_system || 'eleve',
      levelId: selectedClass?.id?.toString(),
      roleAdditionalInfo: ''
    };

    setSelectedMember(fallbackMember);
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

  const handleRoleChange = async (member: Member, newRole: string) => {
    try {
      const currentUser = await getCurrentUser();
      const isEdu = state.showingPageType === 'edu';

      // 1. Bascule ID pour le changement de rôle
      const contextId = isEdu
        ? currentUser.data?.available_contexts?.schools?.[0]?.id
        : currentUser.data?.available_contexts?.companies?.[0]?.id;

      if (!contextId) {
        showError("Impossible de trouver le contexte");
        return;
      }

      // 2. Bascule API Update Role
      if (isEdu) {
        await updateSchoolMemberRole(contextId, Number(member.id), newRole);
      } else {
        await updateCompanyMemberRole(contextId, Number(member.id), newRole);
      }

      setMembers(prev =>
        prev.map(m =>
          m.id === member.id ? { ...m, roles: [newRole] } : m
        )
      );

      showSuccess(`Le rôle de ${member.fullName} a été modifié avec succès`);

    } catch (err) {
      console.error("Erreur lors de la mise à jour du rôle :", err);
      showError("Erreur lors de la mise à jour du rôle");
    }
  };

  const handleAddClassList = async (levelData: { level: { name: string; level: string } }) => {
    try {
      const currentUser = await getCurrentUser();
      const isEdu = state.showingPageType === 'edu' || state.showingPageType === 'teacher';
      const contextId = isEdu ? currentUser.data?.available_contexts?.schools?.[0]?.id : null;
      
      if (!contextId) {
        showError("Impossible de trouver le contexte de l'école");
        return;
      }

      await addSchoolLevel(contextId, levelData);
      // showSuccess(`La classe ${levelData.level.name} a été ajoutée avec succès`);
      
      // Refresh the levels list after adding a new one
      await fetchLevels();
      setIsAddClassModalOpen(false);
    } catch (err) {
      console.error("Erreur lors de l'ajout de la classe :", err);
      // showError("Erreur lors de l'ajout de la classe");
      throw err; // Re-throw pour que AddClassModal puisse aussi gérer l'erreur
    }
  };


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
          <div className="">
              <button className="btn btn-outline" onClick={handleMembershipRequests}>
                <i className="fas fa-user-plus"></i>
                Gérer demandes d'adhésion
              </button>
            </div>
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
            <i className="fas fa-plus"></i> {(state.showingPageType === 'edu' || state.showingPageType === 'teacher' )? 'Ajouter un étudiant' : 'Ajouter un membre'}
          </button>
        </div>
      </div>

      {/* Tabs visibles uniquement en mode edu */}
      {state.showingPageType === 'edu' && (
        <div className="tabs-container  bg-yellow-300">
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
            Classes
          </button>
          <button
            className={`tab-btn ${activeTab === 'community' ? 'active' : ''}`}
            onClick={() => setActiveTab('community')}
          >
            Communauté
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
                className="filter-select !w-full !bg-white"
              >
                <option value="">Tous les rôles</option>
                <option value="Admin">Admin</option>
                <option value="Superadmin">Superadmin</option>
                <option value="Référent">Référent</option>
                <option value="Membre">Membre</option>
                <option value="Intervenant">Intervenant</option>
              </select>
            </div>
            <div className="filter-group">
              <select
                value={competenceFilter}
                onChange={(e) => setCompetenceFilter(e.target.value)}
                className="filter-select  bigger-select"
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
                className="filter-select  bigger-select"
              >
                <option value="">Toutes les disponibilités</option>
                {allAvailabilities.map(a => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </div>
          </div>
          <div className='min-h-[65vh]'>
    

            <div className="members-grid">
              {filteredMembers.length > 0 ? filteredMembers.map((member) => {
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
                    onRoleChange={(newRole) => handleRoleChange(member, newRole)}
                  />
                );
              })
            : <div className="text-center text-gray-500">Aucun membre trouvé pour le moment</div>}
            </div>
          </div>
        </>
      )}

      {/* Contenu du tab “Classe” */}
      {activeTab === 'class' && (
        <div className="min-h-[75vh]" >
            <div className="mb-4">
              <button className="view-btn" onClick={() => setIsAddClassModalOpen(true)}>
                <i className="fas fa-plus"></i> Ajouter une classe
              </button>
              {/* Add class modal modal */}
              {isAddClassModalOpen && (
                <AddClassModal onClose={() => setIsAddClassModalOpen(false)} onAdd={handleAddClassList} />
              )}
            </div>
          <div className="members-grid">
            {classLists.length > 0 ? classLists.map((classItem: ClassList) => (
              <ClassCard
                key={classItem?.id}
                name={classItem?.name}
                teacher={classItem?.teacher || ''}
                studentCount={classItem?.students_count || 0}
                level={classItem?.level || ''}
                onClick={() => handleClassClick(classItem)}
              />
            ))
          : <div className="text-center text-gray-500">Aucune classe trouvée pour le moment</div>}
          </div>
        </div>
      )}

      {/* Contenu du tab “Communauté” */}
      {activeTab === 'community' && (
        <div className="community-tab-content min-h-[75vh]">
          <div className="members-grid">
            {
            communityLists.length > 0 ?
            
            communityLists.map((communityItem) => (
              <MemberCard
                key={communityItem.id}
                member={communityItem}
                badgeCount={communityItem.badges?.length || 0}
                onClick={() => setSelectedMember(communityItem)}
                onContactClick={() => {
                  setContactEmail(communityItem.email);
                  setIsContactModalOpen(true);
                }}
                onRoleChange={(newRole) => handleRoleChange(communityItem, newRole)}
              />
            ))
          : <div className=" text-gray-500 whitespace-nowrap">Aucune communauté trouvée pour le moment</div>}
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

      {isAddModalOpen && state.showingPageType !== 'edu' && state.showingPageType !== 'teacher' && (
        <AddMemberModal onClose={() => setIsAddModalOpen(false)} onAdd={handleAddMember} />
      )}

      {isAddModalOpen && (state.showingPageType === 'edu' || state.showingPageType === 'teacher') && (
        <AddStudentModal 
          onClose={() => setIsAddModalOpen(false)} 
          onAdd={handleAddStudent}
          onSuccess={handleStudentCreated}
        />
      )}


      {isContactModalOpen && (
        <ContactModal email={contactEmail} onClose={() => setIsContactModalOpen(false)} />
      )}

      {isClassStudentsModalOpen && selectedClass && (
        <ClassStudentsModal
          onClose={() => {
            setIsClassStudentsModalOpen(false);
            setSelectedClass(null);
          }}
          levelId={selectedClass.id}
          levelName={selectedClass.name}
          onStudentDetails={handleStudentDetails}
        />
      )}
    </section>
  );
};

export default Members;