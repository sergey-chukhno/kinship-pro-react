import React, { useState, useRef } from 'react';
import { Member } from '../../types';
import './Modal.css';

interface AddMemberModalProps {
  onClose: () => void;
  onAdd: (member: Omit<Member, 'id'>) => void;
}

const AddMemberModal: React.FC<AddMemberModalProps> = ({ onClose, onAdd }) => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    profession: '',
    roles: ['Membre'],
    skills: [] as string[],
    availability: [] as string[],
    avatar: '',
    isTrusted: false,
    organization: '',
    badges: [] as string[],
    canProposeStage: false,
    canProposeAtelier: false
  });

  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [selectedAvailability, setSelectedAvailability] = useState<string[]>([]);
  const [avatarPreview, setAvatarPreview] = useState<string>('');
  const [isUsingDefaultAvatar, setIsUsingDefaultAvatar] = useState<boolean>(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Correct competencies list from HTML dashboard
  const competencies = [
    'Informatique et Numériques',
    'Créativité',
    'Leadership',
    'Collaboration',
    'Innovation',
    'Arts & Culture',
    'Sport et initiation',
    'Théâtre et communication',
    'Journalisme et média',
    'Cuisine et ses techniques',
    'Bricolage & Jardinage',
    'Danse et musique',
    'Gestion et Formation',
    'Audiovisuel & Cinéma',
    'Fabrication d\'objets',
    'Multilangues'
  ];

  const disponibilites = [
    'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'
  ];

  // Generate default avatar based on role
  const generateDefaultAvatar = (role: string, firstName: string, lastName: string) => {
    const colors = {
      'Admin': '#a855f7',        // Purple for Admin
      'Référent': '#22c55e',     // Green for Référent  
      'Membre': '#3b82f6',       // Blue for Membre
      'Intervenant': '#fb923c'   // Orange for Intervenant
    };
    
    const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
    const color = colors[role as keyof typeof colors] || colors['Membre'];
    
    return `data:image/svg+xml;base64,${btoa(`
      <svg width="100" height="100" xmlns="http://www.w3.org/2000/svg">
        <circle cx="50" cy="50" r="50" fill="${color}"/>
        <text x="50" y="60" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="32" font-weight="bold">${initials}</text>
      </svg>
    `)}`;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
      
      // Update avatar preview when role, firstName, or lastName changes and we're using default avatar
      if (isUsingDefaultAvatar && (name === 'roles' || name === 'firstName' || name === 'lastName')) {
        const firstName = name === 'firstName' ? value : formData.firstName;
        const lastName = name === 'lastName' ? value : formData.lastName;
        const role = name === 'roles' ? value : formData.roles[0];
        
        if (firstName && lastName) {
          const newAvatar = generateDefaultAvatar(role, firstName, lastName);
          setAvatarPreview(newAvatar);
        }
      }
    }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        setAvatarPreview(result);
        setFormData(prev => ({ ...prev, avatar: result }));
        setIsUsingDefaultAvatar(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleResetToDefaultAvatar = () => {
    if (formData.firstName && formData.lastName) {
      const defaultAvatar = generateDefaultAvatar(formData.roles[0], formData.firstName, formData.lastName);
      setAvatarPreview(defaultAvatar);
      setFormData(prev => ({ ...prev, avatar: '' }));
      setIsUsingDefaultAvatar(true);
    }
  };

  const handleSkillToggle = (skill: string) => {
    setSelectedSkills(prev => {
      const newSkills = prev.includes(skill) 
        ? prev.filter(s => s !== skill)
        : [...prev, skill];
      setFormData(prevData => ({ ...prevData, skills: newSkills }));
      return newSkills;
    });
  };

  const handleAvailabilityToggle = (day: string) => {
    setSelectedAvailability(prev => {
      const newAvailability = prev.includes(day)
        ? prev.filter(d => d !== day)
        : [...prev, day];
      setFormData(prevData => ({ ...prevData, availability: newAvailability }));
      return newAvailability;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!formData.firstName || !formData.lastName) {
      alert('Prénom et nom sont obligatoires');
      return;
    }
    
    if (selectedSkills.length === 0) {
      alert('Veuillez sélectionner au moins une compétence');
      return;
    }
    
    if (selectedAvailability.length === 0) {
      alert('Veuillez sélectionner au moins une disponibilité');
      return;
    }

    // Generate default avatar if no avatar selected
    const finalAvatar = formData.avatar || generateDefaultAvatar(
      formData.roles[0], 
      formData.firstName, 
      formData.lastName
    );

    const memberData = {
      ...formData,
      avatar: finalAvatar,
      skills: selectedSkills,
      availability: selectedAvailability
    };

    onAdd(memberData);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Ajouter un nouveau membre</h2>
          <button className="modal-close" onClick={onClose}>
            <i className="fas fa-times"></i>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body">
          {/* Avatar Selection */}
          <div className="form-section">
            <h3>Photo de profil</h3>
            <div className="avatar-selection">
              <div className="avatar-preview">
                {avatarPreview ? (
                  <img src={avatarPreview} alt="Avatar preview" className="avatar-image" />
                ) : (
                  <div className="avatar-placeholder">
                    <i className="fas fa-user"></i>
                    <span>Aucune photo</span>
                  </div>
                )}
              </div>
              <div className="avatar-actions">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="btn btn-outline btn-sm"
                >
                  <i className="fas fa-upload"></i>
                  Choisir une photo
                </button>
                {!isUsingDefaultAvatar && (
                  <button
                    type="button"
                    onClick={handleResetToDefaultAvatar}
                    className="btn btn-outline btn-sm"
                  >
                    <i className="fas fa-undo"></i>
                    Avatar par défaut
                  </button>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  style={{ display: 'none' }}
                />
                <p className="avatar-note">
                  {isUsingDefaultAvatar 
                    ? "Avatar par défaut généré selon le rôle sélectionné"
                    : "Si aucune photo n'est sélectionnée, un avatar par défaut sera généré selon le rôle"
                  }
                </p>
              </div>
            </div>
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="firstName">Prénom *</label>
              <input
                type="text"
                id="firstName"
                name="firstName"
                value={formData.firstName}
                onChange={handleInputChange}
                required
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label htmlFor="lastName">Nom *</label>
              <input
                type="text"
                id="lastName"
                name="lastName"
                value={formData.lastName}
                onChange={handleInputChange}
                required
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label htmlFor="profession">Profession</label>
              <input
                type="text"
                id="profession"
                name="profession"
                value={formData.profession}
                onChange={handleInputChange}
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label htmlFor="organization">Organisation</label>
              <input
                type="text"
                id="organization"
                name="organization"
                value={formData.organization}
                onChange={handleInputChange}
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label htmlFor="roles">Rôle</label>
              <select
                id="roles"
                name="roles"
                value={formData.roles[0]}
                onChange={(e) => setFormData(prev => ({ ...prev, roles: [e.target.value] }))}
                className="form-select"
              >
                <option value="Membre">Membre</option>
                <option value="Référent">Référent</option>
                <option value="Admin">Admin</option>
                <option value="Intervenant">Intervenant</option>
              </select>
            </div>
          </div>

          <div className="form-section">
            <h3>Compétences *</h3>
            <p className="section-description">Sélectionnez au moins une compétence</p>
            <div className="competencies-grid">
              {competencies.map((competency) => (
                <label key={competency} className="competency-checkbox">
                  <input
                    type="checkbox"
                    checked={selectedSkills.includes(competency)}
                    onChange={() => handleSkillToggle(competency)}
                  />
                  <span className="checkmark"></span>
                  <span className="competency-label">{competency}</span>
                </label>
              ))}
            </div>
            {selectedSkills.length > 0 && (
              <div className="selected-skills">
                <p>Compétences sélectionnées ({selectedSkills.length}):</p>
                <div className="skills-list">
                  {selectedSkills.map((skill) => (
                    <span key={skill} className="skill-tag">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="form-section">
            <h3>Disponibilités *</h3>
            <p className="section-description">Sélectionnez au moins un jour de disponibilité</p>
            <div className="availability-grid">
              {disponibilites.map((day) => (
                <label key={day} className="availability-checkbox">
                  <input
                    type="checkbox"
                    checked={selectedAvailability.includes(day)}
                    onChange={() => handleAvailabilityToggle(day)}
                  />
                  <span className="checkmark"></span>
                  <span className="availability-label">{day}</span>
                </label>
              ))}
            </div>
            {selectedAvailability.length > 0 && (
              <div className="selected-availability">
                <p>Disponibilités sélectionnées ({selectedAvailability.length}):</p>
                <div className="availability-list">
                  {selectedAvailability.map((day) => (
                    <span key={day} className="availability-tag">
                      {day}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="form-section">
            <h3>Propositions</h3>
            <div className="proposals-grid">
              <label className="proposal-checkbox">
                <input
                  type="checkbox"
                  name="canProposeStage"
                  checked={formData.canProposeStage}
                  onChange={handleInputChange}
                />
                <span className="checkmark"></span>
                <span className="proposal-label">Propose un stage</span>
              </label>
              <label className="proposal-checkbox">
                <input
                  type="checkbox"
                  name="canProposeAtelier"
                  checked={formData.canProposeAtelier}
                  onChange={handleInputChange}
                />
                <span className="checkmark"></span>
                <span className="proposal-label">Propose un atelier pro</span>
              </label>
            </div>
          </div>
        </form>

        <div className="modal-footer">
          <button type="button" className="btn btn-outline" onClick={onClose}>
            Annuler
          </button>
          <button type="submit" className="btn btn-primary" onClick={handleSubmit}>
            <i className="fas fa-plus"></i>
            Ajouter le membre
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddMemberModal;
