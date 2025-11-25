import React, { useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { mockMembers } from '../../data/mockData';
import UserForm from './UserForm';
import UserPermissions from './UserPermissions';
import './UserManagement.css';
import AvatarImage from '../UI/AvatarImage';

const UserManagement: React.FC = () => {
  const { addMember, updateMember, deleteMember } = useAppContext();
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [isUserFormOpen, setIsUserFormOpen] = useState(false);
  const [isPermissionsOpen, setIsPermissionsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Use mock data for now
  const users = mockMembers;

  const filteredUsers = users.filter(user => 
    user.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreateUser = () => {
    setSelectedUser(null);
    setIsUserFormOpen(true);
  };

  const handleEditUser = (user: any) => {
    setSelectedUser(user);
    setIsUserFormOpen(true);
  };

  const handleDeleteUser = (userId: string) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cet utilisateur ?')) {
      deleteMember(userId);
    }
  };

  const handleManagePermissions = (user: any) => {
    setSelectedUser(user);
    setIsPermissionsOpen(true);
  };

  const handleSaveUser = (userData: any) => {
    if (selectedUser) {
      updateMember(selectedUser.id, userData);
    } else {
      const newUser = {
        ...userData,
        id: Date.now().toString()
      };
      addMember(newUser);
    }
    setIsUserFormOpen(false);
    setSelectedUser(null);
  };

  return (
    <div className="user-management">
      <div className="section-header">
        <h2>Gestion des utilisateurs</h2>
        <button className="btn btn-primary" onClick={handleCreateUser}>
          <i className="fas fa-plus"></i> Ajouter un utilisateur
        </button>
      </div>

      <div className="users-form">
        <div className="form-section">
          <h3>Informations utilisateur</h3>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="userFirstName">Prénom</label>
              <input type="text" id="userFirstName" className="form-input" placeholder="Prénom de l'utilisateur" />
            </div>
            <div className="form-group">
              <label htmlFor="userLastName">Nom</label>
              <input type="text" id="userLastName" className="form-input" placeholder="Nom de l'utilisateur" />
            </div>
          </div>
          <div className="form-group">
            <label htmlFor="userEmail">Email</label>
            <input type="email" id="userEmail" className="form-input" placeholder="email@exemple.com" />
          </div>
        </div>

        <div className="form-section">
          <h3>Permissions</h3>
          <div className="permissions-grid">
            <div className="permission-item">
              <div className="permission-header">
                <i className="fas fa-users"></i>
                <span>Gestion des membres</span>
              </div>
              <div className="permission-toggle">
                <label className="toggle-switch">
                  <input type="checkbox" />
                  <span className="toggle-slider"></span>
                </label>
              </div>
            </div>
            <div className="permission-item">
              <div className="permission-header">
                <i className="fas fa-project-diagram"></i>
                <span>Gestion des projets</span>
              </div>
              <div className="permission-toggle">
                <label className="toggle-switch">
                  <input type="checkbox" />
                  <span className="toggle-slider"></span>
                </label>
              </div>
            </div>
            <div className="permission-item">
              <div className="permission-header">
                <i className="fas fa-calendar-alt"></i>
                <span>Gestion des événements</span>
              </div>
              <div className="permission-toggle">
                <label className="toggle-switch">
                  <input type="checkbox" />
                  <span className="toggle-slider"></span>
                </label>
              </div>
            </div>
            <div className="permission-item">
              <div className="permission-header">
                <i className="fas fa-award"></i>
                <span>Gestion des badges</span>
              </div>
              <div className="permission-toggle">
                <label className="toggle-switch">
                  <input type="checkbox" />
                  <span className="toggle-slider"></span>
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="users-list">
        <div className="list-header">
          <h3>Utilisateurs existants</h3>
          <div className="search-box">
            <i className="fas fa-search"></i>
            <input
              type="text"
              placeholder="Rechercher un utilisateur..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        
        <div className="users-table">
          <div className="table-header">
            <div className="table-cell">Nom</div>
            <div className="table-cell">Email</div>
            <div className="table-cell">Rôle</div>
            <div className="table-cell">Statut</div>
            <div className="table-cell">Actions</div>
          </div>
          
          {filteredUsers.map((user) => (
            <div key={user.id} className="table-row">
              <div className="table-cell">
                <div className="user-info">
                  <AvatarImage src={user.avatar} alt={user.firstName} className="user-avatar" />
                  <span>{user.firstName} {user.lastName}</span>
                </div>
              </div>
              <div className="table-cell">{user.email}</div>
              <div className="table-cell">
                <span className="role-badge">{user.roles[0]}</span>
              </div>
              <div className="table-cell">
                <span className={`status-badge ${user.isTrusted ? 'active' : 'inactive'}`}>
                  {user.isTrusted ? 'Actif' : 'Inactif'}
                </span>
              </div>
              <div className="table-cell">
                <div className="action-buttons">
                  <button 
                    className="btn-icon" 
                    title="Modifier"
                    onClick={() => handleEditUser(user)}
                  >
                    <i className="fas fa-edit"></i>
                  </button>
                  <button 
                    className="btn-icon" 
                    title="Permissions"
                    onClick={() => handleManagePermissions(user)}
                  >
                    <i className="fas fa-key"></i>
                  </button>
                  <button 
                    className="btn-icon danger" 
                    title="Supprimer"
                    onClick={() => handleDeleteUser(user.id)}
                  >
                    <i className="fas fa-trash"></i>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* User Form Modal */}
      {isUserFormOpen && (
        <UserForm
          user={selectedUser}
          onClose={() => {
            setIsUserFormOpen(false);
            setSelectedUser(null);
          }}
          onSave={handleSaveUser}
        />
      )}

      {/* Permissions Modal */}
      {isPermissionsOpen && (
        <UserPermissions
          user={selectedUser}
          onClose={() => {
            setIsPermissionsOpen(false);
            setSelectedUser(null);
          }}
          onSave={(permissions) => {
            // TODO: Implement permission saving
            console.log('Save permissions:', permissions);
            setIsPermissionsOpen(false);
            setSelectedUser(null);
          }}
        />
      )}
    </div>
  );
};

export default UserManagement;
