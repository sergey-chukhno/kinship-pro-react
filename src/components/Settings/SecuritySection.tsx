import React, { useState } from 'react';
import { updateUserPassword } from '../../api/UserDashBoard/Profile';
import { useToast } from '../../hooks/useToast';
import './SecuritySection.css';

interface PasswordCriteria {
  minLength: boolean;
  lowercase: boolean;
  uppercase: boolean;
  specialChar: boolean;
  match: boolean;
}

const SecuritySection: React.FC = () => {
  const { showSuccess, showError } = useToast();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [passwordCriteria, setPasswordCriteria] = useState<PasswordCriteria>({
    minLength: false,
    lowercase: false,
    uppercase: false,
    specialChar: false,
    match: false,
  });

  // Validate password criteria
  React.useEffect(() => {
    const minLength = newPassword.length >= 8;
    const lowercase = /[a-z]/.test(newPassword);
    const uppercase = /[A-Z]/.test(newPassword);
    const specialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(newPassword);
    const match = newPassword.length > 0 && newPassword === passwordConfirmation;

    setPasswordCriteria({
      minLength,
      lowercase,
      uppercase,
      specialChar,
      match,
    });
  }, [newPassword, passwordConfirmation]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentPassword) {
      showError('Veuillez entrer votre mot de passe actuel');
      return;
    }

    if (!newPassword) {
      showError('Veuillez entrer un nouveau mot de passe');
      return;
    }

    if (!passwordCriteria.minLength) {
      showError('Le mot de passe doit contenir au moins 8 caractères');
      return;
    }

    if (!passwordCriteria.lowercase) {
      showError('Le mot de passe doit contenir au moins une lettre minuscule');
      return;
    }

    if (!passwordCriteria.uppercase) {
      showError('Le mot de passe doit contenir au moins une lettre majuscule');
      return;
    }

    if (!passwordCriteria.specialChar) {
      showError('Le mot de passe doit contenir au moins un caractère spécial');
      return;
    }

    if (!passwordCriteria.match) {
      showError('Les mots de passe ne correspondent pas');
      return;
    }

    setIsUpdating(true);

    try {
      await updateUserPassword(currentPassword, newPassword, passwordConfirmation);
      showSuccess('Mot de passe modifié avec succès');
      setCurrentPassword('');
      setNewPassword('');
      setPasswordConfirmation('');
      setPasswordCriteria({
        minLength: false,
        lowercase: false,
        uppercase: false,
        specialChar: false,
        match: false,
      });
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.response?.data?.error || 'Erreur lors de la modification du mot de passe';
      showError(errorMessage);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="security-section">
      <h3>Changer le mot de passe</h3>
      <p className="section-description">
        Utilisez un mot de passe fort que vous n'utilisez nulle part ailleurs.
      </p>

      <form onSubmit={handleSubmit} className="security-form">
        <div className="form-group">
          <label htmlFor="currentPassword">Mot de passe actuel</label>
          <input
            type="password"
            id="currentPassword"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
            className="form-input"
            placeholder="Entrez votre mot de passe actuel"
          />
        </div>

        <div className="form-group">
          <label htmlFor="newPassword">Nouveau mot de passe</label>
          <input
            type="password"
            id="newPassword"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            className="form-input"
            placeholder="Entrez votre nouveau mot de passe"
          />
        </div>

        <div className="form-group">
          <label htmlFor="passwordConfirmation">Confirmer le nouveau mot de passe</label>
          <input
            type="password"
            id="passwordConfirmation"
            value={passwordConfirmation}
            onChange={(e) => setPasswordConfirmation(e.target.value)}
            required
            className="form-input"
            placeholder="Confirmez votre nouveau mot de passe"
          />
        </div>

        {/* Password criteria indicator */}
        {newPassword && (
          <div className="password-criteria">
            <h4>Critères du mot de passe :</h4>
            <ul>
              <li className={passwordCriteria.minLength ? 'valid' : 'invalid'}>
                <i className={`fas ${passwordCriteria.minLength ? 'fa-check-circle' : 'fa-times-circle'}`}></i>
                Au moins 8 caractères
              </li>
              <li className={passwordCriteria.lowercase ? 'valid' : 'invalid'}>
                <i className={`fas ${passwordCriteria.lowercase ? 'fa-check-circle' : 'fa-times-circle'}`}></i>
                Au moins une lettre minuscule
              </li>
              <li className={passwordCriteria.uppercase ? 'valid' : 'invalid'}>
                <i className={`fas ${passwordCriteria.uppercase ? 'fa-check-circle' : 'fa-times-circle'}`}></i>
                Au moins une lettre majuscule
              </li>
              <li className={passwordCriteria.specialChar ? 'valid' : 'invalid'}>
                <i className={`fas ${passwordCriteria.specialChar ? 'fa-check-circle' : 'fa-times-circle'}`}></i>
                Au moins un caractère spécial
              </li>
              <li className={passwordCriteria.match ? 'valid' : 'invalid'}>
                <i className={`fas ${passwordCriteria.match ? 'fa-check-circle' : 'fa-times-circle'}`}></i>
                Les mots de passe correspondent
              </li>
            </ul>
          </div>
        )}

        <button
          type="submit"
          className="btn btn-primary"
          disabled={isUpdating || !passwordCriteria.minLength || !passwordCriteria.lowercase || !passwordCriteria.uppercase || !passwordCriteria.specialChar || !passwordCriteria.match}
        >
          {isUpdating ? 'Mise à jour...' : 'Changer le mot de passe'}
        </button>
      </form>
    </div>
  );
};

export default SecuritySection;



