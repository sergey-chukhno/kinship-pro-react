import React, { useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { PageType } from '../../types';
import './Sidebar.css';
import { mockOrganizationLists } from '../../data/mockData';

interface SidebarProps {
  currentPage: PageType;
  onPageChange: (page: PageType) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentPage, onPageChange }) => {
  const { state , setShowingPageType } = useAppContext();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const organisations = mockOrganizationLists;

  const navigationItems = [
    { id: 'dashboard' as PageType, label: 'Tableau de bord', icon: '/icons_logo/Icon=Tableau de bord.svg' },
    { id: 'members' as PageType, label: state.showingPageType === 'teacher' ? 'Classe' : 'Membres', icon: '/icons_logo/Icon=Membres.svg' },
    { id: 'events' as PageType, label: 'Événements', icon: '/icons_logo/Icon=Event.svg' },
    { id: 'projects' as PageType, label: 'Projets', icon: '/icons_logo/Icon=projet.svg' },
    { id: 'badges' as PageType, label: 'Badges', icon: '/icons_logo/Icon=Badges.svg' },
    ...(state.showingPageType !== 'teacher'
      ? [{ id: 'analytics' as PageType, label: 'Analytics', icon: '/icons_logo/Icon=Analytics.svg' }]
      : []),
    { id: 'network' as PageType, label: 'Mon réseau Kinship', icon: '/icons_logo/Icon=Reseau.svg' }
  ];


  const unreadNotifications = state.notifications.filter(n => !n.isRead).length;

  return (
    <aside className="sidebar" role="navigation" aria-label="Sidebar">
      <div className="sidebar-header">
        {state.showingPageType === "pro" && <img src="/icons_logo/Property 1=Logo Kinship Pro.svg" alt="Kinship Pro" className="sidebar-logo" />}
        {state.showingPageType === "edu" && <img src="/icons_logo/Property 1=Logo Kinship edu.svg" alt="Kinship edu" className="sidebar-logo" />}
        {state.showingPageType === "teacher" && <img src="/icons_logo/Property 1=Logo Kinship teacher.svg" alt="Kinship Teacher" className="sidebar-logo" />}
      </div>
      
      <nav className="side-nav">
        {navigationItems.map((item) => (
          <a
            key={item.id}
            href={`#${item.id}`}
            data-target={item.id}
            className={`side-link ${currentPage === item.id ? 'active' : ''}`}
            aria-current={currentPage === item.id ? 'page' : undefined}
            onClick={(e) => {
              e.preventDefault();
              onPageChange(item.id);
            }}
          >
            <img src={item.icon} alt={item.label} className="side-icon" />
            {item.label}
          </a>
        ))}
        
        <hr className="side-divider" aria-hidden="true" />
        
        <a
          href="#notifications"
          data-target="notifications"
          className={`side-link notifications ${currentPage === 'notifications' ? 'active' : ''}`}
          aria-current={currentPage === 'notifications' ? 'page' : undefined}
          onClick={(e) => {
            e.preventDefault();
            onPageChange('notifications');
          }}
        >
          <span className="icon-with-dot">
            <img src="/icons_logo/Icon=Notifications.svg" alt="Notifications" className="side-icon" />
            {unreadNotifications > 0 && <span className="notif-dot" aria-hidden="true"></span>}
          </span>
          Notifications
          {unreadNotifications > 0 && (
            <span className="notif-badge" aria-label={`${unreadNotifications} notifications non lues`}>
              {unreadNotifications}
            </span>
          )}
        </a>
      </nav>
      
      <div className="sidebar-footer">
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

        <div className={`user-profile dropdown ${isDropdownOpen ? 'open' : ''}`} id="adminDropdown">
          <img src={state.user.avatar} alt="Profile" className="avatar" />
          <div className="user-info">
            <div className="user-name">{state.user.name}</div>
            <div className="user-role">{state.user.role}</div>
          </div>
          <span 
            className="dropdown-icon"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          >
            <img src="/icons_logo/Icon=Chevron droit.svg" alt="Ouvrir" className="chevron-icon" />
          </span>
          <div className="dropdown-menu">
            <div className="menu-header">
              <img src={state.user.avatar} alt="Profile" className="avatar" />
              <div>
                <div style={{ fontWeight: 700 }}>{state.user.name}</div>
                <div style={{ fontSize: '.85rem', color: 'var(--text-light)' }}>{state.user.email}</div>
              </div>
            </div>
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
            <a href="#" className="menu-item" onClick={(e) => { e.preventDefault(); onPageChange('settings'); }}>
              <i className="fas fa-cog"></i> Paramètres
            </a>
            <a href="#" className="menu-item">
              <i className="fas fa-sign-out-alt"></i> Se déconnecter
            </a>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
