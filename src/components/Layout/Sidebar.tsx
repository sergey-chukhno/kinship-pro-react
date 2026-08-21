import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, Transition } from '@headlessui/react';
import { useAppContext } from '../../context/AppContext';
import { PageType } from '../../types';
import './Sidebar.css';
import AvatarImage from '../UI/AvatarImage';
import { translateRole } from '../../utils/roleTranslations';
import { getFinancedProjectsCount, jeFinanceLabel } from '../../utils/contextUtils';
import SelectProjectForBadgeModal from '../Modals/SelectProjectForBadgeModal';
import SelectPartnerModal from '../Modals/SelectPartnerModal';
import { MOCK_OF_ORG } from '../../data/mockFormations';
import { openProjectAffiche } from '../../utils/projectSpaceStore';

type ContextOrgType = 'school' | 'company' | 'teacher' | 'user' | 'formation';

interface SidebarProps {
  currentPage: PageType;
  onPageChange: (page: PageType) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentPage, onPageChange }) => {
  const { state, setShowingPageType, setSelectedProject } = useAppContext();
  const navigate = useNavigate();
  const [isSelectProjectForBadgeOpen, setIsSelectProjectForBadgeOpen] = useState(false);
  const [isSelectPartnerModalOpen, setIsSelectPartnerModalOpen] = useState(false);

  // Get currently selected context
  const getCurrentContext = useMemo(() => {
    const savedContextId = localStorage.getItem('selectedContextId');
    const savedContextType = localStorage.getItem('selectedContextType') as ContextOrgType | null;
    
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
    } else if (state.showingPageType === 'of') {
      return { id: MOCK_OF_ORG.id, type: 'formation' as const };
    }
    
    return null;
  }, [state.showingPageType]);

  // Process organizations from available_contexts
  const organizations = useMemo(() => {
    const contexts = state.user.available_contexts;

    const orgs: Array<{
      id: number | string;
      name: string;
      type: ContextOrgType;
      role?: string;
      isAdmin: boolean;
    }> = [];

    if (contexts) {
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

      // Add formation organizations (OF) — from API or demo prototype entry
      if (contexts.formation_organizations && contexts.formation_organizations.length > 0) {
        contexts.formation_organizations.forEach(org => {
          if (org.role === 'superadmin' || org.role === 'admin') {
            orgs.push({
              id: org.id,
              name: org.name,
              type: 'formation',
              role: org.role,
              isAdmin: true
            });
          }
        });
      } else {
        orgs.push({
          id: MOCK_OF_ORG.id,
          name: 'Organisme de formation',
          type: 'formation',
          isAdmin: true
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
    } else {
      orgs.push({
        id: MOCK_OF_ORG.id,
        name: 'Organisme de formation',
        type: 'formation',
        isAdmin: true
      });
    }

    return orgs;
  }, [state.user.available_contexts]);

  // Handle organization switching
  const handleOrganizationSwitch = (orgId: number | string, orgType: ContextOrgType) => {
    let newPageType: 'pro' | 'edu' | 'teacher' | 'user' | 'of';

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
      case 'formation':
        newPageType = 'of';
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

  // Dropdown under "Tableau de bord": sections (Formations for edu/pro)
  const financedCount = getFinancedProjectsCount(state.user, state.showingPageType);
  const dashboardDropdownItems: Array<{ id: PageType; label: string; icon: string }> = [
    { id: 'members', label: state.showingPageType === 'teacher' ? 'Classes' : 'Membres', icon: '/icons_logo/Icon=Membres.svg' },
    { id: 'events', label: 'Événements', icon: '/icons_logo/Icon=Event.svg' },
    { id: 'projects', label: state.showingPageType === 'of' ? 'Formations' : 'Projets', icon: '/icons_logo/Icon=projet.svg' },
    ...(financedCount > 0
      ? [{ id: 'funded-projects' as PageType, label: jeFinanceLabel(financedCount), icon: '/icons_logo/Icon=projet.svg' }]
      : []),
    ...((state.showingPageType === 'edu' || state.showingPageType === 'pro')
      ? [{ id: 'formations' as PageType, label: 'Formations', icon: '/icons_logo/Icon=projet.svg' }]
      : []),
    { id: 'badges', label: 'Badges', icon: '/icons_logo/Icon=Badges.svg' },
    { id: 'network', label: 'Mon réseau Kinship', icon: '/icons_logo/Icon=Reseau.svg' },
  ];

  const isDashboardSectionActive = currentPage === 'dashboard';

  const unreadNotifications = 0; //state.notifications.filter(n => !n.isRead).length;

  return (
    <aside className="sidebar" role="navigation" aria-label="Sidebar">
      <div className="sidebar-header">
        {state.showingPageType === "pro" && <img src="/icons_logo/Property 1=Logo Kinship Pro.svg" alt="Kinship Pro" className="sidebar-logo !w-[200px] !h-[60px]" />}
        {state.showingPageType === "edu" && <img src="/icons_logo/Property 1=Logo Kinship edu.svg" alt="Kinship edu" className="sidebar-logo !w-[200px] !h-[60px]" />}
        {state.showingPageType === "teacher" && <img src="/icons_logo/Property 1=Logo Kinship teacher.svg" alt="Kinship Teacher" className="sidebar-logo !w-[200px] !h-[60px]" />}
        {state.showingPageType === "of" && <img src="/icons_logo/Property 1=Logo Kinship Formation1.svg" alt="Kinship Formations" className="sidebar-logo !w-[200px] !h-[60px]" />}
      </div>

      <nav className="side-nav">
        {/* Tableau de bord: link (navigates to /dashboard) + chevron (opens dropdown with five sections) */}
        <div className={`dashboard-nav-row ${isDashboardSectionActive ? 'active' : ''}`}>
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
                              if (item.id === 'funded-projects') {
                                navigate('/projects?tab=je-finance');
                                onPageChange('projects');
                                return;
                              }
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
        {state.showingPageType !== 'teacher' && state.showingPageType !== 'of' && (
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

        {/* Actions rapides (teacher, edu, pro, of only) */}
        {state.showingPageType !== 'user' && (
          <div className="sidebar-quick-actions">
            <div className="sidebar-quick-actions-title">Actions rapides</div>
            <div className="sidebar-quick-actions-buttons">
              {state.showingPageType === 'of' ? (
                <button
                  type="button"
                  className="side-link quick-action-btn"
                  onClick={() => {
                    onPageChange('dashboard');
                    navigate('/dashboard?open=create');
                  }}
                >
                  <img src="/icons_logo/Icon=projet.svg" alt="" className="side-icon" />
                  Créer une formation
                </button>
              ) : (
                <Menu as="div" className="quick-action-menu">
                  <Menu.Button className={`side-link quick-action-btn ${currentPage === 'create' ? 'active' : ''}`}>
                    <img src="/icons_logo/Icon=projet.svg" alt="" className="side-icon" />
                    Créer
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
                              navigate('/create?type=project');
                              onPageChange('create');
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
                      <Menu.Item>
                        {({ active }) => (
                          <button
                            type="button"
                            className={`sidebar-quick-action-item ${active ? 'active' : ''}`}
                            onClick={() => {
                              onPageChange('projects');
                              navigate('/projects?open=create&variant=mlds-remediation');
                            }}
                          >
                            Projet MLDS Volet Remédiation
                          </button>
                        )}
                      </Menu.Item>
                      <Menu.Item disabled>
                        {({ active }) => (
                          <button
                            type="button"
                            disabled
                            className={`sidebar-quick-action-item is-disabled ${active ? 'active' : ''}`}
                          >
                            Formation
                            <span className="sidebar-quick-action-soon">Bientôt</span>
                          </button>
                        )}
                      </Menu.Item>
                      <Menu.Item disabled>
                        {({ active }) => (
                          <button
                            type="button"
                            disabled
                            className={`sidebar-quick-action-item is-disabled ${active ? 'active' : ''}`}
                          >
                            Stage
                            <span className="sidebar-quick-action-soon">Bientôt</span>
                          </button>
                        )}
                      </Menu.Item>
                    </Menu.Items>
                  </Transition>
                </Menu>
              )}
              {state.showingPageType !== 'of' && (
                <>
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
              {(state.showingPageType === 'edu' || state.showingPageType === 'pro') && (
                <button
                  type="button"
                  className="side-link quick-action-btn"
                  onClick={() => {
                    onPageChange('formations');
                    navigate('/formations?open=create');
                  }}
                >
                  <img src="/icons_logo/Icon=projet.svg" alt="" className="side-icon" />
                  Créer une formation
                </button>
              )}
              {(state.showingPageType === 'edu' || state.showingPageType === 'pro') && (
                <button
                  type="button"
                  className="side-link quick-action-btn"
                  onClick={() => {
                    onPageChange('members');
                    navigate('/members?open=create');
                  }}
                >
                  <img src="/icons_logo/Icon=Membres.svg" alt="" className="side-icon" />
                  Ajouter un membre
                </button>
              )}
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
                onClick={() => setIsSelectPartnerModalOpen(true)}
              >
                <img src="/icons_logo/Icon=Reseau.svg" alt="" className="side-icon" />
                Ajouter un partenaire
              </button>
                </>
              )}
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
            openProjectAffiche(project.id);
            onPageChange('project-affiche');
            navigate('/project-affiche?open=attest');
            setIsSelectProjectForBadgeOpen(false);
          }}
        />
      )}

      {isSelectPartnerModalOpen && (
        <SelectPartnerModal
          isOpen={isSelectPartnerModalOpen}
          onClose={() => setIsSelectPartnerModalOpen(false)}
          onSelectPartner={(org) => {
            setIsSelectPartnerModalOpen(false);
            onPageChange('network');
            const params = new URLSearchParams();
            const open = state.showingPageType === 'teacher' ? 'teacher-partnership' : 'partnership-modal';
            params.set('open', open);
            params.set('partner_id', org.id);
            params.set('partner_type', org.type === 'schools' ? 'school' : 'company');
            if (org.name) params.set('partner_name', org.name);
            navigate(`/network?${params.toString()}`);
          }}
          onViewAllResults={(searchTerm) => {
            setIsSelectPartnerModalOpen(false);
            onPageChange('network');
            const params = new URLSearchParams();
            params.set('open', 'add-partner');
            if (searchTerm) params.set('q', searchTerm);
            navigate(`/network?${params.toString()}`);
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
