import React, { useState, useEffect, useMemo } from 'react';
import { BadgeAttribution, BadgeAPI } from '../../types';
import { useAppContext } from '../../context/AppContext';
import { getBadges, assignBadge, getProjectBadges } from '../../api/Badges';
import { getLocalBadgeImage } from '../../utils/badgeImages';
import './Modal.css';
import './BadgeAssignmentModal.css';
import { useToast } from '../../hooks/useToast';

interface BadgeAssignmentModalProps {
  onClose: () => void;
  onAssign: (badgeData: BadgeAttribution) => void;
  participants: {
    id: string;
    memberId: string;
    name: string;
    avatar: string;
    organization?: string;
  }[];
  preselectedParticipant?: string | null;
  projectId?: string;
  projectTitle?: string;
  availableOrganizations?: Array<{
    id: number;
    name: string;
    type: 'School' | 'Company';
  }>;
}

interface Badge {
  title: string;
  image: string;
}

const BadgeAssignmentModal: React.FC<BadgeAssignmentModalProps> = ({ 
  onClose, 
  onAssign, 
  participants, 
  preselectedParticipant,
  projectId,
  projectTitle,
  availableOrganizations
}) => {
  const { state, addBadgeAttribution } = useAppContext();
  const { showWarning: showWarningToast, showError: showErrorToast, showSuccess: showSuccessToast } = useToast();
  const [series, setSeries] = useState('');
  const [level, setLevel] = useState('1'); // Default to level 1, disabled for other levels
  const [title, setTitle] = useState('');
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>(preselectedParticipant ? [preselectedParticipant] : []); // Multiple selection
  const [domaine, setDomaine] = useState('');
  const [selectedExpertises, setSelectedExpertises] = useState<number[]>([]); // Multiple selection
  const [commentaire, setCommentaire] = useState('');
  const [fichier, setFichier] = useState<File | null>(null);
  const [fileName, setFileName] = useState('');
  const [selectedOrganizationId, setSelectedOrganizationId] = useState<number | undefined>(undefined);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successData, setSuccessData] = useState<{
    badgeTitle: string;
    badgeImage: string;
  } | null>(null);
  
  // API data states
  const [badges, setBadges] = useState<BadgeAPI[]>([]);
  const [loadingBadges, setLoadingBadges] = useState(false);
  const [selectedBadge, setSelectedBadge] = useState<BadgeAPI | null>(null);
  
  // Determine preview image (backend URL > local mapping > fallback)
  const previewImage = useMemo(() => {
    if (selectedBadge?.image_url) {
      return selectedBadge.image_url;
    }
    const local = getLocalBadgeImage(selectedBadge?.name);
    return local || '/TouKouLeur-Jaune.png';
  }, [selectedBadge]);

  // Update selected participants when preselectedParticipant changes
  useEffect(() => {
    if (preselectedParticipant) {
      setSelectedParticipants([preselectedParticipant]);
    }
  }, [preselectedParticipant]);

  // Load badges from API (level 1 only)
  useEffect(() => {
    const fetchBadges = async () => {
      setLoadingBadges(true);
      try {
        // Filter only level 1 badges
        const badgesData = await getBadges({ level: 'level_1' });
        setBadges(badgesData);
      } catch (error) {
        console.error('Error fetching badges:', error);
        showErrorToast('Erreur lors du chargement des badges');
      } finally {
        setLoadingBadges(false);
      }
    };
    
    fetchBadges();
  }, []);

  // Determine available organizations for selection
  const organizationsForSelection = useMemo(() => {
    if (!availableOrganizations || availableOrganizations.length === 0) {
      // Extract from user's available_contexts
      const contexts = state.user?.available_contexts;
      const orgs: Array<{ id: number; name: string; type: 'School' | 'Company' }> = [];
      
      if (contexts?.schools) {
        contexts.schools.forEach((school: any) => {
          // Only include schools where user has badge permissions
          const badgeRoles = ['superadmin', 'admin', 'referent', 'référent', 'intervenant'];
          if (badgeRoles.includes(school.role?.toLowerCase() || '')) {
            orgs.push({ id: school.id, name: school.name || 'École', type: 'School' });
          }
        });
      }
      
      if (contexts?.companies) {
        contexts.companies.forEach((company: any) => {
          // Only include companies where user has badge permissions
          const badgeRoles = ['superadmin', 'admin', 'referent', 'référent', 'intervenant'];
          if (badgeRoles.includes(company.role?.toLowerCase() || '')) {
            orgs.push({ id: company.id, name: company.name || 'Organisation', type: 'Company' });
          }
        });
      }
      
      return orgs;
    }
    
    return availableOrganizations;
  }, [availableOrganizations, state.user?.available_contexts]);

  // Set default organization if only one available
  useEffect(() => {
    if (organizationsForSelection.length === 1) {
      setSelectedOrganizationId(organizationsForSelection[0].id);
    }
  }, [organizationsForSelection]);

  // Organize badges by series
  const badgesBySeries = useMemo(() => {
    const organized: { [series: string]: BadgeAPI[] } = {};
    badges.forEach((badge) => {
      if (!organized[badge.series]) {
        organized[badge.series] = [];
      }
      organized[badge.series].push(badge);
    });
    return organized;
  }, [badges]);

  // Get available series
  const availableSeries = useMemo(() => {
    return Object.keys(badgesBySeries);
  }, [badgesBySeries]);

  // Get badges for selected series
  const badgesForSeries = useMemo(() => {
    if (!series) return [];
    return badgesBySeries[series] || [];
  }, [series, badgesBySeries]);

  // Update selected badge when title changes
  useEffect(() => {
    if (series && title) {
      const badge = badgesForSeries.find((b) => b.name === title);
      if (badge) {
        setSelectedBadge(badge);
      }
    }
  }, [series, title, badgesForSeries]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFichier(file);
      setFileName(file.name);
    }
  };

  const handleSubmit = async () => {
    // Validation
    if (!selectedBadge) {
      showWarningToast('Veuillez sélectionner un badge');
      return;
    }
    
    if (selectedParticipants.length === 0) {
      showWarningToast('Veuillez sélectionner au moins un participant');
      return;
    }
    
    if (!projectId) {
      showErrorToast('ID du projet manquant');
      return;
    }

    // Organization selection is required if multiple organizations available
    if (organizationsForSelection.length > 1 && !selectedOrganizationId) {
      showWarningToast('Veuillez sélectionner une organisation');
      return;
    }

    // Level 1 only - file is optional
    // Comment is optional for level 1

    try {
      // Prepare recipient IDs (convert string IDs to numbers)
      const recipientIds = selectedParticipants
        .map((participantId) => {
          const participant = participants.find((p) => p.memberId === participantId);
          return participant ? parseInt(participant.memberId) : null;
        })
        .filter((id): id is number => id !== null);

      if (recipientIds.length === 0) {
        showErrorToast('Aucun participant valide sélectionné');
        return;
      }

      // Prepare badge skill IDs (expertises)
      const badgeSkillIds = selectedExpertises.length > 0 ? selectedExpertises : undefined;

      // Prepare files array
      const files = fichier ? [fichier] : undefined;

      // Call API
      const response = await assignBadge(
        parseInt(projectId),
        {
          badge_id: selectedBadge.id,
          recipient_ids: recipientIds,
          badge_skill_ids: badgeSkillIds,
          comment: commentaire || undefined,
          organization_id: selectedOrganizationId,
        },
        files
      );

      // Show success message
      showSuccessToast(
        `Badge "${selectedBadge.name}" attribué avec succès à ${response.assigned_count} participant(s)`
      );

      // Refresh badge list by calling onAssign (which should trigger a refresh)
      // Create a mock BadgeAttribution for backward compatibility
      const selectedParticipant = participants.find((p) => p.memberId === selectedParticipants[0]);
      if (selectedParticipant) {
        const attribution: BadgeAttribution = {
          id: `badge-${Date.now()}`,
          badgeId: selectedBadge.id.toString(),
          badgeTitle: selectedBadge.name,
          badgeSeries: selectedBadge.series,
          badgeLevel: '1',
          badgeImage: '/TouKouLeur-Jaune.png', // Will be replaced by actual badge image from API
          participantId: selectedParticipant.memberId,
          participantName: selectedParticipant.name,
          participantAvatar: selectedParticipant.avatar,
          participantOrganization: selectedParticipant.organization || 'Non spécifiée',
          attributedBy: state.user?.id?.toString() || '',
          attributedByName: state.user?.name || '',
          attributedByAvatar: state.user?.avatar || '',
          attributedByOrganization: state.user?.organization || 'Non spécifiée',
          projectId: projectId,
          projectTitle: projectTitle || '',
          domaineEngagement: domaine || '',
          commentaire: commentaire || undefined,
          preuve: fichier
            ? {
                name: fichier.name,
                type: fichier.type,
                size: `${(fichier.size / 1024).toFixed(1)} KB`,
              }
            : undefined,
          dateAttribution: new Date().toISOString(),
        };
        onAssign(attribution);
      }

      // Close modal after a short delay
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (error: any) {
      console.error('Error assigning badge:', error);
      const errorMessage =
        error.response?.data?.error ||
        error.message ||
        'Erreur lors de l\'attribution du badge';
      showErrorToast(errorMessage);
    }
  };

  const showSavoirFaires = series === 'universelle' && (level === '1' || level === '2') && title;
  const showCommentaireRequired = level === '3' || level === '4';
  const showFichierRequired = parseInt(level) >= 2;

  return (
    <div className="badge-assignment-modal-overlay" onClick={onClose}>
      <div className="badge-assignment-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="badge-assignment-modal-header">
          <h2>Attribuer un badge</h2>
          <button className="modal-close" onClick={onClose}>
            <i className="fas fa-times"></i>
          </button>
        </div>

        <div className="badge-assignment-modal-body">
          {/* Badge Preview Section */}
          <div className="badge-display-section">
            <div className="badge-icon-large">
              <img 
                src={previewImage} 
                alt={selectedBadge?.name || 'Badge'} 
                className="badge-image-large" 
              />
            </div>
            <div className="badge-preview-info">
              <h3>{selectedBadge?.name || 'Sélectionnez un badge'}</h3>
              <p className="badge-series-level">
                {selectedBadge ? `${selectedBadge.series} - Niveau 1` : 'Sélectionnez une série et un badge'}
              </p>
              {selectedBadge?.description && (
                <div className="badge-info-detail">
                  <p><strong>Description:</strong> {selectedBadge.description}</p>
                </div>
              )}
            </div>
          </div>

          {/* Form Section */}
          <div className="badge-assignment-form">
            {/* Organization selection - only if multiple organizations available */}
            {organizationsForSelection.length > 1 && (
              <div className="form-group">
                <label htmlFor="organization">Organisation</label>
                <select
                  id="organization"
                  className="form-select"
                  value={selectedOrganizationId || ''}
                  onChange={(e) => setSelectedOrganizationId(parseInt(e.target.value))}
                >
                  <option value="">Sélectionner une organisation</option>
                  {organizationsForSelection.map((org) => (
                    <option key={org.id} value={org.id}>
                      {org.name} ({org.type === 'School' ? 'École' : 'Entreprise'})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {loadingBadges ? (
              <div className="form-group">
                <p>Chargement des badges...</p>
              </div>
            ) : (
              <>
                <div className="form-group">
                  <label htmlFor="badgeSeries">Série de badge</label>
                  <select
                    id="badgeSeries"
                    className="form-select"
                    value={series}
                    onChange={(e) => {
                      setSeries(e.target.value);
                      setTitle('');
                      setSelectedBadge(null);
                    }}
                  >
                    <option value="">Sélectionner une série</option>
                    {availableSeries.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Level selection - Level 1 only, others disabled */}
                {series && (
                  <div className="form-group">
                    <label htmlFor="badgeLevel">Niveau</label>
                    <select
                      id="badgeLevel"
                      className="form-select"
                      value={level}
                      onChange={(e) => {
                        setLevel(e.target.value);
                        setTitle('');
                        setSelectedBadge(null);
                      }}
                      disabled={!series}
                    >
                      <option value="1">Niveau 1: Découverte</option>
                      <option value="2" disabled>Niveau 2: Application (non disponible)</option>
                      <option value="3" disabled>Niveau 3: Maîtrise (non disponible)</option>
                      <option value="4" disabled>Niveau 4: Expertise (non disponible)</option>
                    </select>
                  </div>
                )}

                <div className="form-group">
                  <label htmlFor="badgeTitle">Titre du badge</label>
                  <select
                    id="badgeTitle"
                    className="form-select"
                    value={title}
                    onChange={(e) => {
                      setTitle(e.target.value);
                      const badge = badgesForSeries.find((b) => b.name === e.target.value);
                      setSelectedBadge(badge || null);
                    }}
                    disabled={!series || !level}
                  >
                    <option value="">Sélectionner un badge</option>
                    {badgesForSeries.map((badge) => (
                      <option key={badge.id} value={badge.name}>
                        {badge.name}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}

            <div className="form-group">
              <label htmlFor="participants">Participants (sélection multiple)</label>
              <select
                id="participants"
                className="form-select"
                multiple
                size={Math.min(participants.length, 5)}
                value={selectedParticipants}
                onChange={(e) => {
                  const selected = Array.from(e.target.selectedOptions, (option) => option.value);
                  setSelectedParticipants(selected);
                }}
                disabled={!!preselectedParticipant}
              >
                {participants.map((p) => (
                  <option key={p.id} value={p.memberId}>
                    {p.name} {p.organization ? `(${p.organization})` : ''}
                  </option>
                ))}
              </select>
              {selectedParticipants.length > 0 && (
                <small className="field-comment">
                  {selectedParticipants.length} participant(s) sélectionné(s)
                </small>
              )}
            </div>

            {/* Domaine d'engagement field */}
            <div className="form-group">
              <label htmlFor="domaineEngagement">Domaine d'engagement</label>
              <select
                id="domaineEngagement"
                className="form-select"
                value={domaine}
                onChange={(e) => setDomaine(e.target.value)}
              >
                <option value="">Sélectionner un domaine</option>
                <option value="professionnel">Activité professionnelle (CDI, CDD, contrat d'alternance, job d'été,...)</option>
                <option value="scolaire">Cadre scolaire (projet, études,...)</option>
                <option value="associatif">Cadre associatif ou sportif (Projet, séjours)</option>
                <option value="experience">Expérience professionnelle (Formation, Stage en entreprise...)</option>
              </select>
            </div>

            {/* Expertises (sélection multiple) */}
            {selectedBadge && selectedBadge.expertises && selectedBadge.expertises.length > 0 && (
              <div className="form-group">
                <label htmlFor="expertises">Expertises (sélection multiple)</label>
                <select
                  id="expertises"
                  className="form-select"
                  multiple
                  size={Math.min(selectedBadge.expertises.length, 5)}
                  value={selectedExpertises.map((id) => id.toString())}
                  onChange={(e) => {
                    const selected = Array.from(e.target.selectedOptions, (option) =>
                      parseInt(option.value)
                    );
                    setSelectedExpertises(selected);
                  }}
                >
                  {selectedBadge.expertises.map((expertise) => (
                    <option key={expertise.id} value={expertise.id}>
                      {expertise.name}
                    </option>
                  ))}
                </select>
                {selectedExpertises.length > 0 && (
                  <small className="field-comment">
                    {selectedExpertises.length} expertise(s) sélectionnée(s)
                  </small>
                )}
              </div>
            )}

            {/* Commentaire - optional for level 1 */}
            <div className="form-group">
              <label htmlFor="commentaire">Commentaire (optionnel)</label>
              <textarea
                id="commentaire"
                className="form-textarea"
                rows={3}
                placeholder="Ajoutez un commentaire..."
                value={commentaire}
                onChange={(e) => setCommentaire(e.target.value)}
              />
            </div>

            {/* Fichier - optional for level 1 */}
            <div className="form-group">
              <label htmlFor="badgeFile">Fichier (preuve) - optionnel pour le niveau 1</label>
              <div className="file-upload-container">
                <input
                  type="file"
                  id="badgeFile"
                  className="file-input"
                  accept=".pdf,.jpg,.jpeg,.png,.mp4,.mov,.doc,.docx"
                  onChange={handleFileChange}
                />
                <label htmlFor="badgeFile" className="file-upload-label">
                  <i className="fas fa-upload"></i>
                  <span>Choisir un fichier</span>
                </label>
                {fileName && <div className="file-name">{fileName}</div>}
              </div>
            </div>
          </div>
        </div>

        <div className="badge-assignment-modal-footer">
          <button className="btn btn-outline" onClick={onClose}>
            Annuler
          </button>
          <button className="btn btn-primary" onClick={handleSubmit}>
            Attribuer
          </button>
        </div>
      </div>

      {/* Success Message */}
      {showSuccess && successData && (
        <div className="badge-success-overlay">
          <div className="badge-success-modal">
            <div className="badge-success-content">
              <div className="badge-success-icon">
                <i className="fas fa-check-circle"></i>
              </div>
              <div className="badge-success-badge">
                <img src={successData.badgeImage} alt={successData.badgeTitle} />
              </div>
              <h3>Badge attribué avec succès !</h3>
              <p>Le badge <strong>{successData.badgeTitle}</strong> a été attribué avec succès.</p>
              <button 
                className="btn btn-primary" 
                onClick={() => {
                  setShowSuccess(false);
                  onClose();
                }}
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BadgeAssignmentModal;
