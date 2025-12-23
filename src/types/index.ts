// Type definitions for the Kinship Dashboard

export interface Member {
  id: string;
  firstName: string;
  lastName: string;
  fullName?: string;
  email: string;
  profession: string;
  roles: string[];
  skills: string[];
  availability: string[];
  avatar: string;
  isTrusted: boolean;
  badges: string[]; // Array of badge IDs
  organization?: string;
  canProposeStage?: boolean;
  canProposeAtelier?: boolean;
  take_trainee?: boolean; // Indique si l'utilisateur accepte des stagiaires
  propose_workshop?: boolean; // Indique si l'utilisateur propose des ateliers
  claim_token?: string; // Token for student QR code
  hasTemporaryEmail?: boolean; // Indicates if email is temporary
  birthday?: string; // Date de naissance
  role?: string; // Rôle unique (pour les étudiants)
  levelId?: string; // ID de la classe/level
  roleAdditionalInfo?: string; // Information complémentaire sur le rôle
  commonOrganizations?: {
    schools: Array<{ id: number; name: string; type: string }>;
    companies: Array<{ id: number; name: string; type: string }>;
  }; // Organisations communes avec l'utilisateur actuel
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  level: string;
  levelClass: string;
  icon: string;
  image: string;
  category: string;
  series: string;
  recipients: number;
  created: string;
  domains: string[];
  expertises: string[];
  recipients_list: BadgeRecipient[];
  files: BadgeFile[];
  requirements: string[];
  skills: string[];
}

export interface BadgeRecipient {
  name: string;
  avatar: string;
  date: string;
}

export interface BadgeFile {
  name: string;
  type: string;
  size: string;
}

export interface BadgeAttribution {
  id: string;
  badgeId: string;
  badgeTitle: string;
  badgeSeries: string;
  badgeLevel: string;
  badgeImage: string;
  participantId: string;
  participantName: string;
  participantAvatar: string;
  participantOrganization: string;
  attributedBy: string;
  attributedByName: string;
  attributedByAvatar: string;
  attributedByOrganization: string;
  projectId: string;
  projectTitle: string;
  domaineEngagement: string;
  commentaire?: string;
  preuve?: {
    name: string;
    type: string;
    size: string;
  };
  dateAttribution: string;
}

export interface Project {
  id: string;
  title: string;
  description: string;
  status: 'coming' | 'in_progress' | 'ended';
  visibility?: 'public' | 'private';
  pathway?: string;
  organization: string;
  owner: string;
  participants: number;
  badges: number;
  startDate: string;
  endDate: string;
  image?: string;
  additionalPhotos?: string[];
  tags: string[];
  links?: string;
  progress: number;
  members: string[];
  events: string[];
  badges_list: string[];
  // Project management fields
  responsible?: {
    id: string;
    name: string;
    avatar: string;
    profession: string;
    organization: string;
    email: string;
    role?: string; // Role in organization (superadmin, admin, référant, intervenant, membre)
    city?: string; // City of the organization
  } | null;
  coResponsibles?: {
    id: string;
    name: string;
    avatar: string;
    profession: string;
    organization: string;
    email: string;
    role?: string; // Role in organization (superadmin, admin, référant, intervenant, membre)
    city?: string; // City of the organization
  }[];
  partner?: {
    id: string;
    name: string;
    logo: string;
    organization: string;
  } | null;
}

export interface EventParticipant {
  id: string | number;
  email: string;
  first_name: string;
  last_name: string;
  claim_token?: string | null;
  has_event_badges?: boolean;
  received_badge_ids?: string[];
}

export interface Event {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  duration: number;
  type: 'meeting' | 'workshop' | 'training' | 'celebration' | 'session' | 'other';
  location: string;
  participants: EventParticipant[] | string[]; // Can be array of IDs (string) or full participant objects
  image?: string;
  badges?: string[]; // Array of badge IDs
  status: 'upcoming' | 'ongoing' | 'completed' | 'cancelled';
  projectId: string;
  createdBy: string;
  createdAt: string;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'event' | 'project' | 'badge' | 'system';
  date: string;
  isRead: boolean;
  sender?: string;
  relatedItem?: string;
}

export interface MembershipRequest {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  profession: string;
  skills: string[];
  availability: string[];
  avatar: string;
  requestedDate: string;
  status: 'pending' | 'accepted' | 'rejected';
  assignedRole: string;
}

