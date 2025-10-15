import React, { useState } from 'react';
import { Project } from '../../types';
import './Modal.css';

interface ProjectManagementModalProps {
  project: Project;
  onClose: () => void;
  onDelete?: (projectId: string) => void;
  onAssignBadge?: () => void;
  onCopyLink?: () => void;
}

const ProjectManagementModal: React.FC<ProjectManagementModalProps> = ({
  project,
  onClose,
  onDelete,
  onAssignBadge,
  onCopyLink
}) => {
  const [activeTab, setActiveTab] = useState('overview');

  const getStatusText = (status: string) => {
    switch (status) {
      case 'coming': return 'À venir';
      case 'in_progress': return 'En cours';
      case 'ended': return 'Terminé';
      default: return status;
    }
  };

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'coming': return 'coming';
      case 'in_progress': return 'in-progress';
      case 'ended': return 'ended';
      default: return 'coming';
    }
  };

  const handleDelete = () => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer ce projet ?')) {
      onDelete?.(project.id);
      onClose();
    }
  };

  const handleCopyLink = () => {
    const projectUrl = `${window.location.origin}/projects/${project.id}`;
    navigator.clipboard.writeText(projectUrl);
    onCopyLink?.();
  };

  const handleAssignBadge = () => {
    onAssignBadge?.();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content project-management-content" onClick={(e) => e.stopPropagation()}>
        {/* Project Info Section */}
        <div className="project-management-body">
          <div className="project-info-section-redesigned">
            {/* Left Column: Project Image */}
            <div className="project-image-column">
              <div className="project-cover-large">
                {project.image ? (
                  <img src={project.image} alt={project.title} />
                ) : (
                  <div className="default-project-image">
                    <i className="fas fa-image"></i>
                  </div>
                )}
              </div>
            </div>
            
            {/* Right Column: Project Details */}
            <div className="project-details-column">
              {/* Action Buttons at Top */}
              <div className="project-action-buttons">
                <button type="button" className="btn btn-outline" onClick={handleCopyLink}>
                  <i className="fas fa-link"></i> Copier le lien
                </button>
                <button type="button" className="btn btn-primary" onClick={handleAssignBadge}>
                  <i className="fas fa-award"></i> Attribuer un badge
                </button>
                <button type="button" className="modal-close" onClick={onClose} title="Fermer">
                  <i className="fas fa-times"></i>
                </button>
              </div>

              {/* Top Part: Title, Status, Actions */}
              <div className="project-details-top">
                <div className="project-title-status-group">
                  <h3 className="project-title-large">{project.title}</h3>
                  <div className="project-status-pills">
                    <span className={`project-modal-status-pill ${getStatusClass(project.status)}`}>
                      {getStatusText(project.status)}
                    </span>
                  </div>
                </div>
                <div className="project-actions-header">
                  <button type="button" className="btn-icon delete-btn" onClick={handleDelete} title="Supprimer le projet">
                    <img src="/icons_logo/Icon=trash.svg" alt="Delete" className="action-icon" />
                  </button>
                </div>
              </div>

              {/* Middle Part: Meta Info and Tags */}
              <div className="project-details-middle">
                <div className="project-meta-row">
                  <div className="meta-item">
                    <img src="/icons_logo/Icon=calendrier petit.svg" alt="Calendar" className="meta-icon" />
                    <span className="meta-text">{project.startDate} - {project.endDate}</span>
                  </div>
                  <div className="meta-item">
                    <img src="/icons_logo/Icon=Membres.svg" alt="Participants" className="meta-icon" />
                    <span className="meta-text">{project.participants} participants</span>
                  </div>
                  <div className="meta-item">
                    <img src="/icons_logo/Icon=Badges.svg" alt="Badges" className="meta-icon" />
                    <span className="meta-text">{project.badges} badges</span>
                  </div>
                </div>
                <div className="project-tags-row">
                  <div className="project-tags">
                    {project.tags?.map((tag, index) => (
                      <span key={index} className="tag">{tag}</span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Bottom Part: Project Manager */}
              <div className="project-details-bottom">
                <div className="project-manager-header">
                  <h4>Responsable du projet</h4>
                </div>
                <div className="project-manager-info">
                  <div className="manager-left">
                    <div className="manager-avatar">
                      <img src="https://randomuser.me/api/portraits/men/32.jpg" alt="Project Manager" />
                    </div>
                    <div className="manager-details">
                      <div className="manager-name">{project.owner}</div>
                      <div className="manager-role">Développeur</div>
                    </div>
                  </div>
                  <div className="manager-right">
                    <div className="manager-organization">
                      <img src="/icons_logo/Icon=projet.svg" alt="Organization" className="manager-icon" />
                      <span className="manager-text">{project.organization}</span>
                    </div>
                    <div className="manager-email">
                      <img src="/icons_logo/Icon=mail.svg" alt="Email" className="manager-icon" />
                      <span className="manager-text">admin@kinshipedu.fr</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Project Management Tabs */}
          <div className="project-management-tabs">
            <button 
              type="button" 
              className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
              onClick={() => setActiveTab('overview')}
            >
              Vue d'ensemble
            </button>
            <button 
              type="button" 
              className={`tab-btn ${activeTab === 'participants' ? 'active' : ''}`}
              onClick={() => setActiveTab('participants')}
            >
              Participants
            </button>
            <button 
              type="button" 
              className={`tab-btn ${activeTab === 'requests' ? 'active' : ''}`}
              onClick={() => setActiveTab('requests')}
            >
              Demandes
            </button>
            <button 
              type="button" 
              className={`tab-btn ${activeTab === 'kanban' ? 'active' : ''}`}
              onClick={() => setActiveTab('kanban')}
            >
              Kanban
            </button>
            <button 
              type="button" 
              className={`tab-btn ${activeTab === 'badges' ? 'active' : ''}`}
              onClick={() => setActiveTab('badges')}
            >
              Badges
            </button>
          </div>

          {/* Tab Content */}
          {activeTab === 'overview' && (
            <div className="tab-content active">
              <div className="overview-grid">
                <div className="overview-card">
                  <div className="stat-icon">
                    <i className="fas fa-chart-line"></i>
                  </div>
                  <h4>Progression</h4>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${project.progress || 0}%` }}></div>
                  </div>
                  <span className="progress-text">{project.progress || 0}% complété</span>
                </div>
                <div className="overview-card">
                  <div className="stat-icon">
                    <i className="fas fa-clock"></i>
                  </div>
                  <h4>Délais</h4>
                  <div className="deadline-info">
                    <span className="deadline-date">15 jours restants</span>
                    <span className="deadline-status on-track">Dans les délais</span>
                  </div>
                </div>
                <div className="overview-card">
                  <div className="stat-icon">
                    <i className="fas fa-tasks"></i>
                  </div>
                  <h4>Tâches</h4>
                  <div className="tasks-summary">
                    <span>12/18 tâches complétées</span>
                    <div className="task-progress">
                      {Array.from({ length: 18 }, (_, i) => (
                        <div key={i} className={`task-bar ${i < 12 ? 'completed' : ''}`}></div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'participants' && (
            <div className="tab-content">
              <div className="members-section">
                <div className="members-table">
                  {project.members?.map((member, index) => (
                    <div key={index} className="member-row">
                      <div className="member-avatar">
                        <img src="https://randomuser.me/api/portraits/men/32.jpg" alt={member} />
                      </div>
                      <div className="member-info">
                        <div className="member-name">{member}</div>
                        <div className="member-role">Participant</div>
                      </div>
                      <div className="member-badge badge-admin">Membre</div>
                      <div className="member-skills">
                        <span className="tag skill"><i className="fas fa-code"></i> Informatique</span>
                        <span className="tag skill"><i className="fas fa-lightbulb"></i> Créativité</span>
                      </div>
                      <div className="member-availability">
                        <span className="tag availability">Lundi</span>
                        <span className="tag availability">Mercredi</span>
                      </div>
                      <div className="member-actions">
                        <button type="button" className="btn-icon badge-btn" title="Attribuer un badge">
                          <img src="/icons_logo/Icon=Badges.svg" alt="Attribuer un badge" className="action-icon" />
                        </button>
                        <button type="button" className="btn-icon" title="Supprimer">
                          <img src="/icons_logo/Icon=trash.svg" alt="Delete" className="action-icon" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'requests' && (
            <div className="tab-content">
              <div className="requests-section">
                <h3>Demandes de participation</h3>
                <p>Aucune demande en attente</p>
              </div>
            </div>
          )}

          {activeTab === 'kanban' && (
            <div className="tab-content">
              <div className="kanban-section">
                <h3>Tableau Kanban</h3>
                <p>Fonctionnalité en développement</p>
              </div>
            </div>
          )}

          {activeTab === 'badges' && (
            <div className="tab-content">
              <div className="badges-section">
                <h3>Badges du projet</h3>
                <p>{project.badges} badges attribués</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProjectManagementModal;
