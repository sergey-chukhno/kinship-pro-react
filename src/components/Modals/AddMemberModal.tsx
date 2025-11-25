import React, { useState, useRef, useEffect } from 'react';
import { Member } from '../../types';
import './Modal.css';
import { submitPersonalUserRegistration, getCurrentUser } from '../../api/Authentication';
import { getSkills, getPersonalUserRoles } from '../../api/RegistrationRessource'; // 1. Import fetch roles
import { useAppContext } from '../../context/AppContext';
import AvatarImage from '../UI/AvatarImage';

interface AddMemberModalProps {
  onClose: () => void;
  onAdd: (member: Omit<Member, 'id'>) => void;
}

// Traduction identique à celle de PersonalUserRegisterForm.tsx pour l'affichage
const tradFR: Record<string, string> = {
  parent: "Parent",
  grand_parent: "Grand-parent",
  children: "Enfant",
  voluntary: "Volontaire",
  tutor: "Tuteur",
  employee: "Salarié",
  other: "Autre",
  // Garder des fallbacks pour l'ancien système au cas où
  admin: "Admin",
  referent: "Référent",
  member: "Membre"
};

const AddMemberModal: React.FC<AddMemberModalProps> = ({ onClose, onAdd }) => {
  const { state } = useAppContext();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    profession: '',
    roles: [] as string[], // Sera rempli par le select
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

  // State pour les données API
  const [apiSkills, setApiSkills] = useState<{ id: number, name: string }[]>([]);
  const [apiRoles, setApiRoles] = useState<{ value: string; requires_additional_info: boolean }[]>([]); // 2. State roles

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Chargement des Skills ET des Roles au montage
  useEffect(() => {
    const fetchData = async () => {
      try {
        // 1. Fetch Skills
        const skillsRes = await getSkills();
        const skillsData = skillsRes?.data?.data ?? skillsRes?.data ?? skillsRes ?? [];
        if (Array.isArray(skillsData)) {
          setApiSkills(skillsData.map((s: any) => ({ id: Number(s.id), name: s.name })));
        }

        // 2. Fetch Roles
        const rolesRes = await getPersonalUserRoles();
        const rolesData = rolesRes?.data?.data ?? rolesRes?.data ?? rolesRes ?? [];
        if (Array.isArray(rolesData)) {
          setApiRoles(rolesData);
          // Sélectionner le premier rôle par défaut si disponible
          if (rolesData.length > 0) {
            setFormData(prev => ({ ...prev, roles: [rolesData[0].value] }));
          }
        }
      } catch (error) {
        console.error("Erreur chargement données (skills/roles)", error);
      }
    };
    fetchData();
  }, []);

  const disponibilites = [
    'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Autre'
  ];

  const dayMapping: Record<string, string> = {
    'Lundi': 'monday',
    'Mardi': 'tuesday',
    'Mercredi': 'wednesday',
    'Jeudi': 'thursday',
    'Vendredi': 'friday',
    'Autre': 'other'
  };

  // Mise à jour de la génération d'avatar pour accepter les clés dynamiques
  const generateDefaultAvatar = (role: string, firstName: string, lastName: string) => {
    // Mapping de couleurs basique selon les rôles courants
    const colors: Record<string, string> = {
      'voluntary': '#3b82f6', // Bleu (Volontaire/Membre)
      'employee': '#fb923c',  // Orange
      'parent': '#22c55e',    // Vert
      'tutor': '#a855f7',     // Violet
      'default': '#6b7280'    // Gris par défaut
    };

    const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
    const color = colors[role] || colors['default'];

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

      // Mise à jour de l'avatar si on change le nom/rôle
      if (isUsingDefaultAvatar && (name === 'roles' || name === 'firstName' || name === 'lastName')) {
        const firstName = name === 'firstName' ? value : formData.firstName;
        const lastName = name === 'lastName' ? value : formData.lastName;
        // Pour le select multiple 'roles', value est la valeur unique sélectionnée ici
        const role = name === 'roles' ? value : (formData.roles[0] || 'voluntary');

        if (firstName && lastName) {
          const newAvatar = generateDefaultAvatar(role, firstName, lastName);
          setAvatarPreview(newAvatar);
        }
      }

      // Cas spécifique pour le select qui renvoie une string unique mais qu'on stocke en array pour le UserType Member
      if (name === 'roles') {
        setFormData(prev => ({ ...prev, roles: [value] }));
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
      const defaultAvatar = generateDefaultAvatar(formData.roles[0] || 'voluntary', formData.firstName, formData.lastName);
      setAvatarPreview(defaultAvatar);
      setFormData(prev => ({ ...prev, avatar: '' }));
      setIsUsingDefaultAvatar(true);
    }
  };

  const handleSkillToggle = (skillName: string) => {
    setSelectedSkills(prev => {
      const newSkills = prev.includes(skillName)
        ? prev.filter(s => s !== skillName)
        : [...prev, skillName];
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

  const generateStrongPassword = () => {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
    let password = "A1!";
    for (let i = 0; i < 10; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

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

    try {
      // 1. Récupération Organisation selon le mode
      const currentUser = await getCurrentUser();
      const isEdu = state.showingPageType === 'edu';

      const contextId = isEdu
        ? currentUser.data?.available_contexts?.schools?.[0]?.id
        : currentUser.data?.available_contexts?.companies?.[0]?.id;

      // 2. Disponibilités
      const apiAvailability = {
        monday: false, tuesday: false, wednesday: false, thursday: false, friday: false, other: false
      };
      selectedAvailability.forEach(day => {
        const key = dayMapping[day];
        if (key) (apiAvailability as any)[key] = true;
      });

      // 3. Compétences
      const skillIds = apiSkills
        .filter(apiSkill => selectedSkills.includes(apiSkill.name))
        .map(s => s.id);

      // 4. Password & Rôle
      const tempPassword = generateStrongPassword();
      const selectedRole = formData.roles[0] || 'voluntary'; // Fallback

      const apiPayload = {
        email: formData.email || `temp.${Date.now()}@kinship.placeholder`,
        hasTemporaryEmail: !formData.email,
        password: tempPassword,
        passwordConfirmation: tempPassword,
        firstName: formData.firstName,
        lastName: formData.lastName,
        birthday: "2000-01-01",
        role: selectedRole, // Utilisation du rôle dynamique
        job: formData.profession,
        companyName: formData.organization,
        proposeWorkshop: formData.canProposeAtelier,
        takeTrainee: formData.canProposeStage,
        acceptPrivacyPolicy: true,
        availability: apiAvailability,
        selectedSkills: skillIds,
        selectedSubSkills: [],
        selectedCompanies: !isEdu && contextId ? [Number(contextId)] : [],
        selectedSchools: isEdu && contextId ? [Number(contextId)] : []
      };

      // 5. Envoi
      await submitPersonalUserRegistration(apiPayload);

      const finalAvatar = formData.avatar || generateDefaultAvatar(
        selectedRole,
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
      alert("Membre ajouté avec succès !");
      onClose();

    } catch (error) {
      console.error("Erreur lors de l'ajout du membre", error);
      alert("Erreur lors de l'enregistrement ou de la récupération de l'organisation.");
    }
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
          {/* Avatar Section */}
          <div className="form-section">
            <h3>Photo de profil</h3>
            <div className="avatar-selection">
              <div className="avatar-preview">
                <AvatarImage src={avatarPreview} alt="Avatar preview" className="avatar-image" />
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
                  Avatar par défaut généré selon le rôle sélectionné
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

            {/* Remplacement du Select Statique par les données de l'API */}
            <div className="form-group">
              <label htmlFor="roles">Rôle</label>
              <select
                id="roles"
                name="roles"
                value={formData.roles[0] || ''}
                onChange={handleInputChange}
                className="form-select"
              >
                {apiRoles.length > 0 ? (
                  apiRoles.map((role) => (
                    <option key={role.value} value={role.value}>
                      {tradFR[role.value] || role.value}
                    </option>
                  ))
                ) : (
                  <option value="">Chargement...</option>
                )}
              </select>
            </div>
          </div>

          <div className="form-section">
            <h3>Compétences *</h3>
            <p className="section-description">Sélectionnez au moins une compétence</p>
            <div className="competencies-grid">
              {apiSkills.length > 0 ? (
                apiSkills.map((skill) => (
                  <label key={skill.id} className="competency-checkbox">
                    <input
                      type="checkbox"
                      checked={selectedSkills.includes(skill.name)}
                      onChange={() => handleSkillToggle(skill.name)}
                    />
                    <span className="checkmark"></span>
                    <span className="competency-label">{skill.name}</span>
                  </label>
                ))
              ) : (
                <p>Chargement des compétences...</p>
              )}
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