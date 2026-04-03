// ProjectManagement Component - Project Details and Management
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { getProjectBadges } from '../../api/Badges';
import apiClient from '../../api/config';
import { getProjectById } from '../../api/Project';
import { addProjectDocuments, addProjectMember, createProjectTeam, deleteProjectDocument, deleteProjectTeam, getProjectDocuments, getProjectMembers, getProjectPendingMembers, getProjectStats, getProjectTeams, joinProject, postMldsBilan, ProjectStats, removeProjectMember, updateProject, updateProjectMember, updateProjectTeam, getOrganizationMembers, getTeacherMembers, getTeacherSchoolMembers, getPartnerships, getTags, getOrCreateProjectShareLink, getMldsServiceLinesFromMldsInfo } from '../../api/Projects';
import { useAppContext } from '../../context/AppContext';
import { mockProjects } from '../../data/mockData';
import { useToast } from '../../hooks/useToast';
import ShareProjectLinkModal from '../Modals/ShareProjectLinkModal';
import { BadgeFile, Project } from '../../types';
import { getLocalBadgeImage } from '../../utils/badgeImages';
import { canUserAssignBadges } from '../../utils/badgePermissions';
import { base64ToFile, getUserProjectRole, mapApiProjectToFrontendProject, mapEditFormToBackend, validateImageFormat, validateImageSize, getOrganizationId, getOrganizationType } from '../../utils/projectMapper';
import { buildMldsCoResponsibleContexts, buildSchoolParticipantContexts } from '../../utils/memberContextPayload';
import { mapApiTeamToFrontendTeam, mapFrontendTeamToBackend } from '../../utils/teamMapper';
import AddParticipantModal from '../Modals/AddParticipantModal';
import BadgeAssignmentModal from '../Modals/BadgeAssignmentModal';
import CloseProjectBilanModal, { BilanData, buildMldsBilanPayload } from '../Modals/CloseProjectBilanModal';
import AvatarImage, { DEFAULT_AVATAR_SRC } from '../UI/AvatarImage';
import DeletedUserDisplay from '../Common/DeletedUserDisplay';
import './MembershipRequests.css';
import './ProjectManagement.css';
import '../Modals/Modal.css';
import { isUserAdminOfProjectOrg, isUserAdminOrReferentOfProjectOrg, isUserProjectParticipant, isUserSuperadmin, isUserSuperadminOfProjectOrg } from '../../utils/projectPermissions';
import { getSelectedOrganizationId } from '../../utils/contextUtils';
import { jsPDF } from 'jspdf';
import { getSchoolLevels } from '../../api/SchoolDashboard/Levels';
import { getTeacherAllStudents, getTeacherClasses } from '../../api/Dashboard';
import { getCompanyGroups, getCompanyGroup } from '../../api/CompanyDashboard/Groups';
import { translateRole } from '../../utils/roleTranslations';
import {
  countServiceQuoteFiles,
  MAX_SERVICE_QUOTE_FILES,
  validateServiceQuoteSelection
} from '../../utils/mldsServiceQuotes';
import { hvLineHours } from '../../utils/mldsHvLines';
import { useSearchParams } from 'react-router-dom';

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

/** Taux HV par défaut (€/heure) — lignes crédits HV */
const HV_DEFAULT_RATE = 50.73;

