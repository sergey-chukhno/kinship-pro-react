import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../context/AppContext';
import { Project } from '../../types';
import ProjectModal from '../Modals/ProjectModal';
import SubscriptionRequiredModal from '../Modals/SubscriptionRequiredModal';
import ProjectCard from '../Projects/ProjectCard';
import './Projects.css';

// Imports API (Ajustez les chemins si nécessaire, basés sur la structure de Members.tsx)
import { getCurrentUser } from '../../api/Authentication';
import { deleteProject, getAllProjects, getAllUserProjects} from '../../api/Project';
import { getSchoolProjects, getCompanyProjects } from '../../api/Dashboard';
import { getTeacherProjects } from '../../api/Projects';
import { getProjectBadges } from '../../api/Badges';
import { mapApiProjectToFrontendProject, getOrganizationId } from '../../utils/projectMapper';

/**
 * Fetches badge counts for all projects and updates them with the correct counts
 * @param projects - Array of projects to update with badge counts
 * @returns Updated projects with badge counts
 */
const fetchAndUpdateBadgeCounts = async (projects: Project[]): Promise<Project[]> => {
  if (projects.length === 0) {
    return projects;
  }

  try {
    // Fetch badge counts for all projects in parallel
    const badgeCountPromises = projects.map(async (project) => {
      try {
        const projectId = parseInt(project.id);
        if (isNaN(projectId)) {
          console.warn(`[Badge Counter] Invalid project ID: ${project.id}`);
          return { projectId: project.id, count: 0 };
        }
        const badges = await getProjectBadges(projectId);
        return { projectId: project.id, count: badges.meta?.total_count || badges.data.length };
      } catch (error) {
        console.error(`[Badge Counter] Error fetching badges for project ${project.id}:`, error);
        return { projectId: project.id, count: 0 };
      }
    });

    const badgeCounts = await Promise.all(badgeCountPromises);
    
    // Create a map of projectId -> badgeCount
    const badgeCountMap = new Map<string, number>();
    badgeCounts.forEach(({ projectId, count }) => {
      badgeCountMap.set(projectId, count);
    });

    // Update projects with badge counts
    return projects.map(project => ({
      ...project,
      badges: badgeCountMap.get(project.id) || 0
    }));
  } catch (error) {
    console.error('[Badge Counter] Error fetching badge counts:', error);
    // Return projects with 0 badges if fetching fails
    return projects.map(project => ({
      ...project,
      badges: 0
    }));
  }
};

