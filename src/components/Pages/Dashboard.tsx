import React, { useEffect, useMemo, useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import {
  getCompanyStats,
  getCompanyProjects,
  getSchoolStats,
  getSchoolProjects,
  getTeacherStats,
  getCompanyActivity,
  getSchoolActivity,
  getTeacherActivity
} from '../../api/Dashboard';
import { OrganizationStatsResponse } from '../../types';
import { getOrganizationId } from '../../utils/projectMapper';
import './Dashboard.css';
import { DEFAULT_AVATAR_SRC } from '../UI/AvatarImage';

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

const Dashboard: React.FC = () => {
  const { state } = useAppContext();
  const [statsData, setStatsData] = useState<OrganizationStatsResponse | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<'1w' | '1m' | '6m'>('1m');
  const [selectedActivity, setSelectedActivity] = useState<'projects' | 'badges'>('projects');
  const [hoveredBar, setHoveredBar] = useState<{ index: number; value: number; label: string } | null>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [projects, setProjects] = useState<DashboardProject[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [projectsError, setProjectsError] = useState<string | null>(null);
  const [activities, setActivities] = useState<DashboardActivity[]>([]);
  const [activitiesLoading, setActivitiesLoading] = useState(false);
  const [activitiesError, setActivitiesError] = useState<string | null>(null);
  const organizationId = getOrganizationId(state.user, state.showingPageType);

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
        } else {
          // edu or teacher (teachers are tied to a school)
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

  const formatStatValue = (value?: number | null) => {
    if (statsLoading) return '...';
    if (value === undefined || value === null) return '—';
    return numberFormatter.format(value);
  };

  const overview = statsData?.overview;
  const statCards = [
    {
      key: 'total_members',
      label: 'Membres actifs',
      icon: '/icons_logo/Icon=Membres grand.svg',
      value: overview?.total_members,
      variant: 'stat-card',
    },
    {
      key: 'total_teachers',
      label: state.showingPageType === 'pro' ? 'Encadrants' : 'Enseignants',
      icon: '/icons_logo/Icon=Event grand.svg',
      value: overview?.total_teachers,
      variant: 'stat-card',
    },
    {
      key: 'total_students',
      label: state.showingPageType === 'pro' ? 'Participants suivis' : 'Étudiants',
      icon: '/icons_logo/Icon=Reseau.svg',
      value: overview?.total_students,
      variant: 'stat-card',
    },
    {
      key: 'total_projects',
      label: 'Projets en cours',
      icon: '/icons_logo/Icon=Projet grand.svg',
      value: overview?.total_projects,
      variant: 'stat-card2',
    },
    {
      key: 'total_levels',
      label: state.showingPageType === 'pro' ? 'Programmes actifs' : 'Niveaux',
      icon: '/icons_logo/Icon=Badges.svg',
      value: overview?.total_levels,
      variant: 'stat-card2',
    },
  ];

  // Chart data logic
  const getChartData = (period: '1w' | '1m' | '6m', activity: 'projects' | 'badges') => {
    const isProjects = activity === 'projects';
    
    switch (period) {
      case '1w':
        return {
          bars: isProjects ? [3, 5, 2, 7, 4, 6, 3] : [12, 18, 8, 25, 15, 22, 14],
          labels: ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'],
          color: isProjects ? '#5570F1' : '#16A34A'
        };
      case '1m':
        return {
          bars: isProjects ? [15, 18, 12, 22] : [45, 52, 38, 65],
          labels: ['S1', 'S2', 'S3', 'S4'],
          color: isProjects ? '#5570F1' : '#16A34A'
        };
      case '6m':
        return {
          bars: isProjects ? [50, 72, 45, 85, 62, 78] : [55, 80, 48, 95, 68, 88],
          labels: ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin'],
          color: isProjects ? '#5570F1' : '#16A34A'
        };
      default:
        return { bars: [], labels: [], color: '#5570F1' };
    }
  };

  const chartData = getChartData(selectedPeriod, selectedActivity);

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

    return [...projects]
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
          <img src="/TouKouLeur-Jaune.png" alt="TouKouLeur" className="association-logo" />
          <div className="section-title">
            <h1 className="welcome-title">Bonjour {state.user.name.split(' ')[0]} !</h1>
            <img src="/icons_logo/Icon=Tableau de bord.svg" alt="Tableau de bord" className="section-icon" />
            <span>Tableau de bord de l'Association TouKouLeur</span>
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

          {/* NOUVELLE SECTION : Fusion Membres Récents + Activité */}
          <div className="members-overview-section">
            
            {/* PARTIE GAUCHE : Membres récents */}
            <div className="recent-members-container">
              <div className="recent-members-header">
                <img src="/icons_logo/Icon=Membres.svg" alt="Membres" className="members-icon" />
                <h3>Membres récents</h3>
              </div>
              
              <div className="member-list">
                {/* Membre 1 : Marie Dubois */}
                <div className="member-item">
                  <div className="member-avatar">
                    <img src="https://randomuser.me/api/portraits/women/44.jpg" alt="Marie Dubois" />
                  </div>
                  <div className="member-content">
                    <div className="member-name">Marie Dubois</div>
                    <div className="member-role">Développeur Front-End</div>
                  </div>
                </div>

                {/* Membre 2 : Thomas Leroy */}
                <div className="member-item">
                  <div className="member-avatar">
                    <img src="https://randomuser.me/api/portraits/men/32.jpg" alt="Thomas Leroy" />
                  </div>
                  <div className="member-content">
                    <div className="member-name">Thomas Leroy</div>
                    <div className="member-role">Designer UX/UI</div>
                  </div>
                </div>

                {/* Membre 3 : Sophie Martin */}
                <div className="member-item">
                  <div className="member-avatar">
                    <img src="https://randomuser.me/api/portraits/women/67.jpg" alt="Sophie Martin" />
                  </div>
                  <div className="member-content">
                    <div className="member-name">Sophie Martin</div>
                    <div className="member-role">Chef de Projet</div>
                  </div>
                </div>
              </div>
              
              <div className="members-footer">
                <a href="/members" className="btn btn-text">Voir tous les membres →</a>
              </div>
            </div>
            
            {/* PARTIE DROITE : Activité des membres (Le graphique) */}
            <div className="chart-container member-activity-chart">
              {/* NOUVEL EN-TÊTE : Titre et Sélecteur d'activité sur la même ligne logique */}
              <div className="chart-header">
                <h3 className="chart-title">Activité des membres</h3>
                {/* Le sélecteur d'activité est placé dans le header pour la mise en page CSS */}
                <div className="activity-type-selector">
                  <button 
                    className={`btn btn-sm ${selectedActivity === 'projects' ? 'btn-primary' : 'btn-outline'}`}
                    onClick={() => setSelectedActivity('projects')}
                  >
                    Création des projets
                  </button>
                  <button 
                    className={`btn btn-sm ${selectedActivity === 'badges' ? 'btn-primary' : 'btn-outline'}`}
                    onClick={() => setSelectedActivity('badges')}
                  >
                    Attribution des badges
                  </button>
                </div>
              </div>
              
              <div className="chart-controls-and-graph">
                {/* Le sélecteur de période est placé ici, pour être au-dessus du graphique */}
                <div className="period-selector">
                  <button
                    className={`btn btn-sm ${selectedPeriod === '1w' ? 'btn-primary' : 'btn-outline'}`}
                    onClick={() => setSelectedPeriod('1w')}
                  >
                    1s
                  </button>
                  <button
                    className={`btn btn-sm ${selectedPeriod === '1m' ? 'btn-primary' : 'btn-outline'}`}
                    onClick={() => setSelectedPeriod('1m')}
                  >
                    1m
                  </button>
                  <button
                    className={`btn btn-sm ${selectedPeriod === '6m' ? 'btn-primary' : 'btn-outline'}`}
                    onClick={() => setSelectedPeriod('6m')}
                  >
                    6m
                  </button>
                </div>
              
                <div className="chart-placeholder">
                  <div className="chart-mock">
                    <div className="chart-bars">
                      {chartData.bars.map((height, index) => (
                        <div 
                          key={index}
                          className="chart-bar" 
                          style={{ 
                            height: `${height}%`,
                            backgroundColor: chartData.color
                          }}
                          onMouseEnter={(e) => {
                            setHoveredBar({ 
                              index, 
                              value: Math.round(height), 
                              label: chartData.labels[index] 
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
                      {chartData.labels.map((label, index) => (
                        <span key={index}>{label}</span>
                      ))}
                    </div>
                  </div>
                  
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
          {/* FIN NOUVELLE SECTION */}



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
                <p className="activity-empty">Chargement des activités...</p>
              )}
              {!activitiesLoading && activitiesError && (
                <p className="activity-empty error">{activitiesError}</p>
              )}
              {!activitiesLoading && !activitiesError && activities.length === 0 && (
                <p className="activity-empty">Aucune activité récente pour le moment</p>
              )}
              {!activitiesLoading && !activitiesError && activities.map((activity) => (
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

          {/* Charts and Analytics (On retire le graphique d'activité, on garde juste la répartition des badges) */}
          <div className="dashboard-charts">
            {/* On retire le premier chart-container (Activité des membres) */}

            <div className="chart-container">
              <div className="chart-header">
                <h3>Répartition des badges</h3>
              </div>
              {/* ... Contenu de la répartition des badges (pie chart) ... */}
              <div className="chart-placeholder">
                <div className="pie-chart-mock">
                  <div className="pie-segment segment-1"></div>
                  <div className="pie-segment segment-2"></div>
                  <div className="pie-segment segment-3"></div>
                  <div className="pie-segment segment-4"></div>
                </div>
                <div className="pie-legend">
                  <div className="legend-item">
                    <span className="legend-color" style={{ backgroundColor: '#10b981' }}></span>
                    <span>Niveau 1 (45%)</span>
                  </div>
                  <div className="legend-item">
                    <span className="legend-color" style={{ backgroundColor: '#3b82f6' }}></span>
                    <span>Niveau 2 (30%)</span>
                  </div>
                  <div className="legend-item">
                    <span className="legend-color" style={{ backgroundColor: '#f59e0b' }}></span>
                    <span>Niveau 3 (20%)</span>
                  </div>
                  <div className="legend-item">
                    <span className="legend-color" style={{ backgroundColor: '#ef4444' }}></span>
                    <span>Niveau 4 (5%)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Dashboard;