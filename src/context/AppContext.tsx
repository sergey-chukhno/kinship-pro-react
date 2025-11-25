import React, { createContext, ReactNode, useContext, useReducer } from 'react';
import { mockBadges, mockEvents, mockMembers, mockMembershipRequests, mockNotifications, mockProjects } from '../data/mockData';
import { AppState, Badge, BadgeAttribution, Event, FilterOptions, Member, PageType, Project, ShowingPageType } from '../types';

interface AppContextType {
  state: AppState;
  setShowingPageType: (ShowingPageType: ShowingPageType) => void;
  setCurrentPage: (page: PageType) => void;
  setTheme: (theme: 'light' | 'dark') => void;
  setFilters: (filters: FilterOptions) => void;
  setSelectedProject: (project: Project | null) => void;
  addMember: (member: Member) => void;
  updateMember: (id: string, updates: Partial<Member>) => void;
  deleteMember: (id: string) => void;
  addProject: (project: Project) => void;
  updateProject: (id: string, updates: Partial<Project>) => void;
  deleteProject: (id: string) => void;
  addEvent: (event: Event) => void;
  updateEvent: (id: string, updates: Partial<Event>) => void;
  deleteEvent: (id: string) => void;
  addBadge: (badge: Badge) => void;
  updateBadge: (id: string, updates: Partial<Badge>) => void;
  deleteBadge: (id: string) => void;
  markNotificationAsRead: (id: string) => void;
  acceptMembershipRequest: (id: string) => void;
  rejectMembershipRequest: (id: string) => void;
  updateMembershipRequestRole: (id: string, role: string) => void;
  addBadgeAttribution: (attribution: BadgeAttribution) => void;
  clearFilters: () => void;
}

type AppAction =
  | { type: 'SET_SHOWING_PAGE_TYPE'; payload: ShowingPageType }
  | { type: 'SET_CURRENT_PAGE'; payload: PageType }
  | { type: 'SET_THEME'; payload: 'light' | 'dark' }
  | { type: 'SET_FILTERS'; payload: FilterOptions }
  | { type: 'SET_SELECTED_PROJECT'; payload: Project | null }
  | { type: 'ADD_MEMBER'; payload: Member }
  | { type: 'UPDATE_MEMBER'; payload: { id: string; updates: Partial<Member> } }
  | { type: 'DELETE_MEMBER'; payload: string }
  | { type: 'ADD_PROJECT'; payload: Project }
  | { type: 'UPDATE_PROJECT'; payload: { id: string; updates: Partial<Project> } }
  | { type: 'DELETE_PROJECT'; payload: string }
  | { type: 'ADD_EVENT'; payload: Event }
  | { type: 'UPDATE_EVENT'; payload: { id: string; updates: Partial<Event> } }
  | { type: 'DELETE_EVENT'; payload: string }
  | { type: 'ADD_BADGE'; payload: Badge }
  | { type: 'UPDATE_BADGE'; payload: { id: string; updates: Partial<Badge> } }
  | { type: 'DELETE_BADGE'; payload: string }
  | { type: 'MARK_NOTIFICATION_READ'; payload: string }
  | { type: 'ACCEPT_MEMBERSHIP_REQUEST'; payload: string }
  | { type: 'REJECT_MEMBERSHIP_REQUEST'; payload: string }
  | { type: 'UPDATE_MEMBERSHIP_REQUEST_ROLE'; payload: { id: string; role: string } }
  | { type: 'ADD_BADGE_ATTRIBUTION'; payload: BadgeAttribution }
  | { type: 'CLEAR_FILTERS' };

