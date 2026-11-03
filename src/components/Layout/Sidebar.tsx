import React, { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Menu, Transition } from '@headlessui/react';
import { useAppContext } from '../../context/AppContext';
import { PageType } from '../../types';
import './Sidebar.css';
import AvatarImage from '../UI/AvatarImage';
import { translateRole } from '../../utils/roleTranslations';
import {
  ContextOrgType,
  getFinancedProjectsCount,
  jeFinanceLabel,
  resolveSwitcherContext,
} from '../../utils/contextUtils';
import { applySpaceTheme } from '../../utils/spaceTheme';
import { isQualiopiOrg } from '../../utils/qualiopiOrg';
import SelectProjectForBadgeModal from '../Modals/SelectProjectForBadgeModal';
import SelectPartnerModal from '../Modals/SelectPartnerModal';
import { canCreateFormation } from '../../utils/ofActivationStore';
import { openProjectAffiche } from '../../utils/projectSpaceStore';

interface SidebarProps {
  currentPage: PageType;
  onPageChange: (page: PageType) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentPage, onPageChange }) => {
  const { state, setShowingPageType, setSelectedProject } = useAppContext();
  const navigate = useNavigate();
  const location = useLocation();
  const [isSelectProjectForBadgeOpen, setIsSelectProjectForBadgeOpen] = useState(false);
  const [isSelectPartnerModalOpen, setIsSelectPartnerModalOpen] = useState(false);

  const getCurrentContext = useMemo(
    () =>
      resolveSwitcherContext({
        search: location.search,
        showingPageType: state.showingPageType,
        formationOrgFallbackId:
          state.user?.available_contexts?.formation_organizations?.[0]?.id,
      }),
    [
      location.search,
      state.showingPageType,
      state.user?.available_contexts?.formation_organizations,
    ]
  );

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

      // formation_organizations : si le BE l’expose un jour (question Patrick). Pas de mock of-demo.
      const ofFromApi = contexts.formation_organizations || [];
      ofFromApi.forEach((org: { id: number | string; name: string; role?: string }) => {
        orgs.push({
          id: org.id,
          name: org.name,
          type: 'formation' as const,
          role: org.role,
          isAdmin: true,
        });
      });

      // Add teacher dashboard if available
      if (contexts.teacher_dashboard) {
        orgs.push({
          id: 'teacher-dashboard',
          name: 'Tableau de bord enseignant',
          type: 'teacher',
          isAdmin: false
        });
      }
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

    setShowingPageType(newPageType);
    applySpaceTheme(newPageType, {
      formationBrand: isQualiopiOrg(state.user, newPageType),
    });

    // Navigate — include ctx so same-route company→company switches remount TB
    if (orgType === 'user') {
      onPageChange('projects');
      navigate('/projects');
    } else {
      onPageChange('dashboard');
      navigate(`/dashboard?ctx=${orgType}-${orgId}`, { replace: true });
    }

    console.log(`Switched to ${orgType} ${orgId}, pageType: ${newPageType}`);
  };

  // Dropdown under "Tableau de bord"
  const financedCount = getFinancedProjectsCount(state.user, state.showingPageType);
  const dashboardDropdownItems: Array<{ id: PageType; label: string; icon: string }> = [
    { id: 'members', label: state.showingPageType === 'teacher' ? 'Classes' : 'Membres', icon: '/icons_logo/Icon=Membres.svg' },
    { id: 'events', label: 'Événements', icon: '/icons_logo/Icon=Event.svg' },
    { id: 'projects', label: state.showingPageType === 'of' ? 'Formations' : 'Projets', icon: '/icons_logo/Icon=projet.svg' },
    ...(financedCount > 0
      ? [{ id: 'funded-projects' as PageType, label: jeFinanceLabel(financedCount), icon: '/icons_logo/Icon=projet.svg' }]
      : []),
    { id: 'badges', label: 'Preuves', icon: '/icons_logo/Icon=Badges.svg' },
    { id: 'network', label: 'Mon réseau Kinship', icon: '/icons_logo/Icon=Reseau.svg' },
  ];

  const isDashboardSectionActive =
    currentPage === 'dashboard' ||
    dashboardDropdownItems.some((item) => item.id === currentPage);
  const formationBrand = isQualiopiOrg(state.user, state.showingPageType);

  const unreadNotifications = 0; //state.notifications.filter(n => !n.isRead).length;

  const goDashboardItem = (item: { id: PageType }) => {
    if (item.id === 'funded-projects') {
      navigate('/projects?tab=je-finance');
      onPageChange('projects');
      return;
    }
    onPageChange(item.id);
    navigate(`/${item.id}`);
  };

  return (
    <aside className="sidebar" role="navigation" aria-label="Sidebar">
      <div className="sidebar-header">
        {formationBrand ? (
          <img
            src="/icons_logo/Property 1=Logo Kinship Formation1.svg"
            alt="Kinship Formation"
            className="sidebar-logo !w-[200px] !h-[60px]"
          />
        ) : (
          <>
            {state.showingPageType === 'pro' && (
              <img
                src="/icons_logo/Property 1=Logo Kinship Pro.svg"
                alt="Kinship Pro"
                className="sidebar-logo !w-[200px] !h-[60px]"
              />
            )}
            {state.showingPageType === 'edu' && (
              <img
                src="/icons_logo/Property 1=Logo Kinship edu.svg"
                alt="Kinship edu"
                className="sidebar-logo !w-[200px] !h-[60px]"
              />
            )}
            {state.showingPageType === 'teacher' && (
              <img
                src="/icons_logo/Property 1=Logo Kinship teacher.svg"
                alt="Kinship Teacher"
                className="sidebar-logo !w-[200px] !h-[60px]"
              />
            )}
            {state.showingPageType === 'of' && (
              <img
                src="/icons_logo/Property 1=Logo Kinship Formation1.svg"
                alt="Kinship Formations"
                className="sidebar-logo !w-[200px] !h-[60px]"
              />
            )}
          </>
        )}
      </div>

      <nav className="side-nav">
        {/* Tableau de bord + rubriques toujours visibles (Patrick point 2) */}
        <div className={`dashboard-nav-block ${isDashboardSectionActive ? 'active' : ''}`}>
          <a
            href="/dashboard"
            data-target="dashboard"
            className={`side-link dashboard-link ${currentPage === 'dashboard' ? 'active' : ''}`}
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
          <ul className="dashboard-nav-sub" aria-label="Rubriques du tableau de bord">
            {dashboardDropdownItems.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  className={`sidebar-nav-sub-item ${currentPage === item.id ? 'current' : ''}`}
                  onClick={() => goDashboardItem(item)}
                >
                  <img src={item.icon} alt="" className="side-icon" />
                  {item.label}
                </button>
              </li>
            ))}
          </ul>
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

        {/* Actions rapides (teacher, edu, pro) */}
        {state.showingPageType !== 'user' && state.showingPageType !== 'of' && (
          <div className="sidebar-quick-actions">
            <div className="sidebar-quick-actions-title">Actions rapides</div>
            <div className="sidebar-quick-actions-buttons">
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
                    {state.showingPageType !== 'pro' && (
                      <>
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
                      </>
                    )}
                    {canCreateFormation() ? (
                      <Menu.Item>
                        {({ active }) => (
                          <button
                            type="button"
                            className={`sidebar-quick-action-item ${active ? 'active' : ''}`}
                            onClick={() => {
                              navigate('/create?type=formation');
                              onPageChange('create');
                            }}
                          >
                            Formation
                          </button>
                        )}
                      </Menu.Item>
                    ) : (
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
                    )}
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
              {canCreateFormation() && (
                <button
                  type="button"
                  className={`side-link quick-action-btn ${currentPage === 'catalogue-formations' ? 'active' : ''}`}
                  onClick={() => {
                    onPageChange('catalogue-formations');
                    navigate('/catalogue-formations');
                  }}
                >
                  <img src="/icons_logo/Icon=projet.svg" alt="" className="side-icon" />
                  Catalogue de formations
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
                Attester une compétence
              </button>
              <button
                type="button"
                className="side-link quick-action-btn"
                onClick={() => setIsSelectPartnerModalOpen(true)}
              >
                <img src="/icons_logo/Icon=Reseau.svg" alt="" className="side-icon" />
                Ajouter un partenaire
              </button>
            </div>
          </div>
        )}

        {state.showingPageType === 'of' && (
          <div className="sidebar-quick-actions">
            <div className="sidebar-quick-actions-title">Actions rapides</div>
            <button
              type="button"
              className="side-link quick-action-btn"
              onClick={() => {
                onPageChange('catalogue-formations');
                navigate('/catalogue-formations');
              }}
            >
              <img src="/icons_logo/Icon=projet.svg" alt="" className="side-icon" />
              Catalogue de formations
            </button>
            <button
              type="button"
              className="side-link quick-action-btn"
              onClick={() => {
                onPageChange('create');
                navigate('/create?type=formation');
              }}
            >
              <img src="/icons_logo/Icon=projet.svg" alt="" className="side-icon" />
              Créer une formation
            </button>
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
                              <button
                                type="button"
                                className={`org-item ${active ? 'active' : ''} ${isSelected ? 'selected' : ''}`}
                                onClick={() => handleOrganizationSwitch(org.id, org.type)}
                              >
                                <span className="org-item-name">{org.name}</span>
                                <span className="org-item-meta">
                                  {isSelected && <span className="selected-indicator">●</span>}
                                  {org.isAdmin && <span className="admin-tag">Admin</span>}
                                </span>
                              </button>
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