const Projects: React.FC = () => {
  const { state, updateProject, setCurrentPage, setSelectedProject } = useAppContext();
  const { selectedProject } = state;
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [isSubscriptionModalOpen, setIsSubscriptionModalOpen] = useState(false);
  
  // State local pour stocker les projets récupérés de l'API
  const [projects, setProjects] = useState<Project[]>([]);
  const [myProjects, setMyProjects] = useState<Project[]>([]);
  
  // Pagination state for "Nouveautés" tab (public projects for user dashboard, org projects for pro/edu)
  const [projectPage, setProjectPage] = useState(1);
  const [projectTotalPages, setProjectTotalPages] = useState(1);
  const [projectTotalCount, setProjectTotalCount] = useState(0);
  
  // Pagination state for "Mes projets" tab (user's own projects)
  const [myProjectsPage, setMyProjectsPage] = useState(1);
  const [myProjectsTotalPages, setMyProjectsTotalPages] = useState(1);
  const [myProjectsTotalCount, setMyProjectsTotalCount] = useState(0);
  
  // Tab state for personal users
  // Teachers should only see their own projects, not public projects
  const isPersonalUser = state.showingPageType === 'teacher' || state.showingPageType === 'user';
  const isTeacher = state.showingPageType === 'teacher';
  // For teachers, default to 'mes-projets' since they shouldn't see public projects
  // For regular users, default to 'nouveautes' to show public projects
  const [activeTab, setActiveTab] = useState<'nouveautes' | 'mes-projets'>(isTeacher ? 'mes-projets' : 'nouveautes');

  // Search and filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [pathwayFilter, setPathwayFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [organizationFilter, setOrganizationFilter] = useState<'my-org' | 'all-public' | 'school' | 'other-orgs'>('my-org');
  const [visibilityFilter, setVisibilityFilter] = useState('all');

  // Fonction pour obtenir l'organizationId sélectionné (comme dans Dashboard)
  const getSelectedOrganizationId = (): number | undefined => {
    const savedContextId = localStorage.getItem('selectedContextId');
    const savedContextType = localStorage.getItem('selectedContextType') as 'school' | 'company' | 'teacher' | 'user' | null;
    
    // Si on a un contexte sauvegardé et que c'est une école ou une entreprise
    if (savedContextId && savedContextType && (savedContextType === 'school' || savedContextType === 'company')) {
      // Vérifier que l'utilisateur a toujours accès à ce contexte
      if (savedContextType === 'company') {
        const company = state.user.available_contexts?.companies?.find(
          (c: any) => c.id.toString() === savedContextId && (c.role === 'admin' || c.role === 'superadmin')
        );
        if (company) {
          console.log('✅ [Projects] Utilisation du contexte entreprise sauvegardé:', {
            companyId: Number(savedContextId),
            companyName: company.name,
            role: company.role
          });
          return Number(savedContextId);
        }
      } else if (savedContextType === 'school') {
        const school = state.user.available_contexts?.schools?.find(
          (s: any) => s.id.toString() === savedContextId && (s.role === 'admin' || s.role === 'superadmin')
        );
        if (school) {
          console.log('✅ [Projects] Utilisation du contexte école sauvegardé:', {
            schoolId: Number(savedContextId),
            schoolName: school.name,
            role: school.role
          });
          return Number(savedContextId);
        }
      }
    }
    
    // Sinon, utiliser la logique par défaut
    const defaultOrgId = getOrganizationId(state.user, state.showingPageType);
    console.log('⚠️ [Projects] Utilisation du contexte par défaut:', {
      organizationId: defaultOrgId,
      showingPageType: state.showingPageType
    });
    return defaultOrgId;
  };

  // Fonction pour récupérer les projets publics (Nouveautés)
  const fetchPublicProjects = React.useCallback(async (page: number = 1) => {
    try {
      const currentUser = await getCurrentUser();
      
      // Pour les utilisateurs personnels, toujours récupérer tous les projets publics
      // (le filtre d'organisation n'est pas applicable)
      const apiParams: { page?: number; per_page?: number } = {
        page: page,
        per_page: 12
      };
      
      const response = await getAllProjects(apiParams);
      const rawProjects = response.data?.data || response.data || [];
      // Filtrer uniquement les projets publics
      const publicProjects = rawProjects.filter((p: any) => !p.private);
      const formattedProjects: Project[] = publicProjects.map((p: any) => {
        return mapApiProjectToFrontendProject(p, state.showingPageType, currentUser.data);
      });
      // Fetch and update badge counts
      const projectsWithBadges = await fetchAndUpdateBadgeCounts(formattedProjects);
      setProjects(projectsWithBadges);
      
      // Extract and store pagination metadata
      if (response.data?.meta) {
        setProjectTotalPages(response.data.meta.total_pages || 1);
        setProjectTotalCount(response.data.meta.total_count || 0);
      }
    } catch (err) {
      console.error('Erreur lors de la récupération des projets publics:', err);
      setProjects([]);
      setProjectTotalPages(1);
      setProjectTotalCount(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.showingPageType, organizationFilter]);

  // Fonction pour récupérer les projets de l'utilisateur (Mes projets)
  const fetchMyProjects = React.useCallback(async (page: number = 1) => {
    try {
      const currentUser = await getCurrentUser();
      
      if (state.showingPageType === 'teacher') {
        // Pour les enseignants : utiliser getTeacherProjects
        const response = await getTeacherProjects({ page: page, per_page: 12 });
        const rawProjects = response.data || [];
        const formattedProjects: Project[] = rawProjects.map((p: any) => {
          return mapApiProjectToFrontendProject(p, state.showingPageType, currentUser.data);
        });
        // Fetch and update badge counts
        const projectsWithBadges = await fetchAndUpdateBadgeCounts(formattedProjects);
        setMyProjects(projectsWithBadges);
        
        // Extract and store pagination metadata
        if (response.meta) {
          setMyProjectsTotalPages(response.meta.total_pages || 1);
          setMyProjectsTotalCount(response.meta.total_count || 0);
        }
      } else if (state.showingPageType === 'user') {
        // Pour les utilisateurs : utiliser getAllUserProjects
        const response = await getAllUserProjects({ page: page, per_page: 12 });
        const rawProjects = response.data?.data || response.data || [];
        const formattedProjects: Project[] = rawProjects.map((p: any) => {
          return mapApiProjectToFrontendProject(p, state.showingPageType, currentUser.data);
        });
        // Fetch and update badge counts
        const projectsWithBadges = await fetchAndUpdateBadgeCounts(formattedProjects);
        setMyProjects(projectsWithBadges);
        
        // Extract and store pagination metadata
        if (response.data?.meta) {
          setMyProjectsTotalPages(response.data.meta.total_pages || 1);
          setMyProjectsTotalCount(response.data.meta.total_count || 0);
        }
      }
    } catch (err) {
      console.error('Erreur lors de la récupération de mes projets:', err);
      setMyProjects([]);
      setMyProjectsTotalPages(1);
      setMyProjectsTotalCount(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.showingPageType]);

  // Fonction pour récupérer les projets (réutilisable)
  const fetchProjects = React.useCallback(async (page: number = 1) => {
    try {
      const currentUser = await getCurrentUser();

      if (isTeacher) {
        // Pour les enseignants : charger uniquement leurs projets (créés + participants)
        // Ne pas charger les projets publics
        await fetchMyProjects(page);
      } else if (state.showingPageType === 'user') {
        // Pour les utilisateurs personnels : charger les projets publics (Nouveautés)
        await fetchPublicProjects(page);
        // Charger aussi les projets de l'utilisateur (Mes projets)
        await fetchMyProjects(myProjectsPage);
      } else {
        // Pour les rôles pro et edu, gérer les différents filtres d'organisation
        let response: any;
        let rawProjects: any[] = [];
        let needsClientSideFiltering = false;
        
        const isEdu = state.showingPageType === 'edu';
        const contextId = getSelectedOrganizationId();

        if (organizationFilter === 'my-org') {
          // Mon organisation / Mon établissement: utiliser l'API spécifique à l'organisation
          if (!contextId) {
            console.warn('⚠️ [Projects] Aucun contextId trouvé pour le type:', state.showingPageType);
            setProjects([]);
            setProjectTotalPages(1);
            setProjectTotalCount(0);
            return;
          }

          if (isEdu) {
            // Use getSchoolProjects for schools (returns all school projects + branches + partners)
            response = await getSchoolProjects(contextId, true, 12, page);
          } else {
            // Use getCompanyProjects for companies (returns all company projects + branches + partners)
            response = await getCompanyProjects(contextId, true, 12, page);
          }
          rawProjects = response.data?.data || response.data || [];
        } else if (organizationFilter === 'all-public') {
          // Tous les projets: utiliser getAllProjects sans filtre, puis filtrer côté client pour les projets publics
          response = await getAllProjects({ page: page, per_page: 12 });
          rawProjects = response.data?.data || response.data || [];
          needsClientSideFiltering = true;
        } else if (organizationFilter === 'school') {
          // Établissement: utiliser getAllProjects avec organization_type: 'établissement'
          response = await getAllProjects({ organization_type: 'établissement', page: page, per_page: 12 });
          rawProjects = response.data?.data || response.data || [];
        } else if (organizationFilter === 'other-orgs') {
          // Autres organisations: utiliser getAllProjects sans filtre, puis filtrer côté client
          response = await getAllProjects({ page: page, per_page: 12 });
          rawProjects = response.data?.data || response.data || [];
          needsClientSideFiltering = true;
        } else {
          // Fallback: should not happen, but TypeScript needs this
          console.warn('⚠️ [Projects] Unknown organization filter:', organizationFilter);
          setProjects([]);
          setProjectTotalPages(1);
          setProjectTotalCount(0);
          return;
        }

        // Client-side filtering for 'all-public' and 'other-orgs'
        if (needsClientSideFiltering) {
          if (organizationFilter === 'all-public') {
            // Filter to only public projects
            rawProjects = rawProjects.filter((p: any) => !p.private);
          } else if (organizationFilter === 'other-orgs') {
            // Filter to show only public projects from other companies/associations
            // Exclude: school projects, user's own organization, private projects, projects without company_ids
            rawProjects = rawProjects.filter((p: any) => {
              // Only show public projects
              if (p.private) {
                return false;
              }
              
              // Exclude school projects (projects with school_levels or school_level_ids)
              if (p.school_levels && Array.isArray(p.school_levels) && p.school_levels.length > 0) {
                return false;
              }
              if (p.school_level_ids && Array.isArray(p.school_level_ids) && p.school_level_ids.length > 0) {
                return false;
              }
              
              // Only include projects that have company_ids (are linked to companies/associations)
              if (!p.company_ids || !Array.isArray(p.company_ids) || p.company_ids.length === 0) {
                return false;
              }
              
              // Exclude if project is linked to user's own organization
              if (contextId) {
                if (isEdu) {
                  // For edu: exclude if project has school_levels with this school_id
                  // (This check is redundant with the school check above, but keeping for safety)
                  if (p.school_levels && Array.isArray(p.school_levels)) {
                    const hasUserSchool = p.school_levels.some((sl: any) => sl.school_id === contextId);
                    if (hasUserSchool) {
                      return false;
                    }
                  }
                } else {
                  // For pro: exclude if project has company_ids that include this company_id
                  if (p.company_ids.includes(contextId)) {
                    return false;
                  }
                }
              }
              
              // Include only public projects from other companies/associations (not schools, not user's org, has company_ids)
              return true;
            });
          }
        }

        // Mapping des données API vers le type Project (using centralized mapper)
        const formattedProjects: Project[] = rawProjects.map((p: any) => {
            return mapApiProjectToFrontendProject(p, state.showingPageType, currentUser.data);
        });

        // Fetch and update badge counts
        const projectsWithBadges = await fetchAndUpdateBadgeCounts(formattedProjects);
        setProjects(projectsWithBadges);
        
        // Extract and store pagination metadata
        if (response && response.data?.meta) {
          let totalPages = response.data.meta.total_pages || 1;
          let totalCount = response.data.meta.total_count || 0;
          
          // For client-side filtering, handle pagination differently based on filter type
          if (needsClientSideFiltering) {
            const filteredCount = rawProjects.length;
            
            if (organizationFilter === 'all-public') {
              // For 'all-public': Keep API pagination metadata
              // The API returns public + private projects, but pagination is still valid
              // Some pages might have fewer visible projects after filtering, but pagination works
              // We keep the API's metadata so users can navigate through all pages
              // (totalCount and totalPages remain from API)
            } else if (organizationFilter === 'other-orgs') {
              // For 'other-orgs': Recalculate pagination based on filtered results
              // Since we're filtering out schools and user's org, the API metadata is not accurate
              if (filteredCount < 12) {
                // Likely all filtered results fit on one page
                totalCount = filteredCount;
                totalPages = 1;
              } else {
                // We have 12 filtered projects, might be more on other pages
                // Note: This is an approximation - we can't know the true total without fetching all pages
                totalCount = filteredCount; // At least this many
                totalPages = Math.max(1, Math.ceil(filteredCount / 12));
              }
            }
          }
          
          setProjectTotalPages(totalPages);
          setProjectTotalCount(totalCount);
        }
      }
    } catch (err) {
      console.error('Erreur lors de la récupération des projets:', err);
      setProjects([]);
      setProjectTotalPages(1);
      setProjectTotalCount(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.showingPageType, state.user, fetchPublicProjects, fetchMyProjects, isPersonalUser, isTeacher, organizationFilter, myProjectsPage]); // getSelectedOrganizationId utilise state.user, donc c'est couvert

  // --- Fetch des projets au chargement ---
  useEffect(() => {
    // Reset pagination when dashboard type changes
    setProjectPage(1);
    setMyProjectsPage(1);
    if (isTeacher) {
      fetchMyProjects(1);
    } else if (state.showingPageType === 'user') {
      fetchPublicProjects(1);
      fetchMyProjects(1);
    } else {
      fetchProjects(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.showingPageType]); // Retirer state.user.available_contexts pour éviter les re-renders, le contexte est lu depuis localStorage

  // Fetch projects when projectPage changes (for pro/edu dashboards and user "Nouveautés" tab)
  useEffect(() => {
    if (isTeacher) {
      // Teachers only see their own projects
      fetchMyProjects(myProjectsPage);
    } else if (state.showingPageType === 'user' && activeTab === 'nouveautes') {
      fetchPublicProjects(projectPage);
    } else if (!isPersonalUser) {
      // Pour les rôles pro et edu, recharger les projets avec la page
      fetchProjects(projectPage);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectPage]);

  // Fetch my projects when myProjectsPage changes (for user/teacher "Mes projets" tab)
  useEffect(() => {
    if ((state.showingPageType === 'user' && activeTab === 'mes-projets') || isTeacher) {
      fetchMyProjects(myProjectsPage);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myProjectsPage]);

  // Reset pagination and re-fetch when filters change
  useEffect(() => {
    // Reset to page 1 when filters change
    setProjectPage(1);
    setMyProjectsPage(1);
    
    if (isTeacher) {
      // Teachers only see their own projects, no public projects
      fetchMyProjects(1);
    } else if (state.showingPageType === 'user' && activeTab === 'nouveautes') {
      fetchPublicProjects(1);
    } else if (!isPersonalUser) {
      // Pour les rôles pro et edu, recharger les projets avec le nouveau filtre
      fetchProjects(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationFilter, statusFilter, pathwayFilter, searchTerm, startDate, endDate, visibilityFilter, isPersonalUser, isTeacher, activeTab]);


  const handleCreateProject = () => {
    // Check if user is a personal user (teacher or user)
    const isPersonalUser = state.showingPageType === 'user';
    
    if (isPersonalUser) {
      // Show subscription required modal for personal users
      setIsSubscriptionModalOpen(true);
    } else {
      // Open project creation modal for organizational users
      setSelectedProject(null);
      setIsProjectModalOpen(true);
    }
  };

  const handleEditProject = (project: Project) => {
    setSelectedProject(project);
    setIsProjectModalOpen(true);
  };

  const handleSaveProject = async (projectData: Omit<Project, 'id'>) => {
    if (selectedProject) {
      // Mettre à jour localement et via le contexte (si besoin de persistance API, ajouter l'appel ici)
      updateProject(selectedProject.id, projectData);
      setProjects(prev => prev.map(p => p.id === selectedProject.id ? { ...p, ...projectData } : p));
    } else {
      // Pour la création, on ne fait pas de mise à jour locale car on va recharger depuis l'API
      // Le projet sera créé via l'API dans ProjectModal
    }
    setIsProjectModalOpen(false);
    setSelectedProject(null);
    
    // Rafraîchir la liste des projets après création/modification
    await fetchProjects();
    // Si on est sur l'onglet "Mes projets", rafraîchir aussi
    if (isPersonalUser && activeTab === 'mes-projets') {
      await fetchMyProjects();
    }
  };

  const handleManageProject = (project: Project) => {
    setSelectedProject(project);
    setCurrentPage('project-management');
  };

  const handleDeleteProject = async (projectId: string) => {
    try {
      await deleteProject(Number(projectId));
      // Mise à jour de l'affichage local
      setProjects(prev => prev.filter(p => p.id !== projectId));
      setMyProjects(prev => prev.filter(p => p.id !== projectId));
      setSelectedProject(null);
      
      // Rafraîchir si on est sur l'onglet "Mes projets"
      if (isPersonalUser && activeTab === 'mes-projets') {
        await fetchMyProjects();
      }
    } catch (err) {
      console.error('Erreur lors de la suppression du projet:', err);
    }
  };

  const handleExportProjects = () => {
    console.log('Export projects');
  };

  // Select projects to display based on active tab
  // Teachers only see their own projects (myProjects)
  // Regular users see public projects or their own projects based on activeTab
  // Organization users (school/company) see their organization's projects
  const projectsToDisplay = isTeacher 
    ? myProjects  // Teachers only see their own projects
    : (isPersonalUser 
      ? (activeTab === 'nouveautes' ? projects : myProjects)
      : projects);


  // Filter projects based on search and filter criteria
  // Note: On filtre maintenant sur 'projectsToDisplay' (local state) et non 'state.projects'
  const filteredProjects = projectsToDisplay.filter(project => {
    // Search filter
    const matchesSearch = searchTerm === '' ||
      project.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.owner.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (project.pathway && project.pathway.toLowerCase().includes(searchTerm.toLowerCase())) ||
      project.status.toLowerCase().includes(searchTerm.toLowerCase());

    // Pathway filter
    const matchesPathway = pathwayFilter === 'all' || project.pathway === pathwayFilter;

    // Status filter
    const matchesStatus = statusFilter === 'all' ||
      project.status === statusFilter ||
      (statusFilter === 'À venir' && project.status === 'coming') ||
      (statusFilter === 'En cours' && project.status === 'in_progress') ||
      (statusFilter === 'Terminée' && project.status === 'ended');

    // Organization filter is now handled by API, no client-side filtering needed
    const matchesOrganization = true;

    // Visibility filter
    const matchesVisibility = visibilityFilter === 'all' ||
      (visibilityFilter === 'public' && (!project.visibility || project.visibility === 'public')) ||
      (visibilityFilter === 'private' && project.visibility === 'private');

    // Date filters
    let matchesStartDate = true;
    let matchesEndDate = true;
    
    if (startDate && project.startDate) {
      matchesStartDate = new Date(project.startDate) >= new Date(startDate);
    }
    
    if (endDate && project.endDate) {
      matchesEndDate = new Date(project.endDate) <= new Date(endDate);
    }

    return matchesSearch && matchesPathway && matchesStatus && matchesOrganization && matchesVisibility && matchesStartDate && matchesEndDate;
  });

  return (
    <section className="flex flex-col gap-12 p-8 with-sidebar">
      {/* Section Title + Actions */}
      <div className="flex justify-between items-start">
        <div className="flex gap-2 items-center w-full section-title-left">
          <img src="/icons_logo/Icon=projet.svg" alt="Projets" className="section-icon" />
          <h2>{(state.showingPageType === 'teacher' || state.showingPageType === 'user') ? 'Rechercher une idée de projet sur Kinship' : 'Gestion des projets'}</h2>
        </div>
        <div className="projects-actions">
          <div className="dropdown" style={{ position: 'relative' }}>
            <button className="btn btn-outline" disabled title="Disponible très bientôt" onClick={handleExportProjects}>
              <i className="fas fa-download"></i> Exporter
            </button>
          </div>
          <button className="btn btn-primary" onClick={handleCreateProject}>
            <i className="fas fa-plus"></i> Créer un projet
          </button>
        </div>
      </div>

      {/* Tabs for personal users (but not teachers - teachers only see their projects) */}
      {state.showingPageType === 'user' && (
        <div className="filter-tabs" style={{ marginBottom: '24px' }}>
          <button 
            className={`filter-tab ${activeTab === 'nouveautes' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('nouveautes');
              setProjectPage(1); // Reset pagination when switching tabs
            }}
          >
            Nouveautés ({projectTotalCount > 0 ? projectTotalCount : projects.length})
          </button>
          <button 
            className={`filter-tab ${activeTab === 'mes-projets' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('mes-projets');
              setMyProjectsPage(1); // Reset pagination when switching tabs
            }}
          >
            Mes projets ({myProjectsTotalCount > 0 ? myProjectsTotalCount : myProjects.length})
          </button>
        </div>
      )}

      {/* Search Bar */}
      <div className="w-full projects-search-container">
        <div className="search-bar">
          <i className="fas fa-search search-icon"></i>
          <input
            type="text"
            className="w-full search-input"
            placeholder="Rechercher un projet par titre, mot clé, parcours, statut..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="filters-container">
          {/* Organization filter only for pro and edu dashboards */}
          {(state.showingPageType === 'pro' || state.showingPageType === 'edu') && (
            <div className="filter-group">
              <label htmlFor="organization-filter">Par Organisation</label>
              <select
                id="organization-filter"
                className="filter-select"
                value={organizationFilter}
                onChange={(e) => setOrganizationFilter(e.target.value as 'my-org' | 'all-public' | 'school' | 'other-orgs')}
              >
                <option value="my-org">
                  {state.showingPageType === 'edu' ? 'Mon établissement' : 'Mon organisation'}
                </option>
                <option value="all-public">Tous les projets</option>
                <option value="school">Établissement</option>
                <option value="other-orgs">Autres organisations</option>
              </select>
            </div>
          )}
          <div className="filter-group">
            <label htmlFor="pathway-filter">Parcours</label>
            <select
              id="pathway-filter"
              className="filter-select"
              value={pathwayFilter}
              onChange={(e) => setPathwayFilter(e.target.value)}
            >
              <option value="all">Tous les parcours</option>
              <option value="citoyen">Citoyen</option>
              <option value="creativite">Créativité</option>
              <option value="fabrication">Fabrication</option>
              <option value="psychologie">Psychologie</option>
              <option value="innovation">Innovation</option>
              <option value="education">Éducation</option>
              <option value="technologie">Technologie</option>
              <option value="sante">Santé</option>
              <option value="environnement">Environnement</option>
            </select>
          </div>
          <div className="filter-group">
            <label htmlFor="status-filter">Statut</label>
            <select
              id="status-filter"
              className="filter-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">Tous les statuts</option>
              <option value="À venir">À venir</option>
              <option value="En cours">En cours</option>
              <option value="Terminée">Terminée</option>
            </select>
          </div>
          <div className="filter-group">
            <label htmlFor="start-date-filter">Date de début</label>
            <input
              id="start-date-filter"
              type="date"
              className="filter-select"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div className="filter-group">
            <label htmlFor="end-date-filter">Date de fin</label>
            <input
              id="end-date-filter"
              type="date"
              className="filter-select"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
          <div className="filter-group">
            <label htmlFor="visibility-filter">Visibilité</label>
            <select
              id="visibility-filter"
              className="filter-select"
              value={visibilityFilter}
              onChange={(e) => setVisibilityFilter(e.target.value)}
            >
              <option value="all">Tous les projets</option>
              <option value="public">Publics</option>
              <option value="private">Privés</option>
            </select>
          </div>
        </div>
      </div>

      {filteredProjects.length > 0 ? (
        <>
          <div className="projects-grid">
            {filteredProjects.map((project) => {
              const isPersonalUser = state.showingPageType === 'teacher' || state.showingPageType === 'user';
              // Pour les utilisateurs personnels, ne pas afficher le bouton "Supprimer"
              // Pour les autres, le bouton sera affiché mais le backend vérifiera les permissions
              const canDelete = !isPersonalUser;
              
              return (
                <ProjectCard
                  key={project.id}
                  project={project}
                  onEdit={() => handleEditProject(project)}
                  onManage={() => handleManageProject(project)}
                  onDelete={canDelete ? () => handleDeleteProject(project.id) : undefined}
                  isPersonalUser={isPersonalUser}
                />
              );
            })}
          </div>
          
          {/* Pagination Controls */}
          {(() => {
            // Determine which pagination state to use based on active tab
            const currentPage = (state.showingPageType === 'user' && activeTab === 'mes-projets') ? myProjectsPage : projectPage;
            const totalPages = (state.showingPageType === 'user' && activeTab === 'mes-projets') ? myProjectsTotalPages : projectTotalPages;
            const totalCount = (state.showingPageType === 'user' && activeTab === 'mes-projets') ? myProjectsTotalCount : projectTotalCount;
            const setCurrentPage = (state.showingPageType === 'user' && activeTab === 'mes-projets') ? setMyProjectsPage : setProjectPage;
            
            if (totalPages <= 1) return null;
            
            return (
              <div className="pagination-container">
                <div className="pagination-info">
                  Page {currentPage} sur {totalPages} ({totalCount} projet{totalCount > 1 ? 's' : ''})
                </div>
                <div className="pagination-controls">
                  <button
                    className="pagination-btn"
                    onClick={() => {
                      const newPage = currentPage - 1;
                      setCurrentPage(newPage);
                    }}
                    disabled={currentPage === 1}
                  >
                    <i className="fas fa-chevron-left"></i> Précédent
                  </button>
                  <div className="pagination-pages">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum: number;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }
                      return (
                        <button
                          key={pageNum}
                          className={`pagination-page-btn ${currentPage === pageNum ? 'active' : ''}`}
                          onClick={() => setCurrentPage(pageNum)}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>
                  <button
                    className="pagination-btn"
                    onClick={() => {
                      const newPage = currentPage + 1;
                      setCurrentPage(newPage);
                    }}
                    disabled={currentPage === totalPages}
                  >
                    Suivant <i className="fas fa-chevron-right"></i>
                  </button>
                </div>
              </div>
            );
          })()}
        </>
      ) : (
        <div className="no-projects-message">
          <div className="no-projects-content">
            <i className="fas fa-folder-open" style={{ fontSize: '3rem', color: '#9ca3af', marginBottom: '1rem' }}></i>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#374151', marginBottom: '0.5rem' }}>
              Aucun projet trouvé
            </h3>
            <p style={{ color: '#6b7280', fontSize: '0.95rem' }}>
              {searchTerm || pathwayFilter !== 'all' || statusFilter !== 'all' || organizationFilter !== 'my-org' || visibilityFilter !== 'all' || startDate || endDate
                ? 'Aucun projet ne correspond à vos critères de recherche. Essayez de modifier vos filtres.'
                : 'Il n\'y a pas encore de projets disponibles.'}
            </p>
          </div>
        </div>
      )}

      {isProjectModalOpen && (
        <ProjectModal
          project={selectedProject}
          onClose={() => {
            setIsProjectModalOpen(false);
            setSelectedProject(null);
          }}
          onSave={handleSaveProject}
        />
      )}

      {isSubscriptionModalOpen && (
        <SubscriptionRequiredModal
          onClose={() => setIsSubscriptionModalOpen(false)}
          featureName="La création de projets"
        />
      )}

    </section>
  );
};

export default Projects;