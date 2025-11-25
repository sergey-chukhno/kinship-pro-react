import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../context/AppContext';
import { Project } from '../../types';
import ProjectModal from '../Modals/ProjectModal';
import ProjectCard from '../Projects/ProjectCard';
import './Projects.css';

// Imports API (Ajustez les chemins si nécessaire, basés sur la structure de Members.tsx)
import { getCurrentUser } from '../../api/Authentication';
import { getUserProjectsBySchool , getUserProjectsByCompany, deleteProject} from '../../api/Project';

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
        const isEdu = state.showingPageType === 'edu';

        // 1. Récupération de l'ID du contexte (Company vs School)
        const contextId = isEdu
          ? currentUser.data?.available_contexts?.schools?.[0]?.id
          : currentUser.data?.available_contexts?.companies?.[0]?.id;

        if (!contextId) return;

        // 2. Choix de la fonction API
        const apiFunc = isEdu ? getUserProjectsBySchool : getUserProjectsByCompany;
        const response = await apiFunc(contextId);

        // Gestion de la structure de réponse { data: [ ... ], meta: ... }
        const rawProjects = response.data?.data || response.data || [];

        // 3. Mapping des données API vers le type Project
        const formattedProjects: Project[] = rawProjects.map((p: any) => {
            // Tentative de déduction du pathway via les skills ou tags, sinon default
            // Vous pouvez ajuster cette logique selon vos règles métier
            const derivedPathway = p.skills?.[0]?.name ? 'citoyen' : 'avenir';

            return {
                id: p.id.toString(),
                title: p.title,
                description: p.description || '',
                // L'API renvoie "coming", "in_progress" (implied), "ended" (implied)
                // ProjectCard gère déjà ces valeurs.
                status: p.status,
                // Conversion date ISO (2025-02-01T...) vers YYYY-MM-DD
                startDate: p.start_date ? p.start_date.split('T')[0] : '',
                endDate: p.end_date ? p.end_date.split('T')[0] : '',
                image: p.main_picture_url || '',
                // Mapping du owner
                owner: p.owner?.full_name || p.owner?.email || 'Inconnu',
                responsible: {
                    name: p.owner?.full_name || 'Inconnu',
                    // On pourrait ajouter l'avatar ici si ProjectCard le supporte dans l'objet responsible
                },
                // Données numériques
                participants: p.participants_number || 0,
                badges: 0, // Non fourni par l'API actuelle, valeur par défaut
                // Données catégorielles
                pathway: derivedPathway,
                skills: p.skills?.map((s: any) => s.name) || [],
                tags: p.tags || []
            };
        });

        setProjects(formattedProjects);

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
          <h2>Gestion des projets</h2>
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
        {filteredProjects.map((project) => (
          <ProjectCard
            key={project.id}
            project={project}
            onEdit={() => handleEditProject(project)}
            onManage={() => handleManageProject(project)}
            onDelete={() => handleDeleteProject(project.id)}
          />
        ))}
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