import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { axiosClientWithoutToken } from '../../api/config';
import { mapApiProjectToFrontendProject } from '../../utils/projectMapper';
import './PublicProjectInfo.css';
import './ProjectManagement.css';
import { useAppContext } from '../../context/AppContext';
import { useToast } from '../../hooks/useToast';

function formatDate(dateString: string): string {
  if (!dateString || dateString.trim() === '') return 'Non renseigné';
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return 'Non renseigné';
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear().toString().slice(-2);
  return `${day}-${month}-${year}`;
}

function formatDateRange(startDate: string, endDate: string): string {
  const formattedStart = formatDate(startDate);
  const formattedEnd = formatDate(endDate);
  if (formattedStart === 'Non renseigné' && formattedEnd === 'Non renseigné') return 'Non renseigné';
  return `${formattedStart} - ${formattedEnd}`;
}

function getStatusText(status: string): string {
  switch (status) {
    case 'draft': return 'Brouillon';
    case 'to_process': return 'À traiter';
    case 'coming': return 'À venir';
    case 'in_progress': return 'En cours';
    case 'ended': return 'Terminé';
    default: return status;
  }
}

function getStatusClass(status: string): string {
  switch (status) {
    case 'draft': return 'draft';
    case 'to_process': return 'to-process';
    case 'coming': return 'coming';
    case 'in_progress': return 'in-progress';
    case 'ended': return 'ended';
    default: return 'coming';
  }
}

