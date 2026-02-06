// ProjectManagement Component - Project Details and Management
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { getProjectBadges } from '../../api/Badges';
import apiClient from '../../api/config';
import { getProjectById } from '../../api/Project';
import { addProjectDocuments, addProjectMember, createProjectTeam, deleteProjectDocument, deleteProjectTeam, getProjectDocuments, getProjectMembers, getProjectPendingMembers, getProjectStats, getProjectTeams, joinProject, ProjectStats, removeProjectMember, updateProject, updateProjectMember, updateProjectTeam, getOrganizationMembers, getTeacherMembers, getPartnerships, getTags } from '../../api/Projects';
import { useAppContext } from '../../context/AppContext';
import { mockProjects } from '../../data/mockData';
import { useToast } from '../../hooks/useToast';
import { BadgeFile, Project } from '../../types';
import { getLocalBadgeImage } from '../../utils/badgeImages';
import { canUserAssignBadges } from '../../utils/badgePermissions';
import { base64ToFile, getUserProjectRole, mapApiProjectToFrontendProject, mapEditFormToBackend, validateImageFormat, validateImageSize, getOrganizationId, getOrganizationType } from '../../utils/projectMapper';
import { mapApiTeamToFrontendTeam, mapFrontendTeamToBackend } from '../../utils/teamMapper';
import AddParticipantModal from '../Modals/AddParticipantModal';
import BadgeAssignmentModal from '../Modals/BadgeAssignmentModal';
import AvatarImage, { DEFAULT_AVATAR_SRC } from '../UI/AvatarImage';
import DeletedUserDisplay from '../Common/DeletedUserDisplay';
import './MembershipRequests.css';
import './ProjectManagement.css';
import { isUserAdminOfProjectOrg, isUserProjectParticipant, isUserSuperadmin, isUserSuperadminOfProjectOrg } from '../../utils/projectPermissions';
import { getSelectedOrganizationId } from '../../utils/contextUtils';
import { jsPDF } from 'jspdf';
import { getSchoolLevels } from '../../api/SchoolDashboard/Levels';
import { getTeacherAllStudents, getTeacherClasses } from '../../api/Dashboard';
import { translateRole } from '../../utils/roleTranslations';

/** Safely render a value that may be a string or an object with id/name/type/city (e.g. organization from API). */
function toDisplayString(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && value !== null && 'name' in value && typeof (value as { name?: unknown }).name === 'string') {
    return (value as { name: string }).name;
  }
  // Avoid rendering arbitrary objects as [object Object]
  if (typeof value === 'object' && value !== null) return '';
  return String(value);
}

/** Slug pour la classe CSS des pathway-pill (accents normalisés, espaces -> _). */
function pathwaySlug(name: string): string {
  const accented = 'àâäéèêëïîôùûüçæœ';
  const plain = 'aaaeeeeiioouucaeoe';
  let s = String(name ?? '').toLowerCase().trim();
  for (let i = 0; i < accented.length; i++) {
    s = s.replace(new RegExp(accented[i], 'g'), plain[i]);
  }
  s = s.replace(/[^a-z0-9\s_]/g, '');
  return s.replace(/\s+/g, '_') || 'other';
}

/** Converts API availability (object or array) to an array of day labels for display. */
function normalizeAvailabilityToLabels(availability: any): string[] {
  if (Array.isArray(availability)) return availability;
  if (!availability || typeof availability !== 'object') return [];
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
    if (availability[key]) acc.push(label);
    return acc;
  }, []);
  if (availability.available && labels.length === 0) labels.push('Disponible');
  return labels;
}

// Component for displaying skills with "Voir plus"/"Voir moins" functionality
const ParticipantSkillsList: React.FC<{ skills: string[] }> = ({ skills }) => {
  const [showAll, setShowAll] = React.useState(false);
  const maxVisible = 3;

  // Only render if skills exist
  if (!skills || skills.length === 0) {
    return null;
  }

  const hasMore = skills.length > maxVisible;
  const visibleSkills = showAll ? skills : skills.slice(0, maxVisible);

  return (
    <div className="request-skills">
      <h4>Compétences</h4>
      <div className="skills-list">
        {visibleSkills.map((skill: string, index: number) => (
          <span key={index} className="skill-pill">{skill}</span>
        ))}
      </div>
      {hasMore && (
        <button
          type="button"
          className="toggle-list-btn"
          onClick={() => setShowAll(!showAll)}
        >
          {showAll ? 'Voir moins' : `Voir plus (${skills.length - maxVisible} autres)`}
        </button>
      )}
    </div>
  );
};

// Component for displaying availability with "Voir plus"/"Voir moins" functionality
const ParticipantAvailabilityList: React.FC<{ availability: string[] }> = ({ availability }) => {
  const [showAll, setShowAll] = React.useState(false);
  const maxVisible = 3;

  // Only render if availability exists
  if (!availability || availability.length === 0) {
    return null;
  }

  const hasMore = availability.length > maxVisible;
  const visibleAvailability = showAll ? availability : availability.slice(0, maxVisible);

  return (
    <div className="request-availability">
      <h4>Disponibilités</h4>
      <div className="availability-list">
        {visibleAvailability.map((day: string, index: number) => (
          <span key={index} className="availability-pill">{day}</span>
        ))}
      </div>
      {hasMore && (
        <button
          type="button"
          className="toggle-list-btn"
          onClick={() => setShowAll(!showAll)}
        >
          {showAll ? 'Voir moins' : `Voir plus (${availability.length - maxVisible} autres)`}
        </button>
      )}
    </div>
  );
};

