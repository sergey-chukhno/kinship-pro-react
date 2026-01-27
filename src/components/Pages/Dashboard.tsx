import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { useToast } from '../../hooks/useToast';
import {
  getCompanyStats,
  getCompanyProjects,
  getSchoolStats,
  getSchoolProjects,
  getSchoolRecentMembers,
  getCompanyRecentMembers,
  getTeacherRecentMembers,
  getTeacherStats,
  getCompanyActivity,
  getSchoolActivity,
  getTeacherActivity,
  getCompanyActivityStats,
  getSchoolActivityStats,
  getTeacherActivityStats,
  getCompanyAssignedBadges,
  getSchoolAssignedBadges,
  getTeacherAssignedBadges,
  getCompanyDetails,
  getSchoolDetails,
  getTeacherLogo,
  uploadCompanyLogo,
  uploadSchoolLogo,
  deleteCompanyLogo,
  deleteSchoolLogo,
  uploadTeacherLogo,
  deleteTeacherLogo
} from '../../api/Dashboard';
import { OrganizationStatsResponse } from '../../types';
import { getOrganizationId, validateImageSize } from '../../utils/projectMapper';
import { getSelectedOrganizationId as getSelectedOrgId } from '../../utils/contextUtils';
import { getTeacherProjects } from '../../api/Projects';
import './Dashboard.css';
import { DEFAULT_AVATAR_SRC } from '../UI/AvatarImage';
import { translateRole, translateRoles } from '../../utils/roleTranslations';

const numberFormatter = new Intl.NumberFormat('fr-FR');

type DashboardProject = {
  id: number | string;
  title: string;
  status?: string;
  start_date?: string;
  end_date?: string;
  created_at?: string;
  members_count?: number;
  participants_number?: number | null;
  school_levels?: Array<{ id: number; name: string }>;
};

type DashboardActivity = {
  id: number | string;
  description: string;
  created_at?: string;
  actor_name?: string;
  actor_avatar?: string;
};

type RecentMember = {
  id: number | string;
  name: string;
  role?: string;
  avatarUrl?: string | null;
  created_at?: string;
};

type ActivityPeriodKey = '1w' | '1m' | '6m';
type ActivityType = 'projects' | 'badges';

type ActivityStatsDataset = {
  bars: number[];
  labels: string[];
  color?: string;
  total?: number;
  bucket_starts?: string[];
  start_at?: string;
  end_at?: string;
  interval?: string;
};

type ActivityStatsPayload = Partial<
  Record<ActivityType, Partial<Record<ActivityPeriodKey, ActivityStatsDataset>>>
>;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const ACTIVITY_DEFAULT_COLORS: Record<ActivityType, string> = {
  projects: '#5570F1',
  badges: '#16A34A',
};

// Professional color palette for multi-colored chart bars
const CHART_BAR_COLORS = [
  '#5570F1', // Blue
  '#10B981', // Green
  '#F59E0B', // Amber
  '#8B5CF6', // Purple
  '#EF4444', // Red
  '#06B6D4', // Cyan
  '#84CC16', // Lime
  '#EC4899', // Pink
  '#F97316', // Orange
  '#14B8A6', // Teal
  '#6366F1', // Indigo
  '#F43F5E', // Rose
];

const DEFAULT_ACTIVITY_LABELS: Record<ActivityPeriodKey, string[]> = {
  '1w': ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'],
  '1m': ['S1', 'S2', 'S3', 'S4'],
  '6m': ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin'],
};

// Normalize week labels to always start with Monday
const normalizeWeekLabels = (labels: string[], bars: number[]): { labels: string[]; bars: number[] } => {
  if (labels.length !== 7 || bars.length !== 7) {
    return { labels, bars };
  }

  const weekOrder = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
  const weekOrderVariants = [
    ['Lun', 'Lundi', 'Mon', 'Monday'],
    ['Mar', 'Mardi', 'Tue', 'Tuesday'],
    ['Mer', 'Mercredi', 'Wed', 'Wednesday'],
    ['Jeu', 'Jeudi', 'Thu', 'Thursday'],
    ['Ven', 'Vendredi', 'Fri', 'Friday'],
    ['Sam', 'Samedi', 'Sat', 'Saturday'],
    ['Dim', 'Dimanche', 'Sun', 'Sunday'],
  ];

  // Check if already starting with Monday (any variant)
  const firstLabel = labels[0]?.trim() || '';
  const isMonday = weekOrderVariants[0].some(variant => 
    firstLabel.toLowerCase().startsWith(variant.toLowerCase())
  );

  if (isMonday) {
    return { labels, bars };
  }

  // Find the index of Monday in the current labels (check all variants)
  let mondayIndex = -1;
  for (let i = 0; i < labels.length; i++) {
    const label = labels[i]?.trim() || '';
    if (weekOrderVariants[0].some(variant => 
      label.toLowerCase().startsWith(variant.toLowerCase())
    )) {
      mondayIndex = i;
      break;
    }
  }

  // If Monday is not found, use fallback order
  if (mondayIndex === -1) {
    return { labels: DEFAULT_ACTIVITY_LABELS['1w'], bars };
  }

  // Reorder labels and bars to start with Monday
  const reorderedLabels = [...labels.slice(mondayIndex), ...labels.slice(0, mondayIndex)];
  const reorderedBars = [...bars.slice(mondayIndex), ...bars.slice(0, mondayIndex)];

  // Normalize labels to use standard abbreviations
  const normalizedLabels = reorderedLabels.map((label, index) => {
    const trimmed = label?.trim() || '';
    // Check if label matches any variant of the expected day
    for (let variantIndex = 0; variantIndex < weekOrderVariants.length; variantIndex++) {
      if (weekOrderVariants[variantIndex].some(variant => 
        trimmed.toLowerCase().startsWith(variant.toLowerCase())
      )) {
        return weekOrder[variantIndex];
      }
    }
    return weekOrder[index] || label;
  });

  return { labels: normalizedLabels, bars: reorderedBars };
};

type BadgeDistributionSegment = {
  level: string;
  label: string;
  color: string;
  count: number;
  percentage: number;
};

type LogoContextHandlers = {
  fetcher: () => Promise<any>;
  uploader: (file: File) => Promise<any>;
  deleter: () => Promise<any>;
  displayNameFallback?: string | null;
  expectsBlob?: boolean;
};

const BADGE_LEVEL_META: Array<{ key: string; label: string; color: string }> = [
  { key: 'level_1', label: 'Niveau 1', color: '#10b981' },
  { key: 'level_2', label: 'Niveau 2', color: '#3b82f6' },
  { key: 'level_3', label: 'Niveau 3', color: '#f59e0b' },
  { key: 'level_4', label: 'Niveau 4', color: '#ef4444' },
];

const OTHER_BADGE_LEVEL_META = {
  key: 'other',
  label: 'Autres niveaux',
  color: '#9ca3af',
};

const DEFAULT_BADGE_PIE_BACKGROUND =
  'radial-gradient(circle at center, #f9fafb 0%, #e5e7eb 65%)';

