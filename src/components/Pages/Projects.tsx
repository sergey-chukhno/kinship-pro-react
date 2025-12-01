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

const Projects: React.FC = () => {
  const { state, updateProject, setCurrentPage, setSelectedProject } = useAppContext();
  const { selectedProject } = state;
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [isSubscriptionModalOpen, setIsSubscriptionModalOpen] = useState(false);
  
  // State local pour stocker les projets récupérés de l'API
  const [projects, setProjects] = useState<Project[]>([]);
  const [myProjects, setMyProjects] = useState<Project[]>([]);
  
  // Tab state for personal users
  const isPersonalUser = state.showingPageType === 'teacher' || state.showingPageType === 'user';
  const [activeTab, setActiveTab] = useState<'nouveautes' | 'mes-projets'>('nouveautes');

  // Search and filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [pathwayFilter, setPathwayFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [organizationFilter, setOrganizationFilter] = useState<'all' | 'établissement' | 'association' | 'entreprise'>('all');
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
  const fetchPublicProjects = React.useCallback(async () => {
    try {
      const currentUser = await getCurrentUser();
      
      // Préparer les paramètres d'URL selon le filtre de type d'organisation
      let apiParams: { organization_type?: string } | undefined = undefined;
      if (organizationFilter !== 'all') {
        apiParams = { organization_type: organizationFilter };
      }
      
      const response = await getAllProjects(apiParams);
      const rawProjects = response.data?.data || response.data || [];
      // Filtrer uniquement les projets publics
      const publicProjects = rawProjects.filter((p: any) => !p.private);
      const formattedProjects: Project[] = publicProjects.map((p: any) => {
        return mapApiProjectToFrontendProject(p, state.showingPageType, currentUser.data);
      });
      setProjects(formattedProjects);
    } catch (err) {
      console.error('Erreur lors de la récupération des projets publics:', err);
      setProjects([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.showingPageType, organizationFilter]);

  // Fonction pour récupérer les projets de l'utilisateur (Mes projets)
  const fetchMyProjects = React.useCallback(async () => {
    try {
      const currentUser = await getCurrentUser();
      
      if (state.showingPageType === 'teacher') {
        // Pour les enseignants : utiliser getTeacherProjects
        const response = await getTeacherProjects({ per_page: 12 });
        const rawProjects = response.data || [];
        const formattedProjects: Project[] = rawProjects.map((p: any) => {
          return mapApiProjectToFrontendProject(p, state.showingPageType, currentUser.data);
        });
        setMyProjects(formattedProjects);
      } else if (state.showingPageType === 'user') {
        // Pour les utilisateurs : utiliser getAllUserProjects
        const response = await getAllUserProjects();
        const rawProjects = response.data?.data || response.data || [];
        const formattedProjects: Project[] = rawProjects.map((p: any) => {
          return mapApiProjectToFrontendProject(p, state.showingPageType, currentUser.data);
        });
        setMyProjects(formattedProjects);
      }
    } catch (err) {
      console.error('Erreur lors de la récupération de mes projets:', err);
      setMyProjects([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.showingPageType]);

  // Fonction pour récupérer les projets (réutilisable)
  const fetchProjects = React.useCallback(async () => {
    try {
      const currentUser = await getCurrentUser();

      if (isPersonalUser) {
        // Pour les utilisateurs personnels : charger les projets publics (Nouveautés)
        await fetchPublicProjects();
        // Charger aussi les projets de l'utilisateur (Mes projets)
        await fetchMyProjects();
      } else {
        // Pour les rôles pro et edu, utiliser getAllProjects avec le filtre organization_type si sélectionné
        // Sinon, utiliser getSchoolProjects/getCompanyProjects pour l'organisation spécifique
        let response;
        
        if (organizationFilter !== 'all') {
          // Si un filtre de type d'organisation est sélectionné, utiliser getAllProjects
          const apiParams = { organization_type: organizationFilter };
          response = await getAllProjects(apiParams);
        } else {
          // Sinon, utiliser l'API spécifique à l'organisation
          const isEdu = state.showingPageType === 'edu';
          const contextId = getSelectedOrganizationId();

          if (!contextId) {
            console.warn('⚠️ [Projects] Aucun contextId trouvé pour le type:', state.showingPageType);
            setProjects([]);
            return;
          }

          if (isEdu) {
            // Use getSchoolProjects for schools (returns all school projects, not just user's projects)
            // perPage: 12 for Projects page (vs 3 for Dashboard)
            response = await getSchoolProjects(contextId, false, 12);
          } else {
            // Use getCompanyProjects for companies (returns all company projects, not just user's projects)
            response = await getCompanyProjects(contextId, false);
          }
        }

        // Gestion de la structure de réponse { data: [ ... ], meta: ... }
        const rawProjects = response.data?.data || response.data || [];

        // Mapping des données API vers le type Project (using centralized mapper)
        const formattedProjects: Project[] = rawProjects.map((p: any) => {
            return mapApiProjectToFrontendProject(p, state.showingPageType, currentUser.data);
        });

        setProjects(formattedProjects);
      }
    } catch (err) {
      console.error('Erreur lors de la récupération des projets:', err);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.showingPageType, state.user, fetchPublicProjects, fetchMyProjects, isPersonalUser, organizationFilter]); // getSelectedOrganizationId utilise state.user, donc c'est couvert

  // --- Fetch des projets au chargement ---
  useEffect(() => {
    fetchProjects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.showingPageType]); // Retirer state.user.available_contexts pour éviter les re-renders, le contexte est lu depuis localStorage

  // Re-fetch projects when organization filter changes
  useEffect(() => {
    if (isPersonalUser && activeTab === 'nouveautes') {
      fetchPublicProjects();
    } else if (!isPersonalUser) {
      // Pour les rôles pro et edu, recharger les projets avec le nouveau filtre
      fetchProjects();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationFilter, isPersonalUser, activeTab]);


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

  // Select projects to display based on active tab (for personal users)
  const projectsToDisplay = isPersonalUser 
    ? (activeTab === 'nouveautes' ? projects : myProjects)
    : projects;


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

      {/* Tabs for personal users */}
      {isPersonalUser && (
        <div className="filter-tabs" style={{ marginBottom: '24px' }}>
          <button 
            className={`filter-tab ${activeTab === 'nouveautes' ? 'active' : ''}`}
            onClick={() => setActiveTab('nouveautes')}
          >
            Nouveautés ({projects.length})
          </button>
          <button 
            className={`filter-tab ${activeTab === 'mes-projets' ? 'active' : ''}`}
            onClick={() => setActiveTab('mes-projets')}
          >
            Mes projets ({myProjects.length})
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
            <label htmlFor="organization-filter">Type d'organisation</label>
            <select
              id="organization-filter"
              className="filter-select"
              value={organizationFilter}
              onChange={(e) => setOrganizationFilter(e.target.value as 'all' | 'établissement' | 'association' | 'entreprise')}
            >
              <option value="all">Tous les types</option>
              <option value="établissement">Établissement</option>
              <option value="association">Association</option>
              <option value="entreprise">Entreprise</option>
            </select>
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
      ) : (
        <div className="no-projects-message">
          <div className="no-projects-content">
            <i className="fas fa-folder-open" style={{ fontSize: '3rem', color: '#9ca3af', marginBottom: '1rem' }}></i>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#374151', marginBottom: '0.5rem' }}>
              Aucun projet trouvé
            </h3>
            <p style={{ color: '#6b7280', fontSize: '0.95rem' }}>
              {searchTerm || pathwayFilter !== 'all' || statusFilter !== 'all' || organizationFilter !== 'all' || visibilityFilter !== 'all' || startDate || endDate
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