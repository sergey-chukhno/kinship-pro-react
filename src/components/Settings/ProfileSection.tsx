import React, { useState, useRef } from 'react';
import { useAppContext } from '../../context/AppContext';
import { updateUserProfile, uploadAvatar, deleteAvatar } from '../../api/UserDashBoard/Profile';
import { updateUserEmail } from '../../api/UserDashBoard/Profile';
import { useToast } from '../../hooks/useToast';
import AvatarImage from '../UI/AvatarImage';
import './ProfileSection.css';

const ProfileSection: React.FC = () => {
  const { state, setUser } = useAppContext();
  const { showSuccess, showError } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Parse name from user.name (format: "First Last") or use empty strings
  const parseName = (name: string) => {
    if (!name) return { first: '', last: '' };
    const parts = name.trim().split(' ');
    if (parts.length === 1) return { first: parts[0], last: '' };
    const last = parts.pop() || '';
    const first = parts.join(' ');
    return { first, last };
  };

  const { first: initialFirst, last: initialLast } = parseName(state.user.name || '');
  const [firstName, setFirstName] = useState(initialFirst);
  const [lastName, setLastName] = useState(initialLast);
  const [email, setEmail] = useState(state.user.email || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [isUpdatingEmail, setIsUpdatingEmail] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      showError('Veuillez sélectionner un fichier image');
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      showError('L\'image doit faire moins de 5 Mo');
      return;
    }

    setIsUploadingAvatar(true);
    try {
      const response = await uploadAvatar(file);
      if (response.data?.avatar_url) {
        setUser({ ...state.user, avatar: response.data.avatar_url });
        showSuccess('Photo de profil mise à jour avec succès');
      } else {
        showSuccess('Photo de profil mise à jour avec succès');
        // Refresh user data to get new avatar URL
        // The avatar URL should be available in the user context
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.response?.data?.error || 'Erreur lors de la mise à jour de la photo';
      showError(errorMessage);
    } finally {
      setIsUploadingAvatar(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDeleteAvatar = async () => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer votre photo de profil ?')) {
      return;
    }

    try {
      await deleteAvatar();
      setUser({ ...state.user, avatar: null });
      showSuccess('Photo de profil supprimée avec succès');
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.response?.data?.error || 'Erreur lors de la suppression de la photo';
      showError(errorMessage);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdatingProfile(true);

    try {
      const response = await updateUserProfile({
        firstName,
        lastName,
        email: state.user.email, // Don't update email here, use separate form
        take_trainee: state.user.take_trainee || false,
        propose_workshop: state.user.propose_workshop || false,
        job: state.user.job || '',
        show_my_skills: state.user.show_my_skills || false,
      });

      if (response.data) {
        // Update user name in context
        const fullName = [firstName, lastName].filter(Boolean).join(' ').trim() || state.user.name;
        setUser({ ...state.user, name: fullName });
        showSuccess('Profil mis à jour avec succès');
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.details?.[0] || error.response?.data?.error || 'Erreur lors de la mise à jour du profil';
      showError(errorMessage);
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handleUpdateEmail = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentPassword) {
      showError('Veuillez entrer votre mot de passe actuel');
      return;
    }

    if (!email || email === state.user.email) {
      showError('Veuillez entrer une nouvelle adresse email');
      return;
    }

    setIsUpdatingEmail(true);

    try {
      const response = await updateUserEmail(email, currentPassword);
      if (response.data) {
        setUser({ ...state.user, email });
        setCurrentPassword('');
        showSuccess('Adresse email mise à jour avec succès');
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.response?.data?.error || 'Erreur lors de la mise à jour de l\'email';
      showError(errorMessage);
    } finally {
      setIsUpdatingEmail(false);
    }
  };

  return (
    <div className="profile-section">
      <div className="profile-avatar-section">
        <h3>Photo de profil</h3>
        <div className="avatar-container">
          <div className="avatar-wrapper" onClick={handleAvatarClick}>
            <AvatarImage 
              src={state.user.avatar} 
              alt="Avatar" 
              className="profile-avatar"
            />
            <div className="avatar-overlay">
              <i className="fas fa-camera"></i>
              <span>Changer la photo</span>
            </div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleAvatarChange}
            style={{ display: 'none' }}
          />
          {state.user.avatar && (
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={handleDeleteAvatar}
              disabled={isUploadingAvatar}
            >
              <i className="fas fa-trash"></i> Supprimer
            </button>
          )}
        </div>
        {isUploadingAvatar && <p className="loading-text">Upload en cours...</p>}
      </div>

      <form onSubmit={handleUpdateProfile} className="profile-form">
        <h3>Informations personnelles</h3>
        <div className="form-group">
          <label htmlFor="firstName">Prénom</label>
          <input
            type="text"
            id="firstName"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            required
            className="form-input"
          />
        </div>

        <div className="form-group">
          <label htmlFor="lastName">Nom</label>
          <input
            type="text"
            id="lastName"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            required
            className="form-input"
          />
        </div>

        <button
          type="submit"
          className="btn btn-primary"
          disabled={isUpdatingProfile}
        >
          {isUpdatingProfile ? 'Mise à jour...' : 'Enregistrer les modifications'}
        </button>
      </form>

      <form onSubmit={handleUpdateEmail} className="profile-form email-form">
        <h3>Adresse email</h3>
        <div className="form-group">
          <label htmlFor="email">Nouvelle adresse email</label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="form-input"
          />
        </div>

        <div className="form-group">
          <label htmlFor="currentPassword">Mot de passe actuel</label>
          <input
            type="password"
            id="currentPassword"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
            placeholder="Requis pour changer l'email"
            className="form-input"
          />
        </div>

        <button
          type="submit"
          className="btn btn-primary"
          disabled={isUpdatingEmail}
        >
          {isUpdatingEmail ? 'Mise à jour...' : 'Changer l\'adresse email'}
        </button>
      </form>
    </div>
  );
};

export default ProfileSection;