const toActivityArray = (payload: any): any[] => {
  if (Array.isArray(payload)) return payload;
  if (payload && typeof payload === 'object') {
    return Object.values(payload).filter(Boolean);
  }
  return [];
};

const formatPersonName = (person?: { full_name?: string; first_name?: string; last_name?: string }) => {
  if (!person) return undefined;
  return person.full_name || [person.first_name, person.last_name].filter(Boolean).join(' ').trim() || undefined;
};

const getActorFromActivity = (activity: any) => {
  return (
    activity?.user ||
    activity?.owner ||
    activity?.actor ||
    activity?.member ||
    activity?.creator ||
    activity?.initiator ||
    {}
  );
};

const getActorName = (activity: any) => {
  const actor = getActorFromActivity(activity);
  const fullName = formatPersonName(actor);

  return fullName || activity?.actor_name || activity?.user_name || activity?.member_name || undefined;
};

const getActorAvatar = (activity: any) => {
  const actor = getActorFromActivity(activity);
  return (
    activity?.actor_avatar ||
    actor?.avatar_url ||
    actor?.avatar ||
    activity?.user_avatar ||
    activity?.member_avatar ||
    undefined
  );
};

const getReceiverName = (activity: any) => {
  return (
    formatPersonName(activity?.receiver) ||
    activity?.receiver_name ||
    activity?.member_name ||
    activity?.user_name ||
    undefined
  );
};

const buildActivityDescription = (activity: any) => {
  const type = activity?.type;
  switch (type) {
    case 'member_added':
      return `a rejoint l'organisation`;
    case 'project_created':
      return `a créé le projet "${activity?.title || activity?.project?.title || 'nouveau projet'}"`;
    case 'badge_awarded':
      {
        const badgeTitle =
          activity?.badge?.title ||
          activity?.badge?.name ||
          activity?.title ||
          'Nouveau badge';
        return `a reçu le badge "${badgeTitle}"`;
      }
    case 'partnership_created':
      return `a créé un nouveau partenariat`;
    case 'activity_logged':
      return activity?.description || activity?.message || 'a réalisé une nouvelle activité';
    default:
      return (
        activity?.description ||
        activity?.message ||
        activity?.action ||
        activity?.title ||
        activity?.event_description ||
        'Nouvelle activité'
      );
  }
};

const mapActivityEntry = (activity: any, index: number): DashboardActivity => {
  const receiverName = getReceiverName(activity);
  const actorName =
    activity?.type === 'badge_awarded'
      ? receiverName || getActorName(activity)
      : getActorName(activity);
  const actorAvatar = getActorAvatar(activity);
  const description = buildActivityDescription(activity);
  const createdAt =
    activity?.occurred_at ||
    activity?.created_at ||
    activity?.timestamp ||
    activity?.happened_at ||
    activity?.date;

  return {
    id: activity?.id ?? `activity-${index}`,
    description,
    created_at: createdAt,
    actor_name: actorName,
    actor_avatar: actorAvatar
  };
};

const initializeBadgeSegments = (): BadgeDistributionSegment[] =>
  BADGE_LEVEL_META.map((meta) => ({
    level: meta.key,
    label: meta.label,
    color: meta.color,
    count: 0,
    percentage: 0,
  }));

const aggregateBadgeDistribution = (
  assignments: any[]
): { segments: BadgeDistributionSegment[]; total: number } => {
  const counts = assignments.reduce<Record<string, number>>((acc, assignment) => {
    const levelKey = assignment?.badge?.level || 'unknown';
    acc[levelKey] = (acc[levelKey] || 0) + 1;
    return acc;
  }, {});

  const total = assignments.length;
  const segments: BadgeDistributionSegment[] = BADGE_LEVEL_META.map((meta) => {
    const count = counts[meta.key] || 0;
    return {
      level: meta.key,
      label: meta.label,
      color: meta.color,
      count,
      percentage: total > 0 ? Math.round((count / total) * 100) : 0,
    };
  });

  const otherCount = Object.entries(counts).reduce((sum, [levelKey, value]) => {
    if (BADGE_LEVEL_META.some((meta) => meta.key === levelKey)) {
      return sum;
    }
    return sum + value;
  }, 0);

  if (otherCount > 0) {
    segments.push({
      level: OTHER_BADGE_LEVEL_META.key,
      label: OTHER_BADGE_LEVEL_META.label,
      color: OTHER_BADGE_LEVEL_META.color,
      count: otherCount,
      percentage: total > 0 ? Math.round((otherCount / total) * 100) : 0,
    });
  }

  return { segments, total };
};

const buildBadgePieBackground = (segments: BadgeDistributionSegment[], total: number) => {
  if (!segments.length || total === 0) {
    return DEFAULT_BADGE_PIE_BACKGROUND;
  }

  const positiveSegments = segments.filter((segment) => segment.count > 0);
  if (!positiveSegments.length) {
    return DEFAULT_BADGE_PIE_BACKGROUND;
  }

  let currentDegree = 0;
  const gradientStops = positiveSegments.map((segment, index) => {
    const start = currentDegree;
    let sweep = (segment.count / total) * 360;
    if (index === positiveSegments.length - 1) {
      sweep = 360 - currentDegree;
    }
    const end = start + sweep;
    currentDegree = end;
    return `${segment.color} ${start}deg ${end}deg`;
  });

  return `conic-gradient(${gradientStops.join(', ')})`;
};

