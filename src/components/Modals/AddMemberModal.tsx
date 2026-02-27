import React, { useState, useRef, useEffect } from 'react';
import { Member } from '../../types';
import './Modal.css';
import { getCurrentUser } from '../../api/Authentication';
import { getPersonalUserRoles } from '../../api/RegistrationRessource';
import { addCompanyMember } from '../../api/CompanyDashboard/Members';
import { useAppContext } from '../../context/AppContext';
import AvatarImage from '../UI/AvatarImage';
import { getSelectedCompanyId } from '../../utils/contextUtils';
import { useToast } from '../../hooks/useToast';
import { translateRole } from '../../utils/roleTranslations';
import QRCodePrintModal from './QRCodePrintModal';

// Same order as Personal settings (RoleSection) / registration; eleve_primaire excluded for company (min age 15)
const ROLE_ORDER = [
  'collegien',
  'lyceen',
  'etudiant',
  'parent',
  'benevole',
  'charge_de_mission',
  'employee',
  'other_personal_user',
];

interface AddMemberModalProps {
  onClose: () => void;
  onAdd: (member: Omit<Member, 'id'>) => void;
  onSuccess?: () => void;
  /** When 'minor', allows adding members under 15 with legal representative consent (BLEU Premium) */
  variant?: 'major' | 'minor';
}

const LEGAL_CONSENT_LABEL = "Je déclare avoir informé le représentant légal et avoir obtenu son autorisation préalable pour la création de ce compte.";
const LEGAL_CONSENT_TRACEABILITY = "Cette déclaration est enregistrée et horodatée à des fins de traçabilité.";

