import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { axiosClientWithoutToken } from '../../api/config';
import { mapApiProjectToFrontendProject } from '../../utils/projectMapper';
import { translateRole } from '../../utils/roleTranslations';
import AvatarImage, { DEFAULT_AVATAR_SRC } from '../UI/AvatarImage';
import './PublicProjectInfo.css';
import './ProjectManagement.css';
import { useToast } from '../../hooks/useToast';

/** Safely render a value that may be a string or an object with name. */
function toDisplayString(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && value !== null && 'name' in value && typeof (value as { name?: unknown }).name === 'string') {
    return (value as { name: string }).name;
  }
  if (typeof value === 'object' && value !== null) return '';
  return String(value);
}

/** Slug pour la classe CSS des pathway-pill (accents normalisés, espaces -> _). */
function pathwaySlug(name: string): string {
  const accented = 'àâäéèêëïîôùûüçæœ';
  const plain = 'aaaeeeeiioouucaeoe';
  let s = String(name ?? '').toLowerCase().trim();
  for (let i = 0; i < accented.length; i++) {
    s = s.replace(new RegExp(accented[i], 'g'), plain[i]);
  }
  s = s.replace(/[^a-z0-9\s_]/g, '');
  return s.replace(/\s+/g, '_') || 'other';
}

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
  const { showError, showSuccess, showInfo } = useToast();

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

  const redirectToLoginForJoin = () => {
    showInfo('Connectez-vous pour demander à rejoindre ce projet.');
    const redirect = encodeURIComponent(location.pathname + location.search);
    navigate(`/login?redirect=${redirect}`);
  };

  const handleJoinProject = async () => {
    if (!apiProjectData?.id) return;

    const jwt = localStorage.getItem('jwt_token')?.trim();
    if (!jwt) {
      redirectToLoginForJoin();
      return;
    }

    try {
      setIsJoining(true);
      const response = await axiosClientWithoutToken.post(
        `/api/v1/projects/${apiProjectData.id}/join`,
        {},
        {
          headers: {
            Authorization: `Bearer ${jwt}`,
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
      if (err?.response?.status === 401) {
        redirectToLoginForJoin();
        return;
      }
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
            <div className="project-tags-row">
              {(() => {
                const pathwayList: string[] = (project.pathways && project.pathways.length > 0)
                  ? project.pathways
                  : (project.pathway ? [project.pathway] : []);
                if (pathwayList.length === 0) return null;
                return (
                  <div className="pathway-section">
                    <div className="section-label">Parcours</div>
                    <div className="pathway-container">
                      {pathwayList.map((p: string, index: number) => (
                        <span key={`${p}-${index}`} className={`pathway-pill pathway-${pathwaySlug(p)}`}>{p}</span>
                      ))}
                    </div>
                  </div>
                );
              })()}
              <div className="tags-section">
                <div className="section-label">Tags</div>
                <div className="project-tags">
                  {project.tags?.map((tag: string, index: number) => (
                    <span key={index} className="tag">#{tag}</span>
                  ))}
                </div>
              </div>
              {(() => {
                const schoolLevels =
                  (apiProjectData?.school_levels as any[] | undefined) ||
                  ((project as any)?.school_levels as any[] | undefined) ||
                  [];

                if (!Array.isArray(schoolLevels) || schoolLevels.length === 0) return null;

                return (
                  <div className="school_level-section">
                    <div className="section-label">Classes</div>
                    <div className="project-tags">
                      {schoolLevels.map((school_level: any) => (
                        <span key={school_level.id?.toString() || school_level.name} className="tag">
                          {school_level.name}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>

          <div className="project-details-bottom">
            {/* Responsable du projet */}
            <div className="project-manager-section">
              <div className="project-manager-header">
                <h4>Responsable du projet</h4>
              </div>
              <div className="project-manager-info">
                <div className="manager-left">
                  <div className="manager-avatar">
                    <AvatarImage src={project.responsible?.avatar || DEFAULT_AVATAR_SRC} alt="Project Manager" />
                  </div>
                  <div className="manager-details">
                    <div className="manager-name">{project.responsible?.name || project.owner}</div>
                    <div className="manager-role">
                      {(() => {
                        const r = project.responsible;
                        const systemLabel = r?.role_in_system ? translateRole(r.role_in_system) : '';
                        const orgLabel = r?.role ? translateRole(r.role) : '';
                        return [systemLabel, orgLabel].filter(Boolean).join(' • ');
                      })()}
                    </div>
                  </div>
                </div>
                <div className="manager-right">
                  <div className="manager-organization">
                    <img src="/icons_logo/Icon=projet.svg" alt="Organization" className="manager-icon" />
                    <span className="manager-text">{toDisplayString(project.responsible?.organization)}</span>
                  </div>
                  <div className="manager-email">
                    <img src="/icons_logo/Icon=mail.svg" alt="Email" className="manager-icon" />
                    <span className="manager-text">{project.responsible?.email || ''}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Co-responsables */}
            {project.coResponsibles && project.coResponsibles.length > 0 && (
              <div className="project-co-responsibles-section">
                <div className="project-manager-header">
                  <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    Co-responsables
                    <span className="info-tooltip-wrapper">
                      <i className="fas fa-info-circle" style={{ color: '#6b7280', fontSize: '0.875rem', cursor: 'help' }}></i>
                      <div className="info-tooltip">
                        <div style={{ fontWeight: '600', marginBottom: '8px' }}>Les co-responsables peuvent :</div>
                        <ul>
                          <li>voir le projet dans leur profil</li>
                          <li>ajouter des membres de leur organisation uniquement et modifier leur statut (sauf admin)</li>
                          <li>attribuer des badges</li>
                          <li>faire des équipes et donner des rôles dans équipe</li>
                          <li>plus tard attribuer des tâches (Kanban)</li>
                        </ul>
                      </div>
                    </span>
                  </h4>
                </div>
                <div className="co-responsibles-list">
                  {project.coResponsibles.map((coResponsible: any, index: number) => (
                    <div key={coResponsible.id || index} className="co-responsible-item">
                      <div className="manager-left">
                        <div className="manager-avatar">
                          <AvatarImage src={coResponsible.avatar || DEFAULT_AVATAR_SRC} alt={coResponsible.name} />
                        </div>
                        <div className="manager-details">
                          <div className="manager-name">{coResponsible.name}</div>
                          <div className="manager-role">
                            {(() => {
                              const systemLabel = coResponsible.role_in_system ? translateRole(coResponsible.role_in_system) : '';
                              const orgLabel = coResponsible.role ? translateRole(coResponsible.role) : '';
                              return [systemLabel, orgLabel].filter(Boolean).join(' • ');
                            })()}
                          </div>
                        </div>
                      </div>
                      <div className="manager-right">
                        <div className="manager-organization">
                          <img src="/icons_logo/Icon=projet.svg" alt="Organization" className="manager-icon" />
                          <span className="manager-text">{toDisplayString(coResponsible.organization)}</span>
                        </div>
                        <div className="manager-email">
                          <img src="/icons_logo/Icon=mail.svg" alt="Email" className="manager-icon" />
                          <span className="manager-text">{coResponsible.email}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Partenaire(s) - from partnership_details */}
            {((project.partners && project.partners.length > 0) || project.partner) && (
              <div className="project-partner-section">
                <div className="project-manager-header">
                  <h4>Partenaire{((project.partners?.length ?? 0) > 1 ? 's' : '')}</h4>
                </div>
                <div className="flex flex-col !items-start project-partner-info">
                  {(project.partners && project.partners.length > 0
                    ? project.partners
                    : project.partner ? [project.partner] : []
                  ).map((p: any) => (
                    <div key={p.id} className="manager-left">
                      <div className="manager-avatar">
                        <AvatarImage
                          src={p.logo || '/default-avatar.png'}
                          alt={p.name}
                          className="manager-avatar-img"
                        />
                      </div>
                      <div className="manager-details">
                        <div className="manager-name">{toDisplayString(p.organization)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SharedProjectInfo;