const initialState: AppState = {
  showingPageType: 'pro', // Valeur par défaut mais sera overridée avant l'affichage
  // currentPage: 'dashboard',
  currentPage: 'Auth',
  user: {
    id: '1',
    name: 'Patrick Saoula',
    email: 'admin@kinshipedu.fr',
    role: 'Admin',
    avatar: '/patrick.webp',
    organization: 'TouKouLeur'
  },
  members: mockMembers,
  projects: mockProjects,
  events: mockEvents,
  badges: mockBadges,
  notifications: mockNotifications,
  membershipRequests: mockMembershipRequests,
  badgeAttributions: [],
  filters: {},
  theme: 'light',
  selectedProject: null
};

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_SHOWING_PAGE_TYPE':
      if (['pro', 'edu', 'teacher', 'user'].includes(action.payload)) {
        return { ...state, showingPageType: action.payload };
      }
      return state;

    case 'SET_CURRENT_PAGE':
      return { ...state, currentPage: action.payload };
    
    case 'SET_THEME':
      return { ...state, theme: action.payload };
    
    case 'SET_FILTERS':
      return { ...state, filters: action.payload };
    
    case 'SET_SELECTED_PROJECT':
      return { ...state, selectedProject: action.payload };
    
    case 'ADD_MEMBER':
      return { ...state, members: [...state.members, action.payload] };
    
    case 'UPDATE_MEMBER':
      return {
        ...state,
        members: state.members.map(member =>
          member.id === action.payload.id
            ? { ...member, ...action.payload.updates }
            : member
        )
      };
    
    case 'DELETE_MEMBER':
      return {
        ...state,
        members: state.members.filter(member => member.id !== action.payload)
      };
    
    case 'ADD_PROJECT':
      return { ...state, projects: [...state.projects, action.payload] };
    
    case 'UPDATE_PROJECT':
      return {
        ...state,
        projects: state.projects.map(project =>
          project.id === action.payload.id
            ? { ...project, ...action.payload.updates }
            : project
        )
      };
    
    case 'DELETE_PROJECT':
      return {
        ...state,
        projects: state.projects.filter(project => project.id !== action.payload)
      };
    
    case 'ADD_EVENT':
      return { ...state, events: [...state.events, action.payload] };
    
    case 'UPDATE_EVENT':
      return {
        ...state,
        events: state.events.map(event =>
          event.id === action.payload.id
            ? { ...event, ...action.payload.updates }
            : event
        )
      };
    
    case 'DELETE_EVENT':
      return {
        ...state,
        events: state.events.filter(event => event.id !== action.payload)
      };
    
    case 'ADD_BADGE':
      return { ...state, badges: [...state.badges, action.payload] };
    
    case 'UPDATE_BADGE':
      return {
        ...state,
        badges: state.badges.map(badge =>
          badge.id === action.payload.id
            ? { ...badge, ...action.payload.updates }
            : badge
        )
      };
    
    case 'DELETE_BADGE':
      return {
        ...state,
        badges: state.badges.filter(badge => badge.id !== action.payload)
      };
    
    case 'MARK_NOTIFICATION_READ':
      return {
        ...state,
        notifications: state.notifications.map(notification =>
          notification.id === action.payload
            ? { ...notification, read: true }
            : notification
        )
      };
    
    case 'ACCEPT_MEMBERSHIP_REQUEST':
      const requestToAccept = state.membershipRequests.find(req => req.id === action.payload);
      if (requestToAccept) {
        const newMember: Member = {
          id: `member-${Date.now()}`,
          firstName: requestToAccept.firstName,
          lastName: requestToAccept.lastName,
          email: requestToAccept.email,
          profession: requestToAccept.profession,
          roles: [requestToAccept.assignedRole],
          skills: requestToAccept.skills,
          availability: requestToAccept.availability,
          avatar: requestToAccept.avatar,
          isTrusted: false,
          badges: [],
          canProposeStage: false,
          canProposeAtelier: false
        };
        return {
          ...state,
          members: [...state.members, newMember],
          membershipRequests: state.membershipRequests.filter(req => req.id !== action.payload)
        };
      }
      return state;
    
    case 'REJECT_MEMBERSHIP_REQUEST':
      return {
        ...state,
        membershipRequests: state.membershipRequests.filter(req => req.id !== action.payload)
      };
    
    case 'UPDATE_MEMBERSHIP_REQUEST_ROLE':
      return {
        ...state,
        membershipRequests: state.membershipRequests.map(req =>
          req.id === action.payload.id
            ? { ...req, assignedRole: action.payload.role }
            : req
        )
      };
    
    case 'ADD_BADGE_ATTRIBUTION':
      return { ...state, badgeAttributions: [...state.badgeAttributions, action.payload] };
    
    case 'CLEAR_FILTERS':
      return { ...state, filters: {} };
    
    default:
      return state;
  }
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};

