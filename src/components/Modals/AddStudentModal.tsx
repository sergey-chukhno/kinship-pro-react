import React, { useState, useRef, useEffect } from 'react';
import { Member } from '../../types';
import './Modal.css';
import { getCurrentUser } from '../../api/Authentication';
import { getPersonalUserRoles } from '../../api/RegistrationRessource';
import { getSchoolLevels, createLevelStudent } from '../../api/SchoolDashboard/Levels';
import { getTeacherClasses, createTeacherLevelStudent } from '../../api/Dashboard';
import { useAppContext } from '../../context/AppContext';
import { useToast } from '../../hooks/useToast';
import QRCodePrintModal from './QRCodePrintModal';
import AvatarImage from '../UI/AvatarImage';

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
  const { state } = useAppContext();
  const isTeacherContext = state.showingPageType === 'teacher';
  const { showSuccess, showError } = useToast();
  const [selectedSchoolId, setSelectedSchoolId] = useState<number | null>(null);
  const [availableSchools, setAvailableSchools] = useState<Array<{ id: number; name: string }>>([]);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    birthday: '',
    role: 'member',
    roleAdditionalInfo: '',
    levelId: '',
    avatar: ''
  });

  const [avatarPreview, setAvatarPreview] = useState<string>('');
  const [isUsingDefaultAvatar, setIsUsingDefaultAvatar] = useState<boolean>(true);

  // State pour les données API
  const [apiRoles, setApiRoles] = useState<{ value: string; requires_additional_info: boolean }[]>([]);
  const studentRoles = ['eleve_primaire', 'collegien', 'lyceen', 'etudiant'];
  const [levels, setLevels] = useState<{ id: number; name: string; level: string; school_id?: number | null }[]>([]);
  const [loadingLevels, setLoadingLevels] = useState(false);

  // State pour le QR Code
  const [showQRCodeModal, setShowQRCodeModal] = useState<boolean>(false);
  const [studentData, setStudentData] = useState<{ claimToken: string; fullName: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Chargement des écoles disponibles pour les teachers (seulement celles où l'utilisateur est admin, superadmin ou referent)
  useEffect(() => {
    const fetchSchools = async () => {
      if (!isTeacherContext) return;
      
      try {
        const currentUser = await getCurrentUser();
        const schools = currentUser.data?.available_contexts?.schools || [];
        
        // Filtrer pour ne garder que les écoles où l'utilisateur est admin, superadmin ou referent
        const filteredSchools = schools.filter((school: any) => 
          school.role === 'admin' || school.role === 'superadmin' || school.role === 'referent'
        );
        
        const schoolsList = filteredSchools.map((school: any) => ({
          id: school.id,
          name: school.name
        }));
        
        setAvailableSchools(schoolsList);
        
        // Ne pas sélectionner d'école par défaut - l'utilisateur doit choisir ou laisser "non renseigné"
      } catch (error) {
        console.error("Erreur lors du chargement des écoles", error);
      }
    };
    
    fetchSchools();
  }, [isTeacherContext]);

  // Chargement des Roles (une seule fois au montage)
  useEffect(() => {
    const fetchRoles = async () => {
      if (apiRoles.length > 0) return; // Déjà chargés
      
      try {
        const rolesRes = await getPersonalUserRoles();
        const rolesData = rolesRes?.data?.data ?? rolesRes?.data ?? rolesRes ?? [];
        if (Array.isArray(rolesData)) {
          const filtered = rolesData.filter((role: any) => studentRoles.includes(role.value));
          setApiRoles(filtered);
          // Sélectionner le premier rôle étudiant par défaut si disponible
          if (filtered.length > 0) {
            setFormData(prev => ({ ...prev, role: filtered[0].value }));
          }
        }
      } catch (error) {
        console.error("Erreur chargement des rôles", error);
      }
    };
    fetchRoles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Chargement des Levels/Classes en fonction de l'école sélectionnée ou toutes les classes du teacher
  useEffect(() => {
    let isMounted = true;
    
    const fetchLevels = async () => {
      try {
        if (isMounted) {
          setLoadingLevels(true);
          setLevels([]); // Vider la liste pendant le chargement
          // Ne pas réinitialiser levelId ici pour éviter de perdre la sélection de l'utilisateur
          // On le réinitialisera seulement si nécessaire (changement d'école)
        }

        // Si c'est un teacher, utiliser l'API teachers/classes pour récupérer toutes ses classes
        if (isTeacherContext) {
          console.log('Fetching levels for teacher', levels);
          const levelsRes = await getTeacherClasses(1, 100);
          const levelsData = levelsRes?.data?.data ?? levelsRes?.data ?? [];
          
          if (isMounted) {
            if (Array.isArray(levelsData)) {
              const mappedLevels = levelsData.map((l: any) => ({
                id: l.id,
                name: l.name,
                level: l.level || l.level_name || '',
                school_id: l.school_id || null
              }));
              setLevels(mappedLevels);
              // Sélectionner automatiquement la première classe par défaut si aucune n'est déjà sélectionnée
              setFormData(prev => {
                if (prev.levelId) {
                  // Vérifier si la classe sélectionnée existe toujours dans la nouvelle liste
                  const levelExists = mappedLevels.some(l => l.id.toString() === prev.levelId);
                  if (!levelExists) {
                    // Si la classe sélectionnée n'existe plus, sélectionner la première disponible
                    return { ...prev, levelId: mappedLevels.length > 0 ? mappedLevels[0].id.toString() : '' };
                  }
                  return prev;
                } else {
                  // Si aucune classe n'est sélectionnée, sélectionner la première par défaut
                  return { ...prev, levelId: mappedLevels.length > 0 ? mappedLevels[0].id.toString() : '' };
                }
              });
            } else {
              setLevels([]);
              setFormData(prev => ({ ...prev, levelId: '' }));
            }
          }
        } else {
          // Pour les admins d'école, utiliser l'API schools/levels
          const currentUser = await getCurrentUser();
          const schoolId = currentUser.data?.available_contexts?.schools?.[0]?.id;

          if (!schoolId) {
            if (isMounted) {
              setLevels([]);
              setFormData(prev => ({ ...prev, levelId: '' }));
            }
            return;
          }

          const levelsRes = await getSchoolLevels(Number(schoolId), 1, 100);
          const levelsData = levelsRes?.data?.data ?? levelsRes?.data ?? [];
          
          if (isMounted) {
            if (Array.isArray(levelsData)) {
              const mappedLevels = levelsData.map((l: any) => ({
                id: l.id,
                name: l.name,
                level: l.level
              }));
              setLevels(mappedLevels);
              // Sélectionner le premier level par défaut seulement si aucune classe n'est déjà sélectionnée
              setFormData(prev => {
                if (!prev.levelId && mappedLevels.length > 0) {
                  return { ...prev, levelId: mappedLevels[0].id.toString() };
                }
                // Vérifier si la classe sélectionnée existe toujours dans la nouvelle liste
                if (prev.levelId) {
                  const levelExists = mappedLevels.some(l => l.id.toString() === prev.levelId);
                  if (!levelExists) {
                    // Si la classe sélectionnée n'existe plus, sélectionner la première
                    return { ...prev, levelId: mappedLevels.length > 0 ? mappedLevels[0].id.toString() : '' };
                  }
                }
                return prev;
              });
            } else {
              setLevels([]);
              setFormData(prev => ({ ...prev, levelId: '' }));
            }
          }
        }
      } catch (error) {
        if (isMounted) {
          console.error("Erreur chargement des classes", error);
          showError("Erreur lors du chargement des classes");
          setLevels([]);
          setFormData(prev => ({ ...prev, levelId: '' }));
        }
      } finally {
        if (isMounted) {
          setLoadingLevels(false);
        }
      }
    };
    
    fetchLevels();
    
    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSchoolId, isTeacherContext]);


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
      
      // Debug pour levelId
      if (name === 'levelId') {
        console.log('Setting levelId to:', processedValue);
      }
      
      setFormData(prev => {
        const updated = { ...prev, [name]: processedValue };
        if (name === 'levelId') {
          console.log('Updated formData.levelId:', updated.levelId);
        }
        return updated;
      });

      // Mise à jour de l'avatar si on change le nom/rôle
      if (isUsingDefaultAvatar && (name === 'role' || name === 'firstName' || name === 'lastName')) {
        const firstName = name === 'firstName' ? processedValue : formData.firstName;
        const lastName = name === 'lastName' ? processedValue : formData.lastName;
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
    console.log('Form data:', formData);
    console.log('LevelId:', formData.levelId);
    console.log('levels:', levels);
    if (!formData.firstName || !formData.lastName || !formData.levelId) {
      showError('Prénom, nom et classe sont obligatoires');
      return;
    }
    
    if (!formData.email && !formData.birthday) {
      showError('Email ou date de naissance est obligatoire');
      return;
    }

    try {
      let response: any;
      
      // Si c'est un teacher et qu'aucune école n'est sélectionnée, utiliser l'API teachers/levels/:level_id/students
      if (isTeacherContext && !selectedSchoolId) {
        // Utiliser l'API teachers/levels/:level_id/students
        const teacherPayload = {
          student: {
            first_name: formData.firstName,
            last_name: formData.lastName,
            email: formData.email || undefined,
            birthday: formData.birthday, // Requis si pas d'email
            role: formData.role || 'eleve_primaire',
            role_additional_information: formData.role || undefined,
            accept_privacy_policy: true
          }
        };

        console.log('Payload teacher envoyé:', teacherPayload);
        console.log('LevelId:', formData.levelId);

        response = await createTeacherLevelStudent(
          Number(formData.levelId),
          teacherPayload
        );
      } else {
        // Sinon, utiliser l'API schools/:schoolId/levels/:levelId/students
        let schoolId: number | null = null;
        
        if (isTeacherContext) {
          // Pour les teachers avec école sélectionnée, utiliser l'école sélectionnée
          schoolId = selectedSchoolId;
          
          // Si toujours pas d'école, essayer de récupérer depuis la classe
          if (!schoolId) {
            const selectedLevel = levels.find(l => l.id.toString() === formData.levelId);
            if (selectedLevel && selectedLevel.school_id) {
              schoolId = selectedLevel.school_id;
            }
          }
        } else {
          // Pour les admins d'école, utiliser la première école disponible
          const currentUser = await getCurrentUser();
          schoolId = currentUser.data?.available_contexts?.schools?.[0]?.id || null;
        }

        // Pour les admins d'école, schoolId est obligatoire
        if (!isTeacherContext && !schoolId) {
          showError("Impossible de récupérer l'identifiant de l'école");
          return;
        }

        if (!schoolId) {
          showError("Impossible de récupérer l'identifiant de l'école");
          return;
        }

        // 2. Préparation du payload pour l'API school
        const apiPayload = {
          student: {
            first_name: formData.firstName,
            last_name: formData.lastName,
            email: formData.email || undefined,
            birthday: formData.birthday,
            role: formData.role,
            role_additional_information: formData.roleAdditionalInfo || undefined
          }
        };

        console.log('Payload school envoyé:', apiPayload);
        console.log('SchoolId:', schoolId, 'LevelId:', formData.levelId);

        // 3. Envoi de la requête
        response = await createLevelStudent(
          Number(schoolId),
          Number(formData.levelId),
          apiPayload
        );
      }
      
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
        firstName: formData.firstName,
        lastName: formData.lastName,
        avatar: finalAvatar,
        email: response.data?.data?.email || formData.email || '',
        profession: formData.roleAdditionalInfo || '',
        roles: [formData.role],
        skills: [],
        availability: [],
        isTrusted: false,
        organization: '',
        badges: [],
        canProposeStage: false,
        canProposeAtelier: false,
        claim_token: claimToken,
        hasTemporaryEmail: response.data?.data?.has_temporary_email || false,
        birthday: formData.birthday,
        role: formData.role,
        levelId: formData.levelId,
        roleAdditionalInfo: formData.roleAdditionalInfo
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
          <h2>Ajouter un nouvel élève</h2>
          <button className="modal-close" onClick={onClose}>
            <i className="fas fa-times"></i>
          </button>
        </div>

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
              <label htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className="form-input"
                placeholder="Optionnel - laisser vide pour créer un email temporaire"
              />
            </div>
            
            {/* Sélecteur d'école pour les teachers (toujours affiché si au moins une école disponible) */}
            {isTeacherContext && availableSchools.length > 0 && (
              <div className="form-group">
                <label htmlFor="schoolId">Établissement</label>
                <select
                  id="schoolId"
                  name="schoolId"
                  value={selectedSchoolId || ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    const schoolId = value === '' ? null : Number(value);
                    setSelectedSchoolId(schoolId);
                    // Réinitialiser la classe sélectionnée quand on change d'école
                    setFormData(prev => ({ ...prev, levelId: '' }));
                  }}
                  className="form-select"
                >
                  <option value="">Non renseigné</option>
                  {availableSchools.map((school) => (
                    <option key={school.id} value={school.id}>
                      {school.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="form-group">
              <label htmlFor="birthday">
                Date de naissance {!formData.email && '*'}
              </label>
              <input
                type="date"
                id="birthday"
                name="birthday"
                max={new Date().toISOString().split('T')[0]}
                value={formData.birthday}
                onChange={handleInputChange}
                required={!formData.email}
                className="form-input"
              />
              {!formData.email && (
                <p className="form-hint">Requis si aucun email n'est fourni</p>
              )}
            </div>


            <div className="form-group">
              <label htmlFor="levelId">Classe *</label>
              <select
                id="levelId"
                name="levelId"
                value={formData.levelId || ''}
                onChange={handleInputChange}
                required
                className="form-select"
                disabled={loadingLevels}
              >
                {loadingLevels ? (
                  <option value="">Chargement des classes...</option>
                ) : levels.length > 0 ? (
                  levels.map((level) => (
                    <option key={level.id} value={level.id.toString()}>
                      {level.name} {level.level ? `- ${level.level}` : ''}
                    </option>
                  ))
                ) : (
                  <option value="">Aucune classe disponible</option>
                )}
              </select>
            </div>

            {/* Remplacement du Select Statique par les données de l'API */}
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