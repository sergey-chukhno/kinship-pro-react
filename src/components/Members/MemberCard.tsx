import React, { useState, useEffect, useRef } from 'react';
import { Member } from '../../types';
import RolePill from '../UI/RolePill';
import './MemberCard.css';
import AvatarImage from '../UI/AvatarImage';
import { translateRole } from '../../utils/roleTranslations';

interface MemberCardProps {
  categoryTag?: { label: string; color: string };// Optional pill tag
  member: Member;
  badgeCount: number;
  onClick: () => void;
  onContactClick: () => void;
  onRoleChange: (newRole: string) => void;
  disableRoleDropdown?: boolean; // New prop to disable role dropdown
  isSuperadmin?: boolean; // New prop to indicate if member is superadmin
  onViewProfile?: () => void; // Optional prop for viewing profile
  extraActions?: Array<{ label: string; onClick: () => void }>;
}

const MemberCard: React.FC<MemberCardProps> = ({
  member,
  badgeCount,
  onClick,
  onContactClick,
  onRoleChange,
  disableRoleDropdown = false,
  isSuperadmin = false,
  onViewProfile,
  categoryTag,
  extraActions = []
}) => {
  const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleRoleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsRoleDropdownOpen(!isRoleDropdownOpen);
  };

  const handleRoleSelect = (role: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onRoleChange(role);
    setIsRoleDropdownOpen(false);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsRoleDropdownOpen(false);
      }
    };

    if (isRoleDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isRoleDropdownOpen]);

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'Admin': return 'role-admin';
      case 'Référent': return 'role-referent';
      case 'Membre': return 'role-membre';
      case 'Intervenant': return 'role-intervenant';
      default: return 'role-membre';
    }
  };

  return (
    <div className="member-card" onClick={onClick}>
      <div className="member-header">
        <div className="member-avatar">
          <AvatarImage src={member.avatar} alt={`${member.firstName} ${member.lastName}`} />
        </div>
        {member.isTrusted && (
          <div className="trusted-badge">
            <i className="fas fa-shield-alt"></i>
          </div>
        )}
        <div className="member-info">
          <h3 className="member-name">{member.firstName} {member.lastName}</h3>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: 4 }}>
            {categoryTag && (
              <span
                className="organization-type"
                style={{ background: `${categoryTag.color}1a`, color: categoryTag.color }}
              >
                {categoryTag.label}
              </span>
            )}
            {member.organization && (
              <span className="organization-type" style={{ background: "#eef2ff", color: "#4338ca" }}>
                {member.organization}
              </span>
            )}
            {/* Display common organizations */}
            {member.commonOrganizations && (
              <>
                {member.commonOrganizations.schools.map((school) => (
                  <span 
                    key={`school-${school.id}`}
                    className="organization-type" 
                    style={{ background: "#dcfce71a", color: "#10b981" }}
                    title="Établissement scolaire en commun"
                  >
                    <i className="fas fa-school" style={{ marginRight: '4px', fontSize: '0.75rem' }}></i>
                    {school.name}
                  </span>
                ))}
                {member.commonOrganizations.companies.map((company) => (
                  <span 
                    key={`company-${company.id}`}
                    className="organization-type" 
                    style={{ background: "#dbeafe1a", color: "#3b82f6" }}
                    title="Organisation en commun"
                  >
                    <i className="fas fa-building" style={{ marginRight: '4px', fontSize: '0.75rem' }}></i>
                    {company.name}
                  </span>
                ))}
              </>
            )}
          </div>
          {(() => {
            // Display system role (translated) instead of profession on member card
            const systemRole = (member as any).systemRole || '';
            const translatedSystemRole = systemRole ? translateRole(systemRole) : '';
            return translatedSystemRole ? (
              <p className="break-words member-profession" style={{ marginTop: 4 }}>{translatedSystemRole}</p>
            ) : null;
          })()}
        </div>
      </div>

      <div className="member-roles">
        {member.roles.map((role, index) => {
          // Disable dropdown if member is superadmin or if explicitly disabled
          const shouldDisableRoleDropdown = disableRoleDropdown || isSuperadmin;
          
          return (
            <div key={index} className={`role-container ${shouldDisableRoleDropdown ? 'role-disabled' : ''}`} ref={dropdownRef}>
              <RolePill
                role={role}
                color={getRoleColor(role)}
                onClick={shouldDisableRoleDropdown ? undefined : handleRoleClick}
                isDropdown={!shouldDisableRoleDropdown}
              />
              {!shouldDisableRoleDropdown && isRoleDropdownOpen && (
              <div className="role-dropdown">
                <div 
                  className={`role-option  ${role === 'Admin' ? 'selected' : ''}`} 
                  onClick={(e) => handleRoleSelect('admin', e)}
                >
                  Admin
                </div>
                <div 
                  className={`role-option ${role === 'Référent' ? 'selected' : ''}`} 
                  onClick={(e) => handleRoleSelect('referent', e)}
                >
                  Référent
                </div>
                <div 
                  className={`role-option ${role === 'Membre' ? 'selected' : ''}`} 
                  onClick={(e) => handleRoleSelect('member', e)}
                >
                  Membre
                </div>
                <div 
                  className={`role-option ${role === 'Intervenant' ? 'selected' : ''}`} 
                  onClick={(e) => handleRoleSelect('intervenant', e)}
                >
                  Intervenant
                </div>
              </div>
              )}
            </div>
          );
        })}
      </div>


      <div className="member-footer">
        <div className="member-actions">
          {member.email ? (
            <a
              href={`mailto:${member.email}`}
              className="btn btn-outline btn-sm"
              onClick={(e) => {
                e.stopPropagation();
              }}
            >
              <i className="fas fa-envelope"></i>
              Contacter
            </a>
          ) : (
            <button
              className="btn btn-outline btn-sm"
              onClick={(e) => {
                e.stopPropagation();
                onContactClick();
              }}
            >
              <i className="fas fa-envelope"></i>
              Contacter
            </button>
          )}
          <button 
            className="btn btn-primary btn-sm"
            onClick={(e) => {
              e.stopPropagation();
              if (onViewProfile) {
                onViewProfile();
              } else {
                onClick(); // Fallback to card onClick if onViewProfile is not provided
              }
            }}
          >
            <i className="fas fa-eye"></i>
            Voir profil
          </button>
          {extraActions.map((action, idx) => (
            <button
              key={idx}
              className="btn btn-outline btn-sm"
              onClick={(e) => {
                e.stopPropagation();
                action.onClick();
              }}
            >
              {action.label}
            </button>
          ))}
        </div>
      </div>
      
      <div className="badge-counter">
        <img src="/icons_logo/Icon=Badges.svg" alt="Badge" className="badge-icon" />
        <span>{badgeCount}</span>
      </div>
    </div>
  );
};

export default MemberCard;
