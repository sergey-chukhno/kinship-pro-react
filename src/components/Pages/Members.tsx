import React, { useCallback, useEffect, useRef, useState } from 'react';
import { getCurrentUser } from '../../api/Authentication';
import { getCompanyMembersAccepted, getCompanyMembersPending, updateCompanyMemberRole, removeCompanyMember } from '../../api/CompanyDashboard/Members';
import { addSchoolLevel, getSchoolLevels, deleteSchoolLevel, updateSchoolLevel, addExistingStudentToLevel } from '../../api/SchoolDashboard/Levels';
import { getSchoolMembersAccepted, getSchoolMembersPending, getSchoolVolunteers, updateSchoolMemberRole, removeSchoolMember } from '../../api/SchoolDashboard/Members';
import { getCompanyUserProfile, getSchoolUserProfile } from '../../api/User';
import { getSkills } from '../../api/Skills';
import { getTeacherClasses, createTeacherClass, deleteTeacherClass, updateTeacherClass, removeTeacherStudent } from '../../api/Dashboard';
import { getTeacherClassStudents } from '../../api/Dashboard';
import { useAppContext } from '../../context/AppContext';
import { useToast } from '../../hooks/useToast';
import { translateSkill, translateSubSkill, SKILLS_FR, SUB_SKILLS_FR } from '../../translations/skills';
import { ClassList, Member } from '../../types';
import ClassCard from '../Class/ClassCard';
import MemberCard from '../Members/MemberCard';
import AddClassModal from '../Modals/AddClassModal';
import AddMemberModal from '../Modals/AddMemberModal';
import AddStudentModal from '../Modals/AddStudentModal';
import ClassStudentsModal from '../Modals/ClassStudentsModal';
import ContactModal from '../Modals/ContactModal';
import MemberModal from '../Modals/MemberModal';
import ConfirmModal from '../Modals/ConfirmModal';
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
  const isSchoolContext = state.showingPageType === 'edu' || state.showingPageType === 'teacher';
  const isTeacherContext = state.showingPageType === 'teacher';
  const currentSchoolRole = state.user?.available_contexts?.schools?.[0]?.role || '';
  const isSchoolAdmin = currentSchoolRole === 'admin' || currentSchoolRole === 'superadmin';
  const { showSuccess, showError } = useToast();
  const showStaffTab = !isTeacherContext;
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [contactEmail, setContactEmail] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [competenceFilter, setCompetenceFilter] = useState('');
  const [availabilityFilter, setAvailabilityFilter] = useState('');
  const [isImportExportOpen, setIsImportExportOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'members' | 'class' | 'community' | 'students'>(
    isTeacherContext ? 'class' : 'members'
  );
  const [isAddClassModalOpen, setIsAddClassModalOpen] = useState(false);
  const [isClassStudentsModalOpen, setIsClassStudentsModalOpen] = useState(false);
  const [selectedClass, setSelectedClass] = useState<{ id: number; name: string } | null>(null);
  const [editingClass, setEditingClass] = useState<ClassList | null>(null);

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
  const [skillsData, setSkillsData] = useState<Array<{ id: number; name: string; sub_skills: Array<{ id: number; name: string }> }>>([]);
  const [subSkillFilter, setSubSkillFilter] = useState('');
  const [classSearchTerm, setClassSearchTerm] = useState('');
  const [selectedSchoolFilter, setSelectedSchoolFilter] = useState<number | null>(null);
  const [availableSchoolsForFilter, setAvailableSchoolsForFilter] = useState<Array<{ id: number; name: string }>>([]);
  const [pendingRequestsCount, setPendingRequestsCount] = useState<number>(0);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [memberToDelete, setMemberToDelete] = useState<Member | null>(null);
  const [currentSchoolId, setCurrentSchoolId] = useState<number | null>(null);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Member | null>(null);
  const [selectedLevelId, setSelectedLevelId] = useState<number | null>(null);

  const fetchMembers = async () => {
    // Pour les teachers, récupérer les élèves de leurs classes
    if (isTeacherContext) {
      try {
        setLoading(true);
        const classesRes = await getTeacherClasses(1, 200); // charger suffisamment pour inclure tout le staff/élèves
        const classes = classesRes.data?.data || classesRes.data || [];

        const studentsArrays = await Promise.all(
          classes.map(async (cls: any) => {
            try {
              const res = await getTeacherClassStudents(cls.id, 200);
              const data = res.data?.data ?? res.data ?? [];
              return Array.isArray(data) ? data.map((stu: any) => ({ ...stu, class_id: cls.id, class_name: cls.name })) : [];
            } catch (err) {
              console.error('Erreur récupération élèves pour la classe', cls.id, err);
              return [];
            }
          })
        );

        const allStudents = studentsArrays.flat().map((s: any) => {
          const role = s.role || 'etudiant';
          return {
            id: (s.id || s.user_id || s.student_id || `${Date.now()}-${Math.random()}`).toString(),
            firstName: s.first_name,
            lastName: s.last_name,
            fullName: s.full_name || [s.first_name, s.last_name].filter(Boolean).join(' '),
            email: s.email || '',
            profession: '',
            roles: [role],
            rawRole: role,
            systemRole: role,
            membershipRole: 'student',
            skills: [],
            availability: [],
            badges: s.badges || [],
            experience: [],
            education: [],
            location: s.city || '',
            phone: s.phone || '',
            classId: s.class_id,
            className: s.class_name,
            avatar: s.avatar || DEFAULT_AVATAR_SRC,
            isTrusted: Boolean(s.isTrusted)
          } as Member;
        });

        setMembers(allStudents);
      } catch (err) {
        console.error('Erreur critique récupération élèves (teacher):', err);
        showError('Impossible de récupérer la liste des élèves');
      } finally {
        setLoading(false);
      }
      return;
    }

    try {
      setLoading(true);
      const currentUser = await getCurrentUser();
      const isEdu = isSchoolContext;

      // 1. Bascule de l'ID (Company vs School)
      const contextId = isEdu
        ? currentUser.data?.available_contexts?.schools?.[0]?.id
        : currentUser.data?.available_contexts?.companies?.[0]?.id;

      if (!contextId) return;
      if (isEdu) setCurrentSchoolId(contextId);

      // 2. Bascule de l'appel API (Liste de base)
      const membersRes = isEdu
        ? await getSchoolMembersAccepted(contextId, 200)
        : await getCompanyMembersAccepted(contextId, 200);

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
            // Prioritize role_in_system for staff classification, then role_in_school/role_in_company for membership role
            const systemRole = profile.role || profile.role_in_system || m.role_in_system || m.role || '';
            const membershipRole = profile.role_in_school || m.role_in_school || profile.role_in_company || m.role_in_company || 'member';
            // rawRole prioritizes system role for student/staff classification
            const rawRole = systemRole || membershipRole || 'member';

            // roleValues should use membershipRole for the role selector dropdown (organization roles: admin, superadmin, referent, intervenant, member)
            // This is separate from systemRole which is used for filtering and profession display
            const roleValues = [membershipRole].filter(Boolean);

            // Use actual job field if available, otherwise leave empty (not system role)
            const displayProfession = profile.job || m.job || '';

            // Check if member is superadmin
            const isSuperadmin = 
              profile.role_in_school === 'superadmin' || 
              m.role_in_school === 'superadmin' ||
              profile.role_in_company === 'superadmin' || 
              m.role_in_company === 'superadmin';

            return {
              id: (profile.id || m.id).toString(),
              firstName: profile.first_name,
              lastName: profile.last_name,
              fullName: profile.full_name || `${profile.first_name} ${profile.last_name}`,
              email: profile.email,
              profession: displayProfession,
              roles: roleValues as string[],
              rawRole: rawRole,
              systemRole: systemRole, // Store system role for staff filtering
              membershipRole: membershipRole, // Store membership role (role_in_school/role_in_company)
              skills: (() => {
                const allSkills: string[] = [];
                profile.skills?.forEach((s: any) => {
                  // Add main skill name
                  if (s.name) allSkills.push(s.name);
                  // Add sub-skill names
                  if (s.sub_skills && Array.isArray(s.sub_skills)) {
                    s.sub_skills.forEach((sub: any) => {
                      if (sub.name) allSkills.push(sub.name);
                    });
                  }
                });
                return allSkills;
              })(),
              availability: availabilityList,
              avatar: profile.avatar_url || m.avatar_url || DEFAULT_AVATAR_SRC,
              isTrusted: profile.status === 'confirmed',
              badges: profile.badges?.data?.map((b: any) => b.id?.toString()) || [],
              organization: '',
              canProposeStage: profile.take_trainee || false,
              canProposeAtelier: profile.propose_workshop || false,
              claim_token: profile.claim_token || m.claim_token,
              hasTemporaryEmail: profile.has_temporary_email || m.has_temporary_email || false,
              isSuperadmin: isSuperadmin, // Store superadmin status
            } as Member & { isSuperadmin?: boolean; systemRole?: string; membershipRole?: string };

          } catch (err) {
            console.warn(`Profil détaillé non trouvé pour ${m.id}, utilisation fallback.`);
            // FALLBACK
            const fallbackSystemRole = m.role || m.role_in_system || '';
            const fallbackMembershipRole = m.role_in_school || m.role_in_company || 'member';
            const fallbackRole = fallbackSystemRole || fallbackMembershipRole || 'member';

            // Check if member is superadmin in fallback case
            const isSuperadmin = 
              m.role_in_school === 'superadmin' || 
              m.role_in_company === 'superadmin';

            return {
              // ... (votre code fallback inchangé)
              id: m.id.toString(),
              firstName: m.first_name || 'Utilisateur',
              lastName: m.last_name || '',
              fullName: m.first_name && m.last_name ? `${m.first_name} ${m.last_name}` : (m.email || 'Inconnu'),
              email: m.email || '',
              profession: m.job || '',
              roles: [fallbackMembershipRole], // Use membershipRole for role selector
              rawRole: fallbackRole,
              systemRole: fallbackSystemRole, // Store system role for staff filtering
              membershipRole: fallbackMembershipRole, // Store membership role
              skills: [],
              availability: availabilityToLabels(m.availability),
              avatar: m.avatar_url || DEFAULT_AVATAR_SRC,
              isTrusted: false,
              badges: [],
              organization: '',
              canProposeStage: m.take_trainee || false,
              canProposeAtelier: m.propose_workshop || false,
              claim_token: m.claim_token,
              hasTemporaryEmail: m.has_temporary_email || false,
              isSuperadmin: isSuperadmin, // Store superadmin status
            } as Member & { isSuperadmin?: boolean; systemRole?: string; membershipRole?: string };
          }
        })
      );

      const validMembers = detailedMembers.filter((m): m is Member => m !== null);
      setMembers(validMembers);
    } catch (err) {
      console.error('Erreur critique récupération liste membres:', err);
      showError('Impossible de récupérer la liste des membres');
    } finally {
      setLoading(false);
    }
  };

  const fetchLevels = async () => {
    try {
      setLoading(true);
      const currentUser = await getCurrentUser();
      
      // Charger les écoles disponibles pour le filtre (pour les teachers et admins d'école)
      const schools = currentUser.data?.available_contexts?.schools || [];
      if (schools.length > 0) {
        const filteredSchools = schools.filter((school: any) => 
          school.role === 'admin' || school.role === 'superadmin' || school.role === 'referent'
        );
        const schoolsList = filteredSchools.map((school: any) => ({
          id: school.id,
          name: school.name
        }));
        setAvailableSchoolsForFilter(schoolsList);
      } else {
        setAvailableSchoolsForFilter([]);
      }
      
      // Si c'est un teacher rattaché à une école, utiliser l'API teachers/classes
      if (isTeacherContext) {
        const levelsRes = await getTeacherClasses(page, per_page);
        const levels = levelsRes.data.data || levelsRes.data || [];
        // Extraire les teacher_ids depuis les teachers et ajouter school_id si disponible
        const levelsWithTeacherIds = levels.map((level: any) => ({
          ...level,
          teacher_ids: level.teachers?.map((t: any) => t.id) || [],
          school_id: level.school_id || null
        }));
        setClassLists(levelsWithTeacherIds);
      } else {
        // Sinon, utiliser l'API schools/levels pour les admins d'école
        const isEdu = isSchoolContext;
        const contextId = isEdu ? currentUser.data?.available_contexts?.schools?.[0]?.id : null;
        if (!contextId) {
          setLoading(false);
          return;
        }
        const levelsRes = await getSchoolLevels(contextId, page, per_page);
        const levels = levelsRes.data.data || levelsRes.data || [];
        // Extraire les teacher_ids depuis les teachers et ajouter school_id
        const levelsWithTeacherIds = levels.map((level: any) => ({
          ...level,
          teacher_ids: level.teachers?.map((t: any) => t.id) || [],
          school_id: contextId
        }));
        setClassLists(levelsWithTeacherIds);
      }
    } catch (err) {
      console.error('Erreur critique récupération liste niveaux:', err);
      showError('Impossible de récupérer la liste des classes');
    } finally {
      setLoading(false);
    }
  };

  const fetchCommunityVolunteers = async () => {
    // Ne pas récupérer les volontaires pour les teachers
    if (isTeacherContext) {
      setCommunityLists([]);
      return;
    }

    try {
      const currentUser = await getCurrentUser();
      const isEdu = isSchoolContext;
      const schoolId = isEdu ? currentUser.data?.available_contexts?.schools?.[0]?.id : null;
      if (!schoolId) {
        setCommunityLists([]);
        return;
      }

      const volunteersRes = await getSchoolVolunteers(Number(schoolId), 'confirmed');
      const volunteers = volunteersRes.data?.data ?? volunteersRes.data ?? [];

      const mappedVolunteers: Member[] = volunteers.map((vol: any) => {
        const volunteerSystemRole = vol.role_in_system || vol.user?.role || '';
        const volunteerMembershipRole = vol.role_in_school || vol.role_in_company || 'volunteer';
        const volunteerRole = volunteerMembershipRole; // Use membershipRole for role selector
        const volunteerProfession = vol.user?.job || '';

        // Check if volunteer is superadmin
        const isSuperadmin = 
          vol.role_in_school === 'superadmin' || 
          vol.role_in_company === 'superadmin';

        return {
          id: (vol.id || vol.user_id || vol.user?.id || Date.now()).toString(),
          firstName: vol.first_name || vol.user?.first_name || 'Volontaire',
          lastName: vol.last_name || vol.user?.last_name || '',
          fullName: vol.full_name || `${vol.first_name || ''} ${vol.last_name || ''}`.trim(),
          email: vol.email || vol.user?.email || '',
          profession: volunteerProfession,
          roles: [volunteerRole], // Use membershipRole for role selector
          skills: (() => {
            const allSkills: string[] = [];
            vol.skills?.forEach((s: any) => {
              // Add main skill name
              if (s.name) allSkills.push(s.name);
              // Add sub-skill names
              if (s.sub_skills && Array.isArray(s.sub_skills)) {
                s.sub_skills.forEach((sub: any) => {
                  if (sub.name) allSkills.push(sub.name);
                });
              }
            });
            return allSkills;
          })(),
          availability: availabilityToLabels(vol.availability),
          avatar: vol.avatar_url || vol.user?.avatar || DEFAULT_AVATAR_SRC,
          isTrusted: (vol.status || '').toLowerCase() === 'confirmed',
          badges: vol.badges?.map((b: any) => b.id?.toString()) || [],
          organization: vol.organization || '',
          canProposeStage: vol.take_trainee || vol.user?.take_trainee || false,
          canProposeAtelier: vol.propose_workshop || vol.user?.propose_workshop || false,
          claim_token: vol.claim_token,
          hasTemporaryEmail: vol.has_temporary_email || false,
          birthday: vol.birthday,
          role: volunteerRole,
          levelId: undefined,
          roleAdditionalInfo: vol.role_additional_information || '',
          isSuperadmin: isSuperadmin, // Store superadmin status
          systemRole: volunteerSystemRole, // Store system role
          membershipRole: volunteerMembershipRole, // Store membership role
        } as Member & { isSuperadmin?: boolean; systemRole?: string; membershipRole?: string };
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
      
      // Store full skills data with sub_skills
      const skillsWithSubSkills = rawSkills
        .map((skill: any) => ({
          id: skill.id,
          name: skill.name || '',
          sub_skills: (skill.sub_skills || []).map((sub: any) => ({
            id: sub.id,
            name: sub.name || ''
          }))
        }))
        .filter((skill: any) => skill.name && skill.name.trim().length > 0);
      
      setSkillsData(skillsWithSubSkills);
      
      // Extract main skill names for dropdown
      const parsedSkills: string[] = skillsWithSubSkills
        .map((skill: any) => skill.name)
        .filter((skillName: string) => skillName.trim().length > 0);
      
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

  // Get sub-skills for selected main skill
  const selectedSkillData = skillsData.find(s => s.name === competenceFilter);
  const availableSubSkills = selectedSkillData?.sub_skills || [];

  useEffect(() => {
    fetchSkills();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchPendingRequestsCount = useCallback(async () => {
    try {
      const currentUser = await getCurrentUser();
      const isEdu = state.showingPageType === 'edu';
      const contextId = isEdu
        ? currentUser.data?.available_contexts?.schools?.[0]?.id
        : currentUser.data?.available_contexts?.companies?.[0]?.id;

      if (!contextId) {
        setPendingRequestsCount(0);
        return;
      }

      const pendingRes = isEdu
        ? await getSchoolMembersPending(contextId)
        : await getCompanyMembersPending(contextId);

      const pendingList = pendingRes.data?.data || pendingRes.data || [];
      setPendingRequestsCount(Array.isArray(pendingList) ? pendingList.length : 0);
    } catch (error) {
      console.error('Error fetching pending requests count:', error);
      setPendingRequestsCount(0);
    }
  }, [state.showingPageType]);

  useEffect(() => {
    let isMounted = true;
    let abortController = new AbortController();
    
    const fetchData = async () => {
      if (!isMounted) return;
      
      try {
        await Promise.all([
          fetchLevels(),
          fetchMembers(),
          fetchCommunityVolunteers(),
          fetchPendingRequestsCount()
        ]);
      } catch (error) {
        if (isMounted && !abortController.signal.aborted) {
          console.error('Error fetching data:', error);
        }
      }
    };
    
    fetchData();
    
    return () => {
      isMounted = false;
      abortController.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, per_page, state.showingPageType]);

  useEffect(() => {
    if (!isSchoolContext) {
      setActiveTab('members');
    } else if (isTeacherContext && activeTab === 'members') {
      setActiveTab('class');
    }
  }, [isSchoolContext, isTeacherContext, activeTab]);

  // Refresh pending count when returning from membership requests page
  useEffect(() => {
    if (state.currentPage === 'members') {
      fetchPendingRequestsCount();
    }
  }, [state.currentPage, fetchPendingRequestsCount]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsImportExportOpen(false);
      }
    };
    if (isImportExportOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isImportExportOpen]);

  const studentRoles = ['eleve_primaire', 'collegien', 'collégien', 'lyceen', 'lycéen', 'etudiant', 'étudiant', 'student', 'eleve', 'élève'];
  // Staff roles based on system roles (role_in_system): teachers and school admins
  const staffRoles = [
    // Teacher roles
    'secondary_school_teacher', 'primary_school_teacher', 'administrative_staff', 
    'cpe_student_life', 'education_rectorate_personnel', 'other_teacher',
    // School admin roles
    'directeur_ecole', 'principal', 'directeur_academique', 'responsable_academique', 'proviseur', 'other_school_admin',
    // Membership roles (role_in_school/role_in_company) for admins/superadmins
    'admin', 'superadmin', 'referent', 'référent', 'other_school_admin'
  ];

  // Filtrage générique (recherche / compétence / disponibilité)
  const baseFilteredMembers = members.filter(member => {
    const term = searchTerm.toLowerCase();
    const displayRoles = translateRoles(member.roles);
    const matchesSearch =
      member.fullName?.toLowerCase().includes(term) ||
      member.email.toLowerCase().includes(term) ||
      member.skills.some(skill => skill.toLowerCase().includes(term));
    const matchesRole = !roleFilter || displayRoles.includes(roleFilter);
    const matchesCompetence = (() => {
      if (!competenceFilter) return true;
      
      // Check if member has the main skill
      const hasMainSkill = member.skills.includes(competenceFilter);
      
      // If sub-skill filter is selected, check for that specific sub-skill
      if (subSkillFilter) {
        return member.skills.includes(subSkillFilter);
      }
      
      // If only main skill is selected, check if member has the main skill or any of its sub-skills
      if (hasMainSkill) return true;
      
      // Check if member has any sub-skill from the selected main skill category
      const selectedSkillData = skillsData.find(s => s.name === competenceFilter);
      if (selectedSkillData) {
        return selectedSkillData.sub_skills.some(sub => member.skills.includes(sub.name));
      }
      
      return false;
    })();
    const matchesAvailability = !availabilityFilter || member.availability.includes(availabilityFilter);
    return matchesSearch && matchesRole && matchesCompetence && matchesAvailability;
  });

  const filteredStudents = baseFilteredMembers.filter(member => {
    const primaryRoleRaw = ((member as any).rawRole || member.roles?.[0] || '').toLowerCase();
    return studentRoles.includes(primaryRoleRaw);
  });

  const filteredCommunityMembers = communityLists.filter(member => {
    const term = searchTerm.toLowerCase();
    const displayRoles = translateRoles(member.roles);
    const matchesSearch =
      member.fullName?.toLowerCase().includes(term) ||
      member.email.toLowerCase().includes(term) ||
      member.skills.some(skill => skill.toLowerCase().includes(term));
    const matchesRole = !roleFilter || displayRoles.includes(roleFilter);
    const matchesCompetence = (() => {
      if (!competenceFilter) return true;
      
      // Check if member has the main skill
      const hasMainSkill = member.skills.includes(competenceFilter);
      
      // If sub-skill filter is selected, check for that specific sub-skill
      if (subSkillFilter) {
        return member.skills.includes(subSkillFilter);
      }
      
      // If only main skill is selected, check if member has the main skill or any of its sub-skills
      if (hasMainSkill) return true;
      
      // Check if member has any sub-skill from the selected main skill category
      const selectedSkillData = skillsData.find(s => s.name === competenceFilter);
      if (selectedSkillData) {
        return selectedSkillData.sub_skills.some(sub => member.skills.includes(sub.name));
      }
      
      return false;
    })();
    const matchesAvailability =
      !availabilityFilter || (member.availability || []).includes(availabilityFilter);
    return matchesSearch && matchesRole && matchesCompetence && matchesAvailability;
  });

  const handleAssignStudentToClass = async () => {
    if (!selectedStudent || !selectedLevelId || !currentSchoolId) {
      showError("Sélectionnez un élève et une classe.");
      return;
    }
    try {
      // Use systemRole (role_in_system) for backend, not the translated/organization role
      const systemRole = (selectedStudent as any).systemRole || (selectedStudent as any).rawRole || '';
      // Map common student roles to backend expected values
      const roleMap: Record<string, string> = {
        'collegien': 'collegien',
        'collégien': 'collegien',
        'lyceen': 'lyceen',
        'lycéen': 'lyceen',
        'eleve_primaire': 'eleve_primaire',
        'élève_primaire': 'eleve_primaire',
        'etudiant': 'etudiant',
        'étudiant': 'etudiant',
        'student': 'etudiant',
        'eleve': 'collegien', // Default fallback
        'élève': 'collegien'
      };
      const normalizedRole = roleMap[systemRole.toLowerCase()] || systemRole.toLowerCase() || 'etudiant';
      
      // Backend requires first_name and last_name even for existing students
      await addExistingStudentToLevel(currentSchoolId, selectedLevelId, {
        student: { 
          email: selectedStudent.email, 
          role: normalizedRole,
          first_name: selectedStudent.firstName || '',
          last_name: selectedStudent.lastName || ''
        }
      });
      showSuccess("Élève assigné à la classe.");
      setIsAssignModalOpen(false);
      setSelectedStudent(null);
      setSelectedLevelId(null);
      await fetchMembers();
      await fetchLevels();
    } catch (err: any) {
      console.error("Assignation élève -> classe:", err);
      let errorMsg = "Erreur lors de l'assignation.";
      if (err?.response?.data?.details && Array.isArray(err.response.data.details)) {
        errorMsg = err.response.data.details.join(', ');
      } else if (err?.response?.data?.message) {
        errorMsg = err.response.data.message;
      } else if (err?.response?.data?.error) {
        errorMsg = err.response.data.error;
      }
      showError(errorMsg);
    }
  };

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
          onChange={(e) => {
            setCompetenceFilter(e.target.value);
            setSubSkillFilter(''); // Reset sub-skill filter when main skill changes
          }}
          className="filter-select bigger-select"
        >
          <option value="">Toutes les compétences</option>
          {competenceOptions.length === 0 && (
            <option value="__skills_status" disabled>
              {skillsLoading ? 'Chargement des compétences...' : 'Aucune compétence disponible'}
            </option>
          )}
          {competenceOptions.map(c => (
            <option key={c} value={c}>{translateSkill(c)}</option>
          ))}
        </select>
      </div>
      {competenceFilter && availableSubSkills.length > 0 && (
        <div className="filter-group">
          <select
            value={subSkillFilter}
            onChange={(e) => setSubSkillFilter(e.target.value)}
            className="filter-select bigger-select"
          >
            <option value="">Toutes les sous-compétences</option>
            {availableSubSkills.map(subSkill => (
              <option key={subSkill.id} value={subSkill.name}>{translateSubSkill(subSkill.name)}</option>
            ))}
          </select>
        </div>
      )}
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

  const handleMemberCreated = async () => {
    await fetchMembers();
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
      canProposeStage: student.take_trainee || false,
      canProposeAtelier: student.propose_workshop || false,
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

  const handleAddClassList = async (levelData: { level: { name: string; level: string; teacher_ids?: number[]; school_id?: number | null } }) => {
    // Si on est en mode édition, utiliser handleUpdateClass qui fait un PATCH
    if (editingClass) {
      await handleUpdateClass(levelData);
      return;
    }

    // Sinon, c'est une création (POST)
    try {
      const currentUser = await getCurrentUser();
      
      // Si c'est un teacher, utiliser l'API teachers/classes avec un payload différent
      if (isTeacherContext) {
        // Utiliser le school_id passé depuis le modal (peut être null pour "Aucun")
        // Si non fourni et qu'il y a plusieurs écoles, utiliser null
        // Si non fourni et qu'il n'y a qu'une école, utiliser celle-ci
        let schoolId: number | null = levelData.level.school_id ?? null;
        if (schoolId === undefined) {
          const schools = currentUser.data?.available_contexts?.schools || [];
          if (schools.length === 1) {
            // Si une seule école, l'utiliser par défaut
            schoolId = schools[0].id;
          } else {
            // Si plusieurs écoles ou aucune, utiliser null
            schoolId = null;
          }
        }
        
        // Récupérer l'ID du teacher actuel pour l'ajouter par défaut
        const teacherId = currentUser.data?.id;
        const teacherIds = levelData.level.teacher_ids && levelData.level.teacher_ids.length > 0 
          ? levelData.level.teacher_ids 
          : teacherId ? [Number(teacherId)] : [];
        
        // Construire le payload spécifique pour les teachers
        // Garder le niveau comme chaîne (ex: "petite_section", "cp", etc.)
        const levelValue = levelData.level.level || 'petite_section';
        
        const teacherClassData = {
          class: {
            name: levelData.level.name,
            level: levelValue,
            // Inclure school_id même si null (pour l'option "Aucun")
            school_id: schoolId !== null && schoolId !== undefined ? Number(schoolId) : null,
            teacher_ids: teacherIds
          }
        };
        
        await createTeacherClass(teacherClassData);
      } else {
        // Sinon, utiliser l'API schools/levels pour les admins d'école
        const isEdu = state.showingPageType === 'edu';
        const contextId = isEdu ? currentUser.data?.available_contexts?.schools?.[0]?.id : null;
        
        if (!contextId) {
          showError("Impossible de trouver le contexte de l'école");
          return;
        }

        await addSchoolLevel(contextId, levelData);
      }
      
      // Refresh the levels list after adding a new one
      await fetchLevels();
      setIsAddClassModalOpen(false);
      setEditingClass(null);
    } catch (err) {
      console.error("Erreur lors de l'ajout de la classe :", err);
      throw err; // Re-throw pour que AddClassModal puisse aussi gérer l'erreur
    }
  };

  const handleDeleteClass = async (classItem: ClassList) => {
    // Confirmation avant suppression
    const confirmed = window.confirm(
      `Êtes-vous sûr de vouloir supprimer la classe "${classItem.name}" ?\n\nCette action est irréversible et supprimera également tous les étudiants associés.`
    );

    if (!confirmed) return;

    try {
      const currentUser = await getCurrentUser();
      
      // Si c'est un teacher, utiliser l'API teachers/classes
      if (isTeacherContext) {
        await deleteTeacherClass(Number(classItem.id));
      } else {
        // Sinon, utiliser l'API schools/levels pour les admins d'école
        const isEdu = state.showingPageType === 'edu';
        const contextId = isEdu ? currentUser.data?.available_contexts?.schools?.[0]?.id : null;
        
        if (!contextId) {
          showError("Impossible de trouver le contexte de l'école");
          return;
        }

        await deleteSchoolLevel(contextId, Number(classItem.id));
      }
      
      showSuccess(`La classe "${classItem.name}" a été supprimée avec succès`);
      
      // Refresh the levels list after deletion
      await fetchLevels();
    } catch (err) {
      console.error("Erreur lors de la suppression de la classe :", err);
      showError("Erreur lors de la suppression de la classe");
    }
  };

  const handleEditClass = (classItem: ClassList) => {
    setEditingClass(classItem);
    setIsAddClassModalOpen(true);
  };

  const handleUpdateClass = async (levelData: { level: { name: string; level: string; teacher_ids?: number[]; school_id?: number | null } }) => {
    if (!editingClass) return;

    try {
      const currentUser = await getCurrentUser();
      
      // Si c'est un teacher, utiliser l'API teachers/classes avec un payload différent
      if (isTeacherContext) {
        // Utiliser le school_id passé depuis le modal, ou le premier disponible
        const schoolId = levelData.level.school_id || currentUser.data?.available_contexts?.schools?.[0]?.id;
        if (!schoolId) {
          showError("Impossible de trouver l'identifiant de l'école");
          return;
        }
        
        // Construire le payload spécifique pour les teachers
        // Garder le niveau comme chaîne (ex: "petite_section", "cp", etc.)
        const levelValue = levelData.level.level || 'petite_section';
        
        const teacherClassData = {
          class: {
            name: levelData.level.name,
            level: levelValue,
            // Inclure school_id même si null (pour l'option "Aucun")
            school_id: schoolId !== null && schoolId !== undefined ? Number(schoolId) : null,
            teacher_ids: levelData.level.teacher_ids || []
          }
        };
        
        await updateTeacherClass(Number(editingClass.id), teacherClassData);
      } else {
        // Sinon, utiliser l'API schools/levels pour les admins d'école
        const isEdu = state.showingPageType === 'edu';
        const contextId = isEdu ? currentUser.data?.available_contexts?.schools?.[0]?.id : null;
        
        if (!contextId) {
          showError("Impossible de trouver le contexte de l'école");
          return;
        }

        await updateSchoolLevel(contextId, Number(editingClass.id), levelData);
      }
      
      showSuccess(`La classe "${levelData.level.name}" a été modifiée avec succès`);
      
      // Refresh the levels list after update
      await fetchLevels();
      setIsAddClassModalOpen(false);
      setEditingClass(null);
    } catch (err) {
      console.error("Erreur lors de la modification de la classe :", err);
      throw err; // Re-throw pour que AddClassModal puisse aussi gérer l'erreur
    }
  };

  const handleDeleteMember = (member: Member) => {
    // Check if member is superadmin
    const isSuperadmin = (member as any).isSuperadmin || 
      ((member as any).membershipRole || '').toLowerCase() === 'superadmin';
    
    if (isSuperadmin) {
      showError("Impossible de supprimer un superadmin. Transférez d'abord le rôle de superadmin.");
      return;
    }

    setMemberToDelete(member);
    setIsDeleteConfirmOpen(true);
  };

  const confirmDeleteMember = async () => {
    if (!memberToDelete) return;

    try {
      const currentUser = await getCurrentUser();
      const isEdu = state.showingPageType === 'edu';
      const isTeacher = state.showingPageType === 'teacher';

      if (isTeacher) {
        // For teachers, remove student from class
        if (!memberToDelete.levelId) {
          showError("Impossible de déterminer la classe de l'étudiant");
          setIsDeleteConfirmOpen(false);
          setMemberToDelete(null);
          return;
        }

        await removeTeacherStudent(Number(memberToDelete.levelId), Number(memberToDelete.id));
        showSuccess(`${memberToDelete.fullName || memberToDelete.firstName} a été retiré de la classe avec succès`);
        
        // Refresh members and levels
        await fetchMembers();
        await fetchLevels();
      } else {
        // For companies and schools
        const contextId = isEdu
          ? currentUser.data?.available_contexts?.schools?.[0]?.id
          : currentUser.data?.available_contexts?.companies?.[0]?.id;

        if (!contextId) {
          showError("Impossible de trouver le contexte");
          setIsDeleteConfirmOpen(false);
          setMemberToDelete(null);
          return;
        }

        if (isEdu) {
          await removeSchoolMember(contextId, Number(memberToDelete.id));
        } else {
          await removeCompanyMember(contextId, Number(memberToDelete.id));
        }

        showSuccess(`${memberToDelete.fullName || memberToDelete.firstName} a été supprimé avec succès`);
        
        // Remove from local state
        deleteMember(memberToDelete.id);
        
        // Refresh members list
        await fetchMembers();
        
        // Refresh community volunteers if applicable
        if (isEdu) {
          await fetchCommunityVolunteers();
        }
      }

      // Close modal and reset state
      setIsDeleteConfirmOpen(false);
      setMemberToDelete(null);
      setSelectedMember(null);
    } catch (err: any) {
      console.error("Erreur lors de la suppression du membre :", err);
      
      // Handle specific error messages from backend
      const errorMessage = err.response?.data?.message || err.response?.data?.error || err.message;
      
      if (errorMessage?.includes('Superadmin cannot be removed')) {
        showError("Impossible de supprimer un superadmin. Transférez d'abord le rôle de superadmin.");
      } else if (errorMessage?.includes('Only superadmins can remove admins')) {
        showError("Seuls les superadmins peuvent supprimer des admins.");
      } else if (errorMessage?.includes('Forbidden')) {
        showError("Vous n'avez pas les permissions nécessaires pour supprimer ce membre.");
      } else {
        showError(errorMessage || "Erreur lors de la suppression du membre");
      }
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
          {/* Vérifier si l'utilisateur est admin ou superadmin dans au moins une école ou entreprise */}
          {(() => {
            const contexts = state.user.available_contexts;
            const isAdmin = contexts?.schools?.some((school: any) => 
              school.role === 'admin' || school.role === 'superadmin'
            ) || contexts?.companies?.some((company: any) => 
              company.role === 'admin' || company.role === 'superadmin'
            );
            return isAdmin ? (
              <div className="relative">
                <button className="btn btn-outline" onClick={handleMembershipRequests}>
                  <i className="fas fa-user-plus"></i>
                  Gérer demandes d'adhésion
                  {pendingRequestsCount > 0 && (
                    <span 
                      className="pending-requests-badge"
                      style={{
                        backgroundColor: state.showingPageType === 'pro' 
                          ? '#5570F1' // Blue for companies
                          : state.showingPageType === 'edu' 
                          ? '#10b981' // Green for schools
                          : '#ffa600ff', // Orange for teachers
                        color: 'white',
                        borderRadius: '12px',
                        padding: '2px 8px',
                        fontSize: '12px',
                        fontWeight: '600',
                        marginLeft: '8px',
                        minWidth: '24px',
                        textAlign: 'center',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      +{pendingRequestsCount}
                    </span>
                  )}
                </button>
              </div>
            ) : null;
          })()}
            <div className="dropdown-container" ref={dropdownRef}>
              <button
              disabled={true}
              title="Disponible très bientôt"
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
            <i className="fas fa-plus"></i> {isSchoolContext ? 'Ajouter un étudiant' : 'Ajouter un membre'}
          </button>
        </div>
      </div>

      {/* Tabs visibles pour les contextes scolaires (admin & enseignants) */}
      {isSchoolContext && (
        <div className="bg-yellow-300 tabs-container">
          {showStaffTab && (
          <button
            className={`tab-btn ${activeTab === 'members' ? 'active' : ''}`}
            onClick={() => setActiveTab('members')}
          >
            Staff
          </button>
          )}
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
          <button
            className={`tab-btn ${activeTab === 'students' ? 'active' : ''}`}
            onClick={() => setActiveTab('students')}
          >
            Élèves
          </button>
        </div>
      )}

      {/* Contenu du tab “Membres” */}
      {showStaffTab && activeTab === 'members' && (
        <>
          {renderFilterBar()}
          <div className="min-h-[65vh]">
            {/* Staff = tous les membres confirmés hors élèves (élèves visibles dans l'onglet Élèves) */}
            {(() => {
              const staffMembers: Member[] =
                state.showingPageType === 'pro'
                  ? baseFilteredMembers
                  : baseFilteredMembers.filter((member: Member) => {
                      const systemRole = ((member as any).systemRole || '').toLowerCase();
                      const membershipRole = ((member as any).membershipRole || '').toLowerCase();
                      const primaryRoleRaw = ((member as any).rawRole || member.roles?.[0] || '').toLowerCase();
                      const isSuperadmin = (member as any).isSuperadmin || false;

                      // Exclure les élèves (uniquement école/teacher)
                      if (studentRoles.includes(primaryRoleRaw) || studentRoles.includes(systemRole)) return false;

                      if (isSuperadmin) return true;
                      if (systemRole && staffRoles.includes(systemRole)) return true;
                      if (membershipRole && ['admin', 'superadmin', 'referent', 'référent', 'other_school_admin'].includes(membershipRole)) return true;
                      return false;
                    });

              return (
                <div className="members-grid">
                  {staffMembers.length > 0 ? (
                    staffMembers.map((member: Member) => {
                      const totalBadgeCount = member.badges?.length || 0;
                      const memberForDisplay = {
                        ...member,
                        roles: translateRoles(member.roles),
                        profession: member.profession || '',
                      };
                      const isSuperadmin =
                        (member as any).isSuperadmin ||
                        ((member as any).membershipRole || '').toLowerCase() === 'superadmin';

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
                          onRoleChange={(newRole) => {
                            if (isSuperadmin) {
                              showError('Le rôle superadmin ne peut pas être modifié');
                              return;
                            }
                            handleRoleChange(member, newRole, 'members');
                          }}
                          isSuperadmin={isSuperadmin}
                          disableRoleDropdown={isSuperadmin}
                        />
                      );
                    })
                  ) : (
                    <div className="w-full text-center text-gray-500">Aucun membre trouvé pour le moment</div>
                  )}
                </div>
              );
            })()}
          </div>
        </>
      )}
      {/* Contenu du tab “Élèves” */}
      {isSchoolContext && activeTab === 'students' && (
        <div className="min-h-[65vh]">
          <div className="members-grid">
            {filteredStudents.length > 0 ? filteredStudents.map((member) => {
              const totalBadgeCount = member.badges?.length || 0;
              const memberForDisplay = {
                ...member,
                roles: translateRoles(member.roles),
                profession: member.profession || ''
              };
              const isSuperadmin = (member as any).isSuperadmin || 
                ((member as any).membershipRole || '').toLowerCase() === 'superadmin';
              const canAssignClass = !isSuperadmin && !isTeacherContext && currentSchoolId !== null && isSchoolAdmin;
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
                  onRoleChange={(newRole) => {
                    if (isSuperadmin) {
                      showError("Le rôle superadmin ne peut pas être modifié");
                      return;
                    }
                    handleRoleChange(member, newRole, 'members');
                  }}
                  isSuperadmin={isSuperadmin}
                  disableRoleDropdown={isSuperadmin}
                  extraActions={canAssignClass ? [
                    {
                      label: 'Assigner à une classe',
                      onClick: () => {
                        setSelectedStudent(member);
                        setIsAssignModalOpen(true);
                      }
                    }
                  ] : []}
                />
              );
            })
            : <div className="w-full text-center text-gray-500">Aucun élève trouvé</div>}
          </div>
        </div>
      )}

      {/* Contenu du tab "Classe" */}
      {activeTab === 'class' && (
        <div className="min-h-[75vh]" >
            <div className="flex flex-col gap-4 mb-4">
              <div className="flex flex-wrap gap-4 items-center">
                <button className="view-btn" onClick={() => setIsAddClassModalOpen(true)}>
                  <i className="fas fa-plus"></i> Ajouter une classe
                </button>
                
                {/* Barre de recherche */}
                <div className="flex-1 min-w-[200px] max-w-[400px]">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Rechercher une classe par nom ou niveau"
                      value={classSearchTerm}
                      onChange={(e) => setClassSearchTerm(e.target.value)}
                      className="!pl-10 form-input"
                    />
                    <i className="absolute left-3 top-1/2 text-gray-400 transform -translate-y-1/2 fas fa-search"></i>
                  </div>
                </div>

                {/* Filtre par établissement (affiché si au moins une école disponible) */}
                {availableSchoolsForFilter.length > 0 && (
                  <div className="min-w-[200px]">
                    <select
                      value={selectedSchoolFilter !== null && selectedSchoolFilter !== -1 ? selectedSchoolFilter : selectedSchoolFilter === -1 ? 'none' : ''}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value === 'none') {
                          setSelectedSchoolFilter(-1); // -1 représente "Aucun"
                        } else if (value === '') {
                          setSelectedSchoolFilter(null); // null représente "Tous"
                        } else {
                          setSelectedSchoolFilter(Number(value));
                        }
                      }}
                      className="form-select"
                    >
                      <option value="">Tous les établissements</option>
                      <option value="none">Aucun</option>
                      {availableSchoolsForFilter.map((school) => (
                        <option key={school.id} value={school.id}>
                          {school.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
              
              {/* Add/Edit class modal */}
              {isAddClassModalOpen && (
                <AddClassModal 
                  onClose={() => {
                    setIsAddClassModalOpen(false);
                    setEditingClass(null);
                  }} 
                  onAdd={handleAddClassList}
                  initialData={editingClass ? {
                    name: editingClass.name,
                    level: editingClass.level || '',
                    id: Number(editingClass.id),
                    teacher_ids: editingClass.teacher_ids || []
                  } : undefined}
                  isEdit={!!editingClass}
                />
              )}
            </div>
          <div className="members-grid">
            {(() => {
              // Filtrer les classes par recherche et établissement
              let filteredClasses = classLists;
              
              // Filtre par recherche (nom de la classe)
              if (classSearchTerm.trim()) {
                const searchLower = classSearchTerm.toLowerCase();
                filteredClasses = filteredClasses.filter((classItem: ClassList) =>
                  classItem.name?.toLowerCase().includes(searchLower) ||
                  classItem.level?.toLowerCase().includes(searchLower)
                );
              }
              
              // Filtre par établissement
              if (selectedSchoolFilter !== null) {
                if (selectedSchoolFilter === -1) {
                  // Filtrer les classes sans établissement (school_id: null)
                  filteredClasses = filteredClasses.filter((classItem: any) =>
                    classItem.school_id === null || classItem.school_id === undefined
                  );
                } else {
                  // Filtrer par établissement spécifique
                  filteredClasses = filteredClasses.filter((classItem: any) =>
                    classItem.school_id === selectedSchoolFilter
                  );
                }
              }
              
              return filteredClasses.length > 0 ? filteredClasses.map((classItem: ClassList) => (
                <ClassCard
                  key={classItem?.id}
                  name={classItem?.name}
                  teacher={classItem?.teacher || ''}
                  studentCount={classItem?.students_count || 0}
                  level={classItem?.level || ''}
                  teachers={classItem?.teachers}
                  onClick={() => handleClassClick(classItem)}
                  onEdit={() => handleEditClass(classItem)}
                  onDelete={() => handleDeleteClass(classItem)}
                />
              )) : (
                <div className="w-full text-center text-gray-500">
                  {classSearchTerm || (selectedSchoolFilter !== null && selectedSchoolFilter !== -1) || selectedSchoolFilter === -1
                    ? 'Aucune classe ne correspond aux critères de recherche' 
                    : 'Aucune classe trouvée pour le moment'}
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* Contenu du tab "Communauté" */}
      {activeTab === 'community' && (
        <div className="community-tab-content min-h-[75vh]">
          {isTeacherContext ? (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
              <div className="p-8 max-w-md bg-blue-50 rounded-lg border border-blue-200">
                <i className="mb-4 text-4xl text-blue-500 fas fa-info-circle"></i>
                <h3 className="mb-2 text-xl font-semibold text-gray-700">Fonctionnalité à venir</h3>
                <p className="text-gray-600">Disponible très bientôt</p>
              </div>
            </div>
          ) : (
            <>
              {renderFilterBar()}
              <div className="members-grid">
                {filteredCommunityMembers.length > 0 ? (
                  filteredCommunityMembers.map((communityItem) => {
                    const communityForDisplay = {
                      ...communityItem,
                      roles: translateRoles(communityItem.roles),
                      profession: communityItem.profession || ''
                    };
                    // Check if member is superadmin (from stored data or check membershipRole directly)
                    const isSuperadmin = (communityItem as any).isSuperadmin || 
                      ((communityItem as any).membershipRole || '').toLowerCase() === 'superadmin';
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
                        onRoleChange={(newRole) => {
                          // Prevent role change for superadmins
                          if (isSuperadmin) {
                            showError("Le rôle superadmin ne peut pas être modifié");
                            return;
                          }
                          handleRoleChange(communityItem, newRole, 'community');
                        }}
                        isSuperadmin={isSuperadmin}
                        disableRoleDropdown={isSuperadmin}
                      />
                    );
                  })
                ) : (
                  <div className="text-gray-500 whitespace-nowrap">
                    {competenceFilter ? 'Aucun membre ne correspond à cette compétence' : 'Aucune communauté trouvée pour le moment'}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {selectedMember && (
        <MemberModal
          member={selectedMember}
          onClose={() => setSelectedMember(null)}
          onUpdate={(updates) => handleUpdateMember(selectedMember.id, updates)}
          onDelete={() => handleDeleteMember(selectedMember)}
          onContactClick={() => setIsContactModalOpen(true)}
          isSuperadmin={(selectedMember as any).isSuperadmin || 
            ((selectedMember as any).membershipRole || '').toLowerCase() === 'superadmin'}
        />
      )}

      <ConfirmModal
        isOpen={isDeleteConfirmOpen}
        title="Confirmer la suppression"
        message={
          memberToDelete
            ? `Êtes-vous sûr de vouloir supprimer ${memberToDelete.fullName || `${memberToDelete.firstName} ${memberToDelete.lastName}`} ?\n\nCette action est irréversible.`
            : ''
        }
        confirmText="Supprimer"
        cancelText="Annuler"
        variant="danger"
        onConfirm={confirmDeleteMember}
        onCancel={() => {
          setIsDeleteConfirmOpen(false);
          setMemberToDelete(null);
        }}
      />

      {isAddModalOpen && state.showingPageType !== 'edu' && state.showingPageType !== 'teacher' && (
        <AddMemberModal 
          onClose={() => setIsAddModalOpen(false)} 
          onAdd={handleAddMember}
          onSuccess={handleMemberCreated}
        />
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

      {isAssignModalOpen && (
        <div className="modal-overlay" onClick={() => setIsAssignModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Assigner à une classe</h3>
              <button className="modal-close" onClick={() => setIsAssignModalOpen(false)}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="modal-body">
              <p className="mb-3 text-gray-600">Sélectionnez une classe pour {selectedStudent?.fullName || 'cet élève'}.</p>
              <div className="form-field">
                <label className="form-label">Classe</label>
                <select
                  className="form-input"
                  value={selectedLevelId ?? ''}
                  onChange={(e) => setSelectedLevelId(Number(e.target.value))}
                >
                  <option value="">Choisir une classe</option>
                  {classLists.map((cl) => (
                    <option key={cl.id} value={cl.id}>{cl.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => { setIsAssignModalOpen(false); setSelectedLevelId(null); }}>
                Annuler
              </button>
              <button className="btn btn-primary" onClick={handleAssignStudentToClass}>
                Assigner
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default Members;