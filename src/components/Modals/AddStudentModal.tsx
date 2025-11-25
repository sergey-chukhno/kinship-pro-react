import React, { useState, useRef, useEffect } from 'react';
import { Member } from '../../types';
import './Modal.css';
import { getCurrentUser } from '../../api/Authentication';
import { getPersonalUserRoles } from '../../api/RegistrationRessource';
import { createSchoolStudent } from '../../api/SchoolDashboard/Members';
import { useAppContext } from '../../context/AppContext';
import { useToast } from '../../hooks/useToast';
import QRCodePrintModal from './QRCodePrintModal';

interface AddMemberModalProps {
  onClose: () => void;
  onAdd: (member: Omit<Member, 'id'>) => void;
  onSuccess?: () => void;
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

const AddMemberModal: React.FC<AddMemberModalProps> = ({ onClose, onAdd, onSuccess }) => {
  useAppContext();
  const { showSuccess, showError } = useToast();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    birthday: '',
    role: '',
    avatar: ''
  });

  const [avatarPreview, setAvatarPreview] = useState<string>('');
  const [isUsingDefaultAvatar, setIsUsingDefaultAvatar] = useState<boolean>(true);

  // State pour les données API
  const [apiRoles, setApiRoles] = useState<{ value: string; requires_additional_info: boolean }[]>([]);

  // State pour le QR Code
  const [showQRCodeModal, setShowQRCodeModal] = useState<boolean>(false);
  const [studentData, setStudentData] = useState<{ claimToken: string; fullName: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Chargement des Roles au montage
  useEffect(() => {
    const fetchData = async () => {
      try {
        const rolesRes = await getPersonalUserRoles();
        const rolesData = rolesRes?.data?.data ?? rolesRes?.data ?? rolesRes ?? [];
        if (Array.isArray(rolesData)) {
          setApiRoles(rolesData);
          // Sélectionner le premier rôle par défaut si disponible
          if (rolesData.length > 0) {
            setFormData(prev => ({ ...prev, role: rolesData[0].value }));
          }
        }
      } catch (error) {
        console.error("Erreur chargement données (roles)", error);
      }
    };
    fetchData();
  }, []);


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
      if (isUsingDefaultAvatar && (name === 'role' || name === 'firstName' || name === 'lastName')) {
        const firstName = name === 'firstName' ? value : formData.firstName;
        const lastName = name === 'lastName' ? value : formData.lastName;
        const role = name === 'role' ? value : (formData.role || 'eleve_primaire');

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
      const defaultAvatar = generateDefaultAvatar(formData.role || 'eleve_primaire', formData.firstName, formData.lastName);
      setAvatarPreview(defaultAvatar);
      setFormData(prev => ({ ...prev, avatar: '' }));
      setIsUsingDefaultAvatar(true);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.firstName || !formData.lastName || !formData.birthday) {
      alert('Prénom, nom et date de naissance sont obligatoires');
      return;
    }

    try {
      // 1. Récupération du schoolId
      const currentUser = await getCurrentUser();
      const schoolId = currentUser.data?.available_contexts?.schools?.[0]?.id;

      if (!schoolId) {
        showError("Impossible de récupérer l'identifiant de l'école");
        return;
      }

      // 2. Préparation du payload
      const apiPayload = {
        first_name: formData.firstName,
        last_name: formData.lastName,
        birthday: formData.birthday,
        user_role: formData.role,
        role: "member"
      };

      // 3. Envoi de la requête
      const response = await createSchoolStudent(Number(schoolId), apiPayload);
      
      console.log('Response complète:', response);
      console.log('Response data:', response.data);

      // 4. Extraction du claim_token
      const claimToken = response.data?.data?.claim_token;
      const fullName = response.data?.data?.full_name || `${formData.firstName} ${formData.lastName}`;

      console.log('Claim token:', claimToken);
      console.log('Full name:', fullName);

      // 5. Mise à jour de l'UI locale
      const finalAvatar = formData.avatar || generateDefaultAvatar(
        formData.role,
        formData.firstName,
        formData.lastName
      );

      const memberData = {
        ...formData,
        avatar: finalAvatar,
        email: response.data?.data?.email || '',
        profession: '',
        roles: [formData.role],
        skills: [],
        availability: [],
        isTrusted: false,
        organization: '',
        badges: [],
        canProposeStage: false,
        canProposeAtelier: false,
        claimToken: claimToken,
        hasTemporaryEmail: response.data?.data?.has_temporary_email || false
      };

      onAdd(memberData);

      // 6. Afficher le toast de succès
      showSuccess(`Étudiant ${fullName} ajouté avec succès !`);

      // 7. Refetch des données
      if (onSuccess) {
        onSuccess();
      }

      // 8. Afficher le modal QR code si le token est disponible
      if (claimToken) {
        setStudentData({ claimToken, fullName });
        setShowQRCodeModal(true);
        // Ne pas fermer le modal principal encore
      } else {
        console.warn('Pas de claim_token dans la réponse');
        onClose();
      }

    } catch (error: any) {
      console.error("Erreur lors de l'ajout de l'étudiant", error);
      console.error("Erreur détails:", error.response?.data);
      showError(error.response?.data?.message || "Erreur lors de l'enregistrement de l'étudiant.");
    }
  };

  // Si le modal QR code doit être affiché, afficher seulement celui-là
  if (showQRCodeModal && studentData) {
    return (
      <QRCodePrintModal
        onClose={() => {
          setShowQRCodeModal(false);
          onClose();
        }}
        claimToken={studentData.claimToken}
        studentName={studentData.fullName}
      />
    );
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Ajouter un nouvel étudiant</h2>
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
              <label htmlFor="lastName">Date de naissance *</label>
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
            </div>

            {/* Remplacement du Select Statique par les données de l'API */}
            <div className="form-group">
              <label htmlFor="role">Rôle</label>
              <select
                id="role"
                name="role"
                value={formData.role || ''}
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