const Dashboard: React.FC = () => {
  const { state } = useAppContext();
  const [statsData, setStatsData] = useState<OrganizationStatsResponse | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<ActivityPeriodKey>('1m');
  const [selectedActivity, setSelectedActivity] = useState<ActivityType>('projects');
  const [hoveredBar, setHoveredBar] = useState<{ index: number; value: number; label: string } | null>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [projects, setProjects] = useState<DashboardProject[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [projectsError, setProjectsError] = useState<string | null>(null);
  const [recentMembers, setRecentMembers] = useState<RecentMember[]>([]);
  const [recentMembersLoading, setRecentMembersLoading] = useState(false);
  const [recentMembersError, setRecentMembersError] = useState<string | null>(null);
  const [activities, setActivities] = useState<DashboardActivity[]>([]);
  const [activitiesLoading, setActivitiesLoading] = useState(false);
  const [activitiesError, setActivitiesError] = useState<string | null>(null);
  const [activityStats, setActivityStats] = useState<ActivityStatsPayload | null>(null);
  const [activityStatsLoading, setActivityStatsLoading] = useState(false);
  const [activityStatsError, setActivityStatsError] = useState<string | null>(null);
  const [organizationLogoUrl, setOrganizationLogoUrl] = useState<string | null>(null);
  const [organizationName, setOrganizationName] = useState<string | null>(null);
  const [logoLoading, setLogoLoading] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoDeleting, setLogoDeleting] = useState(false);
  const [logoRefreshKey, setLogoRefreshKey] = useState(0);
  const [badgeDistribution, setBadgeDistribution] = useState<BadgeDistributionSegment[]>(() =>
    initializeBadgeSegments()
  );
  const [badgeDistributionTotal, setBadgeDistributionTotal] = useState(0);
  const [badgeDistributionLoading, setBadgeDistributionLoading] = useState(false);
  const [badgeDistributionError, setBadgeDistributionError] = useState<string | null>(null);
  
  // Utiliser le contexte sélectionné depuis localStorage si disponible et valide
  const getSelectedOrganizationId = (): number | undefined => {
    const orgId = getSelectedOrgId(state.user, state.showingPageType);
    console.log('📊 [Dashboard] Organization ID sélectionné:', {
      organizationId: orgId,
      showingPageType: state.showingPageType,
      savedContextId: localStorage.getItem('selectedContextId'),
      savedContextType: localStorage.getItem('selectedContextType')
    });
    return orgId;
  };
  
  const organizationId = getSelectedOrganizationId();
  
  // Log final du dashboard sélectionné
  useEffect(() => {
    console.log('🎯 [Dashboard] Dashboard sélectionné:', {
      showingPageType: state.showingPageType,
      organizationId: organizationId,
      savedContextId: localStorage.getItem('selectedContextId'),
      savedContextType: localStorage.getItem('selectedContextType'),
      savedPageType: localStorage.getItem('selectedPageType'),
      userContexts: {
        companies: state.user.available_contexts?.companies?.map((c: any) => ({
          id: c.id,
          name: c.name,
          role: c.role
        })),
        schools: state.user.available_contexts?.schools?.map((s: any) => ({
          id: s.id,
          name: s.name,
          role: s.role
        }))
      }
    });
  }, [state.showingPageType, organizationId, state.user.available_contexts]);
  const logoFileInputRef = useRef<HTMLInputElement | null>(null);
  const logoObjectUrlRef = useRef<string | null>(null);
  const { showError } = useToast();
  const showErrorRef = useRef(showError);
  useEffect(() => {
    showErrorRef.current = showError;
  }, [showError]);
  const revokeLogoObjectUrl = useCallback(() => {
    if (logoObjectUrlRef.current) {
      URL.revokeObjectURL(logoObjectUrlRef.current);
      logoObjectUrlRef.current = null;
    }
  }, []);

  const applyBlobLogo = useCallback(
    (blob?: Blob | null) => {
      revokeLogoObjectUrl();
      if (blob && blob.size > 0) {
        const objectUrl = URL.createObjectURL(blob);
        logoObjectUrlRef.current = objectUrl;
        setOrganizationLogoUrl(objectUrl);
      } else {
        setOrganizationLogoUrl(null);
      }
    },
    [revokeLogoObjectUrl]
  );
  useEffect(() => {
    return () => {
      revokeLogoObjectUrl();
    };
  }, [revokeLogoObjectUrl]);
  const logoContext = useMemo<LogoContextHandlers | null>(() => {
    if (state.showingPageType === 'teacher') {
      // For teachers: use teacher logo if no school, or school info if confirmed member
      if (organizationId === undefined) {
        return {
          fetcher: () => getTeacherLogo(),
          uploader: (file: File) => uploadTeacherLogo(file),
          deleter: () => deleteTeacherLogo(),
          displayNameFallback: state.user.organization || state.user.name || 'Mon espace enseignant',
          expectsBlob: false,
        };
      }
      
      // Teacher with confirmed school membership - use school info from available_contexts
      const school = state.user.available_contexts?.schools?.find((s: any) => s.id === organizationId);
      if (school) {
        return {
          fetcher: async () => ({ 
            data: { 
              data: { 
                name: school.name, 
                logo_url: school.logo_url 
              } 
            } 
          }),
          uploader: async () => { throw new Error('Teachers cannot upload school logos'); },
          deleter: async () => { throw new Error('Teachers cannot delete school logos'); },
          displayNameFallback: school.name,
          expectsBlob: false,
        };
      }
      
      return {
        fetcher: () => getTeacherLogo(),
        uploader: (file: File) => uploadTeacherLogo(file),
        deleter: () => deleteTeacherLogo(),
        displayNameFallback: state.user.organization || state.user.name || 'Mon espace enseignant',
        expectsBlob: false,
      };
    }

    if (!organizationId) return null;
    const id = Number(organizationId);

    if (state.showingPageType === 'pro') {
      return {
        fetcher: () => getCompanyDetails(id),
        uploader: (file: File) => uploadCompanyLogo(id, file),
        deleter: () => deleteCompanyLogo(id),
      };
    }

    if (state.showingPageType === 'edu') {
      return {
        fetcher: () => getSchoolDetails(id),
        uploader: (file: File) => uploadSchoolLogo(id, file),
        deleter: () => deleteSchoolLogo(id),
      };
    }

    return null;
  }, [organizationId, state.showingPageType, state.user.organization, state.user.name, state.user.available_contexts]);
  const canUploadLogo = Boolean(logoContext);

  useEffect(() => {
    let ignore = false;

    const fetchStats = async () => {
      if (state.showingPageType === 'user') {
        setStatsData(null);
        setStatsError(null);
        return;
      }

      if (
        (state.showingPageType === 'pro' || state.showingPageType === 'edu') &&
        !organizationId
      ) {
        return;
      }

      setStatsLoading(true);
      setStatsError(null);

      try {
        let response;

        if (state.showingPageType === 'pro' && organizationId) {
          response = await getCompanyStats(Number(organizationId));
        } else if (state.showingPageType === 'edu' && organizationId) {
          response = await getSchoolStats(Number(organizationId));
        } else if (state.showingPageType === 'teacher') {
          response = await getTeacherStats();
        } else {
          setStatsData(null);
          setStatsLoading(false);
          return;
        }

        const payload = response.data?.data ?? response.data;
        if (!ignore) {
          setStatsData(payload);
        }
      } catch (error) {
        console.error('Erreur lors du chargement des statistiques :', error);
        if (!ignore) {
          setStatsData(null);
          setStatsError('Impossible de charger les statistiques pour le moment.');
        }
      } finally {
        if (!ignore) {
          setStatsLoading(false);
        }
      }
    };

    fetchStats();

    return () => {
      ignore = true;
    };
  }, [state.showingPageType, organizationId]);

  useEffect(() => {
    let ignore = false;

    const fetchActivityStats = async () => {
      if (state.showingPageType === 'user') {
        if (!ignore) {
          setActivityStats(null);
          setActivityStatsError(null);
          setActivityStatsLoading(false);
        }
        return;
      }

      const requiresOrganizationId = state.showingPageType !== 'teacher';
      if (requiresOrganizationId && !organizationId) {
        if (!ignore) {
          setActivityStats(null);
          setActivityStatsError(null);
          setActivityStatsLoading(false);
        }
        return;
      }

      setActivityStatsLoading(true);
      setActivityStatsError(null);

      try {
        let response;

        if (state.showingPageType === 'pro' && organizationId) {
          response = await getCompanyActivityStats(Number(organizationId));
        } else if (state.showingPageType === 'edu' && organizationId) {
          response = await getSchoolActivityStats(Number(organizationId));
        } else if (state.showingPageType === 'teacher') {
          response = await getTeacherActivityStats();
        } else {
          if (!ignore) {
            setActivityStats(null);
            setActivityStatsLoading(false);
          }
          return;
        }

        const payload: ActivityStatsPayload | null =
          response?.data?.data ?? response?.data ?? null;

        if (!ignore) {
          setActivityStats(payload);
        }
      } catch (error) {
        console.error("Erreur lors du chargement des statistiques d'activité :", error);
        if (!ignore) {
          setActivityStats(null);
          setActivityStatsError("Impossible de charger les statistiques d'activité pour le moment.");
        }
      } finally {
        if (!ignore) {
          setActivityStatsLoading(false);
        }
      }
    };

    fetchActivityStats();

    return () => {
      ignore = true;
    };
  }, [state.showingPageType, organizationId]);

  useEffect(() => {
    let ignore = false;

    const fetchOrganizationDetails = async () => {
      if (!logoContext) {
        if (!ignore) {
          applyBlobLogo(null);
          setOrganizationName(null);
          setLogoLoading(false);
        }
        return;
      }

      setLogoLoading(true);

      try {
        const response = await logoContext.fetcher();
        if (ignore) return;

        const fallbackName =
          logoContext.displayNameFallback ||
          state.user.organization ||
          (state.showingPageType === 'teacher' ? state.user.name : null);

        if (logoContext.expectsBlob) {
          applyBlobLogo(response?.data);
          if (fallbackName) {
            setOrganizationName(fallbackName);
          }
        } else {
          applyBlobLogo(null);
          const payload = response?.data?.data ?? response?.data ?? {};
          setOrganizationLogoUrl(payload?.logo_url || null);
          setOrganizationName(payload?.name || fallbackName || null);
        }
      } catch (error: any) {
        if (ignore) return;
        const status = error?.response?.status;
        if (status === 404) {
          applyBlobLogo(null);
          setOrganizationName(null);
        } else {
          console.error('Erreur lors du chargement du logo :', error);
          showErrorRef.current?.("Impossible de charger les informations de l'organisation pour le moment.");
        }
      } finally {
        if (!ignore) {
          setLogoLoading(false);
        }
      }
    };

    fetchOrganizationDetails();

    return () => {
      ignore = true;
    };
  }, [logoContext, logoRefreshKey, applyBlobLogo, state.showingPageType, state.user.organization, state.user.name]);

  useEffect(() => {
    let ignore = false;

    const fetchBadgeDistribution = async () => {
      if (state.showingPageType === 'user') {
        if (!ignore) {
          setBadgeDistribution(initializeBadgeSegments());
          setBadgeDistributionTotal(0);
          setBadgeDistributionError(null);
        }
        return;
      }

      const requiresOrganizationId = state.showingPageType !== 'teacher';
      if (requiresOrganizationId && !organizationId) {
        if (!ignore) {
          setBadgeDistribution(initializeBadgeSegments());
          setBadgeDistributionTotal(0);
          setBadgeDistributionError(null);
        }
        return;
      }

      setBadgeDistributionLoading(true);
      setBadgeDistributionError(null);

      try {
        let response;

        if (state.showingPageType === 'pro' && organizationId) {
          response = await getCompanyAssignedBadges(Number(organizationId));
        } else if (state.showingPageType === 'edu' && organizationId) {
          response = await getSchoolAssignedBadges(Number(organizationId));
        } else if (state.showingPageType === 'teacher') {
          response = await getTeacherAssignedBadges();
        } else {
          if (!ignore) {
            setBadgeDistribution(initializeBadgeSegments());
            setBadgeDistributionTotal(0);
            setBadgeDistributionError(null);
            setBadgeDistributionLoading(false);
          }
          return;
        }

        const payload = response.data?.data ?? response.data ?? [];
        if (!ignore) {
          const assignmentsArray = Array.isArray(payload) ? payload : [];
          const { segments, total } = aggregateBadgeDistribution(assignmentsArray);
          setBadgeDistribution(segments);
          setBadgeDistributionTotal(total);
        }
      } catch (error) {
        console.error('Erreur lors du chargement de la répartition des badges :', error);
        if (!ignore) {
          setBadgeDistribution(initializeBadgeSegments());
          setBadgeDistributionTotal(0);
          setBadgeDistributionError('Impossible de charger la répartition des badges pour le moment.');
        }
      } finally {
        if (!ignore) {
          setBadgeDistributionLoading(false);
        }
      }
    };

    fetchBadgeDistribution();

    return () => {
      ignore = true;
    };
  }, [state.showingPageType, organizationId]);

  useEffect(() => {
    let ignore = false;

    const fetchProjects = async () => {
      if (state.showingPageType === 'user') {
        setProjects([]);
        setProjectsError(null);
        return;
      }

      if (!organizationId) {
        setProjects([]);
        setProjectsError(null);
        return;
      }

      setProjectsLoading(true);
      setProjectsError(null);

      try {
        let response;
        const includeBranches = false;

        if (state.showingPageType === 'pro') {
          response = await getCompanyProjects(Number(organizationId), includeBranches);
        } else if (state.showingPageType === 'teacher') {
          // Use teacher-specific endpoint
          const teacherProjectsResponse = await getTeacherProjects({ 
            per_page: 3, 
            page: 1 
          });
          response = { data: { data: teacherProjectsResponse.data } };
        } else {
          // edu
          response = await getSchoolProjects(Number(organizationId), includeBranches);
        }

        const payload = response.data?.data ?? response.data ?? [];
        if (!ignore) {
          const normalizedProjects: DashboardProject[] = Array.isArray(payload) ? payload : [];
          const getTimestamp = (project: DashboardProject) => {
            const dateSource = project.created_at || project.start_date || project.end_date;
            const timestamp = dateSource ? new Date(dateSource).getTime() : 0;
            return Number.isNaN(timestamp) ? 0 : timestamp;
          };
          const sortedProjects = [...normalizedProjects].sort(
            (a, b) => getTimestamp(b) - getTimestamp(a)
          );
          setProjects(sortedProjects);
        }
      } catch (error) {
        console.error('Erreur lors du chargement des projets :', error);
        if (!ignore) {
          setProjects([]);
          setProjectsError('Impossible de charger les projets pour le moment.');
        }
      } finally {
        if (!ignore) {
          setProjectsLoading(false);
        }
      }
    };

    fetchProjects();

    return () => {
      ignore = true;
    };
  }, [state.showingPageType, organizationId]);

  useEffect(() => {
    let ignore = false;

    const fetchRecentMembers = async () => {
      if (state.showingPageType === 'user') {
        setRecentMembers([]);
        setRecentMembersError(null);
        setRecentMembersLoading(false);
        return;
      }

      if ((state.showingPageType === 'pro' || state.showingPageType === 'edu') && !organizationId) {
        setRecentMembers([]);
        setRecentMembersError(null);
        setRecentMembersLoading(false);
        return;
      }

      setRecentMembersLoading(true);
      setRecentMembersError(null);

      try {
        let response;

        if (state.showingPageType === 'pro' && organizationId) {
          response = await getCompanyRecentMembers(Number(organizationId), 3);
        } else if (state.showingPageType === 'edu' && organizationId) {
          response = await getSchoolRecentMembers(Number(organizationId), 3);
        } else if (state.showingPageType === 'teacher') {
          response = await getTeacherRecentMembers(3);
        } else {
          if (!ignore) {
            setRecentMembers([]);
            setRecentMembersLoading(false);
            setRecentMembersError(null);
          }
          return;
        }

        const payload = response.data?.data ?? response.data ?? [];
        const entries = Array.isArray(payload)
          ? payload
          : Array.isArray(payload?.data)
          ? payload.data
          : [];

        if (!ignore) {
          const normalizedMembers: RecentMember[] = entries.slice(0, 3).map((member: any, index: number) => {
            const avatar =
              member?.avatar_url ||
              member?.avatar ||
              member?.user?.avatar_url ||
              member?.user?.avatar ||
              DEFAULT_AVATAR_SRC;
            const roleCandidates = [
              member?.role_in_system,
              member?.role_in_school,
              member?.role,
              member?.job,
              member?.user_role
            ];
            const translatedRoles = translateRoles(roleCandidates);
            const resolvedRole =
              translatedRoles[0] ||
              translateRole(roleCandidates.find((candidate) => Boolean(candidate)) || 'Membre');

            return {
              id: member?.id ?? member?.user_id ?? `recent-member-${index}`,
              name:
                formatPersonName(member) ||
                formatPersonName(member?.user) ||
                member?.email ||
                member?.user?.email ||
                'Membre',
              role: resolvedRole,
              avatarUrl: avatar,
              created_at: member?.created_at || member?.user?.created_at,
            };
          });

          setRecentMembers(normalizedMembers);
        }
      } catch (error) {
        console.error('Erreur lors du chargement des membres récents :', error);
        if (!ignore) {
          setRecentMembers([]);
          setRecentMembersError('Impossible de charger les membres récents pour le moment.');
        }
      } finally {
        if (!ignore) {
          setRecentMembersLoading(false);
        }
      }
    };

    fetchRecentMembers();

    return () => {
      ignore = true;
    };
  }, [state.showingPageType, organizationId]);

  useEffect(() => {
    let ignore = false;

    const fetchActivities = async () => {
      if (state.showingPageType === 'user') {
        setActivities([]);
        setActivitiesError(null);
        return;
      }

      if (!organizationId && state.showingPageType !== 'teacher') {
        setActivities([]);
        setActivitiesError(null);
        return;
      }

      setActivitiesLoading(true);
      setActivitiesError(null);

      try {
        let response;

        if (state.showingPageType === 'pro' && organizationId) {
          response = await getCompanyActivity(Number(organizationId));
        } else if (state.showingPageType === 'edu' && organizationId) {
          response = await getSchoolActivity(Number(organizationId));
        } else if (state.showingPageType === 'teacher') {
          response = await getTeacherActivity();
        } else {
          setActivities([]);
          setActivitiesLoading(false);
          return;
        }

        const payload = response.data?.data ?? response.data ?? [];
        if (!ignore) {
          const activityArray = toActivityArray(payload);
          const mappedActivities: DashboardActivity[] = activityArray.map((activity, index) =>
            mapActivityEntry(activity, index)
          );
          const getTimestamp = (activity: DashboardActivity) => {
            if (!activity.created_at) return 0;
            const timestamp = new Date(activity.created_at).getTime();
            return Number.isNaN(timestamp) ? 0 : timestamp;
          };
          const sortedActivities = [...mappedActivities].sort(
            (a, b) => getTimestamp(b) - getTimestamp(a)
          );
          setActivities(sortedActivities);
        }
      } catch (error) {
        console.error('Erreur lors du chargement des activités :', error);
        if (!ignore) {
          setActivities([]);
          setActivitiesError('Impossible de charger les activités pour le moment.');
        }
      } finally {
        if (!ignore) {
          setActivitiesLoading(false);
        }
      }
    };

    fetchActivities();

    return () => {
      ignore = true;
    };
  }, [state.showingPageType, organizationId]);

  const triggerLogoUpload = () => {
    if (!canUploadLogo || logoUploading) return;
    logoFileInputRef.current?.click();
  };

  const handleLogoKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!canUploadLogo) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      triggerLogoUpload();
    }
  };

  const handleLogoFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !logoContext) return;

    const validation = validateImageSize(file);
    if (!validation.valid) {
      showErrorRef.current?.(validation.error || 'Le fichier sélectionné est trop volumineux.');
      if (event.target) {
        event.target.value = '';
      }
      return;
    }

    setLogoUploading(true);

    try {
      await logoContext.uploader(file);
      setLogoRefreshKey((prev) => prev + 1);
    } catch (error) {
      console.error('Erreur lors du téléversement du logo :', error);
      showErrorRef.current?.('Échec du téléversement du logo.');
    } finally {
      setLogoUploading(false);
      if (event.target) {
        event.target.value = '';
      }
    }
  };

  const handleLogoDelete = async () => {
    if (!logoContext || !organizationLogoUrl || logoDeleting) return;

    setLogoDeleting(true);

    try {
      await logoContext.deleter();
      setLogoRefreshKey((prev) => prev + 1);
    } catch (error) {
      console.error('Erreur lors de la suppression du logo :', error);
      showErrorRef.current?.('Impossible de supprimer le logo pour le moment.');
    } finally {
      setLogoDeleting(false);
    }
  };

  const handleLogoEditClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    triggerLogoUpload();
  };

  const handleLogoDeleteClick = async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    await handleLogoDelete();
  };

  const formatStatValue = (value?: number | null) => {
    if (statsLoading) return '...';
    if (value === undefined || value === null) return '—';
    return numberFormatter.format(value);
  };

  const overview = statsData?.overview;
  const branches = statsData?.branches;
  const badgesAssigned = statsData?.badges_assigned;
  const statCards = [
    {
      key: 'total_members',
      label: 'Membres actifs',
      icon: '/icons_logo/Icon=Membres grand.svg',
      value: overview?.total_members,
      variant: 'stat-card',
    },
    {
      key: state.showingPageType === 'pro' ? 'active_partnerships' : 'total_teachers',
      label: state.showingPageType === 'pro' ? 'Partenaires' : 'Enseignants',
      icon: state.showingPageType === 'pro' ? '/icons_logo/Icon=Reseau.svg' : '/icons_logo/Icon=Event grand.svg',
      value: state.showingPageType === 'pro' ? overview?.active_partnerships : overview?.total_teachers,
      variant: 'stat-card',
    },
    {
      key: state.showingPageType === 'pro' ? 'total_branches' : 'total_students',
      label: state.showingPageType === 'pro' ? 'Sous-organisations' : 'Étudiants',
      icon: '/icons_logo/Icon=Reseau.svg',
      value: state.showingPageType === 'pro' ? branches?.total_branches : overview?.total_students,
      variant: 'stat-card',
    },
    // Classes card for edu dashboard (placed after Étudiants)
    ...(state.showingPageType === 'edu' ? [{
      key: 'total_levels',
      label: 'Classes',
      icon: '/icons_logo/Icon=Badges.svg',
      value: overview?.total_levels,
      variant: 'stat-card2',
    }] : []),
    {
      key: 'total_projects',
      label: 'Projets',
      icon: '/icons_logo/Icon=Projet grand.svg',
      value: overview?.total_projects,
      variant: 'stat-card2',
    },
    // Badges card - shown for both pro and edu dashboards
    {
      key: 'badges_assigned',
      label: 'Badges',
      icon: '/icons_logo/Icon=Badges.svg',
      value: badgesAssigned?.total,
      variant: 'stat-card2',
    },
  ];

  const chartDataset = useMemo<{
    labels: string[];
    barHeights: number[];
    values: number[];
    colors: string[];
  }>(() => {
    const activityByType = activityStats?.[selectedActivity];
    const dataset: ActivityStatsDataset | undefined = activityByType?.[selectedPeriod];
    // const defaultColor = ACTIVITY_DEFAULT_COLORS[selectedActivity]; // Unused variable
    const fallbackLabels = DEFAULT_ACTIVITY_LABELS[selectedPeriod] || [];

    if (!dataset) {
      return {
        labels: [] as string[],
        barHeights: [] as number[],
        values: [] as number[],
        colors: [] as string[],
      };
    }

    let bars = Array.isArray(dataset.bars) ? [...dataset.bars] : [];
    let labels = Array.isArray(dataset.labels) ? [...dataset.labels] : [];

    if (bars.length && labels.length) {
      const limit = Math.min(bars.length, labels.length);
      bars = bars.slice(0, limit);
      labels = labels.slice(0, limit);
    } else if (bars.length && !labels.length) {
      labels =
        fallbackLabels.length === bars.length
          ? [...fallbackLabels]
          : bars.map((_, index) => `P${index + 1}`);
    }

    // Normalize week labels to start with Monday
    if (selectedPeriod === '1w' && bars.length === 7 && labels.length === 7) {
      const normalized = normalizeWeekLabels(labels, bars);
      labels = normalized.labels;
      bars = normalized.bars;
    }

    if (!bars.length && !labels.length) {
      return {
        labels: [] as string[],
        barHeights: [] as number[],
        values: [] as number[],
        colors: [] as string[],
      };
    }

    const maxValue = bars.reduce((max, value) => Math.max(max, value), 0);
    const barHeights =
      maxValue === 0
        ? bars.map(() => 0)
        : bars.map((value) => Math.round((value / maxValue) * 100));

    // Generate multi-colored bars using professional color palette
    const colors = bars.map((_, index) => CHART_BAR_COLORS[index % CHART_BAR_COLORS.length]);

    return {
      labels,
      barHeights,
      values: bars,
      colors,
    };
  }, [activityStats, selectedActivity, selectedPeriod]);

  const chartHasValues = chartDataset.values.length > 0;
  const chartOnlyZeros = chartHasValues && chartDataset.values.every((value) => value === 0);

  useEffect(() => {
    setHoveredBar(null);
  }, [selectedActivity, selectedPeriod, activityStats]);
  const badgePieBackground = useMemo(
    () => buildBadgePieBackground(badgeDistribution, badgeDistributionTotal),
    [badgeDistribution, badgeDistributionTotal]
  );
  const hasAssignedBadges = badgeDistributionTotal > 0;
  const organizationDisplayName =
    organizationName ||
    (state.showingPageType === 'pro'
      ? "l'organisation"
      : null);

  const getStatusMeta = (status?: string) => {
    switch (status) {
      case 'in_progress':
        return { label: 'En cours', className: 'badge-inprogress' };
      case 'coming':
        return { label: 'À venir', className: 'badge-upcoming' };
      case 'ended':
        return { label: 'Clôturé', className: 'badge-completed' };
      default:
        return { label: 'Non défini', className: 'badge-upcoming' };
    }
  };

  const formatDateRange = (start?: string, end?: string) => {
    if (!start || !end) return 'Dates à définir';

    try {
      const formatter = new Intl.DateTimeFormat('fr-FR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
      return `${formatter.format(new Date(start))} – ${formatter.format(new Date(end))}`;
    } catch (e) {
      return 'Dates à définir';
    }
  };

  const recentProjects = useMemo(() => {
    if (!projects || projects.length === 0) return [];

    const getTimestamp = (project: DashboardProject) => {
      const dateSource = project.created_at || project.start_date || project.end_date;
      const timestamp = dateSource ? new Date(dateSource).getTime() : 0;
      return Number.isNaN(timestamp) ? 0 : timestamp;
    };

    // Filter to only show projects with "in_progress" status
    return [...projects]
      .filter((project) => project.status === 'in_progress')
      .sort((a, b) => getTimestamp(b) - getTimestamp(a))
      .slice(0, 3);
  }, [projects]);

  const formatRelativeTime = (date?: string) => {
    if (!date) return 'Récemment';
    const timestamp = new Date(date).getTime();
    if (Number.isNaN(timestamp)) return 'Récemment';
    const seconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
    if (seconds < 60) return `Il y a ${seconds} sec${seconds > 1 ? 's' : ''}`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `Il y a ${minutes} min${minutes > 1 ? 's' : ''}`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `Il y a ${hours} heure${hours > 1 ? 's' : ''}`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `Il y a ${days} jour${days > 1 ? 's' : ''}`;
    const months = Math.floor(days / 30);
    if (months < 12) return `Il y a ${months} mois`;
    const years = Math.floor(months / 12);
    return `Il y a ${years} an${years > 1 ? 's' : ''}`;
  };

  return (
    <section className="dashboard-main-layout active">
      {/* Welcome Message and Section Title */}
      <div className="dashboard-header">
        <div className="welcome-header">
          <div className="organization-logo-card">
          {state.showingPageType !== 'teacher' && (   <div
              className={`
                organization-logo-wrapper !items-start !flex
                ${organizationLogoUrl ? 'has-logo' : 'empty'}
                ${logoLoading ? 'loading' : ''}
                ${canUploadLogo ? '':'disabled'}`}
              onClick={canUploadLogo ? triggerLogoUpload : undefined}
              role={canUploadLogo ? 'button' : undefined}
              tabIndex={canUploadLogo ? 0 : undefined}
              onKeyDown={canUploadLogo ? handleLogoKeyDown : undefined}
            >
              <div className="flex relative justify-center items-center">
              {logoLoading ? (
                // <span className="logo-status-text">
                  <i className="p-1 animate-spin fas fa-spinner fa-spin"></i>
                // </span>
              ) : organizationLogoUrl ? (
                <img
                  src={organizationLogoUrl}
                  alt="Logo de l'organisation"
                  className="association-logo"
                />
              ) : (
                <div className="organization-logo-empty">
                  <span>Aucun logo</span>
                  {canUploadLogo && <small>Cliquez pour ajouter</small>}
                </div>
              )}
              

              {canUploadLogo && (
                <button
                    type="button"
                  className="logo-action logo-edit p"
                  onClick={handleLogoEditClick}
                  disabled={logoUploading || logoDeleting}
                >
                  {logoUploading ? (
                    <i className="p-1 fas fa-spinner fa-spin"></i>
                  ) : organizationLogoUrl ? (
                    <i className="p-1 fas fa-pencil-alt"></i>
                  ) : (
                    <i className="p-1 fas fa-plus"></i>
                  )}
                </button>
              )}
              {canUploadLogo && (
                <div className="logo-actions">
                  {organizationLogoUrl && (
                    <button
                      type="button"
                      className="logo-action logo-delete"
                      onClick={handleLogoDeleteClick}
                      disabled={logoDeleting || logoUploading}
                    >
                      {logoDeleting ? (
                        <i className="p-1 fas fa-spinner fa-spin"></i>
                      ) : (
                        <i className="p-1 fas fa-trash-alt"></i>
                      )}
                    </button>
                  )}
                </div>
              )}
              <input
                type="file"
                accept="image/*"
                ref={logoFileInputRef}
                onChange={handleLogoFileChange}
                style={{ display: 'none' }}
              />
  
            </div>
            </div>)}
            </div>
          <div className="section-title">
            <h1 className="welcome-title">Bonjour {state.user.name.split(' ')[0]} !</h1>
            {state.showingPageType === 'teacher' && (
              <div className="flex gap-2 items-center">
                <img src="/icons_logo/Icon=Tableau de bord.svg" alt="Tableau de bord" className="section-icon" />
                <span>
                  Tableau de bord enseignant
                  {state.user.available_contexts?.schools && state.user.available_contexts.schools.length > 0 && (
                    <span className="text-sm text-gray-600 ml-2">
                      ({state.user.available_contexts.schools.map((s: any) => s.name).join(', ')})
                    </span>
                  )}
                </span>
              </div>
            )}
            {state.showingPageType !== 'teacher' && (
              <div className="flex gap-2 items-center">
                <img src="/icons_logo/Icon=Tableau de bord.svg" alt="Tableau de bord" className="section-icon" />
                <span>Tableau de bord de {organizationDisplayName}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Area - Flex Container */}
      <div className="dashboard-main-content">

{/* --- COLONNE DE GAUCHE (Stats + Nouvel Aperçu Membres + Projets + Charts) --- */}
        <div className="dashboard-left-column">
          {/* Statistics Cards */}
          <div className="dashboard-stats">
            <div className="stats-grid">
              {statCards.map((card) => {
                if ((card.label === "Enseignants" || card.label === "Membres actifs") && state.showingPageType === 'teacher') return null;
                const labelClass = card.variant === 'stat-card2' ? 'stat-label2' : 'stat-label';
                return (
                  <div key={card.key} className={card.variant}>
                    <div className="stat-icon">
                      <img src={card.icon} alt={card.label} />
                    </div>
                    <div className="stat-content">
                      <div className="stat-value">{formatStatValue(card.value)}</div>
                      <div className={labelClass}>{card.label}</div>
                    </div>
                  </div>
                );
              })}
            </div>
            {statsError && (
              <p className="stats-error-text">
                {statsError}
              </p>
            )}
          </div>

          <div className="projects-in-progress-container">
            <div className="projects-header">
              <div className="projects-title-group">
                <img src="/icons_logo/Icon=Projet grand.svg" alt="Projets" className="projects-icon" />
                <h3>Projets en cours</h3>
              </div>
              {/* <button className="btn btn-primary">Créer un projet +</button> */}
            </div>

            <div className="project-list">
              {projectsLoading && (
                <p className="project-feedback-text">Chargement des projets...</p>
              )}

              {!projectsLoading && projectsError && (
                <p className="project-feedback-text error">{projectsError}</p>
              )}

              {!projectsLoading && !projectsError && recentProjects.length === 0 && (
                <p className="project-feedback-text">Aucun projet à afficher pour le moment.</p>
              )}

              {!projectsLoading && !projectsError && recentProjects.map((project) => {
                const statusMeta = getStatusMeta(project.status);
                return (
                  <div className="project-item" key={project.id}>
                    <div className="project-info">
                      <span className="project-name">{project.title}</span>
                      <span className={`project-badge ${statusMeta.className}`}>{statusMeta.label}</span>
                    </div>
                    <div className="project-details-row">
                      <div className="project-dates">
                        {formatDateRange(project.start_date, project.end_date)}
                      </div>
                      {/* <div className="project-progress">
                        <div className="progress-bar-wrapper">
                          <div className="progress-bar" style={{ width: `${progress}%` }}></div>
                        </div>
                        <span className="progress-value">{progress}%</span>
                      </div> */}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="projects-footer">
              <a href="/projects" className="btn btn-text">Voir tous les projets →</a>
            </div>
          </div>
        </div>
        {/* --- FIN DE LA COLONNE DE GAUCHE --- */}

        {/* --- COLONNE DE DROITE (Recent Activity) --- */}
        <div className="dashboard-right-column">
          <div className="recent-activity">
            <div className="activity-header">
              <h3>Activités récentes</h3>
            </div>
            <div className="activity-list">
              {activitiesLoading && (
                <p className="activity-feedback-text">Chargement des activités...</p>
              )}

              {!activitiesLoading && activitiesError && (
                <p className="activity-feedback-text error">{activitiesError}</p>
              )}

              {!activitiesLoading && !activitiesError && activities.length === 0 && (
                <p className="activity-feedback-text">Aucune activité récente à afficher.</p>
              )}

              {!activitiesLoading &&
                !activitiesError &&
                activities.map((activity) => (
                  <div className="activity-item" key={activity.id}>
                    <div className="activity-avatar">
                      <img
                        src={activity.actor_avatar || DEFAULT_AVATAR_SRC}
                        alt={activity.actor_name || 'Utilisateur'}
                      />
                    </div>
                    <div className="activity-content">
                      <div className="activity-text">
                        {activity.actor_name ? (
                          <>
                            <strong>{activity.actor_name}</strong>{' '}
                            {activity.description}
                          </>
                        ) : (
                          activity.description || 'Nouvelle activité'
                        )}
                      </div>
                      <div className="activity-time">
                        {formatRelativeTime(activity.created_at)}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* Charts and Analytics */}
          <div className="dashboard-charts">
            <div className="chart-container">
              <div className="chart-header">
                <h3>Répartition des badges</h3>
              </div>
              <div className="chart-placeholder">
                {badgeDistributionLoading && (
                  <p className="chart-feedback-text">Chargement de la répartition...</p>
                )}
                {!badgeDistributionLoading && badgeDistributionError && (
                  <p className="chart-feedback-text error">{badgeDistributionError}</p>
                )}
                {!badgeDistributionLoading && !badgeDistributionError && (
                  <div className={`flex  ${hasAssignedBadges ? 'flex-row gap-4' : 'flex-col'}`}>
                    <div
                      className={`pie-chart-mock${hasAssignedBadges ? '':' pie-chart-empty'}`}
                      style={{ background: badgePieBackground }}
                    ></div>
                    {hasAssignedBadges ? (
                      <div className="pie-legend">
                        {badgeDistribution.map((segment) => (
                          <div className="legend-item" key={segment.level}>
                            <span
                              className="legend-color"
                              style={{ backgroundColor: segment.color }}
                            ></span>
                            <span>
                              {segment.label} ({segment.percentage}%)
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="chart-feedback-text">Aucun badge attribué pour le moment.</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* --- FIN DE dashboard-main-content --- */}

      {/* NOUVELLE SECTION : Fusion Membres Récents + Activité - SPANS BOTH COLUMNS */}
      <div className="members-overview-section members-overview-section-full-width">
            
            {/* PARTIE GAUCHE : Membres récents */}
            <div className="recent-members-container">
              <div className="recent-members-header">
                <img src="/icons_logo/Icon=Membres.svg" alt="Membres" className="members-icon" />
                <h3>Membres récents</h3>
              </div>
              
              <div className="member-list">
                {recentMembersLoading && (
                  <p className="member-feedback-text">Chargement des membres...</p>
                )}

                {!recentMembersLoading && recentMembersError && (
                  <p className="member-feedback-text error">{recentMembersError}</p>
                )}

                {!recentMembersLoading && !recentMembersError && recentMembers.length === 0 && (
                  <p className="member-feedback-text">Aucun membre récent à afficher.</p>
                )}

                {!recentMembersLoading &&
                  !recentMembersError &&
                  recentMembers.map((member) => (
                    <div className="member-item" key={member.id}>
                      <div className="member-avatar">
                        <img
                          src={member.avatarUrl || DEFAULT_AVATAR_SRC}
                          alt={member.name}
                          onError={(event) => {
                            if (event.currentTarget.src !== DEFAULT_AVATAR_SRC) {
                              event.currentTarget.src = DEFAULT_AVATAR_SRC;
                            }
                          }}
                        />
                      </div>
                      <div className="member-content">
                        <div className="member-name">{member.name}</div>
                        <div className="member-role">{member.role || 'Membre'}</div>
                        {member.created_at && (
                          <div className="member-meta">{formatRelativeTime(member.created_at)}</div>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
              
              <div className="members-footer">
                <a href="/members" className="btn btn-text">Voir tous les membres →</a>
              </div>
            </div>
            
            {/* PARTIE DROITE : Activité des membres (Le graphique) */}
            <div className="member-activity-chart-container">
              {/* NOUVEL EN-TÊTE : Titre et Sélecteur d'activité sur la même ligne logique */}
              <div className="chart-header">
                <h3 className="chart-title">Activité des membres</h3>
                {/* Le sélecteur d'activité est placé dans le header pour la mise en page CSS */}
                <div className="activity-tabs-container">
                  <button 
                    className={`activity-tab ${selectedActivity === 'projects' ? 'activity-tab-active' : ''}`}
                    onClick={() => setSelectedActivity('projects')}
                  >
                    Création des projets
                  </button>
                  <button 
                    className={`activity-tab ${selectedActivity === 'badges' ? 'activity-tab-active' : ''}`}
                    onClick={() => setSelectedActivity('badges')}
                  >
                    Attribution des badges
                  </button>
                </div>
              </div>
              
              <div className="chart-controls-and-graph">
                {/* Le sélecteur de période est placé ici, pour être au-dessus du graphique */}
                <div className="flex flex-row gap-4 justify-center items-center">
                  <button
                    className={`px-2 py-1 rounded-md text-sm ${selectedPeriod === '1w' ? 'btn-primary' : 'btn-outline'}`}
                    onClick={() => setSelectedPeriod('1w')}
                  >
                    1s
                  </button>
                  <button
                    className={`px-2 py-1 rounded-md text-sm ${selectedPeriod === '1m' ? 'btn-primary' : 'btn-outline'}`}
                    onClick={() => setSelectedPeriod('1m')}
                  >
                    1m
                  </button>
                  <button
                    className={`px-2 py-1 rounded-md text-sm ${selectedPeriod === '6m' ? 'btn-primary' : 'btn-outline'}`}
                    onClick={() => setSelectedPeriod('6m')}
                  >
                    6m
                  </button>
                </div>
              
                <div className="chart-placeholder">
                  {activityStatsLoading && (
                    <p className="chart-feedback-text">Chargement des statistiques...</p>
                  )}
                  {!activityStatsLoading && activityStatsError && (
                    <p className="chart-feedback-text error">{activityStatsError}</p>
                  )}
                  {!activityStatsLoading &&
                    !activityStatsError &&
                    !chartHasValues && (
                      <p className="chart-feedback-text">
                        Aucune donnée disponible pour cette période.
                      </p>
                    )}
                  {!activityStatsLoading &&
                    !activityStatsError &&
                    chartHasValues && (
                      <div className='flex flex-col gap-4 justify-center items-center'>
                        <div className="chart-mock">
                          <div className="chart-bars">
                            {chartDataset.barHeights.map((height, index) => (
                              <div
                                key={`${chartDataset.labels[index] || index}-${index}`}
                                className="chart-bar"
                                style={{
                                  height: `${height}%`,
                                  backgroundColor: chartDataset.colors[index] || chartDataset.colors[0],
                                }}
                                onMouseEnter={(e) => {
                                  setHoveredBar({
                                    index,
                                    value: chartDataset.values[index] ?? 0,
                                    label: chartDataset.labels[index] ?? '',
                                  });
                                  setMousePosition({ x: e.clientX, y: e.clientY });
                                }}
                                onMouseMove={(e) => {
                                  setMousePosition({ x: e.clientX, y: e.clientY });
                                }}
                                onMouseLeave={() => setHoveredBar(null)}
                              ></div>
                            ))}
                          </div>
                          <div className="chart-labels">
                            {chartDataset.labels.map((label, index) => (
                              <span key={`${label}-${index}`}>{label}</span>
                            ))}
                          </div>
                        </div>
                        {chartOnlyZeros && (
                          <p className="chart-feedback-text">
                            Aucune activité enregistrée sur cette période.
                          </p>
                        )}
                      </div>
                    )}
                  
                  {/* Tooltip */}
                  {hoveredBar && (
                    <div
                      className="chart-tooltip"
                      style={{
                        left: mousePosition.x + 10,
                        top: mousePosition.y - 10,
                      }}
                    >
                      <div className="tooltip-label">{hoveredBar.label}</div>
                      <div className="tooltip-value">
                        {hoveredBar.value} {selectedActivity === 'projects' ? 'projets' : 'badges'}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          {/* FIN NOUVELLE SECTION - SPANS BOTH COLUMNS */}
    </section>
  );
};

export default Dashboard;