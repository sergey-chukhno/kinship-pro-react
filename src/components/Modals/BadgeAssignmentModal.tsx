import React, { useState, useEffect, useMemo, useCallback } from 'react';
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

// Validation rules for level 1 badges
interface BadgeValidationRule {
  mandatoryCompetencies: string[]; // Exact names of mandatory competencies
  minRequired: number; // Minimum number of competencies to select
  hintText: string; // Text to display next to label
}

const BADGE_VALIDATION_RULES: Record<string, BadgeValidationRule> = {
  'Adaptabilité': {
    mandatoryCompetencies: ['Identifie un problème (ses caractéristiques, ses conséquences) dans un projet ou une situation.'],
    minRequired: 1,
    hintText: 'Validation minimum de la compétence obligatoire ci-dessous:'
  },
  'Communication': {
    mandatoryCompetencies: [
      'Écoute et prend en compte ses interlocuteurs.'
    ],
    minRequired: 2,
    hintText: 'Validation obligatoire des 2 compétences ci-dessous :'
  },
  'Engagement': {
    mandatoryCompetencies: ['Aller au bout de son projet, de son engagement.'],
    minRequired: 1,
    hintText: 'Validation minimum de la compétence obligatoire ci-dessous :'
  },
  'Esprit critique': {
    mandatoryCompetencies: ['Vérifie la validité d\'une information.'],
    minRequired: 2,
    hintText: 'Validation minimum de 2 des 3 compétences ci-dessous dont la compétence obligatoire :'
  },
  'Gestion de projet': {
    mandatoryCompetencies: ['Met en œuvre une action dans un projet'],
    minRequired: 2,
    hintText: 'Validation minimum de 2 des 3 compétences ci-dessous :'
  },
  'Formation': {
    mandatoryCompetencies: ['Aide celui qui ne sait pas.'],
    minRequired: 2,
    hintText: 'Validation minimum de 2 des 3 compétences ci-dessous :'
  },
  'Coopération': {
    mandatoryCompetencies: ['Travaille en équipe en variant sa place et son rôle dans le groupe en tant que participant.'],
    minRequired: 2,
    hintText: 'Validation minimum de 2 des 3 compétences ci-dessous :'
  },
  'Sociabilité': {
    mandatoryCompetencies: [],
    minRequired: 2,
    hintText: 'Validation minimum de 2 des 3 compétences ci-dessous :'
  },
  'Organisation Opérationnelle': {
    mandatoryCompetencies: ['Se projette dans le temps.'],
    minRequired: 2,
    hintText: 'Validation minimum de 2 des 3 compétences ci-dessous :'
  },
  'Informatique & Numérique': {
    mandatoryCompetencies: [],
    minRequired: 2,
    hintText: 'Validation minimum de 2 des 3 compétences ci-dessous :'
  },
  'Créativité': {
    mandatoryCompetencies: ['Mobilise son imagination et sa créativité pour proposer une idée.'],
    minRequired: 1,
    hintText: 'Validation minimum de la compétence obligatoire ci-dessous :'
  },
  'Étape1': {
    mandatoryCompetencies: [
      "Dispose d'une connaissance de soi, ses aptitudes et sa motivation",
      "Dispose d'une connaissance concrète d'un ensemble de métiers pouvant correspondre à ses capacités"
    ],
    minRequired: 2,
    hintText: 'Validation des 2 compétences ci-dessous :'
  },
  'Étape2': {
    mandatoryCompetencies: [
      "S'approprie les résultats détaillés de la phase d'investigation",
      "Construit son projet professionnel et en vérifie la pertinence"
    ],
    minRequired: 3,
    hintText: 'Validation minimum de 3 des 5 compétences ci-dessous :'
  }
};

// Helper function to get display name for badge
// Maps incorrect names to correct display names
const getBadgeDisplayName = (name: string): string => {
  const displayNameMap: Record<string, string> = {
    'Information Numérique': 'Informatique & Numérique',
    'Information & Numérique': 'Informatique & Numérique',
  };
  
  return displayNameMap[name] || name;
};

// Helper function to normalize badge names for matching
// Handles variations like "Informatique & Numérique" vs "Information Numérique"
const normalizeBadgeNameForMatching = (name: string): string => {
  return name
    .trim()
    .toLowerCase()
    .replace(/\s*&\s*/g, ' ') // Replace "&" with space
    .replace(/\s+/g, ' ') // Normalize multiple spaces to single space
    .replace(/informatique/g, 'information') // Handle "Informatique" vs "Information"
    .trim();
};