interface AppProviderProps {
  children: ReactNode;
}

export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);

  const setShowingPageType = (ShowingPageType: ShowingPageType) => {
    dispatch({ type: 'SET_SHOWING_PAGE_TYPE', payload: ShowingPageType });
  }

  const setCurrentPage = (page: PageType) => {
    dispatch({ type: 'SET_CURRENT_PAGE', payload: page });
  };

  const setTheme = (theme: 'light' | 'dark') => {
    dispatch({ type: 'SET_THEME', payload: theme });
  };

  const setFilters = (filters: FilterOptions) => {
    dispatch({ type: 'SET_FILTERS', payload: filters });
  };

  const setSelectedProject = (project: Project | null) => {
    dispatch({ type: 'SET_SELECTED_PROJECT', payload: project });
  };

  const addMember = (member: Member) => {
    dispatch({ type: 'ADD_MEMBER', payload: member });
  };

  const updateMember = (id: string, updates: Partial<Member>) => {
    dispatch({ type: 'UPDATE_MEMBER', payload: { id, updates } });
  };

  const deleteMember = (id: string) => {
    dispatch({ type: 'DELETE_MEMBER', payload: id });
  };

  const addProject = (project: Project) => {
    dispatch({ type: 'ADD_PROJECT', payload: project });
  };

  const updateProject = (id: string, updates: Partial<Project>) => {
    dispatch({ type: 'UPDATE_PROJECT', payload: { id, updates } });
  };

  const deleteProject = (id: string) => {
    dispatch({ type: 'DELETE_PROJECT', payload: id });
  };

  const addEvent = (event: Event) => {
    dispatch({ type: 'ADD_EVENT', payload: event });
  };

  const updateEvent = (id: string, updates: Partial<Event>) => {
    dispatch({ type: 'UPDATE_EVENT', payload: { id, updates } });
  };

  const deleteEvent = (id: string) => {
    dispatch({ type: 'DELETE_EVENT', payload: id });
  };

  const addBadge = (badge: Badge) => {
    dispatch({ type: 'ADD_BADGE', payload: badge });
  };

  const updateBadge = (id: string, updates: Partial<Badge>) => {
    dispatch({ type: 'UPDATE_BADGE', payload: { id, updates } });
  };

  const deleteBadge = (id: string) => {
    dispatch({ type: 'DELETE_BADGE', payload: id });
  };

  const markNotificationAsRead = (id: string) => {
    dispatch({ type: 'MARK_NOTIFICATION_READ', payload: id });
  };

  const acceptMembershipRequest = (id: string) => {
    dispatch({ type: 'ACCEPT_MEMBERSHIP_REQUEST', payload: id });
  };

  const rejectMembershipRequest = (id: string) => {
    dispatch({ type: 'REJECT_MEMBERSHIP_REQUEST', payload: id });
  };

  const updateMembershipRequestRole = (id: string, role: string) => {
    dispatch({ type: 'UPDATE_MEMBERSHIP_REQUEST_ROLE', payload: { id, role } });
  };

  const addBadgeAttribution = (attribution: BadgeAttribution) => {
    dispatch({ type: 'ADD_BADGE_ATTRIBUTION', payload: attribution });
  };

  const clearFilters = () => {
    dispatch({ type: 'CLEAR_FILTERS' });
  };

  const value: AppContextType = {
    setShowingPageType,
    state,
    setCurrentPage,
    setTheme,
    setFilters,
    setSelectedProject,
    addMember,
    updateMember,
    deleteMember,
    addProject,
    updateProject,
    deleteProject,
    addEvent,
    updateEvent,
    deleteEvent,
    addBadge,
    updateBadge,
    deleteBadge,
    markNotificationAsRead,
    acceptMembershipRequest,
    rejectMembershipRequest,
    updateMembershipRequestRole,
    addBadgeAttribution,
    clearFilters
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};