const ProjectManagement: React.FC = () => {
  const { state, setCurrentPage, setSelectedProject, setTags } = useAppContext();
  const { showWarning } = useToast();

  // Charger les tags (parcours) depuis l'API /api/v1/tags pour la modal d'édition
  useEffect(() => {
    if (state.tags?.length > 0) return;
    getTags()
      .then((data) => {
        const list = Array.isArray(data) ? data : (data as any)?.data ?? [];
        setTags(Array.isArray(list) ? list : []);
      })
      .catch(() => setTags([]));
  }, [state.tags?.length, setTags]);
  const { showSuccess, showError } = useToast();
  const [activeTab, setActiveTab] = useState('overview');
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    tags: [] as string[],
    startDate: '',
    endDate: '',
    pathways: [] as string[],
    status: 'coming' as 'draft' | 'to_process' | 'coming' | 'in_progress' | 'ended',
    visibility: 'public' as 'public' | 'private',
    isPartnership: false,
    coResponsibles: [] as string[],
    partners: [] as string[],
    // MLDS fields
    mldsRequestedBy: 'departement',
    mldsDepartment: '',
    mldsTargetAudience: 'students_without_solution',
    mldsActionObjectives: [] as string[],
    mldsActionObjectivesOther: '',
    mldsObjectives: '',
    mldsCompetenciesDeveloped: '',
    mldsExpectedParticipants: '',
    mldsFinancialHSE: '',
    mldsFinancialHV: '',
    mldsFinancialTransport: '',
    mldsFinancialOperating: '',
    mldsFinancialService: '',
    mldsOrganizationNames: [] as string[],
    mldsSchoolLevelIds: [] as string[] // IDs of school levels
  });
  const [editImagePreview, setEditImagePreview] = useState<string>('');
  const [availableSchoolLevels, setAvailableSchoolLevels] = useState<any[]>([]);
  const [isLoadingSchoolLevels, setIsLoadingSchoolLevels] = useState(false);
  const [editAvailableMembers, setEditAvailableMembers] = useState<any[]>([]);
  const [editAvailablePartnerships, setEditAvailablePartnerships] = useState<any[]>([]);
  const [editPartnershipContactMembers, setEditPartnershipContactMembers] = useState<any[]>([]);
  const [isLoadingEditMembers, setIsLoadingEditMembers] = useState(false);
  const [departments, setDepartments] = useState<Array<{ code: string; nom: string }>>([]);
  const [isLoadingDepartments, setIsLoadingDepartments] = useState(false);
  const [editSearchTerms, setEditSearchTerms] = useState({
    coResponsibles: '',
    partner: ''
  });
  const [isAddParticipantModalOpen, setIsAddParticipantModalOpen] = useState(false);
  const [isBadgeModalOpen, setIsBadgeModalOpen] = useState(false);
  const [selectedParticipantForBadge, setSelectedParticipantForBadge] = useState<string | null>(null);
  const [collapsedComments, setCollapsedComments] = useState<Set<string>>(new Set());

  // Badge filters
  const [badgeSeriesFilter, setBadgeSeriesFilter] = useState('');
  const [badgeLevelFilter, setBadgeLevelFilter] = useState('');
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_badgeDomainFilter, setBadgeDomainFilter] = useState(''); // Set but not used in UI - kept for future use
  const [projectBadges, setProjectBadges] = useState<any[]>([]);
  const [isLoadingProjectBadges, setIsLoadingProjectBadges] = useState(false);
  const [projectBadgesError, setProjectBadgesError] = useState<string | null>(null);
  const [badgePage, setBadgePage] = useState(1);
  const [badgeTotalPages, setBadgeTotalPages] = useState(1);
  const [badgeTotalCount, setBadgeTotalCount] = useState(0);

  // Project documents (admin only)
  const [projectDocuments, setProjectDocuments] = useState<any[]>([]);
  const [isLoadingProjectDocuments, setIsLoadingProjectDocuments] = useState(false);
  const [projectDocumentsError, setProjectDocumentsError] = useState<string | null>(null);
  const documentsInputRef = useRef<HTMLInputElement | null>(null);

  // Team management state
  const [teams, setTeams] = useState<any[]>([]);
  const [isLoadingTeams, setIsLoadingTeams] = useState(false);
  const [isCreateTeamModalOpen, setIsCreateTeamModalOpen] = useState(false);
  const [isEditTeamModalOpen, setIsEditTeamModalOpen] = useState(false);
  const [isViewTeamModalOpen, setIsViewTeamModalOpen] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<any>(null);
  const [newTeamForm, setNewTeamForm] = useState({
    name: '',
    description: '',
    chiefId: '',
    selectedMembers: [] as string[]
  });
  const [memberSearchTerm, setMemberSearchTerm] = useState('');

  // Kanban tasks state
  const [tasks, setTasks] = useState([
    {
      id: '1',
      title: 'Conception de la maquette',
      description: 'Créer les wireframes et maquettes pour l\'interface utilisateur',
      status: 'todo',
      assigneeType: 'team',
      assigneeId: '1',
      assigneeName: 'Équipe Marketing',
      startDate: '2024-01-15',
      dueDate: '2024-01-25',
      priority: 'high',
      createdAt: '2024-01-10',
      createdBy: 'Sophie Martin'
    },
    {
      id: '2',
      title: 'Développement frontend',
      description: 'Implémenter l\'interface utilisateur avec React',
      status: 'in-progress',
      assigneeType: 'individual',
      assigneeId: '3',
      assigneeName: 'Lucas Bernard',
      startDate: '2024-01-20',
      dueDate: '2024-02-05',
      priority: 'medium',
      createdAt: '2024-01-12',
      createdBy: 'Sophie Martin'
    }
  ]);

  const [isCreateTaskModalOpen, setIsCreateTaskModalOpen] = useState(false);
  const [isEditTaskModalOpen, setIsEditTaskModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [newTaskForm, setNewTaskForm] = useState({
    title: '',
    description: '',
    assigneeType: 'individual',
    assigneeId: '',
    startDate: '',
    dueDate: '',
    priority: 'medium'
  });

  // State for project data (fetched from API)
  const [project, setProject] = useState<Project>(state.selectedProject || mockProjects[0]);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_isLoadingProject, setIsLoadingProject] = useState(false); // Set but not used in UI
  const [apiProjectData, setApiProjectData] = useState<any>(null);

  // Check if project has MLDS information
  const isMLDSProject = apiProjectData?.mlds_information != null;

  // Check if project is ended - disable all actions if true
  const isProjectEnded = project?.status === 'ended';

  // State for project statistics
  const [projectStats, setProjectStats] = useState<ProjectStats | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(false);

  // State for user project role and join / close functionality
  const [userProjectRole, setUserProjectRole] = useState<string | null>(null);
  const [isJoiningProject, setIsJoiningProject] = useState(false);
  const [isClosingProject, setIsClosingProject] = useState(false);
  const [isCloseProjectModalOpen, setIsCloseProjectModalOpen] = useState(false);

  // State for badge assignment permissions
  const [canAssignBadges, setCanAssignBadges] = useState(false);
  const [userProjectMember, setUserProjectMember] = useState<any>(null);

  // Fetch project data from API when component mounts or project ID changes
  useEffect(() => {
    const fetchProjectData = async () => {
      const selectedProject = state.selectedProject;

      // Only fetch if we have a project with an ID
      if (!selectedProject || !selectedProject.id) {
        return;
      }

      setIsLoadingProject(true);
      try {
        const projectId = parseInt(selectedProject.id);
        if (isNaN(projectId)) {
          console.warn('Invalid project ID:', selectedProject.id);
          setIsLoadingProject(false);
          return;
        }

        const response = await getProjectById(projectId);
        const apiProject = response.data;

        // Store raw API data for permission checks
        setApiProjectData(apiProject);

        // Debug: Log organization info from API
        console.log('🔍 [ProjectManagement] API Project primary_organization_name:', apiProject.primary_organization_name);
        const selectedOrgId = getSelectedOrganizationId(state.user, state.showingPageType);
        const selectedOrg = state.showingPageType === 'edu'
          ? state.user?.available_contexts?.schools?.find((s: any) => s.id === selectedOrgId)
          : state.showingPageType === 'pro'
            ? state.user?.available_contexts?.companies?.find((c: any) => c.id === selectedOrgId)
            : null;
        console.log('🔍 [ProjectManagement] Current user organization:', selectedOrg?.name || 'N/A');

        // Determine user's role in the project
        const role = getUserProjectRole(apiProject, state.user?.id?.toString());
        setUserProjectRole(role);

        // Debug: Log co-owners from API
        console.log('API Project co_owners:', apiProject.co_owners);
        console.log('API Project co_owners count:', apiProject.co_owners?.length || 0);

        // Map API data to frontend format
        const mappedProject = mapApiProjectToFrontendProject(apiProject, state.showingPageType, state.user);

        // Debug: Log mapped project organization info
        console.log('🔍 [ProjectManagement] Mapped project.organization:', mappedProject.organization);
        console.log('🔍 [ProjectManagement] Mapped project.responsible?.organization:', mappedProject.responsible?.organization);

        // Debug: Log mapped co-responsibles
        console.log('Mapped project coResponsibles:', mappedProject.coResponsibles);
        console.log('Mapped project coResponsibles count:', mappedProject.coResponsibles?.length || 0);

        // Update project state
        setProject(mappedProject);

        // Also update context to keep it in sync (only if the ID is different to avoid loops)
        if (state.selectedProject?.id !== mappedProject.id) {
          setSelectedProject(mappedProject);
        }
      } catch (error) {
        console.error('Error fetching project data:', error);
        // Reset API data on error to hide edit button
        setApiProjectData(null);
        // Keep using the project from context if API call fails
      } finally {
        setIsLoadingProject(false);
      }
    };

    fetchProjectData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.selectedProject?.id, state.showingPageType]); // Retirer setSelectedProject des dépendances

  // Fetch project statistics when project ID changes
  useEffect(() => {
    const fetchStats = async () => {
      if (!project?.id) return;

      setIsLoadingStats(true);
      try {
        const projectId = parseInt(project.id);
        if (!isNaN(projectId)) {
          const stats = await getProjectStats(projectId);
          setProjectStats(stats);
        }
      } catch (error) {
        console.error('Error fetching project stats:', error);
        setProjectStats(null);
      } finally {
        setIsLoadingStats(false);
      }
    };

    fetchStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project?.id]); // project?.id est une valeur primitive, pas besoin d'autres dépendances

  // Fetch pending requests when project ID changes or requests tab is active
  useEffect(() => {
    const fetchRequests = async () => {
      if (!project?.id || activeTab !== 'requests') return;

      setIsLoadingRequests(true);
      try {
        const projectId = parseInt(project.id);
        if (!isNaN(projectId)) {
          const pendingMembers = await getProjectPendingMembers(projectId);

          // Map API data to UI format
          const mappedRequests = pendingMembers.map((member: any) => ({
            id: member.id?.toString() || member.user_id?.toString(),
            memberId: member.user_id?.toString() || member.user?.id?.toString(),
            name: member.user?.full_name || `${member.user?.first_name || ''} ${member.user?.last_name || ''}`.trim() || 'Inconnu',
            profession: member.user?.job || 'Non renseigné',
            email: member.user?.email || '',
            avatar: member.user?.avatar_url || DEFAULT_AVATAR_SRC,
            skills: member.user?.skills?.map((s: any) => s.name || s) || [],
            availability: normalizeAvailabilityToLabels(member.user?.availability),
            requestDate: member.created_at ? new Date(member.created_at).toLocaleDateString('fr-FR') : '',
            organization: typeof member.user?.organization === 'string' ? member.user.organization : (member.user?.organization?.name ?? '') || 'Non renseigné',
            userRole: member.user?.role ?? '',
            school_level_name: typeof member.user?.school_level === 'object' && member.user?.school_level?.name
              ? member.user.school_level.name
              : ''
          }));

          setRequests(mappedRequests);
        }
      } catch (error) {
        console.error('Error fetching requests:', error);
        setRequests([]);
      } finally {
        setIsLoadingRequests(false);
      }
    };

    fetchRequests();
  }, [project?.id, activeTab]);

  // Load real project members when apiProjectData changes
  // Completely ref-based approach to prevent infinite loops
  useEffect(() => {
    // Early return guards
    if (!apiProjectData || !project?.id) {
      return;
    }

    // Get current ID values (convert to string for stable comparison)
    const currentProjectId = String(project.id);
    const currentApiProjectId = String(apiProjectData?.id || 'null');

    // Create stable key for this project/apiProject combination
    const combinedKey = `${currentProjectId}-${currentApiProjectId}`;

    // CRITICAL: Check if we already loaded for this exact combination
    // This is the primary guard against infinite loops
    if (lastLoadedProjectIdRef.current === combinedKey) {
      console.log('[loadParticipants] SKIP: Already loaded for', combinedKey);
      return;
    }

    // Guard: Don't start if already loading (use ref to avoid re-render)
    if (isLoadingRef.current) {
      console.log('[loadParticipants] SKIP: Already loading');
      return;
    }

    console.log('[loadParticipants] STARTING load for', combinedKey, {
      previousKey: lastLoadedProjectIdRef.current,
      isLoading: isLoadingRef.current
    });

    // Mark as loading and set the key IMMEDIATELY to prevent concurrent calls
    // This must happen synchronously before any async operations
    lastLoadedProjectIdRef.current = combinedKey;
    previousIdsRef.current = {
      projectId: currentProjectId,
      apiProjectId: currentApiProjectId
    };
    isLoadingRef.current = true;
    setIsLoadingParticipants(true);

    let isCancelled = false;

    const loadParticipants = async () => {
      try {
        console.log('[loadParticipants] Fetching members for', combinedKey);
        const members = await fetchAllProjectMembers();
        console.log('[loadParticipants] Fetched', members.length, 'members for', combinedKey);
        // Only update state if not cancelled and still loading for this key
        if (!isCancelled && lastLoadedProjectIdRef.current === combinedKey) {
          setParticipants(members);
          console.log('[loadParticipants] Updated participants state');
        } else {
          console.log('[loadParticipants] SKIP state update: cancelled or key changed', {
            isCancelled,
            currentKey: lastLoadedProjectIdRef.current,
            expectedKey: combinedKey
          });
        }
      } catch (error) {
        if (!isCancelled) {
          console.error('[loadParticipants] Error loading participants:', error);
          showError('Erreur lors du chargement des participants');
          // Reset refs on error to allow retry
          if (lastLoadedProjectIdRef.current === combinedKey) {
            lastLoadedProjectIdRef.current = null;
            previousIdsRef.current = { projectId: null, apiProjectId: null };
          }
        }
      } finally {
        // Only reset loading if not cancelled and still on the same key
        if (!isCancelled && lastLoadedProjectIdRef.current === combinedKey) {
          isLoadingRef.current = false;
          setIsLoadingParticipants(false);
          console.log('[loadParticipants] COMPLETED for', combinedKey);
        } else {
          console.log('[loadParticipants] SKIP reset: cancelled or key changed');
        }
      }
    };

    loadParticipants();

    // Cleanup function to cancel if effect runs again before completion
    return () => {
      console.log('[loadParticipants] CLEANUP: Cancelling load for', combinedKey);
      isCancelled = true;
      // Don't reset refs here - let the new effect run handle it
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiProjectData?.id, project?.id]); // Depend directly on ID values - fetchAllProjectMembers and showError are stable

  // Fetch project badges when project changes
  // Fetch badges when page or filters change
  useEffect(() => {
    if (project?.id) {
      fetchProjectBadgesData(badgePage);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [badgePage, badgeSeriesFilter, badgeLevelFilter]);

  // Fetch project documents when Documents tab is opened (admin only)
  useEffect(() => {
    if (activeTab === 'documents' && project?.id && shouldShowTabs()) {
      fetchProjectDocuments();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, project?.id]);

  // Calculate badge assignment permissions
  useEffect(() => {
    if (!project || !state.user?.id || !userProjectRole) {
      setCanAssignBadges(false);
      return;
    }

    // Find current user's project member record
    const findUserProjectMember = async () => {
      if (!project?.id) return;

      try {
        const projectId = parseInt(project.id);
        if (isNaN(projectId)) return;

        const members = await getProjectMembers(projectId);
        const currentUserMember = members.find((m: any) => {
          const userId = m.user?.id?.toString() || m.user_id?.toString();
          return userId === state.user?.id?.toString();
        });

        if (currentUserMember) {
          // Only update if the value actually changed to prevent loops
          const newUserProjectMember = {
            can_assign_badges_in_project: currentUserMember.can_assign_badges_in_project || false,
            user: {
              available_contexts: state.user.available_contexts
            }
          };

          // Check if we need to update (prevent unnecessary state updates)
          const needsUpdate = !userProjectMember ||
            userProjectMember.can_assign_badges_in_project !== newUserProjectMember.can_assign_badges_in_project ||
            JSON.stringify(userProjectMember.user?.available_contexts) !== JSON.stringify(newUserProjectMember.user?.available_contexts);

          if (needsUpdate) {
            setUserProjectMember(newUserProjectMember);
          }
        }
      } catch (error) {
        console.error('Error fetching user project member:', error);
      }
    };

    findUserProjectMember();

    // Calculate permissions (use current userProjectMember state, but don't depend on it)
    const hasPermission = canUserAssignBadges(
      project,
      state.user.id,
      userProjectRole,
      userProjectMember
    );

    setCanAssignBadges(hasPermission);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project?.id, state.user?.id, userProjectRole]); // Removed userProjectMember from dependencies to prevent loop

  // Reset active tab if tabs become hidden (e.g., user role changes from admin to participant)
  useEffect(() => {
    if (!shouldShowTabs() && activeTab !== 'overview') {
      setActiveTab('overview');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userProjectRole, state.showingPageType, activeTab]);

  // Fetch teams when project changes and user can see tabs
  useEffect(() => {
    if (project?.id && shouldShowTabs()) {
      fetchProjectTeams();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project?.id]);

  // Fetch departments from API
  useEffect(() => {
    const fetchDepartments = async () => {
      setIsLoadingDepartments(true);
      try {
        const response = await fetch('https://geo.api.gouv.fr/departements');
        if (response.ok) {
          const data = await response.json();
          // Sort departments by name
          const sortedData = data.sort((a: { nom: string }, b: { nom: string }) =>
            a.nom.localeCompare(b.nom)
          );
          setDepartments(sortedData);
        } else {
          console.error('Error fetching departments:', response.statusText);
          setDepartments([]);
        }
      } catch (err) {
        console.error('Error fetching departments:', err);
        setDepartments([]);
      } finally {
        setIsLoadingDepartments(false);
      }
    };

    fetchDepartments();
  }, []);

  // State for requests (pending project join requests)
  const [requests, setRequests] = useState<any[]>([]);
  const [isLoadingRequests, setIsLoadingRequests] = useState(false);

  // State for available members (for adding participants)
  const [availableMembers, setAvailableMembers] = useState<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_isLoadingAvailableMembers, setIsLoadingAvailableMembers] = useState(false); // Set but not used in UI

  // State for participants with extended type
  const [participants, setParticipants] = useState<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_isLoadingParticipants, setIsLoadingParticipants] = useState(false); // Set but not used in UI
  const lastLoadedProjectIdRef = useRef<string | null>(null);
  const previousIdsRef = useRef<{ projectId: string | null; apiProjectId: string | null }>({ projectId: null, apiProjectId: null });
  const isLoadingRef = useRef<boolean>(false); // Use ref to prevent re-render triggers

  const getStatusText = (status: string) => {
    switch (status) {
      case 'draft': return 'Brouillon';
      case 'to_process': return 'À traiter';
      case 'coming': return 'À venir';
      case 'in_progress': return 'En cours';
      case 'ended': return 'Terminé';
      default: return status;
    }
  };

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'draft': return 'draft';
      case 'to_process': return 'to-process';
      case 'coming': return 'coming';
      case 'in_progress': return 'in-progress';
      case 'ended': return 'ended';
      default: return 'coming';
    }
  };

  /**
   * Open the close-project confirmation modal.
   */
  const openCloseProjectModal = () => {
    if (!project?.id || project.status !== 'in_progress') return;
    if (userProjectRole !== 'owner') {
      showError('Seul le responsable du projet peut le clôturer.');
      return;
    }
    setIsCloseProjectModalOpen(true);
  };

  /**
   * Close the project: set status to "ended" (called after user confirms in modal).
   */
  const confirmCloseProject = async () => {
    if (!project?.id) return;
    setIsClosingProject(true);
    try {
      const projectId = parseInt(project.id);
      if (Number.isNaN(projectId)) {
        showError('ID de projet invalide');
        setIsCloseProjectModalOpen(false);
        return;
      }

      const payload = {
        project: {
          status: 'ended' as const
        }
      };

      await updateProject(projectId, payload as any, null, []);

      const response = await getProjectById(projectId);
      const apiProject = response.data;
      const mappedProject = mapApiProjectToFrontendProject(apiProject, state.showingPageType, state.user);

      setProject(mappedProject);
      setSelectedProject(mappedProject);
      setApiProjectData(apiProject);
      setIsCloseProjectModalOpen(false);
    } catch (error: any) {
      console.error('Error closing project:', error);
      if (error?.response?.status === 403) {
        showError('Vous n’êtes pas autorisé à clôturer ce projet.');
      } else {
        showError('Une erreur est survenue lors de la clôture du projet.');
      }
    } finally {
      setIsClosingProject(false);
    }
  };

  // Utility function to calculate days remaining until project end date
  const calculateDaysRemaining = (endDate: string): number => {
    if (!endDate) return 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Parse endDate (format: YYYY-MM-DD or ISO string)
    const end = new Date(endDate);
    end.setHours(0, 0, 0, 0);

    const diffTime = end.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return diffDays;
  };

  // Get status text and CSS class for days remaining
  const getDaysRemainingStatus = (daysRemaining: number): { text: string; className: string } => {
    if (daysRemaining > 0) {
      return { text: 'Dans les délais', className: 'positive' };
    } else if (daysRemaining === 0) {
      return { text: 'Dernier jour', className: 'warning' };
    } else {
      return { text: 'Délais dépassés', className: 'negative' };
    }
  };

  // Calculate number of new members added this month
  const calculateNewMembersThisMonth = (apiProjectData: any): number => {
    if (!apiProjectData?.project_members) return 0;

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    return apiProjectData.project_members.filter((member: any) => {
      if (!member.created_at) return false;
      const memberCreatedAt = new Date(member.created_at);
      return memberCreatedAt >= startOfMonth;
    }).length;
  };

  // Map user role to display text
  const getRoleDisplayText = (role: string | null): string => {
    switch (role) {
      case 'owner': return 'Propriétaire';
      case 'co-owner': return 'Co-propriétaire';
      case 'admin': return 'Admin';
      case 'participant avec droit de badges': return 'Participant avec droit de badges';
      case 'participant': return 'Participant';
      default: return '';
    }
  };

  // Handler for joining a project
  const handleJoinProject = async () => {
    if (!project?.id) return;

    setIsJoiningProject(true);
    try {
      const projectId = parseInt(project.id);
      await joinProject(projectId);

      // Show success notification
      showSuccess('Votre demande de rejoindre le projet a été faite');

      // Reload project data to update status
      const response = await getProjectById(projectId);
      const apiProject = response.data;
      const role = getUserProjectRole(apiProject, state.user?.id?.toString());
      setUserProjectRole(role);

      // Update apiProjectData to reflect the change
      setApiProjectData(apiProject);
    } catch (error: any) {
      console.error('Error joining project:', error);
      const errorMessage = error.response?.data?.message || 'Erreur lors de la demande de rejoindre le projet';
      showError(errorMessage);
    } finally {
      setIsJoiningProject(false);
    }
  };

  /**
   * Check if user can join the project
   * Returns true if user is not a participant and doesn't have admin access
   */
  const canUserJoinProject = (): boolean => {
    if (!apiProjectData || !state.user?.id) return false;

    // Check if user is already a participant
    if (isUserProjectParticipant(apiProjectData, state.user.id.toString())) {
      return false;
    }

    // Check if user has admin access (owner/co-owner/admin or org admin)
    if (shouldShowTabs()) {
      return false;
    }

    // User can join if they're not a participant and don't have admin access
    return true;
  };

  /**
   * Superadmin de l'organisation du projet qui n'est pas dans le projet : voir tous les onglets et participants en lecture seule, boutons d'actions cachés.
   * Un superadmin d'une autre organisation ne bénéficie pas de cette vue.
   */
  const isSuperadminViewingReadOnly =
    apiProjectData != null &&
    state.user?.id != null &&
    isUserSuperadminOfProjectOrg(apiProjectData, state.user) &&
    !isUserProjectParticipant(apiProjectData, state.user.id.toString());

  /**
   * Determine if tabs should be shown based on user type and role
   * Personal users (teacher/user) can only see tabs if they are admin/co-owner/owner
   * Organizational users (pro/edu) can see tabs if they are:
   * - Project owner/co-owner/admin, OR
   * - Organization admin/referent/superadmin of project's organization
   * Superadmin: show tabs only if they are superadmin of the project's organization (read-only) or participant in the project
   */
  const shouldShowTabs = (): boolean => {
    if (isUserSuperadmin(state.user)) {
      if (userProjectRole === 'owner' || userProjectRole === 'co-owner' || userProjectRole === 'admin') return true;
      if (isUserSuperadminOfProjectOrg(apiProjectData, state.user)) return true;
      return false;
    }

    const isPersonalUser = state.showingPageType === 'teacher' || state.showingPageType === 'user';

    // For personal users, check role
    if (isPersonalUser) {
      // No tabs if not a member
      if (!userProjectRole) {
        return false;
      }

      // No tabs for simple participants
      if (userProjectRole === 'participant' || userProjectRole === 'participant avec droit de badges') {
        return false;
      }

      // Show tabs for admins (owner, co-owner, admin)
      if (userProjectRole === 'owner' || userProjectRole === 'co-owner' || userProjectRole === 'admin') {
        return true;
      }

      // Default: no tabs
      return false;
    }

    // For organizational users (pro/edu), check permissions
    if (!apiProjectData || !state.user) {
      return false;
    }

    // Check if user is project owner/co-owner/admin
    if (userProjectRole === 'owner' || userProjectRole === 'co-owner' || userProjectRole === 'admin') {
      return true;
    }

    // Check if user is org admin of project's organization
    if (isUserAdminOfProjectOrg(apiProjectData, state.user)) {
      return true;
    }

    // Default: no tabs
    return false;
  };

  /**
   * Fetch all project members including owner, co-owners, and confirmed members
   * Returns members sorted by role: owner -> co-owners -> admins -> members
   */
  const fetchAllProjectMembers = async (): Promise<any[]> => {
    if (!project?.id || !apiProjectData) return [];

    const projectId = parseInt(project.id);
    const allMembers: any[] = [];

    // Track user IDs that have already been added to avoid duplicates
    const addedUserIds = new Set<string>();

    // Helper function to convert availability object to array of labels
    const availabilityToLabels = (availability: any = {}) => {
      if (!availability || typeof availability !== 'object') return [];

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
        if (availability[key]) acc.push(label);
        return acc;
      }, []);

      if (availability.available && labels.length === 0) {
        labels.push('Disponible');
      }

      return labels;
    };

    // Extract skills as array of names
    const extractSkills = (skills: any) => {
      if (!skills || !Array.isArray(skills)) return [];
      return skills.flatMap((s: any) => {
        const result = [];
        if (s.name) result.push(s.name);
        if (s.sub_skills && Array.isArray(s.sub_skills)) {
          s.sub_skills.forEach((sub: any) => {
            if (sub.name) result.push(sub.name);
          });
        }
        return result;
      });
    };

    // Add owner (skip if soft-deleted - they shouldn't appear in badge assignment list)
    if (apiProjectData.owner && !apiProjectData.owner.is_deleted) {
      const ownerId = apiProjectData.owner.id.toString();
      addedUserIds.add(ownerId);

      const ownerParticipant = {
        id: `owner-${apiProjectData.owner.id}`,
        memberId: ownerId,
        name: apiProjectData.owner.full_name || `${apiProjectData.owner.first_name || ''} ${apiProjectData.owner.last_name || ''}`.trim() || 'Inconnu',
        profession: apiProjectData.owner.job || 'Propriétaire',
        email: apiProjectData.owner.email || '',
        avatar: apiProjectData.owner.avatar_url || DEFAULT_AVATAR_SRC,
        skills: extractSkills(apiProjectData.owner.skills),
        availability: availabilityToLabels(apiProjectData.owner.availability),
        organization: apiProjectData.primary_organization_name || project.organization || '',
        role: 'owner',
        projectRole: 'owner',
        is_deleted: apiProjectData.owner.is_deleted || false,
        userRole: apiProjectData.owner.role ?? '',
        school_level_name: typeof apiProjectData.owner.school_level === 'object' && apiProjectData.owner.school_level?.name
          ? apiProjectData.owner.school_level.name
          : ''
      };
      allMembers.push({
        ...ownerParticipant,
        canRemove: canUserRemoveParticipant(ownerParticipant, userProjectRole)
      });
    }

    // Add co-owners (skip if soft-deleted - they shouldn't appear in badge assignment list)
    if (apiProjectData.co_owners && Array.isArray(apiProjectData.co_owners)) {
      apiProjectData.co_owners.forEach((coOwner: any) => {
        // Skip soft-deleted co-owners
        if (coOwner.is_deleted) return;

        const coOwnerId = coOwner.id.toString();
        addedUserIds.add(coOwnerId);

        const coOwnerParticipant = {
          id: `co-owner-${coOwner.id}`,
          memberId: coOwnerId,
          name: coOwner.full_name || `${coOwner.first_name || ''} ${coOwner.last_name || ''}`.trim() || 'Inconnu',
          profession: coOwner.job || 'Co-propriétaire',
          email: coOwner.email || '',
          avatar: coOwner.avatar_url || DEFAULT_AVATAR_SRC,
          skills: extractSkills(coOwner.skills),
          availability: availabilityToLabels(coOwner.availability),
          organization: (typeof coOwner.organization_name === 'string' ? coOwner.organization_name : (coOwner.organization_name?.name ?? coOwner.partner_organization?.name ?? '')) || (typeof coOwner.city === 'string' ? coOwner.city : '') || '',
          role: 'co-owner',
          projectRole: 'co_owner',
          is_deleted: coOwner.is_deleted || false,
          userRole: coOwner.role ?? '',
          school_level_name: typeof coOwner.school_level === 'object' && coOwner.school_level?.name
            ? coOwner.school_level.name
            : ''
        };
        allMembers.push({
          ...coOwnerParticipant,
          canRemove: canUserRemoveParticipant(coOwnerParticipant, userProjectRole)
        });
      });
    }

    // Add project members (confirmed only)
    // Exclude co-owners and owner to avoid duplicates
    try {
      const projectMembers = await getProjectMembers(projectId);
      const confirmedMembers = projectMembers.filter((m: any) => {
        // Exclude pending members
        if (m.status !== 'confirmed') return false;

        const userId = m.user?.id?.toString() || m.user_id?.toString();

        // Exclude co-owners (already added from apiProjectData.co_owners)
        if (addedUserIds.has(userId)) return false;

        // Exclude co-owners by role (safety check in case they weren't in co_owners array)
        if (m.project_role === 'co_owner') return false;

        return true;
      });

      confirmedMembers.forEach((member: any) => {
        // Skip soft-deleted users - they shouldn't appear in badge assignment list
        if (member.user?.is_deleted) return;

        const memberParticipant = {
          id: `member-${member.id}`,
          memberId: member.user?.id?.toString() || member.user_id?.toString(),
          name: member.user?.full_name || 'Inconnu',
          profession: member.user?.job || 'Membre',
          email: member.user?.email || '',
          avatar: member.user?.avatar_url || DEFAULT_AVATAR_SRC,
          skills: extractSkills(member.user?.skills),
          availability: availabilityToLabels(member.user?.availability),
          organization: typeof member.user?.organization === 'string' ? member.user.organization : (member.user?.organization?.name ?? member.user?.organization_name ?? '') || '',
          role: member.project_role === 'admin' ? 'admin' : 'member',
          projectRole: member.project_role,
          canAssignBadges: member.can_assign_badges_in_project || false,
          userRole: member.user?.role ?? '',
          school_level_name: typeof member.user?.school_level === 'object' && member.user?.school_level?.name
            ? member.user.school_level.name
            : ''
        };
        allMembers.push({
          ...memberParticipant,
          canRemove: canUserRemoveParticipant(memberParticipant, userProjectRole)
        });
      });
    } catch (error) {
      console.error('Error fetching project members:', error);
    }

    // Sort by role: owner -> co-owners -> admins -> members
    const roleOrder: { [key: string]: number } = {
      'owner': 1,
      'co-owner': 2,
      'admin': 3,
      'member': 4
    };

    return allMembers.sort((a, b) => {
      const orderA = roleOrder[a.role] || 99;
      const orderB = roleOrder[b.role] || 99;
      if (orderA !== orderB) {
        return orderA - orderB;
      }
      // If same role, sort alphabetically by name
      return a.name.localeCompare(b.name);
    });
  };

  /**
   * Fetch available members from organization and branches (if applicable)
   */
  const fetchAvailableMembers = async (): Promise<any[]> => {
    if (!apiProjectData) return [];

    // Teacher: same pool as project creation Participants (all students from teacher's schools)
    if (state.showingPageType === 'teacher') {
      try {
        const allStudents: any[] = [];
        let page = 1;
        let hasMore = true;
        while (hasMore) {
          const res = await getTeacherAllStudents({ page, per_page: 500 });
          const data = res.data?.data ?? res.data ?? [];
          const list = Array.isArray(data) ? data : [];
          if (list.length === 0) {
            hasMore = false;
          } else {
            allStudents.push(...list.map((student: any) => {
              const name = student.full_name || `${student.first_name || ''} ${student.last_name || ''}`.trim() || 'Inconnu';
              const organization = student.schools?.length
                ? (student.schools as any[]).map((s: any) => s.name).join(', ')
                : '';
              return {
                id: student.id?.toString(),
                memberId: student.id?.toString(),
                name,
                profession: student.role || 'Élève',
                email: student.email || '',
                avatar: student.avatar_url || DEFAULT_AVATAR_SRC,
                skills: [] as string[],
                availability: [] as string[],
                organization
              };
            }));
            const totalPages = res.data?.meta?.total_pages ?? 1;
            if (page >= totalPages) {
              hasMore = false;
            } else {
              page++;
            }
          }
        }
        return allStudents;
      } catch (err) {
        console.error('Error fetching teacher students for add participant:', err);
        return [];
      }
    }

    const isEdu = state.showingPageType === 'edu';
    const organizationType = isEdu ? 'school' : 'company';

    // Get organization ID from project or user context
    let organizationId: number | null = null;

    if (isEdu) {
      // For schools, get from project's school_levels or user context
      if (apiProjectData.school_levels && apiProjectData.school_levels.length > 0) {
        organizationId = apiProjectData.school_levels[0]?.school?.id;
      } else {
        organizationId = getSelectedOrganizationId(state.user, state.showingPageType) || null;
      }
    } else {
      // For companies, get from project's companies or user context
      if (apiProjectData.companies && apiProjectData.companies.length > 0) {
        organizationId = apiProjectData.companies[0]?.id;
      } else {
        organizationId = getSelectedOrganizationId(state.user, state.showingPageType) || null;
      }
    }

    if (!organizationId) return [];

    const allMembers: any[] = [];

    try {
      // Get main organization members (handle pagination)
      let page = 1;
      let hasMore = true;
      while (hasMore) {
        const response = await apiClient.get(
          organizationType === 'school'
            ? `/api/v1/schools/${organizationId}/members`
            : `/api/v1/companies/${organizationId}/members`,
          {
            params: {
              status: 'confirmed',
              per_page: 1000,
              page: page
            }
          }
        );

        const members = response.data?.data || [];
        if (members.length === 0) {
          hasMore = false;
        } else {
          allMembers.push(...members.map((member: any) => ({
            id: member.id?.toString(),
            memberId: member.id?.toString(), // API returns id: user.id directly
            name: member.full_name || `${member.first_name || ''} ${member.last_name || ''}`.trim() || 'Inconnu',
            profession: member.job || 'Membre',
            email: member.email || '',
            avatar: member.avatar_url || DEFAULT_AVATAR_SRC,
            skills: member.skills?.map((s: any) => s.name || s) || [],
            availability: member.availability || [],
            organization: member.organization_name || ''
          })));

          // Check if there are more pages
          const totalPages = response.data?.meta?.total_pages || 1;
          if (page >= totalPages) {
            hasMore = false;
          } else {
            page++;
          }
        }
      }

      // If company and main company, get branch members
      if (!isEdu) {
        try {
          const branchesResponse = await apiClient.get(`/api/v1/companies/${organizationId}/branches`);
          const branches = branchesResponse.data?.data || [];
          const shareMembers = branchesResponse.data?.meta?.share_members_with_branches || false;

          if (shareMembers && branches.length > 0) {
            for (const branch of branches) {
              try {
                // Handle pagination for branch members too
                let branchPage = 1;
                let branchHasMore = true;
                while (branchHasMore) {
                  const branchResponse = await apiClient.get(
                    `/api/v1/companies/${branch.id}/members`,
                    {
                      params: {
                        status: 'confirmed',
                        per_page: 1000,
                        page: branchPage
                      }
                    }
                  );

                  const branchMembers = branchResponse.data?.data || [];
                  if (branchMembers.length === 0) {
                    branchHasMore = false;
                  } else {
                    allMembers.push(...branchMembers.map((member: any) => ({
                      id: member.id?.toString(),
                      memberId: member.id?.toString(), // API returns id: user.id directly
                      name: member.full_name || `${member.first_name || ''} ${member.last_name || ''}`.trim() || 'Inconnu',
                      profession: member.job || 'Membre',
                      email: member.email || '',
                      avatar: member.avatar_url || DEFAULT_AVATAR_SRC,
                      skills: member.skills?.map((s: any) => s.name || s) || [],
                      availability: member.availability || [],
                      organization: branch.name || ''
                    })));

                    // Check if there are more pages
                    const branchTotalPages = branchResponse.data?.meta?.total_pages || 1;
                    if (branchPage >= branchTotalPages) {
                      branchHasMore = false;
                    } else {
                      branchPage++;
                    }
                  }
                }
              } catch (error) {
                console.error(`Error fetching members for branch ${branch.id}:`, error);
                // Continue with other branches
              }
            }
          }
        } catch (error) {
          console.error('Error fetching branches:', error);
          // Continue without branches if error
        }
      }
    } catch (error) {
      console.error('Error fetching organization members:', error);
      return [];
    }

    // Remove duplicates and exclude existing participants
    const existingMemberIds = participants.map(p => p.memberId);
    const uniqueMembers = allMembers.filter((member, index, self) =>
      index === self.findIndex(m => m.memberId === member.memberId) &&
      !existingMemberIds.includes(member.memberId)
    );

    return uniqueMembers;
  };

  // Helper functions for edit modal
  const handleEditSearchChange = (field: 'coResponsibles' | 'partner', value: string) => {
    setEditSearchTerms(prev => ({ ...prev, [field]: value }));
  };

  const getEditFilteredMembers = (searchTerm: string) => {
    // Filter out already selected co-responsibles
    let available = editAvailableMembers.filter((member: any) =>
      !editForm.coResponsibles.includes(member.id.toString())
    );

    if (!searchTerm) return available;
    const lowerSearch = searchTerm.toLowerCase();
    return available.filter((member: any) => {
      const fullName = member.full_name || `${member.first_name} ${member.last_name}`;
      return fullName.toLowerCase().includes(lowerSearch) || member.email?.toLowerCase().includes(lowerSearch);
    });
  };

  const getEditFilteredPartnerships = (searchTerm: string) => {
    // Filter out already selected partnerships
    let available = editAvailablePartnerships.filter((partnership: any) =>
      !editForm.partners.includes(partnership.id?.toString())
    );

    if (!searchTerm) return available;

    const lowerSearch = searchTerm.toLowerCase();
    return available.filter((partnership: any) => {
      const partnerNames = partnership.partners?.map((p: any) => p.name).join(', ') || '';
      return partnerNames.toLowerCase().includes(lowerSearch);
    });
  };

  const handleEditMemberSelect = (field: 'coResponsibles', memberId: string) => {
    setEditForm(prev => {
      const currentList = prev[field];
      const newList = currentList.includes(memberId)
        ? currentList.filter((id: string) => id !== memberId)
        : [...currentList, memberId];
      return { ...prev, [field]: newList };
    });
  };

  const handleEditPartnerSelect = (partnerId: string) => {
    const partnership = editAvailablePartnerships.find((p: any) => p.id?.toString() === partnerId || p.id === Number(partnerId));
    const contactUsers = partnership
      ? (partnership.partners || []).flatMap((p: any) => (p.contact_users || []).map((c: any) => ({
        id: c.id,
        full_name: c.full_name || '',
        email: c.email || '',
        role: c.role_in_organization || '',
        organization: p.name || ''
      })))
      : [];
    const contactIds = contactUsers.map((c: any) => c.id.toString());

    setEditForm(prev => {
      const isAdding = !prev.partners.includes(partnerId);
      const newPartners = isAdding
        ? [...prev.partners, partnerId]
        : prev.partners.filter(id => id !== partnerId);
      const newCoResponsibles = isAdding
        ? Array.from(new Set([...prev.coResponsibles, ...contactIds]))
        : prev.coResponsibles.filter(id => !contactIds.includes(id.toString()));
      return { ...prev, partners: newPartners, coResponsibles: newCoResponsibles };
    });

    setEditPartnershipContactMembers(prev => {
      const isAdding = !editForm.partners.includes(partnerId);
      if (isAdding) {
        return [...prev, ...contactUsers];
      }
      const toRemoveIds = new Set(contactIds);
      return prev.filter((m: any) => !toRemoveIds.has(m.id?.toString()));
    });
  };

  const handleEdit = async () => {
    // Prevent editing if project is ended
    if (isProjectEnded) {
      showError('Impossible de modifier un projet terminé');
      return;
    }

    const mldsInfo = apiProjectData?.mlds_information;

    // Get current co-responsibles and partnerships
    // Check both co_responsibles and co_owners to ensure we get all co-responsibles
    let currentCoResponsibles: string[] = [];
    if (apiProjectData?.co_responsibles && Array.isArray(apiProjectData.co_responsibles)) {
      currentCoResponsibles = apiProjectData.co_responsibles.map((cr: any) => cr.id?.toString()).filter(Boolean);
    } else if (apiProjectData?.co_owners && Array.isArray(apiProjectData.co_owners)) {
      // Fallback to co_owners if co_responsibles doesn't exist
      currentCoResponsibles = apiProjectData.co_owners.map((cr: any) => cr.id?.toString()).filter(Boolean);
    }

    console.log('🔍 [handleEdit] Current co-responsibles IDs:', currentCoResponsibles);

    // Get all partnership IDs (can be multiple)
    let currentPartnerships: string[] = [];
    if (apiProjectData?.partnership_ids?.length) {
      currentPartnerships = apiProjectData.partnership_ids.map((id: number) => id.toString());
    } else if (apiProjectData?.partnership_id) {
      currentPartnerships = [apiProjectData.partnership_id.toString()];
    } else if (apiProjectData?.partnership?.id) {
      currentPartnerships = [apiProjectData.partnership.id.toString()];
    }
    const isPartnerProject = apiProjectData?.is_partner_project || false;

    setEditPartnershipContactMembers([]);
    setEditForm({
      title: project.title,
      description: project.description,
      tags: [...(project.tags || [])],
      startDate: project.startDate,
      endDate: project.endDate,
      pathways: project.pathway ? [project.pathway] : [],
      status: project.status || 'coming',
      visibility: isMLDSProject ? 'private' : (project.visibility || 'public'), // MLDS projects are always private
      isPartnership: isPartnerProject,
      coResponsibles: currentCoResponsibles,
      partners: currentPartnerships,
      // MLDS fields
      mldsRequestedBy: mldsInfo?.requested_by || 'departement',
      mldsDepartment: mldsInfo?.department_number || mldsInfo?.department_code || '',
      mldsTargetAudience: mldsInfo?.target_audience || 'students_without_solution',
      mldsActionObjectives: mldsInfo?.action_objectives || [],
      mldsActionObjectivesOther: mldsInfo?.action_objectives_other || '',
      mldsObjectives: mldsInfo?.objectives || '',
      mldsCompetenciesDeveloped: mldsInfo?.competencies_developed || '',
      mldsExpectedParticipants: mldsInfo?.expected_participants?.toString() || '',
      mldsFinancialHSE: mldsInfo?.financial_hse || '',
      mldsFinancialHV: mldsInfo?.financial_hv || '',
      mldsFinancialTransport: mldsInfo?.financial_transport || '',
      mldsFinancialOperating: mldsInfo?.financial_operating || '',
      mldsFinancialService: mldsInfo?.financial_service || '',
      mldsOrganizationNames: mldsInfo?.organization_names || [],
      // For MLDS: use mlds_information.school_level_ids
      // For non-MLDS school projects: use root school_level_ids (as returned by API)
      mldsSchoolLevelIds: (
        (mldsInfo?.school_level_ids || apiProjectData?.school_level_ids || []) as number[]
      ).map((id: number) => id.toString())
    });
    setEditImagePreview(project.image || '');
    setIsEditModalOpen(true);

    // Load members
    setIsLoadingEditMembers(true);
    try {
      const organizationType = getOrganizationType(state.showingPageType);
      const organizationId = getOrganizationId(state.user, state.showingPageType);

      let membersResult: any[] = [];
      if (state.showingPageType === 'teacher') {
        membersResult = await getTeacherMembers();
      } else if (organizationType && organizationId) {
        membersResult = await getOrganizationMembers(organizationId, organizationType);
      }
      setEditAvailableMembers(membersResult || []);

      // Debug: log available members IDs
      console.log('🔍 [handleEdit] Available members:', membersResult?.length || 0);
      console.log('🔍 [handleEdit] Available member IDs:', membersResult?.map((m: any) => m.id?.toString()).slice(0, 5));
      console.log('🔍 [handleEdit] Co-responsibles to select:', currentCoResponsibles);
    } catch (err) {
      console.error('Error fetching members:', err);
      setEditAvailableMembers([]);
    } finally {
      setIsLoadingEditMembers(false);
    }

    // Load partnerships
    try {
      const organizationType = getOrganizationType(state.showingPageType);
      const organizationId = getOrganizationId(state.user, state.showingPageType);

      if (organizationType && organizationId && (organizationType === 'school' || organizationType === 'company')) {
        const partnershipsResponse = await getPartnerships(organizationId, organizationType);
        setEditAvailablePartnerships(partnershipsResponse.data || []);
      }
    } catch (err) {
      console.error('Error fetching partnerships:', err);
      setEditAvailablePartnerships([]);
    }

    // Load school levels (classes) : teacher = teachers/classes puis filtre par école ; sinon schools/:id/levels
    setIsLoadingSchoolLevels(true);
    try {
      const organizationType = getOrganizationType(state.showingPageType);
      const organizationId = getOrganizationId(state.user, state.showingPageType);

      if (state.showingPageType === 'teacher') {
        const response = await getTeacherClasses(1, 1000);
        const data = response.data?.data ?? response.data;
        const allClasses = Array.isArray(data) ? data : [];
        if (organizationId != null) {
          const schoolIdStr = String(organizationId);
          const filtered = allClasses.filter(
            (c: any) => String(c.school_id ?? c.school?.id) === schoolIdStr
          );
          const sorted = [...filtered].sort((a: any, b: any) => {
            const byName = (a.name || '').localeCompare(b.name || '');
            return byName !== 0 ? byName : (a.level || '').localeCompare(b.level || '');
          });
          setAvailableSchoolLevels(sorted);
        } else {
          setAvailableSchoolLevels([]);
        }
      } else if (organizationType === 'school' && organizationId) {
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

  const handleSaveEditInternal = async (
    desiredStatus?: 'draft' | 'to_process' | 'coming' | 'in_progress' | 'ended'
  ) => {
    try {
      const effectiveStatus: 'draft' | 'to_process' | 'coming' | 'in_progress' | 'ended' =
        desiredStatus || editForm.status;

      // For MLDS projects, force visibility to private
      const formDataWithVisibility = isMLDSProject
        ? { ...editForm, visibility: 'private' as const }
        : editForm;

      // Map edit form to backend payload
      const payload = mapEditFormToBackend(formDataWithVisibility, state.tags || [], project);
      payload.project.status = effectiveStatus;

      // Add co-responsibles and partnership
      payload.project.co_responsible_ids = editForm.coResponsibles.map(id => Number.parseInt(id, 10)).filter(id => !Number.isNaN(id));
      payload.project.partnership_ids = editForm.partners.length > 0
        ? editForm.partners.map(id => Number.parseInt(id, 10)).filter(id => !Number.isNaN(id))
        : undefined;

      // Add MLDS information if it's an MLDS project
      if (isMLDSProject) {

        const schoolLevelIds = editForm.mldsSchoolLevelIds.map(id => Number.parseInt(id, 10)).filter(id => !Number.isNaN(id));

        payload.project.mlds_information_attributes = {
          requested_by: editForm.mldsRequestedBy,
          department_number: editForm.mldsRequestedBy === 'departement' && editForm.mldsDepartment ? editForm.mldsDepartment : null,
          school_level_ids: schoolLevelIds,
          target_audience: editForm.mldsTargetAudience,
          action_objectives: editForm.mldsActionObjectives,
          action_objectives_other: editForm.mldsActionObjectivesOther || null,
          objectives: editForm.mldsObjectives || null,
          competencies_developed: editForm.mldsCompetenciesDeveloped || null,
          expected_participants: editForm.mldsExpectedParticipants ? parseInt(editForm.mldsExpectedParticipants) : null,
          financial_hse: editForm.mldsFinancialHSE ? Number.parseFloat(editForm.mldsFinancialHSE) : null,
          financial_hv: editForm.mldsFinancialHV ? Number.parseFloat(editForm.mldsFinancialHV) : null,
          financial_transport: editForm.mldsFinancialTransport ? Number.parseFloat(editForm.mldsFinancialTransport) : null,
          financial_operating: editForm.mldsFinancialOperating ? Number.parseFloat(editForm.mldsFinancialOperating) : null,
          financial_service: editForm.mldsFinancialService ? Number.parseFloat(editForm.mldsFinancialService) : null
          // organization_names is automatically generated by backend from school_level_ids
        };
      } else {
        // Non-MLDS school projects can still have school_level_ids at root level
        const schoolLevelIds = editForm.mldsSchoolLevelIds.map(id => Number.parseInt(id, 10)).filter(id => !Number.isNaN(id));
        if (schoolLevelIds.length > 0) {
          (payload.project as any).school_level_ids = schoolLevelIds;
        } else {
          // Allow clearing school levels
          (payload.project as any).school_level_ids = [];
        }
      }

      // Convert image preview to File if different from current image
      let mainImageFile: File | null = null;
      if (editImagePreview && editImagePreview !== project.image) {
        // Check if it's a base64 string (new image) or URL (existing image)
        if (editImagePreview.startsWith('data:')) {
          mainImageFile = base64ToFile(editImagePreview, 'main-image.jpg');
        }
      }

      // Validate image if provided
      if (mainImageFile) {
        const sizeValidation = validateImageSize(mainImageFile);
        if (!sizeValidation.valid) {
          alert(sizeValidation.error);
          return;
        }

        const formatValidation = validateImageFormat(mainImageFile);
        if (!formatValidation.valid) {
          alert(formatValidation.error);
          return;
        }
      }

      // Call backend API
      const projectId = parseInt(project.id);
      if (isNaN(projectId)) {
        alert('ID de projet invalide');
        return;
      }

      await updateProject(projectId, payload, mainImageFile, undefined);

      // Reload project from API to get updated data
      const response = await getProjectById(projectId);
      const apiProject = response.data;
      const mappedProject = mapApiProjectToFrontendProject(apiProject, state.showingPageType, state.user);

      // Update project state
      setProject(mappedProject);
      setSelectedProject(mappedProject);

      // Update apiProjectData to reflect changes
      setApiProjectData(apiProject);

      setIsEditModalOpen(false);
      setEditImagePreview('');
      showSuccess('Projet mis à jour avec succès');
    } catch (error: any) {
      console.error('Error updating project:', error);
      const errorMessage = error.response?.data?.details?.join(', ') || error.response?.data?.message || error.message || 'Erreur lors de la mise à jour du projet';
      showError(errorMessage);
    }
  };

  const handleSaveEdit = async () => {
    // Pour les projets MLDS et rôle enseignant, on force le statut "À traiter"
    const isTeacher =
      isMLDSProject && (state.showingPageType === 'teacher' || state.user?.role === 'teacher');

    let statusForSubmit: 'draft' | 'to_process' | 'coming' | 'in_progress' | 'ended';

    if (isTeacher) {
      // Cas spécial : enseignants avec projets MLDS → "À traiter"
      statusForSubmit = 'to_process';
    } else {
      // Utiliser le statut sélectionné dans le formulaire
      statusForSubmit = editForm.status || 'coming';
    }

    await handleSaveEditInternal(statusForSubmit);
  };

  const handleSaveEditDraft = async () => {
    setEditForm(prev => ({ ...prev, status: 'draft' }));
    await handleSaveEditInternal('draft');
  };

  const handleEditOrganizationToggle = (schoolLevelId: string) => {
    setEditForm(prev => {
      const isAlreadySelected = prev.mldsSchoolLevelIds.includes(schoolLevelId);

      const updatedSchoolLevelIds = isAlreadySelected
        ? prev.mldsSchoolLevelIds.filter(id => id !== schoolLevelId)
        : [...prev.mldsSchoolLevelIds, schoolLevelId];

      // Lorsqu'on sélectionne une organisation porteuse (classe),
      // on pré‑sélectionne les enseignants responsables comme co‑responsables.
      if (!isAlreadySelected) {
        const selectedLevel = availableSchoolLevels.find(
          (level: any) => level.id?.toString() === schoolLevelId
        );

        const teacherIds =
          selectedLevel?.teachers?.map((t: any) => t.id?.toString()).filter(Boolean) || [];

        if (teacherIds.length > 0) {
          const coResponsiblesSet = new Set(prev.coResponsibles);
          teacherIds.forEach((id: string) => coResponsiblesSet.add(id));

          return {
            ...prev,
            mldsSchoolLevelIds: updatedSchoolLevelIds,
            coResponsibles: Array.from(coResponsiblesSet)
          };
        }
      }

      return {
        ...prev,
        mldsSchoolLevelIds: updatedSchoolLevelIds
      };
    });
  };

  const handleCancelEdit = () => {
    setIsEditModalOpen(false);
    setEditImagePreview('');
  };

  const handleEditImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate image size
    const sizeValidation = validateImageSize(file);
    if (!sizeValidation.valid) {
      alert(sizeValidation.error);
      return;
    }

    // Validate image format
    const formatValidation = validateImageFormat(file);
    if (!formatValidation.valid) {
      alert(formatValidation.error);
      return;
    }

    // Read file and set preview
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setEditImagePreview(result);
    };
    reader.readAsDataURL(file);
  };

  const handleTagChange = (index: number, value: string) => {
    const newTags = [...editForm.tags];
    newTags[index] = value;
    setEditForm({ ...editForm, tags: newTags });
  };

  const addTag = () => {
    setEditForm({ ...editForm, tags: [...editForm.tags, ''] });
  };

  const removeTag = (index: number) => {
    const newTags = editForm.tags.filter((_, i) => i !== index);
    setEditForm({ ...editForm, tags: newTags });
  };

  // Request handlers
  const handleAcceptRequest = async (requestId: string) => {
    const request = requests.find(r => r.id === requestId);
    if (!request || !project?.id) return;

    try {
      const projectId = parseInt(project.id);
      const userId = parseInt(request.memberId);

      if (isNaN(projectId) || isNaN(userId)) {
        showError('Données invalides');
        return;
      }

      // Update member status from pending to confirmed
      await updateProjectMember(projectId, userId, {
        status: 'confirmed'
      });

      showSuccess('Demande acceptée avec succès');
      console.log("Requests", requests)
      // Remove from requests
      setRequests(requests.filter(r => r.id !== requestId));

      // Reload project stats to update participant count
      if (project.id) {
        const stats = await getProjectStats(parseInt(project.id));
        setProjectStats(stats);
      }
    } catch (error: any) {
      console.error('Error accepting request:', error);
      const errorMessage = error.response?.data?.message || 'Erreur lors de l\'acceptation de la demande';
      showError(errorMessage);
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    const request = requests.find(r => r.id === requestId);
    if (!request || !project?.id) return;

    try {
      const projectId = parseInt(project.id);
      const userId = parseInt(request.memberId);

      if (isNaN(projectId) || isNaN(userId)) {
        showError('Données invalides');
        return;
      }

      // Remove member (reject request)
      await removeProjectMember(projectId, userId);

      showSuccess('Demande rejetée');

      // Remove from requests
      setRequests(requests.filter(r => r.id !== requestId));
    } catch (error: any) {
      console.error('Error rejecting request:', error);
      const errorMessage = error.response?.data?.message || 'Erreur lors du rejet de la demande';
      showError(errorMessage);
    }
  };

  // Participant handlers
  const handleRemoveParticipant = async (participantId: string) => {
    // Prevent removing participants if project is ended
    if (isProjectEnded) {
      showError('Impossible de retirer des participants d\'un projet terminé');
      return;
    }

    const participant = participants.find(p => p.id === participantId);
    if (!participant || !project?.id) return;

    // Check if can be removed
    if (!participant.canRemove) {
      // Provide specific error message based on participant role
      if (participant.role === 'co-owner') {
        showError('Seul le responsable du projet peut retirer les co-responsables');
      } else if (participant.role === 'admin') {
        showError('Seuls le responsable du projet et les co-responsables peuvent retirer les admins');
      } else if (participant.role === 'owner') {
        showError('Le responsable du projet ne peut pas être retiré');
      } else {
        showError('Ce membre ne peut pas être retiré du projet');
      }
      return;
    }

    // Confirm action
    if (!window.confirm(`Êtes-vous sûr de vouloir retirer ${participant.name} du projet ?`)) {
      return;
    }

    try {
      const projectId = parseInt(project.id);
      const userId = parseInt(participant.memberId);

      if (isNaN(projectId) || isNaN(userId)) {
        showError('Données invalides');
        return;
      }

      await removeProjectMember(projectId, userId);

      showSuccess(`${participant.name} a été retiré du projet`);

      // Reload participants
      // Reset refs to allow reload
      lastLoadedProjectIdRef.current = null;
      previousIdsRef.current = { projectId: null, apiProjectId: null };
      const members = await fetchAllProjectMembers();
      setParticipants(members);

      // Reload project stats
      const stats = await getProjectStats(projectId);
      setProjectStats(stats);
    } catch (error: any) {
      console.error('Error removing participant:', error);
      const errorMessage = error.response?.data?.message || 'Erreur lors du retrait du participant';

      // Specific error messages based on backend response
      if (error.response?.status === 403) {
        // Map backend error messages to French
        if (errorMessage.includes('Only project owner can remove co-owners')) {
          showError('Seul le responsable du projet peut retirer les co-responsables');
        } else if (errorMessage.includes('Admins cannot remove other admins')) {
          showError('Les admins ne peuvent pas retirer d\'autres admins');
        } else if (errorMessage.includes('Cannot remove project owner')) {
          showError('Le responsable du projet ne peut pas être retiré');
        } else {
          showError('Vous n\'avez pas la permission de retirer ce membre');
        }
      } else {
        showError(errorMessage);
      }
    }
  };

  const handleAwardBadge = (participantId: string) => {
    setSelectedParticipantForBadge(participantId);
    setIsBadgeModalOpen(true);
  };

  const handleAssignBadge = () => {
    // Prevent assigning badges if project is ended
    if (isProjectEnded) {
      showError('Impossible d\'attribuer des badges à un projet terminé');
      return;
    }

    // Open badge modal without pre-selecting a participant
    setSelectedParticipantForBadge(null);
    setIsBadgeModalOpen(true);
  };

  const displaySeries = (seriesName: string) => {
    return seriesName?.toLowerCase().includes('toukouleur') ? 'Série Soft Skills 4LAB' : seriesName;
  };

  // Map frontend series name to backend series name for API calls
  const mapSeriesToBackend = (frontendSeries: string): string => {
    if (frontendSeries === 'Série Soft Skills 4LAB') {
      return 'Série TouKouLeur'; // Exact database value with capital K and L
    }
    return frontendSeries;
  };

  const mapBackendBadgeToAttribution = (item: any): any => {
    const badge = item?.badge || {};
    const receiver = item?.receiver || {};
    const sender = item?.sender || {};
    const organization = item?.organization || {};

    const badgeName = badge.name || 'Badge';
    const badgeSeries = displaySeries(badge.series || 'Série Soft Skills 4LAB');
    const badgeLevel = badge.level ? badge.level.replace('level_', '') : '1';
    const badgeLevelKey = badge.level || 'level_1';
    const badgeSeriesRaw = badge.series || '';

    const imageUrl = badge.image_url || getLocalBadgeImage(badgeName, badgeLevelKey, badgeSeriesRaw) || '/TouKouLeur-Jaune.png';

    const documents = Array.isArray(item.documents)
      ? item.documents.map((doc: any) => ({
        name: doc?.name || doc?.filename || 'Document',
        type: doc?.type || doc?.content_type || 'file',
        size: doc?.size || (doc?.byte_size ? `${(doc.byte_size / 1024).toFixed(1)} KB` : ''),
        url: doc?.url,
      }))
      : [];

    const preuve = documents.length > 0 ? documents[0] : undefined;

    return {
      id: item.id?.toString() || `badge-${Date.now()}-${Math.random()}`,
      badgeId: badge.id?.toString() || '',
      badgeTitle: badgeName,
      badgeSeries,
      badgeLevel,
      badgeImage: imageUrl,
      participantId: receiver.id?.toString() || '',
      participantName: receiver.full_name || receiver.name || 'Inconnu',
      participantAvatar: receiver.avatar_url || DEFAULT_AVATAR_SRC,
      participantOrganization: receiver.organization || organization.name || 'Non spécifiée',
      participantIsDeleted: receiver.is_deleted || false,
      attributedBy: sender.id?.toString() || '',
      attributedByName: sender.full_name || sender.name || 'Inconnu',
      attributedByAvatar: sender.avatar_url || DEFAULT_AVATAR_SRC,
      attributedByOrganization: sender.organization || organization.name || 'Non spécifiée',
      attributedByIsDeleted: sender.is_deleted || false,
      projectId: project?.id || '',
      projectTitle: project?.title || '',
      domaineEngagement: item.comment || '', // fallback
      commentaire: item.comment || '',
      preuveFiles: documents,
      preuve,
      dateAttribution: item.created_at || new Date().toISOString(),
    };
  };

  const fetchProjectBadgesData = useCallback(async (page: number = 1) => {
    if (!project?.id) return;
    setIsLoadingProjectBadges(true);
    setProjectBadgesError(null);
    try {
      const projectId = parseInt(project.id);
      const filters: { series?: string; level?: string } = {};
      if (badgeSeriesFilter) filters.series = mapSeriesToBackend(badgeSeriesFilter);
      if (badgeLevelFilter) filters.level = `level_${badgeLevelFilter}`;

      const response = await getProjectBadges(projectId, page, 12, filters);
      const mapped = (response.data || []).map(mapBackendBadgeToAttribution);
      setProjectBadges(mapped);

      // Update pagination metadata
      if (response.meta) {
        setBadgeTotalPages(response.meta.total_pages || 1);
        setBadgeTotalCount(response.meta.total_count || 0);
      }
    } catch (error: any) {
      console.error('Error fetching project badges:', error);
      setProjectBadgesError('Erreur lors du chargement des badges attribués');
    } finally {
      setIsLoadingProjectBadges(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project?.id, badgeSeriesFilter, badgeLevelFilter]);

  const fetchProjectDocuments = useCallback(async () => {
    if (!project?.id) return;
    setIsLoadingProjectDocuments(true);
    setProjectDocumentsError(null);
    try {
      const projectId = parseInt(project.id);
      const response = await getProjectDocuments(projectId);
      setProjectDocuments(response.data || []);
    } catch (error: any) {
      console.error('Error fetching project documents:', error);
      setProjectDocumentsError('Erreur lors du chargement des documents');
    } finally {
      setIsLoadingProjectDocuments(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project?.id]);

  const handleUploadDocuments = async (files: File[]) => {
    if (!project?.id) return;

    // Client-side validation (max 5 total, 1MB each)
    const currentCount = projectDocuments.length;
    if (currentCount + files.length > 5) {
      showError('Vous pouvez ajouter au maximum 5 documents');
      return;
    }
    const tooLarge = files.find((f) => f.size > 1024 * 1024);
    if (tooLarge) {
      showError('Chaque document doit faire moins de 1Mo');
      return;
    }

    setIsLoadingProjectDocuments(true);
    setProjectDocumentsError(null);
    try {
      const projectId = parseInt(project.id);
      const response = await addProjectDocuments(projectId, files);
      setProjectDocuments(response.data || []);
      showSuccess('Documents ajoutés');
    } catch (error: any) {
      console.error('Error uploading documents:', error);
      const errorMessage =
        error.response?.data?.details?.[0] ||
        error.response?.data?.message ||
        'Erreur lors de l’ajout des documents';
      showError(errorMessage);
    } finally {
      setIsLoadingProjectDocuments(false);
    }
  };

  const handleDeleteDocument = async (attachmentId: number) => {
    if (!project?.id) return;

    // Prevent deleting documents if project is ended
    if (isProjectEnded) {
      showError('Impossible de supprimer un document d\'un projet terminé');
      return;
    }

    if (!window.confirm('Supprimer ce document ?')) return;

    setIsLoadingProjectDocuments(true);
    setProjectDocumentsError(null);
    try {
      const projectId = parseInt(project.id);
      const response = await deleteProjectDocument(projectId, attachmentId);
      setProjectDocuments(response.data || []);
      showSuccess('Document supprimé');
    } catch (error: any) {
      console.error('Error deleting document:', error);
      const errorMessage = error.response?.data?.message || 'Erreur lors de la suppression du document';
      showError(errorMessage);
    } finally {
      setIsLoadingProjectDocuments(false);
    }
  };

  const handleBadgeAssignment = async (badgeData: any) => {
    console.log('Badge assigned:', badgeData);

    // Refresh project stats to update badge count
    if (project?.id) {
      try {
        const projectId = parseInt(project.id);
        if (!isNaN(projectId)) {
          const stats = await getProjectStats(projectId);
          setProjectStats(stats);
        }
      } catch (error) {
        console.error('Error refreshing project stats:', error);
      }
    }

    // Refresh badge attributions list from backend (stay on current page)
    fetchProjectBadgesData(badgePage);

    // Badge assignment is handled by the modal's success message
    // Close modal after success message is shown
    setTimeout(() => {
      setIsBadgeModalOpen(false);
      setSelectedParticipantForBadge(null);
    }, 2000); // Close after 2 seconds to allow user to see success message
  };

  // Team management functions
  const handleCreateTeam = () => {
    // Prevent creating teams if project is ended
    if (isProjectEnded) {
      showError('Impossible de créer une équipe pour un projet terminé');
      return;
    }

    setIsCreateTeamModalOpen(true);
    setNewTeamForm({
      name: '',
      description: '',
      chiefId: '',
      selectedMembers: []
    });
  };

  const handleEditTeam = (team: any) => {
    // Prevent editing teams if project is ended
    if (isProjectEnded) {
      showError('Impossible de modifier une équipe d\'un projet terminé');
      return;
    }

    setSelectedTeam(team);
    setNewTeamForm({
      name: team.name,
      description: team.description,
      chiefId: team.chiefId,
      selectedMembers: team.members
    });
    setIsEditTeamModalOpen(true);
  };

  const handleViewTeamDetails = (team: any) => {
    setSelectedTeam(team);
    setIsViewTeamModalOpen(true);
  };

  // Fetch project teams
  const fetchProjectTeams = async () => {
    if (!project?.id) return;

    setIsLoadingTeams(true);
    try {
      const projectId = parseInt(project.id);
      const apiTeams = await getProjectTeams(projectId);

      // apiTeams is already an array (Team[])
      const mappedTeams = apiTeams.map((team: any, index: number) => {
        const mapped = mapApiTeamToFrontendTeam(team);
        mapped.number = index + 1; // Calculate number based on order
        return mapped;
      });
      setTeams(mappedTeams);
    } catch (error: any) {
      console.error('Error fetching teams:', error);
      console.error('Error response:', error.response?.data);
      const errorMessage = error.response?.data?.message ||
        error.response?.data?.error ||
        'Erreur lors du chargement des équipes';
      showError(errorMessage);
    } finally {
      setIsLoadingTeams(false);
    }
  };

  const handleDeleteTeam = async (teamId: string) => {
    if (!project?.id) return;

    // Prevent deleting teams if project is ended
    if (isProjectEnded) {
      showError('Impossible de supprimer une équipe d\'un projet terminé');
      return;
    }

    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cette équipe ?')) {
      return;
    }

    try {
      const projectId = parseInt(project.id);
      const id = parseInt(teamId);
      await deleteProjectTeam(projectId, id);
      showSuccess('Équipe supprimée avec succès');

      // Reload teams
      await fetchProjectTeams();
    } catch (error: any) {
      console.error('Error deleting team:', error);
      const errorMessage = error.response?.data?.message ||
        error.response?.data?.error ||
        'Erreur lors de la suppression de l\'équipe';
      showError(errorMessage);
    }
  };

  const handleSaveTeam = async () => {
    if (!project?.id) return;

    if (!newTeamForm.name.trim()) {
      showError('Veuillez saisir un nom d\'équipe');
      return;
    }

    if (newTeamForm.selectedMembers.length === 0) {
      showError('Veuillez sélectionner au moins un membre');
      return;
    }

    if (!newTeamForm.chiefId) {
      showError('Veuillez sélectionner un chef d\'équipe');
      return;
    }

    if (!newTeamForm.selectedMembers.includes(newTeamForm.chiefId)) {
      showError('Le chef d\'équipe doit être membre de l\'équipe');
      return;
    }

    const teamData = {
      name: newTeamForm.name,
      description: newTeamForm.description,
      chiefId: newTeamForm.chiefId,
      members: newTeamForm.selectedMembers
    };

    try {
      const projectId = parseInt(project.id);
      const backendPayload = mapFrontendTeamToBackend(teamData);

      console.log('Team data before mapping:', teamData);
      console.log('Backend payload:', backendPayload);

      if (selectedTeam) {
        // Update existing team
        const teamId = parseInt(selectedTeam.id);
        await updateProjectTeam(projectId, teamId, backendPayload);
        showSuccess('Équipe modifiée avec succès');
      } else {
        // Create new team
        await createProjectTeam(projectId, backendPayload);
        showSuccess('Équipe créée avec succès');
      }

      // Reload teams
      await fetchProjectTeams();

      // Reset form
      handleCancelTeamForm();
    } catch (error: any) {
      console.error('Error saving team:', error);
      const errorMessage = error.response?.data?.details?.join(', ') ||
        error.response?.data?.error ||
        error.response?.data?.message ||
        'Erreur lors de la sauvegarde de l\'équipe';
      showError(errorMessage);
    }
  };

  const handleCancelTeamForm = () => {
    setIsCreateTeamModalOpen(false);
    setIsEditTeamModalOpen(false);
    setSelectedTeam(null);
    setMemberSearchTerm('');
    setNewTeamForm({
      name: '',
      description: '',
      chiefId: '',
      selectedMembers: []
    });
  };

  const getParticipantById = (participantId: string) => {
    if (!participantId) return null;

    // Try to find by id (formatted like "owner-188")
    let participant = participants.find(p => p.id === participantId);

    // If not found, try to find by memberId (numeric ID like "188")
    if (!participant) {
      participant = participants.find(p => p.memberId === participantId);
    }

    // If still not found, try to extract numeric ID and match
    if (!participant) {
      const numericId = participantId.match(/(\d+)$/)?.[1];
      if (numericId) {
        participant = participants.find(p =>
          p.memberId === numericId ||
          p.id === numericId ||
          p.id?.endsWith(`-${numericId}`)
        );
      }
    }

    return participant || null;
  };

  // const getAvailableParticipants = (excludeTeamId?: string) => {
  //   if (!excludeTeamId) return participants;

  //   const team = teams.find(t => t.id === excludeTeamId);
  //   if (!team) return participants;

  //   return participants.filter(p => !team.members.includes(p.id));
  // };

  const getFilteredParticipants = () => {
    const available = participants.filter(participant =>
      !newTeamForm.selectedMembers.includes(participant.id)
    );

    if (!memberSearchTerm.trim()) {
      return available;
    }

    const searchLower = memberSearchTerm.toLowerCase();
    return available.filter(participant => {
      const p = participant as any;
      return participant.name.toLowerCase().includes(searchLower) ||
        participant.profession.toLowerCase().includes(searchLower) ||
        (p.userRole && translateRole(p.userRole).toLowerCase().includes(searchLower)) ||
        (p.school_level_name && p.school_level_name.toLowerCase().includes(searchLower));
    });
  };

  // Task management functions (currently unused - kept for future implementation)
  // const handleCreateTask = () => {
  //   setIsCreateTaskModalOpen(true);
  //   setNewTaskForm({
  //     title: '',
  //     description: '',
  //     assigneeType: 'individual',
  //     assigneeId: '',
  //     startDate: '',
  //     dueDate: '',
  //     priority: 'medium'
  //   });
  // };

  // const handleEditTask = (task: any) => {
  //   setSelectedTask(task);
  //   setNewTaskForm({
  //     title: task.title,
  //     description: task.description,
  //     assigneeType: task.assigneeType,
  //     assigneeId: task.assigneeId,
  //     startDate: task.startDate,
  //     dueDate: task.dueDate,
  //     priority: task.priority
  //   });
  //   setIsEditTaskModalOpen(true);
  // };

  const handleSaveTask = () => {
    if (!newTaskForm.title.trim()) {
      showWarning('Veuillez saisir un titre de tâche');
      return;
    }

    if (!newTaskForm.assigneeId) {
      showWarning('Veuillez sélectionner un assigné');
      return;
    }

    const assigneeName = newTaskForm.assigneeType === 'team'
      ? teams.find(t => t.id === newTaskForm.assigneeId)?.name || ''
      : participants.find(p => p.id === newTaskForm.assigneeId)?.name || '';

    const newTask = {
      id: selectedTask ? selectedTask.id : Date.now().toString(),
      title: newTaskForm.title,
      description: newTaskForm.description,
      status: selectedTask ? selectedTask.status : 'todo',
      assigneeType: newTaskForm.assigneeType,
      assigneeId: newTaskForm.assigneeId,
      assigneeName,
      startDate: newTaskForm.startDate,
      dueDate: newTaskForm.dueDate,
      priority: newTaskForm.priority,
      createdAt: selectedTask ? selectedTask.createdAt : new Date().toISOString().split('T')[0],
      createdBy: selectedTask ? selectedTask.createdBy : 'Sophie Martin'
    };

    if (selectedTask) {
      setTasks(tasks.map(task => task.id === selectedTask.id ? newTask : task));
    } else {
      setTasks([...tasks, newTask]);
    }

    handleCancelTaskForm();
  };

  const handleCancelTaskForm = () => {
    setIsCreateTaskModalOpen(false);
    setIsEditTaskModalOpen(false);
    setSelectedTask(null);
    setNewTaskForm({
      title: '',
      description: '',
      assigneeType: 'individual',
      assigneeId: '',
      startDate: '',
      dueDate: '',
      priority: 'medium'
    });
  };

  // Task management functions (currently unused - kept for future implementation)
  // const handleDeleteTask = (taskId: string) => {
  //   if (window.confirm('Êtes-vous sûr de vouloir supprimer cette tâche ?')) {
  //     setTasks(tasks.filter(task => task.id !== taskId));
  //   }
  // };

  // const handleTaskDrag = (taskId: string, newStatus: string) => {
  //   setTasks(tasks.map(task => 
  //     task.id === taskId ? { ...task, status: newStatus } : task
  //   ));
  // };

  // const getTasksByStatus = (status: string) => {
  //   return tasks.filter(task => task.status === status);
  // };

  // const getPriorityColor = (priority: string) => {
  //   switch (priority) {
  //     case 'high': return '#ef4444';
  //     case 'medium': return '#f59e0b';
  //     case 'low': return '#10b981';
  //     default: return '#6b7280';
  //   }
  // };

  // const getPriorityLabel = (priority: string) => {
  //   switch (priority) {
  //     case 'high': return 'Haute';
  //     case 'medium': return 'Moyenne';
  //     case 'low': return 'Basse';
  //     default: return 'Non définie';
  //   }
  // };

  const handleAddParticipant = async () => {
    // Prevent adding participants if project is ended
    if (isProjectEnded) {
      showError('Impossible d\'ajouter des participants à un projet terminé');
      return;
    }

    setIsLoadingAvailableMembers(true);
    try {
      const members = await fetchAvailableMembers();
      setAvailableMembers(members);
      setIsAddParticipantModalOpen(true);
    } catch (error) {
      console.error('Error loading available members:', error);
      showError('Erreur lors du chargement des membres disponibles');
    } finally {
      setIsLoadingAvailableMembers(false);
    }
  };

  const handleAddParticipantSubmit = async (participantData: {
    id: string;
    memberId: string;
    name: string;
    profession: string;
    email: string;
    avatar: string;
    skills: string[];
    availability: string[];
    organization: string;
  }) => {
    if (!project?.id) return;

    try {
      const projectId = parseInt(project.id);
      const userId = parseInt(participantData.memberId);

      console.log('Adding participant:', { projectId, userId, participantData });

      if (isNaN(projectId) || isNaN(userId) || !participantData.memberId) {
        console.error('Invalid data:', { projectId, userId, memberId: participantData.memberId });
        showError('Données invalides');
        return;
      }

      // Add member via API
      await addProjectMember(projectId, userId);

      showSuccess(`${participantData.name} a été ajouté au projet`);

      // Reload participants
      // Reset refs to allow reload
      lastLoadedProjectIdRef.current = null;
      previousIdsRef.current = { projectId: null, apiProjectId: null };
      const members = await fetchAllProjectMembers();
      setParticipants(members);

      // Reload project stats
      const stats = await getProjectStats(projectId);
      setProjectStats(stats);

      setIsAddParticipantModalOpen(false);
    } catch (error: any) {
      console.error('Error adding participant:', error);
      const errorMessage = error.response?.data?.message || 'Erreur lors de l\'ajout du participant';

      // Specific error messages
      if (error.response?.status === 403) {
        if (errorMessage.includes('cannot be added')) {
          showError('Cet utilisateur ne peut pas être ajouté au projet');
        } else {
          showError('Vous n\'avez pas la permission d\'ajouter des membres');
        }
      } else if (error.response?.status === 409) {
        showError('Cet utilisateur est déjà membre du projet');
      } else if (error.response?.status === 404) {
        showError('Utilisateur non trouvé');
      } else {
        showError(errorMessage);
      }
    }
  };

  /**
   * Get current role value for the role selector
   */
  const getCurrentRoleValue = (participant: any): string => {
    if (participant.role === 'owner' || participant.role === 'co-owner') {
      return participant.role; // For display, but selector disabled
    }

    if (participant.role === 'admin') {
      return 'admin';
    }

    // Member with badge permission
    if (participant.role === 'member' && participant.canAssignBadges) {
      return 'member-with-badges';
    }

    // Regular member
    return 'member';
  };

  /**
   * Check if role can be changed for this participant
   */
  const canChangeRole = (participant: any): boolean => {
    // Cannot change roles on a finished project
    if (isProjectEnded) {
      return false;
    }

    // Owner and co-owner roles cannot be changed
    return participant.role !== 'owner' && participant.role !== 'co-owner';
  };

  /**
   * Check if current user can create admins
   */
  const canCreateAdmins = (): boolean => {
    if (!apiProjectData || !state.user?.id) return false;

    const userIdStr = state.user.id.toString();

    // Check if user is owner
    if (apiProjectData.owner?.id?.toString() === userIdStr) {
      return true;
    }

    // Check if user is co-owner
    if (apiProjectData.co_owners && Array.isArray(apiProjectData.co_owners)) {
      const isCoOwner = apiProjectData.co_owners.some((co: any) =>
        co.id?.toString() === userIdStr
      );
      if (isCoOwner) {
        return true;
      }
    }

    return false;
  };

  /**
   * Determine if current user can remove a specific participant
   */
  const canUserRemoveParticipant = (participant: any, currentUserRole: string | null): boolean => {
    if (!currentUserRole) return false;

    // Owner can remove everyone except themselves
    if (currentUserRole === 'owner') {
      return participant.role !== 'owner';
    }

    // Co-owner can remove members and admins, but not co-owners or owner
    if (currentUserRole === 'co-owner') {
      return participant.role === 'member' || participant.role === 'admin';
    }

    // Admin can only remove regular members
    if (currentUserRole === 'admin') {
      return participant.role === 'member';
    }

    return false;
  };

  /**
   * Determine if current user can see the remove button
   */
  const canUserSeeRemoveButton = (currentUserRole: string | null): boolean => {
    return currentUserRole === 'owner' || currentUserRole === 'co-owner' || currentUserRole === 'admin';
  };

  /**
   * Handle role change for a participant
   */
  const handleRoleChange = async (participant: any, newRoleValue: string) => {
    if (!project?.id || !canChangeRole(participant)) return;

    // Parse new role value
    let role: 'member' | 'admin' = 'member';
    let canAssignBadges = false;

    if (newRoleValue === 'admin') {
      // Check if current user can create admins
      if (!canCreateAdmins()) {
        showError('Seul le responsable du projet ou un co-responsable peut créer des admins');
        return;
      }
      role = 'admin';
      canAssignBadges = false;
    } else if (newRoleValue === 'member-with-badges') {
      // Check if current user can grant badge permissions
      if (!canCreateAdmins()) {
        showError('Seul le responsable du projet ou un co-responsable peut accorder les permissions de badges');
        return;
      }
      role = 'member';
      canAssignBadges = true;
    } else {
      role = 'member';
      canAssignBadges = false;
    }

    try {
      const projectId = parseInt(project.id);
      const userId = parseInt(participant.memberId);

      if (isNaN(projectId) || isNaN(userId)) {
        showError('Données invalides');
        return;
      }

      await updateProjectMember(projectId, userId, {
        role: role,
        can_assign_badges_in_project: canAssignBadges
      });

      showSuccess(`Rôle de ${participant.name} mis à jour avec succès`);

      // Reload participants to reflect changes (more reliable than local update)
      const members = await fetchAllProjectMembers();
      setParticipants(members);

      // Reload project stats
      const stats = await getProjectStats(projectId);
      setProjectStats(stats);
    } catch (error: any) {
      console.error('Error updating role:', error);
      const errorMessage = error.response?.data?.message || 'Erreur lors de la mise à jour du rôle';

      // Specific error messages
      if (error.response?.status === 403) {
        if (errorMessage.includes('Only project owner or co-owner can create admins')) {
          showError('Seul le responsable du projet ou un co-responsable peut créer des admins');
        } else if (errorMessage.includes('Only project owner or co-owner can grant badge permissions')) {
          showError('Seul le responsable du projet ou un co-responsable peut accorder les permissions de badges');
        } else {
          showError('Vous n\'avez pas la permission de modifier ce rôle');
        }
      } else {
        showError(errorMessage);
      }
    }
  };

  const handleCopyLink = () => {
    const projectUrl = `${window.location.origin}/projects/${project.id}`;
    navigator.clipboard.writeText(projectUrl);
    console.log('Link copied:', projectUrl);
  };

  const handleReturnToProjects = () => {
    setCurrentPage('projects');
  };

  // Photo navigation functions
  const allPhotos = project.image ? [project.image, ...(project.additionalPhotos || [])] : (project.additionalPhotos || []);

  const nextPhoto = () => {
    setCurrentPhotoIndex((prev) => (prev + 1) % allPhotos.length);
  };

  const prevPhoto = () => {
    setCurrentPhotoIndex((prev) => (prev - 1 + allPhotos.length) % allPhotos.length);
  };

  const selectPhoto = (index: number) => {
    setCurrentPhotoIndex(index);
  };

  // Format date from ISO string or YYYY-MM-DD to DD-MM-YYYY
  const formatDate = (dateString: string) => {
    // Check if date string is valid
    if (!dateString || dateString.trim() === '') {
      return 'Non renseigné';
    }

    // Handle ISO string format
    const date = new Date(dateString);

    // Check if date is valid
    if (Number.isNaN(date.getTime())) {
      return 'Non renseigné';
    }

    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear().toString().slice(-2); // Get last 2 digits of year
    return `${day}-${month}-${year}`;
  };

  // Format date range (start - end), returns single "Non renseigné" if both dates are invalid
  const formatDateRange = (startDate: string, endDate: string) => {
    const formattedStart = formatDate(startDate);
    const formattedEnd = formatDate(endDate);

    // If both dates are invalid, return single "Non renseigné"
    if (formattedStart === 'Non renseigné' && formattedEnd === 'Non renseigné') {
      return 'Non renseigné';
    }

    // Otherwise, return the range
    return `${formattedStart} - ${formattedEnd}`;
  };

  // Toggle comment collapse
  const toggleComment = (badgeId: string) => {
    setCollapsedComments(prev => {
      const newSet = new Set(prev);
      if (newSet.has(badgeId)) {
        newSet.delete(badgeId);
      } else {
        newSet.add(badgeId);
      }
      return newSet;
    });
  };

  // Export MLDS information to PDF
  const handleExportMLDSPDF = () => {
    if (!apiProjectData?.mlds_information) return;

    const doc = new jsPDF();
    const mldsInfo = apiProjectData.mlds_information;
    let yPosition = 25;
    const lineHeight = 5.5;
    const pageHeight = doc.internal.pageSize.getHeight();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 25;
    const textColor = [40, 40, 40]; // Gris très foncé
    const labelColor = [120, 120, 120]; // Gris moyen
    const accentColor = [100, 100, 100]; // Gris foncé pour compatibilité
    const primaryColor = [41, 98, 255]; // Bleu pour compatibilité

    // Helper function to check if we need a new page
    const checkNewPage = (requiredSpace = 10) => {
      if (yPosition + requiredSpace > pageHeight - margin) {
        doc.addPage();
        addPageNumber();
        yPosition = margin;
        return true;
      }
      return false;
    };

    // Helper function to add page number
    const addPageNumber = () => {
      const pageCount = doc.getCurrentPageInfo().pageNumber;
      doc.setFontSize(8);
      doc.setTextColor(180, 180, 180);
      doc.text(`Page ${pageCount}`, pageWidth / 2, pageHeight - 15, { align: 'center' });
      doc.setTextColor(textColor[0], textColor[1], textColor[2]);
    };

    // Helper function to add text with word wrap
    const addWrappedText = (text: string, x: number, maxWidth: number, isBold = false) => {
      if (isBold) {
        doc.setFont('helvetica', 'bold');
      } else {
        doc.setFont('helvetica', 'normal');
      }
      const lines = doc.splitTextToSize(text, maxWidth);
      lines.forEach((line: string) => {
        checkNewPage();
        doc.text(line, x, yPosition);
        yPosition += lineHeight;
      });
    };

    // Helper function to add section header
    const addSectionHeader = (title: string) => {
      checkNewPage(15);
      yPosition += 2;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(textColor[0], textColor[1], textColor[2]);
      doc.text(title.toUpperCase(), margin, yPosition);
      doc.setDrawColor(220, 220, 220);
      doc.setLineWidth(0.3);
      doc.line(margin, yPosition + 2, pageWidth - margin, yPosition + 2);
      doc.setTextColor(textColor[0], textColor[1], textColor[2]);
      yPosition += 7;
    };

    // Clean minimal header
    doc.setTextColor(textColor[0], textColor[1], textColor[2]);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'normal');
    doc.text('Projet MLDS', margin, yPosition);
    yPosition += 7;
    doc.setFontSize(9);
    doc.setTextColor(labelColor[0], labelColor[1], labelColor[2]);
    doc.text('Mission de Lutte contre le Décrochage Scolaire - Volet Persévérance', margin, yPosition);
    yPosition += 10;
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(textColor[0], textColor[1], textColor[2]);
    const titleLines = doc.splitTextToSize(project.title, pageWidth - 2 * margin);
    titleLines.forEach((line: string) => {
      doc.text(line, margin, yPosition);
      yPosition += 6;
    });

    // ==================== INFORMATIONS GÉNÉRALES ====================
    addSectionHeader('Informations générales');
    doc.setFontSize(9);

    // Description
    if (project.description) {
      checkNewPage(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(labelColor[0], labelColor[1], labelColor[2]);
      doc.text('Description', margin, yPosition);
      yPosition += lineHeight;
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(textColor[0], textColor[1], textColor[2]);
      addWrappedText(project.description, margin, pageWidth - 2 * margin);
      yPosition += 2;
    }

    // Grid layout for key info
    checkNewPage(15);
    const col1 = margin;
    const col2 = margin + 50;

    // Row 1: Statut, Période
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(labelColor[0], labelColor[1], labelColor[2]);
    doc.text('STATUT', col1, yPosition);
    doc.text('PÉRIODE', col2, yPosition);
    yPosition += 4;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(textColor[0], textColor[1], textColor[2]);
    doc.text(getStatusText(project.status), col1, yPosition);
    doc.text(formatDateRange(project.startDate, project.endDate), col2, yPosition);
    yPosition += lineHeight + 3;

    // Row 2: Parcours, Organisation
    if (project.pathway || project.organization) {
      checkNewPage(10);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(labelColor[0], labelColor[1], labelColor[2]);
      if (project.pathway) doc.text('PARCOURS', col1, yPosition);
      if (project.organization) doc.text('ORGANISATION', col2, yPosition);
      yPosition += 4;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(textColor[0], textColor[1], textColor[2]);
      if (project.pathway) doc.text(project.pathway.toUpperCase(), col1, yPosition);
      if (project.organization) {
        const orgLines = doc.splitTextToSize(project.organization, 60);
        doc.text(orgLines[0], col2, yPosition);
      }
      yPosition += lineHeight + 3;
    }

    // Row 3: Participants
    checkNewPage(10);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(labelColor[0], labelColor[1], labelColor[2]);
    doc.text('PARTICIPANTS', col1, yPosition);
    yPosition += 4;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(textColor[0], textColor[1], textColor[2]);
    doc.text(`${projectStats?.overview?.total_members || project.participants || 0}`, col1, yPosition);
    yPosition += lineHeight + 3;

    // Responsable du projet
    if (project.responsible) {
      checkNewPage(12);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(labelColor[0], labelColor[1], labelColor[2]);
      doc.text('RESPONSABLE DU PROJET', margin, yPosition);
      yPosition += 4;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(textColor[0], textColor[1], textColor[2]);
      doc.text(project.responsible.name, margin, yPosition);
      yPosition += lineHeight;
      if (project.responsible.role || project.responsible.profession) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(labelColor[0], labelColor[1], labelColor[2]);
        doc.text(project.responsible.role || project.responsible.profession, margin, yPosition);
        yPosition += lineHeight - 0.5;
      }
      if (project.responsible.email) {
        doc.setFontSize(8);
        doc.text(project.responsible.email, margin, yPosition);
        yPosition += lineHeight;
      }
      doc.setTextColor(textColor[0], textColor[1], textColor[2]);
      yPosition += 2;
    }

    // Co-responsables
    if (project.coResponsibles && project.coResponsibles.length > 0) {
      checkNewPage(10);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(labelColor[0], labelColor[1], labelColor[2]);
      doc.text('CO-RESPONSABLES', margin, yPosition);
      yPosition += 4;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(textColor[0], textColor[1], textColor[2]);
      project.coResponsibles.forEach((coResp) => {
        checkNewPage(10);
        doc.text(coResp.name, margin, yPosition);
        if (coResp.email) {
          doc.text(` - ${coResp.email}`, margin + 45, yPosition);
        }
        yPosition += lineHeight;
      });
      yPosition += 2;
    }

    // Partenaire(s)
    const partnersList = (project.partners && project.partners.length > 0) ? project.partners : (project.partner ? [project.partner] : []);
    if (partnersList.length > 0) {
      checkNewPage(8 + partnersList.length * (lineHeight + 2));
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(labelColor[0], labelColor[1], labelColor[2]);
      doc.text(partnersList.length > 1 ? 'PARTENAIRES' : 'PARTENAIRE', margin, yPosition);
      yPosition += 4;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(textColor[0], textColor[1], textColor[2]);
      partnersList.forEach((p) => {
        doc.text(p.name, margin, yPosition);
        yPosition += lineHeight;
      });
      yPosition += 2;
    }

    // Tags
    if (project.tags && project.tags.length > 0) {
      checkNewPage(8);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(labelColor[0], labelColor[1], labelColor[2]);
      doc.text('TAGS', margin, yPosition);
      yPosition += 4;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(textColor[0], textColor[1], textColor[2]);
      const tagsText = project.tags.map(tag => `#${tag}`).join('  ');
      addWrappedText(tagsText, margin, pageWidth - 2 * margin);
      yPosition += 2;
    }

    // Organisations porteuses
    if (mldsInfo.organization_names && mldsInfo.organization_names.length > 0) {
      checkNewPage(10);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(labelColor[0], labelColor[1], labelColor[2]);
      doc.text('ORGANISATIONS PORTEUSES', margin, yPosition);
      yPosition += 4;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(textColor[0], textColor[1], textColor[2]);

      mldsInfo.organization_names.forEach((org: string) => {
        checkNewPage(7);
        doc.text(`• ${org}`, margin, yPosition);
        yPosition += lineHeight - 1;
      });

      yPosition += 2;
    }

    // ==================== INFORMATIONS MLDS ====================
    yPosition += 3;
    addSectionHeader('INFORMATIONS MLDS');
    doc.setFontSize(10);

    // Demande faite par et Public ciblé sur la même ligne si possible
    if (mldsInfo.requested_by) {
      checkNewPage(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(accentColor[0], accentColor[1], accentColor[2]);
      doc.text('Demande faite par', margin, yPosition);
      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'normal');
      const requestedByText = mldsInfo.requested_by === 'departement' ? 'Département' : 'Réseau foquale';
      doc.text(requestedByText, margin + 45, yPosition);
      yPosition += lineHeight + 2;
    }

    // Public ciblé
    if (mldsInfo.target_audience) {
      checkNewPage(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(accentColor[0], accentColor[1], accentColor[2]);
      doc.text('Public ciblé', margin, yPosition);
      doc.setTextColor(0, 0, 0);
      yPosition += lineHeight;
      doc.setFont('helvetica', 'normal');
      let targetText = '';
      if (mldsInfo.target_audience === 'students_without_solution') targetText = 'Élèves sans solution à la rentrée';
      else if (mldsInfo.target_audience === 'students_at_risk') targetText = 'Élèves en situation de décrochage repérés par le GPDS';
      else if (mldsInfo.target_audience === 'school_teams') targetText = 'Équipes des établissements';
      addWrappedText(targetText, margin + 2, 168);
      yPosition += 1;
    }

    // Effectifs prévisionnel
    if (mldsInfo.expected_participants != null) {
      checkNewPage(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(accentColor[0], accentColor[1], accentColor[2]);
      doc.text('Effectifs prévisionnel', margin, yPosition);
      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'normal');
      doc.text(`${mldsInfo.expected_participants} participants`, margin + 50, yPosition);
      yPosition += lineHeight + 2;
    }

    // Objectifs pédagogiques
    if (mldsInfo.objectives) {
      checkNewPage(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(accentColor[0], accentColor[1], accentColor[2]);
      doc.text('Objectifs pédagogiques', margin, yPosition);
      doc.setTextColor(0, 0, 0);
      yPosition += lineHeight;
      doc.setFont('helvetica', 'normal');
      addWrappedText(mldsInfo.objectives, margin + 2, 168);
      yPosition += 1;
    }

    // Objectifs de l'action
    if (mldsInfo.action_objectives && mldsInfo.action_objectives.length > 0) {
      checkNewPage(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(accentColor[0], accentColor[1], accentColor[2]);
      doc.text('Objectifs de l\'action', margin, yPosition);
      doc.setTextColor(0, 0, 0);
      yPosition += lineHeight;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);

      const objectiveLabels: { [key: string]: string } = {
        'path_security': 'Sécurisation des parcours (liaison inter-cycles)',
        'professional_discovery': 'Découverte des filières professionnelles',
        'student_mobility': 'Développement de la mobilité des élèves',
        'cps_development': 'Développement des CPS',
        'territory_partnership': 'Rapprochement avec les partenaires du territoire',
        'family_links': 'Renforcement des liens familles-élèves',
        'professional_development': 'Co-développement professionnel',
        'other': 'Autre'
      };

      mldsInfo.action_objectives.forEach((obj: string) => {
        checkNewPage(7);
        const label = objectiveLabels[obj] || obj;
        doc.text(`• ${label}`, margin + 2, yPosition);
        yPosition += lineHeight - 1;
      });

      if (mldsInfo.action_objectives_other) {
        checkNewPage(7);
        doc.setFont('helvetica', 'italic');
        doc.text(`  ${mldsInfo.action_objectives_other}`, margin + 4, yPosition);
        doc.setFont('helvetica', 'normal');
        yPosition += lineHeight;
      }
      doc.setFontSize(10);
      yPosition += 1;
    }

    // Compétences développées
    if (mldsInfo.competencies_developed) {
      checkNewPage(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(accentColor[0], accentColor[1], accentColor[2]);
      doc.text('Compétences développées', margin, yPosition);
      doc.setTextColor(0, 0, 0);
      yPosition += lineHeight;
      doc.setFont('helvetica', 'normal');
      addWrappedText(mldsInfo.competencies_developed, margin + 2, 168);
      yPosition += 1;
    }

    // Moyens financiers
    const hasFinancials = mldsInfo.financial_hse != null ||
      mldsInfo.financial_hv != null ||
      mldsInfo.financial_transport != null ||
      mldsInfo.financial_operating != null ||
      mldsInfo.financial_service != null;

    if (hasFinancials) {
      yPosition += 3;
      addSectionHeader('MOYENS FINANCIERS DEMANDÉS');
      doc.setFontSize(10);

      // HSE and HV on same line if possible
      if (mldsInfo.financial_hse != null || mldsInfo.financial_hv != null) {
        checkNewPage(8);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(accentColor[0], accentColor[1], accentColor[2]);
        doc.text('Heures supplémentaires', margin, yPosition);
        doc.setTextColor(0, 0, 0);
        yPosition += lineHeight;

        if (mldsInfo.financial_hse != null) {
          const amount = Number.parseFloat(mldsInfo.financial_hse);
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(9);
          doc.text('HSE', margin + 2, yPosition);
          doc.text(`${amount.toFixed(2)} heures`, margin + 40, yPosition);
          yPosition += lineHeight;
        }

        if (mldsInfo.financial_hv != null) {
          const amount = Number.parseFloat(mldsInfo.financial_hv);
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(9);
          doc.text('HV', margin + 2, yPosition);
          doc.text(`${amount.toFixed(2)} €`, margin + 40, yPosition);
          yPosition += lineHeight;
        }
        doc.setFontSize(10);
        yPosition += 1;
      }

      // Crédits
      let totalCredits = 0;
      const hasCredits = mldsInfo.financial_transport != null ||
        mldsInfo.financial_operating != null ||
        mldsInfo.financial_service != null;

      if (hasCredits) {
        checkNewPage(15);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(accentColor[0], accentColor[1], accentColor[2]);
        doc.text('Crédits', margin, yPosition);
        doc.setTextColor(0, 0, 0);
        yPosition += lineHeight;
        doc.setFontSize(9);

        if (mldsInfo.financial_transport != null) {
          const amount = Number.parseFloat(mldsInfo.financial_transport);
          totalCredits += amount;
          checkNewPage(6);
          doc.setFont('helvetica', 'normal');
          doc.text('Transport', margin + 2, yPosition);
          doc.text(`${amount.toFixed(2)} €`, margin + 50, yPosition);
          yPosition += lineHeight;
        }

        if (mldsInfo.financial_operating != null) {
          const amount = Number.parseFloat(mldsInfo.financial_operating);
          totalCredits += amount;
          checkNewPage(6);
          doc.setFont('helvetica', 'normal');
          doc.text('Fonctionnement', margin + 2, yPosition);
          doc.text(`${amount.toFixed(2)} €`, margin + 50, yPosition);
          yPosition += lineHeight;
        }

        if (mldsInfo.financial_service != null) {
          const amount = Number.parseFloat(mldsInfo.financial_service);
          totalCredits += amount;
          checkNewPage(6);
          doc.setFont('helvetica', 'normal');
          doc.text('Prestataires', margin + 2, yPosition);
          doc.text(`${amount.toFixed(2)} €`, margin + 50, yPosition);
          yPosition += lineHeight;
        }

        // Sous-total crédits (utiliser le backend si disponible)
        const creditsTotal = mldsInfo.total_financial_credits
          ? Number.parseFloat(mldsInfo.total_financial_credits)
          : totalCredits;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.text('Sous-total', margin + 2, yPosition);
        doc.text(`${creditsTotal.toFixed(2)} €`, margin + 50, yPosition);
        yPosition += lineHeight + 2;
        doc.setFontSize(10);
      }

      // Total général avec style (calculer uniquement avec les crédits, sans HSE et HV)
      checkNewPage(10);
      doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.setLineWidth(0.5);
      doc.line(margin, yPosition - 1, pageWidth - margin, yPosition - 1);
      yPosition += 2;

      // Utiliser total_financial_credits du backend si disponible, sinon calculer avec les crédits uniquement
      const totalGeneral = mldsInfo.total_financial_credits
        ? Number.parseFloat(mldsInfo.total_financial_credits)
        : totalCredits;
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text('TOTAL GÉNÉRAL', margin, yPosition + 2);
      doc.text(`${totalGeneral.toFixed(2)} €`, pageWidth - margin, yPosition + 2, { align: 'right' });
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(10);
    }

    // Save the PDF
    const fileName = `MLDS_${project.title.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);

    showSuccess('PDF exporté avec succès');
  };



  return (
    <section className="project-management-container with-sidebar">
      {/* Header with Return Button */}
      <div className="project-management-header">
        <div className="header-left">
          <button
            className="return-btn"
            onClick={handleReturnToProjects}
            title="Retour aux projets"
          >
            <i className="fas fa-arrow-left"></i>
          </button>
          <img src="/icons_logo/Icon=projet.svg" alt="Projets" className="section-icon" />
          <h2>Gestion du projet</h2>
        </div>
        <div className="header-right">
          <button type="button" className="btn btn-outline" onClick={handleCopyLink}>
            <i className="fas fa-link"></i> Copier le lien
          </button>
          {/* Close project button: only for owner, when project is in progress */}
          {!isProjectEnded && project.status === 'in_progress' && userProjectRole === 'owner' && !isSuperadminViewingReadOnly && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={openCloseProjectModal}
              disabled={isClosingProject}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <i className="fas fa-check-circle"></i>
              {isClosingProject ? 'Clôture...' : 'Clôturer le projet'}
            </button>
          )}
          {isMLDSProject && (
            <button type="button" className="btn btn-outline" onClick={handleExportMLDSPDF}>
              <i className="fas fa-file-pdf"></i> Exporter en PDF
            </button>
          )}
          {canAssignBadges && !isProjectEnded && !isSuperadminViewingReadOnly && (
            <button type="button" className="btn btn-primary" onClick={handleAssignBadge}>
              <i className="fas fa-award"></i> Attribuer un badge
            </button>
          )}
        </div>
      </div>

      {/* Project Info Section */}
      <div className="project-management-body">
        <div className="project-info-section-redesigned">
          {/* Left Column: Project Image Gallery */}
          <div className="project-image-column">
            <div className="project-cover-large">
              {allPhotos.length > 0 ? (
                <>
                  <img src={allPhotos[currentPhotoIndex]} alt={project.title} />
                  {allPhotos.length > 1 && (
                    <>
                      <button className="photo-nav-btn photo-nav-prev" onClick={prevPhoto}>
                        <i className="fas fa-chevron-left"></i>
                      </button>
                      <button className="photo-nav-btn photo-nav-next" onClick={nextPhoto}>
                        <i className="fas fa-chevron-right"></i>
                      </button>
                      <div className="photo-counter">
                        {currentPhotoIndex + 1} / {allPhotos.length}
                      </div>
                      <div className="photo-gallery-overlay">
                        <div className="gallery-thumbnails">
                          {allPhotos.map((photo, index) => (
                            <button
                              key={index}
                              className={`gallery-thumbnail ${index === currentPhotoIndex ? 'active' : ''}`}
                              onClick={() => selectPhoto(index)}
                            >
                              <img src={photo} alt={`${project.title} ${index + 1}`} />
                            </button>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </>
              ) : (
                <div className="default-project-image">
                  <i className="fas fa-image"></i>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Project Details */}
          <div className="project-details-column">
            {/* Top Part: Title, Status, Actions */}
            <div className="project-details-top">
              <div className="project-title-status-group">
                <h3 className="project-title-large">{project.title}</h3>
                <div className="project-status-pills">
                  <span className={`project-modal-status-pill ${getStatusClass(project.status)}`}>
                    {getStatusText(project.status)}
                  </span>
                </div>
              </div>
              <div className="project-actions-header">
                {/* Join button or role pill - show for all users when appropriate */}
                {canUserJoinProject() ? (
                  <div className="project-join-section" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={handleJoinProject}
                      disabled={isJoiningProject}
                      style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                    >
                      <i className="fas fa-plus"></i>
                      {isJoiningProject ? 'Envoi...' : 'Rejoindre'}
                    </button>
                  </div>
                ) : userProjectRole ? (
                  <span className="role-badge" style={{
                    padding: '0.5rem 1rem',
                    borderRadius: '20px',
                    backgroundColor: '#f0f0f0',
                    color: '#333',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    marginRight: '0.75rem'
                  }}>
                    {getRoleDisplayText(userProjectRole)}
                  </span>
                ) : null}
                {/* Edit button for owner only (hidden for superadmin in read-only view) */}
                {apiProjectData && userProjectRole === 'owner' && !isProjectEnded && !isSuperadminViewingReadOnly && (
                  <button type="button" className="btn-icon edit-btn" onClick={handleEdit} title="Modifier le projet">
                    <i className="fas fa-edit"></i>
                  </button>
                )}
              </div>
            </div>

            {/* Project Description */}
            <div className="project-description-section">
              <div className={`project-description-content ${!isDescriptionExpanded ? 'expanded' : 'collapsed'}`}>
                <p>{project.description}</p>
              </div>
              {project.description.length > 150 && (
                <button
                  className="description-toggle-btn"
                  onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
                >
                  {isDescriptionExpanded ? (
                    <>
                      <span>Voir moins</span>
                      <i className="fas fa-chevron-up"></i>
                    </>
                  ) : (
                    <>
                      <span>Voir plus</span>
                      <i className="fas fa-chevron-down"></i>
                    </>
                  )}
                </button>
              )}
            </div>

            {/* Middle Part: Meta Info and Tags */}
            <div className="project-details-middle">
              <div className="project-meta-row">
                <div className="meta-item">
                  <img src="/icons_logo/Icon=calendrier petit.svg" alt="Calendar" className="meta-icon" />
                  <span className="meta-text">{formatDateRange(project.startDate, project.endDate)}</span>
                </div>
                <div className="meta-item">
                  <img src="/icons_logo/Icon=Membres.svg" alt="Participants" className="meta-icon" />
                  <span className="meta-text">{project.participants} participants</span>
                </div>
                <div className="meta-item">
                  <img src="/icons_logo/Icon=Badges.svg" alt="Badges" className="meta-icon" />
                  <span className="meta-text">{isLoadingStats ? '...' : (projectStats?.badges?.total || 0)} badges</span>
                </div>
              </div>
              <div className="project-tags-row">
                {(() => {
                  const pathwayList = (project.pathways && project.pathways.length > 0)
                    ? project.pathways
                    : (project.pathway ? [project.pathway] : []);
                  if (pathwayList.length === 0) return null;
                  return (
                    <div className="pathway-section">
                      <div className="section-label">Parcours</div>
                      <div className="pathway-container">
                        {pathwayList.map((p, index) => (
                          <span key={`${p}-${index}`} className={`pathway-pill pathway-${pathwaySlug(p)}`}>{p}</span>
                        ))}
                      </div>
                    </div>
                  );
                })()}
                <div className="tags-section">
                  <div className="section-label">Tags</div>
                  <div className="project-tags">
                    {project.tags?.map((tag, index) => (
                      <span key={index} className="tag">#{tag}</span>
                    ))}
                  </div>
                </div>
                {(() => {
                  // Prefer raw API payload for school levels (it contains `school_levels`)
                  // Fallback to `project.school_levels` if present.
                  const schoolLevels =
                    (apiProjectData?.school_levels as any[] | undefined) ||
                    ((project as any)?.school_levels as any[] | undefined) ||
                    [];

                  if (!Array.isArray(schoolLevels) || schoolLevels.length === 0) return null;

                  return (
                    <div className="school_level-section">
                      <div className="section-label">Classes</div>
                      <div className="project-tags">
                        {schoolLevels.map((school_level: any) => (
                          <span key={school_level.id?.toString() || school_level.name} className="tag">
                            {school_level.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Bottom Part: Project Management Team */}
            <div className="project-details-bottom">
              {/* Responsable du projet */}
              <div className="project-manager-section">
                <div className="project-manager-header">
                  <h4>Responsable du projet</h4>
                </div>
                <div className="project-manager-info">
                  <div className="manager-left">
                    <div className="manager-avatar">
                      <AvatarImage src={project.responsible?.avatar || DEFAULT_AVATAR_SRC} alt="Project Manager" />
                    </div>
                    <div className="manager-details">
                      <div className="manager-name">{project.responsible?.name || project.owner}</div>
                      <div className="manager-role">
                        {translateRole(project.responsible?.role) || project.responsible?.profession || 'Membre'}
                        {project.responsible?.city && ` • ${project.responsible.city}`}
                      </div>
                    </div>
                  </div>
                  <div className="manager-right">
                    <div className="manager-organization">
                      <img src="/icons_logo/Icon=projet.svg" alt="Organization" className="manager-icon" />
                      <span className="manager-text">{toDisplayString(project.responsible?.organization)}</span>
                    </div>
                    <div className="manager-email">
                      <img src="/icons_logo/Icon=mail.svg" alt="Email" className="manager-icon" />
                      <span className="manager-text">{project.responsible?.email || ''}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Co-responsables */}
              {project.coResponsibles && project.coResponsibles.length > 0 && (
                <div className="project-co-responsibles-section">
                  <div className="project-manager-header">
                    <h4>Co-responsables</h4>
                  </div>
                  <div className="co-responsibles-list">
                    {project.coResponsibles.map((coResponsible, index) => (
                      <div key={coResponsible.id || index} className="co-responsible-item">
                        <div className="manager-left">
                          <div className="manager-avatar">
                            <AvatarImage src={coResponsible.avatar || DEFAULT_AVATAR_SRC} alt={coResponsible.name} />
                          </div>
                          <div className="manager-details">
                            <div className="manager-name">{coResponsible.name}</div>
                            <div className="manager-role">
                              {coResponsible.role || coResponsible.profession || 'Membre'}
                              {coResponsible.city && ` • ${coResponsible.city}`}
                            </div>
                          </div>
                        </div>
                        <div className="manager-right">
                          <div className="manager-organization">
                            <img src="/icons_logo/Icon=projet.svg" alt="Organization" className="manager-icon" />
                            <span className="manager-text">{toDisplayString(coResponsible.organization)}</span>
                          </div>
                          <div className="manager-email">
                            <img src="/icons_logo/Icon=mail.svg" alt="Email" className="manager-icon" />
                            <span className="manager-text">{coResponsible.email}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Partenaire(s) - from partnership_details */}
              {((project.partners && project.partners.length > 0) || project.partner) && (
                <div className="project-partner-section">
                  <div className="project-manager-header">
                    <h4>Partenaire{((project.partners?.length ?? 0) > 1 ? 's' : '')}</h4>
                  </div>
                  <div className="flex flex-col !items-start project-partner-info">
                    {(project.partners && project.partners.length > 0
                      ? project.partners
                      : project.partner ? [project.partner] : []
                    ).map((p) => (
                      <div key={p.id} className="manager-left">
                        <div className="manager-avatar">
                          <AvatarImage
                            src={p.logo || '/default-avatar.png'}
                            alt={p.name}
                            className="manager-avatar-img"
                          />
                        </div>
                        <div className="manager-details">
                          {/* <div className="manager-name">{p.name}</div> */}
                          <div className="manager-name">{toDisplayString(p.organization)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Project Management Tabs */}
        {shouldShowTabs() && (
          <div className="project-management-tabs">
            <button
              type="button"
              className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
              onClick={() => setActiveTab('overview')}
            >
              Vue d'ensemble
            </button>
            <button
              type="button"
              className={`tab-btn ${activeTab === 'requests' ? 'active' : ''}`}
              onClick={() => setActiveTab('requests')}
            >
              Demandes
            </button>
            <button
              type="button"
              className={`tab-btn ${activeTab === 'participants' ? 'active' : ''}`}
              onClick={() => setActiveTab('participants')}
            >
              Participants
            </button>
            <button
              type="button"
              className={`tab-btn ${activeTab === 'equipes' ? 'active' : ''}`}
              onClick={() => setActiveTab('equipes')}
            >
              Équipes
            </button>
            {false && (
              <button
                type="button"
                className={`tab-btn ${activeTab === 'kanban' ? 'active' : ''}`}
                onClick={() => setActiveTab('kanban')}
              >
                Kanban
              </button>
            )}
            <button
              type="button"
              className={`tab-btn ${activeTab === 'badges' ? 'active' : ''}`}
              onClick={() => setActiveTab('badges')}
            >
              Badges
            </button>
            <button
              type="button"
              className={`tab-btn ${activeTab === 'documents' ? 'active' : ''}`}
              onClick={() => setActiveTab('documents')}
            >
              Documents
            </button>
            {isMLDSProject && (
              <button
                type="button"
                className={`tab-btn ${activeTab === 'mlds-info' ? 'active' : ''}`}
                onClick={() => setActiveTab('mlds-info')}
              >
                Informations supplémentaires
              </button>
            )}
          </div>
        )}

        {/* Bannière vue lecture seule pour superadmin */}
        {isSuperadminViewingReadOnly && (
          <div className="project-readonly-banner" style={{
            padding: '0.75rem 1rem',
            backgroundColor: '#fef3c7',
            border: '1px solid #f59e0b',
            borderRadius: '8px',
            marginBottom: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontSize: '0.875rem',
            color: '#92400e'
          }}>
            <i className="fas fa-eye"></i>
            <span>Vue lecture seule (superadmin) — vous pouvez consulter tous les onglets et participants sans modifier le projet.</span>
          </div>
        )}

        {/* Tab Content */}
        {shouldShowTabs() && (
          <>
            {activeTab === 'overview' && (
              <div className="tab-content active overview-tab-content">
                <div className="overview-grid">
                  {/* Temporairement masqué - Fonctionnalité Kanban non implémentée */}
                  {false && (
                    <div className="stat-card">
                      <div className="stat-icon">
                        <i className="fas fa-chart-line"></i>
                      </div>
                      <div className="stat-content">
                        <div className="stat-value">{project.progress || 0}%</div>
                        <div className="stat-label">Progression</div>
                        <div className="progress-bar">
                          <div className="progress-fill" style={{ width: `${project.progress || 0}%` }}></div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Carte Jours restants */}
                  {(() => {
                    const daysRemaining = calculateDaysRemaining(project.endDate);
                    const status = getDaysRemainingStatus(daysRemaining);

                    return (
                      <div className="stat-card">
                        <div className="stat-icon">
                          <i className="fas fa-clock"></i>
                        </div>
                        <div className="stat-content">
                          <div className="stat-value">{Math.max(0, daysRemaining)}</div>
                          <div className="stat-label">Jours restants</div>
                          <div className={`stat-change ${status.className}`}>
                            {status.text}
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Temporairement masqué - Fonctionnalité Kanban non implémentée */}
                  {false && (
                    <div className="stat-card">
                      <div className="stat-icon">
                        <i className="fas fa-tasks"></i>
                      </div>
                      <div className="stat-content">
                        <div className="stat-value">12/18</div>
                        <div className="stat-label">Tâches complétées</div>
                        <div className="task-progress">
                          {Array.from({ length: 18 }, (_, i) => (
                            <div key={i} className={`task-bar ${i < 12 ? 'completed' : ''}`}></div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Carte Participants */}
                  {(() => {
                    const newMembersThisMonth = calculateNewMembersThisMonth(apiProjectData);

                    return (
                      <div className="stat-card">
                        <div className="stat-icon">
                          <i className="fas fa-users"></i>
                        </div>
                        <div className="stat-content">
                          <div className="stat-value">
                            {isLoadingStats ? '...' : (projectStats?.overview?.total_members || 0)}
                          </div>
                          <div className="stat-label">Participants</div>
                          <div className="stat-change positive">
                            +{newMembersThisMonth} nouveaux ce mois
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Carte Badges attribués */}
                  <div className="stat-card">
                    <div className="stat-icon">
                      <i className="fas fa-award"></i>
                    </div>
                    <div className="stat-content">
                      <div className="stat-value">
                        {isLoadingStats ? '...' : (projectStats?.badges?.total || 0)}
                      </div>
                      <div className="stat-label">Badges attribués</div>
                      <div className="stat-change positive">
                        +{isLoadingStats ? '...' : (projectStats?.badges?.this_month || 0)} ce mois
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'participants' && (
              <div className="tab-content">
                <div className="members-section">
                  <div className="members-table">
                    {participants.map((participant) => (
                      <div key={participant.id} className="member-row">
                        <div className="member-avatar">
                          <AvatarImage src={participant.avatar} alt={participant.name} />
                        </div>
                        <div className="member-info">
                          {participant.is_deleted ? (
                            <DeletedUserDisplay
                              user={{
                                full_name: participant.name,
                                email: participant.email,
                                is_deleted: true
                              }}
                              showEmail={false}
                            />
                          ) : (
                            <div className="member-name">{participant.name}</div>
                          )}
                          {toDisplayString(participant.organization) && (
                            <div className="member-organization" style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '0.25rem' }}>
                              {toDisplayString(participant.organization)}
                            </div>
                          )}
                          {(participant as any).school_level_name && (
                            <div className="member-school-level" style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '0.25rem' }}>
                              {(participant as any).school_level_name}
                            </div>
                          )}
                          {(translateRole((participant as any).userRole) || participant.profession) && (
                            <div className="member-profession" style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '0.25rem' }}>
                              {(participant as any).userRole ? translateRole((participant as any).userRole) : participant.profession}
                            </div>
                          )}
                        </div>
                        <div className={`member-badge ${participant.role === 'owner' ? 'badge-admin' : participant.role === 'co-owner' ? 'badge-admin' : participant.role === 'admin' ? 'badge-admin' : ''}`}>
                          {participant.role === 'owner' ? 'Responsable du projet' :
                            participant.role === 'co-owner' ? 'Co-responsable du projet' :
                              participant.role === 'admin' ? 'Admin' :
                                'Membre'}
                        </div>
                        <div className="member-skills">
                          {(participant.skills || []).map((skill: string, idx: number) => (
                            <span key={idx} className="tag skill">
                              <i className="fas fa-star"></i> {skill}
                            </span>
                          ))}
                        </div>
                        <div className="member-availability">
                          {(participant.availability || []).map((day: string, idx: number) => (
                            <span key={idx} className="tag availability">{day}</span>
                          ))}
                        </div>
                        <div className="member-actions">
                          {canAssignBadges && !isProjectEnded && !isSuperadminViewingReadOnly && (
                            <button
                              type="button"
                              className="btn-icon badge-btn"
                              title="Attribuer un badge"
                              onClick={() => {
                                setSelectedParticipantForBadge(participant.memberId);
                                setIsBadgeModalOpen(true);
                              }}
                            >
                              <img src="/icons_logo/Icon=Badges.svg" alt="Attribuer un badge" className="action-icon" />
                            </button>
                          )}
                          {/* Show remove button if user can see it and participant can be removed */}
                          {canUserSeeRemoveButton(userProjectRole) && participant.canRemove && !isProjectEnded && !isSuperadminViewingReadOnly && (
                            <button
                              type="button"
                              className="btn-icon"
                              title="Retirer"
                              onClick={() => handleRemoveParticipant(participant.id)}
                            >
                              <img src="/icons_logo/Icon=trash.svg" alt="Delete" className="action-icon" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'requests' && (
              <div className="tab-content active">
                <div className="requests-section">
                  <div className="section-header">
                    <h3>Demandes de participation</h3>
                    <span className="request-count">{requests.length} demande{requests.length > 1 ? 's' : ''}</span>
                  </div>

                  {isLoadingRequests ? (
                    <div className="no-requests">
                      <i className="fas fa-spinner fa-spin"></i>
                      <p>Chargement des demandes...</p>
                    </div>
                  ) : requests.length === 0 ? (
                    <div className="no-requests">
                      <i className="fas fa-inbox no-requests-icon"></i>
                      <h3>Aucune demande en attente</h3>
                      <p>Toutes les demandes de participation ont été traitées</p>
                    </div>
                  ) : (
                    <div className="requests-grid">
                      {requests.map((request) => (
                        <div key={request.id} className="request-card">
                          <div className="request-header">
                            <div className="request-avatar">
                              <AvatarImage src={request.avatar} alt={request.name} />
                            </div>
                            <div className="request-info">
                              <h4 className="request-name">{request.name}</h4>
                              <p className="request-profession">{request.profession}</p>
                              <p className="request-email">{request.email}</p>
                              <p className="request-date">Demandé le {request.requestDate}</p>
                            </div>
                          </div>

                          <div className="request-skills">
                            <h4>Compétences</h4>
                            <div className="skills-list">
                              {request.skills.map((skill: string, index: number) => (
                                <span key={index} className="skill-pill">{skill}</span>
                              ))}
                            </div>
                          </div>

                          <div className="request-availability">
                            <h4>Disponibilités</h4>
                            <div className="availability-list">
                              {request !== null && request?.availability.length !== 0 && request?.availability?.map((day: string, index: number) => (
                                <span key={index} className="availability-pill">{day}</span>
                              ))}
                            </div>
                          </div>

                          {!isSuperadminViewingReadOnly && (
                            <div className="request-actions">
                              <div className="action-buttons">
                                <button
                                  className="btn-accept"
                                  onClick={() => handleAcceptRequest(request.id)}
                                >
                                  <i className="fas fa-check"></i>
                                  Accepter
                                </button>
                                <button
                                  className="btn-reject"
                                  onClick={() => handleRejectRequest(request.id)}
                                >
                                  <i className="fas fa-times"></i>
                                  Rejeter
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'participants' && (
              <div className="tab-content active">
                <div className="participants-section">
                  <div className="section-header">
                    <h3>Participants du projet</h3>
                    {!isProjectEnded && !isSuperadminViewingReadOnly && (
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={handleAddParticipant}
                      >
                        <i className="fas fa-plus"></i>
                        Ajouter un participant
                      </button>
                    )}
                  </div>

                  <div className="participants-table">
                    {participants.map((participant) => (
                      <div key={participant.id} className="request-card">
                        <div className="request-header">
                          <div className="request-avatar">
                            <AvatarImage src={participant.avatar} alt={participant.name} />
                          </div>
                          <div className="request-info">
                            <h4 className="request-name">{participant.name}</h4>
                            <p className="request-profession">{(participant as any).userRole ? translateRole((participant as any).userRole) : participant.profession}</p>
                            {(participant as any).school_level_name && (
                              <p className="text-sm request-school-level bg-[--primary-light]">classe : {(participant as any).school_level_name}</p>
                            )}
                            <p className="request-email" title={participant.email}>{participant.email}</p>
                            <p className="request-date">{toDisplayString(participant.organization)}</p>
                          </div>
                        </div>

                        {participant.skills && participant.skills.length > 0 && (
                          <ParticipantSkillsList skills={participant.skills} />
                        )}
                        {participant.availability && participant.availability.length > 0 && (
                          <ParticipantAvailabilityList availability={participant.availability} />
                        )}

                        <div className="request-role-selector" style={{ marginTop: '0.75rem' }}>
                          <h4>Rôle dans le projet</h4>
                          <select
                            value={getCurrentRoleValue(participant)}
                            onChange={(e) => handleRoleChange(participant, e.target.value)}
                            disabled={!canChangeRole(participant)}
                            style={{
                              width: '100%',
                              padding: '0.5rem',
                              borderRadius: '0.375rem',
                              border: '1px solid #d1d5db',
                              fontSize: '0.875rem',
                              backgroundColor: !canChangeRole(participant) ? '#f3f4f6' : 'white',
                              cursor: !canChangeRole(participant) ? 'not-allowed' : 'pointer',
                              color: !canChangeRole(participant) ? '#6b7280' : '#111827'
                            }}
                          >
                            {participant.role === 'owner' && (
                              <option value="owner">Responsable du projet</option>
                            )}
                            {participant.role === 'co-owner' && (
                              <option value="co-owner">Co-responsable du projet</option>
                            )}
                            {participant.role !== 'owner' && participant.role !== 'co-owner' && (
                              <>
                                <option value="member">Participant</option>
                                <option value="member-with-badges">Participant avec droit de badges</option>
                                <option value="admin">Admin</option>
                              </>
                            )}
                          </select>
                        </div>
                        {!isProjectEnded && (
                          <div className="request-actions">
                            <div className="action-buttons">
                              {canUserSeeRemoveButton(userProjectRole) && participant.canRemove && (
                                <button
                                  className="btn-reject"
                                  onClick={() => handleRemoveParticipant(participant.id)}
                                  title="Retirer du projet"
                                >
                                  <i className="fas fa-user-minus"></i>
                                  Retirer
                                </button>
                              )}
                              {canAssignBadges && (
                                <button
                                  className="btn-accept"
                                  onClick={() => handleAwardBadge(participant.memberId)}
                                  title="Attribuer un badge"
                                >
                                  <i className="fas fa-award"></i>
                                  Badge
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'equipes' && (
              <div className="tab-content active">
                <div className="teams-section">
                  <div className="section-header">
                    <div className="section-title-left">
                      <img src="/icons_logo/Icon=Membres.svg" alt="Équipes" className="section-icon" />
                      <h3>Gestion des équipes</h3>
                    </div>
                    <div className="section-actions">
                      <span className="team-count">{teams.length} équipe{teams.length > 1 ? 's' : ''}</span>
                      {shouldShowTabs() && !isProjectEnded && !isSuperadminViewingReadOnly && (
                        <button className="btn btn-primary" onClick={handleCreateTeam}>
                          <i className="fas fa-plus"></i>
                          Créer une équipe
                        </button>
                      )}
                    </div>
                  </div>

                  {isLoadingTeams ? (
                    <div className="loading-state">
                      <p>Chargement des équipes...</p>
                    </div>
                  ) : teams.length === 0 ? (
                    <div className="empty-state">
                      <div className="empty-state-icon">
                        <i className="fas fa-users"></i>
                      </div>
                      <h4>Aucune équipe créée</h4>
                      <p>Créez votre première équipe pour organiser vos participants et améliorer la collaboration.</p>
                      {shouldShowTabs() && !isProjectEnded && !isSuperadminViewingReadOnly && (
                        <button className="btn btn-primary" onClick={handleCreateTeam}>
                          <i className="fas fa-plus"></i>
                          Créer une équipe
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="teams-table-container">
                      <div className="teams-table">
                        <div className="teams-table-header">
                          <div className="team-col-name">Équipe</div>
                          <div className="team-col-chief">Chef d'équipe</div>
                          <div className="team-col-members">Membres</div>
                          <div className="team-col-actions">Actions</div>
                        </div>
                        <div className="teams-table-body">
                          {teams.map((team) => {
                            const chief = getParticipantById(team.chiefId);
                            const teamMembers = team.members.map((memberId: string) => getParticipantById(memberId)).filter(Boolean);

                            return (
                              <div key={team.id} className="team-row">
                                <div className="team-col-name">
                                  <div className="team-info">
                                    <div className="team-number">Équipe {team.number}</div>
                                    <div className="team-name">{team.name}</div>
                                  </div>
                                </div>
                                <div className="team-col-chief">
                                  {chief ? (
                                    <div className="chief-info">
                                      <AvatarImage src={chief.avatar} alt={chief.name} className="chief-avatar" />
                                      <div className="chief-details">
                                        <div className="chief-name">{chief.name}</div>
                                        <div className="chief-role">{chief.profession}</div>
                                      </div>
                                    </div>
                                  ) : (
                                    <span className="no-chief">Non défini</span>
                                  )}
                                </div>
                                <div className="team-col-members">
                                  <div className="members-display">
                                    <div className="members-avatars">
                                      {teamMembers.slice(0, 5).map((member: any) => member && (
                                        <div key={member.id} className="member-avatar-small" title={member.name}>
                                          <AvatarImage src={member.avatar} alt={member.name} />
                                        </div>
                                      ))}
                                      {teamMembers.length > 5 && (
                                        <div className="member-avatar-small more-members" title={`${teamMembers.length - 5} autres membres`}>
                                          +{teamMembers.length - 5}
                                        </div>
                                      )}
                                    </div>
                                    <div className="member-count">{teamMembers.length} membre{teamMembers.length > 1 ? 's' : ''}</div>
                                  </div>
                                </div>
                                <div className="team-col-actions">
                                  <div className="team-actions">
                                    <button
                                      className="btn-icon view-btn"
                                      title="Voir les détails"
                                      onClick={() => handleViewTeamDetails(team)}
                                    >
                                      <i className="fas fa-eye"></i>
                                    </button>
                                    {shouldShowTabs() && !isProjectEnded && !isSuperadminViewingReadOnly && (
                                      <>
                                        <button
                                          className="btn-icon edit-btn"
                                          title="Modifier l'équipe"
                                          onClick={() => handleEditTeam(team)}
                                        >
                                          <i className="fas fa-edit"></i>
                                        </button>
                                        <button
                                          className="btn-icon delete-btn"
                                          title="Supprimer l'équipe"
                                          onClick={() => handleDeleteTeam(team.id)}
                                        >
                                          <i className="fas fa-trash"></i>
                                        </button>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}


            {activeTab === 'badges' && (
              <div className="tab-content active">
                <div className="badges-section">
                  <div className="badges-section-header">
                    <h3>Badges attribués</h3>
                  </div>

                  <div className="badges-filters">
                    <div className="filter-group">
                      <label>Par série</label>
                      <select
                        value={badgeSeriesFilter}
                        onChange={(e) => {
                          setBadgeSeriesFilter(e.target.value);
                          setBadgeLevelFilter('');
                          setBadgeDomainFilter('');
                          setBadgePage(1); // Reset to page 1 when filter changes
                        }}
                      >
                        <option value="">Toutes les séries</option>
                        <option value="Série Soft Skills 4LAB">Soft Skills 4LAB</option>
                        <option value="Série Parcours des possibles">Série Parcours des possibles</option>
                        <option value="Série Audiovisuelle">Série Audiovisuelle</option>
                        <option value="Série Parcours professionnel">Série Parcours professionnel</option>
                      </select>
                    </div>

                    {(badgeSeriesFilter === 'Série Soft Skills 4LAB' ||
                      badgeSeriesFilter === 'Série Parcours des possibles' ||
                      badgeSeriesFilter === 'Série Audiovisuelle' ||
                      badgeSeriesFilter === 'Série Parcours professionnel') && (
                        <div className="filter-group">
                          <label>Par niveau</label>
                          <select
                            value={badgeLevelFilter}
                            onChange={(e) => {
                              setBadgeLevelFilter(e.target.value);
                              setBadgePage(1); // Reset to page 1 when filter changes
                            }}
                          >
                            <option value="">Tous les niveaux</option>
                            <option value="1">Niveau 1</option>
                            <option value="2">Niveau 2</option>
                            <option value="3">Niveau 3</option>
                            <option value="4">Niveau 4</option>
                          </select>
                        </div>
                      )}
                  </div>

                  <div className="badges-list">
                    {projectBadges.map((attribution) => (
                      <div key={attribution.id} className="badge-attribution-card">
                        <div className="badge-attribution-header">
                          <div className="badge-image">
                            <img src={attribution.badgeImage} alt={attribution.badgeTitle} />
                            {/* Level pill - bottom left */}
                            {attribution.badgeSeries !== 'Série CPS' && (
                              <span className={`badge-level-pill level-${attribution.badgeLevel || '1'}`}>
                                Niveau {attribution.badgeLevel || '1'}
                              </span>
                            )}
                            {/* Domain pill for CPS - bottom left */}
                            {attribution.badgeSeries === 'Série CPS' && (
                              <span className="badge-domain-pill">
                                Domaine - {attribution.domaineEngagement || 'Cognitives'}
                              </span>
                            )}
                            {/* Series pill - bottom right */}
                            <span className={`badge-series-pill series-${attribution.badgeSeries?.replace('Série ', '').toLowerCase().replace(/\s+/g, '-') || 'toukouleur'}`}>
                              {attribution.badgeSeries || 'Série TouKouLeur'}
                            </span>
                          </div>
                          <div className="badge-info">
                            <h4 className="badge-title">{attribution.badgeTitle}</h4>
                            {attribution.badgeSeries !== 'Série CPS' && (
                              <p className="badge-domain">Domaine: {attribution.domaineEngagement}</p>
                            )}
                          </div>
                        </div>

                        <div className="badge-attribution-details">
                          <div className="attribution-info">
                            <div className="attributed-to">
                              <h5>Attribué à:</h5>
                              <div className="person-info">
                                <div className="person-info-header">
                                  <AvatarImage src={attribution.participantAvatar || DEFAULT_AVATAR_SRC} alt={attribution.participantName} />
                                  {attribution.participantIsDeleted ? (
                                    <DeletedUserDisplay
                                      user={{
                                        full_name: attribution.participantName,
                                        is_deleted: true
                                      }}
                                      showEmail={false}
                                      className="person-name"
                                    />
                                  ) : (
                                    <span className="person-name">{attribution.participantName}</span>
                                  )}
                                </div>
                                <span className="person-organization">{attribution.participantOrganization}</span>
                              </div>
                            </div>
                            <div className="attributed-by">
                              <h5>Attribué par:</h5>
                              <div className="person-info">
                                <div className="person-info-header">
                                  <AvatarImage src={attribution.attributedByAvatar || DEFAULT_AVATAR_SRC} alt={attribution.attributedByName} />
                                  {attribution.attributedByIsDeleted ? (
                                    <DeletedUserDisplay
                                      user={{
                                        full_name: attribution.attributedByName,
                                        is_deleted: true
                                      }}
                                      showEmail={false}
                                      className="person-name"
                                    />
                                  ) : (
                                    <span className="person-name">{attribution.attributedByName}</span>
                                  )}
                                </div>
                                <span className="person-organization">{attribution.attributedByOrganization}</span>
                              </div>
                            </div>
                          </div>

                          {attribution.commentaire && (
                            <div className={`badge-comment ${collapsedComments.has(attribution.id) ? 'collapsed' : ''}`}>
                              <h5 onClick={() => toggleComment(attribution.id)}>
                                Commentaire:
                                <span className={`comment-toggle ${collapsedComments.has(attribution.id) ? '' : 'expanded'}`}>
                                  <i className="fas fa-chevron-down"></i>
                                </span>
                              </h5>
                              <p>{attribution.commentaire}</p>
                            </div>
                          )}

                          {(attribution.preuveFiles?.length || attribution.preuve) && (
                            <div className={`badge-preuve ${collapsedComments.has(`${attribution.id}-preuve`) ? 'collapsed' : ''}`}>
                              <h5 onClick={() => toggleComment(`${attribution.id}-preuve`)}>
                                Preuve:
                                <span className={`comment-toggle ${collapsedComments.has(`${attribution.id}-preuve`) ? '' : 'expanded'}`}>
                                  <i className="fas fa-chevron-down"></i>
                                </span>
                              </h5>
                              <div className="file-info">
                                <i className="fas fa-file"></i>
                                <div className="file-list">
                                  {(attribution.preuveFiles && attribution.preuveFiles.length > 0
                                    ? attribution.preuveFiles
                                    : [attribution.preuve]
                                  ).filter(Boolean).map((file: BadgeFile | undefined, index: number) => (
                                    <div key={index} className="file-item">
                                      {file?.url ? (
                                        <a href={file.url} target="_blank" rel="noopener noreferrer" className="file-link">
                                          {file.name || 'Document'}
                                        </a>
                                      ) : (
                                        <span>{file?.name || 'Document'}</span>
                                      )}
                                      {file?.size && <small> ({file.size})</small>}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          )}

                          <div className="badge-date">
                            <small>Attribué le {formatDate(attribution.dateAttribution)}</small>
                          </div>
                        </div>
                      </div>
                    ))}

                    {!isLoadingProjectBadges && projectBadges.length === 0 && (
                      <div className="empty-state">
                        <div className="empty-icon">
                          <i className="fas fa-award"></i>
                        </div>
                        <h4>Aucun badge attribué</h4>
                        <p>Les badges attribués dans ce projet apparaîtront ici.</p>
                      </div>
                    )}

                    {isLoadingProjectBadges && (
                      <div className="empty-state">
                        <div className="empty-icon">
                          <i className="fas fa-spinner fa-spin"></i>
                        </div>
                        <h4>Chargement des badges...</h4>
                        <p>Merci de patienter.</p>
                      </div>
                    )}

                    {projectBadgesError && (
                      <div className="empty-state">
                        <div className="empty-icon">
                          <i className="fas fa-exclamation-triangle"></i>
                        </div>
                        <h4>Erreur</h4>
                        <p>{projectBadgesError}</p>
                      </div>
                    )}
                  </div>

                  {/* Pagination */}
                  {badgeTotalPages > 1 && !isLoadingProjectBadges && projectBadges.length > 0 && (
                    <div className="pagination-container">
                      <div className="pagination-info">
                        Page {badgePage} sur {badgeTotalPages} ({badgeTotalCount} badge{badgeTotalCount > 1 ? 's' : ''})
                      </div>
                      <div className="pagination-controls">
                        <button
                          className="pagination-btn"
                          onClick={() => {
                            const newPage = badgePage - 1;
                            setBadgePage(newPage);
                            fetchProjectBadgesData(newPage);
                          }}
                          disabled={badgePage === 1 || isLoadingProjectBadges}
                        >
                          <i className="fas fa-chevron-left"></i> Précédent
                        </button>
                        <div className="pagination-pages">
                          {Array.from({ length: Math.min(5, badgeTotalPages) }, (_, i) => {
                            let pageNum: number;
                            if (badgeTotalPages <= 5) {
                              pageNum = i + 1;
                            } else if (badgePage <= 3) {
                              pageNum = i + 1;
                            } else if (badgePage >= badgeTotalPages - 2) {
                              pageNum = badgeTotalPages - 4 + i;
                            } else {
                              pageNum = badgePage - 2 + i;
                            }
                            return (
                              <button
                                key={pageNum}
                                className={`pagination-page-btn ${badgePage === pageNum ? 'active' : ''}`}
                                onClick={() => {
                                  setBadgePage(pageNum);
                                  fetchProjectBadgesData(pageNum);
                                }}
                                disabled={isLoadingProjectBadges}
                              >
                                {pageNum}
                              </button>
                            );
                          })}
                        </div>
                        <button
                          className="pagination-btn"
                          onClick={() => {
                            const newPage = badgePage + 1;
                            setBadgePage(newPage);
                            fetchProjectBadgesData(newPage);
                          }}
                          disabled={badgePage >= badgeTotalPages || isLoadingProjectBadges}
                        >
                          Suivant <i className="fas fa-chevron-right"></i>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'documents' && (
              <div className="tab-content active">
                <div className="badges-section">
                  <div className="badges-section-header">
                    <h3>Documents</h3>
                  </div>

                  {!isSuperadminViewingReadOnly && (
                    <div className="badge-filters">
                      <div className="filter-group" style={{ width: '100%' }}>
                        <input
                          ref={documentsInputRef}
                          type="file"
                          multiple
                          onChange={(e) => {
                            const files = Array.from(e.target.files || []);
                            if (files.length > 0) {
                              handleUploadDocuments(files);
                            }
                            if (documentsInputRef.current) documentsInputRef.current.value = '';
                          }}
                          style={{ display: 'none' }}
                          id="project-documents-upload"
                        />
                        <label
                          htmlFor="project-documents-upload"
                          className="btn btn-outline"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
                        >
                          <i className="fas fa-paperclip"></i>
                          Ajouter des documents (1Mo max, 5 fichiers max)
                        </label>
                      </div>
                    </div>
                  )}

                  {projectDocumentsError && (
                    <div className="error-message">
                      {projectDocumentsError}
                    </div>
                  )}

                  {isLoadingProjectDocuments ? (
                    <div className="loading-state">
                      <div className="spinner"></div>
                      <p>Chargement des documents...</p>
                    </div>
                  ) : (
                    <div style={{ marginTop: '1rem' }}>
                      {projectDocuments.length === 0 ? (
                        <div className="empty-state">
                          <p>Aucun document</p>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                          {projectDocuments.map((doc: any) => (
                            <div
                              key={doc.id}
                              className="badge-attribution-card"
                              style={{ padding: '1rem' }}
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                  <div style={{ fontWeight: 700 }}>
                                    {doc.filename || 'Document'}
                                  </div>
                                  <div style={{ color: '#6b7280', fontSize: '0.9rem' }}>
                                    {(doc.byte_size ? `${Math.ceil(doc.byte_size / 1024)} Ko` : '')}
                                    {doc.content_type ? ` • ${doc.content_type}` : ''}
                                  </div>
                                </div>
                                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                  {doc.url && (
                                    <a
                                      className="btn btn-outline btn-sm"
                                      href={doc.url}
                                      target="_blank"
                                      rel="noreferrer"
                                    >
                                      <i className="fas fa-download"></i>
                                      Télécharger
                                    </a>
                                  )}
                                  {!isProjectEnded && !isSuperadminViewingReadOnly && (
                                    <button
                                      type="button"
                                      className="btn btn-outline btn-sm btn-danger"
                                      onClick={() => handleDeleteDocument(doc.id)}
                                    >
                                      <i className="fas fa-trash"></i>
                                      Supprimer
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'kanban' && (
              <div className="tab-content active">
                <div className="kanban-section">
                  <div className="section-header">
                    <div className="section-title-left">
                      <img src="/icons_logo/Icon=Tableau de bord.svg" alt="Kanban" className="section-icon" />
                      <h3>Tableau Kanban</h3>
                    </div>
                    <div className="flex flex-col gap-2 items-center">
                      <span className="px-2 py-1 text-sm rounded-xl bg-[#F59E0B] text-white">Disponible très prochainement</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'mlds-info' && isMLDSProject && (
              <div className="tab-content active">
                <div className="badges-section">
                  <div className="badges-section-header">
                    <h3>Informations MLDS - Volet Persévérance Scolaire</h3>
                  </div>

                  <div className="overview-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
                    {/* Demande faite par */}
                    {apiProjectData.mlds_information.requested_by && (
                      <div className="stat-card">
                        <div className="stat-content">
                          <div className="stat-label">Demande faite par</div>
                          <div className="stat-value" style={{ fontSize: '1.25rem', marginTop: '0.5rem' }}>
                            {apiProjectData.mlds_information.requested_by === 'departement' ? (
                              <>
                                Département
                                {apiProjectData.mlds_information.department_number && (
                                  <div style={{ fontSize: '1rem', marginTop: '0.5rem', color: '#6b7280', fontWeight: 'normal' }}>
                                    {(() => {
                                      const dept = departments.find(d => d.code === apiProjectData.mlds_information.department_number);
                                      return dept ? `${dept.code} - ${dept.nom}` : apiProjectData.mlds_information.department_number;
                                    })()}
                                  </div>
                                )}
                              </>
                            ) : (
                              'Réseau foquale'
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Public ciblé */}
                    {apiProjectData.mlds_information.target_audience && (
                      <div className="stat-card">
                        <div className="stat-content">
                          <div className="stat-label">Public ciblé</div>
                          <div className="stat-value" style={{ fontSize: '1rem', marginTop: '0.5rem', fontWeight: 'normal' }}>
                            {apiProjectData.mlds_information.target_audience === 'students_without_solution' && 'Élèves sans solution à la rentrée'}
                            {apiProjectData.mlds_information.target_audience === 'students_at_risk' && 'Élèves en situation de décrochage repérés par le GPDS'}
                            {apiProjectData.mlds_information.target_audience === 'school_teams' && 'Équipes des établissements'}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Organisations porteuses */}
                    {apiProjectData.mlds_information.organization_names && apiProjectData.mlds_information.organization_names.length > 0 && (
                      <div className="!items-start stat-card" style={{ gridColumn: 'span 1' }}>
                        <div className="stat-content">
                          <div className="stat-label">Organisations porteuses</div>
                          <div style={{ marginTop: '0.75rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                            {apiProjectData.mlds_information.organization_names.map((org: string | { id?: number; name?: string; type?: string; city?: string }, index: number) => (
                              <span
                                key={index}
                                style={{
                                  padding: '0.5rem 0.75rem',
                                  backgroundColor: '#e0f2fe',
                                  color: '#0369a1',
                                  borderRadius: '0.375rem',
                                  fontSize: '0.9rem',
                                  fontWeight: '500'
                                }}
                              >
                                {toDisplayString(org)}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Effectifs prévisionnel */}
                    {apiProjectData.mlds_information.expected_participants != null && (
                      <div className="stat-card">
                        <div className="stat-icon">
                          <i className="fas fa-users"></i>
                        </div>
                        <div className="stat-content">
                          <div className="stat-value">{apiProjectData.mlds_information.expected_participants}</div>
                          <div className="stat-label">Effectifs prévisionnel</div>
                        </div>
                      </div>
                    )}

                    {/* Objectifs pédagogiques */}
                    {apiProjectData.mlds_information.objectives && (
                      <div className="stat-card" style={{ gridColumn: 'span 1' }}>
                        <div className="stat-content">
                          <div className="stat-label">Objectifs pédagogiques</div>
                          <div style={{ fontSize: '0.95rem', marginTop: '0.75rem', lineHeight: '1.6', color: '#374151' }}>
                            {apiProjectData.mlds_information.objectives}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Objectifs de l'action */}
                    {apiProjectData.mlds_information.action_objectives && apiProjectData.mlds_information.action_objectives.length > 0 && (
                      <div className="stat-card" style={{ gridColumn: 'span 1' }}>
                        <div className="stat-content">
                          <div className="stat-label">Objectifs de l'action</div>
                          <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {apiProjectData.mlds_information.action_objectives.map((obj: string, index: number) => (
                              <div key={index} style={{ fontSize: '0.9rem', color: '#374151', display: 'flex', alignItems: 'start', gap: '0.5rem' }}>
                                <i className="fas fa-check-circle" style={{ color: '#10b981', marginTop: '0.25rem' }}></i>
                                <span className='text-left'>
                                  {obj === 'path_security' && 'La sécurisation des parcours : liaison inter-cycles pour les élèves les plus fragiles'}
                                  {obj === 'professional_discovery' && 'La découverte des filières professionnelles'}
                                  {obj === 'student_mobility' && 'Le développement de la mobilité des élèves'}
                                  {obj === 'cps_development' && 'Le développement des CPS pour les élèves en situation ou en risque de décrochage scolaire avéré'}
                                  {obj === 'territory_partnership' && 'Le rapprochement des établissements avec les partenaires du territoire'}
                                  {obj === 'family_links' && 'Le renforcement des liens entre les familles et les élèves en risque ou en situation de décrochage scolaire'}
                                  {obj === 'professional_development' && 'Des actions de co-développement professionnel ou d\'accompagnement d\'équipes'}
                                  {obj === 'other' && 'Autre'}
                                </span>
                              </div>
                            ))}
                          </div>
                          {apiProjectData.mlds_information.action_objectives_other && (
                            <div style={{ marginTop: '0.75rem', padding: '0.75rem', backgroundColor: '#f3f4f6', borderRadius: '0.5rem' }}>
                              <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#6b7280', marginBottom: '0.5rem' }}>Autre objectif :</div>
                              <div style={{ fontSize: '0.9rem', color: '#374151' }}>{apiProjectData.mlds_information.action_objectives_other}</div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Compétences développées */}
                    {apiProjectData.mlds_information.competencies_developed && (
                      <div className="stat-card" style={{ gridColumn: 'span 2' }}>
                        <div className="stat-content">
                          <div className="stat-label">Compétences développées par l'action</div>
                          <div style={{ fontSize: '0.95rem', marginTop: '0.75rem', lineHeight: '1.6', color: '#374151' }}>
                            {apiProjectData.mlds_information.competencies_developed}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Moyens financiers */}
                    {(apiProjectData.mlds_information.financial_hse != null ||
                      apiProjectData.mlds_information.financial_hv != null ||
                      apiProjectData.mlds_information.financial_transport != null ||
                      apiProjectData.mlds_information.financial_operating != null ||
                      apiProjectData.mlds_information.financial_service != null) && (
                        <div className="stat-card" style={{ gridColumn: 'span 2' }}>
                          <div className="stat-content">
                            <div className="stat-label">Moyens financiers demandés</div>
                            <div style={{ marginTop: '1rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                              {apiProjectData.mlds_information.financial_hse != null && (
                                <div style={{ padding: '0.75rem', backgroundColor: '#f9fafb', borderRadius: '0.5rem' }}>
                                  <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.25rem' }}>HSE</div>
                                  <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#111827' }}>
                                    {Number.parseFloat(apiProjectData.mlds_information.financial_hse).toFixed(2)} heures
                                  </div>
                                </div>
                              )}
                              {apiProjectData.mlds_information.financial_hv != null && (
                                <div style={{ padding: '0.75rem', backgroundColor: '#f9fafb', borderRadius: '0.5rem' }}>
                                  <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.25rem' }}>HV</div>
                                  <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#111827' }}>
                                    {Number.parseFloat(apiProjectData.mlds_information.financial_hv).toFixed(2)} €
                                  </div>
                                </div>
                              )}
                            </div>

                            <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: '#f9fafb', borderRadius: '0.5rem' }}>
                              <div style={{ fontSize: '1rem', fontWeight: 600, color: '#374151', marginBottom: '0.75rem' }}>Crédits</div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                {apiProjectData.mlds_information.financial_transport != null && (
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>Frais de transport</span>
                                    <span style={{ fontSize: '1rem', fontWeight: 600, color: '#111827' }}>
                                      {Number.parseFloat(apiProjectData.mlds_information.financial_transport).toFixed(2)} €
                                    </span>
                                  </div>
                                )}
                                {apiProjectData.mlds_information.financial_operating != null && (
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>Frais de fonctionnement</span>
                                    <span style={{ fontSize: '1rem', fontWeight: 600, color: '#111827' }}>
                                      {Number.parseFloat(apiProjectData.mlds_information.financial_operating).toFixed(2)} €
                                    </span>
                                  </div>
                                )}
                                {apiProjectData.mlds_information.financial_service != null && (
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>Prestataires de service</span>
                                    <span style={{ fontSize: '1rem', fontWeight: 600, color: '#111827' }}>
                                      {Number.parseFloat(apiProjectData.mlds_information.financial_service).toFixed(2)} €
                                    </span>
                                  </div>
                                )}
                                <div style={{
                                  marginTop: '0.5rem',
                                  padding: '0.75rem',
                                  backgroundColor: '#e0f2fe',
                                  borderRadius: '0.5rem',
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center'
                                }}>
                                  <span style={{ fontWeight: 600, color: '#0369a1' }}>Total des crédits</span>
                                  <span style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0369a1' }}>
                                    {apiProjectData.mlds_information.total_financial_credits
                                      ? Number.parseFloat(apiProjectData.mlds_information.total_financial_credits).toFixed(2)
                                      : (
                                        (Number.parseFloat(apiProjectData.mlds_information.financial_transport) || 0) +
                                        (Number.parseFloat(apiProjectData.mlds_information.financial_operating) || 0) +
                                        (Number.parseFloat(apiProjectData.mlds_information.financial_service) || 0)
                                      ).toFixed(2)
                                    } €
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div style={{
                              marginTop: '1rem',
                              padding: '1rem',
                              background: 'linear-gradient(135deg, #dbeafe 0%, #e0f2fe 100%)',
                              borderRadius: '0.5rem',
                              border: '2px solid #0369a1',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center'
                            }}>
                              <span style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0c4a6e' }}>Total général</span>
                              <span style={{ fontSize: '1.3rem', fontWeight: 700, color: '#0c4a6e' }}>
                                {(
                                  (Number.parseFloat(apiProjectData.mlds_information.financial_transport) || 0) +
                                  (Number.parseFloat(apiProjectData.mlds_information.financial_operating) || 0) +
                                  (Number.parseFloat(apiProjectData.mlds_information.financial_service) || 0)
                                ).toFixed(2)} €
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                  </div>
                </div>
              </div>
            )}
          </>
        )}

      </div>

      {/* Close project confirmation modal (same style as project deletion in Projects.tsx) */}
      {isCloseProjectModalOpen && (
        <div className="modal-overlay" onClick={() => !isClosingProject && setIsCloseProjectModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h3>Confirmer la clôture du projet</h3>
              <button className="modal-close" onClick={() => !isClosingProject && setIsCloseProjectModalOpen(false)} disabled={isClosingProject}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="modal-body">
              <div style={{
                padding: '1.5rem',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '1rem'
              }}>
                <div style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  backgroundColor: '#fef3c7',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '0.5rem'
                }}>
                  <i className="fas fa-lock" style={{ fontSize: '2rem', color: '#d97706' }}></i>
                </div>
                <div>
                  <h4 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#111827', marginBottom: '0.5rem' }}>
                    Êtes-vous sûr de vouloir clôturer ce projet ?
                  </h4>
                  <p style={{ fontSize: '0.95rem', color: '#6b7280', marginBottom: '1rem' }}>
                    Le projet sera marqué comme <strong>terminé</strong>. Toutes les actions seront figées : plus d&apos;ajout ni de modification de participants, équipes, documents ou badges.
                  </p>
                </div>
              </div>
            </div>
            <div className="modal-footer" style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button
                className="btn btn-outline"
                onClick={() => setIsCloseProjectModalOpen(false)}
                disabled={isClosingProject}
                style={{ minWidth: '100px' }}
              >
                Annuler
              </button>
              <button
                className="btn btn-primary"
                onClick={confirmCloseProject}
                disabled={isClosingProject}
                style={{
                  minWidth: '100px',
                  backgroundColor: '#d97706',
                  borderColor: '#d97706'
                }}
              >
                <i className="fas fa-check-circle" style={{ marginRight: '0.5rem' }}></i>
                {isClosingProject ? 'Clôture...' : 'Clôturer le projet'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Project Modal */}
      {isEditModalOpen && (
        <div className="modal-overlay" onClick={handleCancelEdit}>
          <div className="modal-content edit-project-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Modifier le projet</h3>
              <button className="modal-close" onClick={handleCancelEdit}>
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className="modal-body">
              <div className="form-group">
                <label htmlFor="project-title">Titre du projet</label>

                <input
                  type="text"
                  id="project-title"
                  value={editForm.title}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                  className="form-input"
                  placeholder="Entrez le titre du projet"
                />
              </div>

              <div className="form-group">
                <label htmlFor="project-description">Description du projet</label>
                <textarea
                  id="project-description"
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  className="form-textarea"
                  rows={4}
                  placeholder="Entrez la description du projet"
                />
              </div>

              <div className="form-group">
                <label>Image principale du projet</label>
                <div className="avatar-selection">
                  <div className="avatar-preview">
                    {editImagePreview ? (
                      <img src={editImagePreview} alt="Project preview" className="avatar-image" />
                    ) : (
                      <div className="avatar-placeholder">
                        <i className="fas fa-image"></i>
                        <span>Aucune image</span>
                      </div>
                    )}
                  </div>
                  <div className="avatar-actions">
                    <button
                      type="button"
                      onClick={() => document.getElementById('editProjectImage')?.click()}
                      className="btn btn-outline btn-sm"
                    >
                      <i className="fas fa-upload"></i>
                      Choisir une nouvelle image
                    </button>
                    <input
                      id="editProjectImage"
                      type="file"
                      accept="image/*"
                      onChange={handleEditImageChange}
                      style={{ display: 'none' }}
                    />
                    <p className="avatar-note">
                      Taille max 1 Mo. Si aucune image n'est sélectionnée, l'image actuelle sera conservée.
                    </p>
                  </div>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="project-start-date">Date de début estimée</label>
                  <input
                    type="date"
                    id="project-start-date"
                    value={editForm.startDate}
                    onChange={(e) => setEditForm({ ...editForm, startDate: e.target.value })}
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="project-end-date">Date de fin estimée</label>
                  <input
                    type="date"
                    id="project-end-date"
                    value={editForm.endDate}
                    onChange={(e) => setEditForm({ ...editForm, endDate: e.target.value })}
                    className="form-input"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="project-status">Statut</label>
                  <select
                    id="project-status"
                    value={editForm.status}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value as 'draft' | 'to_process' | 'coming' | 'in_progress' | 'ended' })}
                    className="form-input"
                  >
                    <option value="coming">À venir</option>
                    <option value="in_progress">En cours</option>
                    <option value="ended">Terminé</option>
                  </select>
                </div>
                {/* Visibilité masquée pour les projets MLDS - toujours privé par défaut */}
                {!isMLDSProject && (
                  <div className="form-group">
                    <label htmlFor="project-visibility">Visibilité</label>
                    <select
                      id="project-visibility"
                      value={editForm.visibility}
                      onChange={(e) => setEditForm({ ...editForm, visibility: e.target.value as 'public' | 'private' })}
                      className="form-input"
                    >
                      <option value="public">Projet public</option>
                      <option value="private">Projet privé</option>
                    </select>
                  </div>
                )}
              </div>

              {/* Parcours - Liste depuis /api/v1/tags (sélection multiple) */}
              <div className="form-group">
                <div className="form-label">Parcours</div>
                <div className="multi-select-container" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                  {(state.tags || []).length === 0 ? (
                    <div className="loading-message" style={{ padding: '8px', color: '#6b7280', fontSize: '0.875rem' }}>
                      <i className="fas fa-spinner fa-spin" style={{ marginRight: '6px' }} /> Chargement des parcours...
                    </div>
                  ) : (
                    (state.tags || []).map((tag: { id: number; name: string }) => {
                      const tagName = tag.name;
                      const selected = editForm.pathways || [];
                      const isSelected = selected.includes(tagName) || selected.some(p => String(p).toLowerCase() === tagName.toLowerCase());
                      return (
                        <label
                          key={tag.id}
                          className={`multi-select-item !flex items-center gap-2 ${isSelected ? 'selected' : ''}`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {
                              const current = editForm.pathways || [];
                              const next = isSelected ? current.filter(p => p !== tagName) : [...current, tagName];
                              setEditForm({ ...editForm, pathways: next });
                            }}
                          />
                          <div className="multi-select-checkmark">
                            <i className="fas fa-check"></i>
                          </div>
                          <span className="multi-select-label">{tagName}</span>
                        </label>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Tags - Masqué pour les projets MLDS */}
              {!isMLDSProject && (
                <div className="form-group">
                  <label>Tags du projet</label>
                  <div className="tags-input-container">
                    {editForm.tags.map((tag, index) => (
                      <div key={index} className="tag-input-row">
                        <input
                          type="text"
                          value={tag}
                          onChange={(e) => handleTagChange(index, e.target.value)}
                          className="form-input tag-input"
                          placeholder="Entrez un tag"
                        />
                        <button
                          type="button"
                          className="btn-icon remove-tag-btn"
                          onClick={() => removeTag(index)}
                          title="Supprimer ce tag"
                        >
                          <i className="fas fa-times"></i>
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      className="btn btn-outline add-tag-btn"
                      onClick={addTag}
                    >
                      <i className="fas fa-plus"></i>
                      Ajouter un tag
                    </button>
                  </div>
                </div>
              )}

              {/* Organisation porteuse - sous Parcours/Tags (projets école) */}
              {getOrganizationType(state.showingPageType) === 'school' && (
                <div className="form-group">
                  <div className="form-label">Organisation porteuse</div>
                  {availableSchoolLevels.length > 0 ? (
                    <div className="multi-select-container" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                      {availableSchoolLevels.map(classItem => (
                        <label
                          key={classItem.id}
                          className={`multi-select-item !flex items-center gap-2 ${editForm.mldsSchoolLevelIds.includes(classItem.id.toString()) ? 'selected' : ''}`}
                        >
                          <input
                            type="checkbox"
                            checked={editForm.mldsSchoolLevelIds.includes(classItem.id.toString())}
                            onChange={() => handleEditOrganizationToggle(classItem.id.toString())}
                          />
                          <div className="multi-select-checkmark">
                            <i className="fas fa-check"></i>
                          </div>
                          <span className="multi-select-label">
                            {classItem.name} {classItem.level ? `- ${classItem.level}` : ''}
                          </span>
                        </label>
                      ))}
                    </div>
                  ) : (
                    <div className={isLoadingSchoolLevels ? 'loading-message' : 'no-items-message'}>
                      {isLoadingSchoolLevels ? (
                        <>
                          <i className="fas fa-spinner fa-spin"></i>
                          <span>Chargement des classes...</span>
                        </>
                      ) : (
                        'Aucune classe disponible'
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Parcours - Masqué pour les projets MLDS */}

              {/* Partnership Section */}
              <div className="form-group">
                <label className={`multi-select-item !flex items-center gap-2 ${editForm.isPartnership ? 'selected' : ''}`} style={{ cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    id="isPartnership"
                    name="isPartnership"
                    checked={editForm.isPartnership}
                    onChange={(e) => setEditForm(prev => ({
                      ...prev,
                      isPartnership: e.target.checked,
                      partners: e.target.checked ? prev.partners : []
                    }))}
                  />
                  <div className="multi-select-checkmark">
                    <i className="fas fa-check"></i>
                  </div>
                  <span className="multi-select-label">Ajouter un partenaire</span>
                </label>
              </div>

              {/* Partenaires - Only visible if En partenariat is checked */}
              {editForm.isPartnership && (
                <div className="form-group">
                  <label htmlFor="projectPartners">Partenaire(s)</label>
                  <div className="compact-selection">
                    <div className="search-input-container">
                      <i className="fas fa-search search-icon"></i>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="Rechercher un partenaire..."
                        value={editSearchTerms.partner}
                        onChange={(e) => handleEditSearchChange('partner', e.target.value)}
                      />
                    </div>

                    {/* Display selected partnerships above the search input */}
                    {editForm.partners.length > 0 && (
                      <div className="selected-items">
                        {editForm.partners.map((partnerId) => {
                          const partnership = editAvailablePartnerships.find((p: any) => p.id?.toString() === partnerId);
                          if (!partnership) return null;
                          const partnerOrgs = partnership.partners || [];
                          const firstPartner = partnerOrgs[0];
                          const roleInPartnership = firstPartner?.role_in_partnership;
                          return (
                            <div key={partnerId} className="selected-member">
                              <AvatarImage
                                src={firstPartner?.logo_url || '/default-avatar.png'}
                                alt={partnerOrgs.map((p: any) => p.name).join(', ') || 'Partnership'}
                                className="selected-avatar"
                              />
                              <div className="selected-info">
                                <div className="selected-name">
                                  {partnerOrgs.map((p: any) => p.name).join(', ')}
                                </div>
                                <div className="selected-role">{partnership.name || ''}</div>
                                {roleInPartnership && (
                                  <div className="selected-org" style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: '0.2rem' }}>
                                    Rôle dans le partenariat : {roleInPartnership}
                                  </div>
                                )}
                              </div>
                              <button
                                type="button"
                                className="remove-selection"
                                onClick={() => handleEditPartnerSelect(partnerId)}
                              >
                                <i className="fas fa-times"></i>
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    <div className="selection-list">
                      {getEditFilteredPartnerships(editSearchTerms.partner).length === 0 ? (
                        <div className="no-members-message" style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>
                          <i className="fas fa-handshake" style={{ fontSize: '2rem', marginBottom: '0.5rem', display: 'block' }}></i>
                          <p>Aucun partenariat disponible</p>
                        </div>
                      ) : (
                        getEditFilteredPartnerships(editSearchTerms.partner).map((partnership: any) => {
                          const partnerOrgs = partnership.partners || [];
                          const firstPartner = partnerOrgs[0];
                          const roleInPartnership = firstPartner?.role_in_partnership;

                          return (
                            <div
                              key={partnership.id}
                              className="selection-item"
                              onClick={() => handleEditPartnerSelect(partnership.id.toString())}
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
                        })
                      )}
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
                      value={editSearchTerms.coResponsibles}
                      onChange={(e) => handleEditSearchChange('coResponsibles', e.target.value)}
                      disabled={isLoadingEditMembers}
                    />
                  </div>

                  {/* Display selected co-responsables above the search input */}
                  {editForm.coResponsibles.length > 0 && (
                    <div className="selected-items">
                      {editForm.coResponsibles.map((memberId) => {
                        const member = editAvailableMembers.find((m: any) => m.id.toString() === memberId)
                          ?? editPartnershipContactMembers.find((m: any) => m.id?.toString() === memberId);
                        const memberOrg = member ? (typeof member.organization === 'string' ? member.organization : (member.organization?.name ?? '')) : '';
                        return member ? (
                          <div key={memberId} className="selected-member">
                            <AvatarImage
                              src={member.avatar_url || '/default-avatar.png'}
                              alt={member.full_name || `${member.first_name} ${member.last_name}`}
                              className="selected-avatar"
                            />
                            <div className="selected-info">
                              <div className="selected-name">{member.full_name || `${member.first_name || ''} ${member.last_name || ''}`.trim()}</div>
                              <div className="selected-role">Rôle : {translateRole(member.role ?? member.role_in_organization ?? '')}</div>
                              {memberOrg && (
                                <div className="selected-org" style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: '0.2rem' }}>Organisation : {toDisplayString(member.organization)}</div>
                              )}
                            </div>
                            <button
                              type="button"
                              className="remove-selection"
                              onClick={() => handleEditMemberSelect('coResponsibles', memberId)}
                            >
                              <i className="fas fa-times"></i>
                            </button>
                          </div>
                        ) : null;
                      })}
                    </div>
                  )}

                  {isLoadingEditMembers ? (
                    <div className="loading-members" style={{ padding: '1rem', textAlign: 'center', color: '#6b7280' }}>
                      <i className="fas fa-spinner fa-spin" style={{ marginRight: '0.5rem' }}></i>
                      <span>Chargement des membres...</span>
                    </div>
                  ) : (
                    <div className="selection-list">
                      {getEditFilteredMembers(editSearchTerms.coResponsibles).length === 0 ? (
                        <div className="no-members-message" style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>
                          <i className="fas fa-users" style={{ fontSize: '2rem', marginBottom: '0.5rem', display: 'block' }}></i>
                          <p>Aucun membre disponible</p>
                        </div>
                      ) : (
                        getEditFilteredMembers(editSearchTerms.coResponsibles).map((member: any) => {
                          const isSelected = editForm.coResponsibles.includes(member.id.toString());
                          const memberOrg = typeof member.organization === 'string' ? member.organization : (member.organization?.name ?? '');
                          return (
                            <div
                              key={member.id}
                              className={`selection-item ${isSelected ? 'selected' : ''}`}
                              onClick={() => handleEditMemberSelect('coResponsibles', member.id.toString())}
                            >
                              <AvatarImage src={member.avatar_url || '/default-avatar.png'} alt={member.full_name || `${member.first_name} ${member.last_name}`} className="item-avatar" />
                              <div className="item-info">
                                <div className="item-name">{member.full_name || `${member.first_name} ${member.last_name}`}</div>
                                <div className="item-role">Rôle : {translateRole(member.role ?? '')}</div>
                                {memberOrg && (
                                  <div className="item-org" style={{ fontSize: '0.8rem', color: '#6b7280' }}>Organisation : {toDisplayString(member.organization)}</div>
                                )}
                              </div>
                              {isSelected && (
                                <div style={{ marginLeft: 'auto', color: '#10b981', fontSize: '1.2rem' }}>
                                  <i className="fas fa-check-circle"></i>
                                </div>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* MLDS-specific fields */}
              {isMLDSProject && (
                <div className="form-section">
                  <h3 className="form-section-title">Volet Persévérance Scolaire</h3>

                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="mlds-requested-by">Demande faite par <span style={{ color: 'red' }}>*</span></label>
                      <select
                        id="mlds-requested-by"
                        name="mldsRequestedBy"
                        className="form-select"
                        value={editForm.mldsRequestedBy}
                        onChange={(e) => setEditForm({
                          ...editForm,
                          mldsRequestedBy: e.target.value,
                          mldsDepartment: e.target.value === 'departement' ? editForm.mldsDepartment : ''
                        })}
                        required
                      >
                        <option value="departement">Département</option>
                        <option value="reseau_foquale">Réseau foquale</option>
                      </select>
                    </div>

                    {/* Département select - Only visible when "Demande faite par" is "Département" */}
                    {editForm.mldsRequestedBy === 'departement' && (
                      <div className="form-group">
                        <label htmlFor="mldsDepartment">Département <span style={{ color: 'red' }}>*</span></label>
                        {isLoadingDepartments ? (
                          <div style={{ padding: '12px', textAlign: 'center', color: '#6b7280' }}>
                            <i className="fas fa-spinner fa-spin" style={{ marginRight: '8px' }}></i>
                            Chargement des départements...
                          </div>
                        ) : (
                          <select
                            id="mldsDepartment"
                            name="mldsDepartment"
                            className="form-select"
                            value={editForm.mldsDepartment}
                            onChange={(e) => setEditForm({ ...editForm, mldsDepartment: e.target.value })}
                            required={editForm.mldsRequestedBy === 'departement'}
                          >
                            <option value="">Sélectionnez un département</option>
                            {departments.map(dept => (
                              <option key={dept.code} value={dept.code}>
                                {dept.nom} ({dept.code})
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                    )}

                    <div className="form-group">
                      <label htmlFor="mlds-target-audience">Public ciblé <span style={{ color: 'red' }}>*</span></label>
                      <select
                        id="mlds-target-audience"
                        name="mldsTargetAudience"
                        className="form-select"
                        value={editForm.mldsTargetAudience}
                        onChange={(e) => setEditForm({ ...editForm, mldsTargetAudience: e.target.value })}
                        required
                      >
                        <option value="students_without_solution">Élèves sans solution à la rentrée</option>
                        <option value="students_at_risk">Élèves en situation de décrochage repérés par le GPDS</option>
                        <option value="school_teams">Équipes des établissements</option>
                      </select>
                    </div>
                  </div>

                  <div className="form-group">
                    <label htmlFor="mlds-expected-participants">Effectifs prévisionnel</label>
                    <input
                      type="number"
                      id="mlds-expected-participants"
                      name="mldsExpectedParticipants"
                      className="form-input"
                      value={editForm.mldsExpectedParticipants}
                      onChange={(e) => setEditForm({ ...editForm, mldsExpectedParticipants: e.target.value })}
                      placeholder="Nombre de participants attendus"
                      min="0"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="mlds-objectives">Objectifs pédagogiques</label>
                    <textarea
                      id="mlds-objectives"
                      name="mldsObjectives"
                      className="form-textarea"
                      value={editForm.mldsObjectives}
                      onChange={(e) => setEditForm({ ...editForm, mldsObjectives: e.target.value })}
                      rows={3}
                      placeholder="Décrire les objectifs de remobilisation et de persévérance scolaire..."
                    />
                  </div>

                  <div className="form-group">
                    <div className="form-label">Objectifs de l'action</div>
                    <div className="multi-select-container">
                      {[
                        { value: 'path_security', label: 'La sécurisation des parcours : liaison inter-cycles pour les élèves les plus fragiles' },
                        { value: 'professional_discovery', label: 'La découverte des filières professionnelles' },
                        { value: 'student_mobility', label: 'Le développement de la mobilité des élèves' },
                        { value: 'cps_development', label: 'Le développement des CPS pour les élèves en situation ou en risque de décrochage scolaire avéré' },
                        { value: 'territory_partnership', label: 'Le rapprochement des établissements avec les partenaires du territoire (missions locales, associations, entreprises, etc.) afin de mettre en place des parcours personnalisés (PAFI, TDO, PAE, autres)' },
                        { value: 'family_links', label: 'Le renforcement des liens entre les familles et les élèves en risque ou en situation de décrochage scolaire' },
                        { value: 'professional_development', label: 'Des actions de co-développement professionnel ou d\'accompagnement d\'équipes (tutorat, intervention de chercheurs, etc.)' },
                        { value: 'other', label: 'Autre' }
                      ].map((objective) => (
                        <label
                          key={objective.value}
                          className={`multi-select-item !flex items-center gap-2 ${editForm.mldsActionObjectives.includes(objective.value) ? 'selected' : ''}`}
                        >
                          <input
                            type="checkbox"
                            checked={editForm.mldsActionObjectives.includes(objective.value)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setEditForm({ ...editForm, mldsActionObjectives: [...editForm.mldsActionObjectives, objective.value] });
                              } else {
                                setEditForm({ ...editForm, mldsActionObjectives: editForm.mldsActionObjectives.filter(v => v !== objective.value) });
                              }
                            }}
                          />
                          <div className="multi-select-checkmark">
                            <i className="fas fa-check"></i>
                          </div>
                          <span className="multi-select-label">{objective.label}</span>
                        </label>
                      ))}
                    </div>
                    {editForm.mldsActionObjectives.includes('other') && (
                      <div style={{ marginTop: '12px' }}>
                        <label htmlFor="mlds-action-objectives-other">Précisez l'autre objectif</label>
                        <textarea
                          id="mlds-action-objectives-other"
                          name="mldsActionObjectivesOther"
                          className="form-textarea"
                          value={editForm.mldsActionObjectivesOther}
                          onChange={(e) => setEditForm({ ...editForm, mldsActionObjectivesOther: e.target.value })}
                          placeholder="Décrivez l'autre objectif..."
                          rows={2}
                          style={{ marginTop: '8px' }}
                        />
                      </div>
                    )}
                  </div>

                  <div className="form-group">
                    <label htmlFor="mlds-competencies-developed">Compétences développées par l'action</label>
                    <textarea
                      id="mlds-competencies-developed"
                      name="mldsCompetenciesDeveloped"
                      className="form-textarea"
                      value={editForm.mldsCompetenciesDeveloped}
                      onChange={(e) => setEditForm({ ...editForm, mldsCompetenciesDeveloped: e.target.value })}
                      rows={3}
                      placeholder="Décrivez les compétences que les participants développeront..."
                    />
                  </div>

                  <div className="form-group">
                    <div className="form-label">Moyens financiers demandés</div>
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: '1rem',
                      marginTop: '12px',
                      padding: '16px',
                      background: '#f9fafb',
                      borderRadius: '8px',
                      border: '1px solid #e5e7eb'
                    }}>
                      <div className="form-group" style={{ marginBottom: '0' }}>
                        <label htmlFor="mlds-financial-hse">HSE</label>
                        <input
                          type="number"
                          id="mlds-financial-hse"
                          name="mldsFinancialHSE"
                          className="form-input"
                          value={editForm.mldsFinancialHSE}
                          onChange={(e) => setEditForm({ ...editForm, mldsFinancialHSE: e.target.value })}
                          placeholder="Nombre d'heures"
                          min="0"
                          step="0.01"
                        />
                      </div>
                      <div className="form-group" style={{ marginBottom: '0' }}>
                        <label htmlFor="mlds-financial-hv">HV</label>
                        <input
                          type="number"
                          id="mlds-financial-hv"
                          name="mldsFinancialHV"
                          className="form-input"
                          value={editForm.mldsFinancialHV}
                          onChange={(e) => setEditForm({ ...editForm, mldsFinancialHV: e.target.value })}
                          placeholder="Montant en €"
                          min="0"
                          step="0.01"
                        />
                      </div>
                    </div>

                    <div style={{
                      marginTop: '12px',
                      padding: '16px',
                      background: '#f9fafb',
                      borderRadius: '8px',
                      border: '1px solid #e5e7eb'
                    }}>
                      <h4 style={{
                        fontSize: '0.95rem',
                        fontWeight: 600,
                        color: '#374151',
                        marginBottom: '12px',
                        marginTop: '0'
                      }}>
                        Crédits
                      </h4>
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr',
                        gap: '1rem'
                      }}>
                        <div className="form-group" style={{ marginBottom: '0' }}>
                          <label htmlFor="mlds-financial-transport">Frais de transport</label>
                          <input
                            type="number"
                            id="mlds-financial-transport"
                            name="mldsFinancialTransport"
                            className="form-input"
                            value={editForm.mldsFinancialTransport}
                            onChange={(e) => setEditForm({ ...editForm, mldsFinancialTransport: e.target.value })}
                            placeholder="Montant en €"
                            min="0"
                            step="0.01"
                          />
                        </div>
                        <div className="form-group" style={{ marginBottom: '0' }}>
                          <label htmlFor="mlds-financial-operating">Frais de fonctionnement</label>
                          <input
                            type="number"
                            id="mlds-financial-operating"
                            name="mldsFinancialOperating"
                            className="form-input"
                            value={editForm.mldsFinancialOperating}
                            onChange={(e) => setEditForm({ ...editForm, mldsFinancialOperating: e.target.value })}
                            placeholder="Montant en €"
                            min="0"
                            step="0.01"
                          />
                        </div>
                        <div className="form-group" style={{ marginBottom: '0' }}>
                          <label htmlFor="mlds-financial-service">Prestataires de service</label>
                          <input
                            type="number"
                            id="mlds-financial-service"
                            name="mldsFinancialService"
                            className="form-input"
                            value={editForm.mldsFinancialService}
                            onChange={(e) => setEditForm({ ...editForm, mldsFinancialService: e.target.value })}
                            placeholder="Montant en €"
                            min="0"
                            step="0.01"
                          />
                        </div>
                      </div>
                      <div style={{
                        marginTop: '12px',
                        padding: '10px',
                        background: '#e0f2fe',
                        borderRadius: '6px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}>
                        <span style={{ fontWeight: 600, color: '#0369a1' }}>Total des crédits :</span>
                        <span style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0369a1' }}>
                          {(
                            (Number.parseFloat(editForm.mldsFinancialTransport) || 0) +
                            (Number.parseFloat(editForm.mldsFinancialOperating) || 0) +
                            (Number.parseFloat(editForm.mldsFinancialService) || 0)
                          ).toFixed(2)} €
                        </span>
                      </div>
                    </div>

                    <div style={{
                      marginTop: '12px',
                      padding: '12px',
                      background: 'linear-gradient(135deg, #dbeafe 0%, #e0f2fe 100%)',
                      borderRadius: '8px',
                      border: '2px solid #0369a1',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <span style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0c4a6e' }}>
                        Total général :
                      </span>
                      <span style={{ fontSize: '1.3rem', fontWeight: 700, color: '#0c4a6e' }}>
                        {(
                          (Number.parseFloat(editForm.mldsFinancialTransport) || 0) +
                          (Number.parseFloat(editForm.mldsFinancialOperating) || 0) +
                          (Number.parseFloat(editForm.mldsFinancialService) || 0)
                        ).toFixed(2)} €
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button className="btn btn-outline" onClick={handleCancelEdit}>
                Annuler
              </button>
              {/* Afficher le bouton "Sauvegarder en brouillon" uniquement si le statut est "en cours" ou "à venir" */}
              {(editForm.status !== 'in_progress' && editForm.status !== 'coming') && (
                <button className="btn btn-outline" onClick={handleSaveEditDraft}>
                  Sauvegarder en brouillon
                </button>
              )}
              <button className="btn btn-primary" onClick={handleSaveEdit}>
                {isMLDSProject && (state.showingPageType === 'teacher' || state.user?.role === 'teacher')
                  ? 'Soumettre le projet MLDS'
                  : 'Sauvegarder'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Participant Modal */}
      {isAddParticipantModalOpen && (
        <AddParticipantModal
          onClose={() => setIsAddParticipantModalOpen(false)}
          onAdd={handleAddParticipantSubmit}
          existingParticipants={participants}
          availableMembers={availableMembers}
        />
      )}

      {isBadgeModalOpen && (
        <BadgeAssignmentModal
          onClose={() => {
            setIsBadgeModalOpen(false);
            setSelectedParticipantForBadge(null);
          }}
          onAssign={handleBadgeAssignment}
          participants={participants.map(p => ({
            id: p.id,
            memberId: p.memberId,
            name: p.name,
            avatar: p.avatar,
            organization: p.organization
          }))}
          preselectedParticipant={selectedParticipantForBadge}
          projectId={project?.id}
          projectTitle={project?.title}
          availableOrganizations={userProjectMember?.user?.available_contexts ? (() => {
            const orgs: Array<{ id: number; name: string; type: 'School' | 'Company' }> = [];
            const contexts = userProjectMember.user.available_contexts;
            const badgeRoles = ['superadmin', 'admin', 'referent', 'référent', 'intervenant'];

            if (contexts.schools) {
              contexts.schools.forEach((school: any) => {
                if (badgeRoles.includes(school.role?.toLowerCase() || '')) {
                  orgs.push({ id: school.id, name: school.name || 'École', type: 'School' });
                }
              });
            }

            if (contexts.companies) {
              contexts.companies.forEach((company: any) => {
                if (badgeRoles.includes(company.role?.toLowerCase() || '')) {
                  orgs.push({ id: company.id, name: company.name || 'Organisation', type: 'Company' });
                }
              });
            }

            return orgs.length > 0 ? orgs : undefined;
          })() : undefined}
        />
      )}

      {/* Team Creation/Edit Modal */}
      {(isCreateTeamModalOpen || isEditTeamModalOpen) && (
        <div className="modal-overlay">
          <div className="modal-content team-modal">
            <div className="modal-header">
              <h3>{selectedTeam ? 'Modifier l\'équipe' : 'Créer une équipe'}</h3>
              <button className="modal-close" onClick={handleCancelTeamForm}>
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className="modal-body">
              <div className="form-group">
                <label htmlFor="teamName">Nom de l'équipe *</label>
                <input
                  type="text"
                  id="teamName"
                  className="form-input"
                  value={newTeamForm.name}
                  onChange={(e) => setNewTeamForm({ ...newTeamForm, name: e.target.value })}
                  placeholder="Ex: Équipe Marketing, Équipe Technique..."
                />
              </div>

              <div className="form-group">
                <label htmlFor="teamDescription">Description</label>
                <textarea
                  id="teamDescription"
                  className="form-textarea"
                  value={newTeamForm.description}
                  onChange={(e) => setNewTeamForm({ ...newTeamForm, description: e.target.value })}
                  placeholder="Décrivez le rôle et les responsabilités de cette équipe..."
                  rows={3}
                />
              </div>

              <div className="form-group">
                <label>Chef d'équipe *</label>
                <div className="compact-selection">
                  <div className="search-input-container">
                    <i className="fas fa-search search-icon"></i>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Rechercher un chef d'équipe..."
                      value={memberSearchTerm}
                      onChange={(e) => setMemberSearchTerm(e.target.value)}
                    />
                  </div>
                  {newTeamForm.chiefId && (
                    <div className="selected-item">
                      {(() => {
                        const selected = participants.find(p => p.id === newTeamForm.chiefId);
                        return selected ? (
                          <div className="selected-member">
                            <AvatarImage src={selected.avatar} alt={selected.name} className="selected-avatar" />
                            <div className="selected-info">
                              <div className="selected-name">{selected.name}</div>
                              <div className="selected-role">{selected.profession}</div>
                            </div>
                            <button
                              type="button"
                              className="remove-selection"
                              onClick={() => setNewTeamForm({ ...newTeamForm, chiefId: '' })}
                            >
                              <i className="fas fa-times"></i>
                            </button>
                          </div>
                        ) : null;
                      })()}
                    </div>
                  )}
                  <div className="selection-list">
                    {getFilteredParticipants().slice(0, 3).map((participant) => (
                      <div
                        key={participant.id}
                        className="selection-item"
                        onClick={() => setNewTeamForm({ ...newTeamForm, chiefId: participant.id })}
                      >
                        <AvatarImage src={participant.avatar} alt={participant.name} className="item-avatar" />
                        <div className="item-info">
                          {participant.is_deleted ? (
                            <DeletedUserDisplay
                              user={{
                                full_name: participant.name,
                                email: participant.email,
                                is_deleted: true
                              }}
                              showEmail={false}
                            />
                          ) : (
                            <div className="item-name">{participant.name}</div>
                          )}
                          <div className="item-role">{participant.profession}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label>Membres de l'équipe *</label>
                <div className="compact-selection">
                  <div className="search-input-container">
                    <i className="fas fa-search search-icon"></i>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Rechercher des membres..."
                      value={memberSearchTerm}
                      onChange={(e) => setMemberSearchTerm(e.target.value)}
                    />
                  </div>
                  {newTeamForm.selectedMembers.length > 0 && (
                    <div className="selected-items">
                      {newTeamForm.selectedMembers.map((memberId) => {
                        const member = participants.find(p => p.id === memberId);
                        return member ? (
                          <div key={memberId} className="selected-member">
                            <AvatarImage src={member.avatar} alt={member.name} className="selected-avatar" />
                            <div className="selected-info">
                              <div className="selected-name">{member.name}</div>
                              <div className="selected-role">{member.profession}</div>
                            </div>
                            <button
                              type="button"
                              className="remove-selection"
                              onClick={() => {
                                setNewTeamForm({
                                  ...newTeamForm,
                                  selectedMembers: newTeamForm.selectedMembers.filter(id => id !== memberId),
                                  chiefId: newTeamForm.chiefId === memberId ? '' : newTeamForm.chiefId
                                });
                              }}
                            >
                              <i className="fas fa-times"></i>
                            </button>
                          </div>
                        ) : null;
                      })}
                    </div>
                  )}
                  <div className="selection-list">
                    {getFilteredParticipants().slice(0, 3).map((participant) => (
                      <div
                        key={participant.id}
                        className="selection-item"
                        onClick={() => {
                          if (!newTeamForm.selectedMembers.includes(participant.id)) {
                            setNewTeamForm({
                              ...newTeamForm,
                              selectedMembers: [...newTeamForm.selectedMembers, participant.id]
                            });
                          }
                        }}
                      >
                        <AvatarImage src={participant.avatar} alt={participant.name} className="item-avatar" />
                        <div className="item-info">
                          <div className="item-name">{participant.name}</div>
                          <div className="item-role">{participant.profession}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-outline" onClick={handleCancelTeamForm}>
                Annuler
              </button>
              <button className="btn btn-primary" onClick={handleSaveTeam}>
                {selectedTeam ? 'Modifier l\'équipe' : 'Créer l\'équipe'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Team Details Modal */}
      {isViewTeamModalOpen && selectedTeam && (
        <div className="modal-overlay">
          <div className="modal-content team-details-modal">
            <div className="modal-header">
              <h3>Détails de l'équipe</h3>
              <button className="modal-close" onClick={() => setIsViewTeamModalOpen(false)}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="modal-body">
              <div className="team-details-content">
                <div className="team-details-header">
                  <div className="team-details-info">
                    <h4>{selectedTeam.name}</h4>
                    <span className="team-number-badge">Équipe {selectedTeam.number}</span>
                  </div>
                </div>

                {selectedTeam.description && (
                  <div className="team-details-section">
                    <h5>Description</h5>
                    <p>{selectedTeam.description}</p>
                  </div>
                )}

                <div className="team-details-section">
                  <h5>Chef d'équipe</h5>
                  {(() => {
                    const chief = getParticipantById(selectedTeam.chiefId);
                    return chief ? (
                      <div className="chief-detail-card">
                        <AvatarImage src={chief.avatar} alt={chief.name} className="chief-detail-avatar" />
                        <div className="chief-detail-info">
                          <div className="chief-detail-name">{chief.name}</div>
                          <div className="chief-detail-role">{chief.profession}</div>
                          <div className="chief-detail-email">{chief.email}</div>
                        </div>
                      </div>
                    ) : (
                      <span className="no-chief">Non défini</span>
                    );
                  })()}
                </div>

                <div className="team-details-section">
                  <h5>Membres de l'équipe ({selectedTeam.members.length})</h5>
                  <div className="team-members-grid">
                    {selectedTeam.members.map((memberId: string) => {
                      const member = getParticipantById(memberId);
                      return member ? (
                        <div key={memberId} className="member-detail-card">
                          <AvatarImage src={member.avatar} alt={member.name} className="member-detail-avatar" />
                          <div className="member-detail-info">
                            <div className="member-detail-name">{member.name}</div>
                            <div className="member-detail-role">{member.profession}</div>
                            <div className="member-detail-email">{member.email}</div>
                          </div>
                        </div>
                      ) : null;
                    })}
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setIsViewTeamModalOpen(false)}>
                Fermer
              </button>
              {!isProjectEnded && !isSuperadminViewingReadOnly && (
                <button className="btn btn-primary" onClick={() => {
                  setIsViewTeamModalOpen(false);
                  handleEditTeam(selectedTeam);
                }}>
                  <i className="fas fa-edit"></i>
                  Modifier l'équipe
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Task Creation/Edit Modal */}
      {(isCreateTaskModalOpen || isEditTaskModalOpen) && (
        <div className="modal-overlay">
          <div className="modal-content task-modal">
            <div className="modal-header">
              <h3>{selectedTask ? 'Modifier la tâche' : 'Créer une tâche'}</h3>
              <button className="modal-close" onClick={handleCancelTaskForm}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label htmlFor="taskTitle">Titre de la tâche *</label>
                <input
                  type="text"
                  id="taskTitle"
                  className="form-input"
                  value={newTaskForm.title}
                  onChange={(e) => setNewTaskForm({ ...newTaskForm, title: e.target.value })}
                  placeholder="Ex: Développement de la fonctionnalité X"
                />
              </div>

              <div className="form-group">
                <label htmlFor="taskDescription">Description</label>
                <textarea
                  id="taskDescription"
                  className="form-textarea"
                  value={newTaskForm.description}
                  onChange={(e) => setNewTaskForm({ ...newTaskForm, description: e.target.value })}
                  placeholder="Décrivez les détails de cette tâche..."
                  rows={3}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Type d'assignation *</label>
                  <select
                    className="form-select"
                    value={newTaskForm.assigneeType}
                    onChange={(e) => setNewTaskForm({ ...newTaskForm, assigneeType: e.target.value, assigneeId: '' })}
                  >
                    <option value="individual">Participant individuel</option>
                    <option value="team">Équipe</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Assigné à *</label>
                  <select
                    className="form-select"
                    value={newTaskForm.assigneeId}
                    onChange={(e) => setNewTaskForm({ ...newTaskForm, assigneeId: e.target.value })}
                  >
                    <option value="">Sélectionner un assigné</option>
                    {newTaskForm.assigneeType === 'team' ? (
                      teams.map((team) => (
                        <option key={team.id} value={team.id}>
                          {team.name}
                        </option>
                      ))
                    ) : (
                      participants.map((participant) => (
                        <option key={participant.id} value={participant.id}>
                          {participant.name} - {participant.profession}
                        </option>
                      ))
                    )}
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="taskStartDate">Date de début</label>
                  <input
                    type="date"
                    id="taskStartDate"
                    className="form-input"
                    value={newTaskForm.startDate}
                    onChange={(e) => setNewTaskForm({ ...newTaskForm, startDate: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="taskDueDate">Date d'échéance</label>
                  <input
                    type="date"
                    id="taskDueDate"
                    className="form-input"
                    value={newTaskForm.dueDate}
                    onChange={(e) => setNewTaskForm({ ...newTaskForm, dueDate: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Priorité</label>
                <select
                  className="form-select"
                  value={newTaskForm.priority}
                  onChange={(e) => setNewTaskForm({ ...newTaskForm, priority: e.target.value })}
                >
                  <option value="low">Basse</option>
                  <option value="medium">Moyenne</option>
                  <option value="high">Haute</option>
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={handleCancelTaskForm}>
                Annuler
              </button>
              <button className="btn btn-primary" onClick={handleSaveTask}>
                {selectedTask ? 'Modifier la tâche' : 'Créer la tâche'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default ProjectManagement;