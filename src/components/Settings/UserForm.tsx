import React, { useState, useEffect } from 'react';
import './UserForm.css';
import { DEFAULT_AVATAR_SRC } from '../UI/AvatarImage';

interface UserFormProps {
  user?: any;
  onClose: () => void;
  onSave: (userData: any) => void;
}

const UserForm: React.FC<UserFormProps> = ({ user, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    profession: '',
    roles: ['Membre'],
    skills: [] as string[],
    availability: [] as string[],
    avatar: DEFAULT_AVATAR_SRC,
    isTrusted: false,
    organization: '',
    badges: [] as any[]
  });

  useEffect(() => {
    if (user) {
      setFormData({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        profession: user.profession || '',
        roles: user.roles || ['Membre'],
        skills: user.skills || [],
        availability: user.availability || [],
        avatar: user.avatar || DEFAULT_AVATAR_SRC,
        isTrusted: user.isTrusted || false,
        organization: user.organization || '',
        badges: user.badges || []
      });
    }
  }, [user]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.firstName && formData.lastName && formData.email) {
      onSave(formData);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{user ? 'Modifier l\'utilisateur' : 'Ajouter un utilisateur'}</h2>
          <button className="modal-close" onClick={onClose}>
            <i className="fas fa-times"></i>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body">
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
                placeholder="Prénom"
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
                placeholder="Nom"
              />
            </div>

            <div className="form-group">
              <label htmlFor="email">Email *</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                required
                className="form-input"
                placeholder="email@exemple.com"
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
                placeholder="Profession"
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
                placeholder="Organisation"
              />
            </div>

            <div className="form-group">
              <label htmlFor="avatar">Avatar URL</label>
              <input
                type="url"
                id="avatar"
                name="avatar"
                value={formData.avatar}
                onChange={handleInputChange}
                className="form-input"
                placeholder="URL de l'avatar"
              />
            </div>
          </div>

          <div className="form-group">
            <label>
              <input
                type="checkbox"
                name="isTrusted"
                checked={formData.isTrusted}
                onChange={handleInputChange}
              />
              Utilisateur de confiance
            </label>
          </div>
        </form>

        <div className="modal-footer">
          <button type="button" className="btn btn-outline" onClick={onClose}>
            Annuler
          </button>
          <button type="submit" className="btn btn-primary" onClick={handleSubmit}>
            <i className="fas fa-save"></i>
            {user ? 'Modifier' : 'Créer'} l'utilisateur
          </button>
        </div>
      </div>
    </div>
  );
};

export default UserForm;
