import React, { useState, useEffect } from 'react';
import { Project } from '../../types';
import { useAppContext } from '../../context/AppContext';
import './Modal.css';
import AvatarImage from '../UI/AvatarImage';

interface ProjectModalProps {
  project?: Project | null;
  onClose: () => void;
  onSave: (projectData: Omit<Project, 'id'>) => void;
}

const ProjectModal: React.FC<ProjectModalProps> = ({ project, onClose, onSave }) => {
  const { state, addProject } = useAppContext();
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    startDate: '',
    endDate: '',
    organization: '',
    status: 'coming' as 'coming' | 'in_progress' | 'ended',
    pathway: '',
    tags: '',
    links: '',
    participants: [] as string[],
    image: '',
    responsible: '',
    coResponsibles: [] as string[],
    partner: '',
    additionalImages: [] as string[]
  });

  const [imagePreview, setImagePreview] = useState<string>('');
  const [additionalImagePreviews, setAdditionalImagePreviews] = useState<string[]>([]);
  const [searchTerms, setSearchTerms] = useState({
    responsible: '',
    coResponsibles: '',
    participants: '',
    partner: ''
  });
  const [showSuccess, setShowSuccess] = useState(false);
  const [successData, setSuccessData] = useState<{title: string, image: string} | null>(null);

  // Use real members data from context
  const members = state.members;

  const partners = [
    { id: '1', name: 'Université de Paris', type: 'Université', logo: '/icons_logo/Property 1=Default.svg' },
    { id: '2', name: 'TechCorp Solutions', type: 'Entreprise', logo: '/icons_logo/Property 1=Default.svg' },
    { id: '3', name: 'Fondation Éducation', type: 'Fondation', logo: '/icons_logo/Property 1=Default.svg' },
    { id: '4', name: 'Institut Innovation', type: 'Institut', logo: '/icons_logo/Property 1=Default.svg' },
    { id: '5', name: 'Association Jeunesse', type: 'Association', logo: '/icons_logo/Property 1=Default.svg' }
  ];

  // Search functionality
  const getFilteredMembers = (searchTerm: string) => {
    if (!searchTerm.trim()) return members;
    const searchLower = searchTerm.toLowerCase();
    return members.filter((member: any) => 
      `${member.firstName} ${member.lastName}`.toLowerCase().includes(searchLower) ||
      member.profession.toLowerCase().includes(searchLower) ||
      (member.organization && member.organization.toLowerCase().includes(searchLower))
    );
  };

  const getFilteredPartners = (searchTerm: string) => {
    if (!searchTerm.trim()) return partners;
    const searchLower = searchTerm.toLowerCase();
    return partners.filter(partner => 
      partner.name.toLowerCase().includes(searchLower) ||
      partner.type.toLowerCase().includes(searchLower)
    );
  };

  useEffect(() => {
    if (project) {
      setFormData({
        title: project.title,
        description: project.description,
        startDate: project.startDate,
        endDate: project.endDate,
        organization: project.organization,
        status: project.status,
        pathway: project.pathway,
        tags: project.tags.join(', '),
        links: project.links || '',
        participants: project.members,
        image: project.image || '',
        responsible: '',
        coResponsibles: [],
        partner: '',
        additionalImages: []
      });
      setImagePreview(project.image || '');
    } else {
      // Set default dates
      const today = new Date();
      const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, today.getDate());
      setFormData(prev => ({
        ...prev,
        startDate: today.toISOString().split('T')[0],
        endDate: nextMonth.toISOString().split('T')[0]
      }));
    }
  }, [project]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setImagePreview(result);
        setFormData(prev => ({
          ...prev,
          image: result
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Form submitted with data:', formData);
    
    if (formData.title && formData.startDate && formData.endDate && formData.organization && formData.status && formData.pathway) {
      // Get responsible person data
      const responsiblePerson = getSelectedMember(formData.responsible);
      const coResponsiblePersons = formData.coResponsibles.map(id => getSelectedMember(id)).filter(Boolean);
      const partnerData = getSelectedPartner(formData.partner);

      const newProject = {
        id: `project-${Date.now()}`,
        title: formData.title,
        description: formData.description,
        status: formData.status,
        pathway: formData.pathway,
        organization: formData.organization,
        owner: responsiblePerson ? `${responsiblePerson.firstName} ${responsiblePerson.lastName}` : state.user.name,
        participants: formData.participants.length,
        badges: 0,
        startDate: formData.startDate,
        endDate: formData.endDate,
        image: imagePreview || 'https://images.unsplash.com/photo-1551434678-e076c223a692?w=120&h=120&fit=crop&crop=center',
        additionalPhotos: additionalImagePreviews,
        tags: formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag),
        links: formData.links,
        progress: 0,
        members: formData.participants,
        events: [],
        badges_list: [],
        // Add responsible, co-responsibles, and partner data
        responsible: responsiblePerson ? {
          id: responsiblePerson.id,
          name: `${responsiblePerson.firstName} ${responsiblePerson.lastName}`,
          avatar: responsiblePerson.avatar,
          profession: responsiblePerson.profession,
          organization: responsiblePerson.organization || 'Non spécifiée',
          email: responsiblePerson.email
        } : null,
        coResponsibles: coResponsiblePersons.filter((person): person is NonNullable<typeof person> => person !== undefined).map(person => ({
          id: person.id,
          name: `${person.firstName} ${person.lastName}`,
          avatar: person.avatar,
          profession: person.profession,
          organization: person.organization || 'Non spécifiée',
          email: person.email
        })),
        partner: partnerData ? {
          id: partnerData.id,
          name: partnerData.name,
          logo: partnerData.logo,
          organization: partnerData.type
        } : null
      };
      
      console.log('Creating new project:', newProject);
      
      // Add project to context
      addProject(newProject);
      
      // Show success message
      setSuccessData({
        title: formData.title,
        image: imagePreview || 'https://images.unsplash.com/photo-1551434678-e076c223a692?w=120&h=120&fit=crop&crop=center'
      });
      setShowSuccess(true);
      
      console.log('Success message should be showing');
      
      // Don't call onSave or onClose here - let the success message handle closing
    } else {
      console.log('Validation failed:', {
        title: formData.title,
        startDate: formData.startDate,
        endDate: formData.endDate,
        organization: formData.organization,
        status: formData.status,
        pathway: formData.pathway
      });
    }
  };

  const handleAdditionalImageChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        const newPreviews = [...additionalImagePreviews];
        newPreviews[index] = result;
        setAdditionalImagePreviews(newPreviews);
        
        const newImages = [...formData.additionalImages];
        newImages[index] = result;
        setFormData(prev => ({
          ...prev,
          additionalImages: newImages
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSearchChange = (field: string, value: string) => {
    setSearchTerms(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleMemberSelect = (field: string, memberId: string) => {
    if (field === 'responsible') {
      setFormData(prev => ({ ...prev, responsible: memberId }));
    } else if (field === 'coResponsibles') {
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
    return members.find((m: any) => m.id === memberId);
  };

  const getSelectedPartner = (partnerId: string) => {
    return partners.find(p => p.id === partnerId);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content project-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{project ? 'Modifier le projet' : 'Créer un nouveau projet'}</h2>
          <button className="modal-close" onClick={onClose}>
            <i className="fas fa-times"></i>
          </button>
        </div>
        
        <div className="modal-body">
          <form id="projectForm" onSubmit={handleSubmit} className="project-form">
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
            
            {/* Basic Project Info */}
            <div className="form-group">
              <label htmlFor="projectTitle">Titre du projet *</label>
              <input 
                type="text" 
                id="projectTitle" 
                name="title"
                required 
                placeholder="Ex: Atelier développement durable"
                value={formData.title}
                onChange={handleInputChange}
                className="form-input"
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="projectStartDate">Date de début *</label>
                <input 
                  type="date" 
                  id="projectStartDate" 
                  name="startDate"
                  required
                  value={formData.startDate}
                  onChange={handleInputChange}
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label htmlFor="projectEndDate">Date de fin *</label>
                <input 
                  type="date" 
                  id="projectEndDate" 
                  name="endDate"
                  required
                  value={formData.endDate}
                  onChange={handleInputChange}
                  className="form-input"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="projectOrganization">Organisation *</label>
                <select 
                  id="projectOrganization" 
                  name="organization"
                  required
                  value={formData.organization}
                  onChange={handleInputChange}
                  className="form-select"
                >
                  <option value="">Sélectionner une organisation</option>
                  <option value="lycee-victor-hugo">Lycée Victor Hugo</option>
                  <option value="drakkar-tech">Drakkar Technologies</option>
                  <option value="ecole-innovation">École Innovation</option>
                  <option value="design-studio">Design Studio</option>
                  <option value="creative-studio">Creative Studio</option>
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="projectStatus">Statut *</label>
                <select 
                  id="projectStatus" 
                  name="status"
                  required
                  value={formData.status}
                  onChange={handleInputChange}
                  className="form-select"
                >
                  <option value="">Sélectionner un statut</option>
                  <option value="coming">À venir</option>
                  <option value="in_progress">En cours</option>
                  <option value="ended">Terminé</option>
                </select>
              </div>
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="projectPathway">Parcours *</label>
                <select 
                  id="projectPathway" 
                  name="pathway"
                  required
                  value={formData.pathway}
                  onChange={handleInputChange}
                  className="form-select"
                >
                  <option value="">Sélectionner un parcours</option>
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
              <div className="form-group">
                <label htmlFor="projectTags">Tags</label>
                <input 
                  type="text" 
                  id="projectTags" 
                  name="tags"
                  placeholder="Ex: Fabrication, Créativité, Numérique"
                  value={formData.tags}
                  onChange={handleInputChange}
                  className="form-input"
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="projectLinks">Liens utiles</label>
              <input 
                type="url" 
                id="projectLinks" 
                name="links"
                placeholder="https://exemple.com"
                value={formData.links}
                onChange={handleInputChange}
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label htmlFor="projectDescription">Description</label>
              <textarea 
                id="projectDescription" 
                name="description"
                rows={4} 
                placeholder="Description du projet..."
                value={formData.description}
                onChange={handleInputChange}
                className="form-textarea"
              />
            </div>

            {/* Responsable du projet */}
            <div className="form-group">
              <label htmlFor="projectResponsible">Responsable du projet *</label>
              <div className="compact-selection">
                <div className="search-input-container">
                  <i className="fas fa-search search-icon"></i>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Rechercher un responsable..."
                    value={searchTerms.responsible}
                    onChange={(e) => handleSearchChange('responsible', e.target.value)}
                  />
                </div>
                {formData.responsible && (
                  <div className="selected-item">
                    {(() => {
                      const selected = getSelectedMember(formData.responsible);
                      return selected ? (
                        <div className="selected-member">
                          <AvatarImage src={selected.avatar} alt={`${selected.firstName} ${selected.lastName}`} className="selected-avatar" />
                          <div className="selected-info">
                            <div className="selected-name">{`${selected.firstName} ${selected.lastName}`}</div>
                            <div className="selected-role">{selected.profession}</div>
                          </div>
                          <button 
                            type="button" 
                            className="remove-selection"
                            onClick={() => setFormData(prev => ({ ...prev, responsible: '' }))}
                          >
                            <i className="fas fa-times"></i>
                          </button>
                        </div>
                      ) : null;
                    })()}
                  </div>
                )}
                {!formData.responsible && (
                  <div className="selection-list">
                    {getFilteredMembers(searchTerms.responsible).map((member: any) => (
                      <div 
                        key={member.id} 
                        className="selection-item"
                        onClick={() => handleMemberSelect('responsible', member.id)}
                      >
                        <AvatarImage src={member.avatar} alt={`${member.firstName} ${member.lastName}`} className="item-avatar" />
                        <div className="item-info">
                          <div className="item-name">{`${member.firstName} ${member.lastName}`}</div>
                          <div className="item-role">{member.profession}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

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
                  />
                </div>
                {formData.coResponsibles.length > 0 && (
                  <div className="selected-items">
                    {formData.coResponsibles.map((memberId) => {
                      const member = getSelectedMember(memberId);
                      return member ? (
                        <div key={memberId} className="selected-member">
                          <AvatarImage src={member.avatar} alt={`${member.firstName} ${member.lastName}`} className="selected-avatar" />
                          <div className="selected-info">
                            <div className="selected-name">{`${member.firstName} ${member.lastName}`}</div>
                            <div className="selected-role">{member.profession}</div>
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
                  {getFilteredMembers(searchTerms.coResponsibles).map((member: any) => (
                    <div 
                      key={member.id} 
                      className="selection-item"
                      onClick={() => handleMemberSelect('coResponsibles', member.id)}
                    >
                      <AvatarImage src={member.avatar} alt={`${member.firstName} ${member.lastName}`} className="item-avatar" />
                      <div className="item-info">
                        <div className="item-name">{`${member.firstName} ${member.lastName}`}</div>
                        <div className="item-role">{member.profession}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Partenaire */}
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
                      return selected ? (
                        <div className="selected-member">
                          <img src={selected.logo} alt={selected.name} className="selected-avatar" />
                          <div className="selected-info">
                            <div className="selected-name">{selected.name}</div>
                            <div className="selected-role">{selected.type}</div>
                          </div>
                          <button 
                            type="button" 
                            className="remove-selection"
                            onClick={() => setFormData(prev => ({ ...prev, partner: '' }))}
                          >
                            <i className="fas fa-times"></i>
                          </button>
                        </div>
                      ) : null;
                    })()}
                  </div>
                )}
                {!formData.partner && (
                  <div className="selection-list">
                    {getFilteredPartners(searchTerms.partner).map((partner) => (
                      <div 
                        key={partner.id} 
                        className="selection-item"
                        onClick={() => handlePartnerSelect(partner.id)}
                      >
                        <img src={partner.logo} alt={partner.name} className="item-avatar" />
                        <div className="item-info">
                          <div className="item-name">{partner.name}</div>
                          <div className="item-role">{partner.type}</div>
                        </div>
                      </div>
                    ))}
                  </div>
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
                  />
                </div>
                {formData.participants.length > 0 && (
                  <div className="selected-items">
                    {formData.participants.map((memberId) => {
                      const member = getSelectedMember(memberId);
                      return member ? (
                        <div key={memberId} className="selected-member">
                          <AvatarImage src={member.avatar} alt={`${member.firstName} ${member.lastName}`} className="selected-avatar" />
                          <div className="selected-info">
                            <div className="selected-name">{`${member.firstName} ${member.lastName}`}</div>
                            <div className="selected-role">{member.profession}</div>
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
                  {getFilteredMembers(searchTerms.participants).map((member: any) => (
                    <div 
                      key={member.id} 
                      className="selection-item"
                      onClick={() => handleMemberSelect('participants', member.id)}
                    >
                      <AvatarImage src={member.avatar} alt={`${member.firstName} ${member.lastName}`} className="item-avatar" />
                      <div className="item-info">
                        <div className="item-name">{`${member.firstName} ${member.lastName}`}</div>
                        <div className="item-role">{member.profession}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Photos supplémentaires */}
            <div className="form-group">
              <label>Photos supplémentaires (5 max)</label>
              <div className="additional-images-grid">
                {[0, 1, 2, 3, 4].map((index) => (
                  <div key={index} className="additional-image-upload">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleAdditionalImageChange(e, index)}
                      style={{ display: 'none' }}
                      id={`additionalImage${index}`}
                    />
                    <label htmlFor={`additionalImage${index}`} className="additional-image-label">
                      {additionalImagePreviews[index] ? (
                        <img src={additionalImagePreviews[index]} alt={`Additional ${index + 1}`} className="additional-image-preview" />
                      ) : (
                        <div className="additional-image-placeholder">
                          <i className="fas fa-plus"></i>
                          <span>Ajouter une photo</span>
                        </div>
                      )}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </form>
        </div>
        
        <div className="modal-footer">
          <button type="button" className="btn btn-outline" onClick={onClose}>Annuler</button>
          <button type="submit" form="projectForm" className="btn btn-primary">
            {project ? 'Modifier le projet' : 'Créer le projet'}
          </button>
        </div>
      </div>

      {/* Success Message */}
      {showSuccess && successData && (
        <div className="project-success-overlay" onClick={(e) => e.stopPropagation()}>
          <div className="project-success-modal" onClick={(e) => e.stopPropagation()}>
            <div className="project-success-content">
              <div className="project-success-icon">
                <i className="fas fa-check-circle"></i>
              </div>
              <div className="project-success-image">
                <img src={successData.image} alt={successData.title} />
              </div>
              <h3>Projet créé avec succès !</h3>
              <p>Le projet <strong>{successData.title}</strong> a été créé avec succès.</p>
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

export default ProjectModal;