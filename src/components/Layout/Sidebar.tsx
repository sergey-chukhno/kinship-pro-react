import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../../context/AppContext';
import { PageType } from '../../types';
import './Sidebar.css';
import AvatarImage from '../UI/AvatarImage';
import { translateRole } from '../../utils/roleTranslations';

interface SidebarProps {
  currentPage: PageType;
  onPageChange: (page: PageType) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentPage, onPageChange }) => {
  const { state, setShowingPageType } = useAppContext();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Process organizations from available_contexts
  const organizations = React.useMemo(() => {
    const contexts = state.user.available_contexts;
    if (!contexts) return [];

    const orgs: Array<{
      id: number | string;
      name: string;
      type: 'school' | 'company' | 'teacher' | 'user';
      role?: string;
      isAdmin: boolean;
    }> = [];

    // Add personal dashboard if available (at the top)
    if (contexts.user_dashboard) {
      orgs.push({
        id: 'user-dashboard',
        name: 'Tableau de bord personnel',
        type: 'user',
        isAdmin: false
      });
    }

    // Add schools (only if admin or superadmin)
    if (contexts.schools) {
      contexts.schools.forEach(school => {
        if (school.role === 'superadmin' || school.role === 'admin') {
          orgs.push({
            id: school.id,
            name: school.name,
            type: 'school',
            role: school.role,
            isAdmin: true
          });
        }
      });
    }

    // Add companies (only if admin or superadmin)
    if (contexts.companies) {
      contexts.companies.forEach(company => {
        if (company.role === 'superadmin' || company.role === 'admin') {
          orgs.push({
            id: company.id,
            name: company.name,
            type: 'company',
            role: company.role,
            isAdmin: true
          });
        }
      });
    }

    // Add teacher dashboard if available
    if (contexts.teacher_dashboard) {
      orgs.push({
        id: 'teacher-dashboard',
        name: 'Tableau de bord Enseignant',
        type: 'teacher',
        isAdmin: false
      });
    }

    return orgs;
  }, [state.user.available_contexts]);

  // Handle organization switching
  const handleOrganizationSwitch = (orgId: number | string, orgType: 'school' | 'company' | 'teacher' | 'user') => {
    let newPageType: 'pro' | 'edu' | 'teacher' | 'user';

    switch (orgType) {
      case 'school':
        newPageType = 'edu';
        break;
      case 'company':
        newPageType = 'pro';
        break;
      case 'teacher':
        newPageType = 'teacher';
        break;
      case 'user':
        newPageType = 'user';
        break;
      default:
        newPageType = 'user';
    }

    // Update the showing page type
    setShowingPageType(newPageType);

    // Navigate to appropriate page
    if (orgType === 'user') {
      onPageChange('projects');
      navigate('/projects');
    } else {
      onPageChange('dashboard');
      navigate('/dashboard');
    }

    // Close dropdown
    setIsDropdownOpen(false);

    console.log(`Switched to ${orgType} ${orgId}, pageType: ${newPageType}`);
  };

  const navigationItems = [
    { id: 'dashboard' as PageType, label: 'Tableau de bord', icon: '/icons_logo/Icon=Tableau de bord.svg' },
    { id: 'members' as PageType, label: state.showingPageType === 'teacher' ? 'Classes' : 'Membres', icon: '/icons_logo/Icon=Membres.svg' },
    { id: 'events' as PageType, label: 'Événements', icon: '/icons_logo/Icon=Event.svg', disabled: true },
    { id: 'projects' as PageType, label: 'Projets', icon: '/icons_logo/Icon=projet.svg' },
    { id: 'badges' as PageType, label: 'Badges', icon: '/icons_logo/Icon=Badges.svg' },
    ...(state.showingPageType !== 'teacher'
      ? [{ id: 'analytics' as PageType, label: 'Statistiques et KPI', icon: '/icons_logo/Icon=Analytics.svg' }]
      : []),
    { id: 'network' as PageType, label: 'Mon réseau Kinship', icon: '/icons_logo/Icon=Reseau.svg' }
  ];


  const unreadNotifications = 0; //state.notifications.filter(n => !n.isRead).length;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDropdownOpen]);

  return (
    <aside className="sidebar" role="navigation" aria-label="Sidebar">
      <div className="sidebar-header">
        {state.showingPageType === "pro" && <img src="/icons_logo/Property 1=Logo Kinship Pro.svg" alt="Kinship Pro" className="sidebar-logo !w-[150px] !h-[40px]" />}
        {state.showingPageType === "edu" && <img src="/icons_logo/Property 1=Logo Kinship edu.svg" alt="Kinship edu" className="sidebar-logo !w-[150px] !h-[40px]" />}
        {state.showingPageType === "teacher" && <img src="/icons_logo/Property 1=Logo Kinship teacher.svg" alt="Kinship Teacher" className="sidebar-logo !w-[150px] !h-[40px]" />}
      </div>

      <nav className="side-nav">
        {navigationItems.map((item) => (
          item.disabled ? (
            <div key={item.id} className="side-link disabled" title="Disponible très prochainement">
              <img src={item.icon} alt={item.label} className="side-icon" />
              {item.label}
            </div>
          ) : (
            <a
              key={item.id}
              href={`/${item.id}`}
              data-target={item.id}
              className={`side-link ${currentPage === item.id ? 'active' : ''}`}
              aria-current={currentPage === item.id ? 'page' : undefined}
              onClick={(e) => {
                e.preventDefault();
                onPageChange(item.id);
                navigate(`/${item.id}`);
              }}
            >
              <img src={item.icon} alt={item.label} className="side-icon" />
              {item.label}
            </a>
          )
        ))}

        <hr className="side-divider" aria-hidden="true" />

        <button
          type="button"
          disabled={true}
          title="Disponible très prochainement"
          // href="/notifications"
          data-target="notifications"
          className={`side-link notifications ${currentPage === 'notifications' ? 'active' : ''} `}
          aria-current={currentPage === 'notifications' ? 'page' : undefined}
          onClick={(e) => {
            e.preventDefault();
            onPageChange('notifications');
            navigate('/notifications');
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
        </button>
      </nav>

      <div className="sidebar-footer">
        <div
          className={`user-profile dropdown ${isDropdownOpen ? 'open' : ''}`}
          id="adminDropdown"
          ref={dropdownRef}
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        >
          <AvatarImage src={state.user.avatar} alt="Profile" className="avatar" />
          <div className="user-info">
            <div className="user-name">{state.user.name}</div>
          </div>
          <span
            className="dropdown-icon"
          >
            <img src="/icons_logo/Icon=Chevron droit.svg" alt="Ouvrir" className="chevron-icon" />
          </span>
          <div className="dropdown-menu" onClick={(e) => e.stopPropagation()}>
            <div className="menu-header">
              <AvatarImage src={state.user.avatar} alt="Profile" className="avatar" />
              <div>
                <div style={{ fontWeight: 700 }}>{state.user.name}</div>
                <div className="dropdown-role" title={translateRole(state.user.role)}>{translateRole(state.user.role)}</div>
                <div style={{ fontSize: '.85rem', color: 'var(--text-light)' }}>{state.user.email}</div>
              </div>
            </div>
            {organizations.length > 0 && (
              <div className="org-section">
                <div className="org-title">Mes organisations</div>
                {organizations.map((org) => (
                  <div
                    key={`${org.type}-${org.id}`}
                    className="org-item"
                    onClick={() => handleOrganizationSwitch(org.id, org.type)}
                  >
                    <span>{org.name}</span>
                    {org.isAdmin && <span className="admin-tag">Admin</span>}
                  </div>
                ))}
              </div>
            )}
            <button type="button" className="menu-item" onClick={() => {
              onPageChange('settings');
              navigate('/settings');
            }}>
              <i className="fas fa-cog"></i> Paramètres
            </button>
            <button type="button" className="menu-item" onClick={() => {
              localStorage.removeItem('jwt_token');
              navigate('/login');
            }}>
              <i className="fas fa-sign-out-alt"></i> Se déconnecter
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
