import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, Transition } from '@headlessui/react';
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
  const navigate = useNavigate();

  // Get currently selected context
  const getCurrentContext = useMemo(() => {
    const savedContextId = localStorage.getItem('selectedContextId');
    const savedContextType = localStorage.getItem('selectedContextType') as 'school' | 'company' | 'teacher' | 'user' | null;
    
    if (savedContextId && savedContextType) {
      return {
        id: savedContextId,
        type: savedContextType
      };
    }
    
    // Fallback: determine from showingPageType
    if (state.showingPageType === 'teacher') {
      return { id: 'teacher-dashboard', type: 'teacher' as const };
    } else if (state.showingPageType === 'user') {
      return { id: 'user-dashboard', type: 'user' as const };
    }
    
    return null;
  }, [state.showingPageType]);

  // Process organizations from available_contexts
  const organizations = useMemo(() => {
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
        name: 'Tableau de bord enseignant',
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

    // Sauvegarder le contexte choisi dans localStorage
    localStorage.setItem('selectedPageType', newPageType);
    localStorage.setItem('selectedContextId', orgId.toString());
    localStorage.setItem('selectedContextType', orgType);

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

  return (
    <aside className="sidebar" role="navigation" aria-label="Sidebar">
      <div className="sidebar-header">
        {state.showingPageType === "pro" && <img src="/icons_logo/Property 1=Logo Kinship Pro.svg" alt="Kinship Pro" className="sidebar-logo !w-[200px] !h-[60px]" />}
        {state.showingPageType === "edu" && <img src="/icons_logo/Property 1=Logo Kinship edu.svg" alt="Kinship edu" className="sidebar-logo !w-[200px] !h-[60px]" />}
        {state.showingPageType === "teacher" && <img src="/icons_logo/Property 1=Logo Kinship teacher.svg" alt="Kinship Teacher" className="sidebar-logo !w-[200px] !h-[60px]" />}
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
        <Menu as="div" className="relative">
          {({ open }) => (
            <>
              <Menu.Button className={`user-profile dropdown ${open ? 'open' : ''}`}>
                <AvatarImage src={state.user.avatar} alt="Profile" className="avatar" />
                <div className="user-info">
                  <div className="user-name">{state.user.name}</div>
                </div>
                <span className="dropdown-icon">
                  <img src="/icons_logo/Icon=Chevron droit.svg" alt="Ouvrir" className="chevron-icon" />
                </span>
              </Menu.Button>

              <Transition
                enter="transition ease-out duration-100"
                enterFrom="transform opacity-0 scale-95"
                enterTo="transform opacity-100 scale-100"
                leave="transition ease-in duration-75"
                leaveFrom="transform opacity-100 scale-100"
                leaveTo="transform opacity-0 scale-95"
              >
                <Menu.Items className="dropdown-menu" anchor="left end">
                  <div className="menu-header">
                    <AvatarImage src={state.user.avatar} alt="Profile" className="avatar" />
                    <div className="menu-header-content">
                      <div className="menu-header-name">{state.user.name}</div>
                      <div className="dropdown-role" title={translateRole(state.user.role)}>{translateRole(state.user.role)}</div>
                      <div className="menu-header-email" title={state.user.email}>
                        <i className="fas fa-envelope email-icon"></i>
                        <span className="email-text">{state.user.email}</span>
                      </div>
                    </div>
                  </div>
                  {organizations.length > 0 && (
                    <div className="org-section">
                      <div className="org-title">Changer d'organisation</div>
                      {organizations.map((org) => {
                        const isSelected = getCurrentContext && 
                          getCurrentContext.id.toString() === org.id.toString() && 
                          getCurrentContext.type === org.type;
                        return (
                          <Menu.Item key={`${org.type}-${org.id}`}>
                            {({ active }) => (
                              <div
                                className={`org-item ${active ? 'active' : ''} ${isSelected ? 'selected' : ''}`}
                                onClick={() => handleOrganizationSwitch(org.id, org.type)}
                              >
                                <span>{org.name}</span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  {isSelected && <span className="selected-indicator">●</span>}
                                  {org.isAdmin && <span className="admin-tag">Admin</span>}
                                </div>
                              </div>
                            )}
                          </Menu.Item>
                        );
                      })}
                    </div>
                  )}
                  <Menu.Item>
                    {({ active }) => (
                      <button
                        type="button"
                        className={`menu-item logout-item ${active ? 'active' : ''}`}
                        onClick={() => {
                          localStorage.removeItem('jwt_token');
                          localStorage.removeItem('selectedPageType');
                          localStorage.removeItem('selectedContextId');
                          localStorage.removeItem('selectedContextType');
                          navigate('/login');
                        }}
                      >
                        <i className="fas fa-sign-out-alt logout-icon"></i> Se déconnecter
                      </button>
                    )}
                  </Menu.Item>
                </Menu.Items>
              </Transition>
            </>
          )}
        </Menu>
      </div>
    </aside>
  );
};

export default Sidebar;
