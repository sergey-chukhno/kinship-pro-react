import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../context/AppContext';
import { Project } from '../../types';
import ProjectModal from '../Modals/ProjectModal';
import ProjectCard from '../Projects/ProjectCard';
import './Projects.css';

// Imports API (Ajustez les chemins si nécessaire, basés sur la structure de Members.tsx)
import { getCurrentUser } from '../../api/Authentication';
import { deleteProject, getAllProjects} from '../../api/Project';
import { getSchoolProjects, getCompanyProjects } from '../../api/Dashboard';
import { getTeacherProjects } from '../../api/Projects';
import { mapApiProjectToFrontendProject } from '../../utils/projectMapper';

const Projects: React.FC = () => {
  const { state, addProject, updateProject, setCurrentPage, setSelectedProject } = useAppContext();
  const { selectedProject } = state;
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  
  // State local pour stocker les projets récupérés de l'API
  const [projects, setProjects] = useState<Project[]>([]);

  // Search and filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [pathwayFilter, setPathwayFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // --- Fetch des projets ---
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const currentUser = await getCurrentUser();

        if (state.showingPageType === 'teacher') {
          // Pour les enseignants : charger uniquement leurs projets (créés + classes gérées)
          const response = await getTeacherProjects({ per_page: 12 });
          const rawProjects = response.data || [];
          const formattedProjects: Project[] = rawProjects.map((p: any) => {
            return mapApiProjectToFrontendProject(p, state.showingPageType, currentUser.data);
          });
          setProjects(formattedProjects);
        } else if (state.showingPageType === 'user') {
          // Pour les utilisateurs personnels : charger tous les projets publics
          const response = await getAllProjects();
          const rawProjects = response.data?.data || response.data || [];
          // Filtrer uniquement les projets publics
          const publicProjects = rawProjects.filter((p: any) => !p.private);
          const formattedProjects: Project[] = publicProjects.map((p: any) => {
            return mapApiProjectToFrontendProject(p, state.showingPageType, currentUser.data);
          });
          setProjects(formattedProjects);
        } else {
          // Logique existante pour école/entreprise
          const isEdu = state.showingPageType === 'edu';

          // 1. Récupération de l'ID du contexte (Company vs School)
          const contextId = isEdu
            ? currentUser.data?.available_contexts?.schools?.[0]?.id
            : currentUser.data?.available_contexts?.companies?.[0]?.id;

          if (!contextId) return;

          // 2. Choix de la fonction API
          let response;
          if (isEdu) {
            // Use getSchoolProjects for schools (returns all school projects, not just user's projects)
            // perPage: 12 for Projects page (vs 3 for Dashboard)
            response = await getSchoolProjects(contextId, false, 12);
          } else {
            // Use getCompanyProjects for companies (returns all company projects, not just user's projects)
            response = await getCompanyProjects(contextId, false);
          }

          // Gestion de la structure de réponse { data: [ ... ], meta: ... }
          const rawProjects = response.data?.data || response.data || [];

          // 3. Mapping des données API vers le type Project (using centralized mapper)
          const formattedProjects: Project[] = rawProjects.map((p: any) => {
              return mapApiProjectToFrontendProject(p, state.showingPageType, currentUser.data);
          });

          setProjects(formattedProjects);
        }
      } catch (err) {
        console.error('Erreur lors de la récupération des projets:', err);
      }
    };

    fetchProjects();
  }, [state.showingPageType]);


  const handleCreateProject = () => {
    setSelectedProject(null);
    setIsProjectModalOpen(true);
  };

  const handleEditProject = (project: Project) => {
    setSelectedProject(project);
    setIsProjectModalOpen(true);
  };

  const handleSaveProject = (projectData: Omit<Project, 'id'>) => {
    if (selectedProject) {
      // Mettre à jour localement et via le contexte (si besoin de persistance API, ajouter l'appel ici)
      updateProject(selectedProject.id, projectData);
      setProjects(prev => prev.map(p => p.id === selectedProject.id ? { ...p, ...projectData } : p));
    } else {
      const newProject: Project = {
        ...projectData,
        id: Date.now().toString()
      };
      addProject(newProject);
      setProjects(prev => [...prev, newProject]);
    }
    setIsProjectModalOpen(false);
    setSelectedProject(null);
  };

  const handleManageProject = (project: Project) => {
    setSelectedProject(project);
    setCurrentPage('project-management');
  };

  const handleDeleteProject = (projectId: string) => {
    deleteProject(Number(projectId));
    // Mise à jour de l'affichage local
    setProjects(prev => prev.filter(p => p.id !== projectId));
    setSelectedProject(null);
  };

  const handleExportProjects = () => {
    console.log('Export projects');
  };

  // Filter projects based on search and filter criteria
  // Note: On filtre maintenant sur 'projects' (local state) et non 'state.projects'
  const filteredProjects = projects.filter(project => {
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

    // Date filters
    let matchesStartDate = true;
    let matchesEndDate = true;
    
    if (startDate && project.startDate) {
      matchesStartDate = new Date(project.startDate) >= new Date(startDate);
    }
    
    if (endDate && project.endDate) {
      matchesEndDate = new Date(project.endDate) <= new Date(endDate);
    }

    return matchesSearch && matchesPathway && matchesStatus && matchesStartDate && matchesEndDate;
  });

  return (
    <section className="flex flex-col p-8 gap-12 with-sidebar">
      {/* Section Title + Actions */}
      <div className="flex justify-between items-start">
        <div className="section-title-left flex items-center gap-2 w-full">
          <img src="/icons_logo/Icon=projet.svg" alt="Projets" className="section-icon" />
          <h2>{(state.showingPageType === 'teacher' || state.showingPageType === 'user') ? 'Découvrir les projets' : 'Gestion des projets'}</h2>
        </div>
        <div className="projects-actions">
          <div className="dropdown" style={{ position: 'relative' }}>
            <button className="btn btn-outline" onClick={handleExportProjects}>
              <i className="fas fa-download"></i> Exporter
            </button>
          </div>
          <button className="btn btn-primary" onClick={handleCreateProject}>
            <i className="fas fa-plus"></i> Créer un projet
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="projects-search-container">
        <div className="search-bar">
          <i className="fas fa-search search-icon"></i>
          <input
            type="text"
            className="search-input"
            placeholder="Rechercher un projet par titre, mot clé, parcours, statut..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="filters-container">
          <div className="filter-group">
            <select
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
            <select
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
            <input
              type="date"
              className="filter-select"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div className="filter-group">
            <input
              type="date"
              className="filter-select"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </div>
      </div>

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

    </section>
  );
};

export default Projects;