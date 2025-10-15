import React, { useState, useEffect } from 'react';
import './UserPermissions.css';

interface UserPermissionsProps {
  user?: any;
  onClose: () => void;
  onSave: (permissions: any) => void;
}

const UserPermissions: React.FC<UserPermissionsProps> = ({ user, onClose, onSave }) => {
  const [permissions, setPermissions] = useState({
    manageMembers: false,
    manageProjects: false,
    manageEvents: false,
    manageBadges: false,
    manageNetwork: false,
    manageNotifications: false,
    manageSettings: false,
    viewAnalytics: false
  });

  useEffect(() => {
    if (user && user.permissions) {
      setPermissions(user.permissions);
    }
  }, [user]);

  const handlePermissionChange = (permission: string, value: boolean) => {
    setPermissions(prev => ({
      ...prev,
      [permission]: value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(permissions);
  };

  const permissionGroups = [
    {
      title: 'Gestion des contenus',
      permissions: [
        { key: 'manageMembers', label: 'Gestion des membres', icon: 'fas fa-users' },
        { key: 'manageProjects', label: 'Gestion des projets', icon: 'fas fa-project-diagram' },
        { key: 'manageEvents', label: 'Gestion des événements', icon: 'fas fa-calendar-alt' },
        { key: 'manageBadges', label: 'Gestion des badges', icon: 'fas fa-award' }
      ]
    },
    {
      title: 'Administration',
      permissions: [
        { key: 'manageNetwork', label: 'Gestion du réseau', icon: 'fas fa-network-wired' },
        { key: 'manageNotifications', label: 'Gestion des notifications', icon: 'fas fa-bell' },
        { key: 'manageSettings', label: 'Gestion des paramètres', icon: 'fas fa-cog' },
        { key: 'viewAnalytics', label: 'Voir les analytics', icon: 'fas fa-chart-bar' }
      ]
    }
  ];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Permissions de {user?.firstName} {user?.lastName}</h2>
          <button className="modal-close" onClick={onClose}>
            <i className="fas fa-times"></i>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body">
          {permissionGroups.map((group, groupIndex) => (
            <div key={groupIndex} className="permission-group">
              <h3 className="group-title">{group.title}</h3>
              <div className="permissions-grid">
                {group.permissions.map((permission) => (
                  <div key={permission.key} className="permission-item">
                    <div className="permission-header">
                      <i className={permission.icon}></i>
                      <span>{permission.label}</span>
                    </div>
                    <div className="permission-toggle">
                      <label className="toggle-switch">
                        <input
                          type="checkbox"
                          checked={permissions[permission.key as keyof typeof permissions]}
                          onChange={(e) => handlePermissionChange(permission.key, e.target.checked)}
                        />
                        <span className="toggle-slider"></span>
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          <div className="permission-summary">
            <h3>Résumé des permissions</h3>
            <div className="summary-stats">
              <div className="stat-item">
                <span className="stat-label">Permissions accordées:</span>
                <span className="stat-value">
                  {Object.values(permissions).filter(Boolean).length} / {Object.keys(permissions).length}
                </span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Niveau d'accès:</span>
                <span className="stat-value">
                  {Object.values(permissions).filter(Boolean).length > 4 ? 'Administrateur' : 
                   Object.values(permissions).filter(Boolean).length > 2 ? 'Modérateur' : 'Utilisateur'}
                </span>
              </div>
            </div>
          </div>
        </form>

        <div className="modal-footer">
          <button type="button" className="btn btn-outline" onClick={onClose}>
            Annuler
          </button>
          <button type="submit" className="btn btn-primary" onClick={handleSubmit}>
            <i className="fas fa-save"></i>
            Sauvegarder les permissions
          </button>
        </div>
      </div>
    </div>
  );
};

export default UserPermissions;
