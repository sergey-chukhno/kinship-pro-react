import React, { useState, useEffect, useCallback } from 'react';
import { useAppContext } from '../../context/AppContext';
import { getPersonalUserRoles } from '../../api/RegistrationRessource';
import { updateUserRole } from '../../api/UserDashBoard/Profile';
import { useToast } from '../../hooks/useToast';
import { translateRole } from '../../utils/roleTranslations';
import './RoleSection.css';

const ROLE_ORDER = [
  'eleve_primaire',
  'collegien',
  'lyceen',
  'etudiant',
  'parent',
  'benevole',
  'charge_de_mission',
  'employee',
  'other_personal_user',
];

const SCHOOL_PUPIL_ROLES = ['eleve_primaire', 'collegien', 'lyceen'];

const RoleSection: React.FC = () => {
  const { state, setUser } = useAppContext();
  const { showSuccess, showError } = useToast();
  const [availableRoles, setAvailableRoles] = useState<Array<{ value: string; label: string }>>([]);
  const [selectedRole, setSelectedRole] = useState(state.user.role || '');
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  const loadRoles = useCallback(async () => {
    try {
      const response = await getPersonalUserRoles();
      const roles = response?.data?.data ?? response?.data ?? response ?? [];
      
      // Filter roles based on current user role
      const currentRole = state.user.role;
      let filteredRoles = roles;

      if (SCHOOL_PUPIL_ROLES.includes(currentRole)) {
        // School pupils can only change to other school pupil roles
        filteredRoles = roles.filter((r: any) => SCHOOL_PUPIL_ROLES.includes(r.value));
      } else if (currentRole === 'other' || currentRole === 'other_personal_user') {
        // "Autre" can change to any personal user role
        filteredRoles = roles;
      } else {
        // Other personal users can change to any personal user role except school pupils
        filteredRoles = roles.filter((r: any) => !SCHOOL_PUPIL_ROLES.includes(r.value));
      }

      // Filter out legacy 'other' role - only show 'other_personal_user' as "Autre" to avoid duplicate
      filteredRoles = filteredRoles.filter((r: any) => r.value !== 'other');

      // Sort by ROLE_ORDER
      const sortedRoles = filteredRoles.sort((a: any, b: any) => {
        const indexA = ROLE_ORDER.indexOf(a.value);
        const indexB = ROLE_ORDER.indexOf(b.value);
        return (indexA === -1 ? 999 : indexA) - (indexB === -1 ? 999 : indexB);
      });

      setAvailableRoles(sortedRoles.map((r: any) => ({
        value: r.value,
        label: translateRole(r.value) || r.label || r.value,
      })));
    } catch (error) {
      console.error('Error loading roles:', error);
      showError('Erreur lors du chargement des rôles');
    } finally {
      setIsLoading(false);
    }
  }, [state.user.role, showError]);

  useEffect(() => {
    loadRoles();
  }, [loadRoles]);

  const handleUpdateRole = async (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedRole === state.user.role) {
      showError('Veuillez sélectionner un rôle différent');
      return;
    }

    setIsUpdating(true);

    try {
      await updateUserRole(selectedRole);
      setUser({ ...state.user, role: selectedRole });
      showSuccess('Rôle modifié avec succès');
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.response?.data?.error || 'Erreur lors de la modification du rôle';
      showError(errorMessage);
    } finally {
      setIsUpdating(false);
    }
  };

  if (isLoading) {
    return <div className="loading-container">Chargement...</div>;
  }

  return (
    <div className="role-section">
      <h3>Rôle système</h3>
      <p className="section-description">
        Modifiez votre rôle système. Les règles de changement dépendent de votre rôle actuel.
      </p>

      <div className="role-info">
        <p><strong>Rôle actuel :</strong> {translateRole(state.user.role)}</p>
        {SCHOOL_PUPIL_ROLES.includes(state.user.role) && (
          <p className="role-rule">
            <i className="fas fa-info-circle"></i>
            Vous pouvez uniquement changer vers un autre rôle d'élève (primaire, collégien, lycéen).
          </p>
        )}
        {!SCHOOL_PUPIL_ROLES.includes(state.user.role) && state.user.role !== 'other' && state.user.role !== 'other_personal_user' && (
          <p className="role-rule">
            <i className="fas fa-info-circle"></i>
            Vous pouvez changer vers n'importe quel rôle d'utilisateur personnel, sauf les rôles d'élève.
          </p>
        )}
        {(state.user.role === 'other' || state.user.role === 'other_personal_user') && (
          <p className="role-rule">
            <i className="fas fa-info-circle"></i>
            Vous pouvez changer vers n'importe quel rôle d'utilisateur personnel, y compris les rôles d'élève.
          </p>
        )}
      </div>

      <form onSubmit={handleUpdateRole} className="role-form">
        <div className="form-group">
          <label htmlFor="role">Nouveau rôle</label>
          <select
            id="role"
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            required
            className="form-select"
          >
            <option value="">Sélectionnez un rôle</option>
            {availableRoles.map((role) => (
              <option key={role.value} value={role.value}>
                {role.label}
              </option>
            ))}
          </select>
        </div>

        <button
          type="submit"
          className="btn btn-primary"
          disabled={isUpdating || selectedRole === state.user.role}
        >
          {isUpdating ? 'Mise à jour...' : 'Changer le rôle'}
        </button>
      </form>
    </div>
  );
};

export default RoleSection;