// Helper function to get validation rules for a badge
// Uses flexible matching to handle variations in badge names
const getBadgeValidationRules = (badgeName: string): BadgeValidationRule | null => {
  // Try exact match first
  if (BADGE_VALIDATION_RULES[badgeName]) {
    return BADGE_VALIDATION_RULES[badgeName];
  }
  
  // Try case-insensitive match
  const normalizedBadgeName = badgeName.trim().toLowerCase();
  let matchingKey = Object.keys(BADGE_VALIDATION_RULES).find(
    key => key.toLowerCase() === normalizedBadgeName
  );
  
  if (matchingKey) {
    return BADGE_VALIDATION_RULES[matchingKey];
  }
  
  // Try flexible matching (handles "Informatique & Numérique" vs "Information Numérique")
  const flexibleNormalized = normalizeBadgeNameForMatching(badgeName);
  matchingKey = Object.keys(BADGE_VALIDATION_RULES).find(
    key => normalizeBadgeNameForMatching(key) === flexibleNormalized
  );
  
  return matchingKey ? BADGE_VALIDATION_RULES[matchingKey] : null;
};

// Helper function to normalize competency names for comparison
// Removes leading/trailing whitespace and normalizes the string
const normalizeCompetencyName = (name: string): string => {
  return name.trim();
};

// Fallback competencies for badges that don't have them in the API
// This is a temporary solution until the backend is updated
const FALLBACK_COMPETENCIES: Record<string, Array<{ id: number; name: string }>> = {
  'Sociabilité': [
    { id: -1, name: 'Prend sa place dans le groupe en étant attentif aux autres' },
    { id: -2, name: 'Est attentif à la portée de ses paroles ou de ses actes.' },
    { id: -3, name: 'Respecte les opinions d\'autrui.' }
  ]
};

// Helper function to get competencies for a badge (API data or fallback)
const getBadgeCompetencies = (badge: BadgeAPI | null): Array<{ id: number; name: string }> => {
  if (!badge) return [];
  
  // If badge has expertises from API, use them
  if (badge.expertises && badge.expertises.length > 0) {
    return badge.expertises;
  }
  
  // Otherwise, check for fallback competencies
  const fallback = FALLBACK_COMPETENCIES[badge.name];
  if (fallback) {
    return fallback;
  }
  
  return [];
};

