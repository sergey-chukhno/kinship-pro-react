import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../../context/AppContext';
import { Project } from '../../types';
import ProjectModal from '../Modals/ProjectModal';
import MLDSProjectModal from '../Modals/MLDSProjectModal';
import SubscriptionRequiredModal from '../Modals/SubscriptionRequiredModal';
import ProjectCard from '../Projects/ProjectCard';
import './Projects.css';

// Imports API (Ajustez les chemins si nécessaire, basés sur la structure de Members.tsx)
import { getCurrentUser } from '../../api/Authentication';
import { deleteProject, getAllProjects, getAllUserProjects} from '../../api/Project';
import { getSchoolProjects, getCompanyProjects } from '../../api/Dashboard';
import { getTeacherProjects } from '../../api/Projects';
import { mapApiProjectToFrontendProject, getOrganizationId } from '../../utils/projectMapper';
import { getSelectedOrganizationId as getSelectedOrgId } from '../../utils/contextUtils';
import { canUserManageProject, canUserDeleteProject } from '../../utils/projectPermissions';

const Projects: React.FC = () => {
  const { state, updateProject, setCurrentPage, setSelectedProject } = useAppContext();
  const navigate = useNavigate();
  const { selectedProject } = state;
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [isMLDSProjectModalOpen, setIsMLDSProjectModalOpen] = useState(false);
  const [isSubscriptionModalOpen, setIsSubscriptionModalOpen] = useState(false);
  const [isProjectDropdownOpen, setIsProjectDropdownOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<{ id: string; title: string } | null>(null);
  
  // State local pour stocker les projets récupérés de l'API
  const [projects, setProjects] = useState<Project[]>([]);
  const [myProjects, setMyProjects] = useState<Project[]>([]);
  const [mldsProjects, setMldsProjects] = useState<Project[]>([]);
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
  
  // Pagination state for "Projets MLDS" tab
  const [mldsProjectsPage, setMldsProjectsPage] = useState(1);
  const [mldsProjectsTotalPages, setMldsProjectsTotalPages] = useState(1);
  const [mldsProjectsTotalCount, setMldsProjectsTotalCount] = useState(0);
  
  // Tab state for all users
  // Teachers should only see their own projects, not public projects
  const isPersonalUser = state.showingPageType === 'teacher' || state.showingPageType === 'user';
  const isTeacher = state.showingPageType === 'teacher';
  // For teachers, default to 'mes-projets' since they shouldn't see public projects
  // For regular users and pro/edu, default to 'nouveautes' to show public/org projects
  const [activeTab, setActiveTab] = useState<'nouveautes' | 'mes-projets' | 'mlds-projects'>(isTeacher ? 'mes-projets' : 'nouveautes');

  // Search and filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [pathwayFilter, setPathwayFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [organizationFilter, setOrganizationFilter] = useState<'my-org' | 'all-public' | 'school' | 'other-orgs' | 'other-schools' | 'companies'>('my-org');
  const [visibilityFilter, setVisibilityFilter] = useState('all');
  
  // MLDS-specific filter states
  const [mldsRequestedByFilter, setMldsRequestedByFilter] = useState('all');
  const [mldsTargetAudienceFilter, setMldsTargetAudienceFilter] = useState('all');
  const [mldsActionObjectivesFilter, setMldsActionObjectivesFilter] = useState('all');
  const [mldsOrganizationFilter, setMldsOrganizationFilter] = useState('all');

  // Loading states
  const [isLoadingProjects, setIsLoadingProjects] = useState(false);
  // const [isLoadingBadges, setIsLoadingBadges] = useState(false); // Unused
  const [initialLoad, setInitialLoad] = useState(true);

  // Fonction pour obtenir l'organizationId sélectionné (comme dans Dashboard)
  const getSelectedOrganizationId = (): number | undefined => {
    return getSelectedOrgId(state.user, state.showingPageType);
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
      // Filtrer uniquement les projets publics et exclure les projets MLDS
      const publicProjects = rawProjects.filter((p: any) => !p.private && p.mlds_information == null);
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
        
        // Exclure les projets MLDS
        const nonMLDSProjects = rawProjects.filter((p: any) => p.mlds_information == null);
        
        // Store raw API projects for permission checks
        const newRawProjectsMap = new Map<string, any>();
        nonMLDSProjects.forEach((p: any) => {
          if (p.id) {
            newRawProjectsMap.set(p.id.toString(), p);
          }
        });
        setRawProjectsMap(prev => {
          const merged = new Map(prev);
          newRawProjectsMap.forEach((value, key) => merged.set(key, value));
          return merged;
        });
        
        const formattedProjects: Project[] = nonMLDSProjects.map((p: any) => {
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
        
        // Exclure les projets MLDS
        const nonMLDSProjects = rawProjects.filter((p: any) => p.mlds_information == null);
        
        // Store raw API projects for permission checks
        const newRawProjectsMap = new Map<string, any>();
        nonMLDSProjects.forEach((p: any) => {
          if (p.id) {
            newRawProjectsMap.set(p.id.toString(), p);
          }
        });
        setRawProjectsMap(prev => {
          const merged = new Map(prev);
          newRawProjectsMap.forEach((value, key) => merged.set(key, value));
          return merged;
        });
        
        const formattedProjects: Project[] = nonMLDSProjects.map((p: any) => {
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

  // Fonction pour récupérer les projets MLDS (avec mlds_information !== null)
  const fetchMLDSProjects = React.useCallback(async (page: number = 1) => {
    setIsLoadingProjects(true);
    try {
      const currentUser = await getCurrentUser();
      
      // Pour les projets MLDS, on récupère tous les projets et on filtre ceux avec mlds_information
      const params: { page?: number; per_page?: number } = { page: 1, per_page: 200 }; // Récupérer un grand nombre pour filtrer côté client
      let response: any;
      let rawProjects: any[] = [];
      
      if (state.showingPageType === 'teacher') {
        // Pour les enseignants : utiliser getTeacherProjects
        response = await getTeacherProjects(params);
        rawProjects = response.data || [];
      } else if (state.showingPageType === 'user') {
        // Pour les utilisateurs : utiliser getAllUserProjects
        response = await getAllUserProjects(params);
        rawProjects = response.data?.data || response.data || [];
      } else {
        // Pour les rôles pro et edu
        const contextId = getSelectedOrganizationId();
        if (!contextId) {
          console.warn('⚠️ [Projects MLDS] Aucun contextId trouvé pour le type:', state.showingPageType);
          setMldsProjects([]);
          setMldsProjectsTotalPages(1);
          setMldsProjectsTotalCount(0);
          return;
        }
        
        const isEdu = state.showingPageType === 'edu';
        if (isEdu) {
          response = await getSchoolProjects(contextId, true, 200, 1);
        } else {
          response = await getCompanyProjects(contextId, true, 200, 1);
        }
        rawProjects = response.data?.data || response.data || [];
      }
      
      // Filtrer les projets avec mlds_information !== null
      const mldsProjectsData = rawProjects.filter((p: any) => p.mlds_information != null);
      
      // Store raw API projects for permission checks
      const newRawProjectsMap = new Map<string, any>();
      mldsProjectsData.forEach((p: any) => {
        if (p.id) {
          newRawProjectsMap.set(p.id.toString(), p);
        }
      });
      setRawProjectsMap(prev => {
        const merged = new Map(prev);
        newRawProjectsMap.forEach((value, key) => merged.set(key, value));
        return merged;
      });
      
      // Pagination côté client
      const perPage = 12;
      const startIndex = (page - 1) * perPage;
      const endIndex = startIndex + perPage;
      const paginatedProjects = mldsProjectsData.slice(startIndex, endIndex);
      
      const formattedProjects: Project[] = paginatedProjects.map((p: any) => {
        return mapApiProjectToFrontendProject(p, state.showingPageType, currentUser.data);
      });
      
      setMldsProjects(formattedProjects);
      
      // Update pagination metadata
      const totalCount = mldsProjectsData.length;
      const totalPages = Math.max(1, Math.ceil(totalCount / perPage));
      setMldsProjectsTotalPages(totalPages);
      setMldsProjectsTotalCount(totalCount);
      
      setInitialLoad(false);
    } catch (err) {
      console.error('Erreur lors de la récupération des projets MLDS:', err);
      setMldsProjects([]);
      setMldsProjectsTotalPages(1);
      setMldsProjectsTotalCount(0);
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
          // Exclure les projets MLDS
          rawProjects = rawProjects.filter((p: any) => p.mlds_information == null);
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
          // Exclure les projets MLDS
          rawProjects = rawProjects.filter((p: any) => p.mlds_information == null);
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
            // Filter to only public projects and exclude MLDS projects
            filteredProjects = rawProjects.filter((p: any) => !p.private && p.mlds_information == null);
            rawProjects = filteredProjects; // Use filtered results directly
          } else if (organizationFilter === 'other-orgs') {
            // Pro: Company projects excluding user's own
            filteredProjects = rawProjects.filter((p: any) => {
              if (p.private) return false;
              // Exclude MLDS projects
              if (p.mlds_information != null) return false;
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
              // Exclude MLDS projects
              if (p.mlds_information != null) return false;
              
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
              // Exclude MLDS projects
              if (p.mlds_information != null) return false;
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
        setRawProjectsMap(prev => {
          const merged = new Map(prev);
          newRawProjectsMap.forEach((value, key) => merged.set(key, value));
          return merged;
        });

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

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (isProjectDropdownOpen && !target.closest('.dropdown')) {
        setIsProjectDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isProjectDropdownOpen]);

  // --- Fetch des projets au chargement ---
  useEffect(() => {
    // Reset pagination and loading state when dashboard type changes
    setProjectPage(1);
    setMyProjectsPage(1);
    setMldsProjectsPage(1);
    setInitialLoad(true);
    if (isTeacher) {
      fetchMyProjects(1);
      fetchMLDSProjects(1);
    } else if (state.showingPageType === 'user') {
      fetchPublicProjects(1);
      fetchMyProjects(1);
      fetchMLDSProjects(1);
    } else {
      fetchProjects(1);
      fetchMLDSProjects(1);
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
      setRawProjectsMap(prev => {
        const merged = new Map(prev);
        newRawProjectsMap.forEach((value, key) => merged.set(key, value));
        return merged;
      });
      
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

  // Fetch MLDS projects when mldsProjectsPage changes
  useEffect(() => {
    if (activeTab === 'mlds-projects') {
      fetchMLDSProjects(mldsProjectsPage);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mldsProjectsPage]);

  // Reset filters when switching tabs
  useEffect(() => {
    // Reset MLDS filters when leaving MLDS tab
    if (activeTab !== 'mlds-projects') {
      setMldsRequestedByFilter('all');
      setMldsTargetAudienceFilter('all');
      setMldsActionObjectivesFilter('all');
      setMldsOrganizationFilter('all');
    }
    // Reset regular filters when entering MLDS tab
    if (activeTab === 'mlds-projects') {
      setPathwayFilter('all');
      setVisibilityFilter('all');
    }
  }, [activeTab]);

  // Switch away from MLDS tab when there are no MLDS projects (tab is hidden)
  useEffect(() => {
    if (mldsProjects.length === 0 && activeTab === 'mlds-projects') {
      setActiveTab(isTeacher ? 'mes-projets' : 'nouveautes');
    }
  }, [mldsProjects.length, activeTab, isTeacher]);

  // Reset pagination and re-fetch when filters change
  useEffect(() => {
    // Reset to page 1 when filters change
    setProjectPage(1);
    setMyProjectsPage(1);
    setMldsProjectsPage(1);
    
    if (isTeacher) {
      // Teachers only see their own projects, no public projects
      fetchMyProjects(1);
      fetchMLDSProjects(1);
    } else if (state.showingPageType === 'user') {
      if (activeTab === 'nouveautes') {
      fetchPublicProjects(1);
      } else if (activeTab === 'mlds-projects') {
        fetchMLDSProjects(1);
      }
    } else if (!isPersonalUser) {
      // Pour les rôles pro et edu, recharger les projets avec le nouveau filtre
      fetchProjects(1);
      fetchMLDSProjects(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationFilter, statusFilter, pathwayFilter, searchTerm, startDate, endDate, visibilityFilter, mldsRequestedByFilter, mldsTargetAudienceFilter, mldsActionObjectivesFilter, mldsOrganizationFilter, isPersonalUser, isTeacher, activeTab]);


  const handleCreateProject = () => {
    // Pro et user : ouvrir directement ProjectModal (pas de dropdown, pas de MLDS)
    setSelectedProject(null);
    setIsProjectModalOpen(true);
    setIsProjectDropdownOpen(false);
  };

  const handleCreateMLDSProject = () => {
    // Check if user is a personal user (teacher or user)
    const isPersonalUser = state.showingPageType === 'user';
    
    if (isPersonalUser) {
      // Show subscription required modal for personal users
      setIsSubscriptionModalOpen(true);
    } else {
      // Open MLDS project creation modal for organizational users
      setSelectedProject(null);
      setIsMLDSProjectModalOpen(true);
    setIsProjectDropdownOpen(false);
    }
  };

  const handleEditProject = (project: Project) => {
    // Prevent editing if project is ended
    if (project.status === 'ended') {
      return;
    }
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
    if (isTeacher) {
      await fetchMyProjects();
      await fetchMLDSProjects();
    } else if (isPersonalUser) {
      if (activeTab === 'nouveautes') {
        await fetchPublicProjects();
      } else if (activeTab === 'mes-projets') {
        await fetchMyProjects();
      } else if (activeTab === 'mlds-projects') {
        await fetchMLDSProjects();
      }
    } else {
      await fetchProjects();
      await fetchMLDSProjects();
    }
  };

  const handleManageProject = (project: Project) => {
    // Always allow viewing/managing (even if ended, user can still view)
    setSelectedProject(project);
    setCurrentPage('project-management');
  };

  const handleDeleteProject = (projectId: string) => {
    // Find the project title for the confirmation modal
    // Search in all project lists
    const project = [...projects, ...myProjects, ...mldsProjects].find(p => p.id === projectId);
    if (project) {
      // Prevent deleting if project is ended
      if (project.status === 'ended') {
        return;
      }
      setProjectToDelete({ id: projectId, title: project.title });
      setIsDeleteModalOpen(true);
    }
  };

  const confirmDeleteProject = async () => {
    if (!projectToDelete) return;
    
    try {
      await deleteProject(Number(projectToDelete.id));
      // Mise à jour de l'affichage local
      setProjects(prev => prev.filter(p => p.id !== projectToDelete.id));
      setMyProjects(prev => prev.filter(p => p.id !== projectToDelete.id));
      setMldsProjects(prev => prev.filter(p => p.id !== projectToDelete.id));
      setSelectedProject(null);
      
      // Rafraîchir en fonction de l'onglet actif
      if (activeTab === 'mlds-projects') {
        await fetchMLDSProjects();
      } else if (isPersonalUser && activeTab === 'mes-projets') {
        await fetchMyProjects();
      }
      
      // Close modal and reset state
      setIsDeleteModalOpen(false);
      setProjectToDelete(null);
    } catch (err) {
      console.error('Erreur lors de la suppression du projet:', err);
      // Close modal even on error
      setIsDeleteModalOpen(false);
      setProjectToDelete(null);
    }
  };

  const cancelDeleteProject = () => {
    setIsDeleteModalOpen(false);
    setProjectToDelete(null);
  };

  const handleExportProjects = () => {
    console.log('Export projects');
  };

  // Select projects to display based on active tab
  // Teachers only see their own projects (myProjects) or MLDS projects
  // Regular users see public projects, their own projects, or MLDS projects based on activeTab
  // Organization users (school/company) see their organization's projects or MLDS projects
  let projectsToDisplay: Project[];
  
  if (activeTab === 'mlds-projects') {
    projectsToDisplay = mldsProjects;
  } else if (isTeacher) {
    projectsToDisplay = myProjects;
  } else if (isPersonalUser) {
    projectsToDisplay = activeTab === 'nouveautes' ? projects : myProjects;
  } else {
    projectsToDisplay = projects;
  }

  // Extract unique organization names from MLDS projects for filter
  const uniqueOrganizations = React.useMemo(() => {
    const orgSet = new Set<string>();
    mldsProjects.forEach(project => {
      if (project.mlds_information?.organization_names && Array.isArray(project.mlds_information.organization_names)) {
        project.mlds_information.organization_names.forEach((org: string) => orgSet.add(org));
      }
    });
    return Array.from(orgSet).sort((a, b) => a.localeCompare(b));
  }, [mldsProjects]);


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

    // Pathway filter (skip for MLDS projects)
    const matchesPathway = activeTab === 'mlds-projects' || pathwayFilter === 'all' || project.pathway === pathwayFilter;

    // Status filter
    const matchesStatus = statusFilter === 'all' ||
      project.status === statusFilter ||
      (statusFilter === 'draft' && project.status === 'draft') ||
      (statusFilter === 'À venir' && project.status === 'coming') ||
      (statusFilter === 'En cours' && project.status === 'in_progress') ||
      (statusFilter === 'Terminée' && project.status === 'ended');

    // Organization filter is now handled by API, no client-side filtering needed
    const matchesOrganization = true;

    // Visibility filter (skip for MLDS projects)
    const matchesVisibility = activeTab === 'mlds-projects' || visibilityFilter === 'all' ||
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

    // MLDS-specific filters (only apply if MLDS tab is active)
    let matchesMldsRequestedBy = true;
    let matchesMldsTargetAudience = true;
    let matchesMldsActionObjectives = true;
    let matchesMldsOrganization = true;
    
    if (activeTab === 'mlds-projects' && project.mlds_information) {
      // Filter by requested_by
      if (mldsRequestedByFilter !== 'all') {
        matchesMldsRequestedBy = project.mlds_information.requested_by === mldsRequestedByFilter;
      }
      
      // Filter by target_audience
      if (mldsTargetAudienceFilter !== 'all') {
        matchesMldsTargetAudience = project.mlds_information.target_audience === mldsTargetAudienceFilter;
      }
      
      // Filter by action_objectives (array contains the selected objective)
      if (mldsActionObjectivesFilter !== 'all') {
        matchesMldsActionObjectives = project.mlds_information.action_objectives && 
          Array.isArray(project.mlds_information.action_objectives) &&
          project.mlds_information.action_objectives.includes(mldsActionObjectivesFilter);
      }
      
      // Filter by organization_names (array contains the selected organization)
      if (mldsOrganizationFilter !== 'all') {
        matchesMldsOrganization = project.mlds_information.organization_names && 
          Array.isArray(project.mlds_information.organization_names) &&
          project.mlds_information.organization_names.includes(mldsOrganizationFilter);
      }
    }

    return matchesSearch && matchesPathway && matchesStatus && matchesOrganization && matchesVisibility && matchesStartDate && matchesEndDate && matchesMldsRequestedBy && matchesMldsTargetAudience && matchesMldsActionObjectives && matchesMldsOrganization;
  });

  return (
    <section className="flex flex-col gap-12 p-8 with-sidebar">
      {state.showingPageType === 'user' && (
        <div className="dashboard-back-link-wrap">
          <button type="button" className="dashboard-back-link" onClick={() => { setCurrentPage('dashboard'); navigate('/dashboard'); }}>
            ← Vers mon tableau de bord
          </button>
        </div>
      )}
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
          <div className="dropdown" style={{ position: 'relative' }}>
            {(state.showingPageType === 'pro' || state.showingPageType === 'user') ? (
              <button
                className="btn btn-primary"
                onClick={handleCreateProject}
              >
                <i className="fas fa-plus"></i> Créer un projet
              </button>
            ) : (
              <>
                <button
                  className="btn btn-primary"
                  onClick={() => setIsProjectDropdownOpen(!isProjectDropdownOpen)}
                >
                  <i className="fas fa-plus"></i> Créer un projet
                  <i className={`fas fa-chevron-${isProjectDropdownOpen ? 'up' : 'down'}`} style={{ marginLeft: '8px' }}></i>
                </button>
                {isProjectDropdownOpen && (
                  <div
                    className="dropdown-menu"
                    style={{
                      position: 'absolute',
                      top: '100%',
                      right: 0,
                      backgroundColor: 'white',
                      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                      borderRadius: '8px',
                      marginTop: '8px',
                      minWidth: '250px',
                      zIndex: 1000,
                      overflow: 'hidden'
                    }}
                  >
                    <button
                      onClick={handleCreateProject}
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        border: 'none',
                        background: 'white',
                        textAlign: 'left',
                        cursor: 'pointer',
                        fontSize: '14px',
                        transition: 'background-color 0.2s',
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
                    >
                      <i className="fas fa-folder" style={{ marginRight: '8px' }}></i>
                      Projet classique
                    </button>
                    <button
                      onClick={handleCreateMLDSProject}
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        border: 'none',
                        background: 'white',
                        textAlign: 'left',
                        cursor: 'pointer',
                        fontSize: '14px',
                        transition: 'background-color 0.2s',
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
                    >
                      <i className="fas fa-graduation-cap" style={{ marginRight: '8px' }}></i>
                      Projet MLDS Volet Persévérance Scolaire
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Tabs for all users */}
        <div className="filter-tabs" style={{ marginBottom: '24px' }}>
        {/* For users: show Nouveautés, Mes projets, and MLDS tabs */}
        {state.showingPageType === 'user' && (
          <>
          <button 
            className={`filter-tab ${activeTab === 'nouveautes' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('nouveautes');
              setProjectPage(1); // Reset pagination when switching tabs
            }}
          >
              Nouveautés ({projects.length})
          </button>
            <button 
              className={`filter-tab ${activeTab === 'mes-projets' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('mes-projets');
                setMyProjectsPage(1); // Reset pagination when switching tabs
              }}
            >
              Mes projets ({myProjects.length})
            </button>
            {mldsProjects.length > 0 && (
              <button 
                className={`filter-tab ${activeTab === 'mlds-projects' ? 'active' : ''}`}
                onClick={() => {
                  setActiveTab('mlds-projects');
                  setMldsProjectsPage(1); // Reset pagination when switching tabs
                }}
              >
                Projets MLDS Volet Persévérance ({mldsProjects.length})
              </button>
            )}
          </>
        )}
        
        {/* For teachers: show Mes projets and MLDS tabs */}
        {state.showingPageType === 'teacher' && (
          <>
            <button 
              className={`filter-tab ${activeTab === 'mes-projets' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('mes-projets');
                setMyProjectsPage(1); // Reset pagination when switching tabs
              }}
            >
              Mes projets ({myProjects.length})
            </button>
            {mldsProjects.length > 0 && (
              <button 
                className={`filter-tab ${activeTab === 'mlds-projects' ? 'active' : ''}`}
                onClick={() => {
                  setActiveTab('mlds-projects');
                  setMldsProjectsPage(1); // Reset pagination when switching tabs
                }}
              >
                Projets MLDS Volet Persévérance ({mldsProjects.length})
              </button>
            )}
          </>
        )}
        
        {/* For pro/edu: show Projets and MLDS tabs */}
        {(state.showingPageType === 'pro' || state.showingPageType === 'edu') && (
          <>
            <button 
              className={`filter-tab ${activeTab === 'nouveautes' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('nouveautes');
                setProjectPage(1); // Reset pagination when switching tabs
              }}
            >
              Projets ({projects.length})
            </button>
            {mldsProjects.length > 0 && (
              <button 
                className={`filter-tab ${activeTab === 'mlds-projects' ? 'active' : ''}`}
                onClick={() => {
                  setActiveTab('mlds-projects');
                  setMldsProjectsPage(1); // Reset pagination when switching tabs
                }}
              >
                Projets MLDS Volet Persévérance ({mldsProjects.length})
              </button>
            )}
          </>
        )}
      </div>

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
          {/* Show MLDS-specific filters for MLDS tab */}
          {activeTab === 'mlds-projects' ? (
            <>
              <div className="filter-group">
                <label htmlFor="mlds-requested-by-filter">Demande faite par</label>
                <select
                  id="mlds-requested-by-filter"
                  className="filter-select"
                  value={mldsRequestedByFilter}
                  onChange={(e) => setMldsRequestedByFilter(e.target.value)}
                >
                  <option value="all">Tous</option>
                  <option value="departement">Département</option>
                  <option value="reseau_foquale">Réseau foquale</option>
                </select>
              </div>
              <div className="filter-group">
                <label htmlFor="mlds-target-audience-filter">Public ciblé</label>
                <select
                  id="mlds-target-audience-filter"
                  className="filter-select"
                  value={mldsTargetAudienceFilter}
                  onChange={(e) => setMldsTargetAudienceFilter(e.target.value)}
                >
                  <option value="all">Tous</option>
                  <option value="students_without_solution">Élèves sans solution à la rentrée</option>
                  <option value="students_at_risk">Élèves en situation de décrochage</option>
                  <option value="school_teams">Équipes des établissements</option>
                </select>
              </div>
              <div className="filter-group">
                <label htmlFor="mlds-action-objectives-filter">Objectifs de l&apos;action</label>
                <select
                  id="mlds-action-objectives-filter"
                  className="filter-select"
                  value={mldsActionObjectivesFilter}
                  onChange={(e) => setMldsActionObjectivesFilter(e.target.value)}
                >
                  <option value="all">Tous</option>
                  <option value="path_security">Sécurisation des parcours</option>
                  <option value="professional_discovery">Découverte professionnelle</option>
                  <option value="orientation_support">Accompagnement à l&apos;orientation</option>
                  <option value="training_support">Accompagnement à la formation</option>
                  <option value="citizenship">Citoyenneté</option>
                  <option value="family_links">Liens avec les familles</option>
                  <option value="professional_development">Développement professionnel</option>
                  <option value="other">Autre</option>
                </select>
              </div>
              <div className="filter-group">
                <label htmlFor="mlds-organization-filter">Organisations porteuses</label>
                <select
                  id="mlds-organization-filter"
                  className="filter-select"
                  value={mldsOrganizationFilter}
                  onChange={(e) => setMldsOrganizationFilter(e.target.value)}
                >
                  <option value="all">Toutes</option>
                  {uniqueOrganizations.map(org => (
                    <option key={org} value={org}>{org}</option>
                  ))}
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
                  <option value="draft">Brouillon</option>
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
            </>
          ) : (
            <>
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
            </>
          )}
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
              
              // Check if project is ended - disable edit/delete actions if true, but allow viewing
              const isProjectEnded = project.status === 'ended';
              
              return (
                <ProjectCard
                  key={project.id}
                  project={project}
                  onEdit={!isProjectEnded ? () => handleEditProject(project) : undefined}
                  onManage={() => handleManageProject(project)} // Always allow viewing/managing
                  onDelete={canDelete && !isProjectEnded ? () => handleDeleteProject(project.id) : undefined}
                  isPersonalUser={isPersonalUser}
                  canManage={canManage && !isProjectEnded} // Can't manage if ended, but can view
                  canDelete={canDelete && !isProjectEnded}
                />
              );
            })}
          </div>
          
          {/* Pagination Controls */}
          {(() => {
            // Determine which pagination state to use based on active tab
            let currentPage: number;
            let totalPages: number;
            let totalCount: number;
            let setCurrentPage: (page: number) => void;
            
            if (activeTab === 'mlds-projects') {
              currentPage = mldsProjectsPage;
              totalPages = mldsProjectsTotalPages;
              totalCount = mldsProjectsTotalCount;
              setCurrentPage = setMldsProjectsPage;
            } else if (activeTab === 'mes-projets') {
              currentPage = myProjectsPage;
              totalPages = myProjectsTotalPages;
              totalCount = myProjectsTotalCount;
              setCurrentPage = setMyProjectsPage;
            } else {
              currentPage = projectPage;
              totalPages = projectTotalPages;
              totalCount = projectTotalCount;
              setCurrentPage = setProjectPage;
            }
            
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

      {isMLDSProjectModalOpen && (
        <MLDSProjectModal
          onClose={() => {
            setIsMLDSProjectModalOpen(false);
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

      {isDeleteModalOpen && projectToDelete && (
        <div className="modal-overlay" onClick={cancelDeleteProject}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h3>Confirmer la suppression</h3>
              <button className="modal-close" onClick={cancelDeleteProject}>
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
                  backgroundColor: '#fee2e2',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '0.5rem'
                }}>
                  <i className="fas fa-exclamation-triangle" style={{ fontSize: '2rem', color: '#dc2626' }}></i>
                </div>
                
                <div>
                  <h4 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#111827', marginBottom: '0.5rem' }}>
                    Êtes-vous sûr de vouloir supprimer ce projet ?
                  </h4>
                  <p style={{ fontSize: '0.95rem', color: '#6b7280', marginBottom: '1rem' }}>
                    Cette action est irréversible. Le projet <strong>"{projectToDelete.title}"</strong> sera définitivement supprimé.
                  </p>
                </div>
              </div>
            </div>

            <div className="modal-footer" style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button 
                className="btn btn-outline" 
                onClick={cancelDeleteProject}
                style={{ minWidth: '100px' }}
              >
                Annuler
              </button>
              <button 
                className="btn btn-primary" 
                onClick={confirmDeleteProject}
                style={{ 
                  minWidth: '100px',
                  backgroundColor: '#dc2626',
                  borderColor: '#dc2626'
                }}
              >
                <i className="fas fa-trash" style={{ marginRight: '0.5rem' }}></i>
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}

    </section>
  );
};

export default Projects;