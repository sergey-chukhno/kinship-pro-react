import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const user = state.user;
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

  const handlePageChange = (page: PageType) => {
    onPageChange(page);
    navigate(`/${page}`);
    setOpen(false);
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
      onPageChange('projects');
      navigate('/projects');
    } else {
      onPageChange('dashboard');
      navigate('/dashboard');
    }

    // Close dropdown
    setOpen(false);

    console.log(`Switched to ${orgType} ${orgId}, pageType: ${newPageType}`);
  };

  const handleLogout = () => {
    localStorage.removeItem('jwt_token');
    localStorage.removeItem('selectedPageType');
    localStorage.removeItem('selectedContextId');
    localStorage.removeItem('selectedContextType');
    navigate('/login');
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open]);

  return (
    <header className="user-header">
      <div className="user-header-left" onClick={() => {
        onPageChange('projects');
        navigate('/projects');
      }}>
        <img src="./icons_logo/Property 1=Logo Kinship user.svg" alt="Logo" className="!w-[150px] !h-[40px] user-logo" />
      </div>

      <div className="user-header-right" ref={dropdownRef}>
        <div className="user-info" onClick={() => setOpen(!open)}>
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
        </div>

        {open && (
          <div className="dropdown-menu" onClick={(e) => e.stopPropagation()}>
            <div className="menu-header">
              <div className='flex flex-col gap-0.5'>
                <div style={{ fontWeight: 700 }}>{user.name}</div>
                <div className="dropdown-role" title={translateRole(user.role)}>{translateRole(user.role)}</div>
                <div style={{ fontSize: '.85rem', color: 'var(--text-light)', overflowWrap: 'break-word' }} className='' title={user.email}>{user.email}</div>
              </div>
            </div>

            <button onClick={() => handlePageChange('projects')}>Mes projets</button>
            <button onClick={() => handlePageChange('network')}>Mon réseau</button>
            <button onClick={() => handlePageChange('badges')}>Mes badges</button>

            <div className="dropdown-divider" />

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

            <button type="button" className="menu-item logout-item" onClick={handleLogout}>
              <i className="fas fa-sign-out-alt logout-icon"></i> Se déconnecter
            </button>
          </div>
        )}
      </div>
    </header>
  );
};

export default UserHeader;
