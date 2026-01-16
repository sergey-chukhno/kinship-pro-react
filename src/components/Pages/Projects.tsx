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
import { mapApiProjectToFrontendProject, getOrganizationId } from '../../utils/projectMapper';
import { canUserManageProject, canUserDeleteProject } from '../../utils/projectPermissions';

const Projects: React.FC = () => {
  const { state, updateProject, setCurrentPage, setSelectedProject } = useAppContext();
  const { selectedProject } = state;
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [isSubscriptionModalOpen, setIsSubscriptionModalOpen] = useState(false);
  
  // State local pour stocker les projets récupérés de l'API
  const [projects, setProjects] = useState<Project[]>([]);
  const [myProjects, setMyProjects] = useState<Project[]>([]);
  // Store raw API project data for permission checks (projectId -> raw API project)
  const [rawProjectsMap, setRawProjectsMap] = useState<Map<string, any>>(new Map());
  // Store all filtered projects for client-side pagination (for filters that need client-side filtering)
  const [allFilteredProjects, setAllFilteredProjects] = useState<any[]>([]);
  
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
  const [organizationFilter, setOrganizationFilter] = useState<'my-org' | 'all-public' | 'school' | 'other-orgs' | 'other-schools' | 'companies'>('my-org');
  const [visibilityFilter, setVisibilityFilter] = useState('all');

  // Loading states
  const [isLoadingProjects, setIsLoadingProjects] = useState(false);
  const [isLoadingBadges, setIsLoadingBadges] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);

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
    setIsLoadingProjects(true);
    try {
      const currentUser = await getCurrentUser();
      
      // Pour les utilisateurs personnels, toujours récupérer tous les projets publics
      // (le filtre d'organisation n'est pas applicable)
      const apiParams: { organization_type?: string; page?: number; per_page?: number } = {
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
      // Badge counts are now included in API response via badge_count
      setProjects(formattedProjects);
      
      // Extract and store pagination metadata
      if (response.data?.meta) {
        setProjectTotalPages(response.data.meta.total_pages || 1);
        setProjectTotalCount(response.data.meta.total_count || 0);
      }
      setInitialLoad(false);
    } catch (err) {
      console.error('Erreur lors de la récupération des projets publics:', err);
      setProjects([]);
      setProjectTotalPages(1);
      setProjectTotalCount(0);
      setInitialLoad(false);
    } finally {
      setIsLoadingProjects(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.showingPageType, organizationFilter]);

  // Fonction pour récupérer les projets de l'utilisateur (Mes projets)
  const fetchMyProjects = React.useCallback(async (page: number = 1) => {
    setIsLoadingProjects(true);
    try {
      const currentUser = await getCurrentUser();
      
      if (state.showingPageType === 'teacher') {
        // Pour les enseignants : utiliser getTeacherProjects
        const response = await getTeacherProjects({ page: page, per_page: 12 });
        const rawProjects = response.data || [];
        
        // Store raw API projects for permission checks
        const newRawProjectsMap = new Map<string, any>();
        rawProjects.forEach((p: any) => {
          if (p.id) {
            newRawProjectsMap.set(p.id.toString(), p);
          }
        });
        setRawProjectsMap(prev => {
          const merged = new Map(prev);
          newRawProjectsMap.forEach((value, key) => merged.set(key, value));
          return merged;
        });
        
        const formattedProjects: Project[] = rawProjects.map((p: any) => {
          return mapApiProjectToFrontendProject(p, state.showingPageType, currentUser.data);
        });
        // Badge counts are now included in API response via badge_count
        setMyProjects(formattedProjects);
        
        // Extract and store pagination metadata
        if (response.meta) {
          setMyProjectsTotalPages(response.meta.total_pages || 1);
          setMyProjectsTotalCount(response.meta.total_count || 0);
        }
      } else if (state.showingPageType === 'user') {
        // Pour les utilisateurs : utiliser getAllUserProjects
        const params: { page?: number; per_page?: number } = { page: page, per_page: 12 };
        const response = await getAllUserProjects(params);
        const rawProjects = response.data?.data || response.data || [];
        
        // Store raw API projects for permission checks
        const newRawProjectsMap = new Map<string, any>();
        rawProjects.forEach((p: any) => {
          if (p.id) {
            newRawProjectsMap.set(p.id.toString(), p);
          }
        });
        setRawProjectsMap(prev => {
          const merged = new Map(prev);
          newRawProjectsMap.forEach((value, key) => merged.set(key, value));
          return merged;
        });
        
        const formattedProjects: Project[] = rawProjects.map((p: any) => {
          return mapApiProjectToFrontendProject(p, state.showingPageType, currentUser.data);
        });
        // Badge counts are now included in API response via badge_count
        setMyProjects(formattedProjects);
        
        // Extract and store pagination metadata
        if (response.data?.meta) {
          setMyProjectsTotalPages(response.data.meta.total_pages || 1);
          setMyProjectsTotalCount(response.data.meta.total_count || 0);
        }
      }
      setInitialLoad(false);
    } catch (err) {
      console.error('Erreur lors de la récupération de mes projets:', err);
      setMyProjects([]);
      setMyProjectsTotalPages(1);
      setMyProjectsTotalCount(0);
      setInitialLoad(false);
    } finally {
      setIsLoadingProjects(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.showingPageType]);

  // Fonction pour récupérer les projets (réutilisable)
  const fetchProjects = React.useCallback(async (page: number = 1) => {
    setIsLoadingProjects(true);
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
          // Établissement: utiliser getAllProjects avec organization_type: 'établissement' (Pro only)
          if (state.showingPageType !== 'pro') {
            console.warn('⚠️ [Projects] "school" filter should only be used on Pro dashboard');
            setProjects([]);
            setProjectTotalPages(1);
            setProjectTotalCount(0);
            return;
          }
          response = await getAllProjects({ organization_type: 'établissement', page: page, per_page: 12 });
          rawProjects = response.data?.data || response.data || [];
        } else if (organizationFilter === 'other-orgs') {
          // Autres organisations: utiliser getAllProjects sans filtre, puis filtrer côté client (Pro only)
          if (state.showingPageType !== 'pro') {
            console.warn('⚠️ [Projects] "other-orgs" filter should only be used on Pro dashboard');
            setProjects([]);
            setProjectTotalPages(1);
            setProjectTotalCount(0);
            return;
          }
          // For client-side filtering, fetch a large batch to get all projects, then filter and paginate client-side
          response = await getAllProjects({ page: 1, per_page: 200 });
          rawProjects = response.data?.data || response.data || [];
          needsClientSideFiltering = true;
        } else if (organizationFilter === 'other-schools') {
          // Autres établissements: utiliser getAllProjects avec organization_type: 'établissement', puis filtrer côté client (Edu only)
          if (state.showingPageType !== 'edu') {
            console.warn('⚠️ [Projects] "other-schools" filter should only be used on Edu dashboard');
            setProjects([]);
            setProjectTotalPages(1);
            setProjectTotalCount(0);
            return;
          }
          // For client-side filtering, fetch a large batch to get all projects, then filter and paginate client-side
          response = await getAllProjects({ organization_type: 'établissement', page: 1, per_page: 200 });
          rawProjects = response.data?.data || response.data || [];
          needsClientSideFiltering = true;
        } else if (organizationFilter === 'companies') {
          // Organisations: utiliser getAllProjects sans filtre, puis filtrer côté client (Edu only)
          if (state.showingPageType !== 'edu') {
            console.warn('⚠️ [Projects] "companies" filter should only be used on Edu dashboard');
            setProjects([]);
            setProjectTotalPages(1);
            setProjectTotalCount(0);
            return;
          }
          // For client-side filtering, fetch a large batch to get all projects, then filter and paginate client-side
          response = await getAllProjects({ page: 1, per_page: 200 });
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

        // Client-side filtering for 'all-public', 'other-orgs', 'other-schools', and 'companies'
        if (needsClientSideFiltering) {
          let filteredProjects: any[] = [];
          
          if (organizationFilter === 'all-public') {
            // Filter to only public projects
            filteredProjects = rawProjects.filter((p: any) => !p.private);
            rawProjects = filteredProjects; // Use filtered results directly
          } else if (organizationFilter === 'other-orgs') {
            // Pro: Company projects excluding user's own
            filteredProjects = rawProjects.filter((p: any) => {
              if (p.private) return false;
              // Must have company_ids (projects without company_ids are likely school projects)
              if (!p.company_ids || !Array.isArray(p.company_ids) || p.company_ids.length === 0) {
                return false;
              }
              // Exclude school projects (check if has school_levels or school_level_ids, even if empty arrays)
              // Also exclude if owner's role suggests it's a school project
              if ((p.school_levels && Array.isArray(p.school_levels) && p.school_levels.length > 0) ||
                  (p.school_level_ids && Array.isArray(p.school_level_ids) && p.school_level_ids.length > 0)) {
                return false;
              }
              // Additional check: exclude if owner role indicates school project
              if (p.owner?.role) {
                const schoolRoles = ['directeur_ecole', 'primary_school_teacher', 'other_school_admin', 
                                     'collegien', 'lyceen', 'eleve_primaire', 'enseignant'];
                if (schoolRoles.includes(p.owner.role)) {
                  return false;
                }
              }
              // Exclude user's own company
              if (contextId && p.company_ids.includes(contextId)) {
                return false;
              }
              return true;
            });
            // Store all filtered projects and paginate client-side
            setAllFilteredProjects(filteredProjects);
            const perPage = 12;
            const startIndex = (page - 1) * perPage;
            const endIndex = startIndex + perPage;
            rawProjects = filteredProjects.slice(startIndex, endIndex);
          } else if (organizationFilter === 'other-schools') {
            // Edu: Other school projects excluding user's own
            // Note: API call with organization_type: 'établissement' returns all school projects
            // So we just need to filter out user's own school and private projects
            filteredProjects = rawProjects.filter((p: any) => {
              if (p.private) return false;
              
              // Get all user's school IDs
              const userSchoolIds = state.user?.available_contexts?.schools?.map((s: any) => s.id) || [];
              const currentUserId = state.user?.id?.toString();
              
              // Exclude projects owned by the current user
              if (currentUserId && p.owner?.id?.toString() === currentUserId) {
                return false;
              }
              
              // Exclude projects linked to user's schools via school_levels
              if (userSchoolIds.length > 0) {
                if (p.school_levels && Array.isArray(p.school_levels) && p.school_levels.length > 0) {
                  const hasUserSchool = p.school_levels.some((sl: any) => 
                    sl.school_id && userSchoolIds.includes(sl.school_id)
                  );
                  if (hasUserSchool) return false;
                }
                if (p.school_level_ids && Array.isArray(p.school_level_ids) && p.school_level_ids.length > 0) {
                  // Note: school_level_ids are level IDs, not school IDs, so we need to check differently
                  // For now, if a project has school_level_ids, we'll check via school_levels array
                }
              }
              
              return true;
            });
            // Store all filtered projects and paginate client-side
            setAllFilteredProjects(filteredProjects);
            const perPage = 12;
            const startIndex = (page - 1) * perPage;
            const endIndex = startIndex + perPage;
            rawProjects = filteredProjects.slice(startIndex, endIndex);
          } else if (organizationFilter === 'companies') {
            // Edu: All company projects
            filteredProjects = rawProjects.filter((p: any) => {
              if (p.private) return false;
              // Must have company_ids
              if (!p.company_ids || !Array.isArray(p.company_ids) || p.company_ids.length === 0) {
                return false;
              }
              // Exclude school projects (projects with school_levels)
              if ((p.school_levels && Array.isArray(p.school_levels) && p.school_levels.length > 0) ||
                  (p.school_level_ids && Array.isArray(p.school_level_ids) && p.school_level_ids.length > 0)) {
                return false;
              }
              return true;
            });
            // Store all filtered projects and paginate client-side
            setAllFilteredProjects(filteredProjects);
            const perPage = 12;
            const startIndex = (page - 1) * perPage;
            const endIndex = startIndex + perPage;
            rawProjects = filteredProjects.slice(startIndex, endIndex);
          }
        }

        // Mapping des données API vers le type Project (using centralized mapper)
        const formattedProjects: Project[] = rawProjects.map((p: any) => {
            return mapApiProjectToFrontendProject(p, state.showingPageType, currentUser.data);
        });

        // Store raw API projects for permission checks
        const newRawProjectsMap = new Map<string, any>();
        rawProjects.forEach((p: any) => {
          if (p.id) {
            newRawProjectsMap.set(p.id.toString(), p);
          }
        });
        setRawProjectsMap(newRawProjectsMap);

        // Badge counts are now included in API response via badge_count
        setProjects(formattedProjects);
        
        // Extract and store pagination metadata
        if (response && response.data?.meta) {
          let totalPages = response.data.meta.total_pages || 1;
          let totalCount = response.data.meta.total_count || 0;
          
          // For client-side filtering, handle pagination differently based on filter type
          if (needsClientSideFiltering) {
            if (organizationFilter === 'all-public') {
              // For 'all-public': Keep API pagination metadata
              // The API returns public + private projects, but pagination is still valid
              // Some pages might have fewer visible projects after filtering, but pagination works
              // We keep the API's metadata so users can navigate through all pages
              // (totalCount and totalPages remain from API)
            } else if (organizationFilter === 'other-orgs' || organizationFilter === 'other-schools' || organizationFilter === 'companies') {
              // For 'other-orgs', 'other-schools', and 'companies': Use client-side pagination
              // We've already filtered all projects and stored them in allFilteredProjects
              const filteredCount = allFilteredProjects.length;
              totalCount = filteredCount;
              totalPages = Math.max(1, Math.ceil(filteredCount / 12));
            }
          }
          
          setProjectTotalPages(totalPages);
          setProjectTotalCount(totalCount);
        }
      }
      setInitialLoad(false);
    } catch (err) {
      console.error('Erreur lors de la récupération des projets:', err);
      setProjects([]);
      setProjectTotalPages(1);
      setProjectTotalCount(0);
      setInitialLoad(false);
    } finally {
      setIsLoadingProjects(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.showingPageType, state.user, fetchPublicProjects, fetchMyProjects, isPersonalUser, isTeacher, organizationFilter, myProjectsPage, projectPage]); // getSelectedOrganizationId utilise state.user, donc c'est couvert

  // --- Fetch des projets au chargement ---
  useEffect(() => {
    // Reset pagination and loading state when dashboard type changes
    setProjectPage(1);
    setMyProjectsPage(1);
    setInitialLoad(true);
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
    // For client-side paginated filters, use stored filtered projects
    if ((organizationFilter === 'other-orgs' || organizationFilter === 'other-schools' || organizationFilter === 'companies') && allFilteredProjects.length > 0) {
      const perPage = 12;
      const startIndex = (projectPage - 1) * perPage;
      const endIndex = startIndex + perPage;
      const paginatedProjects = allFilteredProjects.slice(startIndex, endIndex);
      
      // Map to Project format
      const formattedProjects: Project[] = paginatedProjects.map((p: any) => {
        return mapApiProjectToFrontendProject(p, state.showingPageType, state.user);
      });
      
      // Store raw API projects for permission checks
      const newRawProjectsMap = new Map<string, any>();
      paginatedProjects.forEach((p: any) => {
        if (p.id) {
          newRawProjectsMap.set(p.id.toString(), p);
        }
      });
      setRawProjectsMap(newRawProjectsMap);
      
      // Badge counts are now included in API response via badge_count
      setProjects(formattedProjects);
      
      // Update pagination metadata
      const totalCount = allFilteredProjects.length;
      const totalPages = Math.max(1, Math.ceil(totalCount / 12));
      setProjectTotalPages(totalPages);
      setProjectTotalCount(totalCount);
      
      return; // Don't fetch from API
    }
    
    // For other cases, fetch from API
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
  }, [projectPage, organizationFilter, allFilteredProjects]);

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
                onChange={(e) => setOrganizationFilter(e.target.value as 'my-org' | 'all-public' | 'school' | 'other-orgs' | 'other-schools' | 'companies')}
              >
                {state.showingPageType === 'pro' ? (
                  <>
                    <option value="my-org">Mon organisation</option>
                    <option value="all-public">Tous les projets</option>
                    <option value="school">Établissement</option>
                    <option value="other-orgs">Autres organisations</option>
                  </>
                ) : (
                  <>
                    <option value="my-org">Mon établissement</option>
                    <option value="all-public">Tous les projets</option>
                    <option value="other-schools">Autres établissements</option>
                    <option value="companies">Organisations</option>
                  </>
                )}
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
              <option value="mlds">MLDS</option>
              <option value="faj_co">FAJ Co</option>
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

      {isLoadingProjects && initialLoad ? (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p className="loading-text">Chargement des projets...</p>
        </div>
      ) : filteredProjects.length > 0 ? (
        <>
          <div className="projects-grid">
            {filteredProjects.map((project) => {
              const isPersonalUser = state.showingPageType === 'teacher' || state.showingPageType === 'user';
              
              // Get raw API project data for permission checks
              const rawApiProject = rawProjectsMap.get(project.id);
              
              // Calculate permissions
              const canManage = rawApiProject ? canUserManageProject(rawApiProject, state.user) : false;
              const canDelete = rawApiProject ? canUserDeleteProject(rawApiProject, state.user?.id?.toString()) : false;
              
              return (
                <ProjectCard
                  key={project.id}
                  project={project}
                  onEdit={() => handleEditProject(project)}
                  onManage={() => handleManageProject(project)}
                  onDelete={canDelete ? () => handleDeleteProject(project.id) : undefined}
                  isPersonalUser={isPersonalUser}
                  canManage={canManage}
                  canDelete={canDelete}
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