/** Contact partenaire dont le rôle org est référent — à ne pas proposer comme co-responsable dans la modale partenaire. */
function isPartnerContactOrgReferent(contact: { role?: string; role_in_organization?: string }): boolean {
  const raw = (contact.role_in_organization ?? contact.role ?? '').toString();
  const n = raw.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return n.includes('referent');
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

/** Pills cell for list view: colored pills + collapsible when many items (default collapsed). */
const CollapsiblePillsCell: React.FC<{
  items: string[];
  pillClassName: 'skill-pill' | 'availability-pill';
  emptyLabel?: string;
}> = ({ items, pillClassName, emptyLabel = '—' }) => {
  const [expanded, setExpanded] = React.useState(false);
  const maxVisible = 3;

  if (!items || items.length === 0) {
    return <>{emptyLabel}</>;
  }

  const hasMore = items.length > maxVisible;
  const visibleItems = expanded ? items : items.slice(0, maxVisible);

  return (
    <div className="participant-list-pills-cell">
      <div className="participant-list-pills-wrap">
        {visibleItems.map((item: string, index: number) => (
          <span key={index} className={pillClassName}>{item}</span>
        ))}
      </div>
      {hasMore && (
        <button
          type="button"
          className="participant-list-toggle-pills-btn"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? 'Voir moins' : `Voir plus (${items.length - maxVisible} autres)`}
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

  // Charger tous les parcours disponibles pour la modal d'édition (indépendamment de state.tags)
  useEffect(() => {
    const fetchEditPathways = async () => {
      setIsLoadingEditPathways(true);
      try {
        const tagsData = await getTags();
        // Ensure tagsData is an array before setting
        if (Array.isArray(tagsData)) {
          setEditAvailablePathways(tagsData);
        } else {
          console.error('getTags returned non-array:', tagsData);
          setEditAvailablePathways([]);
        }
      } catch (error) {
        console.error('Error fetching pathways for edit modal:', error);
        setEditAvailablePathways([]);
      } finally {
        setIsLoadingEditPathways(false);
      }
    };

    fetchEditPathways();
  }, []);
  const { showSuccess, showError } = useToast();
  const [activeTab, setActiveTab] = useState('overview');
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(true);
  const overviewDescriptionSectionRef = useRef<HTMLDivElement>(null);
  const cardDescriptionFullBlockRef = useRef<HTMLDivElement>(null);
  const pendingScrollToOverviewDescriptionRef = useRef(false);
  const [coverImageLoaded, setCoverImageLoaded] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    tags: [] as string[],
    startDate: '',
    endDate: '',
    pathways: [] as string[],
    status: 'coming' as 'draft' | 'to_process' | 'pending_validation' | 'coming' | 'in_progress' | 'ended' | 'archived',
    visibility: 'public' as 'public' | 'private',
    isPartnership: false,
    co_owners: [] as string[],
    partners: [] as string[],
    participants: [] as string[],
    // Pro: groups attached to project
    groupIds: [] as string[],
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
    mldsFinancialRate: '50.73',
    mldsFinancialTransport: [] as Array<{ transport_name: string; price: string }>,
    mldsFinancialOperating: [] as Array<{ operating_name: string; price: string }>,
    mldsFinancialAutres: [] as Array<{ autres_name: string; price: string }>,
    mldsFinancialHvLines: [] as Array<{ teacher_name: string; hour: string }>,
    mldsFinancialService: [] as Array<{
      id?: number;
      service_name: string;
      hours: string;
      price: string;
      comment: string;
      quote_url?: string | null;
    }>,
    mldsNetworkIssueAddressed: '',
    mldsOrganizationNames: [] as string[],
    mldsSchoolLevelIds: [] as string[] // IDs of school levels
  });
  const [editServiceQuoteFiles, setEditServiceQuoteFiles] = useState<(File | null)[]>([]);
  /** IDs des lignes prestataires persistées supprimées en session — envoyés en `_destroy` au PATCH */
  const [editMldsServiceLineDestroyedIds, setEditMldsServiceLineDestroyedIds] = useState<number[]>([]);
  const editFormInitializedRef = useRef(false);
  const [editImagePreview, setEditImagePreview] = useState<string>('');
  const [availableSchoolLevels, setAvailableSchoolLevels] = useState<any[]>([]);
  const [isLoadingSchoolLevels, setIsLoadingSchoolLevels] = useState(false);
  const [editAvailableMembers, setEditAvailableMembers] = useState<any[]>([]);
  const [editCoResponsibleOptions, setEditCoResponsibleOptions] = useState<any[]>([]);
  const [isLoadingEditCoResponsibles, setIsLoadingEditCoResponsibles] = useState(false);
  const [editAvailablePartnerships, setEditAvailablePartnerships] = useState<any[]>([]);
  const [editPartnershipContactMembers, setEditPartnershipContactMembers] = useState<any[]>([]);
  const [isLoadingEditMembers, setIsLoadingEditMembers] = useState(false);
  const [editAvailableCompanyGroups, setEditAvailableCompanyGroups] = useState<any[]>([]);
  const [isLoadingEditCompanyGroups, setIsLoadingEditCompanyGroups] = useState(false);
  const [editGroupMembersByGroupId, setEditGroupMembersByGroupId] = useState<Record<string, number[]>>({});
  const [editGroupMembersDetailsByGroupId, setEditGroupMembersDetailsByGroupId] = useState<Record<string, any[]>>({});
  const [editGroupDetailPopup, setEditGroupDetailPopup] = useState<{ groupId: string; groupName: string } | null>(null);
  const [isLoadingEditGroupMembers, setIsLoadingEditGroupMembers] = useState(false);
  const [departments, setDepartments] = useState<Array<{ code: string; nom: string }>>([]);
  const [isLoadingDepartments, setIsLoadingDepartments] = useState(false);
  const [editSearchTerms, setEditSearchTerms] = useState({
    co_owners: '',
    partner: ''
  });
  /** Pour l'édition : parcours (même input que ProjectModal) */
  const [editPathwaySearchTerm, setEditPathwaySearchTerm] = useState('');
  const [editPathwayDropdownOpen, setEditPathwayDropdownOpen] = useState(false);
  const editPathwayDropdownRef = useRef<HTMLDivElement | null>(null);
  const editPathwaySearchInputRef = useRef<HTMLInputElement | null>(null);
  const editPathwayDropdownClickInProgress = useRef<boolean>(false);
  const [editAvailablePathways, setEditAvailablePathways] = useState<any[]>([]);
  const [isLoadingEditPathways, setIsLoadingEditPathways] = useState(false);
  /** Pour l'édition : mode par classe (manual / all) et popup détail classe */
  const [editClassSelectionMode, setEditClassSelectionMode] = useState<Record<string, 'manual' | 'all'>>({});
  const [editClassManualParticipantIds, setEditClassManualParticipantIds] = useState<Record<string, string[]>>({});
  const [editClassDetailPopup, setEditClassDetailPopup] = useState<{ classId: string; className: string; mode: 'choice' | 'view' | 'manual' } | null>(null);
  // Co-responsables par classe : après sélection d'une classe, popup pour choisir les co-responsables liés à cette classe
  const [editClassCoResponsiblesPopup, setEditClassCoResponsiblesPopup] = useState<{ classId: string; className: string } | null>(null);
  const [editClassCoResponsibles, setEditClassCoResponsibles] = useState<Record<string, string[]>>({});
  const [editClassCoResponsiblesSearchTerm, setEditClassCoResponsiblesSearchTerm] = useState<string>('');
  // Co-responsables par partenariat : après sélection d'un partenariat, popup pour choisir les co-responsables liés à ce partenariat
  const [editPartnershipCoResponsiblesPopup, setEditPartnershipCoResponsiblesPopup] = useState<{ partnershipId: string; partnershipName: string; contactUsers: any[] } | null>(null);
  const [editPartnershipCoResponsibles, setEditPartnershipCoResponsibles] = useState<Record<string, string[]>>({});
  const [editPartnershipCoResponsiblesSearchTerm, setEditPartnershipCoResponsiblesSearchTerm] = useState<string>('');
  const [isAddParticipantModalOpen, setIsAddParticipantModalOpen] = useState(false);
  const [isBadgeModalOpen, setIsBadgeModalOpen] = useState(false);
  const [selectedParticipantForBadge, setSelectedParticipantForBadge] = useState<string | null>(null);
  const [collapsedComments, setCollapsedComments] = useState<Set<string>>(new Set());

  // Badge filters
  const [badgeSeriesFilter, setBadgeSeriesFilter] = useState('');
  const [badgeLevelFilter, setBadgeLevelFilter] = useState('');
  const [badgeReceiverFilter, setBadgeReceiverFilter] = useState('');
  const [debouncedBadgeReceiverQuery, setDebouncedBadgeReceiverQuery] = useState('');
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_badgeDomainFilter, setBadgeDomainFilter] = useState(''); // Set but not used in UI - kept for future use
  const [projectBadges, setProjectBadges] = useState<any[]>([]);
  const [isLoadingProjectBadges, setIsLoadingProjectBadges] = useState(false);
  const [projectBadgesError, setProjectBadgesError] = useState<string | null>(null);
  const [badgePage, setBadgePage] = useState(1);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [shareToken, setShareToken] = useState<string | null>(null);
  const [isLoadingShareLink, setIsLoadingShareLink] = useState(false);
  const [badgeTotalPages, setBadgeTotalPages] = useState(1);
  const [badgeTotalCount, setBadgeTotalCount] = useState(0);
  const [badgeViewMode, setBadgeViewMode] = useState<'cards' | 'list'>('cards');
  const [participantViewMode, setParticipantViewMode] = useState<'cards' | 'list'>('cards');
  const [badgeHolderSubView, setBadgeHolderSubView] = useState<'badges' | 'participants'>('badges');

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
  const isProjectEnded = project?.status === 'ended' || project?.status === 'archived';

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

  // Fetch project statistics only when user can see management (owner/co-owner/admin).
  // Participants with only "droit de badge" do not see stats; skip the request to avoid 403.
  useEffect(() => {
    const fetchStats = async () => {
      if (!project?.id) return;
      if (!shouldShowTabs()) {
        setProjectStats(null);
        setIsLoadingStats(false);
        return;
      }
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
  }, [project?.id, userProjectRole, state.showingPageType, apiProjectData]);

  // Open assign-badge modal from URL (e.g. from Sidebar "Actions rapides" -> Attribuer un badge, after selecting project)
  const [searchParams, setSearchParams] = useSearchParams();
  useEffect(() => {
    if (!project?.id || searchParams.get('open') !== 'assign-badge') return;
    setSelectedParticipantForBadge(null);
    setIsBadgeModalOpen(true);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete('open');
      return next;
    }, { replace: true });
  }, [project?.id, searchParams, setSearchParams]);

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

  // Debounce receiver search for badge filter (350 ms)
  useEffect(() => {
    const t = setTimeout(() => setDebouncedBadgeReceiverQuery(badgeReceiverFilter.trim()), 350);
    return () => clearTimeout(t);
  }, [badgeReceiverFilter]);

  // Fetch project badges only when the user can see badges (tab or "Badges que j'ai attribués" section)
  // Avoids fetching all badges when role is "participant" and then overwriting with stale response when role becomes "participant avec droit de badges"
  useEffect(() => {
    if (!project?.id) return;
    if (!shouldShowTabs() && userProjectRole !== 'participant avec droit de badges') return;
    fetchProjectBadgesData(badgePage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [badgePage, badgeSeriesFilter, badgeLevelFilter, debouncedBadgeReceiverQuery, userProjectRole, state.user?.id, apiProjectData]);

  // Fetch project documents when Documents tab is opened (admin only)
  useEffect(() => {
    if (activeTab === 'documents' && project?.id && shouldShowTabs()) {
      fetchProjectDocuments();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, project?.id]);

  // Calculate badge assignment permissions from fresh API data (inside async callback
  // so the button appears when can_assign_badges_in_project is true)
  useEffect(() => {
    if (!project || !state.user?.id || !userProjectRole) {
      setCanAssignBadges(false);
      return;
    }

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
          const newUserProjectMember = {
            can_assign_badges_in_project: currentUserMember.can_assign_badges_in_project || false,
            user: {
              available_contexts: state.user.available_contexts
            }
          };

          const needsUpdate =
            !userProjectMember ||
            userProjectMember.can_assign_badges_in_project !== newUserProjectMember.can_assign_badges_in_project ||
            JSON.stringify(userProjectMember.user?.available_contexts) !==
            JSON.stringify(newUserProjectMember.user?.available_contexts);

          if (needsUpdate) {
            setUserProjectMember(newUserProjectMember);
          }

          // Compute permission from fresh API data so "Attribuer un badge" button updates
          const hasPermission = canUserAssignBadges(project, state.user?.id ?? null, userProjectRole, newUserProjectMember);
          setCanAssignBadges(hasPermission);
        } else {
          // Owner/co-owner may not be in members list; compute from role so button still shows
          const hasPermission = canUserAssignBadges(project, state.user?.id ?? null, userProjectRole, undefined);
          setCanAssignBadges(hasPermission);
        }
      } catch (error) {
        console.error('Error fetching user project member:', error);
        setCanAssignBadges(false);
      }
    };

    findUserProjectMember();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project?.id, state.user?.id, userProjectRole]);

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
      case 'pending_validation': return 'À valider';
      case 'coming': return 'À venir';
      case 'in_progress': return 'En cours';
      case 'ended': return 'Terminé';
      case 'archived': return 'Archivé';
      default: return status;
    }
  };

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'draft': return 'draft';
      case 'to_process': return 'to-process';
      case 'pending_validation': return 'to-validate';
      case 'coming': return 'coming';
      case 'in_progress': return 'in-progress';
      case 'ended': return 'ended';
      case 'archived': return 'archived';
      default: return 'coming';
    }
  };

  /**
   * Open the close-project flow: for MLDS projects, open the bilan modal; for others, close directly (status → ended).
   */
  const openCloseProjectModal = () => {
    if (!project?.id || (project.status !== 'in_progress' && project.status !== 'coming')) return;
    if (userProjectRole !== 'owner') {
      showError('Seul le responsable du projet peut le clôturer.');
      return;
    }
    if (isMLDSProject) {
      setIsCloseProjectModalOpen(true);
    } else {
      confirmCloseProject();
    }
  };

  /**
   * Close the project: set status to "ended" (called after user confirms in modal).
   */
  const confirmCloseProject = async (bilanData?: BilanData) => {
    if (!project?.id) return;
    setIsClosingProject(true);
    try {
      const projectId = parseInt(project.id);
      if (Number.isNaN(projectId)) {
        showError('ID de projet invalide');
        setIsCloseProjectModalOpen(false);
        return;
      }

      // Envoyer le bilan MLDS si fourni (POST /api/v1/projects/:id/mlds_bilan)
      if (bilanData) {
        const mldsPayload = buildMldsBilanPayload(bilanData, apiProjectData?.mlds_information ?? null);
        await postMldsBilan(projectId, mldsPayload);
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

  /**
   * Archive the project: set status to "archived".
   * Only available when project is already ended.
   */
  const handleArchiveProject = async () => {
    if (!project?.id || project.status !== 'ended') return;
    try {
      const projectId = parseInt(project.id);
      if (Number.isNaN(projectId)) {
        showError('ID de projet invalide');
        return;
      }

      const payload = {
        project: {
          status: 'archived' as const
        }
      };

      await updateProject(projectId, payload as any, null, []);

      const response = await getProjectById(projectId);
      const apiProject = response.data;
      const mappedProject = mapApiProjectToFrontendProject(apiProject, state.showingPageType, state.user);

      setProject(mappedProject);
      setSelectedProject(mappedProject);
      setApiProjectData(apiProject);
      showSuccess('Projet archivé avec succès');
    } catch (error: any) {
      console.error('Error archiving project:', error);
      const message =
        error?.response?.data?.details?.join(', ') ||
        error?.response?.data?.message ||
        error?.message ||
        'Erreur lors de l’archivage du projet';
      showError(message);
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

  // Calculate number of new confirmed members added this month (exclude pending; aligns with participant count)
  const calculateNewMembersThisMonth = (apiProjectData: any): number => {
    if (!apiProjectData?.project_members) return 0;
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    return apiProjectData.project_members.filter((member: any) => {
      if (!member.created_at) return false;
      if (member.status !== 'confirmed') return false;
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
   * Returns true if user is not a participant
   * In read-only mode (superadmin/admin/referent viewing), user can still join to become a participant
   */
  const canUserJoinProject = (): boolean => {
    if (!apiProjectData || !state.user?.id) return false;

    // Check if user is already a participant
    if (isUserProjectParticipant(apiProjectData, state.user.id.toString())) {
      return false;
    }

    // If user is in read-only mode (superadmin/admin/referent viewing but not participant), they can join
    if (isReadOnlyMode) {
      return true;
    }

    // Check if user has admin access (owner/co-owner/admin or org admin) - they don't need to join
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
   * Admin/referent de l'organisation du projet qui n'est pas dans le projet : voir tous les onglets et participants en lecture seule, boutons d'actions cachés.
   * Un admin/referent d'une autre organisation ne bénéficie pas de cette vue.
   */
  const isAdminViewingReadOnly =
    apiProjectData != null &&
    state.user?.id != null &&
    isUserAdminOrReferentOfProjectOrg(apiProjectData, state.user) &&
    !isUserProjectParticipant(apiProjectData, state.user.id.toString());

  /**
   * Mode lecture seule : superadmin ou admin/referent de l'organisation du projet qui n'est pas dans le projet
   */
  const isReadOnlyMode = isSuperadminViewingReadOnly || isAdminViewingReadOnly;

  /** Projet MLDS : le responsable et les co-responsables peuvent ouvrir l’édition du projet. */
  const canEditProject =
    userProjectRole === 'owner' ||
    (isMLDSProject && userProjectRole === 'co-owner');

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

  useEffect(() => {
    if (!pendingScrollToOverviewDescriptionRef.current) return;
    if (activeTab !== 'overview') return;
    pendingScrollToOverviewDescriptionRef.current = false;
    const t = setTimeout(() => {
      overviewDescriptionSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 120);
    return () => clearTimeout(t);
  }, [activeTab]);

  /**
   * Fetch all project members including owner, co-owners, and confirmed members
   * Returns members sorted by role: owner -> co-owners -> admins -> members
   * @param overrideApiProject - when provided (e.g. after edit), use this instead of apiProjectData from state
   */
  const fetchAllProjectMembers = async (overrideApiProject?: any): Promise<any[]> => {
    const projectData = overrideApiProject ?? apiProjectData;
    if (!project?.id || !projectData) return [];

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
    if (projectData.owner && !projectData.owner.is_deleted) {
      const ownerId = projectData.owner.id.toString();
      addedUserIds.add(ownerId);

      const ownerParticipant = {
        id: `owner-${projectData.owner.id}`,
        memberId: ownerId,
        name: projectData.owner.full_name || `${projectData.owner.first_name || ''} ${projectData.owner.last_name || ''}`.trim() || 'Inconnu',
        profession: projectData.owner.job || 'Propriétaire',
        email: projectData.owner.email || '',
        avatar: projectData.owner.avatar_url || DEFAULT_AVATAR_SRC,
        skills: extractSkills(projectData.owner.skills),
        availability: availabilityToLabels(projectData.owner.availability),
        organization: projectData.primary_organization_name || project.organization || '',
        role: 'owner',
        projectRole: 'owner',
        is_deleted: projectData.owner.is_deleted || false,
        userRole: projectData.owner.role ?? '',
        school_level_name: typeof projectData.owner.school_level === 'object' && projectData.owner.school_level?.name
          ? projectData.owner.school_level.name
          : ''
      };
      allMembers.push({
        ...ownerParticipant,
        canRemove: canUserRemoveParticipant(ownerParticipant, userProjectRole)
      });
    }

    // Add co-owners (skip if soft-deleted - they shouldn't appear in badge assignment list)
    if (projectData.co_owners && Array.isArray(projectData.co_owners)) {
      projectData.co_owners.forEach((coOwner: any) => {
        // Skip soft-deleted co-owners
        if (coOwner.is_deleted) return;
        // Skip owner (they are already added from projectData.owner; owner can appear in co_owners for some projects)
        if (projectData.owner && coOwner.id === projectData.owner.id) return;
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
        // Exclude owner (already added from projectData.owner; backend may return virtual owner in list_members)
        if (m.project_role === 'owner') return false;
        const userId = m.user?.id?.toString() || m.user_id?.toString();

        // Exclude co-owners (already added from projectData.co_owners)
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
  const handleEditSearchChange = (field: 'co_owners' | 'partner', value: string) => {
    setEditSearchTerms(prev => ({ ...prev, [field]: value }));
  };

  // Filter members for participants (includes all members: staff + students)
  const getEditFilteredMembers = (searchTerm: string) => {
    // Filter out already selected co-responsibles
    let available = editAvailableMembers.filter((member: any) =>
      !editForm.co_owners.includes(member.id.toString())
    );

    if (!searchTerm) return available;
    const lowerSearch = searchTerm.toLowerCase();
    return available.filter((member: any) => {
      const fullName = member.full_name || `${member.first_name} ${member.last_name}`;
      return fullName.toLowerCase().includes(lowerSearch) || member.email?.toLowerCase().includes(lowerSearch);
    });
  };

  const getEditFilteredCoResponsibles = (searchTerm: string) => {
    // Use co-responsible options (from teacher school API) if available, otherwise use regular members
    const baseMembers = (editCoResponsibleOptions.length > 0) ? editCoResponsibleOptions : editAvailableMembers;
    // Contacts des partenariats sélectionnés (API partnership.partners[].contact_users) : ils ne sont pas dans la liste école
    const byId = new Map<string, any>();
    baseMembers.forEach((m: any) => {
      if (m?.id != null) byId.set(String(m.id), m);
    });
    (editPartnershipContactMembers || []).forEach((m: any) => {
      if (m?.id == null) return;
      if (isPartnerContactOrgReferent(m)) return;
      const idStr = String(m.id);
      if (!byId.has(idStr)) {
        byId.set(idStr, {
          ...m,
          avatar_url: m.avatar_url,
          role: m.role ?? m.role_in_organization ?? ''
        });
      }
    });
    const sourceMembers = Array.from(byId.values());

    // Filter out already selected co-responsibles
    let available = sourceMembers.filter((member: any) =>
      !editForm.co_owners.includes(member.id.toString())
    );

    // Filter out students - only show staff members for co-responsibles
    const STUDENT_SYSTEM_ROLES = ['eleve_primaire', 'collegien', 'lyceen', 'etudiant'];
    available = available.filter((member: any) => {
      const role = (member.role_in_system || member.role || '').toString().toLowerCase();
      return !STUDENT_SYSTEM_ROLES.includes(role);
    });

    if (!searchTerm) return available;
    const lowerSearch = searchTerm.toLowerCase();
    return available.filter((member: any) => {
      const fullName = member.full_name || `${member.first_name} ${member.last_name}`;
      return fullName.toLowerCase().includes(lowerSearch) || member.email?.toLowerCase().includes(lowerSearch);
    });
  };

  /** Élèves appartenant à une classe (editAvailableMembers dont classes ou level_school contient cette classe) */
  const getEditStudentsInClass = (schoolLevelId: string): any[] => {
    if (!Array.isArray(editAvailableMembers)) return [];
    return editAvailableMembers.filter((member: any) => {
      if (!member?.id) return false;
      const inClasses =
        Array.isArray(member.classes) &&
        member.classes.some((c: any) => c?.id?.toString() === schoolLevelId);
      const inLevelSchool =
        Array.isArray(member.level_school) &&
        member.level_school.some((l: any) => l?.id?.toString() === schoolLevelId);
      return inClasses || inLevelSchool;
    });
  };

  /** Résout un participant (id) vers le membre dans editAvailableMembers ou editPartnershipContactMembers */
  const getEditSelectedParticipant = (memberId: string) => {
    const id = memberId.toString();
    const byId = (m: any) => m?.id?.toString() === id || m?.id === parseInt(memberId, 10);
    return editAvailableMembers.find(byId) ?? editPartnershipContactMembers.find(byId) ?? null;
  };

  /** Enseignants d'une classe (depuis availableSchoolLevels ou editCoResponsibleOptions) */
  const getEditTeachersInClass = (schoolLevelId: string): any[] => {
    const classItem = availableSchoolLevels.find((l: any) => l.id?.toString() === schoolLevelId);
    if (!classItem) return [];

    // Récupérer les IDs des enseignants de la classe
    const teacherIds = classItem.teacher_ids || (classItem.teachers || []).map((t: any) => t.id || t);
    if (!teacherIds || teacherIds.length === 0) return [];

    // Filtrer les membres disponibles (editCoResponsibleOptions pour teacher/school, ou editAvailableMembers pour autres contextes)
    const availableMembers = editCoResponsibleOptions.length > 0 ? editCoResponsibleOptions : editAvailableMembers;

    // Exclure le propriétaire du projet
    const ownerId = apiProjectData?.owner?.id?.toString();

    return availableMembers.filter((member: any) => {
      if (!member?.id) return false;
      if (ownerId && member.id?.toString() === ownerId) return false;
      return teacherIds.includes(member.id) || teacherIds.includes(Number(member.id));
    });
  };

  /** Ouvrir la popup de sélection des co-responsables après sélection de classe */
  const openEditClassCoResponsiblesPopup = (classId: string, className: string) => {
    setEditClassDetailPopup(null);
    setEditClassCoResponsiblesPopup({ classId, className });
    setEditClassCoResponsiblesSearchTerm('');
  };

  /** Toggle co-responsable pour une classe */
  const toggleEditClassCoResponsible = (classId: string, memberId: string) => {
    const idStr = memberId.toString();
    setEditClassCoResponsibles(prev => {
      const current = prev[classId] || [];
      const newList = current.includes(idStr)
        ? current.filter(id => id !== idStr)
        : [...current, idStr];
      return { ...prev, [classId]: newList };
    });
  };

  /** Filtrer les enseignants de la classe pour la popup de co-responsables */
  const getFilteredEditClassCoResponsibles = (classId: string, searchTerm: string) => {
    const teachers = getEditTeachersInClass(classId);
    if (!searchTerm.trim()) return teachers;
    const term = searchTerm.toLowerCase();
    return teachers.filter((teacher: any) => {
      const name = (teacher.full_name || `${teacher.first_name || ''} ${teacher.last_name || ''}`.trim()).toLowerCase();
      const email = (teacher.email || '').toLowerCase();
      const role = (translateRole(teacher.role_in_system ?? teacher.role ?? '') || '').toLowerCase();
      return name.includes(term) || email.includes(term) || role.includes(term);
    });
  };

  /** Toggle co-responsable pour un partenariat */
  const toggleEditPartnershipCoResponsible = (partnershipId: string, memberId: string) => {
    const idStr = memberId.toString();
    setEditPartnershipCoResponsibles(prev => {
      const current = prev[partnershipId] || [];
      const newList = current.includes(idStr)
        ? current.filter(id => id !== idStr)
        : [...current, idStr];
      return { ...prev, [partnershipId]: newList };
    });
  };

  /** Filtrer les contact users du partenariat pour la popup de co-responsables */
  const getFilteredEditPartnershipCoResponsibles = (contactUsers: any[], searchTerm: string) => {
    const withoutReferents = (contactUsers || []).filter((u: any) => !isPartnerContactOrgReferent(u));
    if (!searchTerm.trim()) return withoutReferents;
    const term = searchTerm.toLowerCase();
    return withoutReferents.filter((user: any) => {
      const name = (user.full_name || `${user.first_name || ''} ${user.last_name || ''}`.trim()).toLowerCase();
      const email = (user.email || '').toLowerCase();
      const role = (user.role_in_organization || user.role || '').toLowerCase();
      const org = (user.organization || '').toLowerCase();
      return name.includes(term) || email.includes(term) || role.includes(term) || org.includes(term);
    });
  };

  const formatEditPartnershipDisplayName = (name: string | undefined): string => {
    if (!name) return '';
    return name.replace(/\bPartnership\b/gi, 'Partenariat');
  };

  /** Libellés des partenariats pour lesquels ce user a été désigné co-responsable (popup contacts partenaire). */
  const getEditPartnershipContextLabelsForCoResponsible = (memberId: string): string[] => {
    const idStr = memberId.toString();
    const labels: string[] = [];
    (editForm.partners || []).forEach((partnershipId: string) => {
      const key = String(partnershipId);
      const ids = editPartnershipCoResponsibles[key] || [];
      if (!ids.includes(idStr)) return;
      const p = editAvailablePartnerships.find((x: any) => String(x.id) === key || x.id === Number.parseInt(key, 10));
      const partnerNames = (p?.partners || []).map((org: any) => org.name).filter(Boolean).join(', ');
      const label = partnerNames || formatEditPartnershipDisplayName(p?.name) || `Partenariat #${partnershipId}`;
      if (label && !labels.includes(label)) labels.push(label);
    });
    return labels;
  };

  /** Co-responsable encore coché dans la popup d’au moins un partenariat actuellement sélectionné. */
  const isCoResponsibleLinkedViaSelectedPartnership = (memberId: string): boolean => {
    const idStr = memberId.toString();
    return (editForm.partners || []).some(pid =>
      (editPartnershipCoResponsibles[String(pid)] || []).includes(idStr)
    );
  };

  const getProjectSchoolIdsFromApi = (): number[] => {
    if (!apiProjectData) return [];
    const ids: number[] = [];
    if (Array.isArray(apiProjectData.school_ids)) {
      apiProjectData.school_ids.forEach((id: unknown) => {
        const n = Number(id);
        if (!Number.isNaN(n)) ids.push(n);
      });
    }
    const sl = apiProjectData.school_levels?.[0]?.school_id;
    if (sl != null) {
      const n = Number(sl);
      if (!Number.isNaN(n)) ids.push(n);
    }
    return Array.from(new Set(ids));
  };

  /** L’org (partenaire) d’added_from_organization est-elle encore couverte par un partenariat coché dans le formulaire ? */
  const isOrgIdStillLinkedToSelectedPartnerships = (orgId: number): boolean =>
    (editForm.partners || []).some(pid => {
      const pship = editAvailablePartnerships.find(
        (x: any) => String(x.id) === String(pid) || x.id === Number.parseInt(String(pid), 10)
      );
      return pship?.partners?.some((po: any) => Number(po.id) === orgId);
    });

  /** Affichage minimal si le membre n’est plus dans les listes chargées (ex. retiré des contacts partenaire). */
  const getEditCoResponsibleMemberFallbackFromApi = (memberId: string): any | undefined => {
    const idStr = memberId.toString();
    const lists = [
      ...(apiProjectData?.co_owners || []),
      ...(apiProjectData?.co_responsibles || [])
    ];
    const u = lists.find((x: any) => String(x?.id ?? x?.user?.id) === idStr);
    if (!u) return undefined;
    return {
      id: u.id ?? u.user?.id,
      full_name: u.full_name || `${u.first_name || ''} ${u.last_name || ''}`.trim(),
      first_name: u.first_name,
      last_name: u.last_name,
      avatar_url: u.avatar_url,
      role: u.role_in_organization ?? u.organization_role,
      role_in_organization: u.role_in_organization,
      organization: apiProjectData?.primary_organization_name ?? ''
    };
  };

  /** Contexte d’origine renvoyé par le GET projet (added_from_organization sur co_owners / project_members). */
  const getEditCoResponsibleAddedFromApiLine = (memberId: string): string | null => {
    const idStr = memberId.toString();
    if (!apiProjectData) return null;
    const pickFromUsers = (arr: any[] | undefined) =>
      arr?.find((x: any) => String(x?.id ?? x?.user?.id) === idStr)?.added_from_organization;
    let a = pickFromUsers(apiProjectData.co_owners) || pickFromUsers(apiProjectData.co_responsibles);
    if (!a?.name && Array.isArray(apiProjectData.project_members)) {
      const pm = apiProjectData.project_members.find(
        (m: any) =>
          String(m?.user?.id ?? m.user_id) === idStr && (m.role === 'co_owner' || m.is_co_owner)
      );
      a = pm?.added_from_organization;
    }
    if (!a?.name) return null;

    const orgId = a.organization_id != null ? Number(a.organization_id) : null;
    if (orgId != null && !Number.isNaN(orgId)) {
      const schoolIds = getProjectSchoolIdsFromApi();
      if (schoolIds.includes(orgId)) {
        const cityPart = a.city ? ` · ${a.city}` : '';
        return `${a.name}${cityPart}`;
      }
      if (!isOrgIdStillLinkedToSelectedPartnerships(orgId)) {
        return null;
      }
    }

    const cityPart = a.city ? ` · ${a.city}` : '';
    return `${a.name}${cityPart}`;
  };

  const handleEditParticipantRemove = (memberId: string) => {
    setEditForm(prev => ({ ...prev, participants: prev.participants.filter(id => id !== memberId) }));
    setEditClassManualParticipantIds(prev => {
      const next = { ...prev };
      Object.keys(next).forEach(classId => {
        next[classId] = (next[classId] || []).filter(id => id !== memberId);
        if (next[classId].length === 0) delete next[classId];
      });
      return next;
    });
  };

  const handleEditPathwayToggle = (pathwayName: string) => {
    setEditForm(prev => {
      const current = prev.pathways || [];
      const isSelected = current.includes(pathwayName);
      if (isSelected) {
        return { ...prev, pathways: current.filter(p => p !== pathwayName) };
      }
      if (current.length >= 2) return prev;
      return { ...prev, pathways: [...current, pathwayName] };
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

  const handleEditMemberSelect = (field: 'co_owners', memberId: string) => {
    setEditForm(prev => {
      const currentList = prev[field];
      const newList = currentList.includes(memberId)
        ? currentList.filter((id: string) => id !== memberId)
        : [...currentList, memberId];
      return { ...prev, [field]: newList };
    });
  };

  const editGroupDerivedParticipantIds = (() => {
    const ids: string[] = [];
    (editForm.groupIds || []).forEach((gid) => {
      const memberIds = editGroupMembersByGroupId[gid] || [];
      memberIds.forEach((id) => ids.push(String(id)));
    });
    return new Set(ids);
  })();

  const ensureEditGroupMembersLoaded = async (companyId: number, groupId: string) => {
    if (editGroupMembersByGroupId[groupId] && editGroupMembersDetailsByGroupId[groupId]) return;
    try {
      setIsLoadingEditGroupMembers(true);
      const res = await getCompanyGroup(companyId, Number(groupId));
      const data = res.data?.data || res.data;
      const membersArr = Array.isArray(data?.members) ? data.members : [];
      const memberIds = membersArr.map((m: any) => Number(m.id)).filter((id: number) => !Number.isNaN(id));
      setEditGroupMembersByGroupId((prev) => ({ ...prev, [groupId]: memberIds }));
      setEditGroupMembersDetailsByGroupId((prev) => ({ ...prev, [groupId]: membersArr }));
    } catch (e) {
      console.error('Error fetching company group members (edit modal):', e);
    } finally {
      setIsLoadingEditGroupMembers(false);
    }
  };

  const handleEditGroupToggle = async (groupId: string) => {
    if (state.showingPageType !== 'pro') return;
    const companyId = getSelectedOrganizationId(state.user, state.showingPageType);
    if (!companyId) return;

    const isSelected = (editForm.groupIds || []).includes(groupId);
    const nextGroupIds = isSelected ? (editForm.groupIds || []).filter((id) => id !== groupId) : [...(editForm.groupIds || []), groupId];
    setEditForm((prev) => ({ ...prev, groupIds: nextGroupIds }));

    if (isSelected && editGroupDetailPopup?.groupId === groupId) {
      setEditGroupDetailPopup(null);
    }

    if (!isSelected) {
      await ensureEditGroupMembersLoaded(companyId, groupId);
      const cached = editGroupMembersByGroupId[groupId] || [];
      if (cached.length > 0) {
        const toRemove = new Set(cached.map((id) => String(id)));
        setEditForm((prev) => ({ ...prev, participants: prev.participants.filter((id) => !toRemove.has(String(id))) }));
      }
    }
  };

  const handleEditPartnerSelect = (partnerId: string) => {
    const partnership = editAvailablePartnerships.find((p: any) => p.id?.toString() === partnerId || p.id === Number(partnerId));

    if (!partnership) return;

    const ownerId = apiProjectData?.owner?.id != null ? apiProjectData.owner.id.toString() : null;
    const contactUsersRaw = (partnership.partners || []).flatMap((p: any) => (p.contact_users || []).map((c: any) => ({
      id: c.id,
      full_name: c.full_name || '',
      email: c.email || '',
      role: c.role_in_organization || '',
      role_in_organization: c.role_in_organization || '',
      organization: p.name || ''
    })));
    // Pas de référents org dans la sélection co-responsables partenaire
    const withoutReferents = contactUsersRaw.filter((c: any) => !isPartnerContactOrgReferent(c));
    // Exclude project owner so they are not proposed as co-owner (owner can be staff in partner orgs)
    const contactUsers = ownerId
      ? withoutReferents.filter((c: any) => c.id?.toString() !== ownerId)
      : withoutReferents;

    const isAlreadySelected = editForm.partners.includes(partnerId);

    if (isAlreadySelected) {
      // Désélectionner le partenariat
      const contactIds = contactUsers.map((c: any) => c.id.toString());
      setEditForm(prev => ({
        ...prev,
        partners: prev.partners.filter(id => id !== partnerId),
        co_owners: prev.co_owners.filter(id => !contactIds.includes(id.toString()))
      }));
      setEditPartnershipContactMembers(prev => {
        const toRemoveIds = new Set(contactIds);
        return prev.filter((m: any) => !toRemoveIds.has(m.id?.toString()));
      });
      // Nettoyer les co-responsables de ce partenariat (clés string/number selon les flux)
      setEditPartnershipCoResponsibles(prev => {
        const next = { ...prev };
        delete next[String(partnerId)];
        delete next[partnerId];
        return next;
      });
    } else {
      // Ajouter le partenariat et ouvrir la popup de sélection des co-responsables
      setEditForm(prev => ({
        ...prev,
        partners: [...prev.partners, partnerId]
      }));

      // Construire le nom du partenariat pour l'affichage
      const partnerOrgs = partnership.partners || [];
      const partnershipName = partnerOrgs.map((p: any) => p.name).join(', ') || partnership.name || '';

      // Ouvrir la popup de sélection des co-responsables
      setEditPartnershipCoResponsiblesPopup({
        partnershipId: partnerId,
        partnershipName,
        contactUsers
      });
      setEditPartnershipCoResponsiblesSearchTerm('');

      // Ajouter les contact users à editPartnershipContactMembers pour l'affichage
      setEditPartnershipContactMembers(prev => [...prev, ...contactUsers]);
    }
  };

  useEffect(() => {
    if (!project || !apiProjectData || editFormInitializedRef.current) return;

    const mldsInfo = apiProjectData.mlds_information;

    let currentCoResponsibles: string[] = [];
    if (apiProjectData.co_responsibles && Array.isArray(apiProjectData.co_responsibles)) {
      currentCoResponsibles = apiProjectData.co_responsibles
        .map((cr: any) => (cr?.id ?? cr?.user?.id)?.toString())
        .filter(Boolean);
    } else if (apiProjectData.co_owners && Array.isArray(apiProjectData.co_owners)) {
      currentCoResponsibles = apiProjectData.co_owners
        .map((cr: any) => (cr?.id ?? cr?.user?.id)?.toString())
        .filter(Boolean);
    }
    // Dédupliquer (au cas où owner apparaît aussi dans co_owners/co_responsibles)
    currentCoResponsibles = Array.from(new Set(currentCoResponsibles));

    let currentPartnerships: string[] = [];
    if (apiProjectData.partnership_ids?.length) {
      currentPartnerships = apiProjectData.partnership_ids.map((id: number) => id.toString());
    } else if (apiProjectData.partnership_id) {
      currentPartnerships = [apiProjectData.partnership_id.toString()];
    } else if (apiProjectData.partnership?.id) {
      currentPartnerships = [apiProjectData.partnership.id.toString()];
    }
    const isPartnerProject = apiProjectData.is_partner_project || false;

    setEditForm({
      title: project.title,
      description: project.description,
      tags: [...(project.tags || [])],
      startDate: project.startDate,
      endDate: project.endDate,
      pathways: (project.pathways && project.pathways.length > 0)
        ? [...project.pathways]
        : (project.pathway ? [project.pathway] : []),
      status: project.status || 'coming',
      visibility: isMLDSProject ? 'private' : (project.visibility || 'public'),
      isPartnership: isPartnerProject,
      co_owners: currentCoResponsibles,
      partners: currentPartnerships,
      participants: [],
      groupIds: ((apiProjectData.group_ids || (apiProjectData as any).groupIds || []) as number[]).map((id: number) => id.toString()),
      mldsRequestedBy: mldsInfo?.requested_by || 'departement',
      mldsDepartment: mldsInfo?.department_number || mldsInfo?.department_code || '',
      mldsTargetAudience: mldsInfo?.target_audience || 'students_without_solution',
      mldsActionObjectives: mldsInfo?.action_objectives || [],
      mldsActionObjectivesOther: mldsInfo?.action_objectives_other || '',
      mldsObjectives: mldsInfo?.objectives || '',
      mldsCompetenciesDeveloped: mldsInfo?.competencies_developed || '',
      mldsExpectedParticipants: mldsInfo?.expected_participants?.toString() || '',
      mldsFinancialHSE: mldsInfo?.financial_hse != null ? String(mldsInfo.financial_hse) : '',
      mldsFinancialRate:
        mldsInfo?.financial_rate != null
          ? String(mldsInfo.financial_rate)
          : (mldsInfo?.financial_hv != null ? String(mldsInfo.financial_hv) : '50.73'),
      mldsFinancialTransport: Array.isArray(mldsInfo?.financial_transport)
        ? mldsInfo.financial_transport
        : (mldsInfo?.financial_transport != null
          ? [{ transport_name: '', price: String(mldsInfo.financial_transport) }]
          : []),
      mldsFinancialOperating: Array.isArray(mldsInfo?.financial_operating)
        ? mldsInfo.financial_operating
        : (mldsInfo?.financial_operating != null
          ? [{ operating_name: '', price: String(mldsInfo.financial_operating) }]
          : []),
      mldsFinancialAutres: Array.isArray(mldsInfo?.financial_autres_financements)
        ? mldsInfo.financial_autres_financements.map((l: { autres_name?: string; price?: string }) => ({
            autres_name: String(l.autres_name ?? ''),
            price: l.price != null ? String(l.price) : ''
          }))
        : [],
      mldsFinancialHvLines: (() => {
        if (Array.isArray(mldsInfo?.financial_hv_lines) && mldsInfo.financial_hv_lines.length > 0) {
          return mldsInfo.financial_hv_lines.map(
            (l: { teacher_name?: string; hour?: string; price?: string }) => ({
              teacher_name: String(l.teacher_name ?? ''),
              hour:
                l.hour != null && l.hour !== ''
                  ? String(l.hour)
                  : l.price != null
                    ? String(l.price)
                    : ''
            })
          );
        }
        const hv = mldsInfo?.financial_hv;
        if (hv != null && Number(hv) > 0) {
          return [{ teacher_name: '', hour: String(hv) }];
        }
        return [];
      })(),
      mldsFinancialService: (() => {
        const rows = getMldsServiceLinesFromMldsInfo(mldsInfo);
        if (rows.length === 0) return [];
        return rows.map(l => ({
          id: l.id,
          service_name: String(l.service_name ?? ''),
          hours: l.hours != null && l.hours !== '' ? String(l.hours) : '',
          price: l.price != null ? String(l.price) : '',
          comment: l.comment != null ? String(l.comment) : '',
          quote_url: l.quote_url ?? null
        }));
      })(),
      mldsNetworkIssueAddressed: mldsInfo?.network_issue_addressed ?? '',
      mldsOrganizationNames: mldsInfo?.organization_names || [],
      mldsSchoolLevelIds: (
        (mldsInfo?.school_level_ids || apiProjectData.school_level_ids || []) as number[]
      ).map((id: number) => id.toString())
    });
    const svcLen = getMldsServiceLinesFromMldsInfo(mldsInfo).length;
    setEditServiceQuoteFiles(Array.from({ length: svcLen }, () => null));
    setEditMldsServiceLineDestroyedIds([]);
    setEditImagePreview(project.image || '');
    editFormInitializedRef.current = true;
  }, [project, apiProjectData, isMLDSProject]);

  const handleEdit = async () => {
    // Prevent editing if project is ended
    if (isProjectEnded) {
      showError('Impossible de modifier un projet terminé');
      return;
    }

    // Reset edit-related UI state (participants, classes, partnerships, etc.)
    setEditPartnershipContactMembers([]);
    setEditClassSelectionMode({});
    setEditClassManualParticipantIds({});
    setEditClassDetailPopup(null);
    setEditClassCoResponsiblesPopup(null);
    setEditClassCoResponsibles({});
    setEditClassCoResponsiblesSearchTerm('');
    setEditPartnershipCoResponsiblesPopup(null);
    setEditPartnershipCoResponsibles({});
    setEditPartnershipCoResponsiblesSearchTerm('');
    setEditPathwaySearchTerm('');
    setEditPathwayDropdownOpen(false);
    setEditAvailableCompanyGroups([]);
    setEditGroupMembersByGroupId({});
    setEditGroupMembersDetailsByGroupId({});
    setEditGroupDetailPopup(null);
    console.log('🔍 [handleEdit] Project data:', project);
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
    } catch (err) {
      console.error('Error fetching members:', err);
      setEditAvailableMembers([]);
    } finally {
      setIsLoadingEditMembers(false);
    }

    // Pro: load company groups for group attachment selector (edit modal)
    if (state.showingPageType === 'pro') {
      try {
        setIsLoadingEditCompanyGroups(true);
        const companyId = getSelectedOrganizationId(state.user, state.showingPageType);
        if (!companyId) {
          setEditAvailableCompanyGroups([]);
        } else {
          const res = await getCompanyGroups(companyId);
          const raw = res.data?.data || res.data || [];
          setEditAvailableCompanyGroups(Array.isArray(raw) ? raw : []);
        }
      } catch (e) {
        console.error('Error fetching company groups (edit modal):', e);
        setEditAvailableCompanyGroups([]);
      } finally {
        setIsLoadingEditCompanyGroups(false);
      }
    }

    // Load co-responsibles options (school staff + community) when teacher and project has a school
    // Get school ID from project's school_levels or user context
    let projectSchoolId: number | null = null;
    if (state.showingPageType === 'teacher') {
      // Priorité 1: school_id direct dans apiProjectData
      if (apiProjectData?.school_id) {
        projectSchoolId = apiProjectData.school_id;
      }
      // Priorité 2: depuis school_levels
      else if (apiProjectData?.school_levels && apiProjectData.school_levels.length > 0) {
        // Essayer d'abord school.id, puis school_id dans le level
        const firstLevel = apiProjectData.school_levels[0];
        projectSchoolId = firstLevel?.school?.id || firstLevel?.school_id || null;

        // Si toujours null, chercher dans tous les levels
        if (!projectSchoolId) {
          for (const level of apiProjectData.school_levels) {
            const schoolId = level?.school?.id || level?.school_id;
            if (schoolId) {
              projectSchoolId = schoolId;
              break;
            }
          }
        }
      }
      // Priorité 3: fallback à l'école sélectionnée par l'utilisateur
      else {
        const selectedOrgId = getSelectedOrganizationId(state.user, state.showingPageType);
        const selectedSchool = state.user?.available_contexts?.schools?.find((s: any) => s.id === selectedOrgId);
        projectSchoolId = selectedSchool?.id || null;
      }
    }

    if (state.showingPageType === 'teacher' && projectSchoolId) {
      setIsLoadingEditCoResponsibles(true);
      try {
        console.log('🔍 [handleEdit] Fetching co-responsables for school:', projectSchoolId);
        const membersResponse = await getTeacherSchoolMembers(projectSchoolId, { per_page: 500, exclude_me: true });
        console.log('🔍 [handleEdit] Co-responsables fetched:', membersResponse.data?.length || 0);
        setEditCoResponsibleOptions(membersResponse.data || []);
      } catch (error) {
        console.error('Error fetching teacher school members for co-responsibles:', error);
        setEditCoResponsibleOptions([]);
      } finally {
        setIsLoadingEditCoResponsibles(false);
      }
    } else {
      setEditCoResponsibleOptions([]);
    }

    // Load partnerships
    try {
      const organizationType = getOrganizationType(state.showingPageType);
      const organizationId = getOrganizationId(state.user, state.showingPageType);

      if (organizationType && organizationId && (organizationType === 'school' || organizationType === 'company')) {
        const partnershipsResponse = await getPartnerships(organizationId, organizationType);
        let partnerships = partnershipsResponse.data || [];

        // Pour les projets MLDS, ne garder que les partenariats dont les organisations
        // sont des établissements (type School) et sans organisation de type Company
        if (isMLDSProject) {
          partnerships = partnerships.filter((partnership: any) => {
            const partners = partnership.partners || [];
            if (!Array.isArray(partners) || partners.length === 0) return false;
            const hasSchool = partners.some((p: any) => p?.type?.toLowerCase() === 'school');
            const hasCompany = partners.some((p: any) => p?.type?.toLowerCase() === 'company');
            return hasSchool && !hasCompany;
          });
        }

        setEditAvailablePartnerships(partnerships);

        // Contacts des partenaires déjà liés au projet : pour les proposer dans la liste co-responsables
        // (handleEdit vide editPartnershipContactMembers ; sans ça seuls les membres école apparaissent)
        const ownerIdStr = apiProjectData?.owner?.id != null ? apiProjectData.owner.id.toString() : null;
        const selectedPartnershipIds: string[] = (() => {
          const d = apiProjectData;
          if (!d) return [];
          if (d.partnership_ids?.length) return d.partnership_ids.map((id: number) => id.toString());
          if (d.partnership_id != null) return [String(d.partnership_id)];
          if (d.partnership?.id != null) return [String(d.partnership.id)];
          return [];
        })();
        const contactRows: any[] = [];
        const seenContactIds = new Set<string>();
        for (const partnership of partnerships) {
          if (!selectedPartnershipIds.includes(String(partnership.id))) continue;
          const contactUsersRaw = (partnership.partners || []).flatMap((p: any) =>
            (p.contact_users || []).map((c: any) => ({
              id: c.id,
              full_name: c.full_name || '',
              email: c.email || '',
              role: c.role_in_organization || '',
              role_in_organization: c.role_in_organization || '',
              organization: p.name || ''
            }))
          );
          const withoutReferents = contactUsersRaw.filter((c: any) => !isPartnerContactOrgReferent(c));
          const filtered = ownerIdStr
            ? withoutReferents.filter((c: any) => c.id?.toString() !== ownerIdStr)
            : withoutReferents;
          for (const c of filtered) {
            const idStr = c.id?.toString();
            if (!idStr || seenContactIds.has(idStr)) continue;
            seenContactIds.add(idStr);
            contactRows.push(c);
          }
        }
        setEditPartnershipContactMembers(contactRows);
      }
    } catch (err) {
      console.error('Error fetching partnerships:', err);
      setEditAvailablePartnerships([]);
      setEditPartnershipContactMembers([]);
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

    // Load current project participants (member role) for edit form
    const projectId = parseInt(project.id, 10);
    if (!Number.isNaN(projectId)) {
      try {
        const projectMembers = await getProjectMembers(projectId);
        const participantIds: string[] = (projectMembers || [])
          .filter((m: any) => m.project_role !== 'owner' && m.project_role !== 'co_owner')
          .map((m: any) => (m.user?.id ?? m.user_id)?.toString())
          .filter(Boolean);
        setEditForm(prev => ({ ...prev, participants: participantIds }));
      } catch {
        // Keep participants empty on error
      }
    }
  };

  const handleSaveEditInternal = async (
    desiredStatus?: 'draft' | 'to_process' | 'pending_validation' | 'coming' | 'in_progress' | 'ended' | 'archived'
  ) => {
    try {
      const effectiveStatus: 'draft' | 'to_process' | 'pending_validation' | 'coming' | 'in_progress' | 'ended' | 'archived' =
        desiredStatus || editForm.status;
      console.log("🔍 [handleSaveEditInternal] Effective status:", effectiveStatus);
      console.log("🔍 [handleSaveEditInternal] Edit form:", editForm);

      // Validate network issue addressed for MLDS projects when status is to_process, in_progress, coming, or pending_validation
      if (isMLDSProject && (effectiveStatus === 'to_process' || effectiveStatus === 'in_progress' || effectiveStatus === 'coming' || effectiveStatus === 'pending_validation')) {
        if (!editForm.mldsNetworkIssueAddressed || editForm.mldsNetworkIssueAddressed.trim() === '') {
          showError('Veuillez remplir la problématique du réseau à laquelle l\'action répond');
          return;
        }
      }

      // For MLDS projects, force visibility to private
      const formDataWithVisibility = isMLDSProject
        ? { ...editForm, visibility: 'private' as const }
        : editForm;

      // Map edit form to backend payload (pathway from pathways[0] for mapper compatibility)
      const editPayloadForm = {
        ...formDataWithVisibility,
        pathway: (formDataWithVisibility.pathways && formDataWithVisibility.pathways[0]) ?? '',
      };
      const payload = mapEditFormToBackend(editPayloadForm, state.tags || [], project);
      payload.project.status = effectiveStatus;

      // Add co-responsibles, partnership and participants
      let coResponsibleIds = editForm.co_owners
        .map(id => Number.parseInt(id, 10))
        .filter(id => !Number.isNaN(id));
      // MLDS: si l'utilisateur courant est co-responsable, ne jamais le retirer par inadvertance
      if (isMLDSProject && userProjectRole === 'co-owner' && state.user?.id != null) {
        const currentUserId = Number(state.user.id);
        if (!Number.isNaN(currentUserId) && !coResponsibleIds.includes(currentUserId)) {
          coResponsibleIds = [...coResponsibleIds, currentUserId];
        }
      }
      payload.project.co_responsible_ids = coResponsibleIds;
      // Toujours refléter l’état de sélection dans l’UI (permet de retirer tous les partenariats si besoin)
      payload.project.partnership_ids = (editForm.partners || [])
        .map(id => Number.parseInt(id, 10))
        .filter(id => !Number.isNaN(id));
      if (editForm.participants.length > 0) {
        const coResponsibleSet = new Set(coResponsibleIds);
        payload.project.participant_ids = editForm.participants
          .map(id => Number.parseInt(id, 10))
          .filter(id => !Number.isNaN(id))
          .filter(id => !coResponsibleSet.has(id));
      }

      if (isMLDSProject) {
        const schoolCtx = (() => {
          const fromApi = apiProjectData?.school_levels?.[0]?.school?.id;
          if (fromApi != null) return Number(fromApi);
          const oid = getOrganizationId(state.user, state.showingPageType);
          return oid != null ? Number(oid) : null;
        })();

        const coCtx = buildMldsCoResponsibleContexts({
          coResponsibleIds,
          partnershipCoResponsibles: editPartnershipCoResponsibles,
          formPartners: editForm.partners || [],
          availablePartnerships: editAvailablePartnerships,
          mldsOrgLevelIds: editForm.mldsSchoolLevelIds || [],
          availableLevels: availableSchoolLevels,
          classCoResponsiblesByLevel: editClassCoResponsibles,
          schoolContextId: schoolCtx
        });
        if (coCtx.length > 0) {
          payload.project.co_responsible_contexts = coCtx;
        }

        const pids = payload.project.participant_ids;
        if (pids && pids.length > 0 && schoolCtx != null) {
          const pc = buildSchoolParticipantContexts(pids, schoolCtx);
          if (pc.length > 0) {
            payload.project.participant_contexts = pc;
          }
        }
      }

      if (state.showingPageType === 'pro') {
        payload.project.group_ids = (editForm.groupIds || []).map(id => Number.parseInt(id, 10)).filter(id => !Number.isNaN(id));
      }

      let updateMultipartOptions: { serviceQuoteFiles?: (File | null | undefined)[] } | undefined;

      // Add MLDS information if it's an MLDS project
      if (isMLDSProject) {

        const serviceEntries = editForm.mldsFinancialService
          .map((line, idx) => ({ line, idx }))
          .filter(({ line }) => line.service_name.trim() || line.price.trim() || line.hours.trim());
        const serviceQuoteFilesPayload = serviceEntries.map(({ idx }) => editServiceQuoteFiles[idx] ?? null);
        const quoteFilesList = serviceQuoteFilesPayload.filter((f): f is File => f != null);
        if (quoteFilesList.length > MAX_SERVICE_QUOTE_FILES) {
          showError(`Vous pouvez joindre au maximum ${MAX_SERVICE_QUOTE_FILES} devis (prestataires)`);
          return;
        }
        if (quoteFilesList.some(f => f.size > 1024 * 1024)) {
          showError('Chaque devis doit faire moins de 1 Mo');
          return;
        }
        updateMultipartOptions = { serviceQuoteFiles: serviceQuoteFilesPayload };

        const schoolLevelIds = editForm.mldsSchoolLevelIds.map(id => Number.parseInt(id, 10)).filter(id => !Number.isNaN(id));

        payload.project.school_level_ids = schoolLevelIds;
        payload.project.participants_number = editForm.mldsExpectedParticipants
          ? Number.parseInt(editForm.mldsExpectedParticipants, 10)
          : undefined;
        payload.project.skill_ids = [];
        payload.project.company_ids = [];

        const mldsType =
          (apiProjectData?.mlds_information as { type_mlds?: string; type?: string } | undefined)?.type_mlds ??
          (apiProjectData?.mlds_information as { type?: string } | undefined)?.type ??
          'perseverance';

        const mldsInformationId = (apiProjectData?.mlds_information as { id?: number } | undefined)?.id;

        const hvLinesPayload =
          editForm.mldsFinancialHvLines.length > 0
            ? editForm.mldsFinancialHvLines
                .filter(line => line.teacher_name.trim() || line.hour.trim())
                .map(line => ({
                  teacher_name: line.teacher_name.trim(),
                  hour: line.hour.trim()
                }))
            : null;

        payload.project.mlds_information_attributes = {
          ...(mldsInformationId != null ? { id: mldsInformationId } : {}),
          requested_by: editForm.mldsRequestedBy,
          department_number: editForm.mldsRequestedBy === 'departement' && editForm.mldsDepartment ? editForm.mldsDepartment : null,
          type_mlds: mldsType,
          school_level_ids: schoolLevelIds,
          target_audience: editForm.mldsTargetAudience,
          action_objectives: editForm.mldsActionObjectives,
          action_objectives_other: editForm.mldsActionObjectivesOther || null,
          objectives: editForm.mldsObjectives || null,
          competencies_developed: editForm.mldsCompetenciesDeveloped || null,
          expected_participants: editForm.mldsExpectedParticipants ? parseInt(editForm.mldsExpectedParticipants) : null,
          financial_hse: editForm.mldsFinancialHSE ? Number.parseFloat(editForm.mldsFinancialHSE) : null,
          financial_hv: null,
          financial_rate: editForm.mldsFinancialRate ? Number.parseFloat(editForm.mldsFinancialRate) : null,
          financial_hv_lines: hvLinesPayload,
          financial_transport: editForm.mldsFinancialTransport.length > 0 ? editForm.mldsFinancialTransport.filter(line => line.transport_name.trim() || line.price.trim()) : null,
          financial_operating: editForm.mldsFinancialOperating.length > 0 ? editForm.mldsFinancialOperating.filter(line => line.operating_name.trim() || line.price.trim()) : null,
          financial_autres_financements:
            editForm.mldsFinancialAutres.length > 0
              ? editForm.mldsFinancialAutres.filter(line => line.autres_name.trim() || line.price.trim())
              : null,
          mlds_financial_service_lines_attributes: (() => {
            const activeAttrs =
              serviceEntries.length > 0
                ? serviceEntries.map(({ line }, pos) => ({
                    position: pos,
                    ...(line.id != null ? { id: line.id } : {}),
                    service_name: line.service_name,
                    price: line.price,
                    ...(line.hours.trim() ? { hours: line.hours } : {}),
                    comment: line.comment.trim() ? line.comment.trim() : null
                  }))
                : [];
            const destroyAttrs = editMldsServiceLineDestroyedIds.map(id => ({
              id,
              _destroy: '1' as const
            }));
            const merged = [...activeAttrs, ...destroyAttrs];
            return merged.length > 0 ? merged : null;
          })(),
          network_issue_addressed: editForm.mldsNetworkIssueAddressed || null
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

      await updateProject(projectId, payload, mainImageFile, undefined, updateMultipartOptions);

      // Reload project from API to get updated data
      const response = await getProjectById(projectId);
      const apiProject = response.data;
      const mappedProject = mapApiProjectToFrontendProject(apiProject, state.showingPageType, state.user);

      // Update project state
      setProject(mappedProject);
      setSelectedProject(mappedProject);

      // Update apiProjectData to reflect changes
      setApiProjectData(apiProject);

      // Refetch project members when participants or co-responsibles were in the payload (GET /api/v1/projects/:id/members)
      const hadMembersPayload =
        payload.project.co_responsible_ids !== undefined ||
        payload.project.participant_ids !== undefined ||
        (payload.project as any).group_ids !== undefined;
      if (hadMembersPayload) {
        try {
          const members = await fetchAllProjectMembers(apiProject);
          setParticipants(members);
        } catch (err) {
          console.error('Error refetching project members after edit:', err);
        }
      }

      setIsEditModalOpen(false);
      setEditImagePreview('');
      setEditMldsServiceLineDestroyedIds([]);
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

    let statusForSubmit: 'draft' | 'to_process' | 'pending_validation' | 'coming' | 'in_progress' | 'ended' | 'archived';

    if (isTeacher) {
      // Cas spécial : enseignants avec projets MLDS → "À traiter"
      statusForSubmit = 'to_process';
    } else {
      // Déterminer le statut automatiquement en fonction de la date de début
      if (editForm.startDate) {
        const startDate = new Date(editForm.startDate);
        const today = new Date();
        // Réinitialiser les heures pour comparer uniquement les dates
        today.setHours(0, 0, 0, 0);
        startDate.setHours(0, 0, 0, 0);

        // Si la date de début est dans le passé, le projet est "en cours"
        // Sinon, il est "à venir"
        if (startDate <= today) {
          statusForSubmit = 'in_progress';
        } else {
          statusForSubmit = 'coming';
        }
      } else {
        // Si pas de date de début, utiliser le statut du formulaire ou "à venir" par défaut
        statusForSubmit = editForm.status || 'coming';
      }
    }

    await handleSaveEditInternal(statusForSubmit);
  };

  const handleSaveEditDraft = async () => {
    setEditForm(prev => ({ ...prev, status: 'draft' }));
    await handleSaveEditInternal('draft');
  };

  /**
   * Passer le projet MLDS en validation (statut "à valider")
   * Visible pour admin/superadmin d'école quand le projet est en "à traiter"
   */
  const handlePassToValidation = async () => {
    if (!apiProjectData || !isMLDSProject || project.status !== 'to_process') {
      return;
    }
    try {
      await handleSaveEditInternal('pending_validation');
      showSuccess('Projet passé en validation avec succès');
    } catch (error: any) {
      console.error('Error passing project to validation:', error);
      const errorMessage = error.response?.data?.details?.join(', ') || error.response?.data?.message || error.message || 'Erreur lors du passage en validation';
      showError(errorMessage);
    }
  };

  /**
   * Refuser le projet MLDS (retour au statut "brouillon")
   * Visible pour admin/superadmin d'école quand le projet est en "à traiter"
   */
  const handleRefuseProject = async () => {
    if (!apiProjectData || !isMLDSProject || project.status !== 'to_process') {
      return;
    }
    if (!window.confirm('Êtes-vous sûr de vouloir refuser ce projet ? Il sera remis en brouillon.')) {
      return;
    }
    try {
      await handleSaveEditInternal('draft');
      showSuccess('Projet refusé et remis en brouillon');
    } catch (error: any) {
      console.error('Error refusing project:', error);
      const errorMessage = error.response?.data?.details?.join(', ') || error.response?.data?.message || error.message || 'Erreur lors du refus du projet';
      showError(errorMessage);
    }
  };

  /**
   * Valider le projet MLDS (passer en "en cours" ou "à venir" selon la date de début)
   * Visible uniquement pour superadmin quand le projet est en "à valider"
   */
  const handleValidateProject = async () => {
    if (!apiProjectData || !isMLDSProject || project.status !== 'pending_validation') {
      return;
    }
    try {
      // Déterminer le statut selon la date de début
      let newStatus: 'in_progress' | 'coming' = 'coming';
      if (project.startDate) {
        const startDate = new Date(project.startDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        startDate.setHours(0, 0, 0, 0);
        if (startDate <= today) {
          newStatus = 'in_progress';
        } else {
          newStatus = 'coming';
        }
      }
      await handleSaveEditInternal(newStatus);
      showSuccess(`Projet validé et passé en "${getStatusText(newStatus)}"`);
    } catch (error: any) {
      console.error('Error validating project:', error);
      const errorMessage = error.response?.data?.details?.join(', ') || error.response?.data?.message || error.message || 'Erreur lors de la validation du projet';
      showError(errorMessage);
    }
  };

  const setEditClassMode = (classId: string, mode: 'manual' | 'all') => {
    setEditClassSelectionMode(prev => ({ ...prev, [classId]: mode }));
    if (mode === 'all') {
      setEditClassManualParticipantIds(prev => {
        const next = { ...prev };
        delete next[classId];
        return next;
      });
    } else {
      setEditClassManualParticipantIds(prev => ({ ...prev, [classId]: [] }));
    }
  };

  const toggleEditClassManualParticipant = (classId: string, memberId: string) => {
    const idStr = memberId.toString();
    setEditClassManualParticipantIds(prev => {
      const current = prev[classId] || [];
      return current.includes(idStr)
        ? { ...prev, [classId]: current.filter(id => id !== idStr) }
        : { ...prev, [classId]: [...current, idStr] };
    });
  };

  // Helper functions for managing financial lines in edit form
  const addEditFinancialLine = (
    fieldName: 'mldsFinancialTransport' | 'mldsFinancialOperating' | 'mldsFinancialService' | 'mldsFinancialHvLines' | 'mldsFinancialAutres'
  ) => {
    if (fieldName === 'mldsFinancialService') {
      setEditServiceQuoteFiles(q => [...q, null]);
    }
    setEditForm(prev => {
      if (fieldName === 'mldsFinancialTransport') {
        return { ...prev, [fieldName]: [...prev[fieldName], { transport_name: '', price: '' }] };
      }
      if (fieldName === 'mldsFinancialOperating') {
        return { ...prev, [fieldName]: [...prev[fieldName], { operating_name: '', price: '' }] };
      }
      if (fieldName === 'mldsFinancialHvLines') {
        return { ...prev, [fieldName]: [...prev[fieldName], { teacher_name: '', hour: '' }] };
      }
      if (fieldName === 'mldsFinancialAutres') {
        return { ...prev, [fieldName]: [...prev[fieldName], { autres_name: '', price: '' }] };
      }
      return {
        ...prev,
        [fieldName]: [...prev[fieldName], { service_name: '', hours: '', price: '', comment: '', quote_url: null }]
      };
    });
  };

  const removeEditFinancialLine = (
    fieldName: 'mldsFinancialTransport' | 'mldsFinancialOperating' | 'mldsFinancialService' | 'mldsFinancialHvLines' | 'mldsFinancialAutres',
    index: number
  ) => {
    if (fieldName === 'mldsFinancialService') {
      setEditForm(prev => {
        const arr = prev.mldsFinancialService;
        const row = arr[index];
        if (row?.id != null) {
          setEditMldsServiceLineDestroyedIds(ids =>
            ids.includes(row.id!) ? ids : [...ids, row.id!]
          );
        }
        const filtered = arr.filter((_, i) => i !== index);
        return { ...prev, mldsFinancialService: filtered };
      });
      setEditServiceQuoteFiles(q => q.filter((_, i) => i !== index));
      return;
    }
    setEditForm(prev => {
      const arr = prev[fieldName] as Array<unknown>;
      const filtered = arr.filter((_: unknown, i: number) => i !== index);
      type FinancialLinesType =
        | Array<{ transport_name: string; price: string }>
        | Array<{ operating_name: string; price: string }>
        | Array<{ id?: number; service_name: string; hours: string; price: string; comment: string; quote_url?: string | null }>
        | Array<{ teacher_name: string; hour: string }>
        | Array<{ autres_name: string; price: string }>;
      return {
        ...prev,
        [fieldName]: filtered as FinancialLinesType
      };
    });
  };

  const updateEditFinancialLine = (
    fieldName: 'mldsFinancialTransport' | 'mldsFinancialOperating' | 'mldsFinancialService' | 'mldsFinancialHvLines' | 'mldsFinancialAutres',
    index: number,
    field: 'name' | 'price' | 'hours' | 'hour' | 'comment',
    value: string
  ) => {
    setEditForm(prev => {
      const newArray = [...prev[fieldName]] as any[];
      if (fieldName === 'mldsFinancialTransport') {
        newArray[index] = {
          ...newArray[index],
          transport_name: field === 'name' ? value : newArray[index].transport_name,
          price: field === 'price' ? value : newArray[index].price
        };
      } else if (fieldName === 'mldsFinancialOperating') {
        newArray[index] = {
          ...newArray[index],
          operating_name: field === 'name' ? value : newArray[index].operating_name,
          price: field === 'price' ? value : newArray[index].price
        };
      } else if (fieldName === 'mldsFinancialHvLines') {
        newArray[index] = {
          ...newArray[index],
          teacher_name: field === 'name' ? value : newArray[index].teacher_name,
          hour: field === 'hour' ? value : newArray[index].hour
        };
      } else if (fieldName === 'mldsFinancialAutres') {
        newArray[index] = {
          ...newArray[index],
          autres_name: field === 'name' ? value : newArray[index].autres_name,
          price: field === 'price' ? value : newArray[index].price
        };
      } else {
        newArray[index] = {
          ...newArray[index],
          service_name: field === 'name' ? value : newArray[index].service_name,
          hours: field === 'hours' ? value : newArray[index].hours,
          price: field === 'price' ? value : newArray[index].price,
          comment: field === 'comment' ? value : newArray[index].comment
        };
      }
      return { ...prev, [fieldName]: newArray };
    });
  };

  const computedEditServiceHourlyRate = (line: { hours: string; price: string }): string => {
    const h = Number.parseFloat(line.hours);
    const p = Number.parseFloat(line.price);
    if (!line.hours?.trim() || h <= 0 || Number.isNaN(h)) return '—';
    if (Number.isNaN(p)) return '—';
    return `${(p / h).toFixed(2)} €/h`;
  };

  // Calculate total from financial lines array
  const calculateFinancialLinesTotal = (
    lines: Array<{ transport_name?: string; operating_name?: string; service_name?: string; price: string }>
  ): number => {
    return lines.reduce((sum, line) => {
      const price = Number.parseFloat(line.price) || 0;
      return sum + price;
    }, 0);
  };

  /** Crédits HV : somme (heures ligne × taux horaire MLDS) */
  const calculateHvLinesTotal = (
    lines: Array<{ teacher_name: string; hour: string }>,
    financialRate: number
  ): number => {
    const rate = Number.isFinite(financialRate) && financialRate > 0 ? financialRate : HV_DEFAULT_RATE;
    return lines.reduce((sum, line) => sum + hvLineHours(line) * rate, 0);
  };

  const calculateAutresFinancementTotal = (lines: Array<{ autres_name: string; price: string }>): number => {
    return lines.reduce((sum, line) => sum + (Number.parseFloat(line.price) || 0), 0);
  };

  const handleEditSchoolLevelToggle = (schoolLevelId: string) => {
    const isAlreadySelected = editForm.mldsSchoolLevelIds.includes(schoolLevelId);
    if (isAlreadySelected) {
      // Récupérer les co-responsables de cette classe avant de la supprimer
      const coResponsiblesToRemove = editClassCoResponsibles[schoolLevelId] || [];

      setEditForm(prev => {
        const updatedSchoolLevelIds = prev.mldsSchoolLevelIds.filter(id => id !== schoolLevelId);
        const memberIdsInClass = getEditStudentsInClass(schoolLevelId).map((m: any) => m.id?.toString()).filter(Boolean);
        const participantsToRemove = new Set(memberIdsInClass);
        const updatedParticipants = prev.participants.filter(id => !participantsToRemove.has(id.toString()));

        // Retirer les co-responsables de cette classe
        const coResponsiblesToRemoveSet = new Set(coResponsiblesToRemove);
        const updatedCoResponsibles = prev.co_owners.filter(id => !coResponsiblesToRemoveSet.has(id));

        return {
          ...prev,
          mldsSchoolLevelIds: updatedSchoolLevelIds,
          participants: updatedParticipants,
          co_owners: updatedCoResponsibles
        };
      });
      setEditClassSelectionMode(prev => {
        const next = { ...prev };
        delete next[schoolLevelId];
        return next;
      });
      setEditClassManualParticipantIds(prev => {
        const next = { ...prev };
        delete next[schoolLevelId];
        return next;
      });
      // Nettoyer les co-responsables de cette classe
      setEditClassCoResponsibles(prev => {
        const next = { ...prev };
        delete next[schoolLevelId];
        return next;
      });
      setEditClassDetailPopup(null);
      return;
    }
    setEditForm(prev => ({ ...prev, mldsSchoolLevelIds: [...prev.mldsSchoolLevelIds, schoolLevelId] }));
    const classItem = availableSchoolLevels.find((l: any) => l.id?.toString() === schoolLevelId);
    const className = classItem ? `${classItem.name}${classItem.level ? ` - ${classItem.level}` : ''}` : schoolLevelId;
    setEditClassDetailPopup({ classId: schoolLevelId, className, mode: 'choice' });
  };

  const handleCancelEdit = () => {
    setIsEditModalOpen(false);
    setEditImagePreview('');
    setEditMldsServiceLineDestroyedIds([]);
    setEditPathwaySearchTerm('');
    setEditPathwayDropdownOpen(false);
  };

  // Sync editForm.participants from class selection (school context) — like ProjectModal. Only overwrite when at least one class has a mode set.
  const editUseClassBasedParticipants = getOrganizationType(state.showingPageType) === 'school' && editForm.mldsSchoolLevelIds.length > 0;
  useEffect(() => {
    if (!editUseClassBasedParticipants || !isEditModalOpen) return;
    const hasAnyMode = editForm.mldsSchoolLevelIds.some(cid => editClassSelectionMode[cid]);
    if (!hasAnyMode) return;
    const fromClasses: string[] = [];
    editForm.mldsSchoolLevelIds.forEach(classId => {
      const mode = editClassSelectionMode[classId];
      if (mode === 'all') {
        getEditStudentsInClass(classId).forEach((m: any) => {
          const id = m.id?.toString();
          if (id) fromClasses.push(id);
        });
      } else if (mode === 'manual') {
        (editClassManualParticipantIds[classId] || []).forEach(id => fromClasses.push(id));
      }
    });
    setEditForm(prev => ({ ...prev, participants: Array.from(new Set(fromClasses)) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editClassSelectionMode, editClassManualParticipantIds, editForm.mldsSchoolLevelIds, editUseClassBasedParticipants, isEditModalOpen, editAvailableMembers]);

  // Synchroniser editForm.co_owners à partir des co-responsables sélectionnés par classe et par partenariat
  useEffect(() => {
    if (!isEditModalOpen) return;

    // Récupérer tous les co-responsables des classes actuellement sélectionnées uniquement
    const fromClasses: string[] = [];
    editForm.mldsSchoolLevelIds.forEach(classId => {
      (editClassCoResponsibles[classId] || []).forEach(id => {
        if (!fromClasses.includes(id)) fromClasses.push(id);
      });
    });

    // Récupérer tous les co-responsables des partenariats actuellement sélectionnés uniquement
    const fromPartnerships: string[] = [];
    editForm.partners.forEach(partnershipId => {
      (editPartnershipCoResponsibles[partnershipId] || []).forEach(id => {
        if (!fromPartnerships.includes(id)) fromPartnerships.push(id);
      });
    });

    // Récupérer les IDs de tous les co-responsables qui viennent des classes et partenariats sélectionnés
    const allSelectedIds = new Set([...fromClasses, ...fromPartnerships]);

    // Récupérer les co-responsables qui ne viennent pas des classes ni des partenariats (sélection manuelle globale)
    setEditForm(prev => {
      // Garder uniquement les co-responsables qui ne viennent pas des classes ni des partenariats sélectionnés
      const nonClassOrPartnershipCoResponsibles = prev.co_owners.filter(id => !allSelectedIds.has(id));

      // Fusionner avec les co-responsables des classes et partenariats sélectionnés
      const allCoResponsibles = Array.from(new Set([...nonClassOrPartnershipCoResponsibles, ...fromClasses, ...fromPartnerships]));
      return { ...prev, co_owners: allCoResponsibles };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editClassCoResponsibles, editPartnershipCoResponsibles, editForm.mldsSchoolLevelIds, editForm.partners, isEditModalOpen]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (editPathwayDropdownRef.current && !editPathwayDropdownRef.current.contains(e.target as Node)) {
        setEditPathwayDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
    setEditForm(prev => ({ ...prev, tags: newTags }));
  };

  const addTag = () => {
    setEditForm(prev => ({ ...prev, tags: [...prev.tags, ''] }));
  };

  const removeTag = (index: number) => {
    const newTags = editForm.tags.filter((_, i) => i !== index);
    setEditForm(prev => ({ ...prev, tags: newTags }));
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
      attributedByJob: sender.job,
      attributedByRole: sender.role,
      attributedByOrganization: sender.organization || organization.name || 'Non spécifiée',
      attributedByIsDeleted: sender.is_deleted || false,
      projectId: project?.id || '',
      projectTitle: project?.title || '',
      domaineEngagement: item.comment || '', // fallback
      commentaire: item.comment || '',
      preuveFiles: documents,
      preuve,
      dateAttribution: item.assigned_at || item.created_at || new Date().toISOString(),
    };
  };

  const fetchProjectBadgesData = useCallback(async (page: number = 1) => {
    if (!project?.id) return;
    setIsLoadingProjectBadges(true);
    setProjectBadgesError(null);
    try {
      const projectId = parseInt(project.id);
      const filters: { series?: string; level?: string; sender_id?: number; receiver_query?: string } = {};
      if (badgeSeriesFilter) filters.series = mapSeriesToBackend(badgeSeriesFilter);
      if (badgeLevelFilter) filters.level = `level_${badgeLevelFilter}`;
      if (debouncedBadgeReceiverQuery) filters.receiver_query = debouncedBadgeReceiverQuery;
      // Participant avec droit de badges: only badges they attributed
      if (userProjectRole === 'participant avec droit de badges' && state.user?.id != null) {
        filters.sender_id = typeof state.user.id === 'number' ? state.user.id : parseInt(String(state.user.id), 10);
      }
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
  }, [project?.id, badgeSeriesFilter, badgeLevelFilter, debouncedBadgeReceiverQuery, userProjectRole, state.user?.id]);

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

    if (isProjectEnded) {
      showError('Impossible d\'ajouter des documents à un projet terminé');
      return;
    }

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

  /** Display label for project role (used in list view). */
  const getProjectRoleLabel = (value: string): string => {
    switch (value) {
      case 'owner': return 'Responsable du projet';
      case 'co-owner': return 'Co-responsable du projet';
      case 'member': return 'Participant';
      case 'member-with-badges': return 'Participant avec droit de badges';
      case 'admin': return 'Admin';
      default: return value;
    }
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

  const handleCopyLink = async () => {
    if (!project?.id || isLoadingShareLink) return;
    try {
      setIsLoadingShareLink(true);
      const response = await getOrCreateProjectShareLink(Number(project.id));
      setShareToken(response.token);
      setIsShareModalOpen(true);
    } catch (error: any) {
      // If share-link generation fails, surface a clear error instead of silently copying /p/:id
      console.error('Error generating project share link:', error);
      showError('Impossible de générer le lien de partage');
    } finally {
      setIsLoadingShareLink(false);
    }
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

  const currentCoverSrc = allPhotos[currentPhotoIndex];

  useEffect(() => {
    if (allPhotos.length === 0) {
      setCoverImageLoaded(true);
      return;
    }
    setCoverImageLoaded(false);
  }, [currentPhotoIndex, currentCoverSrc, allPhotos.length]);

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
    const pdfBilan = mldsInfo.mlds_bilan ?? mldsInfo.mnt;
    const fmt = (v: unknown) => (v != null && v !== '' ? (typeof v === 'number' ? v.toFixed(2) : String(v)) : '—');
    let y = 0;
    const lh = 5.5;
    const pH = doc.internal.pageSize.getHeight();
    const pW = doc.internal.pageSize.getWidth();
    const ml = 20; // marge gauche
    const mr = 20; // marge droite
    const contentW = pW - ml - mr;

    // Couleurs institutionnelles Éducation nationale
    const bleuEN = [0, 63, 135];       // Bleu foncé EN
    const bleuClair = [230, 240, 250];  // Fond bleu clair
    const vertBilan = [22, 101, 52];    // Vert pour bilan
    const vertClair = [240, 253, 244];  // Fond vert clair
    const gris = [55, 65, 81];          // Texte principal
    const grisLabel = [107, 114, 128];  // Labels
    const grisClair = [229, 231, 235];  // Lignes séparation

    const checkPage = (space = 12) => {
      if (y + space > pH - 25) {
        doc.addPage();
        y = 25;
        return true;
      }
      return false;
    };

    const addFooters = () => {
      const totalPages = doc.getNumberOfPages();
      const today = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setDrawColor(grisClair[0], grisClair[1], grisClair[2]);
        doc.setLineWidth(0.3);
        doc.line(ml, pH - 18, pW - mr, pH - 18);
        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(grisLabel[0], grisLabel[1], grisLabel[2]);
        doc.text(`Édité le ${today}`, ml, pH - 12);
        doc.text(`Page ${i} / ${totalPages}`, pW - mr, pH - 12, { align: 'right' });
        doc.text('Document généré par Kinship — Mission de Lutte contre le Décrochage Scolaire', pW / 2, pH - 12, { align: 'center' });
      }
    };

    const wrapped = (text: string, x: number, maxW: number, bold = false) => {
      doc.setFont('helvetica', bold ? 'bold' : 'normal');
      const lines = doc.splitTextToSize(text, maxW);
      lines.forEach((line: string) => {
        checkPage();
        doc.text(line, x, y);
        y += lh;
      });
    };

    // ========== EN-TÊTE ==========
    // Bandeau bleu EN
    doc.setFillColor(bleuEN[0], bleuEN[1], bleuEN[2]);
    doc.rect(0, 0, pW, 38, 'F');

    // Titre blanc sur bandeau
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('Fiche Projet MLDS', ml, 16);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    if (apiProjectData.mlds_information.type_mlds === 'remediation') {
      doc.text('Mission de Lutte contre le Décrochage Scolaire — Volet Remédiation', ml, 24);
    } else {
      doc.text('Mission de Lutte contre le Décrochage Scolaire — Volet Persévérance Scolaire', ml, 24);
    }

    // Date et statut en haut à droite
    const statusText = getStatusText(project.status);
    doc.setFontSize(8);
    doc.text(`Statut : ${statusText}`, pW - mr, 16, { align: 'right' });
    doc.text(`Période : ${formatDateRange(project.startDate, project.endDate)}`, pW - mr, 22, { align: 'right' });

    // Organisation sous le bandeau
    y = 32;
    if (project.organization) {
      doc.setFontSize(8);
      doc.text(project.organization, pW - mr, y, { align: 'right' });
    }

    // Titre du projet
    y = 48;
    doc.setTextColor(bleuEN[0], bleuEN[1], bleuEN[2]);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    const titleLines = doc.splitTextToSize(project.title, contentW);
    titleLines.forEach((line: string) => {
      doc.text(line, ml, y);
      y += 7;
    });
    y += 2;

    // Ligne de séparation fine
    doc.setDrawColor(bleuEN[0], bleuEN[1], bleuEN[2]);
    doc.setLineWidth(0.6);
    doc.line(ml, y, pW - mr, y);
    y += 8;

    // ========== INFORMATIONS GÉNÉRALES ==========
    // Encadré bleu clair avec infos clés
    doc.setFillColor(bleuClair[0], bleuClair[1], bleuClair[2]);
    const infoBoxY = y;
    const infoBoxH = 28;
    doc.roundedRect(ml, infoBoxY, contentW, infoBoxH, 2, 2, 'F');

    const col1 = ml + 5;
    const col2 = ml + contentW * 0.35;
    const col3 = ml + contentW * 0.65;

    // Ligne 1 dans l'encadré
    y = infoBoxY + 7;
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(grisLabel[0], grisLabel[1], grisLabel[2]);
    doc.text('PARCOURS', col1, y);
    doc.text('PARTICIPANTS', col2, y);
    doc.text('RESPONSABLE', col3, y);
    y += 4;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(gris[0], gris[1], gris[2]);
    doc.text(project.pathway ? project.pathway.toUpperCase() : '—', col1, y);
    doc.text(`${projectStats?.overview?.total_members || project.participants || 0}`, col2, y);
    doc.text(project.responsible?.name || '—', col3, y);

    // Ligne 2 dans l'encadré
    y += 6;
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(grisLabel[0], grisLabel[1], grisLabel[2]);
    if (mldsInfo.expected_participants != null) doc.text('EFFECTIFS PRÉVISIONNELS', col1, y);
    if (project.responsible?.email) doc.text('EMAIL', col3, y);
    y += 4;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(gris[0], gris[1], gris[2]);
    if (mldsInfo.expected_participants != null) doc.text(`${mldsInfo.expected_participants} participants`, col1, y);
    if (project.responsible?.email) doc.text(project.responsible.email, col3, y);

    y = infoBoxY + infoBoxH + 8;

    // Description
    if (project.description) {
      checkPage(15);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(bleuEN[0], bleuEN[1], bleuEN[2]);
      doc.text('Description du projet', ml, y);
      y += 6;
      doc.setFontSize(9);
      doc.setTextColor(gris[0], gris[1], gris[2]);
      wrapped(project.description, ml, contentW);
      y += 3;
    }

    // Co-responsables
    if (project.coResponsibles && project.coResponsibles.length > 0) {
      checkPage(12);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(bleuEN[0], bleuEN[1], bleuEN[2]);
      doc.text('Co-responsables', ml, y);
      y += 5;
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(gris[0], gris[1], gris[2]);
      project.coResponsibles.forEach((coResp) => {
        checkPage(6);
        const txt = coResp.email ? `${coResp.name} — ${coResp.email}` : coResp.name;
        doc.text(`• ${txt}`, ml + 2, y);
        y += lh;
      });
      y += 3;
    }

    // Partenaires
    const partnersList = (project.partners && project.partners.length > 0) ? project.partners : (project.partner ? [project.partner] : []);
    if (partnersList.length > 0) {
      checkPage(12);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(bleuEN[0], bleuEN[1], bleuEN[2]);
      doc.text(partnersList.length > 1 ? 'Partenaires' : 'Partenaire', ml, y);
      y += 5;
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(gris[0], gris[1], gris[2]);
      partnersList.forEach((p) => {
        checkPage(6);
        doc.text(`• ${p.name}`, ml + 2, y);
        y += lh;
      });
      y += 3;
    }

    // Organisations porteuses
    if (mldsInfo.organization_names && mldsInfo.organization_names.length > 0) {
      checkPage(12);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(bleuEN[0], bleuEN[1], bleuEN[2]);
      doc.text('Établissements porteurs', ml, y);
      y += 5;
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(gris[0], gris[1], gris[2]);
      mldsInfo.organization_names.forEach((org: string) => {
        checkPage(6);
        doc.text(`• ${org}`, ml + 2, y);
        y += lh;
      });
      y += 3;
    }

    // Tags
    if (project.tags && project.tags.length > 0) {
      checkPage(10);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(bleuEN[0], bleuEN[1], bleuEN[2]);
      doc.text('Mots-clés', ml, y);
      y += 5;
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(gris[0], gris[1], gris[2]);
      wrapped(project.tags.map(tag => `#${tag}`).join('   '), ml, contentW);
      y += 3;
    }

    // ========== SECTION MLDS ==========
    checkPage(20);
    y += 2;
    doc.setFillColor(bleuEN[0], bleuEN[1], bleuEN[2]);
    doc.roundedRect(ml, y, contentW, 8, 1, 1, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('DISPOSITIF MLDS', ml + 4, y + 5.5);
    y += 14;

    // Demande faite par
    if (mldsInfo.requested_by) {
      checkPage(10);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(grisLabel[0], grisLabel[1], grisLabel[2]);
      doc.text('DEMANDE FAITE PAR', ml, y);
      y += 4;
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(gris[0], gris[1], gris[2]);
      doc.text(mldsInfo.requested_by === 'departement' ? 'Département' : 'Réseau foquale', ml, y);
      y += lh + 2;
    }

    // Public ciblé
    if (mldsInfo.target_audience) {
      checkPage(10);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(grisLabel[0], grisLabel[1], grisLabel[2]);
      doc.text('PUBLIC CIBLÉ', ml, y);
      y += 4;
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(gris[0], gris[1], gris[2]);
      let targetText = '';
      if (mldsInfo.target_audience === 'students_without_solution') targetText = 'Élèves sans solution à la rentrée';
      else if (mldsInfo.target_audience === 'students_at_risk') targetText = 'Élèves en situation de décrochage repérés par le GPDS';
      else if (mldsInfo.target_audience === 'school_teams') targetText = 'Équipes des établissements';
      else if (mldsInfo.target_audience === 'mlds_assigned') targetText = 'Élèves affectés à la MLDS';
      else if (mldsInfo.target_audience === 'pafi_tdo') targetText = 'Élèves en PAFI TDO';
      wrapped(targetText, ml, contentW);
      y += 2;
    }

    // Problématique réseau / Actions concernées (remédiation)
    if (mldsInfo.network_issue_addressed) {
      const isRemediationType =
        (mldsInfo as any)?.type === 'remediation' ||
        (mldsInfo as any)?.type_mlds === 'remediation';

      checkPage(12);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(grisLabel[0], grisLabel[1], grisLabel[2]);
      doc.text(isRemediationType ? 'ACTIONS CONCERNÉES' : 'PROBLÉMATIQUE DU RÉSEAU', ml, y);
      y += 4;
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(gris[0], gris[1], gris[2]);

      if (isRemediationType) {
        const items = String(mldsInfo.network_issue_addressed)
          .split(' | ')
          .map((s) => s.trim())
          .filter((s) => s.length > 0);
        items.forEach((label) => {
          checkPage(6);
          doc.text(`• ${label}`, ml + 2, y);
          y += lh;
        });
        y += 2;
      } else {
        wrapped(String(mldsInfo.network_issue_addressed), ml, contentW);
        y += 2;
      }
    }

    // Objectifs pédagogiques
    if (mldsInfo.objectives) {
      checkPage(12);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(grisLabel[0], grisLabel[1], grisLabel[2]);
      doc.text('OBJECTIFS PÉDAGOGIQUES', ml, y);
      y += 4;
      doc.setFontSize(9);
      doc.setTextColor(gris[0], gris[1], gris[2]);
      wrapped(mldsInfo.objectives, ml, contentW);
      y += 2;
    }

    // Objectifs de l'action
    if (mldsInfo.action_objectives && mldsInfo.action_objectives.length > 0) {
      checkPage(12);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(grisLabel[0], grisLabel[1], grisLabel[2]);
      doc.text('OBJECTIFS DE L\'ACTION', ml, y);
      y += 5;

      const objectiveLabels: { [key: string]: string } = {
        'path_security': 'Sécurisation des parcours (liaison inter-cycles)',
        'professional_discovery': 'Découverte des filières professionnelles',
        'student_mobility': 'Développement de la mobilité des élèves',
        'cps_development': 'Développement des CPS',
        'territory_partnership': 'Rapprochement avec les partenaires du territoire',
        'family_links': 'Renforcement des liens familles-élèves',
        'professional_development': 'Co-développement professionnel',
        'art_culture_path': 'Parcours d\'éducation artistique et culturel',
        'future_path_development': 'Parcours avenir',
        'citizen_path_development': 'Parcours citoyen',
        'physical_education': 'Apprendre par l\'éducation physique et sportive',
        'disciplinary_course': 'Cours disciplinaire',
        'job_discovery': 'Découverte des métiers',
        'training_discovery': 'Découverte des formations',
        'other': 'Autre'
      };

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(gris[0], gris[1], gris[2]);
      mldsInfo.action_objectives.forEach((obj: string) => {
        checkPage(6);
        doc.text(`• ${objectiveLabels[obj] || obj}`, ml + 2, y);
        y += lh;
      });

      if (mldsInfo.action_objectives_other) {
        checkPage(6);
        doc.setFont('helvetica', 'italic');
        doc.text(`  ${mldsInfo.action_objectives_other}`, ml + 4, y);
        doc.setFont('helvetica', 'normal');
        y += lh;
      }
      y += 2;
    }

    // Compétences développées
    if (mldsInfo.competencies_developed) {
      checkPage(12);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(grisLabel[0], grisLabel[1], grisLabel[2]);
      doc.text('COMPÉTENCES DÉVELOPPÉES', ml, y);
      y += 4;
      doc.setFontSize(9);
      doc.setTextColor(gris[0], gris[1], gris[2]);
      wrapped(mldsInfo.competencies_developed, ml, contentW);
      y += 2;
    }

    // ========== MOYENS FINANCIERS (+ BILAN en colonnes si présent) ==========
  const hasFinancials = mldsInfo.financial_hse != null ||
      mldsInfo.financial_rate != null ||
      mldsInfo.financial_hv != null ||
      mldsInfo.financial_transport != null ||
      mldsInfo.financial_operating != null ||
      getMldsServiceLinesFromMldsInfo(mldsInfo).length > 0 ||
      (Array.isArray((mldsInfo as any).financial_autres_financements) && (mldsInfo as any).financial_autres_financements.length > 0);

    const bilanPdf =
      pdfBilan && typeof pdfBilan === 'object' ? (pdfBilan as Record<string, unknown>) : null;
    const legacyBilanShape =
      !!bilanPdf &&
      (typeof bilanPdf.financial_transport === 'number' ||
        bilanPdf.expected_participants != null ||
        bilanPdf.hse_comment ||
        bilanPdf.hv_comment ||
        (bilanPdf as { financial_rate_comment?: string }).financial_rate_comment ||
        bilanPdf.financial_transport_comment ||
        bilanPdf.financial_service_comment ||
        bilanPdf.financial_operating_comment ||
        bilanPdf.expected_participants_comment);
    const hasBilan =
      !!bilanPdf &&
      (bilanPdf.hse != null ||
        bilanPdf.hv != null ||
        bilanPdf.financial_rate != null ||
        (Array.isArray(bilanPdf.financial_transport) && bilanPdf.financial_transport.length > 0) ||
        (Array.isArray(bilanPdf.financial_operating) && bilanPdf.financial_operating.length > 0) ||
        (Array.isArray(bilanPdf.financial_service) && bilanPdf.financial_service.length > 0) ||
        (Array.isArray(bilanPdf.financial_hv_lines) && bilanPdf.financial_hv_lines.length > 0) ||
        (Array.isArray(bilanPdf.financial_autres_financements) && bilanPdf.financial_autres_financements.length > 0) ||
        legacyBilanShape);

    if (hasFinancials) {
      checkPage(hasBilan ? 35 : 25);
      y += 2;
      doc.setFillColor(bleuEN[0], bleuEN[1], bleuEN[2]);
      doc.roundedRect(ml, y, contentW, 8, 1, 1, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text(hasBilan ? 'MOYENS FINANCIERS ET BILAN À LA CLÔTURE' : 'MOYENS FINANCIERS', ml + 4, y + 5.5);
      y += 14;

      const tableX = ml;
      const rowH = 7;
      const lh = 3.5;

      // Largeurs : avec bilan, H / €/h / € — blocs chiffrés volontairement larges pour éviter les retours à la ligne parasites
      const colPoste = hasBilan ? contentW * 0.22 : contentW * 0.55;
      const colMontant = hasBilan ? contentW * 0.25 : contentW * 0.45;
      const colBilanVal = hasBilan ? contentW * 0.27 : 0;
      const colBilanComment = hasBilan ? contentW * 0.26 : 0;

      let totalCredits = 0;
      const mldsTransportSum = Array.isArray(mldsInfo.financial_transport) ? mldsInfo.financial_transport.reduce((s: number, l: any) => s + (Number.parseFloat(l.price || '0') || 0), 0) : 0;
      const mldsServiceSum = getMldsServiceLinesFromMldsInfo(mldsInfo).reduce(
        (s: number, l: { price?: string | number }) => s + (Number.parseFloat(String(l.price || '0')) || 0),
        0
      );
      const mldsOperatingSum = Array.isArray(mldsInfo.financial_operating) ? mldsInfo.financial_operating.reduce((s: number, l: any) => s + (Number.parseFloat(l.price || '0') || 0), 0) : 0;
      const mldsAutresSum = Array.isArray((mldsInfo as any).financial_autres_financements)
        ? (mldsInfo as any).financial_autres_financements.reduce((s: number, l: any) => s + (Number.parseFloat(l.price || '0') || 0), 0)
        : 0;
      const mldsRate = Number.parseFloat(String(mldsInfo.financial_rate ?? HV_DEFAULT_RATE)) || HV_DEFAULT_RATE;
      const hvLinesPdf = Array.isArray((mldsInfo as any).financial_hv_lines) ? (mldsInfo as any).financial_hv_lines : [];
      const mldsHvHours = Number.parseFloat(String(mldsInfo.financial_hv ?? 0));
      const sousTotalHv =
        hvLinesPdf.length > 0
          ? hvLinesPdf.reduce((s: number, l: any) => s + hvLineHours(l) * mldsRate, 0)
          : mldsHvHours * mldsRate;
      totalCredits += sousTotalHv;

      type UnifiedRow = {
        poste: string;
        montant: string;
        bilanVal: string;
        bilanComment: string;
        isTotal?: boolean;
        /** Bandeau de section (ex. Crédits / Autres financements) — pleine largeur du tableau */
        isSectionHeader?: boolean;
        /** Afficher H, €/h et € en colonnes séparées (demande / bilan) au lieu d’une formule sur une ligne */
        splitDemande?: boolean;
        splitBilan?: boolean;
        demH?: string;
        demRate?: string;
        demEuro?: string;
        bilH?: string;
        bilRate?: string;
        bilEuro?: string;
      };
      const unifiedRows: UnifiedRow[] = [];
      unifiedRows.push({
        poste: 'Crédits',
        montant: '',
        bilanVal: '',
        bilanComment: '',
        isSectionHeader: true
      });

      const sumPriceArr = (arr: unknown): number =>
        Array.isArray(arr)
          ? arr.reduce((s: number, l: { price?: string }) => s + (Number.parseFloat(String(l?.price ?? '0')) || 0), 0)
          : 0;

      const bilanPdfRow = hasBilan && pdfBilan && typeof pdfBilan === 'object' ? pdfBilan : null;
      const bilanHvLinesPdf = bilanPdfRow && Array.isArray(bilanPdfRow.financial_hv_lines) ? bilanPdfRow.financial_hv_lines : [];
      const bilanRateNumPdf =
        bilanPdfRow && bilanPdfRow.financial_rate != null
          ? Number.parseFloat(String(bilanPdfRow.financial_rate))
          : mldsRate;

      const bilanTransportArr = (): unknown[] => {
        if (!bilanPdfRow) return [];
        if (Array.isArray(bilanPdfRow.financial_transport)) return bilanPdfRow.financial_transport;
        if (typeof bilanPdfRow.financial_transport === 'number') {
          return [{ transport_name: 'Total bilan', price: String(bilanPdfRow.financial_transport) }];
        }
        return [];
      };
      const bilanOperatingArr = (): unknown[] => {
        if (!bilanPdfRow) return [];
        if (Array.isArray(bilanPdfRow.financial_operating)) return bilanPdfRow.financial_operating;
        if (typeof bilanPdfRow.financial_operating === 'number') {
          return [{ operating_name: 'Total bilan', price: String(bilanPdfRow.financial_operating) }];
        }
        return [];
      };
      const bilanServiceArr = (): unknown[] => {
        if (!bilanPdfRow) return [];
        if (Array.isArray(bilanPdfRow.financial_service)) return bilanPdfRow.financial_service;
        if (typeof bilanPdfRow.financial_service === 'number') {
          return [{ service_name: 'Total bilan', price: String(bilanPdfRow.financial_service) }];
        }
        return [];
      };
      const bilanAutresArr =
        bilanPdfRow && Array.isArray((bilanPdfRow as { financial_autres_financements?: unknown[] }).financial_autres_financements)
          ? (bilanPdfRow as { financial_autres_financements: unknown[] }).financial_autres_financements
          : [];

      const bilanHvEuroComputed =
        bilanHvLinesPdf.length > 0
          ? bilanHvLinesPdf.reduce((s: number, l: { hour?: string; price?: string }) => s + hvLineHours(l) * bilanRateNumPdf, 0)
          : bilanPdfRow && bilanPdfRow.hv != null
            ? Number(bilanPdfRow.hv) * bilanRateNumPdf
            : 0;
      const bilanTransportSum = sumPriceArr(bilanTransportArr());
      const bilanOperatingSum = sumPriceArr(bilanOperatingArr());
      const bilanServiceSum = sumPriceArr(bilanServiceArr());
      const bilanAutresSumPdf = sumPriceArr(bilanAutresArr);
      const totalCreditsBilan =
        hasBilan && bilanPdfRow
          ? bilanHvEuroComputed + bilanTransportSum + bilanOperatingSum + bilanServiceSum
          : 0;
      const totalBilan = hasBilan && bilanPdfRow ? totalCreditsBilan + bilanAutresSumPdf : 0;

      // HSE
      if (mldsInfo.financial_hse != null) {
        const h = Number.parseFloat(String(mldsInfo.financial_hse));
        const bVal = hasBilan && bilanPdfRow && bilanPdfRow.hse != null ? `${Number(bilanPdfRow.hse).toFixed(2)} h` : '';
        const bCom = hasBilan && bilanPdfRow?.hse_comment ? String(bilanPdfRow.hse_comment) : '';
        unifiedRows.push({ poste: 'HSE', montant: `${h.toFixed(2)} h`, bilanVal: bVal, bilanComment: bCom });
      }

      // Heures HV (demande vs bilan)
      if (hvLinesPdf.length > 0 || bilanHvLinesPdf.length > 0 || mldsInfo.financial_hv != null || mldsInfo.financial_rate != null) {
        const maxHv = Math.max(hvLinesPdf.length, bilanHvLinesPdf.length);
        if (maxHv > 0) {
          for (let i = 0; i < maxHv; i++) {
            const d = hvLinesPdf[i] as { teacher_name?: string; hour?: string; price?: string } | undefined;
            const b = bilanHvLinesPdf[i] as { teacher_name?: string; hour?: string; price?: string } | undefined;
            const h = d ? hvLineHours(d) : 0;
            const name = (d?.teacher_name || b?.teacher_name || 'Enseignant').trim();
            const shortName = name.length > 35 ? `${name.substring(0, 32)}...` : name;
            const lineEuro = d ? h * mldsRate : 0;
            const bh = b ? hvLineHours(b) : 0;
            const bilanEuroLine = hasBilan && b ? bh * bilanRateNumPdf : 0;
            const hvLineBilanComment =
              hasBilan && b && (b as { comment?: unknown }).comment != null && String((b as { comment?: unknown }).comment).trim() !== ''
                ? String((b as { comment?: unknown }).comment).trim()
                : '';
            const hasDem = Boolean(d);
            const hasBil = Boolean(hasBilan && b);
            unifiedRows.push({
              poste: `HV — ${shortName}`,
              montant: hasDem ? `${lineEuro.toFixed(2)} €` : '—',
              bilanVal: hasBil ? `${bilanEuroLine.toFixed(2)} €` : '',
              bilanComment: hvLineBilanComment,
              splitDemande: hasDem,
              splitBilan: hasBil,
              demH: hasDem ? `${h.toFixed(2)} h` : '',
              demRate: hasDem ? mldsRate.toFixed(2) : '',
              demEuro: hasDem ? `${lineEuro.toFixed(2)} €` : '',
              bilH: hasBil ? `${bh.toFixed(2)} h` : '',
              bilRate: hasBil ? bilanRateNumPdf.toFixed(2) : '',
              bilEuro: hasBil ? `${bilanEuroLine.toFixed(2)} €` : ''
            });
          }
        } else {
          const hvBilanVal = hasBilan && bilanPdfRow && bilanPdfRow.hv != null ? `${Number(bilanPdfRow.hv).toFixed(2)} h` : '';
          const hvBilanComment = hasBilan && bilanPdfRow ? String(bilanPdfRow.hv_comment || '') : '';
          unifiedRows.push({
            poste: 'HV',
            montant: `${mldsHvHours.toFixed(2)} h`,
            bilanVal: hvBilanVal,
            bilanComment: hvBilanComment,
            splitDemande: true,
            splitBilan: hasBilan && bilanPdfRow && bilanPdfRow.hv != null,
            demH: `${mldsHvHours.toFixed(2)} h`,
            demRate: '',
            demEuro: '',
            bilH: hasBilan && bilanPdfRow && bilanPdfRow.hv != null ? `${Number(bilanPdfRow.hv).toFixed(2)} h` : '',
            bilRate: '',
            bilEuro: ''
          });
        }
        const tauxBilanVal =
          hasBilan && bilanPdfRow && bilanPdfRow.financial_rate != null
            ? `${Number(bilanPdfRow.financial_rate).toFixed(2)} €/h`
            : '';
        const tauxBilanComment = hasBilan && bilanPdfRow ? String((bilanPdfRow as { financial_rate_comment?: string }).financial_rate_comment || '') : '';
        unifiedRows.push({
          poste: 'Taux horaire',
          montant: `${mldsRate.toFixed(2)} €/h`,
          bilanVal: tauxBilanVal,
          bilanComment: tauxBilanComment,
          splitDemande: true,
          splitBilan: hasBilan && bilanPdfRow && bilanPdfRow.financial_rate != null,
          demH: '',
          demRate: mldsRate.toFixed(2),
          demEuro: '',
          bilH: '',
          bilRate: hasBilan && bilanPdfRow && bilanPdfRow.financial_rate != null ? Number(bilanPdfRow.financial_rate).toFixed(2) : '',
          bilEuro: ''
        });
        const sousTotalBilanHv =
          bilanHvLinesPdf.length > 0
            ? bilanHvLinesPdf.reduce((s: number, l: { hour?: string; price?: string }) => s + hvLineHours(l) * bilanRateNumPdf, 0)
            : bilanPdfRow && bilanPdfRow.hv != null
              ? Number(bilanPdfRow.hv) * bilanRateNumPdf
              : 0;
        unifiedRows.push({
          poste: 'Sous-total (HV × taux)',
          montant: `${sousTotalHv.toFixed(2)} €`,
          bilanVal: hasBilan && bilanPdfRow ? `${sousTotalBilanHv.toFixed(2)} €` : '',
          bilanComment: '',
          isTotal: true
        });
      }

      const bilanLineCommentPdf = (b: { comment?: unknown } | null | undefined): string => {
        if (!b || b.comment == null) return '';
        const s = String(b.comment).trim();
        return s;
      };

      /** Aligné sur l’onglet Informations supplémentaires : montant + heures + taux €/h (texte monobloc si pas de triple PDF) */
      const formatPdfPrestataireLine = (line: { price?: string; hours?: string } | null | undefined, amount: number): string => {
        const priceStr = `${amount.toFixed(2)} €`;
        if (!line) return priceStr;
        const h = Number.parseFloat(String(line.hours ?? ''));
        if (line.hours != null && String(line.hours).trim() !== '' && h > 0 && !Number.isNaN(h) && !Number.isNaN(amount) && amount > 0) {
          const rateLbl = (amount / h).toFixed(2);
          return `${priceStr}\n${String(line.hours).trim()} h d'intervention — taux : ${rateLbl} €/h`;
        }
        return priceStr;
      };

      const prestataireTriplePdf = (
        line: { price?: string; hours?: string } | null | undefined,
        amount: number
      ): { h: string; rate: string; euro: string } | null => {
        const euro = `${amount.toFixed(2)} €`;
        if (!line) return null;
        const hNum = Number.parseFloat(String(line.hours ?? ''));
        if (line.hours != null && String(line.hours).trim() !== '' && hNum > 0 && !Number.isNaN(hNum) && amount > 0) {
          return { h: `${String(line.hours).trim()} h`, rate: (amount / hNum).toFixed(2), euro };
        }
        return null;
      };

      const zipMoneyRows = (
        demandeLines: Array<{ price?: string; transport_name?: string; operating_name?: string; service_name?: string; autres_name?: string }>,
        bilanLines: unknown[],
        formatPoste: (d: any, b: any, i: number) => string,
        formatBilan: (b: any) => string,
        formatBilanComment: (b: any) => string,
        countInCredits: boolean,
        formatMontantDemande?: (d: any, amountD: number) => string,
        formatDemandeTriple?: (d: any, amountD: number) => { h: string; rate: string; euro: string } | null,
        formatBilanTriple?: (b: any) => { h: string; rate: string; euro: string } | null
      ) => {
        const bt = Array.isArray(bilanLines) ? bilanLines : [];
        const n = Math.max(demandeLines.length, bt.length);
        for (let i = 0; i < n; i++) {
          const d = demandeLines[i];
          const b = bt[i] as { price?: string; comment?: unknown } | undefined;
          const amountD = d ? Number.parseFloat(String(d.price || '0')) || 0 : 0;
          if (d && countInCredits) totalCredits += amountD;
          const tripleD = hasBilan && formatDemandeTriple && d ? formatDemandeTriple(d, amountD) : null;
          const tripleB = hasBilan && formatBilanTriple && b ? formatBilanTriple(b) : null;
          const montantStr = d
            ? formatMontantDemande
              ? formatMontantDemande(d, amountD)
              : `${amountD.toFixed(2)} €`
            : '—';
          const bilanStr = hasBilan && b ? formatBilan(b) : '';
          unifiedRows.push({
            poste: formatPoste(d, b, i),
            montant: montantStr,
            bilanVal: bilanStr,
            bilanComment: hasBilan && b ? formatBilanComment(b) : '',
            splitDemande: Boolean(tripleD),
            splitBilan: Boolean(tripleB),
            demH: tripleD?.h ?? '',
            demRate: tripleD?.rate ?? '',
            demEuro: tripleD?.euro ?? '',
            bilH: tripleB?.h ?? '',
            bilRate: tripleB?.rate ?? '',
            bilEuro: tripleB?.euro ?? ''
          });
        }
      };

      const transportDemande = Array.isArray(mldsInfo.financial_transport) ? mldsInfo.financial_transport : [];
      const operatingDemande = Array.isArray(mldsInfo.financial_operating) ? mldsInfo.financial_operating : [];
      const serviceDemande = getMldsServiceLinesFromMldsInfo(mldsInfo).map(l => ({
        service_name: l.service_name != null ? String(l.service_name) : undefined,
        price: l.price != null ? String(l.price) : undefined,
        hours: l.hours != null && l.hours !== '' ? String(l.hours) : undefined
      }));
      const autreDemande = Array.isArray((mldsInfo as { financial_autres_financements?: unknown[] }).financial_autres_financements)
        ? ((mldsInfo as { financial_autres_financements: unknown[] }).financial_autres_financements as Array<{ autres_name?: string; price?: string }>)
        : [];

      if (hasBilan) {
        const bpGlob = bilanPdfRow as Record<string, unknown> | null;
        const pushBilanGlobalRow = (poste: string, text: unknown) => {
          const s = text != null ? String(text).trim() : '';
          if (!s) return;
          unifiedRows.push({ poste, montant: '—', bilanVal: '—', bilanComment: s });
        };
        if (bpGlob) {
          pushBilanGlobalRow('Commentaire global — transport', bpGlob.financial_transport_comment);
          pushBilanGlobalRow('Commentaire global — fonctionnement', bpGlob.financial_operating_comment);
          pushBilanGlobalRow('Commentaire global — prestations', bpGlob.financial_service_comment);
        }

        zipMoneyRows(
          transportDemande,
          bilanTransportArr(),
          (d, b, i) => {
            const name = d?.transport_name || (b as { transport_name?: string })?.transport_name || 'Transport';
            const short = String(name).length > 35 ? `${String(name).substring(0, 32)}...` : String(name);
            return `Transport — ${short}`;
          },
          b => `${(Number.parseFloat(String((b as { price?: string }).price || '0')) || 0).toFixed(2)} €`,
          b => bilanLineCommentPdf(b as { comment?: unknown }),
          true
        );
        zipMoneyRows(
          operatingDemande,
          bilanOperatingArr(),
          (d, b) => {
            const name = d?.operating_name || (b as { operating_name?: string })?.operating_name || 'Fonctionnement';
            const short = String(name).length > 30 ? `${String(name).substring(0, 27)}...` : String(name);
            return `Fonctionnement — ${short}`;
          },
          b => `${(Number.parseFloat(String((b as { price?: string }).price || '0')) || 0).toFixed(2)} €`,
          b => bilanLineCommentPdf(b as { comment?: unknown }),
          true
        );
        zipMoneyRows(
          serviceDemande,
          bilanServiceArr(),
          (d, b) => {
            const name = d?.service_name || (b as { service_name?: string })?.service_name || 'Prestataire';
            const short = String(name).length > 30 ? `${String(name).substring(0, 27)}...` : String(name);
            return `Prestataire — ${short}`;
          },
          b => {
            const bb = b as { price?: string; hours?: string };
            const amt = Number.parseFloat(String(bb.price || '0')) || 0;
            return formatPdfPrestataireLine(bb, amt);
          },
          b => bilanLineCommentPdf(b as { comment?: unknown }),
          true,
          (d, amountD) => formatPdfPrestataireLine(d as { price?: string; hours?: string }, amountD),
          (d, amountD) => prestataireTriplePdf(d as { price?: string; hours?: string }, amountD),
          b => {
            const bb = b as { price?: string; hours?: string };
            const amt = Number.parseFloat(String(bb.price || '0')) || 0;
            return prestataireTriplePdf(bb, amt);
          }
        );
        if (autreDemande.length > 0 || bilanAutresArr.length > 0) {
          unifiedRows.push({
            poste: 'Autres financements',
            montant: '',
            bilanVal: '',
            bilanComment: '',
            isSectionHeader: true
          });
        }
        zipMoneyRows(
          autreDemande as Array<{ price?: string; autres_name?: string }>,
          bilanAutresArr,
          (d, b) => {
            const name = d?.autres_name || (b as { autres_name?: string })?.autres_name || 'Autre financement';
            const short = String(name).length > 30 ? `${String(name).substring(0, 27)}...` : String(name);
            return `Autre financement — ${short}`;
          },
          b => `${(Number.parseFloat(String((b as { price?: string }).price || '0')) || 0).toFixed(2)} €`,
          b => bilanLineCommentPdf(b as { comment?: unknown }),
          false
        );
        if (bilanPdfRow && (bilanPdfRow.expected_participants != null || bilanPdfRow.expected_participants_comment)) {
          unifiedRows.push({
            poste: 'Participants effectifs',
            montant: mldsInfo.expected_participants != null ? String(mldsInfo.expected_participants) : '—',
            bilanVal: bilanPdfRow.expected_participants != null ? String(bilanPdfRow.expected_participants) : '—',
            bilanComment: String(bilanPdfRow.expected_participants_comment || '')
          });
        }
      } else {
        const transportLines = Array.isArray(mldsInfo.financial_transport) ? mldsInfo.financial_transport : [];
        transportLines.forEach((line: any) => {
          const amount = Number.parseFloat(line.price || '0') || 0;
          totalCredits += amount;
          const name = line.transport_name || 'Transport';
          unifiedRows.push({ poste: `Transport — ${name.length > 35 ? name.substring(0, 32) + '...' : name}`, montant: `${amount.toFixed(2)} €`, bilanVal: '', bilanComment: '' });
        });
        const operatingLines = Array.isArray(mldsInfo.financial_operating) ? mldsInfo.financial_operating : [];
        operatingLines.forEach((line: any) => {
          const amount = Number.parseFloat(line.price || '0') || 0;
          totalCredits += amount;
          const name = line.operating_name || 'Fonctionnement';
          unifiedRows.push({ poste: `Fonctionnement — ${name.length > 30 ? name.substring(0, 27) + '...' : name}`, montant: `${amount.toFixed(2)} €`, bilanVal: '', bilanComment: '' });
        });
        const serviceLinesPdf = getMldsServiceLinesFromMldsInfo(mldsInfo);
        serviceLinesPdf.forEach((line: any) => {
          const amount = Number.parseFloat(line.price || '0') || 0;
          totalCredits += amount;
          const name = line.service_name || 'Prestataire';
          unifiedRows.push({
            poste: `Prestataire — ${name.length > 30 ? name.substring(0, 27) + '...' : name}`,
            montant: formatPdfPrestataireLine(line, amount),
            bilanVal: '',
            bilanComment: ''
          });
        });
        const autreLinesPdf = Array.isArray((mldsInfo as any).financial_autres_financements) ? (mldsInfo as any).financial_autres_financements : [];
        if (autreLinesPdf.length > 0) {
          unifiedRows.push({
            poste: 'Autres financements',
            montant: '',
            bilanVal: '',
            bilanComment: '',
            isSectionHeader: true
          });
        }
        autreLinesPdf.forEach((line: any) => {
          const amount = Number.parseFloat(line.price || '0') || 0;
          const name = line.autres_name || 'Autre financement';
          unifiedRows.push({ poste: `Autre financement — ${name.length > 30 ? name.substring(0, 27) + '...' : name}`, montant: `${amount.toFixed(2)} €`, bilanVal: '', bilanComment: '' });
        });
      }

      // Crédits + autres (HSE déclaratif, hors total)
      let totalGeneral = totalCredits + mldsAutresSum;
      if (!Number.isFinite(totalGeneral)) {
        totalGeneral = 0;
      }

      if (mldsAutresSum > 0) {
        unifiedRows.push({ poste: 'Total autres financements', montant: `${mldsAutresSum.toFixed(2)} €`, bilanVal: '', bilanComment: '', isTotal: true });
        unifiedRows.push({ poste: 'Total des crédits', montant: `${totalCredits.toFixed(2)} €`, bilanVal: hasBilan ? `${totalCreditsBilan.toFixed(2)} €` : '', bilanComment: '', isTotal: true });
        unifiedRows.push({ poste: 'TOTAL GÉNÉRAL', montant: `${totalGeneral.toFixed(2)} €`, bilanVal: hasBilan ? `${totalBilan.toFixed(2)} €` : '', bilanComment: '', isTotal: true });
      } else {
        unifiedRows.push({
          poste: 'Total général',
          montant: `${totalGeneral.toFixed(2)} €`,
          bilanVal: hasBilan ? `${totalBilan.toFixed(2)} €` : '',
          bilanComment: '',
          isTotal: true
        });
      }

      const pdfCellPad = 3;
      /** Évite la césure entre chiffre et € ou « h » dans les cellules PDF */
      const pdfJoinNumUnit = (raw: string): string =>
        raw
          .replace(/(\d)\s+(€)/g, '$1\u00A0$2')
          .replace(/(\d)\s+h\b/gi, '$1\u00A0h');
      const wrapPdfCell = (text: string | undefined | null, colW: number): string[] => {
        const s0 = text != null && String(text).trim() !== '' ? String(text) : '';
        if (!s0) return [];
        const s = pdfJoinNumUnit(s0);
        const maxW = Math.max(8, colW - pdfCellPad * 2);
        const parts = s
          .split(/\n/)
          .map(p => p.trim())
          .filter(p => p.length > 0);
        const lines: string[] = [];
        parts.forEach(part => {
          lines.push(...doc.splitTextToSize(part, maxW));
        });
        return lines.length > 0 ? lines : [];
      };

      if (!hasBilan) {
        doc.setDrawColor(grisClair[0], grisClair[1], grisClair[2]);
        doc.setLineWidth(0.2);
        doc.setFillColor(bleuClair[0], bleuClair[1], bleuClair[2]);
        doc.rect(tableX, y - 4, colPoste, rowH, 'F');
        doc.rect(tableX + colPoste, y - 4, colMontant, rowH, 'F');
        doc.rect(tableX, y - 4, colPoste, rowH);
        doc.rect(tableX + colPoste, y - 4, colMontant, rowH);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(bleuEN[0], bleuEN[1], bleuEN[2]);
        doc.text('Poste budgétaire', tableX + 3, y + 0.5);
        doc.text('Montant demandé', tableX + colPoste + 3, y + 0.5);
        y += rowH;

        unifiedRows.forEach((row, rowIdx) => {
          if (row.isSectionHeader) {
            const secH = 7;
            if (rowIdx > 0) y += 3;
            checkPage(secH + 10);
            const fullW = colPoste + colMontant;
            doc.setFillColor(232, 242, 252);
            doc.rect(tableX, y - 4, fullW, secH, 'F');
            doc.setDrawColor(grisClair[0], grisClair[1], grisClair[2]);
            doc.setLineWidth(0.2);
            doc.rect(tableX, y - 4, fullW, secH);
            doc.setFontSize(8.5);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(bleuEN[0], bleuEN[1], bleuEN[2]);
            doc.text(row.poste, tableX + pdfCellPad, y + 1);
            y += secH;
            return;
          }
          const posteLinesRaw = wrapPdfCell(row.poste, colPoste);
          const montantLinesRaw = wrapPdfCell(row.montant, colMontant);
          const posteLines = posteLinesRaw.length > 0 ? posteLinesRaw : [''];
          const montantLines = montantLinesRaw.length > 0 ? montantLinesRaw : [''];
          const lineCount = Math.max(1, posteLines.length, montantLines.length);
          const cellH = Math.max(rowH, lineCount * lh + 5);
          checkPage(cellH + 10);
          if (row.isTotal) {
            doc.setFillColor(bleuEN[0], bleuEN[1], bleuEN[2]);
            doc.rect(tableX, y - 4, colPoste + colMontant, cellH, 'F');
            doc.setDrawColor(grisClair[0], grisClair[1], grisClair[2]);
            doc.setLineWidth(0.15);
            doc.rect(tableX, y - 4, colPoste, cellH);
            doc.rect(tableX + colPoste, y - 4, colMontant, cellH);
            doc.setFontSize(8);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(255, 255, 255);
            posteLines.forEach((line: string, i: number) => {
              doc.text(line, tableX + pdfCellPad, y + 0.5 + i * lh);
            });
            montantLines.forEach((line: string, i: number) => {
              doc.text(line, tableX + colPoste + pdfCellPad, y + 0.5 + i * lh);
            });
          } else {
            doc.setDrawColor(grisClair[0], grisClair[1], grisClair[2]);
            doc.setLineWidth(0.15);
            doc.rect(tableX, y - 4, colPoste, cellH);
            doc.rect(tableX + colPoste, y - 4, colMontant, cellH);
            doc.setFontSize(8);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(gris[0], gris[1], gris[2]);
            posteLines.forEach((line: string, i: number) => {
              doc.text(line, tableX + pdfCellPad, y + 0.5 + i * lh);
            });
            montantLines.forEach((line: string, i: number) => {
              doc.text(line, tableX + colPoste + pdfCellPad, y + 0.5 + i * lh);
            });
          }
          y += cellH;
        });
      } else {
        /** 3 sous-colonnes : H et € un peu plus larges que €/h (taux court) pour limiter le césure des montants */
        const colDemH = colMontant * 0.38;
        const colDemRate = colMontant * 0.24;
        const colDemEuro = colMontant * 0.38;
        const colBilH = colBilanVal * 0.38;
        const colBilRate = colBilanVal * 0.24;
        const colBilEuro = colBilanVal * 0.38;

        /** Cellules fusionnées : € → colonne €, heures ou nombre seul (effectifs) → colonne H */
        const mergedPdfPlacement = (text: string | undefined): 'hours' | 'euro' | 'full' => {
          const t = (text ?? '').trim();
          if (!t || t === '—') return 'full';
          if (t.includes('€')) return 'euro';
          if (/\d/.test(t) && /\bh\b/i.test(t)) return 'hours';
          if (/^\d+([.,]\d+)?$/.test(t)) return 'hours';
          return 'full';
        };

        const wDemMerged = colDemH + colDemRate + colDemEuro;
        const wBilMerged = colBilH + colBilRate + colBilEuro;

        const cellFitOneLine = (txt: string, colW: number, fontSize: number, fontStyle: 'normal' | 'bold'): string[] => {
          const s = pdfJoinNumUnit(String(txt ?? '').trim());
          if (!s) return [];
          const maxW = Math.max(12, colW - pdfCellPad * 2);
          doc.setFontSize(fontSize);
          doc.setFont('helvetica', fontStyle);
          if (doc.getTextWidth(s) <= maxW) return [s];
          return doc.splitTextToSize(s, maxW);
        };

        const xDem0 = tableX + colPoste;
        const xDemR = xDem0 + colDemH;
        const xDemE = xDemR + colDemRate;
        const xBil0 = xDemE + colDemEuro;
        const xBilR = xBil0 + colBilH;
        const xBilE = xBilR + colBilRate;
        const xComm = xBilE + colBilEuro;

        doc.setDrawColor(grisClair[0], grisClair[1], grisClair[2]);
        doc.setLineWidth(0.2);
        doc.setFillColor(bleuClair[0], bleuClair[1], bleuClair[2]);
        doc.rect(tableX, y - 4, colPoste, rowH, 'F');
        doc.rect(xDem0, y - 4, colDemH + colDemRate + colDemEuro, rowH, 'F');
        doc.setFillColor(vertClair[0], vertClair[1], vertClair[2]);
        doc.rect(xBil0, y - 4, colBilH + colBilRate + colBilEuro, rowH, 'F');
        doc.rect(xComm, y - 4, colBilanComment, rowH, 'F');
        doc.setFontSize(7);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(bleuEN[0], bleuEN[1], bleuEN[2]);
        doc.text('Poste budgétaire', tableX + 2, y + 0.5);
        doc.text('H', xDem0 + 2, y + 0.5);
        doc.text('€/h', xDemR + 1, y + 0.5);
        doc.text('€', xDemE + 2, y + 0.5);
        doc.setTextColor(vertBilan[0], vertBilan[1], vertBilan[2]);
        doc.text('H', xBil0 + 2, y + 0.5);
        doc.text('€/h', xBilR + 1, y + 0.5);
        doc.text('€', xBilE + 2, y + 0.5);
        doc.text('Commentaire', xComm + 2, y + 0.5);
        doc.setDrawColor(grisClair[0], grisClair[1], grisClair[2]);
        doc.rect(tableX, y - 4, colPoste, rowH);
        doc.rect(xDem0, y - 4, colDemH + colDemRate + colDemEuro, rowH);
        doc.rect(xBil0, y - 4, colBilH + colBilRate + colBilEuro, rowH);
        doc.rect(xComm, y - 4, colBilanComment, rowH);
        y += rowH;

        unifiedRows.forEach((row, rowIdx) => {
          if (row.isSectionHeader) {
            const secH = 7;
            if (rowIdx > 0) y += 3;
            checkPage(secH + 10);
            const fullW = colPoste + colMontant + colBilanVal + colBilanComment;
            doc.setFillColor(232, 242, 252);
            doc.rect(tableX, y - 4, fullW, secH, 'F');
            doc.setDrawColor(grisClair[0], grisClair[1], grisClair[2]);
            doc.setLineWidth(0.2);
            doc.rect(tableX, y - 4, fullW, secH);
            doc.setFontSize(8.5);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(bleuEN[0], bleuEN[1], bleuEN[2]);
            doc.text(row.poste, tableX + pdfCellPad, y + 1);
            y += secH;
            return;
          }
          const posteLinesRaw = wrapPdfCell(row.poste, colPoste);
          const posteLines = posteLinesRaw.length > 0 ? posteLinesRaw : [''];
          let demHLines: string[];
          let demRLines: string[];
          let demELines: string[];
          let bilHLines: string[];
          let bilRLines: string[];
          let bilELines: string[];
          let demMergedPlacement: 'hours' | 'euro' | 'full' = 'full';
          let demMergedHoursLines: string[] = [];
          let demMergedEuroLines: string[] = [];
          let demMergedFullLines: string[] = [];
          let bilMergedPlacement: 'hours' | 'euro' | 'full' = 'full';
          let bilMergedHoursLines: string[] = [];
          let bilMergedEuroLines: string[] = [];
          let bilMergedFullLines: string[] = [];

          const fst: 'normal' | 'bold' = row.isTotal ? 'bold' : 'normal';

          if (row.splitDemande) {
            demHLines = cellFitOneLine(row.demH || '', colDemH, 8, fst);
            demRLines = cellFitOneLine(row.demRate || '', colDemRate, 8, fst);
            demELines = cellFitOneLine(row.demEuro || '', colDemEuro, 8, fst);
          } else {
            demMergedPlacement = mergedPdfPlacement(row.montant);
            if (demMergedPlacement === 'euro') {
              demMergedEuroLines = wrapPdfCell(row.montant, colDemEuro);
            } else if (demMergedPlacement === 'hours') {
              demMergedHoursLines = wrapPdfCell(row.montant, colDemH);
            } else {
              demMergedFullLines = wrapPdfCell(row.montant, wDemMerged);
            }
            demHLines = [];
            demRLines = [];
            demELines = [];
          }

          if (row.splitBilan) {
            bilHLines = cellFitOneLine(row.bilH || '', colBilH, 8, fst);
            bilRLines = cellFitOneLine(row.bilRate || '', colBilRate, 8, fst);
            bilELines = cellFitOneLine(row.bilEuro || '', colBilEuro, 8, fst);
          } else {
            bilMergedPlacement = mergedPdfPlacement(row.bilanVal || '—');
            if (bilMergedPlacement === 'euro') {
              bilMergedEuroLines = wrapPdfCell(row.bilanVal || '—', colBilEuro);
            } else if (bilMergedPlacement === 'hours') {
              bilMergedHoursLines = wrapPdfCell(row.bilanVal || '—', colBilH);
            } else {
              bilMergedFullLines = wrapPdfCell(row.bilanVal || '—', wBilMerged);
            }
            bilHLines = [];
            bilRLines = [];
            bilELines = [];
          }

          const commentLines =
            row.bilanComment && String(row.bilanComment).trim() !== '' ? wrapPdfCell(row.bilanComment, colBilanComment) : [];

          const nDem = row.splitDemande
            ? Math.max(demHLines.length, demRLines.length, demELines.length, 1)
            : Math.max(
                demMergedPlacement === 'euro' ? demMergedEuroLines.length : 0,
                demMergedPlacement === 'hours' ? demMergedHoursLines.length : 0,
                demMergedPlacement === 'full' ? demMergedFullLines.length : 0,
                1
              );
          const nBil = row.splitBilan
            ? Math.max(bilHLines.length, bilRLines.length, bilELines.length, 1)
            : Math.max(
                bilMergedPlacement === 'euro' ? bilMergedEuroLines.length : 0,
                bilMergedPlacement === 'hours' ? bilMergedHoursLines.length : 0,
                bilMergedPlacement === 'full' ? bilMergedFullLines.length : 0,
                1
              );
          const lineCount = Math.max(1, posteLines.length, nDem, nBil, Math.max(commentLines.length, 1));
          const cellH = Math.max(rowH, lineCount * lh + 5);

          checkPage(cellH + 10);

          const drawDemandeCells = (textColor: [number, number, number]) => {
            doc.setFontSize(8);
            doc.setFont('helvetica', row.isTotal ? 'bold' : 'normal');
            doc.setTextColor(textColor[0], textColor[1], textColor[2]);
            if (row.splitDemande) {
              demHLines.forEach((line, i) => {
                doc.text(line, xDem0 + pdfCellPad, y + 0.5 + i * lh);
              });
              demRLines.forEach((line, i) => {
                doc.text(line, xDemR + pdfCellPad, y + 0.5 + i * lh);
              });
              demELines.forEach((line, i) => {
                doc.text(line, xDemE + pdfCellPad, y + 0.5 + i * lh);
              });
            } else if (demMergedPlacement === 'euro') {
              demMergedEuroLines.forEach((line, i) => {
                doc.text(line, xDemE + pdfCellPad, y + 0.5 + i * lh);
              });
            } else if (demMergedPlacement === 'hours') {
              demMergedHoursLines.forEach((line, i) => {
                doc.text(line, xDem0 + pdfCellPad, y + 0.5 + i * lh);
              });
            } else {
              demMergedFullLines.forEach((line, i) => {
                doc.text(line, xDem0 + pdfCellPad, y + 0.5 + i * lh);
              });
            }
          };

          const drawBilanCells = (textColor: [number, number, number]) => {
            doc.setFontSize(8);
            doc.setFont('helvetica', row.isTotal ? 'bold' : 'normal');
            doc.setTextColor(textColor[0], textColor[1], textColor[2]);
            if (row.splitBilan) {
              bilHLines.forEach((line, i) => {
                doc.text(line, xBil0 + pdfCellPad, y + 0.5 + i * lh);
              });
              bilRLines.forEach((line, i) => {
                doc.text(line, xBilR + pdfCellPad, y + 0.5 + i * lh);
              });
              bilELines.forEach((line, i) => {
                doc.text(line, xBilE + pdfCellPad, y + 0.5 + i * lh);
              });
            } else if (bilMergedPlacement === 'euro') {
              bilMergedEuroLines.forEach((line, i) => {
                doc.text(line, xBilE + pdfCellPad, y + 0.5 + i * lh);
              });
            } else if (bilMergedPlacement === 'hours') {
              bilMergedHoursLines.forEach((line, i) => {
                doc.text(line, xBil0 + pdfCellPad, y + 0.5 + i * lh);
              });
            } else {
              bilMergedFullLines.forEach((line, i) => {
                doc.text(line, xBil0 + pdfCellPad, y + 0.5 + i * lh);
              });
            }
          };

          if (row.isTotal) {
            doc.setFillColor(bleuEN[0], bleuEN[1], bleuEN[2]);
            doc.rect(tableX, y - 4, colPoste + colDemH + colDemRate + colDemEuro, cellH, 'F');
            doc.setFillColor(vertClair[0], vertClair[1], vertClair[2]);
            doc.rect(xBil0, y - 4, colBilH + colBilRate + colBilEuro + colBilanComment, cellH, 'F');
            doc.setDrawColor(grisClair[0], grisClair[1], grisClair[2]);
            doc.setLineWidth(0.15);
            doc.rect(tableX, y - 4, colPoste, cellH);
            doc.rect(xDem0, y - 4, colDemH + colDemRate + colDemEuro, cellH);
            doc.rect(xBil0, y - 4, colBilH + colBilRate + colBilEuro + colBilanComment, cellH);
            doc.setFontSize(8);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(255, 255, 255);
            posteLines.forEach((line, i) => {
              doc.text(line, tableX + pdfCellPad, y + 0.5 + i * lh);
            });
            drawDemandeCells([255, 255, 255]);
            drawBilanCells([vertBilan[0], vertBilan[1], vertBilan[2]]);
            doc.setFont('helvetica', 'normal');
            commentLines.forEach((line, i) => {
              doc.setTextColor(grisLabel[0], grisLabel[1], grisLabel[2]);
              doc.text(line, xComm + pdfCellPad, y + 0.5 + i * lh);
            });
          } else {
            doc.setDrawColor(grisClair[0], grisClair[1], grisClair[2]);
            doc.setLineWidth(0.15);
            doc.rect(tableX, y - 4, colPoste, cellH);
            doc.rect(xDem0, y - 4, colDemH, cellH);
            doc.rect(xDemR, y - 4, colDemRate, cellH);
            doc.rect(xDemE, y - 4, colDemEuro, cellH);
            doc.setFillColor(vertClair[0], vertClair[1], vertClair[2]);
            doc.rect(xBil0, y - 4, colBilH, cellH, 'F');
            doc.rect(xBilR, y - 4, colBilRate, cellH, 'F');
            doc.rect(xBilE, y - 4, colBilEuro, cellH, 'F');
            doc.rect(xBil0, y - 4, colBilH, cellH);
            doc.rect(xBilR, y - 4, colBilRate, cellH);
            doc.rect(xBilE, y - 4, colBilEuro, cellH);
            doc.setFillColor(vertClair[0], vertClair[1], vertClair[2]);
            doc.rect(xComm, y - 4, colBilanComment, cellH, 'F');
            doc.rect(xComm, y - 4, colBilanComment, cellH);
            doc.setFontSize(8);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(gris[0], gris[1], gris[2]);
            posteLines.forEach((line, i) => {
              doc.text(line, tableX + pdfCellPad, y + 0.5 + i * lh);
            });
            drawDemandeCells([gris[0], gris[1], gris[2]]);
            drawBilanCells([vertBilan[0], vertBilan[1], vertBilan[2]]);
            doc.setFont('helvetica', 'normal');
            commentLines.forEach((line, i) => {
              doc.setTextColor(grisLabel[0], grisLabel[1], grisLabel[2]);
              doc.text(line, xComm + pdfCellPad, y + 0.5 + i * lh);
            });
            doc.setTextColor(gris[0], gris[1], gris[2]);
          }
          y += cellH;
        });
      }

      y += 6;
    }

    // Ajouter les pieds de page sur toutes les pages
    addFooters();

    // Sauvegarder
    const fileName = `MLDS_${project.title.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);

    showSuccess('PDF exporté avec succès');
  };

  /** Renders the rich "Participants du projet" section (Cartes/Liste). Reused for main tab and badge-holder tab. */
  const renderParticipantsSection = (showAddButton: boolean, showEmails: boolean) => (
    <div className="tab-content active">
      <div className="participants-section">
        <div className="section-header">
          <h3>Participants du projet</h3>
          {showAddButton && !isProjectEnded && !isReadOnlyMode && (
            <button
              className="btn btn-primary btn-sm"
              onClick={handleAddParticipant}
            >
              <i className="fas fa-plus"></i>
              Ajouter un participant
            </button>
          )}
        </div>

        <div className="view-toggle participants-view-toggle">
          <button
            type="button"
            className={`view-btn ${participantViewMode === 'cards' ? 'active' : ''}`}
            onClick={() => setParticipantViewMode('cards')}
          >
            <i className="fas fa-th-large"></i> Cartes
          </button>
          <button
            type="button"
            className={`view-btn ${participantViewMode === 'list' ? 'active' : ''}`}
            onClick={() => setParticipantViewMode('list')}
          >
            <i className="fas fa-list"></i> Liste
          </button>
        </div>

        <div className="participants-table">
          {participantViewMode === 'cards' && participants.map((participant) => (
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
                  {showEmails && <p className="request-email" title={participant.email}>{participant.email}</p>}
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
                    {canAssignBadges && !isProjectEnded && project.status !== 'draft' && (
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

          {participantViewMode === 'list' && participants.length > 0 && (
            <div className="participants-table-scroll">
              <table className="participants-list-table">
                <thead>
                  <tr>
                    <th>Avatar</th>
                    <th>Nom</th>
                    <th>Rôle système</th>
                    {showEmails && <th>Email</th>}
                    <th>Organisation</th>
                    <th>Compétences</th>
                    <th>Disponibilités</th>
                    <th>Rôle projet</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {participants.map((participant) => (
                    <tr key={participant.id}>
                      <td>
                        <AvatarImage src={participant.avatar} alt={participant.name} className="participant-list-avatar" />
                      </td>
                      <td>{participant.name}</td>
                      <td>
                        <span>{(participant as any).userRole ? translateRole((participant as any).userRole) : participant.profession || '—'}</span>
                        {(participant as any).school_level_name && (
                          <span className="participant-list-school"> — classe : {(participant as any).school_level_name}</span>
                        )}
                      </td>
                      {showEmails && <td title={participant.email}>{participant.email || '—'}</td>}
                      <td>{toDisplayString(participant.organization) || '—'}</td>
                      <td className="participant-list-pills-td">
                        <CollapsiblePillsCell
                          items={participant.skills ?? []}
                          pillClassName="skill-pill"
                        />
                      </td>
                      <td className="participant-list-pills-td">
                        <CollapsiblePillsCell
                          items={participant.availability ?? []}
                          pillClassName="availability-pill"
                        />
                      </td>
                      <td>
                        <select
                          value={getCurrentRoleValue(participant)}
                          onChange={(e) => handleRoleChange(participant, e.target.value)}
                          disabled={!canChangeRole(participant)}
                          className="participant-list-role-select"
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
                      </td>
                      <td>
                        {!isProjectEnded && (
                          <div className="participant-list-actions">
                            {canUserSeeRemoveButton(userProjectRole) && participant.canRemove && (
                              <button
                                type="button"
                                className="btn-reject btn-sm"
                                onClick={() => handleRemoveParticipant(participant.id)}
                                title="Retirer du projet"
                              >
                                <i className="fas fa-user-minus"></i> Retirer
                              </button>
                            )}
                            {canAssignBadges && project.status !== 'draft' && (
                              <button
                                type="button"
                                className="btn-accept btn-sm"
                                onClick={() => handleAwardBadge(participant.memberId)}
                                title="Attribuer un badge"
                              >
                                <i className="fas fa-award"></i> Badge
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {participantViewMode === 'list' && participants.length === 0 && (
            <p className="participants-empty-list">Aucun participant.</p>
          )}
        </div>
      </div>
    </div>
  );

  /** Projets MLDS : contenu des onglets « Vue d'ensemble » et « Informations supplémentaires » inversé par rapport aux autres projets. */
  const showMldsSupplementaryTabContent = isMLDSProject && activeTab === 'overview';
  const showOverviewStatsTabContent =
    (!isMLDSProject && activeTab === 'overview') ||
    (isMLDSProject && activeTab === 'mlds-info');

  const handleDescriptionVoirPlus = () => {
    if (!project?.description || project.description.length <= 150) return;
    if (shouldShowTabs()) {
      if (activeTab === 'overview') {
        requestAnimationFrame(() => {
          setTimeout(() => {
            overviewDescriptionSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }, 80);
        });
        return;
      }
      pendingScrollToOverviewDescriptionRef.current = true;
      setActiveTab('overview');
    } else {
      setIsDescriptionExpanded(true);
      requestAnimationFrame(() => {
        setTimeout(() => {
          cardDescriptionFullBlockRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 80);
      });
    }
  };

  const handleDescriptionVoirMoins = () => {
    setIsDescriptionExpanded(false);
    requestAnimationFrame(() => {
      setTimeout(() => {
        cardDescriptionFullBlockRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 80);
    });
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
          {/* Close project button: only for owner, when project is in progress */}
          {!isProjectEnded && (project.status === 'in_progress' || project.status === 'coming') && userProjectRole === 'owner' && !isReadOnlyMode && (
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
          {/* Archive button: only for owner, when project is ended */}
          {project.status === 'ended' && userProjectRole === 'owner' && !isReadOnlyMode && (
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={handleArchiveProject}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', minHeight: '50px' }}
            >
              <i className="fas fa-box-archive"></i>
              Archiver le projet
            </button>
          )}
          {isMLDSProject && (
            <button type="button" className="btn btn-outline" onClick={handleExportMLDSPDF}>
              <i className="fas fa-file-pdf"></i> Exporter en PDF
            </button>
          )}
          {canAssignBadges && !isProjectEnded && !isReadOnlyMode && project.status !== 'draft' && (
            <button type="button" className="btn btn-primary" onClick={handleAssignBadge}>
              <i className="fas fa-award"></i> Attribuer un badge
            </button>
          )}
        </div>
      </div>

      {/* Project Info Section */}
      <div className="project-management-body">
        <div className="project-info-section-redesigned project-info-section-redesigned--pm">
          {/* Left Column: Project Image Gallery */}
          <div className="project-image-column">
            <div className="project-cover-large">
              {allPhotos.length > 0 ? (
                <>
                  {!coverImageLoaded && <div className="cover-image-skeleton" />}
                  <img
                    src={allPhotos[currentPhotoIndex]}
                    alt={project.title}
                    onLoad={() => setCoverImageLoaded(true)}
                    style={coverImageLoaded ? undefined : { opacity: 0, position: 'absolute' }}
                  />
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
                {/* Boutons de validation pour projets MLDS - Admin/Superadmin d'école */}
                {isMLDSProject &&
                  state.showingPageType === 'edu' &&
                  apiProjectData &&
                  (isUserAdminOfProjectOrg(apiProjectData, state.user) || isUserSuperadminOfProjectOrg(apiProjectData, state.user)) &&
                  project.status === 'to_process' && (
                    <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={handlePassToValidation}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                      >
                        <i className="fas fa-check-circle"></i>
                        Passer en validation
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={handleRefuseProject}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                      >
                        <i className="fas fa-times-circle"></i>
                        Refuser
                      </button>
                    </div>
                  )}
                {/* Bouton de validation finale - Superadmin uniquement */}
                {isMLDSProject &&
                  state.showingPageType === 'edu' &&
                  apiProjectData &&
                  isUserSuperadmin(state.user) &&
                  project.status === 'pending_validation' && (
                    <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={handleValidateProject}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                      >
                        <i className="fas fa-check-double"></i>
                        Valider le projet
                      </button>
                    </div>
                  )}
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
                {/* Edit button: owner (all projects) or co-responsable (MLDS), hidden for superadmin in read-only view */}
                {apiProjectData && canEditProject && !isProjectEnded && !isReadOnlyMode && (
                  <button
                    type="button"
                    className="btn-icon edit-btn"
                    onClick={handleEdit}
                    title="Modifier le projet"
                  >
                    <i className="fas fa-edit"></i>
                  </button>
                )}
                {/* Share button: any user who can see the project, only for public non-ended projects */}
                {project?.visibility === 'public' && !isProjectEnded && (
                  <button
                    type="button"
                    className="btn-icon"
                    onClick={handleCopyLink}
                    title="Partager un lien vers le projet"
                    disabled={isLoadingShareLink}
                  >
                    <i className="fas fa-link"></i>
                  </button>
                )}
              </div>
            </div>

            {/* Project Description */}
            <div className="project-description-section" ref={cardDescriptionFullBlockRef}>
              <div className={`project-description-content ${(!shouldShowTabs() && isDescriptionExpanded) ? 'expanded' : 'collapsed'}`}>
                <p>{project.description}</p>
              </div>
              {project.description.length > 150 && (
                shouldShowTabs() ? (
                  <button
                    className="description-toggle-btn"
                    onClick={handleDescriptionVoirPlus}
                  >
                    <span>Voir plus</span>
                    <i className="fas fa-chevron-down"></i>
                  </button>
                ) : (
                  <button
                    className="description-toggle-btn"
                    onClick={isDescriptionExpanded ? handleDescriptionVoirMoins : handleDescriptionVoirPlus}
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
                )
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
                  <span className="meta-text">{isLoadingStats ? '...' : (projectStats?.badges?.total ?? project?.badges ?? 0)} badges</span>
                </div>
              </div>
              <div className="project-tags-row">
                {(() => {
                  const pathwayList: string[] = (project.pathways && project.pathways.length > 0)
                    ? project.pathways
                    : (project.pathway ? [project.pathway] : []);
                  if (pathwayList.length === 0) return null;
                  return (
                    <div className="pathway-section">
                      <div className="section-label">Parcours</div>
                      <div className="pathway-container">
                        {pathwayList.map((p: string, index: number) => (
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

          <details className="project-team-details">
            <summary className="project-team-details__summary">
              <span className="project-team-details__label">
                <i className="fas fa-users project-team-details__icon" aria-hidden />
                Équipe &amp; partenaires
              </span>
              <span className="project-team-details__meta">
                <span className="project-team-details__hint project-team-details__hint--closed">Afficher</span>
                <span className="project-team-details__hint project-team-details__hint--open">Masquer</span>
                <i className="fas fa-chevron-down project-team-details__chevron" aria-hidden />
              </span>
            </summary>
            <div className="project-details-bottom project-details-bottom--collapsible">
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
                        {(() => {
                          const r = project.responsible;
                          const systemLabel = r?.role_in_system ? translateRole(r.role_in_system) : '';
                          const orgLabel = r?.role ? translateRole(r.role) : '';
                          return [systemLabel, orgLabel].filter(Boolean).join(' • ');
                        })()}
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
                    <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      Co-responsables
                      <span className="info-tooltip-wrapper">
                        <i className="fas fa-info-circle" style={{ color: '#6b7280', fontSize: '0.875rem', cursor: 'help' }}></i>
                        <div className="info-tooltip">
                          <div style={{ fontWeight: '600', marginBottom: '8px' }}>Les co-responsables peuvent :</div>
                          <ul>
                            <li>voir le projet dans leur profil</li>
                            <li>ajouter des membres de leur organisation uniquement et modifier leur statut (sauf admin)</li>
                            <li>attribuer des badges</li>
                            <li>faire des équipes et donner des rôles dans équipe</li>
                            <li>plus tard attribuer des tâches (Kanban)</li>
                          </ul>
                        </div>
                      </span>
                    </h4>
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
                              {(() => {
                                const systemLabel = coResponsible.role_in_system ? translateRole(coResponsible.role_in_system) : '';
                                const orgLabel = coResponsible.role ? translateRole(coResponsible.role) : '';
                                return [systemLabel, orgLabel].filter(Boolean).join(' • ');
                              })()}
                            </div>
                            {/* {coResponsible.addedFromOrganization?.name && (
                              <div style={{ fontSize: '0.8rem', color: '#0369a1', marginTop: '0.25rem', fontWeight: 600 }}>
                                Co-responsable désigné depuis : {coResponsible.addedFromOrganization.name}
                                {coResponsible.addedFromOrganization.city ? ` · ${coResponsible.addedFromOrganization.city}` : ''}
                              </div>
                            )} */}
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
                    <div className="flex gap-2 items-center">
                      <h4>Partenaire{((project.partners?.length ?? 0) > 1 ? 's' : '')}</h4>
                      <span className="info-tooltip-wrapper">
                        <i className="fas fa-info-circle" style={{ color: '#6b7280', fontSize: '0.875rem', cursor: 'help' }}></i>
                        <div className="info-tooltip">
                          <div style={{ fontWeight: '600', marginBottom: '8px' }}>En ajoutant un partenaire présent sur Kinship :</div>
                          <ul>
                            <li>Son Admin ou Superadmin pourra être désigné co-responsable du projet. </li>
                            <li>Il pourra co-rédiger, co-gérer et suivre le projet MLDS avec vous.</li>
                          </ul>
                        </div>
                      </span>
                    </div>
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
          </details>
          </div>
        </div>

        {/* Fixed section for "participant avec droit de badges": Badges que j'ai attribués + Participants du projet */}
        {!shouldShowTabs() && userProjectRole === 'participant avec droit de badges' && (
          <div style={{ marginTop: '1.5rem' }}>
            <div className="project-management-tabs">
              <button
                type="button"
                className={`tab-btn ${badgeHolderSubView === 'badges' ? 'active' : ''}`}
                onClick={() => setBadgeHolderSubView('badges')}
              >
                Badges que j&apos;ai attribués
              </button>
              <button
                type="button"
                className={`tab-btn ${badgeHolderSubView === 'participants' ? 'active' : ''}`}
                onClick={() => setBadgeHolderSubView('participants')}
              >
                Participants du projet
              </button>
            </div>
            {badgeHolderSubView === 'badges' && (
              <div className="tab-content active">
                <div className="badges-section">
                  <div className="badges-section-header">
                    <h3>Badges que j&apos;ai attribués</h3>
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
                          setBadgePage(1);
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
                              setBadgePage(1);
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
                    <div className="filter-group">
                      <label>Attribué à</label>
                      <input
                        type="text"
                        className="filter-select"
                        placeholder="Rechercher par nom…"
                        value={badgeReceiverFilter}
                        onChange={(e) => {
                          setBadgeReceiverFilter(e.target.value);
                          setBadgePage(1);
                        }}
                      />
                    </div>
                  </div>
                  <div className="view-toggle badges-view-toggle">
                    <button
                      type="button"
                      className={`view-btn ${badgeViewMode === 'cards' ? 'active' : ''}`}
                      onClick={() => setBadgeViewMode('cards')}
                    >
                      <i className="fas fa-th-large"></i> Cartes
                    </button>
                    <button
                      type="button"
                      className={`view-btn ${badgeViewMode === 'list' ? 'active' : ''}`}
                      onClick={() => setBadgeViewMode('list')}
                    >
                      <i className="fas fa-list"></i> Liste
                    </button>
                  </div>
                  <div className="badges-list">
                    {badgeViewMode === 'cards' && projectBadges.map((attribution) => (
                      <div key={attribution.id} className="badge-attribution-card">
                        <div className="badge-attribution-header">
                          <div className="badge-image">
                            <img src={attribution.badgeImage} alt={attribution.badgeTitle} />
                            {attribution.badgeSeries !== 'Série CPS' && (
                              <span className={`badge-level-pill level-${attribution.badgeLevel || '1'}`}>
                                Niveau {attribution.badgeLevel || '1'}
                              </span>
                            )}
                            {attribution.badgeSeries === 'Série CPS' && (
                              <span className="badge-domain-pill">
                                Domaine - {attribution.domaineEngagement || 'Cognitives'}
                              </span>
                            )}
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
                                      user={{ full_name: attribution.participantName, is_deleted: true }}
                                      showEmail={false}
                                      className="person-name"
                                    />
                                  ) : (
                                    <span className="person-name">{attribution.participantName}</span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="attributed-by">
                              <h5>Attribué par:</h5>
                              <div className="person-info">
                                <div className="person-info-header">
                                  <AvatarImage src={attribution.attributedByAvatar || DEFAULT_AVATAR_SRC} alt={attribution.attributedByName} />
                                  {attribution.attributedByIsDeleted ? (
                                    <DeletedUserDisplay
                                      user={{ full_name: attribution.attributedByName, is_deleted: true }}
                                      showEmail={false}
                                      className="person-name"
                                    />
                                  ) : (
                                    <span className="person-name">{attribution.attributedByName}</span>
                                  )}
                                </div>
                                {(attribution.attributedByJob || attribution.attributedByRole) && (
                                  <span className="person-email" style={{ display: 'block', marginTop: '2px' }}>
                                    {[attribution.attributedByJob, attribution.attributedByRole ? translateRole(attribution.attributedByRole) : ''].filter(Boolean).join(' · ')}
                                  </span>
                                )}
                                {attribution.attributedByOrganization && (
                                  <span className="person-organization">{attribution.attributedByOrganization}</span>
                                )}
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
                                  {(attribution.preuveFiles && attribution.preuveFiles.length > 0 ? attribution.preuveFiles : [attribution.preuve])
                                    .filter(Boolean)
                                    .map((file: BadgeFile | undefined, index: number) => (
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
                    {badgeViewMode === 'list' && projectBadges.length > 0 && (
                      <div className="badges-table-scroll">
                        <table className="badges-attribution-table">
                          <thead>
                            <tr>
                              <th>Badge</th>
                              <th>Titre</th>
                              <th>Série</th>
                              <th>Niveau</th>
                              <th>Attribué à</th>
                              <th>Attribué par</th>
                              <th>Preuve</th>
                              <th>Commentaire</th>
                              <th>Date</th>
                            </tr>
                          </thead>
                          <tbody>
                            {projectBadges.map((attribution) => {
                              const firstPreuve = attribution.preuveFiles?.length
                                ? attribution.preuveFiles[0]
                                : attribution.preuve;
                              const preuveUrl = firstPreuve?.url;
                              const preuveLabel = firstPreuve?.name || (attribution.preuveFiles?.length ? `${attribution.preuveFiles.length} document(s)` : 'Document');
                              return (
                                <tr key={attribution.id}>
                                  <td>
                                    <img src={attribution.badgeImage} alt={attribution.badgeTitle} className="badge-list-icon" />
                                  </td>
                                  <td>{attribution.badgeTitle}</td>
                                  <td>{attribution.badgeSeries || '—'}</td>
                                  <td>
                                    {attribution.badgeSeries === 'Série CPS'
                                      ? (attribution.domaineEngagement || '—')
                                      : `Niveau ${attribution.badgeLevel || '1'}`}
                                  </td>
                                  <td>{attribution.participantName || '—'}</td>
                                  <td>{attribution.attributedByName || '—'}</td>
                                  <td>
                                    {preuveUrl ? (
                                      <a href={preuveUrl} target="_blank" rel="noopener noreferrer" className="badge-list-preuve-link">
                                        {preuveLabel}
                                      </a>
                                    ) : (
                                      attribution.preuveFiles?.length || attribution.preuve ? preuveLabel : '—'
                                    )}
                                  </td>
                                  <td title={attribution.commentaire || ''} className="badge-list-comment">
                                    {attribution.commentaire ? (attribution.commentaire.length > 60 ? `${attribution.commentaire.slice(0, 60)}…` : attribution.commentaire) : '—'}
                                  </td>
                                  <td>{formatDate(attribution.dateAttribution)}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                    {!isLoadingProjectBadges && projectBadges.length === 0 && (
                      <div className="empty-state">
                        <div className="empty-icon">
                          <i className="fas fa-award"></i>
                        </div>
                        <h4>Aucun badge attribué</h4>
                        <p>Les badges que vous avez attribués dans ce projet apparaîtront ici.</p>
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
            {badgeHolderSubView === 'participants' && renderParticipantsSection(false, false)}
          </div>
        )}

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
        {(isSuperadminViewingReadOnly || isAdminViewingReadOnly) && (
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
            {showOverviewStatsTabContent && (
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

                {/* Full description in overview tab */}
                {project.description && (
                  <div className="overview-description-section" ref={overviewDescriptionSectionRef}>
                    <h3 className="overview-description-title">Description</h3>
                    <p className="overview-description-text">{project.description}</p>
                  </div>
                )}
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
                          {canAssignBadges && !isProjectEnded && !isReadOnlyMode && project.status !== 'draft' && (
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
                          {canUserSeeRemoveButton(userProjectRole) && participant.canRemove && !isProjectEnded && !isReadOnlyMode && (
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

                          {!isReadOnlyMode && (
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

            {activeTab === 'participants' && renderParticipantsSection(!isProjectEnded && !isReadOnlyMode, true)}

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
                      {shouldShowTabs() && !isProjectEnded && !isReadOnlyMode && (
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
                      {shouldShowTabs() && !isProjectEnded && !isReadOnlyMode && (
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
                                    {shouldShowTabs() && !isProjectEnded && !isReadOnlyMode && (
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
                    <div className="filter-group">
                      <label>Attribué à</label>
                      <input
                        type="text"
                        className="filter-select"
                        placeholder="Rechercher par nom…"
                        value={badgeReceiverFilter}
                        onChange={(e) => {
                          setBadgeReceiverFilter(e.target.value);
                          setBadgePage(1);
                        }}
                      />
                    </div>
                  </div>

                  <div className="view-toggle badges-view-toggle">
                    <button
                      type="button"
                      className={`view-btn ${badgeViewMode === 'cards' ? 'active' : ''}`}
                      onClick={() => setBadgeViewMode('cards')}
                    >
                      <i className="fas fa-th-large"></i> Cartes
                    </button>
                    <button
                      type="button"
                      className={`view-btn ${badgeViewMode === 'list' ? 'active' : ''}`}
                      onClick={() => setBadgeViewMode('list')}
                    >
                      <i className="fas fa-list"></i> Liste
                    </button>
                  </div>

                  <div className="badges-list">
                    {badgeViewMode === 'cards' && projectBadges.map((attribution) => (
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
                                {(attribution.attributedByJob || attribution.attributedByRole) && (
                                  <span className="person-email" style={{ display: 'block', marginTop: '2px' }}>
                                    {[attribution.attributedByJob, attribution.attributedByRole ? translateRole(attribution.attributedByRole) : ''].filter(Boolean).join(' · ')}
                                  </span>
                                )}
                                {attribution.attributedByOrganization && (
                                  <span className="person-organization">{attribution.attributedByOrganization}</span>
                                )}
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

                    {badgeViewMode === 'list' && projectBadges.length > 0 && (
                      <div className="badges-table-scroll">
                        <table className="badges-attribution-table">
                          <thead>
                            <tr>
                              <th>Badge</th>
                              <th>Titre</th>
                              <th>Série</th>
                              <th>Niveau</th>
                              <th>Attribué à</th>
                              <th>Attribué par</th>
                              <th>Preuve</th>
                              <th>Commentaire</th>
                              <th>Date</th>
                            </tr>
                          </thead>
                          <tbody>
                            {projectBadges.map((attribution) => {
                              const firstPreuve = attribution.preuveFiles?.length
                                ? attribution.preuveFiles[0]
                                : attribution.preuve;
                              const preuveUrl = firstPreuve?.url;
                              const preuveLabel = firstPreuve?.name || (attribution.preuveFiles?.length ? `${attribution.preuveFiles.length} document(s)` : 'Document');
                              return (
                                <tr key={attribution.id}>
                                  <td>
                                    <img src={attribution.badgeImage} alt={attribution.badgeTitle} className="badge-list-icon" />
                                  </td>
                                  <td>{attribution.badgeTitle}</td>
                                  <td>{attribution.badgeSeries || '—'}</td>
                                  <td>
                                    {attribution.badgeSeries === 'Série CPS'
                                      ? (attribution.domaineEngagement || '—')
                                      : `Niveau ${attribution.badgeLevel || '1'}`}
                                  </td>
                                  <td>{attribution.participantName || '—'}</td>
                                  <td>{attribution.attributedByName || '—'}</td>
                                  <td>
                                    {preuveUrl ? (
                                      <a href={preuveUrl} target="_blank" rel="noopener noreferrer" className="badge-list-preuve-link">
                                        {preuveLabel}
                                      </a>
                                    ) : (
                                      attribution.preuveFiles?.length || attribution.preuve ? preuveLabel : '—'
                                    )}
                                  </td>
                                  <td title={attribution.commentaire || ''} className="badge-list-comment">
                                    {attribution.commentaire ? (attribution.commentaire.length > 60 ? `${attribution.commentaire.slice(0, 60)}…` : attribution.commentaire) : '—'}
                                  </td>
                                  <td>{formatDate(attribution.dateAttribution)}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}

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

                  {!isReadOnlyMode && !isProjectEnded && (
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
                                  {!isProjectEnded && !isReadOnlyMode && (
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

            {showMldsSupplementaryTabContent && (() => {
              const mldsBilan = apiProjectData.mlds_information?.mlds_bilan ?? apiProjectData.mlds_information?.mnt;
              const formatBilanVal = (v: unknown) => (v != null && v !== '' ? (typeof v === 'number' ? Number(v).toFixed(2) : String(v)) : '—');
              return (
                <div className="tab-content active">
                  <div className="badges-section">
                    <div className="badges-section-header">
                      <h3>Informations MLDS - Volet {apiProjectData.mlds_information.type_mlds === 'remediation' ? 'Remédiation' : 'Persévérance Scolaire'}</h3>
                    </div>

                    <div className="overview-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
                      {/* Problématique réseau traitée */}
                      {apiProjectData.mlds_information.network_issue_addressed && (
                        <div className="stat-card" style={{ gridColumn: 'span 2' }}>
                          <div className="stat-content">
                            <div className="stat-label">
                              {apiProjectData.mlds_information.type_mlds === 'remediation'
                                ? 'Actions concernées'
                                : "Problématique du réseau à laquelle l'action répond"}
                            </div>
                            {apiProjectData.mlds_information.type_mlds === 'remediation' ? (
                              <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                {String(apiProjectData.mlds_information.network_issue_addressed)
                                  .split('|')
                                  .map((s) => s.trim())
                                  .filter(Boolean)
                                  .map((label: string, index: number) => (
                                    <div
                                      key={`${label}-${index}`}
                                      style={{ fontSize: '0.9rem', color: '#374151', display: 'flex', alignItems: 'start', gap: '0.5rem' }}
                                    >
                                      <i className="fas fa-check-circle" style={{ color: '#10b981', marginTop: '0.25rem' }}></i>
                                      <span className="text-left">{label}</span>
                                    </div>
                                  ))}
                              </div>
                            ) : (
                              <div style={{ fontSize: '0.95rem', marginTop: '0.75rem', lineHeight: '1.6', color: '#374151' }}>
                                {apiProjectData.mlds_information.network_issue_addressed}
                              </div>
                            )}
                          </div>
                        </div>
                      )}

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
                            {mldsBilan && (mldsBilan.expected_participants != null || mldsBilan.expected_participants_comment) && (
                              <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid #e5e7eb' }}>
                                <div style={{ fontSize: '0.80rem', fontWeight: 600, color: '#6b7280', marginBottom: '0.35rem' }}>Bilan à la clôture</div>
                                <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#111827' }}>{mldsBilan.expected_participants ?? '0'}</div>
                                {mldsBilan.expected_participants_comment && <div style={{ marginTop: '0.35rem', fontSize: '0.8125rem', color: '#4b5563', lineHeight: 1.4 }}>{mldsBilan.expected_participants_comment}</div>}
                              </div>
                            )}
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
                                    {obj === 'aec_development' && "Parcours d'éducation artistique et culturelle"}
                                    {obj === 'future_path_development' && 'Parcours d\'avenir'}
                                    {obj === 'citizen_path_development' && 'Parcours citoyen'}
                                    {obj === 'pe_development' && "Apprendre par l'éducation physique et sportive"}
                                    {obj === 'disciplinary_courses' && 'Cours disciplinaires'}
                                    {obj === 'job_discovery' && 'Découverte des métiers'}
                                    {obj === 'training_discovery' && 'Découverte des formations'}
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
                        apiProjectData.mlds_information.financial_rate != null ||
                        apiProjectData.mlds_information.financial_hv != null ||
                        (Array.isArray(apiProjectData.mlds_information.financial_hv_lines) && apiProjectData.mlds_information.financial_hv_lines.length > 0) ||
                        apiProjectData.mlds_information.financial_transport != null ||
                        apiProjectData.mlds_information.financial_operating != null ||
                        getMldsServiceLinesFromMldsInfo(apiProjectData.mlds_information).length > 0 ||
                        (Array.isArray(apiProjectData.mlds_information.financial_autres_financements) && apiProjectData.mlds_information.financial_autres_financements.length > 0)) && (
                          <div style={{ gridColumn: 'span 2' }}>
                            <div
                              style={{
                                borderRadius: '12px',
                                border: '1px solid #e2e8f0',
                                background: '#fff',
                                boxShadow: '0 1px 3px rgba(15, 23, 42, 0.06)',
                                overflow: 'hidden'
                              }}
                            >
                              <div
                                style={{
                                  padding: '1rem 1.25rem',
                                  background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
                                  borderBottom: '1px solid #e2e8f0',
                                  display: 'flex',
                                  alignItems: 'flex-start',
                                  gap: '0.75rem'
                                }}
                              >
                                <div
                                  style={{
                                    width: '42px',
                                    height: '42px',
                                    borderRadius: '10px',
                                    background: '#e0f2fe',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0
                                  }}
                                >
                                  <i className="fas fa-wallet" style={{ color: '#0369a1', fontSize: '1.1rem' }} aria-hidden />
                                </div>
                                <div style={{ minWidth: 0 }}>
                                  <div style={{ fontWeight: 700, fontSize: '1.05rem', color: '#0f172a', letterSpacing: '-0.01em' }}>
                                    Moyens financiers demandés
                                  </div>
                                  <p style={{ margin: '0.35rem 0 0', fontSize: '0.8125rem', color: '#64748b', lineHeight: 1.45 }}>
                                    Heures HSE, taux horaire MLDS, puis détail des crédits (HV par enseignant, transport, fonctionnement, prestataires).
                                  </p>
                                </div>
                              </div>

                              <div style={{ padding: '1.25rem' }}>
                                <div
                                  style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(auto-fill, minmax(158px, 1fr))',
                                    gap: '0.75rem',
                                    marginBottom: '1rem'
                                  }}
                                >
                                  {apiProjectData.mlds_information.financial_hse != null && (
                                    <div
                                      style={{
                                        padding: '0.85rem 1rem',
                                        background: '#f8fafc',
                                        borderRadius: '8px',
                                        border: '1px solid #e2e8f0'
                                      }}
                                    >
                                      <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.35rem' }}>
                                        HSE
                                      </div>
                                      <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#0f172a' }}>
                                        {Number.parseFloat(String(apiProjectData.mlds_information.financial_hse)).toFixed(2)}{' '}
                                        <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#475569' }}>h</span>
                                      </div>
                                    </div>
                                  )}
                                  {apiProjectData.mlds_information.financial_hv != null &&
                                    !(Array.isArray(apiProjectData.mlds_information.financial_hv_lines) && apiProjectData.mlds_information.financial_hv_lines.length > 0) && (
                                    <div
                                      style={{
                                        padding: '0.85rem 1rem',
                                        background: '#f8fafc',
                                        borderRadius: '8px',
                                        border: '1px solid #e2e8f0'
                                      }}
                                    >
                                      <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.35rem' }}>
                                        HV (global)
                                      </div>
                                      <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#0f172a' }}>
                                        {Number.parseFloat(String(apiProjectData.mlds_information.financial_hv)).toFixed(2)}{' '}
                                        <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#475569' }}>h</span>
                                      </div>
                                    </div>
                                  )}
                                  {(apiProjectData.mlds_information.financial_rate != null ||
                                    apiProjectData.mlds_information.financial_hv != null) && (
                                    <div
                                      style={{
                                        padding: '0.85rem 1rem',
                                        background: '#f8fafc',
                                        borderRadius: '8px',
                                        border: '1px solid #e2e8f0'
                                      }}
                                    >
                                      <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.35rem' }}>
                                        Taux horaire
                                      </div>
                                      <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#0f172a' }}>
                                        {Number.parseFloat(String(apiProjectData.mlds_information.financial_rate)).toFixed(2)}{' '}
                                        <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#475569' }}>€/h</span>
                                      </div>
                                    </div>
                                  )}
                                  {(apiProjectData.mlds_information.financial_hv != null ||
                                    apiProjectData.mlds_information.financial_rate != null) &&
                                    !(Array.isArray(apiProjectData.mlds_information.financial_hv_lines) && apiProjectData.mlds_information.financial_hv_lines.length > 0) && (
                                    <div
                                      style={{
                                        padding: '0.85rem 1rem',
                                        background: '#f0fdf4',
                                        borderRadius: '8px',
                                        border: '1px solid #bbf7d0'
                                      }}
                                    >
                                      <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#15803d', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.35rem' }}>
                                        Sous-total HV × taux
                                      </div>
                                      <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#14532d' }}>
                                        {(() => {
                                          const hvHours = Number.parseFloat(String(apiProjectData.mlds_information.financial_hv ?? 0)) || 0;
                                          const rate = Number.parseFloat(String(apiProjectData.mlds_information.financial_rate ?? HV_DEFAULT_RATE)) || HV_DEFAULT_RATE;
                                          return `${(hvHours * rate).toFixed(2)} €`;
                                        })()}
                                      </div>
                                    </div>
                                  )}
                                  {Array.isArray(apiProjectData.mlds_information.financial_hv_lines) &&
                                    apiProjectData.mlds_information.financial_hv_lines.length > 0 &&
                                    apiProjectData.mlds_information.financial_rate != null && (
                                    <div
                                      style={{
                                        padding: '0.85rem 1rem',
                                        background: '#eff6ff',
                                        borderRadius: '8px',
                                        border: '1px solid #bfdbfe',
                                        gridColumn: '1 / -1'
                                      }}
                                    >
                                      <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#1d4ed8', marginBottom: '0.25rem' }}>
                                        HV détaillé par enseignant
                                      </div>
                                      <div style={{ fontSize: '0.8125rem', color: '#1e40af', lineHeight: 1.4 }}>
                                        Les heures sont indiquées ligne par ligne ci-dessous ; le montant en euros tient compte du taux {Number.parseFloat(String(apiProjectData.mlds_information.financial_rate)).toFixed(2)} €/h.
                                      </div>
                                    </div>
                                  )}
                                </div>

                                {mldsBilan && (() => {
                                  const b = mldsBilan as Record<string, unknown>;
                                  const hasNewBilan =
                                    b.hse != null ||
                                    b.hv != null ||
                                    b.financial_rate != null ||
                                    (Array.isArray(b.financial_hv_lines) && (b.financial_hv_lines as unknown[]).length > 0) ||
                                    (Array.isArray(b.financial_transport) && (b.financial_transport as unknown[]).length > 0) ||
                                    (Array.isArray(b.financial_operating) && (b.financial_operating as unknown[]).length > 0) ||
                                    (Array.isArray(b.financial_service) && (b.financial_service as unknown[]).length > 0) ||
                                    (Array.isArray(b.financial_autres_financements) && (b.financial_autres_financements as unknown[]).length > 0);
                                  const hasLegacyBilan =
                                    (b as { hse_comment?: string }).hse_comment ||
                                    (b as { hv_comment?: string }).hv_comment ||
                                    (b as { financial_rate_comment?: string }).financial_rate_comment ||
                                    (b as { financial_transport_comment?: string }).financial_transport_comment ||
                                    (b as { financial_operating_comment?: string }).financial_operating_comment ||
                                    (b as { financial_service_comment?: string }).financial_service_comment;
                                  if (!hasNewBilan && !hasLegacyBilan && b.hv == null && b.financial_rate == null) return null;

                                  const initRate = apiProjectData.mlds_information.financial_rate != null
                                    ? Number(apiProjectData.mlds_information.financial_rate)
                                    : HV_DEFAULT_RATE;
                                  const bilanRate = b.financial_rate != null ? Number(b.financial_rate) : null;
                                  const bilanHvLines = Array.isArray(b.financial_hv_lines)
                                    ? (b.financial_hv_lines as Array<{ teacher_name?: string; hour?: string; price?: string; comment?: string | null }>)
                                    : [];
                                  const hvHoursBilan =
                                    bilanHvLines.length > 0
                                      ? bilanHvLines.reduce((s, l) => s + hvLineHours(l), 0)
                                      : b.hv != null
                                        ? Number(b.hv)
                                        : 0;
                                  const euroHvBilan = hvHoursBilan * (bilanRate ?? initRate);

                                  return (
                                    <div style={{ gridColumn: '1 / -1', marginTop: '0.5rem', padding: '0.75rem', backgroundColor: '#f0fdf4', borderRadius: '0.5rem', borderLeft: '3px solid #16a34a' }}>
                                      <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#15803d', marginBottom: '0.35rem' }}>Bilan à la clôture</div>
                                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.9rem' }}>
                                        {b.hse != null && (
                                          <span>
                                            <strong>HSE :</strong> {formatBilanVal(Number(b.hse))} h
                                            {(b as { hse_comment?: string }).hse_comment && (
                                              <span style={{ fontSize: '0.8125rem', color: '#4b5563', fontStyle: 'italic', marginLeft: '0.5rem' }}>{(b as { hse_comment?: string }).hse_comment}</span>
                                            )}
                                          </span>
                                        )}
                                        {bilanHvLines.length > 0 ? (
                                          <div>
                                            <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>HV par enseignant</div>
                                            {bilanHvLines.map((line, idx) => (
                                              <div key={idx} style={{ marginBottom: '0.35rem', paddingLeft: '0.5rem' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                                                  <span>{line.teacher_name?.trim() || 'Enseignant'}</span>
                                                  <span>{hvLineHours(line).toFixed(2)} h × {formatBilanVal(bilanRate ?? initRate)} €/h = {formatBilanVal(hvLineHours(line) * (bilanRate ?? initRate))} €</span>
                                                </div>
                                                {line.comment != null && String(line.comment).trim() !== '' && (
                                                  <div style={{ fontSize: '0.8125rem', color: '#4b5563', marginTop: '0.2rem', fontStyle: 'italic', lineHeight: 1.35 }}>
                                                    {String(line.comment)}
                                                  </div>
                                                )}
                                              </div>
                                            ))}
                                          </div>
                                        ) : (
                                          b.hv != null && (
                                            <span>
                                              <strong>HV :</strong> {formatBilanVal(Number(b.hv))} h
                                              {(b as { hv_comment?: string }).hv_comment && (
                                                <span style={{ fontSize: '0.8125rem', color: '#4b5563', fontStyle: 'italic', marginLeft: '0.5rem' }}>{(b as { hv_comment?: string }).hv_comment}</span>
                                              )}
                                            </span>
                                          )
                                        )}
                                        {b.financial_rate != null && (
                                          <span>
                                            <strong>Taux horaire :</strong> {formatBilanVal(Number(b.financial_rate))} €/h
                                            {(b as { financial_rate_comment?: string }).financial_rate_comment && (
                                              <span style={{ fontSize: '0.8125rem', color: '#4b5563', fontStyle: 'italic', marginLeft: '0.5rem' }}>{(b as { financial_rate_comment?: string }).financial_rate_comment}</span>
                                            )}
                                          </span>
                                        )}
                                        {(bilanHvLines.length > 0 || b.hv != null) && (
                                          <span><strong>Sous-total HV × taux (bilan) :</strong> {formatBilanVal(euroHvBilan)} €</span>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })()}

                              <div
                                style={{
                                  marginTop: '1.25rem',
                                  paddingTop: '1.25rem',
                                  borderTop: '1px solid #e2e8f0'
                                }}
                              >
                              <div style={{ marginTop: 0, padding: '1rem', backgroundColor: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.85rem' }}>
                                  <i className="fas fa-list-ul" style={{ color: '#0369a1', fontSize: '0.95rem' }} aria-hidden />
                                  <span style={{ fontSize: '1rem', fontWeight: 600, color: '#334155' }}>Détail des crédits</span>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                  {(() => {
                                    const hvCreditLines = Array.isArray(apiProjectData.mlds_information.financial_hv_lines)
                                      ? apiProjectData.mlds_information.financial_hv_lines
                                      : [];
                                    const hvDisplayRate =
                                      Number.parseFloat(String(apiProjectData.mlds_information.financial_rate ?? HV_DEFAULT_RATE)) ||
                                      HV_DEFAULT_RATE;
                                    const transportLines = Array.isArray(apiProjectData.mlds_information.financial_transport)
                                      ? apiProjectData.mlds_information.financial_transport
                                      : [];
                                    const operatingLines = Array.isArray(apiProjectData.mlds_information.financial_operating)
                                      ? apiProjectData.mlds_information.financial_operating
                                      : [];
                                    const serviceLines = getMldsServiceLinesFromMldsInfo(apiProjectData.mlds_information);

                                    return (
                                      <>
                                        {hvCreditLines.length > 0 && (
                                          <div>
                                            <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem', fontWeight: 600 }}>HV (crédits)</div>
                                            {hvCreditLines.map((line: { teacher_name?: string; hour?: string; price?: string }, idx: number) => {
                                              const h = hvLineHours(line);
                                              const lineEuro = h * hvDisplayRate;
                                              return (
                                              <div
                                                key={idx}
                                                style={{
                                                  display: 'flex',
                                                  justifyContent: 'space-between',
                                                  alignItems: 'center',
                                                  flexWrap: 'wrap',
                                                  gap: '0.35rem 0.75rem',
                                                  marginBottom: '0.35rem',
                                                  paddingLeft: '1rem',
                                                  paddingBottom: '0.35rem',
                                                  borderBottom: '1px solid #f1f5f9'
                                                }}
                                              >
                                                <span style={{ fontSize: '0.875rem', color: '#374151', flex: '1 1 120px' }}>
                                                  {line.teacher_name?.trim() || 'Enseignant'}
                                                </span>
                                                <span style={{ fontSize: '0.875rem', color: '#64748b', fontWeight: 600 }}>
                                                  {h.toFixed(2)} h
                                                </span>
                                                <span
                                                  style={{ fontSize: '0.875rem', fontWeight: 700, color: '#111827', marginLeft: 'auto' }}
                                                  title={`${h.toFixed(2)} h × ${hvDisplayRate.toFixed(2)} €/h`}
                                                >
                                                  {lineEuro.toFixed(2)} €
                                                </span>
                                              </div>
                                              );
                                            })}
                                          </div>
                                        )}
                                        {transportLines.length > 0 && (
                                          <div>
                                            <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem', fontWeight: 600 }}>Frais de transport</div>
                                            {transportLines.map((line: any, idx: number) => (
                                              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem', paddingLeft: '1rem' }}>
                                                <span style={{ fontSize: '0.875rem', color: '#374151' }}>{line.transport_name || 'Non spécifié'}</span>
                                                <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#111827' }}>
                                                  {Number.parseFloat(line.price || '0').toFixed(2)} €
                                                </span>
                                              </div>
                                            ))}
                                            {mldsBilan && (() => {
                                              const bb = mldsBilan as Record<string, unknown>;
                                              const arr = bb.financial_transport;
                                              if (Array.isArray(arr) && arr.length > 0) {
                                                return (
                                                  <div style={{ marginTop: '0.5rem', padding: '0.5rem 0.75rem', backgroundColor: '#f0fdf4', borderRadius: '0.375rem', borderLeft: '3px solid #16a34a' }}>
                                                    <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#15803d', marginBottom: '0.25rem' }}>Bilan à la clôture — transport</div>
                                                    {bb.financial_transport_comment != null && String(bb.financial_transport_comment).trim() !== '' && (
                                                      <div style={{ fontSize: '0.8125rem', color: '#374151', marginBottom: '0.45rem', fontStyle: 'italic' }}>
                                                        {String(bb.financial_transport_comment)}
                                                      </div>
                                                    )}
                                                    {(arr as Array<{ transport_name?: string; price?: string; comment?: string | null }>).map((line, idx) => (
                                                      <div key={idx} style={{ marginBottom: '0.35rem' }}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                                                          <span>{line.transport_name || '—'}</span>
                                                          <span style={{ fontWeight: 600 }}>{Number.parseFloat(String(line.price || '0')).toFixed(2)} €</span>
                                                        </div>
                                                        {line.comment != null && String(line.comment).trim() !== '' && (
                                                          <div style={{ fontSize: '0.8125rem', color: '#6b7280', marginTop: '0.15rem', fontStyle: 'italic' }}>{String(line.comment)}</div>
                                                        )}
                                                      </div>
                                                    ))}
                                                  </div>
                                                );
                                              }
                                              if (typeof arr === 'number' || bb.financial_transport_comment) {
                                                return (
                                                  <div style={{ marginTop: '0.5rem', padding: '0.5rem 0.75rem', backgroundColor: '#f0fdf4', borderRadius: '0.375rem', borderLeft: '3px solid #16a34a' }}>
                                                    <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#15803d', marginBottom: '0.25rem' }}>Bilan à la clôture</div>
                                                    <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#111827' }}>{`${formatBilanVal(arr as number)} €`}</div>
                                                    {bb.financial_transport_comment ? <div style={{ marginTop: '0.25rem', fontSize: '0.8125rem', color: '#4b5563' }}>{String(bb.financial_transport_comment)}</div> : null}
                                                  </div>
                                                );
                                              }
                                              return null;
                                            })()}
                                          </div>
                                        )}
                                        {operatingLines.length > 0 && (
                                          <div>
                                            <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem', fontWeight: 600 }}>Frais de fonctionnement</div>
                                            {operatingLines.map((line: any, idx: number) => (
                                              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem', paddingLeft: '1rem' }}>
                                                <span style={{ fontSize: '0.875rem', color: '#374151' }}>{line.operating_name || 'Non spécifié'}</span>
                                                <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#111827' }}>
                                                  {Number.parseFloat(line.price || '0').toFixed(2)} €
                                                </span>
                                              </div>
                                            ))}
                                            {mldsBilan && (() => {
                                              const bb = mldsBilan as Record<string, unknown>;
                                              const arr = bb.financial_operating;
                                              if (Array.isArray(arr) && arr.length > 0) {
                                                return (
                                                  <div style={{ marginTop: '0.5rem', padding: '0.5rem 0.75rem', backgroundColor: '#f0fdf4', borderRadius: '0.375rem', borderLeft: '3px solid #16a34a' }}>
                                                    <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#15803d', marginBottom: '0.25rem' }}>Bilan à la clôture — fonctionnement</div>
                                                    {bb.financial_operating_comment != null && String(bb.financial_operating_comment).trim() !== '' && (
                                                      <div style={{ fontSize: '0.8125rem', color: '#374151', marginBottom: '0.45rem', fontStyle: 'italic' }}>
                                                        {String(bb.financial_operating_comment)}
                                                      </div>
                                                    )}
                                                    {(arr as Array<{ operating_name?: string; price?: string; comment?: string | null }>).map((line, idx) => (
                                                      <div key={idx} style={{ marginBottom: '0.35rem' }}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                                                          <span>{line.operating_name || '—'}</span>
                                                          <span style={{ fontWeight: 600 }}>{Number.parseFloat(String(line.price || '0')).toFixed(2)} €</span>
                                                        </div>
                                                        {line.comment != null && String(line.comment).trim() !== '' && (
                                                          <div style={{ fontSize: '0.8125rem', color: '#6b7280', marginTop: '0.15rem', fontStyle: 'italic' }}>{String(line.comment)}</div>
                                                        )}
                                                      </div>
                                                    ))}
                                                  </div>
                                                );
                                              }
                                              if (typeof arr === 'number' || bb.financial_operating_comment) {
                                                return (
                                                  <div style={{ marginTop: '0.5rem', padding: '0.5rem 0.75rem', backgroundColor: '#f0fdf4', borderRadius: '0.375rem', borderLeft: '3px solid #16a34a' }}>
                                                    <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#15803d', marginBottom: '0.25rem' }}>Bilan à la clôture</div>
                                                    <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#111827' }}>{`${formatBilanVal(arr as number)} €`}</div>
                                                    {bb.financial_operating_comment ? <div style={{ marginTop: '0.25rem', fontSize: '0.8125rem', color: '#4b5563' }}>{String(bb.financial_operating_comment)}</div> : null}
                                                  </div>
                                                );
                                              }
                                              return null;
                                            })()}
                                          </div>
                                        )}
                                        {serviceLines.length > 0 && (
                                          <div>
                                            <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem', fontWeight: 600 }}>Prestataires de service</div>
                                            {serviceLines.map((line: any, idx: number) => {
                                              const h = Number.parseFloat(String(line.hours ?? ''));
                                              const p = Number.parseFloat(String(line.price ?? '0'));
                                              const rateLbl = line.hours != null && line.hours !== '' && h > 0 && !Number.isNaN(h) && !Number.isNaN(p)
                                                ? `${(p / h).toFixed(2)} €/h`
                                                : null;
                                              return (
                                              <div key={idx} style={{ marginBottom: '0.5rem', paddingLeft: '1rem' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.35rem' }}>
                                                  <span style={{ fontSize: '0.875rem', color: '#374151' }}>{line.service_name || 'Non spécifié'}</span>
                                                  <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#111827' }}>
                                                    {Number.parseFloat(line.price || '0').toFixed(2)} €
                                                  </span>
                                                </div>
                                                {(line.hours != null && line.hours !== '') && (
                                                  <div style={{ fontSize: '0.8125rem', color: '#6b7280', marginTop: '0.15rem' }}>
                                                    {String(line.hours)} h d&apos;intervention
                                                    {rateLbl && <span> — taux : {rateLbl}</span>}
                                                  </div>
                                                )}
                                                {line.comment != null && String(line.comment).trim() !== '' && (
                                                  <div style={{ fontSize: '0.8125rem', color: '#6b7280', marginTop: '0.15rem', fontStyle: 'italic' }}>
                                                    {String(line.comment)}
                                                  </div>
                                                )}
                                                {line.quote_url && (
                                                  <a href={line.quote_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.8125rem', display: 'inline-block', marginTop: '0.25rem' }}>
                                                    Voir le devis
                                                  </a>
                                                )}
                                              </div>
                                            );
                                            })}
                                            {mldsBilan && (() => {
                                              const bb = mldsBilan as Record<string, unknown>;
                                              const arr = bb.financial_service;
                                              if (Array.isArray(arr) && arr.length > 0) {
                                                return (
                                                  <div style={{ marginTop: '0.5rem', padding: '0.5rem 0.75rem', backgroundColor: '#f0fdf4', borderRadius: '0.375rem', borderLeft: '3px solid #16a34a' }}>
                                                    <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#15803d', marginBottom: '0.25rem' }}>Bilan à la clôture — prestataires</div>
                                                    {bb.financial_service_comment != null && String(bb.financial_service_comment).trim() !== '' && (
                                                      <div style={{ fontSize: '0.8125rem', color: '#374151', marginBottom: '0.45rem', fontStyle: 'italic' }}>
                                                        {String(bb.financial_service_comment)}
                                                      </div>
                                                    )}
                                                    {(arr as Array<{ service_name?: string; price?: string; hours?: string; comment?: string | null }>).map((line, idx) => (
                                                      <div key={idx} style={{ marginBottom: '0.35rem', fontSize: '0.875rem' }}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                          <span>{line.service_name || '—'}</span>
                                                          <span style={{ fontWeight: 600 }}>{Number.parseFloat(String(line.price || '0')).toFixed(2)} €</span>
                                                        </div>
                                                        {line.hours != null && String(line.hours) !== '' && (
                                                          <div style={{ fontSize: '0.8125rem', color: '#4b5563' }}>{String(line.hours)} h</div>
                                                        )}
                                                        {line.comment != null && String(line.comment).trim() !== '' && (
                                                          <div style={{ fontSize: '0.8125rem', color: '#6b7280', marginTop: '0.15rem', fontStyle: 'italic' }}>{String(line.comment)}</div>
                                                        )}
                                                      </div>
                                                    ))}
                                                  </div>
                                                );
                                              }
                                              if (typeof arr === 'number' || bb.financial_service_comment) {
                                                return (
                                                  <div style={{ marginTop: '0.5rem', padding: '0.5rem 0.75rem', backgroundColor: '#f0fdf4', borderRadius: '0.375rem', borderLeft: '3px solid #16a34a' }}>
                                                    <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#15803d', marginBottom: '0.25rem' }}>Bilan à la clôture</div>
                                                    <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#111827' }}>{`${formatBilanVal(arr as number)} €`}</div>
                                                    {bb.financial_service_comment ? <div style={{ marginTop: '0.25rem', fontSize: '0.8125rem', color: '#4b5563' }}>{String(bb.financial_service_comment)}</div> : null}
                                                  </div>
                                                );
                                              }
                                              return null;
                                            })()}
                                          </div>
                                        )}
                                      </>
                                    );
                                  })()}
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
                                      {(() => {
                                        const transportLines = Array.isArray(apiProjectData.mlds_information.financial_transport)
                                          ? apiProjectData.mlds_information.financial_transport
                                          : [];
                                        const operatingLines = Array.isArray(apiProjectData.mlds_information.financial_operating)
                                          ? apiProjectData.mlds_information.financial_operating
                                          : [];
                                        const serviceLines = getMldsServiceLinesFromMldsInfo(apiProjectData.mlds_information);
                                        const hvLines = Array.isArray(apiProjectData.mlds_information.financial_hv_lines)
                                          ? apiProjectData.mlds_information.financial_hv_lines
                                          : [];
                                        const crRate =
                                          Number.parseFloat(String(apiProjectData.mlds_information.financial_rate ?? HV_DEFAULT_RATE)) ||
                                          HV_DEFAULT_RATE;

                                        const transportTotal = transportLines.reduce((sum: number, line: any) => sum + (Number.parseFloat(line.price || '0') || 0), 0);
                                        const operatingTotal = operatingLines.reduce((sum: number, line: any) => sum + (Number.parseFloat(line.price || '0') || 0), 0);
                                        const serviceTotal = serviceLines.reduce((sum: number, line: any) => sum + (Number.parseFloat(line.price || '0') || 0), 0);
                                        const hvLinesTotal = hvLines.reduce(
                                          (sum: number, line: any) => sum + hvLineHours(line) * crRate,
                                          0
                                        );
                                        const hvHoursLegacy =
                                          Number.parseFloat(String(apiProjectData.mlds_information.financial_hv ?? 0)) || 0;
                                        const hvLegacyCredits = hvLines.length > 0 ? 0 : hvHoursLegacy * crRate;

                                        const fallbackCredits =
                                          transportTotal + operatingTotal + serviceTotal + hvLinesTotal + hvLegacyCredits;
                                        const creditsFromApiRaw = apiProjectData.mlds_information.total_financial_credits;
                                        const creditsFromApi =
                                          creditsFromApiRaw != null && creditsFromApiRaw !== ''
                                            ? Number.parseFloat(String(creditsFromApiRaw))
                                            : null;
                                        // L’agrégat API exclut souvent les lignes HV : dès qu’il y en a, on affiche le total calculé.
                                        const totalCredits =
                                          hvLines.length > 0 || creditsFromApi == null || Number.isNaN(creditsFromApi)
                                            ? fallbackCredits
                                            : creditsFromApi;
                                        return totalCredits.toFixed(2);
                                      })()} €
                                    </span>
                                  </div>
                                </div>
                              </div>
                              </div>

                              {Array.isArray(apiProjectData.mlds_information.financial_autres_financements) && apiProjectData.mlds_information.financial_autres_financements.length > 0 && (
                                <div style={{
                                  marginTop: '1rem',
                                  padding: '1rem',
                                  backgroundColor: '#fffbeb',
                                  borderRadius: '0.5rem',
                                  border: '1px solid #fcd34d'
                                }}>
                                  <div style={{ fontSize: '1rem', fontWeight: 600, color: '#92400e', marginBottom: '0.5rem' }}>Autres financements</div>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                                    {apiProjectData.mlds_information.financial_autres_financements.map((line: { autres_name?: string; price?: string }, idx: number) => (
                                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', paddingLeft: '0.5rem' }}>
                                        <span style={{ fontSize: '0.875rem', color: '#374151' }}>{line.autres_name?.trim() || '—'}</span>
                                        <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#111827' }}>
                                          {Number.parseFloat(String(line.price || '0')).toFixed(2)} €
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                  {mldsBilan && (() => {
                                    const bb = mldsBilan as Record<string, unknown>;
                                    const arr = bb.financial_autres_financements;
                                    if (!Array.isArray(arr) || arr.length === 0) return null;
                                    return (
                                      <div style={{ marginTop: '0.65rem', padding: '0.5rem 0.75rem', backgroundColor: '#f0fdf4', borderRadius: '0.375rem', borderLeft: '3px solid #16a34a' }}>
                                        <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#15803d', marginBottom: '0.35rem' }}>Bilan à la clôture — autres financements</div>
                                        {(arr as Array<{ autres_name?: string; price?: string; comment?: string | null }>).map((line, idx) => (
                                          <div key={idx} style={{ marginBottom: '0.35rem' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                                              <span>{line.autres_name || '—'}</span>
                                              <span style={{ fontWeight: 600 }}>{Number.parseFloat(String(line.price || '0')).toFixed(2)} €</span>
                                            </div>
                                            {line.comment != null && String(line.comment).trim() !== '' && (
                                              <div style={{ fontSize: '0.8125rem', color: '#6b7280', marginTop: '0.15rem', fontStyle: 'italic' }}>{String(line.comment)}</div>
                                            )}
                                          </div>
                                        ))}
                                      </div>
                                    );
                                  })()}
                                  <div style={{
                                    marginTop: '0.75rem',
                                    padding: '0.5rem 0.75rem',
                                    backgroundColor: '#fef3c7',
                                    borderRadius: '0.375rem',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center'
                                  }}>
                                    <span style={{ fontWeight: 600, color: '#92400e' }}>Total autres financements</span>
                                    <span style={{ fontWeight: 700, color: '#92400e' }}>
                                      {apiProjectData.mlds_information.financial_autres_financements.reduce(
                                        (s: number, l: { price?: string }) => s + (Number.parseFloat(String(l.price || '0')) || 0),
                                        0
                                      ).toFixed(2)} €
                                    </span>
                                  </div>
                                </div>
                              )}

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
                                  {(() => {
                                    const transportLines = Array.isArray(apiProjectData.mlds_information.financial_transport)
                                      ? apiProjectData.mlds_information.financial_transport
                                      : [];
                                    const operatingLines = Array.isArray(apiProjectData.mlds_information.financial_operating)
                                      ? apiProjectData.mlds_information.financial_operating
                                      : [];
                                    const serviceLines = getMldsServiceLinesFromMldsInfo(apiProjectData.mlds_information);
                                    const hvLinesTot = Array.isArray(apiProjectData.mlds_information.financial_hv_lines)
                                      ? apiProjectData.mlds_information.financial_hv_lines
                                      : [];
                                    const autreLines = Array.isArray(apiProjectData.mlds_information.financial_autres_financements)
                                      ? apiProjectData.mlds_information.financial_autres_financements
                                      : [];

                                    const transportTotal = transportLines.reduce((sum: number, line: any) => sum + (Number.parseFloat(line.price || '0') || 0), 0);
                                    const operatingTotal = operatingLines.reduce((sum: number, line: any) => sum + (Number.parseFloat(line.price || '0') || 0), 0);
                                    const serviceTotal = serviceLines.reduce((sum: number, line: any) => sum + (Number.parseFloat(line.price || '0') || 0), 0);
                                    const rate = Number.parseFloat(String(apiProjectData.mlds_information.financial_rate ?? HV_DEFAULT_RATE)) || HV_DEFAULT_RATE;
                                    const hvLinesSum = hvLinesTot.reduce(
                                      (sum: number, line: any) => sum + hvLineHours(line) * rate,
                                      0
                                    );
                                    const autreSum = autreLines.reduce((sum: number, line: any) => sum + (Number.parseFloat(line.price || '0') || 0), 0);

                                    const hvHours = Number.parseFloat(String(apiProjectData.mlds_information.financial_hv ?? 0)) || 0;

                                    const creditsBlock = transportTotal + operatingTotal + serviceTotal + hvLinesSum;
                                    const hvLegacyPart = hvLinesTot.length > 0 ? 0 : hvHours * rate;
                                    // HSE déclaratif — hors total général
                                    return (creditsBlock + autreSum + hvLegacyPart).toFixed(2);
                                  })()} €
                                </span>
                              </div>
                              {mldsBilan && (() => {
                                const mldsInfo = apiProjectData?.mlds_information;
                                const mldsTransportFallback = Array.isArray(mldsInfo?.financial_transport)
                                  ? mldsInfo.financial_transport.reduce((s: number, l: any) => s + (Number.parseFloat(l.price || '0') || 0), 0)
                                  : 0;
                                const mldsServiceFallback = getMldsServiceLinesFromMldsInfo(mldsInfo).reduce(
                                  (s: number, l: { price?: string | number }) => s + (Number.parseFloat(String(l.price || '0')) || 0),
                                  0
                                );
                                const mldsOperatingFallback = Array.isArray(mldsInfo?.financial_operating)
                                  ? mldsInfo.financial_operating.reduce((s: number, l: any) => s + (Number.parseFloat(l.price || '0') || 0), 0)
                                  : 0;
                                const mldsRateFallback =
                                  mldsInfo?.financial_rate != null ? Number(mldsInfo.financial_rate) : HV_DEFAULT_RATE;

                                const sumBilanMoney = (val: unknown, fallback: number): number => {
                                  if (val == null) return fallback;
                                  if (typeof val === 'number' && Number.isFinite(val)) return val;
                                  if (Array.isArray(val)) {
                                    return val.reduce(
                                      (s: number, l: { price?: unknown }) =>
                                        s + (Number.parseFloat(String((l as { price?: unknown }).price ?? '0')) || 0),
                                      0
                                    );
                                  }
                                  const n = Number(val);
                                  return Number.isFinite(n) ? n : fallback;
                                };

                                const bilanRateNum =
                                  mldsBilan.financial_rate != null ? Number(mldsBilan.financial_rate) : mldsRateFallback;
                                const rateOk = Number.isFinite(bilanRateNum) && bilanRateNum > 0 ? bilanRateNum : mldsRateFallback;

                                const bilanHvLinesUi = Array.isArray(mldsBilan.financial_hv_lines)
                                  ? (mldsBilan.financial_hv_lines as Array<{ hour?: string; price?: string }>)
                                  : [];
                                const euroHvBilan =
                                  bilanHvLinesUi.length > 0
                                    ? bilanHvLinesUi.reduce((s, l) => s + hvLineHours(l) * rateOk, 0)
                                    : mldsBilan.hv != null
                                      ? Number(mldsBilan.hv) * rateOk
                                      : 0;

                                const tr = sumBilanMoney(mldsBilan.financial_transport, mldsTransportFallback);
                                const sv = sumBilanMoney(mldsBilan.financial_service, mldsServiceFallback);
                                const op = sumBilanMoney(mldsBilan.financial_operating, mldsOperatingFallback);

                                const totalCreditsBilan = euroHvBilan + tr + sv + op;
                                const autresBilanArr = Array.isArray(
                                  (mldsBilan as { financial_autres_financements?: { price?: string }[] }).financial_autres_financements
                                )
                                  ? (mldsBilan as { financial_autres_financements: { price?: string }[] }).financial_autres_financements
                                  : [];
                                const autresBilanSum = autresBilanArr.reduce(
                                  (s, l) => s + (Number.parseFloat(String(l.price ?? '0')) || 0),
                                  0
                                );
                                const totalBilan = totalCreditsBilan + autresBilanSum;

                                if (!Number.isFinite(totalBilan)) {
                                  return null;
                                }
                                if (totalBilan === 0) {
                                  return null;
                                }

                                return (
                                  <div style={{ marginTop: '1rem', padding: '0.75rem 1rem', backgroundColor: '#f0fdf4', borderRadius: '0.5rem', borderLeft: '3px solid #16a34a' }}>
                                    <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#15803d', marginBottom: '0.5rem' }}>Bilan à la clôture</div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.9rem' }}>
                                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span style={{ color: '#374151' }}>Total des crédits</span>
                                        <span style={{ fontWeight: 700, color: '#111827' }}>{totalCreditsBilan.toFixed(2)} €</span>
                                      </div>
                                      {autresBilanSum > 0 && (
                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                          <span style={{ color: '#374151' }}>Autres financements</span>
                                          <span style={{ fontWeight: 700, color: '#111827' }}>{autresBilanSum.toFixed(2)} €</span>
                                        </div>
                                      )}
                                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span style={{ color: '#374151' }}>Total général</span>
                                        <span style={{ fontWeight: 700, color: '#111827' }}>{totalBilan.toFixed(2)} €</span>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })()}
                            </div>
                            </div>
                          </div>
                        )}

                    </div>
                  </div>
                </div>
              );
            })()}
          </>
        )}

      </div>

      {/* Modal bilan à la clôture du projet (MLDS uniquement) */}
      {isCloseProjectModalOpen && isMLDSProject && (
        <CloseProjectBilanModal
          key={project?.id ?? 'close-bilan'}
          projectTitle={project?.title ?? apiProjectData?.title ?? 'Projet'}
          mldsInfo={apiProjectData?.mlds_information ?? project?.mlds_information ?? null}
          onClose={() => !isClosingProject && setIsCloseProjectModalOpen(false)}
          onConfirm={(bilanData) => confirmCloseProject(bilanData)}
          isSubmitting={isClosingProject}
        />
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
                  onChange={(e) => setEditForm(prev => ({ ...prev, title: e.target.value }))}
                  className="form-input"
                  placeholder="Entrez le titre du projet"
                />
              </div>

              {isMLDSProject && (
                <div className="form-group">
                  <div className="form-label">
                    {((apiProjectData.mlds_information as any)?.type === 'remediation' ||
                      (apiProjectData.mlds_information as any)?.type_mlds === 'remediation')
                      ? 'Actions concernées'
                      : "Problématique du réseau à laquelle l'action répond"}{' '}
                    <span style={{ color: 'red' }}>*</span>
                  </div>
                  {((apiProjectData.mlds_information as any)?.type === 'remediation' ||
                    (apiProjectData.mlds_information as any)?.type_mlds === 'remediation') ? (
                    <div className="multi-select-container">
                      {[
                        { value: 'sas_rentree', label: 'SAS de rentrée' },
                        { value: 'sas_positionnement', label: 'SAS de positionnement' },
                        { value: 'actions_remobilisation', label: 'Actions de remobilisation' },
                        { value: 'actions_remise_niveau', label: 'Actions de remise à niveau (disciplinaire, réalisé par des enseignants)' },
                        // { value: 'securisation_parcours', label: 'Sécurisation des parcours' },
                      ].map((opt) => {
                        const selectedValues = editForm.mldsNetworkIssueAddressed
                          ? editForm.mldsNetworkIssueAddressed.split(' | ')
                          : [];
                        const checked = selectedValues.includes(opt.label);
                        return (
                          <label
                            key={opt.value}
                            className={`multi-select-item !flex items-center gap-2 ${checked ? 'selected' : ''}`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => {
                                const current = editForm.mldsNetworkIssueAddressed
                                  ? editForm.mldsNetworkIssueAddressed.split(' | ')
                                  : [];
                                const next = checked
                                  ? current.filter((v) => v !== opt.label)
                                  : [...current, opt.label];
                                setEditForm((prev) => ({
                                  ...prev,
                                  mldsNetworkIssueAddressed: next.join(' | '),
                                }));
                              }}
                            />
                            <div className="multi-select-checkmark">
                              <i className="fas fa-check"></i>
                            </div>
                            <span className="multi-select-label">{opt.label}</span>
                          </label>
                        );
                      })}
                    </div>
                  ) : (
                    <textarea
                      id="project-network-issue-addressed"
                      value={editForm.mldsNetworkIssueAddressed}
                      onChange={(e) => setEditForm(prev => ({ ...prev, mldsNetworkIssueAddressed: e.target.value }))}
                      className="form-input"
                      placeholder="S&#39;appuyer sur des données quantitatives et
qualitatives (indicateurs, besoins identifiés, freins…)"
                      rows={4}
                      required={editForm.status === 'to_process' || editForm.status === 'in_progress' || editForm.status === 'coming'}
                    />
                  )}
                </div>
              )}

              <div className="form-group">
                <label htmlFor="project-description">Description du projet</label>
                <textarea
                  id="project-description"
                  value={editForm.description}
                  onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                  className="form-textarea"
                  rows={4}
                  placeholder="Description de l'action MLDS et de ses objectifs"
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
                    onChange={(e) => setEditForm(prev => ({ ...prev, startDate: e.target.value }))}
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="project-end-date">Date de fin estimée</label>
                  <input
                    type="date"
                    id="project-end-date"
                    value={editForm.endDate}
                    onChange={(e) => setEditForm(prev => ({ ...prev, endDate: e.target.value }))}
                    className="form-input"
                  />
                </div>
              </div>

              {/* Visibilité masquée pour les projets MLDS - toujours privé. Pas de champ Statut visible (comme ProjectModal) : brouillon via le bouton dédié. */}
              {!isMLDSProject && (
                <div className="form-group">
                  <label htmlFor="project-visibility">Visibilité</label>
                  <select
                    id="project-visibility"
                    value={editForm.visibility}
                    onChange={(e) => setEditForm(prev => ({ ...prev, visibility: e.target.value as 'public' | 'private' }))}
                    className="form-input"
                  >
                    <option value="public">Projet public</option>
                    <option value="private">Projet privé</option>
                  </select>
                </div>
              )}

              {/* Parcours - même input que ProjectModal : pills + recherche + dropdown (max. 2) */}
              <div className="form-group pathway-search-form" ref={editPathwayDropdownRef}>
                <label className="form-label">Parcours * <span className="text-muted">(max. 2)</span></label>
                {isLoadingEditPathways ? (
                  <div className="loading-message pathway-loading">
                    <i className="fas fa-spinner fa-spin" />
                    <span>Chargement des parcours...</span>
                  </div>
                ) : (
                  <>
                    {(editForm.pathways || []).length > 0 && (
                      <div className="pathway-selected-pills">
                        {(editForm.pathways || []).map((name) => (
                          <span key={name} className="pathway-pill-selected">
                            {name}
                            <button type="button" className="pathway-pill-remove" onClick={() => handleEditPathwayToggle(name)} aria-label="Retirer">
                              <i className="fas fa-times" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="pathway-search-bar-wrap">
                      <i className="fas fa-search pathway-search-icon" />
                      <input
                        ref={editPathwaySearchInputRef}
                        type="text"
                        className="form-input pathway-search-input !px-8"
                        placeholder={(editForm.pathways || []).length >= 2 ? 'Maximum 2 parcours sélectionnés' : 'Rechercher un parcours...'}
                        value={editPathwaySearchTerm}
                        onChange={(e) => setEditPathwaySearchTerm(e.target.value)}
                        onFocus={() => (editForm.pathways || []).length < 2 && setEditPathwayDropdownOpen(true)}
                        onBlur={(e) => {
                          // Sur Safari, relatedTarget peut être null même lors d'un clic dans le dropdown
                          // Vérifier si un clic est en cours dans le dropdown avant de fermer
                          setTimeout(() => {
                            if (editPathwayDropdownClickInProgress.current) {
                              editPathwayDropdownClickInProgress.current = false;
                              return;
                            }
                            const activeElement = document.activeElement;
                            if (editPathwayDropdownRef.current && activeElement && editPathwayDropdownRef.current.contains(activeElement)) {
                              return;
                            }
                            setEditPathwayDropdownOpen(false);
                          }, 150);
                        }}
                      />
                      {editPathwayDropdownOpen && (editForm.pathways || []).length < 2 && (
                        <div className="pathway-dropdown">
                          {editAvailablePathways
                            .filter((p: any) => !editPathwaySearchTerm.trim() || (p.name_fr || p.name || '').toLowerCase().includes(editPathwaySearchTerm.toLowerCase()))
                            .map((pathway: any) => {
                              const pathwayName = pathway.name;
                              const isSelected = (editForm.pathways || []).includes(pathwayName);
                              return (
                                <button
                                  type="button"
                                  key={pathway.id}
                                  className={`pathway-dropdown-item ${isSelected ? 'selected' : ''}`}
                                  onMouseDown={(e) => {
                                    // Marquer qu'un clic est en cours pour empêcher le blur sur Safari
                                    editPathwayDropdownClickInProgress.current = true;
                                  }}
                                  onClick={() => {
                                    handleEditPathwayToggle(pathwayName);
                                    editPathwayDropdownClickInProgress.current = false;
                                    editPathwaySearchInputRef.current?.focus();
                                  }}
                                >
                                  {isSelected && <i className="fas fa-check pathway-item-check" />}
                                  <span>{pathway.name_fr || pathway.name}</span>
                                </button>
                              );
                            })}
                          {editAvailablePathways.filter((p: any) => !editPathwaySearchTerm.trim() || (p.name_fr || p.name || '').toLowerCase().includes(editPathwaySearchTerm.toLowerCase())).length === 0 && (
                            <div className="pathway-dropdown-empty">Aucun parcours trouvé</div>
                          )}
                        </div>
                      )}
                    </div>
                  </>
                )}
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

              {/* Organisation porteuse - sous Parcours/Tags (projets école) + popup sélection participants par classe */}
              {getOrganizationType(state.showingPageType) === 'school' && (
                <div className="form-group">
                  <div className="form-label">Ajouter une/des classe(s) au projet</div>
                  {availableSchoolLevels.length > 0 ? (
                    <>
                      <div className="multi-select-container" style={{}}>
                        {availableSchoolLevels.map(classItem => (
                          <label
                            key={classItem.id}
                            className={`multi-select-item !flex items-center gap-2 ${editForm.mldsSchoolLevelIds.includes(classItem.id.toString()) ? 'selected' : ''}`}
                          >
                            <input
                              type="checkbox"
                              checked={editForm.mldsSchoolLevelIds.includes(classItem.id.toString())}
                              onChange={() => handleEditSchoolLevelToggle(classItem.id.toString())}
                            />
                            <div className="multi-select-checkmark">
                              <i className="fas fa-check"></i>
                            </div>
                            <span className="multi-select-label">
                              {classItem.name} {classItem.level ? `- ${classItem.level}` : ''} {classItem.students_count != null ? `(${classItem.students_count} élève${classItem.students_count > 1 ? 's' : ''})` : ''}
                            </span>
                          </label>
                        ))}
                      </div>
                      {/* Pour chaque classe cochée : choix manuel / tout, puis liste ou label */}
                      {editForm.mldsSchoolLevelIds.map(classId => {
                        const classItem = availableSchoolLevels.find((l: any) => l.id?.toString() === classId);
                        const className = classItem ? `${classItem.name}${classItem.level ? ` - ${classItem.level}` : ''}` : classId;
                        const mode = editClassSelectionMode[classId];
                        const students = getEditStudentsInClass(classId);
                        return (
                          <div key={classId} className="form-group" style={{ marginTop: '12px', paddingLeft: '8px', borderLeft: '3px solid #e5e7eb' }}>
                            <div className="form-label" style={{ fontSize: '0.9rem', marginBottom: '8px' }}>{className}</div>
                            <div className="flex flex-wrap gap-2" style={{ marginBottom: '8px' }}>
                              <button
                                type="button"
                                className="btn btn-outline"
                                style={{ fontSize: '0.85rem', padding: '6px 12px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                                onClick={() => {
                                  if (mode !== 'manual') setEditClassMode(classId, 'manual');
                                  setEditClassDetailPopup({ classId, className, mode: mode === 'all' ? 'view' : 'manual' });
                                }}
                              >
                                <i className="fas fa-user-check" />
                                <span>{mode === 'manual' ? 'Modifier la sélection' : mode === 'all' ? `Voir les élèves (${students.length})` : 'Sélectionner manuellement'}</span>
                              </button>
                              <button
                                type="button"
                                className="btn btn-outline"
                                style={{ fontSize: '0.85rem', padding: '6px 12px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                                onClick={() => setEditClassMode(classId, 'all')}
                              >
                                <i className="fas fa-users" />
                                <span>Tout sélectionner</span>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </>
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

              {/* Pro: Groups (edit modal) */}
              {state.showingPageType === 'pro' && (
                <div className="form-group">
                  <div className="form-label">Ajouter un/des groupe(s) au projet</div>
                  {isLoadingEditCompanyGroups ? (
                    <div className="loading-message" style={{ padding: '12px', textAlign: 'center', color: '#6b7280' }}>
                      <i className="fas fa-spinner fa-spin" style={{ marginRight: '8px' }}></i>
                      <span>Chargement des groupes...</span>
                    </div>
                  ) : (
                    <>
                      {editAvailableCompanyGroups.length === 0 ? (
                        <div style={{ padding: '12px', textAlign: 'center', color: '#6b7280' }}>Aucun groupe disponible</div>
                      ) : (
                        <div className="multi-select-container" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                          {editAvailableCompanyGroups.map((g: any) => (
                            <label
                              key={g.id}
                              className={`multi-select-item !flex items-center gap-2 ${(editForm.groupIds || []).includes(g.id.toString()) ? 'selected' : ''}`}
                            >
                              <input
                                type="checkbox"
                                checked={(editForm.groupIds || []).includes(g.id.toString())}
                                onChange={() => handleEditGroupToggle(g.id.toString())}
                              />
                              <div className="multi-select-checkmark">
                                <i className="fas fa-check"></i>
                              </div>
                              <span className="multi-select-label">
                                {g.name} {typeof g.members_count === 'number' ? `(${g.members_count} membre${g.members_count > 1 ? 's' : ''})` : ''}
                              </span>
                            </label>
                          ))}
                        </div>
                      )}
                    </>
                  )}

                  {/* Pour chaque groupe coché : afficher un résumé + bouton "Voir les membres" */}
                  {(editForm.groupIds || []).map((groupId) => {
                    const groupItem = editAvailableCompanyGroups.find((g: any) => g.id?.toString() === groupId);
                    const groupName = groupItem?.name || groupId;
                    const cachedMembers = editGroupMembersDetailsByGroupId[groupId] || [];
                    const count =
                      typeof groupItem?.members_count === 'number'
                        ? groupItem.members_count
                        : (editGroupMembersByGroupId[groupId]?.length ?? cachedMembers.length);

                    return (
                      <div key={groupId} className="form-group" style={{ marginTop: '12px', paddingLeft: '8px', borderLeft: '3px solid #e5e7eb' }}>
                        <div className="form-label" style={{ fontSize: '0.9rem', marginBottom: '8px' }}>{groupName}</div>
                        <div className="flex flex-wrap gap-2" style={{ marginBottom: '8px' }}>
                          <button
                            type="button"
                            className="btn btn-outline"
                            style={{ fontSize: '0.85rem', padding: '6px 12px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                            onClick={async () => {
                              const companyId = getSelectedOrganizationId(state.user, state.showingPageType);
                              if (!companyId) return;
                              await ensureEditGroupMembersLoaded(companyId, groupId);
                              setEditGroupDetailPopup({ groupId, groupName });
                            }}
                          >
                            <i className="fas fa-users" />
                            <span>Voir les membres ({count || 0})</span>
                          </button>
                          <button
                            type="button"
                            className="btn btn-outline"
                            style={{ fontSize: '0.85rem', padding: '6px 12px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                            onClick={() => handleEditGroupToggle(groupId)}
                          >
                            <i className="fas fa-times" />
                            <span>Retirer</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Popup détail classe (sélection manuelle ou vue) */}
              {editClassDetailPopup && (
                <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setEditClassDetailPopup(null)}>
                  <div className="modal-content" style={{ background: 'white', borderRadius: '8px', maxWidth: '400px', width: '90%', maxHeight: '80vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
                    <div style={{ padding: '16px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '4px' }}>
                      <h3 style={{ margin: 0, fontSize: '1.1rem' }}>{editClassDetailPopup.className}</h3>
                      <button type="button" className="p-1 !px-2.5 rounded-full border border-gray-100" onClick={() => setEditClassDetailPopup(null)}>
                        <i className="fas fa-times" />
                      </button>
                    </div>
                    <div style={{ padding: '16px', overflowY: 'auto', flex: 1 }}>
                      {(() => {
                        const students = getEditStudentsInClass(editClassDetailPopup.classId);
                        if (editClassDetailPopup.mode === 'choice') {
                          return (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                              <p style={{ margin: '0 0 8px', color: '#6b7280', fontSize: '0.9rem' }}>Comment souhaitez-vous ajouter les élèves de cette classe ?</p>
                              <button
                                type="button"
                                className="btn btn-outline"
                                style={{ padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '8px' }}
                                onClick={() => {
                                  setEditClassMode(editClassDetailPopup.classId, 'manual');
                                  setEditClassDetailPopup(prev => prev ? { ...prev, mode: 'manual' as const } : null);
                                }}
                              >
                                <i className="fas fa-user-check" />
                                <span>Sélectionner manuellement</span>
                              </button>
                              <button
                                type="button"
                                className="btn btn-primary"
                                style={{ padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '8px' }}
                                onClick={() => {
                                  setEditClassMode(editClassDetailPopup.classId, 'all');
                                  openEditClassCoResponsiblesPopup(editClassDetailPopup.classId, editClassDetailPopup.className);
                                }}
                              >
                                <i className="fas fa-users" />
                                <span>Tout sélectionner</span>
                              </button>
                            </div>
                          );
                        }
                        if (students.length === 0) {
                          return <p style={{ color: '#6b7280' }}>Aucun élève dans cette classe.</p>;
                        }
                        if (editClassDetailPopup.mode === 'view') {
                          return (
                            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                              {students.map((student: any) => (
                                <li key={student.id} style={{ padding: '8px 0', borderBottom: '1px solid #f3f4f6' }}>
                                  {student.full_name || `${student.first_name || ''} ${student.last_name || ''}`.trim()}
                                </li>
                              ))}
                            </ul>
                          );
                        }
                        return (
                          <div>
                            <div style={{ marginBottom: '12px' }}>
                              <div style={{ marginBottom: '12px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                <button
                                  type="button"
                                  className="btn btn-outline"
                                  style={{ fontSize: '0.85rem', padding: '8px 12px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                                  onClick={() => {
                                    setEditClassMode(editClassDetailPopup.classId, 'all');
                                    openEditClassCoResponsiblesPopup(editClassDetailPopup.classId, editClassDetailPopup.className);
                                  }}
                                >
                                  <i className="fas fa-users" />
                                  <span>Tout sélectionner</span>
                                </button>
                                <button
                                  type="button"
                                  className="btn btn-primary"
                                  style={{ fontSize: '0.85rem', padding: '8px 12px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                                  onClick={() => {
                                    openEditClassCoResponsiblesPopup(editClassDetailPopup.classId, editClassDetailPopup.className);
                                  }}
                                >
                                  <i className="fas fa-check" />
                                  <span>Valider et continuer</span>
                                </button>
                              </div>
                            </div>
                            {students.map((student: any) => {
                              const sid = student.id?.toString();
                              const checked = (editClassManualParticipantIds[editClassDetailPopup.classId] || []).includes(sid);
                              const name = student.full_name || `${student.first_name || ''} ${student.last_name || ''}`.trim();
                              return (
                                <div
                                  key={student.id}
                                  className="selection-item"
                                  onClick={() => toggleEditClassManualParticipant(editClassDetailPopup.classId, sid)}
                                  style={{
                                    cursor: 'pointer',
                                    ...(checked
                                      ? {
                                        backgroundColor: 'rgba(85, 112, 241, 0.1)',
                                        border: '1px solid #5570F1',
                                        borderRadius: '8px',
                                        boxShadow: '0 0 0 2px rgba(85, 112, 241, 0.15)'
                                      }
                                      : {})
                                  }}
                                >
                                  <AvatarImage
                                    src={student.avatar_url || '/default-avatar.png'}
                                    alt={name}
                                    className="item-avatar"
                                  />
                                  <div className="item-info">
                                    <div className="item-name">{name}</div>
                                    <div className="item-role">{translateRole(student.role ?? student.role_in_system ?? '')}</div>
                                  </div>
                                  {checked && (
                                    <div style={{ flexShrink: 0, color: '#5570F1' }} title="Sélectionné">
                                      <i className="fas fa-check-circle" style={{ fontSize: '1.25rem' }} />
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              )}

              {/* Popup détail groupe : liste des membres (lecture seule) */}
              {editGroupDetailPopup && (
                <div
                  className="modal-overlay"
                  style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  onClick={() => setEditGroupDetailPopup(null)}
                >
                  <div
                    className="modal-content"
                    style={{ background: 'white', borderRadius: '8px', maxWidth: '420px', width: '92%', maxHeight: '80vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
                    onClick={e => e.stopPropagation()}
                  >
                    <div style={{ padding: '16px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '4px' }}>
                      <h3 style={{ margin: 0, fontSize: '1.1rem' }}>{editGroupDetailPopup.groupName}</h3>
                      <button type="button" className="p-1 !px-2.5 rounded-full border border-gray-100" onClick={() => setEditGroupDetailPopup(null)}>
                        <i className="fas fa-times" />
                      </button>
                    </div>
                    <div style={{ padding: '16px', overflowY: 'auto', flex: 1 }}>
                      {(() => {
                        const membersArr = editGroupMembersDetailsByGroupId[editGroupDetailPopup.groupId] || [];

                        if (isLoadingEditGroupMembers && membersArr.length === 0) {
                          return (
                            <div style={{ padding: '12px', textAlign: 'center', color: '#6b7280' }}>
                              <i className="fas fa-spinner fa-spin" style={{ marginRight: '8px' }}></i>
                              <span>Chargement des membres...</span>
                            </div>
                          );
                        }

                        if (membersArr.length === 0) {
                          return <p style={{ color: '#6b7280' }}>Aucun membre dans ce groupe.</p>;
                        }

                        return (
                          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                            {membersArr.map((m: any) => {
                              const name = m.full_name || `${m.first_name || ''} ${m.last_name || ''}`.trim() || m.email || 'Membre';
                              return (
                                <li key={m.id} style={{ padding: '10px 0', borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                  <AvatarImage
                                    src={m.avatar_url || m.avatarUrl || '/default-avatar.png'}
                                    alt={name}
                                    className="item-avatar"
                                  />
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 }}>
                                    <div style={{ fontWeight: 600, fontSize: '0.95rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</div>
                                    {m.email && <div style={{ color: '#6b7280', fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.email}</div>}
                                  </div>
                                </li>
                              );
                            })}
                          </ul>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              )}

              {/* Popup sélection co-responsables de classe */}
              {editClassCoResponsiblesPopup && (
                <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setEditClassCoResponsiblesPopup(null)}>
                  <div className="modal-content" style={{ background: 'white', borderRadius: '8px', maxWidth: '500px', width: '90%', maxHeight: '80vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
                    <div style={{ padding: '16px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '4px' }}>
                      <div>
                        <h3 style={{ margin: 0, fontSize: '1.1rem', marginBottom: '4px' }}>Sélectionner les co-responsables</h3>
                        <p style={{ margin: 0, fontSize: '0.875rem', color: '#6b7280' }}>{editClassCoResponsiblesPopup.className}</p>
                      </div>
                      <button type="button" className="p-1 !px-2.5 rounded-full border border-gray-100" onClick={() => setEditClassCoResponsiblesPopup(null)}>
                        <i className="fas fa-times" />
                      </button>
                    </div>
                    <div style={{ padding: '16px', overflowY: 'auto', flex: 1 }}>
                      <div className="search-input-container" style={{ marginBottom: '16px' }}>
                        <i className="fas fa-search search-icon"></i>
                        <input
                          type="text"
                          className="form-input"
                          placeholder="Rechercher un co-responsable..."
                          value={editClassCoResponsiblesSearchTerm}
                          onChange={(e) => setEditClassCoResponsiblesSearchTerm(e.target.value)}
                        />
                      </div>
                      {(() => {
                        const teachers = getFilteredEditClassCoResponsibles(editClassCoResponsiblesPopup.classId, editClassCoResponsiblesSearchTerm);
                        const selectedIds = editClassCoResponsibles[editClassCoResponsiblesPopup.classId] || [];

                        if (teachers.length === 0) {
                          return (
                            <div className="no-members-message" style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>
                              <i className="fas fa-users" style={{ fontSize: '2rem', marginBottom: '0.5rem', display: 'block' }}></i>
                              <p>{editClassCoResponsiblesSearchTerm ? 'Aucun enseignant trouvé' : 'Aucun enseignant disponible pour cette classe'}</p>
                            </div>
                          );
                        }

                        return (
                          <div className="selection-list">
                            {teachers.map((teacher: any) => {
                              const teacherId = teacher.id?.toString();
                              const isSelected = selectedIds.includes(teacherId);
                              const name = teacher.full_name || `${teacher.first_name || ''} ${teacher.last_name || ''}`.trim();
                              return (
                                <div
                                  key={teacher.id}
                                  className="selection-item"
                                  onClick={() => toggleEditClassCoResponsible(editClassCoResponsiblesPopup.classId, teacherId)}
                                  style={{
                                    cursor: 'pointer',
                                    ...(isSelected
                                      ? {
                                        backgroundColor: 'rgba(85, 112, 241, 0.1)',
                                        border: '1px solid #5570F1',
                                        borderRadius: '8px',
                                        boxShadow: '0 0 0 2px rgba(85, 112, 241, 0.15)'
                                      }
                                      : {})
                                  }}
                                >
                                  <AvatarImage
                                    src={teacher.avatar_url || '/default-avatar.png'}
                                    alt={name}
                                    className="item-avatar"
                                  />
                                  <div className="item-info">
                                    <div className="item-name">{name}</div>
                                    <div className="item-role">{translateRole(teacher.role_in_system ?? teacher.role ?? '')}</div>
                                    {teacher.email && (
                                      <div className="item-org" style={{ fontSize: '0.8rem', color: '#6b7280' }}>{teacher.email}</div>
                                    )}
                                  </div>
                                  {isSelected && (
                                    <div style={{ flexShrink: 0, color: '#5570F1' }} title="Sélectionné">
                                      <i className="fas fa-check-circle" style={{ fontSize: '1.25rem' }} />
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        );
                      })()}
                    </div>
                    <div style={{ padding: '16px', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                      <button
                        type="button"
                        className="btn btn-outline"
                        onClick={() => setEditClassCoResponsiblesPopup(null)}
                      >
                        Terminer
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Popup sélection co-responsables de partenariat */}
              {editPartnershipCoResponsiblesPopup && (
                <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setEditPartnershipCoResponsiblesPopup(null)}>
                  <div className="modal-content" style={{ background: 'white', borderRadius: '8px', maxWidth: '500px', width: '90%', maxHeight: '80vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
                    <div style={{ padding: '16px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '4px' }}>
                      <div>
                        <h3 style={{ margin: 0, fontSize: '1.1rem', marginBottom: '4px' }}>Sélectionner les co-responsables</h3>
                        <p style={{ margin: 0, fontSize: '0.875rem', color: '#6b7280' }}>{editPartnershipCoResponsiblesPopup.partnershipName}</p>
                      </div>
                      <button type="button" className="p-1 !px-2.5 rounded-full border border-gray-100" onClick={() => setEditPartnershipCoResponsiblesPopup(null)}>
                        <i className="fas fa-times" />
                      </button>
                    </div>
                    <div style={{ padding: '16px', overflowY: 'auto', flex: 1 }}>
                      <div className="search-input-container" style={{ marginBottom: '16px' }}>
                        <i className="fas fa-search search-icon"></i>
                        <input
                          type="text"
                          className="form-input"
                          placeholder="Rechercher un co-responsable..."
                          value={editPartnershipCoResponsiblesSearchTerm}
                          onChange={(e) => setEditPartnershipCoResponsiblesSearchTerm(e.target.value)}
                        />
                      </div>
                      {(() => {
                        const contactUsers = getFilteredEditPartnershipCoResponsibles(editPartnershipCoResponsiblesPopup.contactUsers, editPartnershipCoResponsiblesSearchTerm);
                        const selectedIds = editPartnershipCoResponsibles[editPartnershipCoResponsiblesPopup.partnershipId] || [];

                        if (contactUsers.length === 0) {
                          return (
                            <div className="no-members-message" style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>
                              <i className="fas fa-users" style={{ fontSize: '2rem', marginBottom: '0.5rem', display: 'block' }}></i>
                              <p>{editPartnershipCoResponsiblesSearchTerm ? 'Aucun contact trouvé' : 'Aucun contact disponible pour ce partenariat'}</p>
                            </div>
                          );
                        }

                        return (
                          <div className="selection-list">
                            {contactUsers.map((user: any) => {
                              const userId = user.id?.toString();
                              const isSelected = selectedIds.includes(userId);
                              const name = user.full_name || `${user.first_name || ''} ${user.last_name || ''}`.trim();
                              return (
                                <div
                                  key={user.id}
                                  className="selection-item"
                                  onClick={() => toggleEditPartnershipCoResponsible(editPartnershipCoResponsiblesPopup.partnershipId, userId)}
                                  style={{
                                    cursor: 'pointer',
                                    ...(isSelected
                                      ? {
                                        backgroundColor: 'rgba(85, 112, 241, 0.1)',
                                        border: '1px solid #5570F1',
                                        borderRadius: '8px',
                                        boxShadow: '0 0 0 2px rgba(85, 112, 241, 0.15)'
                                      }
                                      : {})
                                  }}
                                >
                                  <AvatarImage
                                    src={user.avatar_url || '/default-avatar.png'}
                                    alt={name}
                                    className="item-avatar"
                                  />
                                  <div className="item-info">
                                    <div className="item-name">{name}</div>
                                    <div className="item-role">{user.role_in_organization || user.role || ''}</div>
                                    {user.email && (
                                      <div className="item-org" style={{ fontSize: '0.8rem', color: '#6b7280' }}>{user.email}</div>
                                    )}
                                    {user.organization && (
                                      <div className="item-org" style={{ fontSize: '0.8rem', color: '#6b7280' }}>Organisation : {user.organization}</div>
                                    )}
                                  </div>
                                  {isSelected && (
                                    <div style={{ flexShrink: 0, color: '#5570F1' }} title="Sélectionné">
                                      <i className="fas fa-check-circle" style={{ fontSize: '1.25rem' }} />
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        );
                      })()}
                    </div>
                    <div style={{ padding: '16px', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                      <button
                        type="button"
                        className="btn btn-outline"
                        onClick={() => setEditPartnershipCoResponsiblesPopup(null)}
                      >
                        Terminer
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Participants sélectionnés (membres des classes) — envoyés en participant_ids à la sauvegarde. Si toute la classe : afficher le nom de la classe (comme ProjectModal). */}
              {getOrganizationType(state.showingPageType) === 'school' && (
                <div className="form-group">
                  <label className="form-label">Participants sélectionnés ({editForm.participants.length})</label>
                  {editForm.participants.length === 0 ? (
                    <p style={{ margin: 0, color: '#6b7280', fontSize: '0.9rem' }}>
                      Ajoutez des classes ci-dessus et choisissez « Sélectionner manuellement » ou « Tout sélectionner » pour ajouter des participants. Ils seront enregistrés avec le projet.
                    </p>
                  ) : (
                    <div className="selected-items" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {(() => {
                        const showLevelSummary = editForm.mldsSchoolLevelIds.length > 0;
                        if (showLevelSummary) {
                          const levelEntries: { type: 'level'; classId: string; className: string }[] = [];
                          const memberIdsFromAllClasses = new Set<string>();
                          editForm.mldsSchoolLevelIds.forEach(classId => {
                            const classItem = availableSchoolLevels.find((l: any) => l.id?.toString() === classId);
                            const className = classItem ? `${classItem.name}${classItem.level ? ` - ${classItem.level}` : ''}` : classId;
                            if (editClassSelectionMode[classId] === 'all') {
                              levelEntries.push({ type: 'level', classId, className });
                              getEditStudentsInClass(classId).forEach((m: any) => {
                                const id = m.id?.toString();
                                if (id) memberIdsFromAllClasses.add(id);
                              });
                            }
                          });
                          const memberEntries = editForm.participants
                            .filter(id => !memberIdsFromAllClasses.has(id.toString()))
                            .map(memberId => ({ type: 'member' as const, memberId }));
                          return (
                            <>
                              {levelEntries.map(({ classId, className }) => (
                                <div key={`level-${classId}`} className="selected-member" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 10px', background: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(85, 112, 241, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                    <i className="fas fa-users" style={{ fontSize: '1rem', color: 'var(--primary, #5570F1)' }} />
                                  </div>
                                  <div className="selected-info" style={{ flex: 1, minWidth: 0 }}>
                                    <div className="selected-name" style={{ fontWeight: 500 }}>{className}</div>
                                    <div className="selected-role" style={{ fontSize: '0.8rem', color: '#6b7280' }}>Classe entière</div>
                                  </div>
                                  <button
                                    type="button"
                                    className="remove-selection"
                                    onClick={() => handleEditSchoolLevelToggle(classId)}
                                    title="Retirer la classe"
                                  >
                                    <i className="fas fa-times"></i>
                                  </button>
                                </div>
                              ))}
                              {memberEntries.map(({ memberId }) => {
                                const member = getEditSelectedParticipant(memberId);
                                const name = member ? (member.full_name || `${member.first_name || ''} ${member.last_name || ''}`.trim()) : `ID ${memberId}`;
                                const memberOrg = member ? (typeof member.organization === 'string' ? member.organization : (member.organization?.name ?? member.classes?.[0]?.school?.name ?? '')) : '';
                                return (
                                  <div key={memberId} className="selected-member" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 10px', background: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                                    <AvatarImage
                                      src={member?.avatar_url || '/default-avatar.png'}
                                      alt={name}
                                      className="selected-avatar"
                                    />
                                    <div className="selected-info" style={{ flex: 1, minWidth: 0 }}>
                                      <div className="selected-name" style={{ fontWeight: 500 }}>{name}</div>
                                      {member && (
                                        <div className="selected-role" style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                                          {translateRole(member.role ?? member.role_in_system ?? '')}
                                          {memberOrg ? ` · ${memberOrg}` : ''}
                                        </div>
                                      )}
                                    </div>
                                    <button
                                      type="button"
                                      className="remove-selection"
                                      onClick={() => handleEditParticipantRemove(memberId)}
                                      title="Retirer des participants"
                                    >
                                      <i className="fas fa-times"></i>
                                    </button>
                                  </div>
                                );
                              })}
                            </>
                          );
                        }
                        return editForm.participants.map((memberId) => {
                          const member = getEditSelectedParticipant(memberId);
                          const name = member ? (member.full_name || `${member.first_name || ''} ${member.last_name || ''}`.trim()) : `ID ${memberId}`;
                          const memberOrg = member ? (typeof member.organization === 'string' ? member.organization : (member.organization?.name ?? member.classes?.[0]?.school?.name ?? '')) : '';
                          return (
                            <div key={memberId} className="selected-member" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 10px', background: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                              <AvatarImage
                                src={member?.avatar_url || '/default-avatar.png'}
                                alt={name}
                                className="selected-avatar"
                              />
                              <div className="selected-info" style={{ flex: 1, minWidth: 0 }}>
                                <div className="selected-name" style={{ fontWeight: 500 }}>{name}</div>
                                {member && (
                                  <div className="selected-role" style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                                    {translateRole(member.role ?? member.role_in_system ?? '')}
                                    {memberOrg ? ` · ${memberOrg}` : ''}
                                  </div>
                                )}
                              </div>
                              <button
                                type="button"
                                className="remove-selection"
                                onClick={() => handleEditParticipantRemove(memberId)}
                                title="Retirer des participants"
                              >
                                <i className="fas fa-times"></i>
                              </button>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  )}
                </div>
              )}

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
                  <div>
                    <span className="multi-select-label">Ajouter un partenaire {isMLDSProject ? 'du réseau FOQUALE présent sur Kinship  ' : '  '}</span>
                    <span className="info-tooltip-wrapper">
                      <i className="fas fa-info-circle" style={{ color: '#6b7280', fontSize: '0.875rem', cursor: 'help' }}></i>
                      <div className="info-tooltip">
                        <div style={{ fontWeight: '600', marginBottom: '8px' }}>En ajoutant un partenaire présent sur Kinship :</div>
                        <ul>
                          <li>Son Admin ou Superadmin pourra être désigné co-responsable du projet. </li>
                          <li>Il pourra co-rédiger, co-gérer et suivre le projet MLDS avec vous.</li>
                        </ul>
                      </div>
                    </span>
                  </div>
                </label>
              </div>

              {/* Partenaires - Only visible if En partenariat is checked */}
              {editForm.isPartnership && (
                <div className="form-group">
                  <label htmlFor="projectPartners">Ajouter un partenaire</label>
                  <div className="compact-selection">
                    <div className="search-input-container">
                      <i className="fas fa-search search-icon"></i>
                      <input
                        type="text"
                        className="form-input placeholder:text-sm"
                        placeholder="ex : établissements du réseau FOQUALE, DCIO, Pôle Persévérance Scolaire — Académie de Nice, autres réseaux FOQUALE (pour les projets inter-réseaux)"
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
                <label htmlFor="projectCoResponsibles" style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
                  Co-responsable(s)
                  <span className="info-tooltip-wrapper">
                    <i className="fas fa-info-circle" style={{ color: '#6b7280', fontSize: '0.875rem', cursor: 'help' }}></i>
                    <div className="info-tooltip">
                      <div style={{ fontWeight: '600', marginBottom: '8px' }}>Les co-responsables peuvent :</div>
                      <ul>
                        <li>voir le projet dans leur profil</li>
                        <li>ajouter des membres de leur organisation uniquement et modifier leur statut (sauf admin)</li>
                        <li>attribuer des badges</li>
                        <li>faire des équipes et donner des rôles dans équipe</li>
                        <li>plus tard attribuer des tâches (Kanban)</li>
                      </ul>
                    </div>
                  </span>
                </label>
                <div className="compact-selection">
                  <div className="search-input-container">
                    <i className="fas fa-search search-icon"></i>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Rechercher des co-responsables..."
                      value={editSearchTerms.co_owners}
                      onChange={(e) => handleEditSearchChange('co_owners', e.target.value)}
                      disabled={isLoadingEditMembers || isLoadingEditCoResponsibles}
                    />
                  </div>

                  {/* Display selected co-responsables above the search input */}
                  {editForm.co_owners.length > 0 && (
                    <div className="selected-items">
                      {editForm.co_owners.map((memberId) => {
                        const linkedPartnership = isCoResponsibleLinkedViaSelectedPartnership(memberId);
                        const member =
                          editCoResponsibleOptions.find((m: any) => m.id.toString() === memberId) ??
                          editAvailableMembers.find((m: any) => m.id.toString() === memberId) ??
                          (linkedPartnership
                            ? editPartnershipContactMembers.find((m: any) => m.id?.toString() === memberId)
                            : undefined) ??
                          getEditCoResponsibleMemberFallbackFromApi(memberId);
                        const memberOrg = member ? (typeof member.organization === 'string' ? member.organization : (member.organization?.name ?? '')) : '';
                        const partnershipContexts = getEditPartnershipContextLabelsForCoResponsible(memberId);
                        const addedFromApiLine = getEditCoResponsibleAddedFromApiLine(memberId);
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
                              {partnershipContexts.length > 0 && (
                                <div className="selected-org" style={{ fontSize: '0.8rem', color: '#0369a1', marginTop: '0.2rem', fontWeight: 600 }}>
                                  Co-responsable via le partenariat : {partnershipContexts.join(' · ')}
                                </div>
                              )}
                              {partnershipContexts.length === 0 && addedFromApiLine && (
                                <div className="selected-org" style={{ fontSize: '0.8rem', color: '#0369a1', marginTop: '0.2rem', fontWeight: 600 }}>
                                  Co-responsable désigné depuis : {addedFromApiLine}
                                </div>
                              )}
                              {memberOrg && (
                                <div className="selected-org" style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: '0.2rem' }}>Organisation : {toDisplayString(member.organization)}</div>
                              )}
                            </div>
                            <button
                              type="button"
                              className="remove-selection"
                              onClick={() => handleEditMemberSelect('co_owners', memberId)}
                            >
                              <i className="fas fa-times"></i>
                            </button>
                          </div>
                        ) : null;
                      })}
                    </div>
                  )}

                  {(isLoadingEditMembers || isLoadingEditCoResponsibles) ? (
                    <div className="loading-members" style={{ padding: '1rem', textAlign: 'center', color: '#6b7280' }}>
                      <i className="fas fa-spinner fa-spin" style={{ marginRight: '0.5rem' }}></i>
                      <span>Chargement des membres...</span>
                    </div>
                  ) : (
                    <div className="selection-list">
                      {getEditFilteredCoResponsibles(editSearchTerms.co_owners).length === 0 ? (
                        <div className="no-members-message" style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>
                          <i className="fas fa-users" style={{ fontSize: '2rem', marginBottom: '0.5rem', display: 'block' }}></i>
                          <p>Aucun membre disponible</p>
                        </div>
                      ) : (
                        getEditFilteredCoResponsibles(editSearchTerms.co_owners).map((member: any) => {
                          const isSelected = editForm.co_owners.includes(member.id.toString());
                          const memberOrg = typeof member.organization === 'string' ? member.organization : (member.organization?.name ?? '');
                          return (
                            <div
                              key={member.id}
                              className={`selection-item ${isSelected ? 'selected' : ''}`}
                              onClick={() => handleEditMemberSelect('co_owners', member.id.toString())}
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
                  <h3 className="form-section-title">Volet {apiProjectData.mlds_information.type_mlds === 'remediation' ? 'Remédiation' : 'Persévérance Scolaire'}</h3>

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
                            onChange={(e) => setEditForm(prev => ({ ...prev, mldsDepartment: e.target.value }))}
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
                        onChange={(e) => setEditForm(prev => ({ ...prev, mldsTargetAudience: e.target.value }))}
                        required
                      >
                        {apiProjectData.mlds_information.type_mlds === 'remediation' ? (
                          <>
                        <option value="mlds_assigned">Élèves affectés à la MLDS</option>
                        <option value="pafi_tdo">Élèves en PAFI TDO</option>
                        </>
                        ) : (
                          <>
                        <option value="students_without_solution">Élèves sans solution à la rentrée</option>
                        <option value="students_at_risk">Élèves en situation de décrochage repérés par le GPDS</option>
                        <option value="school_teams">Équipes des établissements</option>
                        </>
                        )}
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
                      onChange={(e) => setEditForm(prev => ({ ...prev, mldsExpectedParticipants: e.target.value }))}
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
                      onChange={(e) => setEditForm(prev => ({ ...prev, mldsObjectives: e.target.value }))}
                      rows={3}
                      placeholder="Décrire les objectifs de remobilisation et de persévérance scolaire..."
                    />
                  </div>

                  <div className="form-group">
                    <div className="form-label">Objectifs de l'action</div>
                    <div className="multi-select-container">
                      {(
                        ((apiProjectData.mlds_information as any)?.type === 'remediation' ||
                          (apiProjectData.mlds_information as any)?.type_mlds === 'remediation')
                          ? [
                              { value: 'professional_discovery', label: 'La découverte des filières professionnelles' },
                              { value: 'student_mobility', label: 'Le développement de la mobilité des élèves' },
                              { value: 'cps_development', label: 'Le développement des CPS pour les élèves en situation ou en risque de décrochage scolaire avéré' },
                              { value: 'territory_partnership', label: 'Le rapprochement des établissements avec les partenaires du territoire (missions locales, associations, entreprises, etc.) afin de mettre en place des parcours personnalisés (PAFI, TDO, Avenir Pro Plus, autres)' },
                              { value: 'family_links', label: 'Le renforcement des liens entre les familles et les élèves en risque ou en situation de décrochage scolaire' },
                              { value: 'professional_development', label: 'Des actions de co-développement professionnel ou d\'accompagnement d\'équipes (tutorat, intervention de chercheurs, etc.)' },
                              { value: 'art_culture_path', label: "Parcours d'éducation artistique et culturel" },
                              { value: 'avenir_path', label: 'Parcours avenir' },
                              { value: 'citizen_path', label: 'Parcours citoyen' },
                              { value: 'physical_education', label: "Apprendre par l'éducation physique et sportive" },
                              { value: 'disciplinary_course', label: 'Cours disciplinaire' },
                              { value: 'job_discovery', label: 'Découverte des métiers' },
                              { value: 'training_discovery', label: 'Découverte des formations' },
                              { value: 'other', label: 'Autre' },
                            ]
                          : [
                              { value: 'path_security', label: 'La sécurisation des parcours : liaison inter-cycles pour les élèves les plus fragiles' },
                              { value: 'professional_discovery', label: 'La découverte des filières professionnelles' },
                              { value: 'student_mobility', label: 'Le développement de la mobilité des élèves' },
                              { value: 'cps_development', label: 'Le développement des CPS pour les élèves en situation ou en risque de décrochage scolaire avéré' },
                              { value: 'territory_partnership', label: 'Le rapprochement des établissements avec les partenaires du territoire (missions locales, associations, entreprises, etc.) afin de mettre en place des parcours personnalisés (PAFI, TDO, Avenir Pro Plus, autres)' },
                              { value: 'family_links', label: 'Le renforcement des liens entre les familles et les élèves en risque ou en situation de décrochage scolaire' },
                              { value: 'professional_development', label: 'Des actions de co-développement professionnel ou d\'accompagnement d\'équipes (tutorat, intervention de chercheurs, etc.)' },
                              { value: 'other', label: 'Autre' },
                            ]
                      ).map((objective) => (
                        <label
                          key={objective.value}
                          className={`multi-select-item !flex items-center gap-2 ${editForm.mldsActionObjectives.includes(objective.value) ? 'selected' : ''}`}
                        >
                          <input
                            type="checkbox"
                            checked={editForm.mldsActionObjectives.includes(objective.value)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setEditForm(prev => ({ ...prev, mldsActionObjectives: [...prev.mldsActionObjectives, objective.value] }));
                              } else {
                                setEditForm(prev => ({ ...prev, mldsActionObjectives: prev.mldsActionObjectives.filter(v => v !== objective.value) }));
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
                          onChange={(e) => setEditForm(prev => ({ ...prev, mldsActionObjectivesOther: e.target.value }))}
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
                      onChange={(e) => setEditForm(prev => ({ ...prev, mldsCompetenciesDeveloped: e.target.value }))}
                      rows={3}
                      placeholder="Commencer par un verbe d&#39;action pour lister les compétences
développées par les participants"
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
                      border: '1px solid #e5e7eb',
                      
                    }}>
                      <div className="form-group" style={{ marginBottom: '0' }}>
                        <label htmlFor="mlds-financial-hse">HSE</label>
                        <input
                          type="number"
                          id="mlds-financial-hse"
                          name="mldsFinancialHSE"
                          className="form-input"
                          value={editForm.mldsFinancialHSE}
                          onChange={(e) => setEditForm(prev => ({ ...prev, mldsFinancialHSE: e.target.value }))}
                          placeholder="Nombre d'heures HSE"
                          min="0"
                          step="0.01"
                        />
                      </div>
                      <div className="form-group" style={{ marginBottom: '0' }}>
                        <label htmlFor="mlds-financial-rate">Taux €/h</label>
                        <input
                          type="number"
                          id="mlds-financial-rate"
                          name="mldsFinancialRate"
                          className="form-input"
                          value={editForm.mldsFinancialRate}
                          onChange={(e) => setEditForm(prev => ({ ...prev, mldsFinancialRate: e.target.value }))}
                          placeholder="Taux en €/heure"
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
                        {/* HV (crédits par enseignant) */}
                        <div className="form-group" style={{ marginBottom: '0' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <label htmlFor="mlds-financial-hv-lines">HV (crédits)</label>
                            <button
                              type="button"
                              onClick={() => addEditFinancialLine('mldsFinancialHvLines')}
                              className="btn btn-outline btn-sm"
                              style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                            >
                              <i className="fas fa-plus" style={{ marginRight: '4px' }}></i>
                              Ajouter une ligne
                            </button>
                          </div>
                          {editForm.mldsFinancialHvLines.length === 0 ? (
                            <div style={{ padding: '12px', textAlign: 'center', color: '#6b7280', fontSize: '0.875rem', backgroundColor: '#f9fafb', borderRadius: '6px' }}>
                              Aucune ligne. Saisissez les heures HV par enseignant (crédits = heures × taux horaire).
                            </div>
                          ) : (
                            editForm.mldsFinancialHvLines.map((line, index) => (
                              <div key={index} style={{ display: 'flex', gap: '8px', marginBottom: '8px', alignItems: 'center' }}>
                                <input
                                  type="text"
                                  className="form-input"
                                  value={line.teacher_name}
                                  onChange={(e) => updateEditFinancialLine('mldsFinancialHvLines', index, 'name', e.target.value)}
                                  placeholder="Nom de l'enseignant"
                                  style={{ flex: 2 }}
                                />
                                <input
                                  type="number"
                                  className="form-input"
                                  value={line.hour}
                                  onChange={(e) => updateEditFinancialLine('mldsFinancialHvLines', index, 'hour', e.target.value)}
                                  placeholder="Heures HV"
                                  min="0"
                                  step="0.01"
                                  style={{ flex: 1 }}
                                />
                                <button
                                  type="button"
                                  onClick={() => removeEditFinancialLine('mldsFinancialHvLines', index)}
                                  className="btn btn-outline btn-sm"
                                  style={{ padding: '8px 12px', color: '#dc2626' }}
                                >
                                  <i className="fas fa-trash"></i>
                                </button>
                              </div>
                            ))
                          )}
                        </div>

                        {/* Frais de transport */}
                        <div className="form-group" style={{ marginBottom: '0' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <label htmlFor="mlds-financial-transport">Frais de transport</label>
                            <button
                              type="button"
                              onClick={() => addEditFinancialLine('mldsFinancialTransport')}
                              className="btn btn-outline btn-sm"
                              style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                            >
                              <i className="fas fa-plus" style={{ marginRight: '4px' }}></i>
                              Ajouter une ligne
                            </button>
                          </div>
                          {editForm.mldsFinancialTransport.length === 0 ? (
                            <div style={{ padding: '12px', textAlign: 'center', color: '#6b7280', fontSize: '0.875rem', backgroundColor: '#f9fafb', borderRadius: '6px' }}>
                              Aucune ligne. Cliquez sur "Ajouter une ligne" pour commencer.
                            </div>
                          ) : (
                            editForm.mldsFinancialTransport.map((line, index) => (
                              <div key={index} style={{ display: 'flex', gap: '8px', marginBottom: '8px', alignItems: 'center' }}>
                                <input
                                  type="text"
                                  className="form-input"
                                  value={line.transport_name}
                                  onChange={(e) => updateEditFinancialLine('mldsFinancialTransport', index, 'name', e.target.value)}
                                  placeholder="Nom du transport"
                                  style={{ flex: 2 }}
                                />
                                <input
                                  type="number"
                                  className="form-input"
                                  value={line.price}
                                  onChange={(e) => updateEditFinancialLine('mldsFinancialTransport', index, 'price', e.target.value)}
                                  placeholder="Prix en €"
                                  min="0"
                                  step="0.01"
                                  style={{ flex: 1 }}
                                />
                                <button
                                  type="button"
                                  onClick={() => removeEditFinancialLine('mldsFinancialTransport', index)}
                                  className="btn btn-outline btn-sm"
                                  style={{ padding: '8px 12px', color: '#dc2626' }}
                                >
                                  <i className="fas fa-trash"></i>
                                </button>
                              </div>
                            ))
                          )}
                        </div>

                        {/* Frais de fonctionnement */}
                        <div className="form-group" style={{ marginBottom: '0' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <label htmlFor="mlds-financial-operating">Frais de fonctionnement</label>
                            <button
                              type="button"
                              onClick={() => addEditFinancialLine('mldsFinancialOperating')}
                              className="btn btn-outline btn-sm"
                              style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                            >
                              <i className="fas fa-plus" style={{ marginRight: '4px' }}></i>
                              Ajouter une ligne
                            </button>
                          </div>
                          {editForm.mldsFinancialOperating.length === 0 ? (
                            <div style={{ padding: '12px', textAlign: 'center', color: '#6b7280', fontSize: '0.875rem', backgroundColor: '#f9fafb', borderRadius: '6px' }}>
                              Aucune ligne. Cliquez sur "Ajouter une ligne" pour commencer.
                            </div>
                          ) : (
                            editForm.mldsFinancialOperating.map((line, index) => (
                              <div key={index} style={{ display: 'flex', gap: '8px', marginBottom: '8px', alignItems: 'center' }}>
                                <input
                                  type="text"
                                  className="form-input"
                                  value={line.operating_name}
                                  onChange={(e) => updateEditFinancialLine('mldsFinancialOperating', index, 'name', e.target.value)}
                                  placeholder="Nom du fonctionnement"
                                  style={{ flex: 2 }}
                                />
                                <input
                                  type="number"
                                  className="form-input"
                                  value={line.price}
                                  onChange={(e) => updateEditFinancialLine('mldsFinancialOperating', index, 'price', e.target.value)}
                                  placeholder="Prix en €"
                                  min="0"
                                  step="0.01"
                                  style={{ flex: 1 }}
                                />
                                <button
                                  type="button"
                                  onClick={() => removeEditFinancialLine('mldsFinancialOperating', index)}
                                  className="btn btn-outline btn-sm"
                                  style={{ padding: '8px 12px', color: '#dc2626' }}
                                >
                                  <i className="fas fa-trash"></i>
                                </button>
                              </div>
                            ))
                          )}
                        </div>

                        {/* Prestataires de service */}
                        <div className="form-group" style={{ marginBottom: '0' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <label htmlFor="mlds-financial-service">Prestataires de service</label>
                            <button
                              type="button"
                              onClick={() => addEditFinancialLine('mldsFinancialService')}
                              className="btn btn-outline btn-sm"
                              style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                            >
                              <i className="fas fa-plus" style={{ marginRight: '4px' }}></i>
                              Ajouter une ligne
                            </button>
                          </div>
                          <p style={{ fontSize: '0.8rem', color: '#6b7280', margin: '0 0 4px 0' }}>
                            Joindre un devis par prestataire : au plus {MAX_SERVICE_QUOTE_FILES} fichiers au total, 1 Mo chacun (PDF, Word, image…).
                          </p>
                          <p style={{ fontSize: '0.8rem', color: '#0369a1', margin: '0 0 8px 0', fontWeight: 600 }}>
                            Devis joints : {countServiceQuoteFiles(editServiceQuoteFiles)} / {MAX_SERVICE_QUOTE_FILES}
                          </p>
                          {editForm.mldsFinancialService.length === 0 ? (
                            <div style={{ padding: '12px', textAlign: 'center', color: '#6b7280', fontSize: '0.875rem', backgroundColor: '#f9fafb', borderRadius: '6px' }}>
                              Aucune ligne. Cliquez sur &quot;Ajouter une ligne&quot; pour commencer.
                            </div>
                          ) : (
                            editForm.mldsFinancialService.map((line, index) => (
                              <div
                                key={index}
                                style={{
                                  marginBottom: '10px',
                                  padding: '10px',
                                  border: '1px solid #e5e7eb',
                                  borderRadius: '8px',
                                  background: '#fff'
                                }}
                              >
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
                                  <input
                                    type="text"
                                    className="form-input"
                                    value={line.service_name}
                                    onChange={(e) => updateEditFinancialLine('mldsFinancialService', index, 'name', e.target.value)}
                                    placeholder="Nom du prestataire / service"
                                    style={{ minWidth: '160px', flex: '2 1 160px' }}
                                  />
                                  <input
                                    type="number"
                                    className="form-input"
                                    value={line.hours}
                                    onChange={(e) => updateEditFinancialLine('mldsFinancialService', index, 'hours', e.target.value)}
                                    placeholder="Heures (h)"
                                    min="0"
                                    step="0.01"
                                    style={{ width: '110px' }}
                                  />
                                  <input
                                    type="number"
                                    className="form-input"
                                    value={line.price}
                                    onChange={(e) => updateEditFinancialLine('mldsFinancialService', index, 'price', e.target.value)}
                                    placeholder="Montant (€)"
                                    min="0"
                                    step="0.01"
                                    style={{ width: '120px' }}
                                  />
                                  <span style={{ fontSize: '0.8125rem', color: '#374151', fontWeight: 600, minWidth: '88px' }} title="Taux horaire = montant ÷ heures">
                                    {computedEditServiceHourlyRate(line)}
                                  </span>
                                  {(() => {
                                    const qCount = countServiceQuoteFiles(editServiceQuoteFiles);
                                    const hasThis = editServiceQuoteFiles[index] != null;
                                    const canPickMore = qCount < MAX_SERVICE_QUOTE_FILES || hasThis;
                                    return canPickMore ? (
                                  <label className="btn btn-outline btn-sm" style={{ cursor: 'pointer', marginBottom: 0 }}>
                                    <i className="fas fa-paperclip" style={{ marginRight: '6px' }} aria-hidden />
                                    Joindre un devis
                                    <input
                                      type="file"
                                      style={{ display: 'none' }}
                                      accept=".pdf,.doc,.docx,.xls,.xlsx,image/*"
                                      onChange={(e) => {
                                        const f = e.target.files?.[0];
                                        if (!f) return;
                                        const check = validateServiceQuoteSelection(f, editServiceQuoteFiles, index);
                                        if (!check.ok) {
                                          showError(check.message);
                                          e.target.value = '';
                                          return;
                                        }
                                        setEditServiceQuoteFiles(prev => {
                                          const next = [...prev];
                                          while (next.length <= index) next.push(null);
                                          next[index] = f;
                                          return next;
                                        });
                                        e.target.value = '';
                                      }}
                                    />
                                  </label>
                                    ) : (
                                      <span style={{ fontSize: '0.75rem', color: '#9ca3af' }} title={`Maximum ${MAX_SERVICE_QUOTE_FILES} devis`}>
                                        Quota atteint ({MAX_SERVICE_QUOTE_FILES}/{MAX_SERVICE_QUOTE_FILES})
                                      </span>
                                    );
                                  })()}
                                  {editServiceQuoteFiles[index] && (
                                    <span style={{ fontSize: '0.75rem', color: '#059669', maxWidth: '160px', display: 'inline-flex', alignItems: 'center', gap: '6px' }} className="truncate">
                                      <span className="truncate" title={editServiceQuoteFiles[index]!.name}>{editServiceQuoteFiles[index]!.name}</span>
                                      <button
                                        type="button"
                                        className="btn btn-outline btn-sm"
                                        style={{ padding: '2px 6px', fontSize: '0.7rem', flexShrink: 0 }}
                                        onClick={() => {
                                          setEditServiceQuoteFiles(prev => {
                                            const next = [...prev];
                                            while (next.length <= index) next.push(null);
                                            next[index] = null;
                                            return next;
                                          });
                                        }}
                                      >
                                        Retirer
                                      </button>
                                    </span>
                                  )}
                                  {!editServiceQuoteFiles[index] && line.quote_url && (
                                    <a href={line.quote_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.75rem' }}>
                                      Devis enregistré
                                    </a>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => removeEditFinancialLine('mldsFinancialService', index)}
                                    className="btn btn-outline btn-sm"
                                    style={{ padding: '8px 12px', color: '#dc2626', marginLeft: 'auto' }}
                                  >
                                    <i className="fas fa-trash"></i>
                                  </button>
                                </div>
                                <input
                                  type="text"
                                  className="form-input"
                                  value={line.comment}
                                  onChange={(e) => updateEditFinancialLine('mldsFinancialService', index, 'comment', e.target.value)}
                                  placeholder="Commentaire (optionnel)"
                                  style={{ width: '100%', marginTop: '8px' }}
                                />
                              </div>
                            ))
                          )}
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
                            calculateHvLinesTotal(
                              editForm.mldsFinancialHvLines,
                              Number.parseFloat(editForm.mldsFinancialRate) || HV_DEFAULT_RATE
                            ) +
                            calculateFinancialLinesTotal(editForm.mldsFinancialTransport) +
                            calculateFinancialLinesTotal(editForm.mldsFinancialOperating) +
                            calculateFinancialLinesTotal(editForm.mldsFinancialService)

                          ).toFixed(2)} €
                        </span>
                      </div>
                    </div>

                    <div style={{
                      marginTop: '12px',
                      padding: '16px',
                      background: '#f9fafb',
                      borderRadius: '8px',
                      border: '1px solid #e5e7eb'
                    }}>
                      <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: '#374151', margin: '0 0 8px 0' }}>Autres financements</h4>
                      <p style={{ fontSize: '0.8rem', color: '#6b7280', margin: '0 0 12px 0' }}>
                        Non inclus dans le total Crédits. S&apos;ajoutent au total général.
                      </p>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>Lignes</span>
                        <button
                          type="button"
                          onClick={() => addEditFinancialLine('mldsFinancialAutres')}
                          className="btn btn-outline btn-sm"
                          style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                        >
                          <i className="fas fa-plus" style={{ marginRight: '4px' }}></i>
                          Ajouter une ligne
                        </button>
                      </div>
                      {editForm.mldsFinancialAutres.length === 0 ? (
                        <div style={{ padding: '12px', textAlign: 'center', color: '#6b7280', fontSize: '0.875rem', border: '1px dashed #d1d5db', borderRadius: '6px' }}>
                          Aucune ligne
                        </div>
                      ) : (
                        editForm.mldsFinancialAutres.map((line, index) => (
                          <div key={index} style={{ display: 'flex', gap: '8px', marginBottom: '8px', alignItems: 'center' }}>
                            <input
                              type="text"
                              className="form-input"
                              value={line.autres_name}
                              onChange={(e) => updateEditFinancialLine('mldsFinancialAutres', index, 'name', e.target.value)}
                              placeholder="Libellé"
                              style={{ flex: 2 }}
                            />
                            <input
                              type="number"
                              className="form-input"
                              value={line.price}
                              onChange={(e) => updateEditFinancialLine('mldsFinancialAutres', index, 'price', e.target.value)}
                              placeholder="Montant (€)"
                              min="0"
                              step="0.01"
                              style={{ flex: 1 }}
                            />
                            <button
                              type="button"
                              onClick={() => removeEditFinancialLine('mldsFinancialAutres', index)}
                              className="btn btn-outline btn-sm"
                              style={{ padding: '8px 12px', color: '#dc2626' }}
                            >
                              <i className="fas fa-trash"></i>
                            </button>
                          </div>
                        ))
                      )}
                      <div style={{
                        marginTop: '12px',
                        padding: '10px',
                        background: '#fef3c7',
                        borderRadius: '6px',
                        border: '1px solid #fcd34d',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}>
                        <span style={{ fontWeight: 600, color: '#92400e' }}>Total autres financements :</span>
                        <span style={{ fontSize: '1.1rem', fontWeight: 700, color: '#92400e' }}>
                          {calculateAutresFinancementTotal(editForm.mldsFinancialAutres).toFixed(2)} €
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
                        {(() => {
                          const tc =
                            calculateHvLinesTotal(
                              editForm.mldsFinancialHvLines,
                              Number.parseFloat(editForm.mldsFinancialRate) || HV_DEFAULT_RATE
                            ) +
                            calculateFinancialLinesTotal(editForm.mldsFinancialTransport) +
                            calculateFinancialLinesTotal(editForm.mldsFinancialOperating) +
                            calculateFinancialLinesTotal(editForm.mldsFinancialService);
                          const ta = calculateAutresFinancementTotal(editForm.mldsFinancialAutres);
                          return (tc + ta).toFixed(2);
                        })()} €
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="modal-footer flex !flex-wrap gap-2 justify-center flex-1">
              <button className="btn btn-outline" onClick={handleCancelEdit}>
                Annuler
              </button>
              {editForm.status === 'draft' && (
                <button className="btn btn-outline" onClick={handleSaveEditDraft}>
                  Sauvegarder en brouillon
                </button>
              )}
              <button className="btn btn-primary" onClick={handleSaveEdit}>
                {isMLDSProject && (state.showingPageType === 'teacher' || state.user?.role === 'teacher')
                  ? 'Soumettre le projet MLDS'
                  : 'Publier'}
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
            const orgs: Array<{ id: number; name: string; type: 'School' | 'Company'; role?: string }> = [];
            const contexts = userProjectMember.user.available_contexts;
            const badgeRoles = ['superadmin', 'admin', 'referent', 'référent', 'intervenant'];

            if (contexts.schools) {
              contexts.schools.forEach((school: any) => {
                if (badgeRoles.includes(school.role?.toLowerCase() || '')) {
                  orgs.push({ id: school.id, name: school.name || 'École', type: 'School', role: school.role });
                }
              });
            }

            if (contexts.companies) {
              contexts.companies.forEach((company: any) => {
                if (badgeRoles.includes(company.role?.toLowerCase() || '')) {
                  orgs.push({ id: company.id, name: company.name || 'Organisation', type: 'Company', role: company.role });
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
              {!isProjectEnded && !isReadOnlyMode && (
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

      <ShareProjectLinkModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        token={shareToken}
      />
    </section>
  );
};

export default ProjectManagement;