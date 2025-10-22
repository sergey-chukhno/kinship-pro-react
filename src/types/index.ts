// Type definitions for the Kinship Dashboard

export interface Member {
  id: string;
  firstName: string;
  lastName: string;
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
  pathway: string;
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
  } | null;
  coResponsibles?: {
    id: string;
    name: string;
    avatar: string;
    profession: string;
    organization: string;
    email: string;
  }[];
  partner?: {
    id: string;
    name: string;
    logo: string;
    organization: string;
  } | null;
}

export interface Event {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  duration: number;
  type: 'meeting' | 'workshop' | 'training' | 'celebration' | 'other';
  location: string;
  participants: string[];
  image?: string;
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

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar: string;
  organization?: string;
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

export type PageType = 'dashboard' | 'members' | 'events' | 'projects' | 'badges' | 'analytics' | 'network' | 'notifications' | 'settings' | 'membership-requests' | 'project-management';

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
}
