import React, { useState, useEffect } from 'react';
import { Project } from '../../types';
import { useAppContext } from '../../context/AppContext';
import { getTags, getPartnerships, getTeacherSchoolPartnerships, getTeacherSchoolMembers, getOrganizationMembers, getTeacherMembers, createProject } from '../../api/Projects';
import { getTeacherAllStudents } from '../../api/Dashboard';
import { getSchoolLevels } from '../../api/SchoolDashboard/Levels';
import {
  mapFrontendToBackend,
  base64ToFile,
  getContextFromPageType,
  getOrganizationId,
  getOrganizationType,
  validateImages
} from '../../utils/projectMapper';
import { getSelectedOrganizationId } from '../../utils/contextUtils';
import { translateRole } from '../../utils/roleTranslations';
import './Modal.css';
import AvatarImage from '../UI/AvatarImage';

const STUDENT_SYSTEM_ROLES = ['eleve_primaire', 'collegien', 'lyceen', 'etudiant'];

interface ProjectModalProps {
  project?: Project | null;
  onClose: () => void;
  onSave: (projectData: Omit<Project, 'id'>) => void;
}

const ProjectModal: React.FC<ProjectModalProps> = ({ project, onClose, onSave }) => {
  const { state, addProject, setTags } = useAppContext();

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    startDate: '',
    endDate: '',
    organization: '',
    status: 'draft' as 'draft' | 'to_process' | 'coming' | 'in_progress' | 'ended',
    visibility: 'public' as 'public' | 'private',
    pathway: '',
    tags: '',
    links: '',
    participants: [] as string[],
    image: '',
    // responsible: '', // Removed as per request
    coResponsibles: [] as string[],
    isPartnership: false, // New field
    partners: [] as string[],
    additionalImages: [] as string[],
    // School levels (organisations porteuses)
    schoolLevelIds: [] as string[]
  });

  const [imagePreview, setImagePreview] = useState<string>('');
  const [additionalImagePreviews, setAdditionalImagePreviews] = useState<string[]>([]);
  const [documentFiles, setDocumentFiles] = useState<File[]>([]);
  const [searchTerms, setSearchTerms] = useState({
    // responsible: '', // Removed
    coResponsibles: '',
    participants: '',
    partner: ''
  });
  const [showSuccess, setShowSuccess] = useState(false);
  const [successData, setSuccessData] = useState<{ title: string, image: string } | null>(null);

  // Loading states
  const [isSubmitting, setIsSubmitting] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [isLoadingTags, setIsLoadingTags] = useState(false);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [isLoadingPartnerships, setIsLoadingPartnerships] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [availablePartnerships, setAvailablePartnerships] = useState<any[]>([]);
  const [availableSchoolLevels, setAvailableSchoolLevels] = useState<any[]>([]);
  const [isLoadingSchoolLevels, setIsLoadingSchoolLevels] = useState(false);
  const [availablePathways, setAvailablePathways] = useState<any[]>([]);
  const [isLoadingPathways, setIsLoadingPathways] = useState(false);
  // Contact users from selected partnership, pre-selected as co-responsibles (for display)
  const [partnershipContactMembers, setPartnershipContactMembers] = useState<any[]>([]);

  // Teacher project context: 'independent' or 'school'
  const [teacherProjectContext, setTeacherProjectContext] = useState<'independent' | 'school'>('school');
  const [selectedSchoolId, setSelectedSchoolId] = useState<number | undefined>(undefined);

  // Co-responsibles options when teacher selects school (staff + community, not students)
  const [coResponsibleOptions, setCoResponsibleOptions] = useState<any[]>([]);
  const [isLoadingCoResponsibles, setIsLoadingCoResponsibles] = useState(false);

  // Participants options when teacher: all students from teacher's schools with infinite scroll
  const [participantsOptions, setParticipantsOptions] = useState<any[]>([]);
  const [participantsPage, setParticipantsPage] = useState(1);
  const [hasMoreParticipants, setHasMoreParticipants] = useState(false);
  const [isLoadingParticipants, setIsLoadingParticipants] = useState(false);
  const participantsListRef = React.useRef<HTMLDivElement | null>(null);

  // Search functionality with exclusion of already selected members
  // Members are mutually exclusive: cannot be both co-responsible AND participant
  // Project creator (owner) is excluded from selection as they are automatically added
  const getFilteredMembers = (searchTerm: string) => {
    // Defensive check: ensure members is an array
    if (!members || !Array.isArray(members)) {
      console.warn('getFilteredMembers: members is not an array', members);
      return [];
    }
    
    // Get current user ID (project creator) - exclude from selection
    const currentUserId = state.user?.id?.toString();
    
    // Combine all selected member IDs (from both co-responsibles and participants)
    // Normalize to strings for consistent comparison
    const selectedMemberIds = [
      ...formData.coResponsibles.map(id => id.toString()),
      ...formData.participants.map(id => id.toString())
    ];
    
    // Filter out already selected members and project creator
    let availableMembers = members.filter((member: any) => {
      if (!member) return false;
      
      const memberIdStr = member.id?.toString();
      
      // Exclude project creator (owner is automatically added, not selectable)
      if (currentUserId && memberIdStr === currentUserId) {
        return false;
      }
      
      // Exclude members that are already selected (as co-responsible or participant)
      if (selectedMemberIds.includes(memberIdStr)) {
        return false;
      }
      
      return true;
    });
    
    // Apply search filter if search term provided
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      availableMembers = availableMembers.filter((member: any) => {
        const fullName = `${member.first_name || ''} ${member.last_name || ''}`.toLowerCase();
        const memberFullName = member.full_name?.toLowerCase() || '';
        const memberRole = member.role?.toLowerCase() || '';
        const memberEmail = member.email?.toLowerCase() || '';
        
        return fullName.includes(searchLower) ||
               memberFullName.includes(searchLower) ||
               memberRole.includes(searchLower) ||
               memberEmail.includes(searchLower);
      });
    }
    
    return availableMembers;
  };

  const getFilteredPartners = (searchTerm: string) => {
    if (!availablePartnerships || !Array.isArray(availablePartnerships)) return [];
    
    // Get current organization to exclude: for teacher+school use selected school; otherwise localStorage
    let currentOrgId: number | null = null;
    let currentOrgType: string | null = null;
    if (state.showingPageType === 'teacher' && teacherProjectContext === 'school' && selectedSchoolId) {
      currentOrgId = selectedSchoolId;
      currentOrgType = 'school';
    } else {
      const savedContextId = localStorage.getItem('selectedContextId');
      const savedContextType = localStorage.getItem('selectedContextType');
      if (savedContextId && savedContextType) {
        currentOrgId = parseInt(savedContextId);
        currentOrgType = savedContextType;
      }
    }
    
    let filtered = availablePartnerships;
    if (currentOrgId != null && currentOrgType) {
      filtered = availablePartnerships.filter(partnership => {
        return !partnership.partners?.some((partner: any) =>
          partner.id === currentOrgId &&
          partner.type?.toLowerCase() === currentOrgType!.toLowerCase()
        );
      });
    }
    
    // Filter out already selected partnerships (compare as string for number/string ids)
    const selectedPartnerIds = new Set(formData.partners.map((id: string) => id?.toString()));
    filtered = filtered.filter((partnership: any) =>
      !selectedPartnerIds.has(partnership.id?.toString())
    );

    if (!searchTerm.trim()) return filtered;
    const searchLower = searchTerm.toLowerCase();
    return filtered.filter(partnership =>
      partnership.name?.toLowerCase().includes(searchLower) ||
      partnership.partners?.some((p: any) => 
        p.name?.toLowerCase().includes(searchLower)
      )
    );
  };

  // Reset teacher context when modal opens/closes (default: school)
  useEffect(() => {
    if (!project && state.showingPageType === 'teacher') {
      setTeacherProjectContext('school');
      const schools = state.user.available_contexts?.schools || [];
      setSelectedSchoolId(schools.length > 0 ? schools[0].id : undefined);
    }
  }, [project, state.showingPageType]);
  
  // If teacher selects 'school' but has no schools, automatically switch back to 'independent'
  useEffect(() => {
    if (state.showingPageType === 'teacher' && !project && teacherProjectContext === 'school') {
      const availableSchools = state.user.available_contexts?.schools || [];
      if (availableSchools.length === 0) {
        // No schools available, switch back to independent
        setTeacherProjectContext('independent');
        setSelectedSchoolId(undefined);
      }
    }
  }, [teacherProjectContext, state.user.available_contexts?.schools, state.showingPageType, project]);

  // Update organization field when teacher context changes
  useEffect(() => {
    if (state.showingPageType === 'teacher' && !project) {
      if (teacherProjectContext === 'independent') {
        // Independent teacher: "Prénom Nom - Enseignant"
        const independentTeacher = state.user.available_contexts?.independent_teacher as any;
        const firstName = state.user.name?.split(' ')[0] || independentTeacher?.organization_name?.split(' ')[0] || '';
        const lastName = state.user.name?.split(' ').slice(1).join(' ') || independentTeacher?.organization_name?.split(' ').slice(1).join(' ') || '';
        if (firstName || lastName) {
          setFormData(prev => ({ ...prev, organization: `${firstName} ${lastName} - Enseignant`.trim() }));
        } else {
          const defaultOrg = independentTeacher?.organization_name || '';
          setFormData(prev => ({ ...prev, organization: defaultOrg }));
        }
      } else if (teacherProjectContext === 'school' && selectedSchoolId) {
        // School: find school name by ID
        const selectedSchool = state.user.available_contexts?.schools?.find((s: any) => s.id === selectedSchoolId);
        if (selectedSchool) {
          setFormData(prev => ({ ...prev, organization: selectedSchool.name }));
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teacherProjectContext, selectedSchoolId, state.showingPageType, state.user.name, project]); // Utiliser state.user.name au lieu de state.user

  useEffect(() => {
    if (project) {
      setFormData({
        title: project.title,
        description: project.description,
        startDate: project.startDate,
        endDate: project.endDate,
        organization: project.organization,
        status: project.status,
        visibility: project.visibility || 'public',
        pathway: project.pathway || '',
        tags: project.tags.join(', '),
        links: project.links || '',
        participants: project.members,
        image: project.image || '',
        // responsible: '',
        coResponsibles: [],
        isPartnership: !!(project.partners?.length || project.partner), // Infer from existing data
        partners: (project.partners?.length ? project.partners.map((p: { id: string }) => p.id) : (project.partner?.id ? [project.partner.id.toString()] : [])),
        additionalImages: [],
        schoolLevelIds: [] // Will be populated from API if project has school levels
      });
      setImagePreview(project.image || '');
    } else {
      // Set default dates
      const today = new Date();
      const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, today.getDate());

      // Prefill organization based on context
      let defaultOrg = '';

      if (state.showingPageType === 'pro' || state.showingPageType === 'edu') {
        const selectedOrgId = getSelectedOrganizationId(state.user, state.showingPageType);
        if (selectedOrgId) {
          const selectedOrg = state.showingPageType === 'pro'
            ? state.user.available_contexts?.companies?.find((c: any) => c.id === selectedOrgId)
            : state.user.available_contexts?.schools?.find((s: any) => s.id === selectedOrgId);
          defaultOrg = selectedOrg?.name || '';
        }

        if (!defaultOrg) {
          defaultOrg = state.showingPageType === 'pro'
            ? state.user.available_contexts?.companies?.[0]?.name || ''
            : state.user.available_contexts?.schools?.[0]?.name || '';
        }
      } else if (state.showingPageType === 'teacher') {
        // For teachers: default to independent teacher name format "Prénom Nom - Enseignant"
        const independentTeacher = state.user.available_contexts?.independent_teacher as any;
        const firstName = state.user.name?.split(' ')[0] || independentTeacher?.organization_name?.split(' ')[0] || '';
        const lastName = state.user.name?.split(' ').slice(1).join(' ') || independentTeacher?.organization_name?.split(' ').slice(1).join(' ') || '';
        if (firstName || lastName) {
          defaultOrg = `${firstName} ${lastName} - Enseignant`.trim();
        } else {
          // Fallback to independent_teacher organization_name if available
          defaultOrg = independentTeacher?.organization_name || '';
        }
      }

      setFormData(prev => ({
        ...prev,
        startDate: today.toISOString().split('T')[0],
        endDate: nextMonth.toISOString().split('T')[0],
        organization: defaultOrg
      }));
    }
  }, [project, state.showingPageType, state.user]);

  // Fetch tags when modal opens
  useEffect(() => {
    const fetchTags = async () => {
      if (state.tags.length === 0) {
        setIsLoadingTags(true);
        try {
          const tagsData = await getTags();
          // Ensure tagsData is an array before setting
          if (Array.isArray(tagsData)) {
            setTags(tagsData);
          } else {
            console.error('getTags returned non-array:', tagsData);
            setTags([]);
          }
        } catch (error) {
          console.error('Error fetching tags:', error);
          setTags([]); // Set empty array on error
        } finally {
          setIsLoadingTags(false);
        }
      }
    };

    fetchTags();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.tags.length]); // setTags est stable du contexte, pas besoin de le mettre en dépendance

  // Fetch pathways (tags) for pathway select
  useEffect(() => {
    const fetchPathways = async () => {
      setIsLoadingPathways(true);
      try {
        const tagsData = await getTags();
        // Ensure tagsData is an array before setting
        if (Array.isArray(tagsData)) {
          setAvailablePathways(tagsData);
        } else {
          console.error('getTags returned non-array:', tagsData);
          setAvailablePathways([]);
        }
      } catch (error) {
        console.error('Error fetching pathways:', error);
        setAvailablePathways([]);
      } finally {
        setIsLoadingPathways(false);
      }
    };

    fetchPathways();
  }, []);

  // Fetch school levels (organisations porteuses) when modal opens
  useEffect(() => {
    const fetchSchoolLevels = async () => {
      setIsLoadingSchoolLevels(true);
      try {
        const organizationType = getOrganizationType(state.showingPageType);
        const organizationId = getOrganizationId(state.user, state.showingPageType);

        // Only fetch classes for school context
        if (organizationType === 'school' && organizationId) {
          const response = await getSchoolLevels(organizationId, 1, 100);
          setAvailableSchoolLevels(response.data?.data || []);
        } else {
          setAvailableSchoolLevels([]);
        }
      } catch (err) {
        console.error('Error fetching school levels:', err);
        setAvailableSchoolLevels([]);
      } finally {
        setIsLoadingSchoolLevels(false);
      }
    };

    fetchSchoolLevels();
  }, [state.showingPageType, state.user]);

  // Fetch members and partnerships when modal opens
  useEffect(() => {
    const fetchMembersAndPartnerships = async () => {
      // Utiliser le contexte sélectionné depuis localStorage (comme dans Dashboard et Projects)
      const savedContextId = localStorage.getItem('selectedContextId');
      const savedContextType = localStorage.getItem('selectedContextType') as 'school' | 'company' | 'teacher' | 'user' | null;
      
      let organizationId: number | undefined;
      let organizationType: 'school' | 'company' | undefined;
      
      // Si on a un contexte sauvegardé et que c'est une école ou une entreprise
      if (savedContextId && savedContextType && (savedContextType === 'school' || savedContextType === 'company')) {
        // Vérifier que l'utilisateur a toujours accès à ce contexte
        if (savedContextType === 'company') {
          const company = state.user.available_contexts?.companies?.find(
            (c: any) => c.id.toString() === savedContextId && (c.role === 'admin' || c.role === 'superadmin')
          );
          if (company) {
            organizationId = Number(savedContextId);
            organizationType = 'company';
          }
        } else if (savedContextType === 'school') {
          const school = state.user.available_contexts?.schools?.find(
            (s: any) => s.id.toString() === savedContextId && (s.role === 'admin' || s.role === 'superadmin')
          );
          if (school) {
            organizationId = Number(savedContextId);
            organizationType = 'school';
          }
        }
      }
      
      // Sinon, utiliser la logique par défaut
      if (!organizationId) {
        organizationId = getOrganizationId(state.user, state.showingPageType);
        organizationType = getOrganizationType(state.showingPageType);
      }

      console.log('Fetching members:', { organizationId, organizationType, showingPageType: state.showingPageType, teacherProjectContext });

      // Handle teacher context: fetch members based on selected context (independent vs school)
      if (state.showingPageType === 'teacher') {
        setIsLoadingMembers(true);
        try {
          let membersData: any[] = [];
          
          // For teachers, always use getTeacherMembers() which returns students from their classes
          // This works for both independent and school contexts since getTeacherMembers
          // returns all students from all classes the teacher manages (regardless of school)
          console.log('Fetching teacher class members');
          membersData = await getTeacherMembers({ per_page: 1000 });
          
          // If teacher selected "school" context, filter members to only show those from the selected school
          if (teacherProjectContext === 'school' && selectedSchoolId) {
            console.log('Filtering teacher members by school:', selectedSchoolId);
            // Filter members to only include those from classes belonging to the selected school
            // We need to check if the member's classes belong to the selected school
            // Since getTeacherMembers returns members from teacher's classes, we filter client-side
            // by checking if any of the member's classes belong to the selected school
            const filteredMembers = membersData.filter((member: any) => {
              // Check if member has classes in the selected school
              // The member object should have a 'classes' array from the API response
              if (member.classes && Array.isArray(member.classes)) {
                return member.classes.some((cls: any) => {
                  // Check both school_id directly and school.id
                  const classSchoolId = cls.school_id || cls.school?.id;
                  return classSchoolId === selectedSchoolId;
                });
              }
              // If no classes info, exclude the member (should not happen, but safer)
              return false;
            });
            membersData = filteredMembers;
            console.log(`Filtered to ${membersData.length} members from school ${selectedSchoolId}`);
          }
          
          console.log('Members fetched:', membersData);
          
          // Ensure membersData is an array
          if (Array.isArray(membersData)) {
            setMembers(membersData);
            console.log(`Loaded ${membersData.length} members`);
          } else {
            console.error('Members data is not an array:', membersData);
            setMembers([]);
          }
        } catch (error: any) {
          console.error('Error fetching members:', error);
          console.error('Error details:', error.response?.data || error.message);
          setMembers([]); // Set empty array on error
        } finally {
          setIsLoadingMembers(false);
        }

        // Fetch partnerships via teacher endpoint when school context and "en partenariat"
        if (formData.isPartnership && teacherProjectContext === 'school' && selectedSchoolId) {
          setIsLoadingPartnerships(true);
          try {
            const partnershipsResponse = await getTeacherSchoolPartnerships(selectedSchoolId, { status: 'confirmed' });
            setAvailablePartnerships(partnershipsResponse.data || []);
          } catch (error) {
            console.error('Error fetching teacher school partnerships:', error);
          } finally {
            setIsLoadingPartnerships(false);
          }
        }

        // Fetch co-responsibles options (school staff + community) when teacher selects school
        if (teacherProjectContext === 'school' && selectedSchoolId) {
          setIsLoadingCoResponsibles(true);
          try {
            const membersResponse = await getTeacherSchoolMembers(selectedSchoolId, { per_page: 500, exclude_me: true });
            setCoResponsibleOptions(membersResponse.data || []);
          } catch (error) {
            console.error('Error fetching teacher school members:', error);
            setCoResponsibleOptions([]);
          } finally {
            setIsLoadingCoResponsibles(false);
          }
        } else {
          setCoResponsibleOptions([]);
        }
      } else if (organizationId && organizationType) {
        // For non-teacher contexts (school, company), use existing logic
        // Fetch members
        setIsLoadingMembers(true);
        try {
          const membersData = await getOrganizationMembers(organizationId, organizationType);
          console.log('Members fetched:', membersData);
          
          // Ensure membersData is an array
          if (Array.isArray(membersData)) {
            setMembers(membersData);
            console.log(`Loaded ${membersData.length} members`);
          } else {
            console.error('Members data is not an array:', membersData);
            setMembers([]);
          }
        } catch (error: any) {
          console.error('Error fetching members:', error);
          console.error('Error details:', error.response?.data || error.message);
          setMembers([]); // Set empty array on error
        } finally {
          setIsLoadingMembers(false);
        }

        // Fetch partnerships if partnership checkbox is checked
        if (formData.isPartnership) {
          setIsLoadingPartnerships(true);
          try {
            const partnershipsResponse = await getPartnerships(organizationId, organizationType);
            setAvailablePartnerships(partnershipsResponse.data || []);
          } catch (error) {
            console.error('Error fetching partnerships:', error);
          } finally {
            setIsLoadingPartnerships(false);
          }
        }
      } else {
        console.warn('Cannot fetch members: missing organizationId or organizationType', {
          organizationId,
          organizationType,
          showingPageType: state.showingPageType,
          available_contexts: state.user.available_contexts
        });
      }
    };

    fetchMembersAndPartnerships();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.showingPageType, state.user.id, formData.isPartnership, teacherProjectContext, selectedSchoolId]); // Add teacherProjectContext and selectedSchoolId to dependencies

  // Participants for teacher: load all students from teacher's schools with infinite scroll
  useEffect(() => {
    if (state.showingPageType !== 'teacher') {
      setParticipantsOptions([]);
      setHasMoreParticipants(false);
      return;
    }
    let cancelled = false;
    const fetchPage1 = async () => {
      setIsLoadingParticipants(true);
      setParticipantsPage(1);
      try {
        const res = await getTeacherAllStudents({ page: 1, per_page: 20, search: searchTerms.participants });
        const data = res.data?.data ?? res.data ?? [];
        const list = Array.isArray(data) ? data : [];
        const meta = res.data?.meta;
        if (!cancelled) {
          setParticipantsOptions(list);
          setHasMoreParticipants(!!(meta && meta.total_pages > 1));
        }
      } catch (err) {
        if (!cancelled) setParticipantsOptions([]);
      } finally {
        if (!cancelled) setIsLoadingParticipants(false);
      }
    };
    fetchPage1();
    return () => { cancelled = true; };
  }, [state.showingPageType, searchTerms.participants]);

  const loadMoreParticipants = React.useCallback(async () => {
    if (state.showingPageType !== 'teacher' || !hasMoreParticipants || isLoadingParticipants) return;
    setIsLoadingParticipants(true);
    const nextPage = participantsPage + 1;
    try {
      const res = await getTeacherAllStudents({ page: nextPage, per_page: 20, search: searchTerms.participants });
      const data = res.data?.data ?? res.data ?? [];
      const list = Array.isArray(data) ? data : [];
      const meta = res.data?.meta;
      setParticipantsOptions(prev => [...prev, ...list]);
      setParticipantsPage(nextPage);
      setHasMoreParticipants(!!(meta && meta.total_pages > nextPage));
    } finally {
      setIsLoadingParticipants(false);
    }
  }, [state.showingPageType, hasMoreParticipants, isLoadingParticipants, participantsPage, searchTerms.participants]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    // Handle checkbox for isPartnership
    if (name === 'isPartnership') {
      const checked = (e.target as HTMLInputElement).checked;
      if (!checked) {
        const contactIds = partnershipContactMembers.map((c: any) => c.id.toString());
        setFormData(prev => ({
          ...prev,
          isPartnership: false,
          partners: [],
          coResponsibles: prev.coResponsibles.filter(id => !contactIds.includes(id.toString()))
        }));
        setPartnershipContactMembers([]);
      } else {
        setFormData(prev => ({
          ...prev,
          isPartnership: true,
          partners: prev.partners
        }));
      }
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setImagePreview(result);
        setFormData(prev => ({
          ...prev,
          image: result
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSchoolLevelToggle = (schoolLevelId: string) => {
    setFormData(prev => {
      const isAlreadySelected = prev.schoolLevelIds.includes(schoolLevelId);

      // Toggle selection of the organization (school level)
      const updatedSchoolLevelIds = isAlreadySelected
        ? prev.schoolLevelIds.filter(id => id !== schoolLevelId)
        : [...prev.schoolLevelIds, schoolLevelId];

      // When selecting (not unselecting), pré‑sélectionner les enseignants responsables et les participants de la classe
      if (!isAlreadySelected) {
        const selectedLevel = availableSchoolLevels.find(
          (level: any) => level.id?.toString() === schoolLevelId
        );

        const teacherIds =
          selectedLevel?.teachers?.map((t: any) => t.id?.toString()).filter(Boolean) || [];

        // Participants de la classe : membres dont classes ou level_school contient cette classe
        const memberIdsInClass = Array.isArray(members)
          ? members
              .filter((member: any) => {
                if (!member?.id) return false;
                const inClasses =
                  Array.isArray(member.classes) &&
                  member.classes.some((c: any) => c?.id?.toString() === schoolLevelId);
                const inLevelSchool =
                  Array.isArray(member.level_school) &&
                  member.level_school.some((l: any) => l?.id?.toString() === schoolLevelId);
                return inClasses || inLevelSchool;
              })
              .map((m: any) => m.id?.toString())
              .filter(Boolean)
          : [];

        const coResponsiblesSet = new Set(prev.coResponsibles);
        teacherIds.forEach((id: string) => coResponsiblesSet.add(id));

        const participantsSet = new Set(prev.participants);
        memberIdsInClass.forEach((id: string) => participantsSet.add(id));

        return {
          ...prev,
          schoolLevelIds: updatedSchoolLevelIds,
          coResponsibles: Array.from(coResponsiblesSet),
          participants: Array.from(participantsSet)
        };
      }

      // Quand la classe est désélectionnée, désélectionner les participants et co-responsables de cette classe
      if (isAlreadySelected) {
        const selectedLevel = availableSchoolLevels.find(
          (level: any) => level.id?.toString() === schoolLevelId
        );
        const teacherIds =
          selectedLevel?.teachers?.map((t: any) => t.id?.toString()).filter(Boolean) || [];

        const memberIdsInClass = Array.isArray(members)
          ? members
              .filter((member: any) => {
                if (!member?.id) return false;
                const inClasses =
                  Array.isArray(member.classes) &&
                  member.classes.some((c: any) => c?.id?.toString() === schoolLevelId);
                const inLevelSchool =
                  Array.isArray(member.level_school) &&
                  member.level_school.some((l: any) => l?.id?.toString() === schoolLevelId);
                return inClasses || inLevelSchool;
              })
              .map((m: any) => m.id?.toString())
              .filter(Boolean)
          : [];

        const coResponsiblesToRemove = new Set(teacherIds);
        const participantsToRemove = new Set(memberIdsInClass);

        const updatedCoResponsibles = prev.coResponsibles.filter(
          (id) => !coResponsiblesToRemove.has(id.toString())
        );
        const updatedParticipants = prev.participants.filter(
          (id) => !participantsToRemove.has(id.toString())
        );

        return {
          ...prev,
          schoolLevelIds: updatedSchoolLevelIds,
          coResponsibles: updatedCoResponsibles,
          participants: updatedParticipants
        };
      }

      return {
        ...prev,
        schoolLevelIds: updatedSchoolLevelIds
      };
    });
  };

  const submitProject = async (desiredStatus?: 'draft' | 'to_process' | 'coming' | 'in_progress' | 'ended') => {
    setSubmitError(null);

    const effectiveStatus: 'draft' | 'to_process' | 'coming' | 'in_progress' | 'ended' =
      desiredStatus ?? formData.status;

    // Mettre à jour le formulaire avec le statut effectif (ex. brouillon) pour que le select s'affiche correctement
    if (desiredStatus !== undefined) {
      setFormData(prev => ({ ...prev, status: effectiveStatus }));
    }

    // Validation: Pathway is required for all dashboards
    const isPathwayRequired = true;
    const isPathwayValid = !isPathwayRequired || formData.pathway;

    // For teachers, organization is always required (but pre-filled)
    // For others, organization is required
    const isOrganizationRequired = true; // Always required, but pre-filled for teachers

    // Skip strict validation for draft status
    if (effectiveStatus !== 'draft') {
      if (!formData.title || !formData.startDate || !formData.endDate || 
          (isOrganizationRequired && !formData.organization) || 
          !effectiveStatus || !isPathwayValid) {
        setSubmitError('Veuillez remplir tous les champs obligatoires');
        return;
      }

      // Additional validation for teachers: if school context chosen, school must be selected
      if (state.showingPageType === 'teacher' && teacherProjectContext === 'school') {
        const availableSchools = state.user.available_contexts?.schools || [];
        if (availableSchools.length === 0) {
          setSubmitError('Vous ne pouvez pas créer un projet pour une école car vous n\'avez aucune école avec un statut confirmé. Veuillez sélectionner "Enseignant Indépendant".');
          return;
        }
        if (!selectedSchoolId) {
          setSubmitError('Veuillez sélectionner une école');
          return;
        }
      }
    }

    setIsSubmitting(true);

    try {
      // Get context and organization ID
      const context = getContextFromPageType(state.showingPageType);
      // For teachers, use selectedSchoolId if school context chosen, otherwise undefined
      const organizationId = state.showingPageType === 'teacher' 
        ? getOrganizationId(state.user, state.showingPageType, teacherProjectContext === 'school' ? selectedSchoolId : undefined)
        : getOrganizationId(state.user, state.showingPageType);

      // Map frontend data to backend format with effective status (partnership_ids: array)
      const payload = mapFrontendToBackend(
        { ...formData, status: effectiveStatus },
        context,
        organizationId,
        state.tags,
        state.user.id
      );

      // Convert Base64 images to File objects
      let mainImageFile: File | null = null;
      const additionalImageFiles: File[] = [];

      if (imagePreview) {
        mainImageFile = base64ToFile(imagePreview, 'main-image.jpg');
      }

      additionalImagePreviews.forEach((preview, index) => {
        if (preview) {
          const file = base64ToFile(preview, `additional-image-${index + 1}.jpg`);
          if (file) {
            additionalImageFiles.push(file);
          }
        }
      });

      // Validate images
      const imageValidation = validateImages(mainImageFile, additionalImageFiles);
      if (!imageValidation.valid) {
        setSubmitError(imageValidation.errors.join(', '));
        setIsSubmitting(false);
        return;
      }

      // Validate documents (max 5, 1MB each)
      if (documentFiles.length > 5) {
        setSubmitError('Vous pouvez ajouter au maximum 5 documents');
        setIsSubmitting(false);
        return;
      }
      const tooLargeDoc = documentFiles.find((f) => f.size > 1024 * 1024);
      if (tooLargeDoc) {
        setSubmitError('Chaque document doit faire moins de 1Mo');
        setIsSubmitting(false);
        return;
      }

      // Call backend API
      const createdProject = await createProject(payload, mainImageFile, additionalImageFiles, documentFiles);

      console.log('Project created successfully:', createdProject);

      // Transform backend response to frontend format and add to local state
      const newProject = {
        id: createdProject.id.toString(),
        title: createdProject.title,
        description: createdProject.description,
        status: createdProject.status as 'to_process' | 'coming' | 'in_progress' | 'ended',
        visibility: payload.project.private ? 'private' : 'public' as 'public' | 'private',
        pathway: formData.pathway || 'citoyen',
        organization: formData.organization,
        owner: state.user.name,
        participants: createdProject.members_count,
        badges: 0,
        startDate: formData.startDate,
        endDate: formData.endDate,
        image: imagePreview || 'https://images.unsplash.com/photo-1551434678-e076c223a692?w=120&h=120&fit=crop&crop=center',
        additionalPhotos: additionalImagePreviews,
        tags: formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag),
        links: formData.links,
        progress: 0,
        members: formData.participants,
        events: [],
        badges_list: [],
        responsible: {
          id: state.user.id,
          name: state.user.name,
          avatar: state.user.avatar,
          profession: state.user.role,
          organization: formData.organization,
          email: state.user.email
        },
        coResponsibles: [],
        partner: formData.partners.length > 0 ? (() => {
          const p = availablePartnerships.find((x: any) => x.id?.toString() === formData.partners[0]);
          if (!p) return null;
          const firstOrg = p.partners?.[0];
          return { id: p.id.toString(), name: p.name || '', logo: firstOrg?.logo_url || '', organization: firstOrg?.name || '' };
        })() : null
      };

      // Add project to local state
      addProject(newProject);

      // Call onSave to notify parent component (will trigger refresh)
      // onSave expects Omit<Project, 'id'>, so we extract id from newProject
      const { id, ...projectDataWithoutId } = newProject;
      onSave(projectDataWithoutId);

      // Show success message
      setSuccessData({
        title: formData.title,
        image: imagePreview || 'https://images.unsplash.com/photo-1551434678-e076c223a692?w=120&h=120&fit=crop&crop=center'
      });
      setShowSuccess(true);

    } catch (error: any) {
      console.error('Error creating project:', error);

      // Handle backend errors
      if (error.response?.data?.details) {
        setSubmitError(error.response.data.details.join(', '));
      } else if (error.response?.data?.message) {
        setSubmitError(error.response.data.message);
      } else {
        setSubmitError('Une erreur est survenue lors de la création du projet. Veuillez réessayer.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await submitProject();
  };

  const handleSaveDraft = async () => {
    // Mettre à jour le formulaire tout de suite pour que le select Statut affiche "Brouillon"
    setFormData(prev => ({ ...prev, status: 'draft' }));
    await submitProject('draft');
  };

  const handleAdditionalImageChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        const newPreviews = [...additionalImagePreviews];
        newPreviews[index] = result;
        setAdditionalImagePreviews(newPreviews);

        const newImages = [...formData.additionalImages];
        newImages[index] = result;
        setFormData(prev => ({
          ...prev,
          additionalImages: newImages
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDocumentsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const combined = [...documentFiles, ...files];
    if (combined.length > 5) {
      setSubmitError('Vous pouvez ajouter au maximum 5 documents');
      // Reset input so user can re-select
      e.target.value = '';
      return;
    }

    const tooLarge = combined.find((f) => f.size > 1024 * 1024);
    if (tooLarge) {
      setSubmitError('Chaque document doit faire moins de 1Mo');
      e.target.value = '';
      return;
    }

    setDocumentFiles(combined);
    e.target.value = '';
  };

  const removeDocumentAtIndex = (index: number) => {
    setDocumentFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSearchChange = (field: string, value: string) => {
    setSearchTerms(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleMemberSelect = (field: string, memberId: string) => {
    if (field === 'coResponsibles') {
      const newCoResponsibles = formData.coResponsibles.includes(memberId)
        ? formData.coResponsibles.filter(id => id !== memberId)
        : [...formData.coResponsibles, memberId];
      setFormData(prev => ({ ...prev, coResponsibles: newCoResponsibles }));
    } else if (field === 'participants') {
      const newParticipants = formData.participants.includes(memberId)
        ? formData.participants.filter(id => id !== memberId)
        : [...formData.participants, memberId];
      setFormData(prev => ({ ...prev, participants: newParticipants }));
    }
  };

  const handlePartnerSelect = (partnerId: string | number) => {
    const idStr = partnerId?.toString();
    const partnership = availablePartnerships.find((p: any) => p.id?.toString() === idStr || p.id === Number(partnerId));
    const contactUsers = partnership
      ? (partnership.partners || []).flatMap((p: any) => (p.contact_users || []).map((c: any) => ({
          id: c.id,
          full_name: c.full_name || '',
          email: c.email || '',
          role: c.role || '',
          role_in_organization: c.role_in_organization || '',
          organization: p.name || ''
        })))
      : [];
    const contactIds = contactUsers.map((c: any) => c.id.toString());

    setFormData(prev => {
      const isAdding = !prev.partners.some((id) => id?.toString() === idStr);
      const newPartners = isAdding
        ? [...prev.partners, idStr]
        : prev.partners.filter(id => id?.toString() !== idStr);
      const newCoResponsibles = isAdding
        ? Array.from(new Set([...prev.coResponsibles, ...contactIds]))
        : prev.coResponsibles.filter(id => !contactIds.includes(id.toString()));
      return { ...prev, partners: newPartners, coResponsibles: newCoResponsibles };
    });

    setPartnershipContactMembers(prev => {
      const isAdding = !formData.partners.some((id) => id?.toString() === idStr);
      if (isAdding) {
        return [...prev, ...contactUsers];
      }
      const toRemoveIds = new Set(contactIds);
      return prev.filter((m: any) => !toRemoveIds.has(m.id?.toString()));
    });
  };

  const handlePartnerRemove = (partnerId: string) => {
    const partnership = availablePartnerships.find((p: any) => p.id?.toString() === partnerId || p.id === Number(partnerId));
    const contactIds = partnership
      ? (partnership.partners || []).flatMap((p: any) => (p.contact_users || []).map((c: any) => c.id.toString()))
      : [];
    setFormData(prev => ({
      ...prev,
      partners: prev.partners.filter(id => id !== partnerId),
      coResponsibles: prev.coResponsibles.filter(id => !contactIds.includes(id.toString()))
    }));
    setPartnershipContactMembers(prev => prev.filter((m: any) => !contactIds.includes(m.id?.toString())));
  };

  const getSelectedMember = (memberId: string) => {
    const id = memberId.toString();
    const byId = (m: any) => m?.id?.toString() === id || m?.id === parseInt(memberId, 10);
    return members.find(byId) ?? coResponsibleOptions.find(byId) ?? participantsOptions.find(byId) ?? partnershipContactMembers.find(byId) ?? null;
  };

  // Co-responsibles list: when teacher + school use coResponsibleOptions (staff only); else use members
  const getFilteredCoResponsibles = (searchTerm: string) => {
    const selectedIds = [
      ...formData.coResponsibles.map(id => id.toString()),
      ...formData.participants.map(id => id.toString())
    ];
    const currentUserId = state.user?.id?.toString();
    if (state.showingPageType === 'teacher' && teacherProjectContext === 'school' && selectedSchoolId) {
      let list = (coResponsibleOptions || []).filter((m: any) => {
        const id = m?.id?.toString();
        if (currentUserId && id === currentUserId) return false;
        if (selectedIds.includes(id)) return false;
        return true;
      });
      if (searchTerm.trim()) {
        const lower = searchTerm.toLowerCase();
        list = list.filter((m: any) =>
          (m.full_name || `${m.first_name || ''} ${m.last_name || ''}`).toLowerCase().includes(lower) ||
          (m.email || '').toLowerCase().includes(lower) ||
          (m.role || '').toLowerCase().includes(lower)
        );
      }
      return list;
    }
    const baseList = getFilteredMembers(searchTerm);
    if (state.showingPageType === 'edu') {
      return baseList.filter((m: any) => {
        const role = (m.role_in_system || m.role || '').toString().toLowerCase();
        return !STUDENT_SYSTEM_ROLES.includes(role);
      });
    }
    return baseList;
  };

  const getSelectedPartner = (partnerId: string) => {
    return availablePartnerships.find((p: any) => p.id === partnerId || p.id === parseInt(partnerId));
  };

  // Helper to determine if organization should be read-only
  const isOrgReadOnly = state.showingPageType === 'pro' || state.showingPageType === 'edu' || state.showingPageType === 'teacher';

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content project-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{project ? 'Modifier le projet' : 'Créer un nouveau projet'}</h2>
          <button className="modal-close" onClick={onClose}>
            <i className="fas fa-times"></i>
          </button>
        </div>

        <div className="modal-body">
          <form id="projectForm" onSubmit={handleSubmit} className="project-form">
            {/* Project Image Selection */}
            <div className="form-section">
              <h3>Image du projet</h3>
              <div className="avatar-selection">
                <div className="avatar-preview">
                  {imagePreview ? (
                    <img src={imagePreview} alt="Project preview" className="avatar-image" />
                  ) : (
                    <div className="avatar-placeholder">
                      <i className="fas fa-image"></i>
                      <span>Image par défaut</span>
                    </div>
                  )}
                </div>
                <div className="avatar-actions">
                  <button
                    type="button"
                    onClick={() => document.getElementById('projectImage')?.click()}
                    className="btn btn-outline btn-sm"
                  >
                    <i className="fas fa-upload"></i>
                    Choisir une image
                  </button>
                  <input
                    id="projectImage"
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    style={{ display: 'none' }}
                  />
                  <p className="avatar-note">
                    Si aucune image n'est sélectionnée, l'image par défaut sera utilisée
                  </p>
                </div>
              </div>
            </div>

            {/* Basic Project Info */}
            <div className="form-group">
              <label htmlFor="projectTitle">Titre du projet *</label>
              <input
                type="text"
                id="projectTitle"
                name="title"
                required
                placeholder="Ex: Atelier développement durable"
                value={formData.title}
                onChange={handleInputChange}
                className="form-input"
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="projectStartDate">Date estimée de début *</label>
                <input
                  type="date"
                  id="projectStartDate"
                  name="startDate"
                  required
                  value={formData.startDate}
                  onChange={handleInputChange}
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label htmlFor="projectEndDate">Date estimée de fin *</label>
                <input
                  type="date"
                  id="projectEndDate"
                  name="endDate"
                  required
                  value={formData.endDate}
                  onChange={handleInputChange}
                  className="form-input"
                />
              </div>
            </div>

            <div className="form-row">
              {/* Colonne 1 : Créer le projet en tant que (teacher) ou Organisation (non-teacher) */}
              <div className="form-group">
                {state.showingPageType === 'teacher' && !project && (
                  <div>
                    <label htmlFor="teacherProjectContext">Créer le projet en tant que *</label>
                    {(() => {
                      const availableSchools = state.user.available_contexts?.schools || [];
                      const hasSchools = availableSchools.length > 0;
                      return (
                        <>
                          <select
                            id="teacherProjectContext"
                            value={teacherProjectContext}
                            onChange={(e) => {
                              const newContext = e.target.value as 'independent' | 'school';
                              setTeacherProjectContext(newContext);
                              if (newContext === 'independent') {
                                setSelectedSchoolId(undefined);
                              } else if (newContext === 'school' && hasSchools) {
                                const sortedSchools = [...availableSchools].sort((a: any, b: any) =>
                                  (a.name || '').localeCompare(b.name || '')
                                );
                                setSelectedSchoolId(sortedSchools[0]?.id);
                              }
                            }}
                            className="form-select"
                            required
                          >
                            <option value="school" disabled={!hasSchools}>
                              École{!hasSchools ? ' (Aucune école disponible)' : ''}
                            </option>
                          </select>
                          {!hasSchools && teacherProjectContext === 'school' && (
                            <div style={{
                              marginTop: '8px',
                              padding: '8px',
                              backgroundColor: '#fff3cd',
                              border: '1px solid #ffc107',
                              borderRadius: '4px',
                              fontSize: '14px',
                              color: '#856404'
                            }}>
                              <strong>⚠️</strong> Vous n'avez aucune école avec un statut confirmé.
                              Veuillez sélectionner "Enseignant Indépendant" pour créer votre projet.
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>
                )}
                {state.showingPageType !== 'teacher' && (
                  <>
                    <label htmlFor="projectOrganization">Organisation *</label>
                    {isOrgReadOnly ? (
                      <input
                        type="text"
                        id="projectOrganization"
                        name="organization"
                        value={formData.organization}
                        readOnly
                        className="form-input"
                        style={{ backgroundColor: '#f3f4f6', cursor: 'not-allowed' }}
                      />
                    ) : (
                      <select
                        id="projectOrganization"
                        name="organization"
                        required
                        value={formData.organization}
                        onChange={handleInputChange}
                        className="form-select"
                      >
                        <option value="">Sélectionner une organisation</option>
                        {state.user.available_contexts?.companies?.map((c: any) => (
                          <option key={c.id} value={c.name}>{c.name}</option>
                        ))}
                        {state.user.available_contexts?.schools?.map((s: any) => (
                          <option key={s.id} value={s.name}>{s.name}</option>
                        ))}
                      </select>
                    )}
                  </>
                )}
              </div>
              {/* Colonne 2 : Sélectionner une école (teacher) ou Statut (non-teacher) */}
              <div className="form-group">
                {state.showingPageType === 'teacher' && !project && teacherProjectContext === 'school' && (() => {
                  const availableSchools = state.user.available_contexts?.schools || [];
                  const hasSchools = availableSchools.length > 0;
                  if (!hasSchools) return null;
                  return (
                    <div>
                      <label htmlFor="selectedSchool">Sélectionner une école *</label>
                      <select
                        id="selectedSchool"
                        value={selectedSchoolId || ''}
                        onChange={(e) => {
                          const schoolId = e.target.value ? parseInt(e.target.value) : undefined;
                          setSelectedSchoolId(schoolId);
                        }}
                        className="form-select"
                        required={teacherProjectContext === 'school'}
                      >
                        <option value="">Sélectionner une école</option>
                        {[...availableSchools].sort((a: any, b: any) =>
                          (a.name || '').localeCompare(b.name || '')
                        ).map((school: any) => (
                          <option key={school.id} value={school.id}>
                            {school.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  );
                })()}
                {state.showingPageType !== 'teacher' && (
                  <>
                    <label htmlFor="projectStatus">Statut *</label>
                    <select
                      id="projectStatus"
                      name="status"
                      required
                      value={formData.status}
                      onChange={handleInputChange}
                      className="form-select"
                    >
                      <option value="">Sélectionner un statut</option>
                      <option value="draft">Brouillon</option>
                      <option value="coming">À venir</option>
                      <option value="in_progress">En cours</option>
                      <option value="ended">Terminé</option>
                    </select>
                  </>
                )}
              </div>
            </div>
            {/* Statut pleine largeur pour teacher */}
            {state.showingPageType === 'teacher' && (
              <div className="form-row">
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label htmlFor="projectStatus">Statut *</label>
                  <select
                    id="projectStatus"
                    name="status"
                    required
                    value={formData.status}
                    onChange={handleInputChange}
                    className="form-select"
                  >
                    <option value="">Sélectionner un statut</option>
                    <option value="draft">Brouillon</option>
                    <option value="coming">À venir</option>
                    <option value="in_progress">En cours</option>
                    <option value="ended">Terminé</option>
                  </select>
                </div>
              </div>
            )}

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="projectVisibility">Visibilité *</label>
                <select
                  id="projectVisibility"
                  name="visibility"
                  required
                  value={formData.visibility}
                  onChange={handleInputChange}
                  className="form-select"
                >
                  <option value="public">Projet public</option>
                  <option value="private">Projet privé</option>
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="projectTags">Tags</label>
                <input
                  type="text"
                  id="projectTags"
                  name="tags"
                  placeholder="Ex: Fabrication, Créativité, Numérique"
                  value={formData.tags}
                  onChange={handleInputChange}
                  className="form-input"
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="projectPathway">Parcours *</label>
              {isLoadingPathways ? (
                <div className="loading-message" style={{ padding: '12px', textAlign: 'center', color: '#6b7280' }}>
                  <i className="fas fa-spinner fa-spin" style={{ marginRight: '8px' }}></i>
                  <span>Chargement des parcours...</span>
                </div>
              ) : (
                <select
                  id="projectPathway"
                  name="pathway"
                  required
                  value={formData.pathway}
                  onChange={handleInputChange}
                  className="form-select"
                >
                  <option value="">Sélectionner un parcours</option>
                  {availablePathways.map((pathway: any) => (
                    <option key={pathway.id} value={pathway.name}>
                      {pathway.name_fr || pathway.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Organisation porteuse */}
            {availableSchoolLevels.length > 0 && (
              <div className="form-group">
                <div className="form-label">Classes</div>
                {isLoadingSchoolLevels ? (
                  <div className="loading-message" style={{ padding: '12px', textAlign: 'center', color: '#6b7280' }}>
                    <i className="fas fa-spinner fa-spin" style={{ marginRight: '8px' }}></i>
                    <span>Chargement des classes...</span>
                  </div>
                ) : (
                  <div className="multi-select-container" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                    {availableSchoolLevels.map(classItem => (
                      <label 
                        key={classItem.id} 
                        className={`multi-select-item !flex items-center gap-2 ${formData.schoolLevelIds.includes(classItem.id.toString()) ? 'selected' : ''}`}
                      >
                        <input
                          type="checkbox"
                          checked={formData.schoolLevelIds.includes(classItem.id.toString())}
                          onChange={() => handleSchoolLevelToggle(classItem.id.toString())}
                        />
                        <div className="multi-select-checkmark">
                          <i className="fas fa-check"></i>
                        </div>
                        <span className="multi-select-label">{classItem.name} {classItem.level ? `- ${classItem.level}` : ''}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="form-group">
              <label htmlFor="projectLinks">Liens utiles</label>
              <input
                type="url"
                id="projectLinks"
                name="links"
                placeholder="https://exemple.com"
                value={formData.links}
                onChange={handleInputChange}
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label htmlFor="projectDescription">Description *</label>
              <textarea
                id="projectDescription"
                name="description"
                rows={4}
                placeholder="Description du projet..."
                value={formData.description}
                onChange={handleInputChange}
                className="form-textarea"
              />
            </div>

            {/* Partnership Section */}
            <div className="form-group">
              <div className="flex gap-2 items-center checkbox-group">
                <input
                  type="checkbox"
                  id="isPartnership"
                  name="isPartnership"
                  checked={formData.isPartnership}
                  onChange={handleInputChange}
                />
                <label htmlFor="isPartnership" className="pt-2 text-sm">Est-ce un partenariat ?</label>
              </div>
            </div>

            {/* Partenaire - Only visible if En partenariat is checked */}
            {formData.isPartnership && (
              <div className="form-group">
                <label htmlFor="projectPartner">Partenaire</label>
                <div className="compact-selection">
                  <div className="search-input-container">
                    <i className="fas fa-search search-icon"></i>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Rechercher un partenaire..."
                      value={searchTerms.partner}
                      onChange={(e) => handleSearchChange('partner', e.target.value)}
                    />
                  </div>
                  {formData.partners.length > 0 && (
                    <div className="selected-items">
                      {formData.partners.map((partnerId) => {
                        const selected = getSelectedPartner(partnerId);
                        if (!selected) return null;
                        
                        const partnerOrgs = selected.partners || [];
                        const firstPartner = partnerOrgs[0];
                        const roleInPartnership = firstPartner?.role_in_partnership;
                        
                        return (
                          <div key={partnerId} className="selected-member">
                            <AvatarImage 
                              src={firstPartner?.logo_url || '/default-avatar.png'} 
                              alt={firstPartner?.name || 'Partnership'} 
                              className="selected-avatar" 
                            />
                            <div className="selected-info">
                              <div className="selected-name">
                                {partnerOrgs.map((p: any) => p.name).join(', ')}
                              </div>
                              <div className="selected-role">{selected.name || ''}</div>
                              {roleInPartnership && (
                                <div className="selected-org" style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: '0.2rem' }}>
                                  Rôle dans le partenariat : {roleInPartnership}
                                </div>
                              )}
                            </div>
                            <button
                              type="button"
                              className="remove-selection"
                              onClick={() => handlePartnerRemove(partnerId)}
                            >
                              <i className="fas fa-times"></i>
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  <div className="selection-list">
                    {getFilteredPartners(searchTerms.partner).map((partnership) => {
                      const partnerOrgs = partnership.partners || [];
                      const firstPartner = partnerOrgs[0];
                      const roleInPartnership = firstPartner?.role_in_partnership;
                      
                      return (
                        <div
                          key={partnership.id}
                          className="selection-item"
                          onClick={() => handlePartnerSelect(partnership.id)}
                        >
                          <AvatarImage 
                            src={firstPartner?.logo_url || '/default-avatar.png'} 
                            alt={firstPartner?.name || 'Partnership'} 
                            className="item-avatar" 
                          />
                          <div className="item-info">
                            <div className="item-name">
                              {partnerOrgs.map((p: any) => p.name).join(', ')}
                            </div>
                            <div className="item-role">{partnership.name || ''}</div>
                            {roleInPartnership && (
                              <div className="item-org" style={{ fontSize: '0.8rem', color: '#6b7280' }}>Rôle dans le partenariat : {roleInPartnership}</div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Co-responsables */}
            <div className="form-group">
              <label htmlFor="projectCoResponsibles">Co-responsable(s)</label>
              <div className="compact-selection">
                <div className="search-input-container">
                  <i className="fas fa-search search-icon"></i>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Rechercher des co-responsables..."
                    value={searchTerms.coResponsibles}
                    onChange={(e) => handleSearchChange('coResponsibles', e.target.value)}
                    disabled={state.showingPageType === 'teacher' && teacherProjectContext === 'school' ? isLoadingCoResponsibles : isLoadingMembers}
                  />
                </div>
                
                {(state.showingPageType === 'teacher' && teacherProjectContext === 'school' ? isLoadingCoResponsibles : isLoadingMembers) ? (
                  <div className="loading-members" style={{ padding: '1rem', textAlign: 'center', color: '#6b7280' }}>
                    <i className="fas fa-spinner fa-spin" style={{ marginRight: '0.5rem' }}></i>
                    <span>Chargement des membres...</span>
                  </div>
                ) : (
                  <>
                    {formData.coResponsibles.length > 0 && (
                      <div className="selected-items">
                        {formData.coResponsibles.map((memberId) => {
                          const member = getSelectedMember(memberId);
                          const memberOrg = typeof member.organization === 'string' ? member.organization : (member.organization?.name ?? '');
                          return member ? (
                            <div key={memberId} className="selected-member">
                              <AvatarImage src={member.avatar_url || '/default-avatar.png'} alt={member.full_name || `${member.first_name || ''} ${member.last_name || ''}`.trim()} className="selected-avatar" />
                              <div className="selected-info">
                                <div className="selected-name">{member.full_name || `${member.first_name || ''} ${member.last_name || ''}`.trim()}</div>
                                <div className="selected-role">{translateRole(member.role_in_system ?? member.role ?? '')}</div>
                                
                                {memberOrg && (
                                  <div className="selected-org" style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: '0.2rem' }}>Organisation : {memberOrg}</div>
                                )}
                              </div>
                              <button
                                type="button"
                                className="remove-selection"
                                onClick={() => handleMemberSelect('coResponsibles', memberId)}
                              >
                                <i className="fas fa-times"></i>
                              </button>
                            </div>
                          ) : null;
                        })}
                      </div>
                    )}
                    <div className="selection-list">
                      {getFilteredCoResponsibles(searchTerms.coResponsibles).length === 0 ? (
                        <div className="no-members-message" style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>
                          <i className="fas fa-users" style={{ fontSize: '2rem', marginBottom: '0.5rem', display: 'block' }}></i>
                          <p>Aucun membre disponible</p>
                        </div>
                      ) : (
                        getFilteredCoResponsibles(searchTerms.coResponsibles).map((member: any) => (
                          <div
                            key={member.id}
                            className="selection-item"
                            onClick={() => handleMemberSelect('coResponsibles', member.id)}
                          >
                            <AvatarImage src={member.avatar_url || '/default-avatar.png'} alt={member.full_name || `${member.first_name} ${member.last_name}`} className="item-avatar" />
                            <div className="item-info">
                              <div className="item-name">{member.full_name || `${member.first_name} ${member.last_name}`}</div>
                              <div className="item-role">{translateRole(member.role_in_system ?? member.role)}</div>
                              {(typeof member.organization === 'string' ? member.organization : member.organization?.name) && (
                                <div className="item-org" style={{ fontSize: '0.8rem', color: '#6b7280' }}>Organisation : {typeof member.organization === 'string' ? member.organization : member.organization?.name}</div>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Participants */}
            <div className="form-group">
              <label htmlFor="projectParticipants">Participants</label>
              <div className="compact-selection">
                <div className="search-input-container">
                  <i className="fas fa-search search-icon"></i>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Rechercher des participants..."
                    value={searchTerms.participants}
                    onChange={(e) => handleSearchChange('participants', e.target.value)}
                    disabled={state.showingPageType === 'teacher' ? isLoadingParticipants : isLoadingMembers}
                  />
                </div>
                
                {(state.showingPageType === 'teacher' ? isLoadingParticipants && participantsOptions.length === 0 : isLoadingMembers) ? (
                  <div className="loading-members" style={{ padding: '1rem', textAlign: 'center', color: '#6b7280' }}>
                    <i className="fas fa-spinner fa-spin" style={{ marginRight: '0.5rem' }}></i>
                    <span>Chargement des participants...</span>
                  </div>
                ) : (
                  <>
                    {formData.participants.length > 0 && (
                      <div className="selected-items">
                        {formData.participants.map((memberId) => {
                          const member = getSelectedMember(memberId);
                          const schoolLabel = member?.schools?.length ? (member.schools as any[]).map((s: any) => s.name).join(', ') : null;
                          const memberOrg = typeof member?.organization === 'string' ? member?.organization : (member?.organization?.name ?? '') || schoolLabel || '';
                          return member ? (
                            <div key={memberId} className="selected-member">
                              <AvatarImage src={member.avatar_url || '/default-avatar.png'} alt={member.full_name || `${member.first_name} ${member.last_name}`} className="selected-avatar" />
                              <div className="selected-info">
                                <div className="selected-name">{member.full_name || `${member.first_name} ${member.last_name}`}</div>
                                <div className="selected-role">{translateRole(member.role ?? member.role_in_system ?? '')}</div>
                                {memberOrg && (
                                  <div className="selected-org" style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: '0.2rem' }}>Organisation : {memberOrg}</div>
                                )}
                              </div>
                              <button
                                type="button"
                                className="remove-selection"
                                onClick={() => handleMemberSelect('participants', memberId)}
                              >
                                <i className="fas fa-times"></i>
                              </button>
                            </div>
                          ) : null;
                        })}
                      </div>
                    )}
                    <div
                      className="selection-list"
                      ref={el => { participantsListRef.current = el; }}
                      style={state.showingPageType === 'teacher' ? { maxHeight: 280, overflowY: 'auto' } : undefined}
                      onScroll={state.showingPageType === 'teacher' ? (e) => {
                        const el = e.currentTarget;
                        if (!hasMoreParticipants || isLoadingParticipants) return;
                        if (el.scrollHeight - el.scrollTop <= el.clientHeight + 100) loadMoreParticipants();
                      } : undefined}
                    >
                      {state.showingPageType === 'teacher' ? (() => {
                        const selectedIds = new Set([
                          ...formData.participants.map(id => id.toString()),
                          ...formData.coResponsibles.map(id => id.toString())
                        ]);
                        const currentUserId = state.user?.id?.toString();
                        const available = (participantsOptions || []).filter((m: any) => {
                          const id = m?.id?.toString();
                          if (currentUserId && id === currentUserId) return false;
                          if (selectedIds.has(id)) return false;
                          return true;
                        });
                        if (available.length === 0 && !isLoadingParticipants) {
                          return (
                            <div className="no-members-message" style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>
                              <i className="fas fa-users" style={{ fontSize: '2rem', marginBottom: '0.5rem', display: 'block' }}></i>
                              <p>Aucun participant disponible</p>
                            </div>
                          );
                        }
                        return (
                          <>
                            {available.map((member: any) => {
                              const schoolLabel = member?.schools?.length ? (member.schools as any[]).map((s: any) => s.name).join(', ') : null;
                              const memberOrg = typeof member?.organization === 'string' ? member?.organization : (member?.organization?.name ?? '') || schoolLabel || '';
                              return (
                                <div
                                  key={member.id}
                                  className="selection-item"
                                  onClick={() => handleMemberSelect('participants', member.id)}
                                >
                                  <AvatarImage src={member.avatar_url || '/default-avatar.png'} alt={member.full_name || `${member.first_name} ${member.last_name}`} className="item-avatar" />
                                  <div className="item-info">
                                    <div className="item-name">{member.full_name || `${member.first_name} ${member.last_name}`}</div>
                                    <div className="item-role">{translateRole(member.role ?? member.role_in_system ?? '')}</div>
                                    {memberOrg && (
                                      <div className="item-org" style={{ fontSize: '0.8rem', color: '#6b7280' }}>Organisation : {memberOrg}</div>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                            {hasMoreParticipants && (
                              <div style={{ padding: '0.5rem', textAlign: 'center', color: '#6b7280' }}>
                                {isLoadingParticipants ? <i className="fas fa-spinner fa-spin" /> : <span>Faites défiler pour charger plus</span>}
                              </div>
                            )}
                          </>
                        );
                      })() : getFilteredMembers(searchTerms.participants).length === 0 ? (
                        <div className="no-members-message" style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>
                          <i className="fas fa-users" style={{ fontSize: '2rem', marginBottom: '0.5rem', display: 'block' }}></i>
                          <p>Aucun membre disponible</p>
                        </div>
                      ) : (
                        getFilteredMembers(searchTerms.participants).map((member: any) => {
                          const memberOrg = typeof member.organization === 'string' ? member.organization : (member.organization?.name ?? '');
                          return (
                            <div
                              key={member.id}
                              className="selection-item"
                              onClick={() => handleMemberSelect('participants', member.id)}
                            >
                              <AvatarImage src={member.avatar_url || '/default-avatar.png'} alt={member.full_name || `${member.first_name} ${member.last_name}`} className="item-avatar" />
                              <div className="item-info">
                                <div className="item-name">{member.full_name || `${member.first_name} ${member.last_name}`}</div>
                                <div className="item-role">{translateRole(member.role ?? member.role_in_system ?? '')}</div>
                                {memberOrg && (
                                  <div className="item-org" style={{ fontSize: '0.8rem', color: '#6b7280' }}>Organisation : {memberOrg}</div>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Photos supplémentaires */}
            <div className="form-group">
              <label>Photos supplémentaires (taille max 1mo)</label>
              <div className="additional-images-grid">
                {[0, 1, 2, 3].map((index) => (
                  <div key={index} className="additional-image-upload">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleAdditionalImageChange(e, index)}
                      style={{ display: 'none' }}
                      id={`additionalImage${index}`}
                    />
                    <label htmlFor={`additionalImage${index}`} className="additional-image-label">
                      {additionalImagePreviews[index] ? (
                        <img src={additionalImagePreviews[index]} alt={`Additional ${index + 1}`} className="additional-image-preview" />
                      ) : (
                        <div className="additional-image-placeholder">
                          <i className="fas fa-plus"></i>
                          <span>Ajouter une photo</span>
                        </div>
                      )}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* Documents */}
            <div className="form-group">
              <label>Documents (taille max 1Mo, 5 fichiers max)</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <input
                  id="projectDocumentsInput"
                  type="file"
                  multiple
                  onChange={handleDocumentsChange}
                  style={{ display: 'none' }}
                />
                <label
                  htmlFor="projectDocumentsInput"
                  className="btn btn-outline"
                  style={{ width: 'fit-content' }}
                >
                  Ajouter des documents
                </label>

                {documentFiles.length > 0 ? (
                  <ul style={{ margin: 0, paddingLeft: '1.25rem' }}>
                    {documentFiles.map((file, idx) => (
                      <li key={`${file.name}-${file.size}-${idx}`} style={{ marginBottom: '0.25rem' }}>
                        <span>{file.name} ({Math.ceil(file.size / 1024)} Ko)</span>
                        <button
                          type="button"
                          className="btn btn-link"
                          onClick={() => removeDocumentAtIndex(idx)}
                          style={{ marginLeft: '0.5rem', padding: 0 }}
                        >
                          Retirer
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p style={{ margin: 0, color: '#6b7280', fontSize: '0.95rem' }}>
                    Aucun document ajouté
                  </p>
                )}
              </div>
            </div>
          </form>
        </div>

        {/* Error Message */}
        {submitError && (
          <div className="modal-error" style={{ padding: '1rem', backgroundColor: '#fee', color: '#c00', borderRadius: '4px', margin: '1rem' }}>
            {submitError}
          </div>
        )}

        <div className="modal-footer">
          <button type="button" className="btn btn-outline" onClick={onClose} disabled={isSubmitting}>Annuler</button>
          <button
            type="button"
            className="btn btn-outline"
            onClick={handleSaveDraft}
            disabled={isSubmitting}
          >
            Sauvegarder en brouillon
          </button>
          <button type="submit" form="projectForm" className="btn btn-primary" disabled={isSubmitting}>
            {isSubmitting ? 'Création en cours...' : (project ? 'Modifier le projet' : 'Créer le projet')}
          </button>
        </div>
      </div>

      {/* Success Message */}
      {showSuccess && successData && (
        <div className="project-success-overlay" onClick={(e) => e.stopPropagation()}>
          <div className="project-success-modal" onClick={(e) => e.stopPropagation()}>
            <div className="project-success-content">
              <div className="project-success-icon">
                <i className="fas fa-check-circle"></i>
              </div>
              <div className="project-success-image">
                <img src={successData.image} alt={successData.title} />
              </div>
              <h3>Projet créé avec succès !</h3>
              <p>Le projet <strong>{successData.title}</strong> a été créé avec succès.</p>
              <button
                className="btn btn-primary"
                onClick={() => {
                  setShowSuccess(false);
                  onClose();
                }}
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectModal;