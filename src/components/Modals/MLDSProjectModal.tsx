import React, { useState, useEffect } from 'react';
import { Project } from '../../types';
import { useAppContext } from '../../context/AppContext';
import { getPartnerships, getOrganizationMembers, getTeacherMembers, createProject } from '../../api/Projects';
import { getSchoolLevels } from '../../api/SchoolDashboard/Levels';
import {
  mapFrontendToBackend,
  getOrganizationId,
  getOrganizationType
} from '../../utils/projectMapper';
import './Modal.css';
import AvatarImage from '../UI/AvatarImage';

interface MLDSProjectModalProps {
  onClose: () => void;
  onSave: (projectData: Omit<Project, 'id'>) => void;
}

const MLDSProjectModal: React.FC<MLDSProjectModalProps> = ({ onClose, onSave }) => {
  const { state } = useAppContext();

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    startDate: '',
    endDate: '',
    organization: '',
    status: 'draft' as 'draft' | 'coming' | 'in_progress' | 'ended',
    visibility: 'public' as 'public' | 'private',
    pathway: 'mlds', // Set to MLDS by default
    tags: '',
    links: '',
    participants: [] as string[],
    image: '',
    coResponsibles: [] as string[],
    isPartnership: false,
    partner: '',
    additionalImages: [] as string[],
    // MLDS specific fields
    mldsRequestedBy: '', // Demande faite par: Departement / reseau foquale
    mldsOrganizations: [] as string[], // Organisation porteuse (multi-select)
    mldsTargetAudience: '', // Public ciblé
    mldsActionObjectives: [] as string[], // Objectifs de l'action (multi-select)
    mldsActionObjectivesOther: '', // Autre objectif (texte libre)
    mldsCompetenciesDeveloped: '', // Compétences développées par l'action
    mldsExpectedParticipants: '', // Effectifs prévisionnel
    mldsObjectives: '',
    mldsCompetencies: [] as string[],
    // Financial means
    mldsFinancialHSE: '', // HSE
    mldsFinancialHV: '', // HV
    mldsFinancialTransport: '', // Frais de transport
    mldsFinancialOperating: '', // Frais de fonctionnement
    mldsFinancialService: '', // Prestataires de service
  });

  const [imagePreview, setImagePreview] = useState<string>('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [successData, setSuccessData] = useState<{ title: string, image: string } | null>(null);

  // Loading states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);
  const [isLoadingPartnerships, setIsLoadingPartnerships] = useState(false);
  const [isLoadingClasses, setIsLoadingClasses] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [availablePartnerships, setAvailablePartnerships] = useState<any[]>([]);
  const [availableClasses, setAvailableClasses] = useState<any[]>([]);
  const [searchTerms, setSearchTerms] = useState({
    coResponsibles: '',
    participants: '',
    partner: ''
  });
  
  // Teacher project context: 'independent' or 'school'
  const teacherProjectContext: 'independent' | 'school' = 'independent';
  const selectedSchoolId: number | undefined = undefined;

  // MLDS options
  const mldsRequestedByOptions = [
    'Departement',
    'Reseau foquale'
  ];

  const mldsTargetAudienceOptions = [
    'Élèves sans solution à la rentrée',
    'Élèves en situation de décrochage repérés par le GPDS',
    'Équipes des établissements'
  ];

  const mldsActionObjectivesOptions = [
    'La sécurisation des parcours : liaison inter-cycles pour les élèves les plus fragiles',
    'La découverte des filières professionnelles',
    'Le développement de la mobilité des élèves',
    'Le développement des CPS pour les élèves en situation ou en risque de décrochage scolaire avéré',
    'Le rapprochement des établissements avec les partenaires du territoire (missions locales, associations, entreprises, etc.) afin de mettre en place des parcours personnalisés (PAFI, TDO, PAE, autres)',
    'Le renforcement des liens entre les familles et les élèves en risque ou en situation de décrochage scolaire',
    'Des actions de co-développement professionnel ou d\'accompagnement d\'équipes (tutorat, intervention de chercheurs, etc.)',
    'Autre'
  ];

  const mldsCompetenciesOptions = [
    'Autonomie',
    'Communication',
    'Travail en équipe',
    'Gestion du temps',
    'Résolution de problèmes',
    'Créativité',
    'Adaptabilité',
    'Esprit critique',
  ];

  // Fetch members
  useEffect(() => {
    const fetchMembers = async () => {
      setIsLoadingMembers(true);
      try {
        const organizationType = getOrganizationType(state.showingPageType);
        const organizationId = getOrganizationId(state.user, state.showingPageType);

        if (state.showingPageType === 'teacher') {
          const membersData = await getTeacherMembers();
          setMembers(membersData || []);
        } else if (organizationType && organizationId) {
          const membersData = await getOrganizationMembers(organizationId, organizationType);
          setMembers(membersData || []);
        }
      } catch (err) {
        console.error('Error fetching members:', err);
        setMembers([]);
      } finally {
        setIsLoadingMembers(false);
      }
    };

    fetchMembers();
  }, [state.showingPageType, state.user]);

  // Fetch partnerships - only when partnership checkbox is checked
  useEffect(() => {
    const fetchPartnerships = async () => {
      if (!formData.isPartnership) {
        setAvailablePartnerships([]);
        return;
      }

      setIsLoadingPartnerships(true);
      try {
        const organizationType = getOrganizationType(state.showingPageType);
        const organizationId = getOrganizationId(state.user, state.showingPageType);

        if (organizationType && organizationId) {
          const response = await getPartnerships(organizationId, organizationType);
          setAvailablePartnerships(response.data || []);
        }
      } catch (err) {
        console.error('Error fetching partnerships:', err);
        setAvailablePartnerships([]);
      } finally {
        setIsLoadingPartnerships(false);
      }
    };

    fetchPartnerships();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.showingPageType, state.user, formData.isPartnership]);

  // Fetch classes (levels) from school
  useEffect(() => {
    const fetchClasses = async () => {
      setIsLoadingClasses(true);
      try {
        const organizationType = getOrganizationType(state.showingPageType);
        const organizationId = getOrganizationId(state.user, state.showingPageType);

        // Only fetch classes for school context
        if (organizationType === 'school' && organizationId) {
          const response = await getSchoolLevels(organizationId, 1, 100);
          setAvailableClasses(response.data?.data || []);
        } else {
          setAvailableClasses([]);
        }
      } catch (err) {
        console.error('Error fetching classes:', err);
        setAvailableClasses([]);
      } finally {
        setIsLoadingClasses(false);
      }
    };

    fetchClasses();
  }, [state.showingPageType, state.user]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === 'isPartnership') {
      setFormData(prev => ({
        ...prev,
        isPartnership: (e.target as HTMLInputElement).checked,
        partner: (e.target as HTMLInputElement).checked ? prev.partner : ''
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleCompetencyToggle = (competency: string) => {
    setFormData(prev => ({
      ...prev,
      mldsCompetencies: prev.mldsCompetencies.includes(competency)
        ? prev.mldsCompetencies.filter(c => c !== competency)
        : [...prev.mldsCompetencies, competency]
    }));
  };

  const handleActionObjectiveToggle = (objective: string) => {
    setFormData(prev => ({
      ...prev,
      mldsActionObjectives: prev.mldsActionObjectives.includes(objective)
        ? prev.mldsActionObjectives.filter(o => o !== objective)
        : [...prev.mldsActionObjectives, objective]
    }));
  };

  const handleOrganizationToggle = (orgId: string) => {
    setFormData(prev => ({
      ...prev,
      mldsOrganizations: prev.mldsOrganizations.includes(orgId)
        ? prev.mldsOrganizations.filter(o => o !== orgId)
        : [...prev.mldsOrganizations, orgId]
    }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setImagePreview(base64String);
        setFormData(prev => ({ ...prev, image: base64String }));
      };
      reader.readAsDataURL(file);
    }
  };

  // Helper functions for member and partner selection
  const getFilteredMembers = (searchTerm: string) => {
    if (!members || !Array.isArray(members)) {
      return [];
    }
    
    const currentUserId = state.user?.id?.toString();
    const selectedMemberIds = [
      ...formData.coResponsibles.map(id => id.toString()),
      ...formData.participants.map(id => id.toString())
    ];
    
    let availableMembers = members.filter((member: any) => {
      if (!member) return false;
      const memberIdStr = member.id?.toString();
      if (currentUserId && memberIdStr === currentUserId) {
        return false;
      }
      return !selectedMemberIds.includes(memberIdStr);
    });
    
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      availableMembers = availableMembers.filter((member: any) => {
        const fullName = `${member.first_name || ''} ${member.last_name || ''}`.toLowerCase();
        const memberFullName = member.full_name?.toLowerCase() || '';
        const memberRole = member.role?.toLowerCase() || '';
        const memberEmail = member.email?.toLowerCase() || '';
        
        return fullName.includes(searchLower) ||
               memberFullName.includes(searchLower) ||
               memberRole.includes(searchLower) ||
               memberEmail.includes(searchLower);
      });
    }
    
    return availableMembers;
  };

  const getFilteredPartners = (searchTerm: string) => {
    if (!availablePartnerships || !Array.isArray(availablePartnerships)) return [];
    
    const savedContextId = localStorage.getItem('selectedContextId');
    const savedContextType = localStorage.getItem('selectedContextType');
    
    let filtered = availablePartnerships;
    if (savedContextId && savedContextType) {
      const currentOrgId = Number.parseInt(savedContextId);
      filtered = availablePartnerships.filter(partnership => {
        return !partnership.partners?.some((partner: any) => 
          partner.id === currentOrgId && 
          partner.type?.toLowerCase() === savedContextType.toLowerCase()
        );
      });
    }
    
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter((partnership: any) => {
        const partnerNames = partnership.partners?.map((p: any) => p.name.toLowerCase()).join(' ') || '';
        const partnershipName = partnership.name?.toLowerCase() || '';
        return partnerNames.includes(searchLower) || partnershipName.includes(searchLower);
      });
    }
    
    return filtered;
  };

  const handleSearchChange = (field: string, value: string) => {
    setSearchTerms(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleMemberSelect = (field: string, memberId: string) => {
    if (field === 'coResponsibles') {
      const newCoResponsibles = formData.coResponsibles.includes(memberId)
        ? formData.coResponsibles.filter(id => id !== memberId)
        : [...formData.coResponsibles, memberId];
      setFormData(prev => ({ ...prev, coResponsibles: newCoResponsibles }));
    } else if (field === 'participants') {
      const newParticipants = formData.participants.includes(memberId)
        ? formData.participants.filter(id => id !== memberId)
        : [...formData.participants, memberId];
      setFormData(prev => ({ ...prev, participants: newParticipants }));
    }
  };

  const handlePartnerSelect = (partnerId: string) => {
    setFormData(prev => ({ ...prev, partner: partnerId }));
  };

  const getSelectedMember = (memberId: string) => {
    return members.find((m: any) => m.id === memberId || m.id === Number.parseInt(memberId));
  };

  const getSelectedPartner = (partnerId: string) => {
    return availablePartnerships.find((p: any) => p.id === partnerId || p.id === Number.parseInt(partnerId));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      // Validate required fields
      if (!formData.title || !formData.description || !formData.startDate || !formData.endDate) {
        setSubmitError('Veuillez remplir tous les champs obligatoires');
        setIsSubmitting(false);
        return;
      }

      // Map frontend data to backend format
      const backendData = mapFrontendToBackend(
        formData,
        state.user as any,
        state.showingPageType as any,
        teacherProjectContext as any,
        selectedSchoolId as any
      );

      // Create project via API
      const response = await createProject(backendData);
      
      if (response) {
        // Show success message
        setSuccessData({
          title: formData.title,
          image: formData.image
        });
        setShowSuccess(true);

        // Build a Project object that matches the expected type
        const projectData: Omit<Project, 'id'> = {
          title: formData.title,
          description: formData.description,
          startDate: formData.startDate,
          endDate: formData.endDate,
          organization: formData.organization,
          status: formData.status,
          visibility: formData.visibility,
          pathway: formData.pathway,
          tags: formData.tags ? formData.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
          links: formData.links,
          participants: formData.participants.length,
          badges: 0,
          image: formData.image,
          additionalPhotos: formData.additionalImages,
          owner: state.user?.name || '',
          progress: 0,
          members: formData.participants,
          events: [],
          badges_list: [],
          coResponsibles: formData.coResponsibles.map(id => {
            const member = members.find(m => m.id.toString() === id);
            return {
              id: id,
              name: member ? `${member.first_name} ${member.last_name}` : '',
              avatar: member?.avatar_url || '',
              profession: member?.role || '',
              organization: '',
              email: member?.email || ''
            };
          }),
          partner: formData.isPartnership && formData.partner ? {
            id: formData.partner,
            name: availablePartnerships.find(p => p.id.toString() === formData.partner)?.name || '',
            logo: '',
            organization: ''
          } : null,
          responsible: null
        };

        // Call onSave callback
        setTimeout(() => {
          onSave(projectData);
          setShowSuccess(false);
          onClose();
        }, 2000);
      }
    } catch (err: any) {
      console.error('Error creating MLDS project:', err);
      setSubmitError(err.response?.data?.message || 'Une erreur est survenue lors de la création du projet');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (showSuccess && successData) {
  return (
    <div className="modal-overlay" onClick={onClose} role="presentation">
      <div className="modal-content success-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
          <div className="success-animation">
            <div className="success-checkmark">
              <i className="fas fa-check"></i>
            </div>
          </div>
          <h2 className="success-title">Projet MLDS créé avec succès !</h2>
          {successData.image && (
            <div className="success-image">
              <img src={successData.image} alt={successData.title} />
            </div>
          )}
          <p className="success-project-title">{successData.title}</p>
          <p className="success-message">
            Votre projet MLDS Volet Persévérance Scolaire a été créé et est maintenant visible.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={onClose} role="presentation">
      <div className="modal-content project-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <button className="modal-close" onClick={onClose}>
          <i className="fas fa-times"></i>
        </button>
        
        <div className="flex flex-col gap-2 modal-header">
          <h2>
            <i className="fas fa-graduation-cap" style={{ marginRight: '12px' }}></i>
            Créer un projet MLDS Volet Persévérance Scolaire
          </h2>
          <p className="modal-subtitle">
            Mission de Lutte contre le Décrochage Scolaire - Volet Persévérance Scolaire
          </p>
        </div>

        {submitError && (
          <div className="error-message" style={{ 
            padding: '12px', 
            marginBottom: '16px', 
            backgroundColor: '#fee2e2', 
            color: '#dc2626', 
            borderRadius: '8px',
            fontSize: '14px'
          }}>
            <i className="fas fa-exclamation-circle" style={{ marginRight: '8px' }}></i>
            {submitError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="modal-form">
          {/* Basic Information */}
          <div className="form-section">
            <h3 className="form-section-title">Informations générales</h3>
             <div className="form-group">
                 <label htmlFor="mldsRequestedBy">Demande faite par</label>
                 <select
                   id="mldsRequestedBy"
                   name="mldsRequestedBy"
                   className="form-select"
                   value={formData.mldsRequestedBy}
                   onChange={handleInputChange}
                 >
                
                  {mldsRequestedByOptions.map(option => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </div>
            <div className="form-group">
              <label htmlFor="title" className="required">Titre du projet</label>
              <input
                type="text"
                id="title"
                name="title"
                className="form-input"
                value={formData.title}
                onChange={handleInputChange}
                placeholder="Ex: Atelier de remobilisation scolaire"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="description" className="required">Description</label>
              <textarea
                id="description"
                name="description"
                className="form-textarea"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Décrivez le projet MLDS et ses objectifs..."
                rows={4}
                required
              />
            </div>
            {/* Project Image Selection */}
            <div className="form-section">
              <h3>Image du projet</h3>
              <div className="avatar-selection">
                <div className="avatar-preview">
                  {imagePreview ? (
                    <img src={imagePreview} alt="Project preview" className="avatar-image" />
                  ) : (
                    <div className="avatar-placeholder">
                      <i className="fas fa-image"></i>
                      <span>Image par défaut</span>
                    </div>
                  )}
                </div>
                <div className="avatar-actions">
                  <button
                    type="button"
                    onClick={() => document.getElementById('projectImage')?.click()}
                    className="btn btn-outline btn-sm"
                  >
                    <i className="fas fa-upload"></i>
                    Choisir une image
                  </button>
                  <input
                    id="projectImage"
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    style={{ display: 'none' }}
                  />
                  <p className="avatar-note">
                    Si aucune image n'est sélectionnée, l'image par défaut sera utilisée
                  </p>
                </div>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="startDate" className="required">Date de début</label>
                <input
                  type="date"
                  id="startDate"
                  name="startDate"
                  className="form-input"
                  value={formData.startDate}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="endDate" className="required">Date de fin</label>
                <input
                  type="date"
                  id="endDate"
                  name="endDate"
                  className="form-input"
                  value={formData.endDate}
                  onChange={handleInputChange}
                  required
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="status">Statut</label>
                <select
                  id="status"
                  name="status"
                  className="form-select"
                  value={formData.status}
                  onChange={handleInputChange}
                >
                  <option value="draft">Brouillon</option>
                  <option value="coming">À venir</option>
                  <option value="in_progress">En cours</option>
                  <option value="ended">Terminé</option>
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="visibility">Visibilité</label>
                <select
                  id="visibility"
                  name="visibility"
                  className="form-select"
                  value={formData.visibility}
                  onChange={handleInputChange}
                >
                  <option value="public">Public</option>
                  <option value="private">Privé</option>
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="mldsExpectedParticipants">Effectifs prévisionnel</label>
                <input
                  type="number"
                  id="mldsExpectedParticipants"
                  name="mldsExpectedParticipants"
                  className="form-input"
                  value={formData.mldsExpectedParticipants}
                  onChange={handleInputChange}
                  placeholder="Nbr participants"
                  min="0"
                />
              </div>
              <div className="form-group">
              <label htmlFor="mldsTargetAudience">Public ciblé</label>
              <select
                id="mldsTargetAudience"
                name="mldsTargetAudience"
                className="form-select"
                value={formData.mldsTargetAudience}
                onChange={handleInputChange}
              >
                {mldsTargetAudienceOptions.map(option => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>
            </div>

            <div className="form-group">
              <div className="form-label">Organisation porteuse</div>
              {availableClasses.length > 0 ? (
                <div className="multi-select-container" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                  {availableClasses.map(classItem => (
                    <label 
                      key={classItem.id} 
                      className={`multi-select-item  !flex items-center gap-2 ${formData.mldsOrganizations.includes(classItem.id.toString()) ? 'selected' : ''}`}
                    >
                      <input
                        type="checkbox"
                        checked={formData.mldsOrganizations.includes(classItem.id.toString())}
                        onChange={() => handleOrganizationToggle(classItem.id.toString())}
                      />
                      <div className="multi-select-checkmark">
                        <i className="fas fa-check"></i>
                      </div>
                      <span className="multi-select-label">{classItem.name} {classItem.level ? `- ${classItem.level}` : ''}</span>
                    </label>
                  ))}
                </div>
              ) : (
                <div className={isLoadingClasses ? 'loading-message' : 'no-items-message'}>
                  {isLoadingClasses ? (
                    <>
                      <i className="fas fa-spinner fa-spin"></i>
                      <span>Chargement des classes...</span>
                    </>
                  ) : (
                    'Aucune classe disponible'
                  )}
                </div>
              )}
            </div>

            {/* Partnership Section */}
            <div className="form-group">
              <label className={`multi-select-item !flex items-center gap-2 ${formData.isPartnership ? 'selected' : ''}`} style={{ cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  id="isPartnership"
                  name="isPartnership"
                  checked={formData.isPartnership}
                  onChange={handleInputChange}
                />
                <div className="multi-select-checkmark">
                  <i className="fas fa-check"></i>
                </div>
                <span className="multi-select-label">Est-ce un partenariat ?</span>
              </label>
            </div>

            {/* Partenaire - Only visible if En partenariat is checked */}
            {formData.isPartnership && (
              <div className="form-group">
                <label htmlFor="projectPartner">Partenaire</label>
                <div className="compact-selection">
                  <div className="search-input-container">
                    <i className="fas fa-search search-icon"></i>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Rechercher un partenaire..."
                      value={searchTerms.partner}
                      onChange={(e) => handleSearchChange('partner', e.target.value)}
                    />
                  </div>
                  {formData.partner && (
                    <div className="selected-item">
                      {(() => {
                        const selected = getSelectedPartner(formData.partner);
                        if (!selected) return null;
                        
                        const partnerOrgs = selected.partners || [];
                        const firstPartner = partnerOrgs[0];
                        
                        return (
                          <div className="selected-member">
                            <AvatarImage 
                              src={firstPartner?.logo_url || '/default-avatar.png'} 
                              alt={firstPartner?.name || 'Partnership'} 
                              className="selected-avatar" 
                            />
                            <div className="selected-info">
                              <div className="selected-name">
                                {partnerOrgs.map((p: any) => p.name).join(', ')}
                              </div>
                              <div className="selected-role">{selected.name || ''}</div>
                            </div>
                            <button
                              type="button"
                              className="remove-selection"
                              onClick={() => setFormData(prev => ({ ...prev, partner: '' }))}
                            >
                              <i className="fas fa-times"></i>
                            </button>
                          </div>
                        );
                      })()}
                    </div>
                  )}
                  {!formData.partner && (
                    <div className="selection-list">
                      {getFilteredPartners(searchTerms.partner).map((partnership) => {
                        const partnerOrgs = partnership.partners || [];
                        const firstPartner = partnerOrgs[0];
                        
                        return (
                          <div
                            key={partnership.id}
                            className="selection-item"
                            onClick={() => handlePartnerSelect(partnership.id)}
                          >
                            <AvatarImage 
                              src={firstPartner?.logo_url || '/default-avatar.png'} 
                              alt={firstPartner?.name || 'Partnership'} 
                              className="item-avatar" 
                            />
                            <div className="item-info">
                              <div className="item-name">
                                {partnerOrgs.map((p: any) => p.name).join(', ')}
                              </div>
                              <div className="item-role">{partnership.name || ''}</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Co-responsables */}
            <div className="form-group">
              <label htmlFor="projectCoResponsibles">Co-responsable(s)</label>
              <div className="compact-selection">
                <div className="search-input-container">
                  <i className="fas fa-search search-icon"></i>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Rechercher des co-responsables..."
                    value={searchTerms.coResponsibles}
                    onChange={(e) => handleSearchChange('coResponsibles', e.target.value)}
                    disabled={isLoadingMembers}
                  />
                </div>
                
                {isLoadingMembers ? (
                  <div className="loading-members" style={{ padding: '1rem', textAlign: 'center', color: '#6b7280' }}>
                    <i className="fas fa-spinner fa-spin" style={{ marginRight: '0.5rem' }}></i>
                    <span>Chargement des membres...</span>
                  </div>
                ) : (
                  <>
                    {formData.coResponsibles.length > 0 && (
                      <div className="selected-items">
                        {formData.coResponsibles.map((memberId) => {
                          const member = getSelectedMember(memberId);
                          return member ? (
                            <div key={memberId} className="selected-member">
                              <AvatarImage src={member.avatar_url || '/default-avatar.png'} alt={member.full_name || `${member.first_name} ${member.last_name}`} className="selected-avatar" />
                              <div className="selected-info">
                                <div className="selected-name">{member.full_name || `${member.first_name} ${member.last_name}`}</div>
                                <div className="selected-role">{member.role}</div>
                              </div>
                              <button
                                type="button"
                                className="remove-selection"
                                onClick={() => handleMemberSelect('coResponsibles', memberId)}
                              >
                                <i className="fas fa-times"></i>
                              </button>
                            </div>
                          ) : null;
                        })}
                      </div>
                    )}
                    <div className="selection-list">
                      {getFilteredMembers(searchTerms.coResponsibles).length === 0 ? (
                        <div className="no-members-message" style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>
                          <i className="fas fa-users" style={{ fontSize: '2rem', marginBottom: '0.5rem', display: 'block' }}></i>
                          <p>Aucun membre disponible</p>
                        </div>
                      ) : (
                        getFilteredMembers(searchTerms.coResponsibles).map((member: any) => (
                          <div
                            key={member.id}
                            className="selection-item"
                            onClick={() => handleMemberSelect('coResponsibles', member.id)}
                          >
                            <AvatarImage src={member.avatar_url || '/default-avatar.png'} alt={member.full_name || `${member.first_name} ${member.last_name}`} className="item-avatar" />
                            <div className="item-info">
                              <div className="item-name">{member.full_name || `${member.first_name} ${member.last_name}`}</div>
                              <div className="item-role">{member.role}</div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Participants */}
            <div className="form-group">
              <label htmlFor="projectParticipants">Participants</label>
              <div className="compact-selection">
                <div className="search-input-container">
                  <i className="fas fa-search search-icon"></i>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Rechercher des participants..."
                    value={searchTerms.participants}
                    onChange={(e) => handleSearchChange('participants', e.target.value)}
                    disabled={isLoadingMembers}
                  />
                </div>
                
                {isLoadingMembers ? (
                  <div className="loading-members" style={{ padding: '1rem', textAlign: 'center', color: '#6b7280' }}>
                    <i className="fas fa-spinner fa-spin" style={{ marginRight: '0.5rem' }}></i>
                    <span>Chargement des membres...</span>
                  </div>
                ) : (
                  <>
                    {formData.participants.length > 0 && (
                      <div className="selected-items">
                        {formData.participants.map((memberId) => {
                          const member = getSelectedMember(memberId);
                          return member ? (
                            <div key={memberId} className="selected-member">
                              <AvatarImage src={member.avatar_url || '/default-avatar.png'} alt={member.full_name || `${member.first_name} ${member.last_name}`} className="selected-avatar" />
                              <div className="selected-info">
                                <div className="selected-name">{member.full_name || `${member.first_name} ${member.last_name}`}</div>
                                <div className="selected-role">{member.role}</div>
                              </div>
                              <button
                                type="button"
                                className="remove-selection"
                                onClick={() => handleMemberSelect('participants', memberId)}
                              >
                                <i className="fas fa-times"></i>
                              </button>
                            </div>
                          ) : null;
                        })}
                      </div>
                    )}
                    <div className="selection-list">
                      {getFilteredMembers(searchTerms.participants).length === 0 ? (
                        <div className="no-members-message" style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>
                          <i className="fas fa-users" style={{ fontSize: '2rem', marginBottom: '0.5rem', display: 'block' }}></i>
                          <p>Aucun membre disponible</p>
                        </div>
                      ) : (
                        getFilteredMembers(searchTerms.participants).map((member: any) => (
                          <div
                            key={member.id}
                            className="selection-item"
                            onClick={() => handleMemberSelect('participants', member.id)}
                          >
                            <AvatarImage src={member.avatar_url || '/default-avatar.png'} alt={member.full_name || `${member.first_name} ${member.last_name}`} className="item-avatar" />
                            <div className="item-info">
                              <div className="item-name">{member.full_name || `${member.first_name} ${member.last_name}`}</div>
                              <div className="item-role">{member.role}</div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* MLDS Specific Section */}
          <div className="form-section">
            <h3 className="form-section-title">Volet Persévérance Scolaire</h3>
            
            <div className="form-group">
              <label htmlFor="mldsObjectives">Objectifs pédagogiques</label>
              <textarea
                id="mldsObjectives"
                name="mldsObjectives"
                className="form-textarea"
                value={formData.mldsObjectives}
                onChange={handleInputChange}
                placeholder="Décrire les objectifs de remobilisation et de persévérance scolaire..."
                rows={3}
              />
            </div>


            <div className="form-group">
              <div className="form-label">Objectifs de l'action</div>
              <div className="multi-select-container">
                {mldsActionObjectivesOptions.map(objective => (
                  <label 
                    key={objective} 
                    className={`multi-select-item  !flex items-center gap-2 ${formData.mldsActionObjectives.includes(objective) ? 'selected' : ''}`}
                  >
                    <input
                      type="checkbox"
                      checked={formData.mldsActionObjectives.includes(objective)}
                      onChange={() => handleActionObjectiveToggle(objective)}
                    />
                    <div className="multi-select-checkmark">
                      <i className="fas fa-check"></i>
                    </div>
                    <span className="multi-select-label">{objective}</span>
                  </label>
                ))}
              </div>
              {formData.mldsActionObjectives.includes('Autre') && (
                <div style={{ marginTop: '12px' }}>
                  <label htmlFor="mldsActionObjectivesOther">Précisez l'autre objectif</label>
                  <textarea
                    id="mldsActionObjectivesOther"
                    name="mldsActionObjectivesOther"
                    className="form-textarea"
                    value={formData.mldsActionObjectivesOther}
                    onChange={handleInputChange}
                    placeholder="Décrivez l'autre objectif..."
                    rows={2}
                    style={{ marginTop: '8px' }}
                  />
                </div>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="mldsCompetenciesDeveloped">Compétences développées par l'action</label>
              <textarea
                id="mldsCompetenciesDeveloped"
                name="mldsCompetenciesDeveloped"
                className="form-textarea"
                value={formData.mldsCompetenciesDeveloped}
                onChange={handleInputChange}
                placeholder="Décrivez les compétences que les participants développeront..."
                rows={3}
              />
            </div>

            <div className="form-group">
              <div className="form-label">Moyens financiers demandés</div>
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '1rem',
                marginTop: '12px',
                padding: '16px',
                background: '#f9fafb',
                borderRadius: '8px',
                border: '1px solid #e5e7eb'
              }}>
                <div className="form-group" style={{ marginBottom: '0' }}>
                  <label htmlFor="mldsFinancialHSE">HSE</label>
                  <input
                    type="number"
                    id="mldsFinancialHSE"
                    name="mldsFinancialHSE"
                    className="form-input"
                    value={formData.mldsFinancialHSE}
                    onChange={handleInputChange}
                    placeholder="Montant en €"
                    min="0"
                    step="0.01"
                  />
                </div>
                <div className="form-group" style={{ marginBottom: '0' }}>
                  <label htmlFor="mldsFinancialHV">HV</label>
                  <input
                    type="number"
                    id="mldsFinancialHV"
                    name="mldsFinancialHV"
                    className="form-input"
                    value={formData.mldsFinancialHV}
                    onChange={handleInputChange}
                    placeholder="Montant en €"
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>
              
              <div style={{
                marginTop: '12px',
                padding: '16px',
                background: '#f9fafb',
                borderRadius: '8px',
                border: '1px solid #e5e7eb'
              }}>
                <h4 style={{ 
                  fontSize: '0.95rem', 
                  fontWeight: 600, 
                  color: '#374151', 
                  marginBottom: '12px',
                  marginTop: '0'
                }}>
                  Crédits
                </h4>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr',
                  gap: '1rem'
                }}>
                  <div className="form-group" style={{ marginBottom: '0' }}>
                    <label htmlFor="mldsFinancialTransport">Frais de transport</label>
                    <input
                      type="number"
                      id="mldsFinancialTransport"
                      name="mldsFinancialTransport"
                      className="form-input"
                      value={formData.mldsFinancialTransport}
                      onChange={handleInputChange}
                      placeholder="Montant en €"
                      min="0"
                      step="0.01"
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: '0' }}>
                    <label htmlFor="mldsFinancialOperating">Frais de fonctionnement</label>
                    <input
                      type="number"
                      id="mldsFinancialOperating"
                      name="mldsFinancialOperating"
                      className="form-input"
                      value={formData.mldsFinancialOperating}
                      onChange={handleInputChange}
                      placeholder="Montant en €"
                      min="0"
                      step="0.01"
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: '0' }}>
                    <label htmlFor="mldsFinancialService">Prestataires de service</label>
                    <input
                      type="number"
                      id="mldsFinancialService"
                      name="mldsFinancialService"
                      className="form-input"
                      value={formData.mldsFinancialService}
                      onChange={handleInputChange}
                      placeholder="Montant en €"
                      min="0"
                      step="0.01"
                    />
                  </div>
                </div>
                <div style={{
                  marginTop: '12px',
                  padding: '10px',
                  background: '#e0f2fe',
                  borderRadius: '6px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <span style={{ fontWeight: 600, color: '#0369a1' }}>Total des crédits :</span>
                  <span style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0369a1' }}>
                    {(
                      (Number.parseFloat(formData.mldsFinancialTransport) || 0) +
                      (Number.parseFloat(formData.mldsFinancialOperating) || 0) +
                      (Number.parseFloat(formData.mldsFinancialService) || 0)
                    ).toFixed(2)} €
                  </span>
                </div>
              </div>

              <div style={{
                marginTop: '12px',
                padding: '12px',
                background: 'linear-gradient(135deg, #dbeafe 0%, #e0f2fe 100%)',
                borderRadius: '8px',
                border: '2px solid #0369a1',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <span style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0c4a6e' }}>
                  Total général :
                </span>
                <span style={{ fontSize: '1.3rem', fontWeight: 700, color: '#0c4a6e' }}>
                  {(
                    (Number.parseFloat(formData.mldsFinancialHSE) || 0) +
                    (Number.parseFloat(formData.mldsFinancialHV) || 0) +
                    (Number.parseFloat(formData.mldsFinancialTransport) || 0) +
                    (Number.parseFloat(formData.mldsFinancialOperating) || 0) +
                    (Number.parseFloat(formData.mldsFinancialService) || 0)
                  ).toFixed(2)} €
                </span>
              </div>
            </div>

          </div>

          {/* Form Actions */}
          <div className="modal-actions">
            <button type="button" className="btn btn-outline" onClick={onClose} disabled={isSubmitting}>
              Annuler
            </button>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <i className="fas fa-spinner fa-spin" style={{ marginRight: '8px' }}></i>
                  Création en cours...
                </>
              ) : (
                <>
                  <i className="fas fa-plus" style={{ marginRight: '8px' }}></i>
                  Créer le projet MLDS
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MLDSProjectModal;

