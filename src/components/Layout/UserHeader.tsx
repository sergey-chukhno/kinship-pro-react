import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, Transition } from '@headlessui/react';
import { useAppContext } from '../../context/AppContext';
import { PageType } from '../../types';
import './UserHeader.css';
import AvatarImage from '../UI/AvatarImage';
import { translateRole } from '../../utils/roleTranslations';

interface UserHeaderProps {
  currentPage: PageType;
  onPageChange: (page: PageType) => void;
}

const UserHeader: React.FC<UserHeaderProps> = ({ currentPage, onPageChange }) => {
  const { state, setShowingPageType } = useAppContext();
  const user = state.user;
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
        name: 'Tableau de bord Enseignant',
        type: 'teacher',
        isAdmin: false
      });
    }

    return orgs;
  }, [state.user.available_contexts]);

  const handlePageChange = (page: PageType) => {
    onPageChange(page);
    navigate(`/${page}`);
  };

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
      onPageChange('dashboard');
      navigate('/dashboard');
    } else {
      onPageChange('dashboard');
      navigate('/dashboard');
    }

    console.log(`Switched to ${orgType} ${orgId}, pageType: ${newPageType}`);
  };

  const handleLogout = () => {
    localStorage.removeItem('jwt_token');
    localStorage.removeItem('selectedPageType');
    localStorage.removeItem('selectedContextId');
    localStorage.removeItem('selectedContextType');
    navigate('/login');
  };


  return (
    <header className="user-header">
      <div className="user-header-left" onClick={() => {
        onPageChange('projects');
        navigate('/projects');
      }}>
        <img src="./icons_logo/Property 1=Logo Kinship user.svg" alt="Logo" className="!w-[150px] !h-[40px] user-logo" />
      </div>

      <div className="user-header-right">
        <Menu as="div" className="relative">
          {({ open }: { open: boolean }) => (
            <>
              <Menu.Button className={`user-info ${state.showingPageType === 'user' ? 'user-dashboard-menu !flex-row' : ''}`}>
                <AvatarImage
                  src={user.avatar}
                  alt={user.name}
                  className="user-avatar"
                />
                <span className="user-name">{user.name}</span>
                <img
                  src="/icons_logo/Icon=Chevron bas.svg"
                  alt="▼"
                  className={`dropdown-arrow ${open ? 'open' : ''}`}
                />
              </Menu.Button>

          <Transition
            enter="transition ease-out duration-100"
            enterFrom="transform opacity-0 scale-95"
            enterTo="transform opacity-100 scale-100"
            leave="transition ease-in duration-75"
            leaveFrom="transform opacity-100 scale-100"
            leaveTo="transform opacity-0 scale-95"
          >
            <Menu.Items className={`dropdown-menu ${state.showingPageType === 'user' ? 'user-dashboard-dropdown' : ''}`}>
              <div className="menu-header">
                <div className='menu-header-content'>
                  <div className="menu-header-name">{user.name}</div>
                  <div className="dropdown-role" title={translateRole(user.role)}>{translateRole(user.role)}</div>
                  <div className="menu-header-email" title={user.email}>
                    <i className="fas fa-envelope email-icon"></i>
                    <span className="email-text">{user.email}</span>
                  </div>
                </div>
              </div>

              <Menu.Item>
                {({ active }: { active: boolean }) => (
                  <button
                    className={`${active ? 'active' : ''}`}
                    onClick={() => handlePageChange('projects')}
                  >
                    Mes projets
                  </button>
                )}
              </Menu.Item>

              <Menu.Item>
                {({ active }: { active: boolean }) => (
                  <button
                    className={`${active ? 'active' : ''}`}
                    onClick={() => handlePageChange('network')}
                  >
                    Mon réseau
                  </button>
                )}
              </Menu.Item>

              <Menu.Item>
                {({ active }: { active: boolean }) => (
                  <button
                    className={`${active ? 'active' : ''}`}
                    onClick={() => handlePageChange('badges')}
                  >
                    Mes badges
                  </button>
                )}
              </Menu.Item>

              <Menu.Item>
                {({ active }: { active: boolean }) => (
                  <button
                    className={`${active ? 'active' : ''}`}
                    onClick={() => handlePageChange('events')}
                  >
                    Mes événements
                  </button>
                )}
              </Menu.Item>

              <div className="dropdown-divider" />

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
                    onClick={() => handlePageChange('personal-settings')}
                  >
                    <i className="fas fa-cog"></i> Paramètres personnels
                  </button>
                )}
              </Menu.Item>

              <Menu.Item>
                {({ active }: { active: boolean }) => (
                  <button
                    type="button"
                    className={`menu-item logout-item ${active ? 'active' : ''}`}
                    onClick={handleLogout}
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
    </header>
  );
};

export default UserHeader;