const SharedProjectInfo: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { state } = useAppContext();
  const { showError, showSuccess } = useToast();

  const [project, setProject] = useState<any>(null);
  const [apiProjectData, setApiProjectData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [isJoining, setIsJoining] = useState(false);

  useEffect(() => {
    if (!token) {
      setError('Lien invalide');
      setIsLoading(false);
      return;
    }

    const fetchProject = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const response = await axiosClientWithoutToken.get(`/api/v1/projects/shared/${token}`);
        const apiProject = response.data;
        setApiProjectData(apiProject);
        const mapped = mapApiProjectToFrontendProject(apiProject, 'pro', undefined);
        setProject(mapped);
      } catch (err: any) {
        console.error('Error fetching shared project:', err);
        setError(err?.response?.status === 404 ? 'Projet introuvable' : 'Erreur lors du chargement du projet');
      } finally {
        setIsLoading(false);
      }
    };

    fetchProject();
  }, [token]);

  const handleJoinProject = async () => {
    if (!apiProjectData?.id) return;

    // If user is not logged in, redirect to login and keep current URL as return path
    if (!state.user) {
      const redirect = encodeURIComponent(location.pathname + location.search);
      navigate(`/login?redirect=${redirect}`);
      return;
    }

    try {
      setIsJoining(true);
      const response = await axiosClientWithoutToken.post(
        `/api/v1/projects/${apiProjectData.id}/join`,
        {},
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('jwt_token') || ''}`,
          },
        }
      );
      if (response.status === 201 || response.status === 202) {
        showSuccess('Votre demande pour rejoindre le projet a été envoyée');
      } else {
        showSuccess('Votre demande pour rejoindre le projet a été prise en compte');
      }
    } catch (err: any) {
      console.error('Error joining project from shared link:', err);
      const message =
        err?.response?.data?.message ||
        err?.response?.data?.detail ||
        'Impossible de rejoindre le projet pour le moment';
      showError(message);
    } finally {
      setIsJoining(false);
    }
  };

  if (isLoading) {
    return (
      <div className="public-project-info-page" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
        <img src="/Kinship_logo.png" alt="Kinship" style={{ width: '160px', height: '40px', objectFit: 'contain', marginBottom: '2rem' }} />
        <div className="loader" style={{ border: '4px solid #f3f3f3', borderTop: '4px solid #6b7280', borderRadius: '50%', width: '48px', height: '48px', animation: 'spin 1s linear infinite' }} />
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="public-project-info-page" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
        <img src="/Kinship_logo.png" alt="Kinship" style={{ width: '160px', height: '40px', objectFit: 'contain', marginBottom: '2rem' }} />
        <p style={{ color: '#6b7280', fontSize: '1.125rem' }}>{error || 'Projet introuvable'}</p>
      </div>
    );
  }

  const allPhotos = [project.image, ...(project.additionalPhotos || [])].filter(Boolean);

  return (
    <div className="public-project-info-page" style={{ minHeight: '100vh', padding: '1.5rem 1rem 2rem' }}>
      <header style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <img src="/Kinship_logo.png" alt="Kinship" style={{ width: '160px', height: '40px', objectFit: 'contain' }} />
        <button
          type="button"
          className="btn btn-primary"
          onClick={handleJoinProject}
          disabled={isJoining}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <i className="fas fa-plus"></i>
          {isJoining ? 'Envoi...' : 'Rejoindre'}
        </button>
      </header>

      <div className="project-info-section-redesigned">
        <div className="project-image-column">
          <div className="project-cover-large">
            {allPhotos.length > 0 ? (
              <>
                <img src={allPhotos[currentPhotoIndex]} alt={project.title} />
                {allPhotos.length > 1 && (
                  <>
                    <button
                      type="button"
                      className="photo-nav-btn photo-nav-prev"
                      onClick={() => setCurrentPhotoIndex((i) => (i === 0 ? allPhotos.length - 1 : i - 1))}
                    >
                      <i className="fas fa-chevron-left"></i>
                    </button>
                    <button
                      type="button"
                      className="photo-nav-btn photo-nav-next"
                      onClick={() => setCurrentPhotoIndex((i) => (i === allPhotos.length - 1 ? 0 : i + 1))}
                    >
                      <i className="fas fa-chevron-right"></i>
                    </button>
                    <div className="photo-counter">
                      {currentPhotoIndex + 1} / {allPhotos.length}
                    </div>
                    <div className="photo-gallery-overlay">
                      <div className="gallery-thumbnails">
                        {allPhotos.map((photo: string, index: number) => (
                          <button
                            key={index}
                            type="button"
                            className={`gallery-thumbnail ${index === currentPhotoIndex ? 'active' : ''}`}
                            onClick={() => setCurrentPhotoIndex(index)}
                          >
                            <img src={photo} alt={`${project.title} ${index + 1}`} />
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </>
            ) : (
              <div className="default-project-image">
                <i className="fas fa-image"></i>
              </div>
            )}
          </div>
        </div>

        <div className="project-details-column">
          <div className="project-details-top">
            <div className="project-title-status-group">
              <h3 className="project-title-large">{project.title}</h3>
              <div className="project-status-pills">
                <span className={`project-modal-status-pill ${getStatusClass(project.status)}`}>
                  {getStatusText(project.status)}
                </span>
              </div>
            </div>
          </div>

          <div className="project-description-section">
            <div className={`project-description-content ${!isDescriptionExpanded ? 'expanded' : 'collapsed'}`}>
              <p>{project.description || ''}</p>
            </div>
            {project.description && project.description.length > 150 && (
              <button
                type="button"
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

          <div className="project-details-middle">
            <div className="project-meta-row">
              <div className="meta-item">
                <img src="/icons_logo/Icon=calendrier petit.svg" alt="Calendar" className="meta-icon" />
                <span className="meta-text">
                  {formatDateRange(project.startDate || '', project.endDate || '')}
                </span>
              </div>
              <div className="meta-item">
                <img src="/icons_logo/Icon=Membres.svg" alt="Participants" className="meta-icon" />
                <span className="meta-text">{project.participants} participants</span>
              </div>
              <div className="meta-item">
                <img src="/icons_logo/Icon=Badges.svg" alt="Badges" className="meta-icon" />
                <span className="meta-text">{project.badges ?? 0} badges</span>
              </div>
            </div>
            {/* Tags / parcours etc. */}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SharedProjectInfo;

