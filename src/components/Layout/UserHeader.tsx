import React, { useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { PageType } from '../../types';
import './UserHeader.css';
import { mockOrganizationLists } from '../../data/mockData';

interface UserHeaderProps {
  currentPage: PageType;
  onPageChange: (page: PageType) => void;
}

const UserHeader: React.FC<UserHeaderProps> = ({ currentPage, onPageChange }) => {
  const { state, setShowingPageType } = useAppContext();
  const [open, setOpen] = useState(false);
  const user = state.user;

  const organisations = mockOrganizationLists;

  const handlePageChange = (page: PageType) => {
    onPageChange(page);
    setOpen(false);
  };

  return (
    <header className="user-header">
      <div className="user-header-left" onClick={() => onPageChange('dashboard')}>
        <img src="./icons_logo/Property 1=Logo Kinship user.svg" alt="Logo" className="user-logo" />
      </div>

      <div className="user-header-right">
        <div className="user-info" onClick={() => setOpen(!open)}>
          <img
            src={user.avatar || '/default-avatar.png'}
            alt={user.name}
            className="user-avatar"
          />
          <span className="user-name">{user.name}</span>
          <img
            src="/icons_logo/Icon=Chevron bas.svg"
            alt="▼"
            className={`dropdown-arrow ${open ? 'open' : ''}`}
          />
        </div>

        {open && (
          <div className="dropdown-menu">
            <button onClick={() => handlePageChange('projects')}>Mes projets</button>
            <button onClick={() => handlePageChange('network')}>Mon réseau</button>
            <button onClick={() => handlePageChange('badges')}>Mes badges</button>

            <div className="dropdown-divider" />

            <div className="org-section">
              <div className="org-title">Mes organisations</div>
              {organisations.map((org) => (
                <div
                  key={org.id}
                  className="org-item"
                  onClick={() => console.log(`Switch to organization ${org.name}`)}
                >
                  <span>{org.name}</span>
                  {org.isAdmin && <span className="admin-tag">Admin</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="kinship-selector">
          <select
            className="kinship-select"
            value={state.showingPageType}
            onChange={(e) => setShowingPageType(e.target.value as 'pro' | 'edu' | 'teacher' | 'user')}
          >
            <option value="pro">Kinship Pro</option>
            <option value="edu">Kinship Edu</option>
            <option value="teacher">Kinship Teacher</option>
            <option value="user">Kinship User</option>
          </select>
        </div>
      </div>
    </header>
  );
};

export default UserHeader;