export interface OrganizationContext {
  id: number;
  name: string;
  city: string;
  school_type?: string;
  company_type?: string;
  role: 'superadmin' | 'admin' | 'referent' | 'intervenant' | 'member';
  permissions: {
    superadmin: boolean;
    admin: boolean;
    referent: boolean;
    intervenant: boolean;
    can_manage_members: boolean;
    can_manage_projects: boolean;
    can_assign_badges: boolean;
    can_manage_partnerships: boolean;
    can_manage_branches: boolean;
  };
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar: string;
  organization?: string;
  available_contexts?: {
    companies?: OrganizationContext[];
    schools?: OrganizationContext[];
    teacher_dashboard?: boolean;
    user_dashboard?: boolean;
    independent_teacher?: object | null;
  };
}

export interface FilterOptions {
  pathway?: string;
  dateRange?: {
    start: string;
    end: string;
  };
  status?: string;
  series?: string;
  project?: string;
  level?: string;
}

export interface DashboardStats {
  totalMembers: number;
  activeProjects: number;
  badgesAwarded: number;
  upcomingEvents: number;
}

export interface OrganizationStatsOverview {
  total_members: number;
  total_teachers: number;
  total_students: number;
  total_levels: number;
  total_projects: number;
  active_contract: boolean;
  is_branch: boolean;
  is_main_school: boolean;
}

export interface MembersByRoleStats {
  superadmin?: number;
  admin?: number;
  referent?: number;
  intervenant?: number;
  member?: number;
  [role: string]: number | undefined;
}

export interface PendingApprovalsStats {
  members?: number;
  partnerships?: number;
  branch_requests?: number;
  [key: string]: number | undefined;
}

export interface BranchesStats {
  total_branches?: number;
  branch_members?: number;
  branch_projects?: number;
  [key: string]: number | undefined;
}

export interface OrganizationStatsResponse {
  overview?: Partial<OrganizationStatsOverview>;
  members_by_role?: MembersByRoleStats;
  pending_approvals?: PendingApprovalsStats;
  branches?: BranchesStats;
}

export type PageType = 'dashboard' | 'members' | 'events' | 'projects' | 'badges' | 'analytics' | 'network' | 'notifications' | 'settings' | 'membership-requests' | 'project-management' | 'Auth';

export type ShowingPageType = 'pro' | 'edu' | 'teacher' | 'user';

export interface AppState {
  showingPageType: ShowingPageType;
  currentPage: PageType;
  user: User;
  members: Member[];
  projects: Project[];
  events: Event[];
  badges: Badge[];
  notifications: Notification[];
  membershipRequests: MembershipRequest[];
  badgeAttributions: BadgeAttribution[];
  filters: FilterOptions;
  theme: 'light' | 'dark';
  selectedProject: Project | null;
  tags: Tag[];
  partnerships: Partnership[];
}

export interface OrganizationList {
  id: string;
  name: string;
  isAdmin: boolean;
}

export interface ClassTeacher {
  id: number;
  full_name: string;
  email: string;
  is_creator: boolean;
  assigned_at: string;
}

// Badge API Types (for backend API responses)
export interface BadgeAPI {
  id: number;
  name: string;
  description: string;
  level: 'level_1' | 'level_2' | 'level_3' | 'level_4';
  series: string;
  domains: BadgeSkillAPI[];
  expertises: BadgeSkillAPI[];
  image_url?: string; // Optional image URL from backend (if provided)
}

export interface BadgeSkillAPI {
  id: number;
  name: string;
  category: 'domain' | 'expertise';
}

export interface BadgeAssignmentResponse {
  message: string;
  assigned_count: number;
  project: {
    id: number;
    title: string;
  };
  organization: {
    id: number;
    name: string;
    type: string;
  };
  assignments: Array<{
    user_id: number;
    user_name: string;
    badge_id: number;
    badge_name: string;
    status: string;
    user_badge_id: number;
  }>;
  errors?: string[];
}

export interface ClassList {
  id: string;
  name: string;
  level?: string;
  teacher?: string;
  students_count?: number;
  teachers_count?: number;
  teachers?: ClassTeacher[];
  teacher_ids?: number[];
  school_id?: number | null;
}

export interface Tag {
  id: number;
  name: string;
  name_fr?: string;
}

export interface Partnership {
  id: number;
  name: string;
  status: string;
  organizations: Array<{ id: number; name: string; type: string }>;
}