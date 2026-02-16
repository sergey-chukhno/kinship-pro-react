import React, { useState } from 'react';
import { Project } from '../../types';
import DeletedUserDisplay from '../Common/DeletedUserDisplay';
import './ProjectCard.css';

interface ProjectCardProps {
  project: Project;
  onEdit?: (project: Project) => void;
  onManage?: (project: Project) => void;
  onDelete?: (project: Project) => void;
  onClose?: (project: Project) => void;
  isPersonalUser?: boolean;
  canManage?: boolean;
  canDelete?: boolean;
  isOwnerOrCoOwner?: boolean;
}

const ProjectCard: React.FC<ProjectCardProps> = ({ project, onEdit, onManage, onDelete, onClose, isPersonalUser = false, canManage = false, canDelete = false, isOwnerOrCoOwner = false }) => {
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  
  // Check if project is ended - disable all actions if true
  const isProjectEnded = project.status === 'ended';
  // Format date from YYYY-MM-DD to DD-MM-YYYY
  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const [year, month, day] = dateString.split('-');
    return `${day}-${month}-${year}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'status-draft';
      case 'to_process': return 'status-to-process';
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
      case 'to_process': return 'À traiter';
      case 'coming': return 'À venir';
      case 'in_progress': return 'En cours';
      case 'ended': return 'Terminée';
      default: return status;
    }
  };

  /** Slug pour la classe CSS pathway-pill (aligné sur ProjectManagement). */
  const pathwaySlug = (name: string): string => {
    const accented = 'àâäéèêëïîôùûüçæœ';
    const plain = 'aaaeeeeiioouucaeoe';
    let s = String(name ?? '').toLowerCase().trim();
    for (let i = 0; i < accented.length; i++) {
      s = s.replaceAll(accented[i], plain[i]);
    }
    s = s.replace(/[^a-z0-9\s_]/g, '');
    return s.replace(/\s+/g, '_') || 'other';
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
        <div className="flex flex-col gap-2 project-header">
          {/* Display RS before title for MLDS projects with dates */}
          
          <h3 className="project-title">
          <span className='text-sm text-gray-500'>{project.mlds_information && project.rs && project.rs + ' '}</span>
            {project.title}
            
            </h3>
          {(() => {
            const pathwayList: string[] = (project.pathways && project.pathways.length > 0)
              ? project.pathways
              : (project.pathway ? [project.pathway] : []);
            if (pathwayList.length === 0) return null;
            return (
              <div className="project-card-pathways">
                {pathwayList.map((p: string, index: number) => (
                  <span key={`${p}-${index}`} className={`pathway-pill pathway-${pathwaySlug(p)}`}>
                    {p}
                  </span>
                ))}
              </div>
            );
          })()}
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
          {onClose && (project.status === 'in_progress' || project.status === 'coming') && (
            <button className="btn btn-outline btn-sm" onClick={() => onClose(project)}>
              <i className="fas fa-check-circle"></i>
              Clôturer
            </button>
          )}
          {canDelete && onDelete && !isProjectEnded && (
            <button className="btn btn-outline btn-sm btn-danger" onClick={() => onDelete(project)}>
              <i className="fas fa-trash"></i>
              Supprimer
            </button>
          )}
          {canManage && !isProjectEnded ? (
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

      {/* Green counters for participants, badges, and pending requests - positioned at bottom right with overflow */}
      <div className="project-counters">
        <div className="project-counter" title="Participants">
          <img src="/icons_logo/Icon=Membres.svg" alt="Participants" className="counter-icon" />
          <span>{project.participants}</span>
        </div>
        <div className="project-counter" title="Badges attribués">
          <img src="/icons_logo/Icon=Badges.svg" alt="Badges" className="counter-icon" />
          <span>{project.badges}</span>
        </div>
        {isOwnerOrCoOwner && (project.pendingRequests !== undefined && project.pendingRequests > 0) && (
          <div className="project-counter">
            <i className="fas fa-user-clock counter-icon" style={{ fontSize: '16px' }} title="Demandes en attente"></i>
            <span>{project.pendingRequests}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProjectCard;
