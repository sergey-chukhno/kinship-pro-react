import React, { useCallback, useEffect, useRef, useState } from 'react';
import { getCurrentUser } from '../../api/Authentication';
import { getCompanyMembersAccepted, updateCompanyMemberRole } from '../../api/CompanyDashboard/Members';
import { addSchoolLevel, getSchoolLevels } from '../../api/SchoolDashboard/Levels';
import { getSchoolMembersAccepted, getSchoolVolunteers, updateSchoolMemberRole } from '../../api/SchoolDashboard/Members';
import { getCompanyUserProfile, getSchoolUserProfile } from '../../api/User';
import { getSkills } from '../../api/Skills';
import { useAppContext } from '../../context/AppContext';
import { useToast } from '../../hooks/useToast';
import { ClassList, Member } from '../../types';
import ClassCard from '../Class/ClassCard';
import MemberCard from '../Members/MemberCard';
import AddClassModal from '../Modals/AddClassModal';
import AddMemberModal from '../Modals/AddMemberModal';
import AddStudentModal from '../Modals/AddStudentModal';
import ClassStudentsModal from '../Modals/ClassStudentsModal';
import ContactModal from '../Modals/ContactModal';
import MemberModal from '../Modals/MemberModal';
import { DEFAULT_AVATAR_SRC } from '../UI/AvatarImage';
import './Members.css';
import { translateRole, translateRoles } from '../../utils/roleTranslations';

const AVAILABILITY_OPTIONS = [
  'Lundi',
  'Mardi',
  'Mercredi',
  'Jeudi',
  'Vendredi',
  'Samedi',
  'Dimanche',
  'Autre',
];

