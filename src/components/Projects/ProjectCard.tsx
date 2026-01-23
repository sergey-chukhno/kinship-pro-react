import React, { useState } from 'react';
import { Project } from '../../types';
import DeletedUserDisplay from '../Common/DeletedUserDisplay';
import './ProjectCard.css';

interface ProjectCardProps {
  project: Project;
  onEdit?: (project: Project) => void;
  onManage?: (project: Project) => void;
  onDelete?: (project: Project) => void;
  isPersonalUser?: boolean;
  canManage?: boolean;
  canDelete?: boolean;
}

const ProjectCard: React.FC<ProjectCardProps> = ({ project, onEdit, onManage, onDelete, isPersonalUser = false, canManage = false, canDelete = false }) => {
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  // Format date from YYYY-MM-DD to DD-MM-YYYY
  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const [year, month, day] = dateString.split('-');
    return `${day}-${month}-${year}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'status-draft';
      case 'À venir': return 'status-coming';
      case 'En cours': return 'status-in-progress';
      case 'Terminée': return 'status-ended';
      case 'coming': return 'status-coming';
      case 'in_progress': return 'status-in-progress';
      case 'ended': return 'status-ended';
      default: return 'status-coming';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'draft': return 'Brouillon';
      case 'coming': return 'À venir';
      case 'in_progress': return 'En cours';
      case 'ended': return 'Terminée';
      default: return status;
    }
  };

  const getPathwayColor = (pathway: string) => {
    switch (pathway) {
      case 'sante': return 'pathway-sante';
      case 'citoyen': return 'pathway-citoyen';
      case 'eac': return 'pathway-eac';
      case 'creativite': return 'pathway-creativite';
      case 'avenir': return 'pathway-avenir';
      default: return 'pathway-other';
    }
  };

  const getPathwayText = (pathway: string) => {
    switch (pathway) {
      case 'sante': return 'Santé';
      case 'citoyen': return 'Citoyen';
      case 'eac': return 'EAC';
      case 'creativite': return 'Créativité';
      case 'avenir': return 'Avenir';
      case 'mlds': return 'MLDS';
      case 'faj_co': return 'FAJ Co';
      default: return 'Autre';
    }
  };

  return (
    <div className="project-card">
      <div className="project-image">
        {project.image && (
          <img src={project.image} alt={project.title} />
        )}
        <div className="project-status">
          <span className={`status-pill ${getStatusColor(project.status)}`}>
            {getStatusText(project.status)}
          </span>
        </div>
      </div>

      <div className="project-content">
        <div className="project-header">
          <h3 className="project-title">{project.title}</h3>
          {project.pathway && (
            <span className={`pathway-pill ${getPathwayColor(project.pathway)}`}>
              {getPathwayText(project.pathway)}
            </span>
          )}
        </div>

        <div className="project-description-section">
          <div className={`project-description-content ${isDescriptionExpanded ? 'expanded' : 'collapsed'}`}>
            <p>{project.description}</p>
          </div>
          {project.description.length > 120 && (
            <button 
              className="description-toggle-btn"
              onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
            >
              {isDescriptionExpanded ? (
                <>
                  <span>Voir moins</span>
                  <i className="fas fa-chevron-up"></i>
                </>
              ) : (
                <>
                  <span>Voir plus</span>
                  <i className="fas fa-chevron-down"></i>
                </>
              )}
            </button>
          )}
        </div>

        <div className="project-meta">
          <div className="project-owner">
            <i className="fas fa-user"></i>
            {project.responsible?.is_deleted ? (
              <DeletedUserDisplay 
                user={{
                  full_name: project.responsible.name,
                  email: project.responsible.email,
                  is_deleted: true
                }}
                showEmail={false}
              />
            ) : (
              <span>{project.responsible?.name || project.owner}</span>
            )}
          </div>
          <div className="project-dates">
            <i className="fas fa-calendar"></i>
            <span>{formatDate(project.startDate)} - {formatDate(project.endDate)}</span>
          </div>
        </div>

        <div className="project-actions">
          {canDelete && onDelete && (
            <button className="btn btn-outline btn-sm btn-danger" onClick={() => onDelete(project)}>
              <i className="fas fa-trash"></i>
              Supprimer
            </button>
          )}
          {canManage ? (
            <button className="btn btn-primary btn-sm" onClick={() => onManage?.(project)}>
              <i className="fas fa-cog"></i>
              Gérer
            </button>
          ) : (
            <button className="btn btn-primary btn-sm" onClick={() => onManage?.(project)}>
              <i className="fas fa-eye"></i>
              Voir plus
            </button>
          )}
        </div>
      </div>

      {/* Green counters for participants and badges - positioned at bottom right with overflow */}
      <div className="project-counters">
        <div className="project-counter">
          <img src="/icons_logo/Icon=Membres.svg" alt="Participants" className="counter-icon" />
          <span>{project.participants}</span>
        </div>
        <div className="project-counter">
          <img src="/icons_logo/Icon=Badges.svg" alt="Badges" className="counter-icon" />
          <span>{project.badges}</span>
        </div>
      </div>
    </div>
  );
};

export default ProjectCard;
