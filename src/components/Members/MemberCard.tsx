import React, { useState, useEffect, useRef } from 'react';
import { Member } from '../../types';
import RolePill from '../UI/RolePill';
import './MemberCard.css';
import AvatarImage from '../UI/AvatarImage';

interface MemberCardProps {
  member: Member;
  badgeCount: number;
  onClick: () => void;
  onContactClick: () => void;
  onRoleChange: (newRole: string) => void;
}

const MemberCard: React.FC<MemberCardProps> = ({
  member,
  badgeCount,
  onClick,
  onContactClick,
  onRoleChange
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
          <p className="member-profession break-words">{member.profession}</p>
        </div>
      </div>

      <div className="member-roles">
        {member.roles.map((role, index) => (
          <div key={index} className="role-container" ref={dropdownRef}>
            <RolePill
              role={role}
              color={getRoleColor(role)}
              onClick={handleRoleClick}
              isDropdown={true}
            />
            {isRoleDropdownOpen && (
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
        ))}
      </div>


      <div className="member-footer">
        <div className="member-actions">
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
          <button className="btn btn-primary btn-sm">
            <i className="fas fa-eye"></i>
            Voir profil
          </button>
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