const availabilityToLabels = (availability: any = {}) => {
  const mapping: Record<string, string> = {
    monday: 'Lundi',
    tuesday: 'Mardi',
    wednesday: 'Mercredi',
    thursday: 'Jeudi',
    friday: 'Vendredi',
    saturday: 'Samedi',
    sunday: 'Dimanche',
    other: 'Autre',
  };

  const labels = Object.entries(mapping).reduce<string[]>((acc, [key, label]) => {
    if (availability?.[key]) acc.push(label);
    return acc;
  }, []);

  if (availability?.available && labels.length === 0) {
    labels.push('Disponible');
  }

  return labels;
};

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
  const [skillsOptions, setSkillsOptions] = useState<string[]>([]);
  const [skillsLoading, setSkillsLoading] = useState(false);

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
            const availabilityList = availabilityToLabels(profile.availability);
            const rawRole =
              profile.role_in_company ||
              m.role_in_company ||
              profile.role_in_school ||
              m.role_in_school ||
              profile.role_in_system ||
              m.role_in_system ||
              profile.role ||
              m.role ||
              'member';

            const roleValues =
              (Array.isArray(profile.roles) && profile.roles.length > 0
                ? profile.roles
                : [rawRole]
              ).filter(Boolean);

            const displayProfession = translateRole(profile.role_in_system || '');

            return {
              id: (profile.id || m.id).toString(),
              firstName: profile.first_name,
              lastName: profile.last_name,
              fullName: profile.full_name || `${profile.first_name} ${profile.last_name}`,
              email: profile.email,
              profession: displayProfession,
              roles: roleValues as string[],
              skills: profile.skills?.map((s: any) => s.name || s) || [],
              availability: availabilityList,
              avatar: profile.avatar_url || m.avatar_url || DEFAULT_AVATAR_SRC,
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
            const fallbackRole = m.role_in_company || m.role_in_school || m.role_in_system || m.role || 'member';

            return {
              // ... (votre code fallback inchangé)
              id: m.id.toString(),
              firstName: m.first_name || 'Utilisateur',
              lastName: m.last_name || '',
              fullName: m.first_name && m.last_name ? `${m.first_name} ${m.last_name}` : (m.email || 'Inconnu'),
              email: m.email || '',
              profession: translateRole(m.job || fallbackRole),
              roles: [fallbackRole],
              skills: [],
              availability: availabilityToLabels(m.availability),
              avatar: m.avatar_url || DEFAULT_AVATAR_SRC,
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

  const fetchCommunityVolunteers = async () => {
    try {
      const currentUser = await getCurrentUser();
      const isEdu = state.showingPageType === 'edu' || state.showingPageType === 'teacher';
      const schoolId = isEdu ? currentUser.data?.available_contexts?.schools?.[0]?.id : null;
      if (!schoolId) {
        setCommunityLists([]);
        return;
      }

      const volunteersRes = await getSchoolVolunteers(Number(schoolId), 'confirmed');
      const volunteers = volunteersRes.data?.data ?? volunteersRes.data ?? [];

      const mappedVolunteers: Member[] = volunteers.map((vol: any) => {
        const volunteerRole = vol.role_in_school || vol.role_in_system || vol.role || 'volunteer';
        const volunteerProfession = translateRole(vol.role_in_system || vol.user?.job || volunteerRole);

        return {
          id: (vol.id || vol.user_id || vol.user?.id || Date.now()).toString(),
          firstName: vol.first_name || vol.user?.first_name || 'Volontaire',
          lastName: vol.last_name || vol.user?.last_name || '',
          fullName: vol.full_name || `${vol.first_name || ''} ${vol.last_name || ''}`.trim(),
          email: vol.email || vol.user?.email || '',
          profession: volunteerProfession,
          roles: [volunteerRole],
          skills: vol.skills?.map((s: any) => s.name || s) || [],
          availability: availabilityToLabels(vol.availability),
          avatar: vol.avatar_url || vol.user?.avatar || DEFAULT_AVATAR_SRC,
          isTrusted: (vol.status || '').toLowerCase() === 'confirmed',
          badges: vol.badges?.map((b: any) => b.id?.toString()) || [],
          organization: vol.organization || '',
          canProposeStage: false,
          canProposeAtelier: false,
          claimToken: vol.claim_token,
          hasTemporaryEmail: vol.has_temporary_email || false,
          birthday: vol.birthday,
          role: volunteerRole,
          levelId: undefined,
          roleAdditionalInfo: vol.role_additional_information || ''
        };
      });

      setCommunityLists(mappedVolunteers);
    } catch (err) {
      console.error('Erreur récupération des volontaires:', err);
      showError('Impossible de récupérer les volontaires');
    }
  };

  const fetchSkills = useCallback(async () => {
    try {
      setSkillsLoading(true);
      const response = await getSkills();
      const rawSkills = response.data?.data || response.data || [];
      const parsedSkills: string[] = rawSkills
        .map((skill: any) => {
          if (typeof skill === 'string') return skill;
          if (skill?.attributes?.name) return skill.attributes.name;
          return skill?.name || '';
        })
        .filter(
          (skillName: string | undefined): skillName is string =>
            typeof skillName === 'string' && skillName.trim().length > 0
        );
      const normalizedSkills = Array.from(new Set(parsedSkills)).sort((a, b) =>
        a.localeCompare(b, 'fr', { sensitivity: 'base' })
      );
      setSkillsOptions(normalizedSkills);
    } catch (err) {
      console.error('Erreur récupération des compétences :', err);
      showError('Impossible de récupérer les compétences');
    } finally {
      setSkillsLoading(false);
    }
  }, [showError]);

  // --- Filtres dynamiques ---
  const fallbackCompetences = Array.from(new Set(members.flatMap(m => m.skills)));
  const competenceOptions = skillsOptions.length > 0 ? skillsOptions : fallbackCompetences;
  const availabilityOptions = AVAILABILITY_OPTIONS;

  useEffect(() => {
    fetchSkills();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchLevels();
    fetchMembers();
    fetchCommunityVolunteers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, per_page, state.showingPageType]);

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
    const displayRoles = translateRoles(member.roles);
    const matchesSearch =
      member.fullName?.toLowerCase().includes(term) ||
      member.email.toLowerCase().includes(term) ||
      member.skills.some(skill => skill.toLowerCase().includes(term));
    const matchesRole = !roleFilter || displayRoles.includes(roleFilter);
    const matchesCompetence = !competenceFilter || member.skills.includes(competenceFilter);
    const matchesAvailability = !availabilityFilter || member.availability.includes(availabilityFilter);
    return matchesSearch && matchesRole && matchesCompetence && matchesAvailability;
  });

  const filteredCommunityMembers = communityLists.filter(member => {
    const term = searchTerm.toLowerCase();
    const displayRoles = translateRoles(member.roles);
    const matchesSearch =
      member.fullName?.toLowerCase().includes(term) ||
      member.email.toLowerCase().includes(term) ||
      member.skills.some(skill => skill.toLowerCase().includes(term));
    const matchesRole = !roleFilter || displayRoles.includes(roleFilter);
    const matchesCompetence = !competenceFilter || member.skills.includes(competenceFilter);
    const matchesAvailability =
      !availabilityFilter || (member.availability || []).includes(availabilityFilter);
    return matchesSearch && matchesRole && matchesCompetence && matchesAvailability;
  });

  const renderFilterBar = () => (
    <div className="members-filters">
      <div className="search-bar">
        <i className="fas fa-search"></i>
        <input
          type="text"
          placeholder="Rechercher un nom..."
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
          className="filter-select bigger-select"
        >
          <option value="">Toutes les compétences</option>
          {competenceOptions.length === 0 && (
            <option value="__skills_status" disabled>
              {skillsLoading ? 'Chargement des compétences...' : 'Aucune compétence disponible'}
            </option>
          )}
          {competenceOptions.map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>
      <div className="filter-group">
        <select
          value={availabilityFilter}
          onChange={(e) => setAvailabilityFilter(e.target.value)}
          className="filter-select bigger-select"
        >
          <option value="">Toutes les disponibilités</option>
          {availabilityOptions.map(option => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
      </div>
    </div>
  );

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

    const studentRole = student.role_in_system || student.role || 'eleve';
    const studentProfession = translateRole(student.role_in_system || student.role || '');

    const fallbackMember: Member = {
      id: student.id?.toString() || `${Date.now()}`,
      firstName: student.first_name || student.full_name?.split(' ')[0] || 'Inconnu',
      lastName: student.last_name || student.full_name?.split(' ')[1] || '',
      fullName: student.full_name,
      email: student.email || '',
      profession: studentProfession || '',
      roles: [studentRole],
      skills: [],
      availability: [],
      avatar: student.avatar_url || DEFAULT_AVATAR_SRC,
      isTrusted: student.status === 'confirmed',
      badges: [],
      organization: '',
      canProposeStage: false,
      canProposeAtelier: false,
      claim_token: student.claim_token,
      hasTemporaryEmail: student.has_temporary_email,
      birthday: student.birthday,
      role: studentRole,
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

  type RoleChangeSource = 'members' | 'community';

  const handleRoleChange = async (member: Member, newRole: string, source: RoleChangeSource = 'members') => {
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
          m.id === member.id ? { ...m, roles: [newRole], role: newRole } : m
        )
      );

      setCommunityLists(prev =>
        prev.map(m =>
          m.id === member.id ? { ...m, roles: [newRole], role: newRole } : m
        )
      );

      showSuccess(`Le rôle de ${member.fullName} a été modifié avec succès (${translateRole(newRole)})`);

      if (source === 'members') {
        await fetchMembers();
      }

      if (source === 'community' && (state.showingPageType === 'edu' || state.showingPageType === 'teacher')) {
        await fetchCommunityVolunteers();
      }

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
        <div className="bg-yellow-300 tabs-container">
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
          {renderFilterBar()}
          <div className='min-h-[65vh]'>
    

            <div className="members-grid">
              {filteredMembers.length > 0 ? filteredMembers.map((member) => {
                const totalBadgeCount = member.badges?.length || 0;
                const memberForDisplay = {
                  ...member,
                  roles: translateRoles(member.roles),
                  profession: translateRole(member.profession || '')
                };
                return (
                  <MemberCard
                    key={member.id}
                    member={memberForDisplay}
                    badgeCount={totalBadgeCount}
                    onClick={() => setSelectedMember(member)}
                    onContactClick={() => {
                      setContactEmail(member.email);
                      setIsContactModalOpen(true);
                    }}
                    onRoleChange={(newRole) => handleRoleChange(member, newRole, 'members')}
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
          {renderFilterBar()}
          <div className="members-grid">
            {filteredCommunityMembers.length > 0 ? (
              filteredCommunityMembers.map((communityItem) => {
                const communityForDisplay = {
                  ...communityItem,
                  roles: translateRoles(communityItem.roles),
                  profession: translateRole(communityItem.profession || '')
                };
                return (
                  <MemberCard
                    key={communityItem.id}
                    member={communityForDisplay}
                    badgeCount={communityItem.badges?.length || 0}
                    onClick={() => setSelectedMember(communityItem)}
                    onContactClick={() => {
                      setContactEmail(communityItem.email);
                      setIsContactModalOpen(true);
                    }}
                    onRoleChange={(newRole) => handleRoleChange(communityItem, newRole, 'community')}
                  />
                );
              })
            ) : (
              <div className="text-gray-500 whitespace-nowrap">
                {competenceFilter ? 'Aucun membre ne correspond à cette compétence' : 'Aucune communauté trouvée pour le moment'}
              </div>
            )}
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