const AddMemberModal: React.FC<AddMemberModalProps> = ({ onClose, onAdd, onSuccess, variant = 'major' }) => {
  const isMinorVariant = variant === 'minor';
  const { state } = useAppContext();
  const { showSuccess, showError, showInfo } = useToast();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    birthday: '',
    role: 'voluntary',
    avatar: ''
  });

  const [avatarPreview, setAvatarPreview] = useState<string>('');
  const [isUsingDefaultAvatar, setIsUsingDefaultAvatar] = useState<boolean>(true);

  // State pour les données API
  const [apiRoles, setApiRoles] = useState<{ value: string; requires_additional_info: boolean }[]>([]);

  // State pour le QR Code
  const [showQRCodeModal, setShowQRCodeModal] = useState<boolean>(false);
  const [memberData, setMemberData] = useState<{ claimToken: string; fullName: string } | null>(null);
  const [legalRepresentativeConsent, setLegalRepresentativeConsent] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Role order for minor variant includes eleve_primaire
  const roleOrderForMinor = ['eleve_primaire', ...ROLE_ORDER];

  // Chargement des Roles au montage (filtrés et triés comme en paramètres personnels)
  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const rolesRes = await getPersonalUserRoles();
        const rolesData = rolesRes?.data?.data ?? rolesRes?.data ?? rolesRes ?? [];
        if (Array.isArray(rolesData)) {
          // Exclure legacy "other"; exclude eleve_primaire only for major (min age 15)
          const filtered = rolesData.filter(
            (r: { value: string }) => r.value !== 'other' && (isMinorVariant || r.value !== 'eleve_primaire')
          );
          const order = isMinorVariant ? roleOrderForMinor : ROLE_ORDER;
          const sorted = filtered.sort((a: { value: string }, b: { value: string }) => {
            const indexA = order.indexOf(a.value);
            const indexB = order.indexOf(b.value);
            return (indexA === -1 ? 999 : indexA) - (indexB === -1 ? 999 : indexB);
          });
          setApiRoles(sorted);
          if (sorted.length > 0) {
            setFormData(prev => ({ ...prev, role: sorted[0].value }));
          }
        }
      } catch (error) {
        console.error("Erreur chargement des rôles", error);
      }
    };
    fetchRoles();
  }, [isMinorVariant]);

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

  // Fonction pour capitaliser la première lettre de chaque mot
  const capitalizeName = (str: string): string => {
    return str
      .toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      // Capitaliser automatiquement le prénom et le nom
      const processedValue = (name === 'firstName' || name === 'lastName') 
        ? capitalizeName(value) 
        : value;
      
      setFormData(prev => {
        const updated = { ...prev, [name]: processedValue };
        return updated;
      });

      // Mise à jour de l'avatar si on change le nom/rôle
      if (isUsingDefaultAvatar && (name === 'role' || name === 'firstName' || name === 'lastName')) {
        const firstName = name === 'firstName' ? processedValue : formData.firstName;
        const lastName = name === 'lastName' ? processedValue : formData.lastName;
        const role = name === 'role' ? value : (formData.role || 'voluntary');

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
      const defaultAvatar = generateDefaultAvatar(formData.role || 'voluntary', formData.firstName, formData.lastName);
      setAvatarPreview(defaultAvatar);
      setFormData(prev => ({ ...prev, avatar: '' }));
      setIsUsingDefaultAvatar(true);
    }
  };

  const computeAge = (birthdayStr: string): number => {
    const birth = new Date(birthdayStr);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age -= 1;
    }
    return age;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.firstName || !formData.lastName) {
      showError('Prénom et nom sont obligatoires');
      return;
    }

    if (!formData.birthday) {
      showError('La date de naissance est obligatoire');
      return;
    }

    if (!isMinorVariant && computeAge(formData.birthday) < 15) {
      showError("Une organisation ne peut pas créer un membre dont l'âge est inférieur à 15 ans.");
      return;
    }

    if (isMinorVariant && !formData.email?.trim()) {
      showError("L'email du représentant légal est obligatoire.");
      return;
    }

    if (isMinorVariant && !legalRepresentativeConsent) {
      showError("Veuillez confirmer l'autorisation du représentant légal.");
      return;
    }

    try {
      // Get company ID
      const currentUser = await getCurrentUser();
      const companyId = getSelectedCompanyId(currentUser.data, state.showingPageType);

      if (!companyId) {
        showError("Impossible de récupérer l'identifiant de l'entreprise");
        return;
      }

      // Build payload (birthday always required and sent for new company members)
      const payload: any = {
        first_name: formData.firstName,
        last_name: formData.lastName,
        birthday: formData.birthday,
        role: 'member',  // Default company role
        user_role: formData.role  // System role
      };

      if (formData.email) {
        payload.email = formData.email;
      }
      if (isMinorVariant) {
        payload.create_minor = true;
        payload.legal_representative_consent = true;
      }

      // Call API
      const response = await addCompanyMember(companyId, payload);

      console.log('Response complète:', response);
      console.log('Response data:', response.data);

      // Extract data
      const claimToken = response.data?.data?.claim_token;
      const fullName = response.data?.data?.full_name || `${formData.firstName} ${formData.lastName}`;

      console.log('Claim token:', claimToken);
      console.log('Full name:', fullName);

      // Create member data for callback
      const finalAvatar = formData.avatar || generateDefaultAvatar(
        formData.role,
        formData.firstName,
        formData.lastName
      );

      const memberDataForCallback = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: response.data?.data?.email || formData.email || '',
        avatar: finalAvatar,
        profession: translateRole(formData.role),
        roles: [formData.role],
        claim_token: claimToken,
        hasTemporaryEmail: response.data?.data?.has_temporary_email || false,
        role: formData.role,
        skills: [],
        availability: [],
        isTrusted: false,
        organization: '',
        badges: [],
        canProposeStage: false,
        canProposeAtelier: false
      };

      onAdd(memberDataForCallback);

      if (response.data?.existing_user_linked) {
        showInfo('Cette personne existait déjà dans le système.');
      }
      showSuccess(`Membre ${fullName} ajouté avec succès !`);

      // Refetch data if callback provided
      if (onSuccess) {
        onSuccess();
      }

      // Show QR code modal if claim token exists
      if (claimToken) {
        setMemberData({ claimToken, fullName });
        setShowQRCodeModal(true);
        // Don't close modal yet
      } else {
        console.warn('Pas de claim_token dans la réponse');
        onClose();
      }

    } catch (error: any) {
      console.error("Erreur lors de l'ajout du membre", error);
      console.error("Erreur détails:", error.response?.data);
      showError(error.response?.data?.message || "Erreur lors de l'enregistrement du membre.");
    }
  };

  // Si le modal QR code doit être affiché, afficher seulement celui-là
  if (showQRCodeModal && memberData) {
    return (
      <QRCodePrintModal
        onClose={() => {
          setShowQRCodeModal(false);
          onClose();
        }}
        claimToken={memberData.claimToken}
        studentName={memberData.fullName}
      />
    );
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{isMinorVariant ? 'Créer un membre mineur (<15 ans)' : 'Ajouter un nouveau membre'}</h2>
          <button className="modal-close" onClick={onClose}>
            <i className="fas fa-times"></i>
          </button>
        </div>

        {isMinorVariant && (
          <div className="modal-info-block">
            <i className="fas fa-info-circle" aria-hidden />
            <p>
              Pré-inscription d'une personne de moins de 15 ans.<br />
              Le représentant légal recevra un email et devra valider l'autorisation. <strong>Sans validation, le rattachement n'est pas effectif.</strong>
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="modal-body">
          {/* Avatar Section */}
          {/* <div className="form-section">
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
          </div> */}

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
              <label htmlFor="email">{isMinorVariant ? 'Email du représentant légal *' : 'Email'}</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                required={isMinorVariant}
                className="form-input"
                placeholder={isMinorVariant ? 'ex. representant@exemple.fr' : 'Optionnel - laisser vide pour créer un email temporaire'}
              />
            </div>

            <div className="form-group">
              <label htmlFor="birthday">Date de naissance *</label>
              <input
                type="date"
                id="birthday"
                name="birthday"
                max={new Date().toISOString().split('T')[0]}
                value={formData.birthday}
                onChange={handleInputChange}
                required
                className="form-input"
              />
              <p className="form-hint">{isMinorVariant ? 'Obligatoire.' : "Obligatoire pour tous les membres (âge minimum 15 ans)"}</p>
            </div>

            <div className="form-group">
              <label htmlFor="role">Rôle *</label>
              <select
                id="role"
                name="role"
                value={formData.role || ''}
                onChange={handleInputChange}
                required
                className="form-select"
              >
                {apiRoles.length > 0 ? (
                  apiRoles.map((role) => (
                    <option key={role.value} value={role.value}>
                      {translateRole(role.value)}
                    </option>
                  ))
                ) : (
                  <option value="">Chargement...</option>
                )}
              </select>
              {isMinorVariant && (
                <div style={{ marginTop: '12px' }}>
                  <label className="checkbox-label" style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={legalRepresentativeConsent}
                      onChange={(e) => setLegalRepresentativeConsent(e.target.checked)}
                      required={isMinorVariant}
                      style={{ marginTop: '4px' }}
                    />
                    <span>{LEGAL_CONSENT_LABEL} *</span>
                  </label>
                  <p className="form-hint modal-consent-traceability" style={{ marginTop: '6px', marginLeft: '28px', fontSize: '0.8rem', color: 'var(--text-muted, #6b7280)' }}>
                    {LEGAL_CONSENT_TRACEABILITY}
                  </p>
                </div>
              )}
            </div>
          </div>
        </form>

        <div className="modal-footer">
          <button type="button" className="btn btn-outline" onClick={onClose}>
            Annuler
          </button>
          <button type="submit" className="btn btn-primary" onClick={handleSubmit}>
            <i className="fas fa-plus"></i>
            {isMinorVariant ? 'Ajouter le membre mineur (<15 ans)' : 'Ajouter le membre'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddMemberModal;