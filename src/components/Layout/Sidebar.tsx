import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, Transition } from '@headlessui/react';
import { useAppContext } from '../../context/AppContext';
import { PageType } from '../../types';
import './Sidebar.css';
import AvatarImage from '../UI/AvatarImage';
import { translateRole } from '../../utils/roleTranslations';
import SelectProjectForBadgeModal from '../Modals/SelectProjectForBadgeModal';

interface SidebarProps {
  currentPage: PageType;
  onPageChange: (page: PageType) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentPage, onPageChange }) => {
  const { state, setShowingPageType, setSelectedProject } = useAppContext();
  const navigate = useNavigate();
  const [isSelectProjectForBadgeOpen, setIsSelectProjectForBadgeOpen] = useState(false);

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

  // Dropdown under "Tableau de bord": five sections only (no dashboard link inside)
  const dashboardDropdownItems: Array<{ id: PageType; label: string; icon: string }> = [
    { id: 'members', label: state.showingPageType === 'teacher' ? 'Classes' : 'Membres', icon: '/icons_logo/Icon=Membres.svg' },
    { id: 'events', label: 'Événements', icon: '/icons_logo/Icon=Event.svg' },
    { id: 'projects', label: 'Projets', icon: '/icons_logo/Icon=projet.svg' },
    { id: 'badges', label: 'Badges', icon: '/icons_logo/Icon=Badges.svg' },
    { id: 'network', label: 'Mon réseau Kinship', icon: '/icons_logo/Icon=Reseau.svg' }
  ];

  const isDashboardSectionActive = currentPage === 'dashboard';

  const unreadNotifications = 0; //state.notifications.filter(n => !n.isRead).length;

  return (
    <aside className="sidebar" role="navigation" aria-label="Sidebar">
      <div className="sidebar-header">
        {state.showingPageType === "pro" && <img src="/icons_logo/Property 1=Logo Kinship Pro.svg" alt="Kinship Pro" className="sidebar-logo !w-[200px] !h-[60px]" />}
        {state.showingPageType === "edu" && <img src="/icons_logo/Property 1=Logo Kinship edu.svg" alt="Kinship edu" className="sidebar-logo !w-[200px] !h-[60px]" />}
        {state.showingPageType === "teacher" && <img src="/icons_logo/Property 1=Logo Kinship teacher.svg" alt="Kinship Teacher" className="sidebar-logo !w-[200px] !h-[60px]" />}
      </div>

      <nav className="side-nav">
        {/* Tableau de bord: link (navigates to /dashboard) + chevron (opens dropdown with five sections) */}
        <div className="dashboard-nav-row">
          <a
            href="/dashboard"
            data-target="dashboard"
            className={`side-link dashboard-link ${isDashboardSectionActive ? 'active' : ''}`}
            aria-current={currentPage === 'dashboard' ? 'page' : undefined}
            onClick={(e) => {
              e.preventDefault();
              onPageChange('dashboard');
              navigate('/dashboard');
            }}
          >
            <img src="/icons_logo/Icon=Tableau de bord.svg" alt="Tableau de bord" className="side-icon" />
            Tableau de bord
          </a>
          <Menu as="div" className="dashboard-nav-dropdown">
            {({ open }: { open: boolean }) => (
              <>
                <Menu.Button
                  className={`dashboard-chevron-btn ${open ? 'open' : ''}`}
                  aria-label="Ouvrir le menu des sections"
                  aria-haspopup="menu"
                  aria-expanded={open}
                  onClick={(e: React.MouseEvent) => e.stopPropagation()}
                >
                  <img src="/icons_logo/Icon=Chevron droit.svg" alt="" className="chevron-icon" />
                </Menu.Button>
                <Transition
                  enter="transition ease-out duration-100"
                  enterFrom="transform opacity-0 scale-95"
                  enterTo="transform opacity-100 scale-100"
                  leave="transition ease-in duration-75"
                  leaveFrom="transform opacity-100 scale-100"
                  leaveTo="transform opacity-0 scale-95"
                >
                  <Menu.Items className="sidebar-nav-dropdown-menu" anchor="bottom start">
                    {dashboardDropdownItems.map((item) => (
                      <Menu.Item key={item.id}>
                        {({ active }: { active: boolean }) => (
                          <button
                            type="button"
                            role="menuitem"
                            className={`sidebar-nav-dropdown-item ${active ? 'active' : ''} ${currentPage === item.id ? 'current' : ''}`}
                            onClick={() => {
                              onPageChange(item.id);
                              navigate(`/${item.id}`);
                            }}
                          >
                            <img src={item.icon} alt="" className="side-icon" />
                            {item.label}
                          </button>
                        )}
                      </Menu.Item>
                    ))}
                  </Menu.Items>
                </Transition>
              </>
            )}
          </Menu>
        </div>

        {/* Statistiques et KPI (edu/pro only) */}
        {state.showingPageType !== 'teacher' && (
          <a
            href="/analytics"
            data-target="analytics"
            className={`side-link ${currentPage === 'analytics' ? 'active' : ''}`}
            aria-current={currentPage === 'analytics' ? 'page' : undefined}
            onClick={(e) => {
              e.preventDefault();
              onPageChange('analytics');
              navigate('/analytics');
            }}
          >
            <img src="/icons_logo/Icon=Analytics.svg" alt="Statistiques et KPI" className="side-icon" />
            Statistiques et KPI
          </a>
        )}

        <hr className="side-divider" aria-hidden="true" />

        {/* Actions rapides (teacher, edu, pro only) */}
        {state.showingPageType !== 'user' && (
          <div className="sidebar-quick-actions">
            <div className="sidebar-quick-actions-title">Actions rapides</div>
            <div className="sidebar-quick-actions-buttons">
              {/* Créer un projet: dropdown for edu/teacher, single action for pro */}
              {(state.showingPageType === 'edu' || state.showingPageType === 'teacher') ? (
                <Menu as="div" className="quick-action-menu">
                  <Menu.Button className="side-link quick-action-btn">
                    <img src="/icons_logo/Icon=projet.svg" alt="" className="side-icon" />
                    Créer un projet
                  </Menu.Button>
                  <Transition
                    enter="transition ease-out duration-100"
                    enterFrom="transform opacity-0 scale-95"
                    enterTo="transform opacity-100 scale-100"
                    leave="transition ease-in duration-75"
                    leaveFrom="transform opacity-100 scale-100"
                    leaveTo="transform opacity-0 scale-95"
                  >
                    <Menu.Items className="sidebar-quick-actions-dropdown" anchor="bottom start">
                      <Menu.Item>
                        {({ active }) => (
                          <button
                            type="button"
                            className={`sidebar-quick-action-item ${active ? 'active' : ''}`}
                            onClick={() => {
                              onPageChange('projects');
                              navigate('/projects?open=create&variant=classic');
                            }}
                          >
                            Projet classique
                          </button>
                        )}
                      </Menu.Item>
                      <Menu.Item>
                        {({ active }) => (
                          <button
                            type="button"
                            className={`sidebar-quick-action-item ${active ? 'active' : ''}`}
                            onClick={() => {
                              onPageChange('projects');
                              navigate('/projects?open=create&variant=mlds');
                            }}
                          >
                            Projet MLDS Volet Persévérance Scolaire
                          </button>
                        )}
                      </Menu.Item>
                    </Menu.Items>
                  </Transition>
                </Menu>
              ) : (
                <button
                  type="button"
                  className="side-link quick-action-btn"
                  onClick={() => {
                    onPageChange('projects');
                    navigate('/projects?open=create');
                  }}
                >
                  <img src="/icons_logo/Icon=projet.svg" alt="" className="side-icon" />
                  Créer un projet
                </button>
              )}
              <button
                type="button"
                className="side-link quick-action-btn"
                onClick={() => {
                  onPageChange('events');
                  navigate('/events?open=create');
                }}
              >
                <img src="/icons_logo/Icon=Event.svg" alt="" className="side-icon" />
                Programmer un événement
              </button>
              <button
                type="button"
                className="side-link quick-action-btn"
                onClick={() => setIsSelectProjectForBadgeOpen(true)}
              >
                <img src="/icons_logo/Icon=Badges.svg" alt="" className="side-icon" />
                Attribuer un badge
              </button>
              <button
                type="button"
                className="side-link quick-action-btn"
                onClick={() => {
                  onPageChange('network');
                  navigate('/network?open=add-partner');
                }}
              >
                <img src="/icons_logo/Icon=Reseau.svg" alt="" className="side-icon" />
                Ajouter un partenaire
              </button>
            </div>
          </div>
        )}

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

      {isSelectProjectForBadgeOpen && (
        <SelectProjectForBadgeModal
          isOpen={isSelectProjectForBadgeOpen}
          onClose={() => setIsSelectProjectForBadgeOpen(false)}
          onSelectProject={(project) => {
            setSelectedProject(project);
            onPageChange('project-management');
            navigate('/project-management?open=assign-badge');
            setIsSelectProjectForBadgeOpen(false);
          }}
        />
      )}

      <div className="sidebar-footer">
        <Menu as="div" className="relative">
          {({ open }: { open: boolean }) => (
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
                            {({ active }: { active: boolean }) => (
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
                    {({ active }: { active: boolean }) => (
                      <button
                        type="button"
                        className={`menu-item ${active ? 'active' : ''}`}
                        onClick={() => {
                          onPageChange('personal-settings');
                        }}
                      >
                        <i className="fas fa-cog"></i>
                        <span>Paramètres personnels</span>
                      </button>
                    )}
                  </Menu.Item>
                  <Menu.Item>
                    {({ active }: { active: boolean }) => (
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