// Validation function
const validateCompetencies = (
  selectedExpertiseIds: number[],
  badge: BadgeAPI | null,
  allExpertises: Array<{ id: number; name: string }>
): { isValid: boolean; errorMessage: string | null } => {
  // Validate level 1 and level 2 badges (for Série Parcours des possibles, level 2 also needs validation)
  if (!badge || (badge.level !== 'level_1' && badge.level !== 'level_2')) {
    return { isValid: true, errorMessage: null }; // No validation for non-level-1/level-2 badges
  }

  const rules = getBadgeValidationRules(badge.name);
  console.log('=== Validation Check ===');
  console.log('Badge name:', badge.name);
  console.log('Found rules:', rules ? 'YES' : 'NO');
  if (!rules) {
    console.warn(`No validation rules found for badge: "${badge.name}"`);
    return { isValid: true, errorMessage: null }; // No rules = no validation
  }

  // Get selected competency names and normalize them
  const selectedCompetencyNames = selectedExpertiseIds
    .map(id => allExpertises.find(e => e.id === id)?.name)
    .filter((name): name is string => name !== undefined)
    .map(normalizeCompetencyName);

  // Normalize mandatory competency names for comparison
  const normalizedMandatoryCompetencies = rules.mandatoryCompetencies.map(normalizeCompetencyName);

  // Debug logging to help identify mismatches
  if (rules.mandatoryCompetencies.length > 0) {
    console.log('=== Competency Validation Debug ===');
    console.log('Badge:', badge.name);
    console.log('All available expertises:', allExpertises.map(e => ({ id: e.id, name: e.name })));
    console.log('Selected expertise IDs:', selectedExpertiseIds);
    console.log('Selected competency names (normalized):', selectedCompetencyNames);
    console.log('Mandatory competencies (from rules):', rules.mandatoryCompetencies);
    console.log('Mandatory competencies (normalized):', normalizedMandatoryCompetencies);
  }

  // Check mandatory competencies using normalized comparison
  const missingMandatory = normalizedMandatoryCompetencies.filter(
    mandatory => !selectedCompetencyNames.includes(mandatory)
  );

  if (missingMandatory.length > 0) {
    // Find the original (non-normalized) names for the error message
    const missingOriginalNames = missingMandatory.map(normalizedName => {
      const originalIndex = normalizedMandatoryCompetencies.indexOf(normalizedName);
      return rules.mandatoryCompetencies[originalIndex];
    });
    const mandatoryList = missingOriginalNames.map(c => `"${c}"`).join(', ');
    return {
      isValid: false,
      errorMessage: `Compétence(s) obligatoire(s) manquante(s) : ${mandatoryList}`
    };
  }

  // Check minimum required
  if (selectedCompetencyNames.length < rules.minRequired) {
    return {
      isValid: false,
      errorMessage: `Vous devez sélectionner au moins ${rules.minRequired} compétence(s). Vous en avez sélectionné ${selectedCompetencyNames.length}.`
    };
  }

  return { isValid: true, errorMessage: null };
};

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
  
  const displaySeries = useCallback((seriesName: string) => {
    return seriesName.toLowerCase().includes('toukouleur') ? 'Série Soft Skills 4LAB' : seriesName;
  }, []);
  
  // Determine preview image (backend URL > local mapping > fallback)
  const previewImage = useMemo(() => {
    if (selectedBadge?.image_url) return selectedBadge.image_url;
    const local = getLocalBadgeImage(selectedBadge?.name);
    return local || undefined; // no image until a badge is selected
  }, [selectedBadge]);

  // Update selected participants when preselectedParticipant changes
  useEffect(() => {
    if (preselectedParticipant) {
      setSelectedParticipants([preselectedParticipant]);
    }
  }, [preselectedParticipant]);

  // Load badges from API (all levels)
  useEffect(() => {
    const fetchBadges = async () => {
      setLoadingBadges(true);
      try {
        // Fetch all badges (no level filter) to support multiple levels
        const badgesData = await getBadges();
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

  // Get badges for selected series and level
  const badgesForSeries = useMemo(() => {
    if (!series) return [];
    let filtered = (badgesBySeries[series] || []).filter((b) => b.name !== 'Test Badge');
    // Filter by level if level is selected
    if (level) {
      const levelKey = `level_${level}`;
      filtered = filtered.filter((b) => {
        const matches = b.level === levelKey;
        return matches;
      });
    }
    return filtered;
  }, [series, level, badgesBySeries]);

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

    // Validate competencies for level 1 and level 2 badges (for "Série Parcours des possibles")
    if (selectedBadge.level === 'level_1' || 
        (selectedBadge.level === 'level_2' && selectedBadge.series === 'Série Parcours des possibles')) {
      const competencies = getBadgeCompetencies(selectedBadge);
      if (competencies.length > 0) {
        const validation = validateCompetencies(
          selectedExpertises,
          selectedBadge,
          competencies
        );
        
        if (!validation.isValid && validation.errorMessage) {
          showWarningToast(validation.errorMessage);
          return;
        }
      }
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
      // Filter out negative IDs (fallback competencies that don't exist in backend)
      const validExpertiseIds = selectedExpertises.filter(id => id > 0);
      const badgeSkillIds = validExpertiseIds.length > 0 ? validExpertiseIds : undefined;

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
      const apiMessage = error.response?.data?.message || error.response?.data?.error;
      let friendlyMessage = apiMessage || error.message || "Erreur lors de l'attribution du badge";

      if (apiMessage?.toLowerCase().includes('active contract')) {
        friendlyMessage = 'Vous devez avoir un contrat actif pour attribuer des badges';
      } else if (apiMessage?.toLowerCase().includes('unable to determine organization')) {
        friendlyMessage = 'Organisation inconnue ou non autorisee pour attribuer des badges';
      }

      showErrorToast(friendlyMessage);
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
                {previewImage ? (
                  <img 
                    src={previewImage} 
                    alt={selectedBadge?.name || 'Badge'} 
                    className="badge-image-large" 
                  />
                ) : (
                  <img 
                    src="/4lab-logo.png" 
                    alt="4Lab" 
                    className="badge-image-large badge-default-logo" 
                  />
                )}
            </div>
            <div className="badge-preview-info">
                <h3>{selectedBadge ? getBadgeDisplayName(selectedBadge.name) : 'Sélectionnez un badge'}</h3>
              <p className="badge-series-level">
                  {selectedBadge ? `${displaySeries(selectedBadge.series)} - Niveau 1` : 'Sélectionnez une série et un badge'}
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
                      // Reset level to 1 when series changes
                      setLevel('1');
                    }}
                  >
                    <option value="">Sélectionner une série</option>
                    {availableSeries.map((s) => (
                      <option key={s} value={s}>
                        {displaySeries(s)}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Level selection - Dynamic based on series */}
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
                      <option value="1">
                        {series === 'Série Parcours des possibles' ? 'Niveau 1' : 'Niveau 1: Découverte'}
                      </option>
                      <option 
                        value="2" 
                        disabled={series !== 'Série Parcours des possibles'}
                      >
                        {series === 'Série Parcours des possibles' 
                          ? 'Niveau 2' 
                          : 'Niveau 2: Application (non disponible)'}
                      </option>
                      <option value="3" disabled>
                        {series === 'Série Parcours des possibles' ? 'Niveau 3 (non disponible)' : 'Niveau 3: Maîtrise (non disponible)'}
                      </option>
                      <option value="4" disabled>
                        {series === 'Série Parcours des possibles' ? 'Niveau 4 (non disponible)' : 'Niveau 4: Expertise (non disponible)'}
                      </option>
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
                        {getBadgeDisplayName(badge.name)}
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

            {/* Compétences (sélection multiple) */}
            {selectedBadge && (selectedBadge.level === 'level_1' || 
              (selectedBadge.level === 'level_2' && selectedBadge.series === 'Série Parcours des possibles')) && (
              <div className="form-group">
                <div className="competencies-label-container">
                  <label htmlFor="expertises">Compétences (sélection multiple)</label>
                  {(() => {
                    const rules = getBadgeValidationRules(selectedBadge.name);
                    if (rules) {
                      return (
                        <span className="competencies-hint-text">{rules.hintText}</span>
                      );
                    }
                    return null;
                  })()}
                </div>
                
                {(() => {
                  // Get competencies (from API or fallback)
                  const competencies = getBadgeCompetencies(selectedBadge);
                  
                  // Show message if no competencies available at all
                  if (competencies.length === 0) {
                    return (
                      <div className="competencies-list-empty" style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
                        <i className="fas fa-info-circle" style={{ marginRight: '8px' }}></i>
                        <span>Les compétences ne sont pas encore disponibles pour ce badge.</span>
                      </div>
                    );
                  }
                  
                  return (
                    <>
                      {/* Selected competencies as chips */}
                      {selectedExpertises.length > 0 && (
                        <div className="selected-competencies-chips">
                          {selectedExpertises.map((expertiseId) => {
                            const expertise = competencies.find((e: any) => e.id === expertiseId);
                            if (!expertise) return null;
                            const rules = (selectedBadge.level === 'level_1' || 
                              (selectedBadge.level === 'level_2' && selectedBadge.series === 'Série Parcours des possibles')) 
                              ? getBadgeValidationRules(selectedBadge.name) : null;
                            // Use normalized comparison to check if competency is mandatory
                            const normalizedExpertiseName = normalizeCompetencyName(expertise.name);
                            const normalizedMandatory = rules?.mandatoryCompetencies.map(normalizeCompetencyName) || [];
                            const isMandatory = normalizedMandatory.includes(normalizedExpertiseName);
                            return (
                              <div key={expertiseId} className={`competency-chip ${isMandatory ? 'competency-chip-mandatory' : ''}`}>
                                <span className="competency-chip-text">{expertise.name}</span>
                                {isMandatory && <span className="competency-chip-mandatory-badge">(Obligatoire)</span>}
                                <button
                                  type="button"
                                  className="competency-chip-remove"
                                  onClick={() => {
                                    setSelectedExpertises(selectedExpertises.filter(id => id !== expertiseId));
                                  }}
                                  aria-label={`Retirer ${expertise.name}`}
                                >
                                  <i className="fas fa-times"></i>
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                      
                      {/* Available competencies list */}
                      <div className="competencies-list-container">
                        {(() => {
                          const availableExpertises = competencies.filter(
                            (expertise: any) => !selectedExpertises.includes(expertise.id)
                          );
                          
                          if (availableExpertises.length === 0) {
                            return (
                              <div className="competencies-list-empty">
                                <i className="fas fa-check-circle"></i>
                                <span>Toutes les compétences ont été sélectionnées</span>
                              </div>
                            );
                          }
                          
                          const rules = (selectedBadge.level === 'level_1' || 
                            (selectedBadge.level === 'level_2' && selectedBadge.series === 'Série Parcours des possibles')) 
                            ? getBadgeValidationRules(selectedBadge.name) : null;
                          
                          return availableExpertises.map((expertise: any) => {
                            // Use normalized comparison to check if competency is mandatory
                            const normalizedExpertiseName = normalizeCompetencyName(expertise.name);
                            const normalizedMandatory = rules?.mandatoryCompetencies.map(normalizeCompetencyName) || [];
                            const isMandatory = normalizedMandatory.includes(normalizedExpertiseName);
                            return (
                              <button
                                key={expertise.id}
                                type="button"
                                className={`competency-item ${isMandatory ? 'competency-item-mandatory' : ''}`}
                                onClick={() => {
                                  setSelectedExpertises([...selectedExpertises, expertise.id]);
                                }}
                              >
                                <span className="competency-item-text">
                                  {expertise.name}
                                  {isMandatory && <span className="competency-mandatory-indicator"> (Obligatoire)</span>}
                                </span>
                                <i className="fas fa-plus competency-item-icon"></i>
                              </button>
                            );
                          });
                        })()}
                      </div>
                      
                      {selectedExpertises.length === 0 && competencies.length > 0 && (
                        <small className="field-comment">
                          Cliquez sur une compétence pour l'ajouter à votre sélection
                        </small>
                      )}
                    </>
                  );
                })()}
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
