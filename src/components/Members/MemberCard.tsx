import React, { useState, useEffect, useRef } from 'react';
import { Member } from '../../types';
import RolePill from '../UI/RolePill';
import './MemberCard.css';
import AvatarImage from '../UI/AvatarImage';
import { translateRole } from '../../utils/roleTranslations';
import { getLocalBadgeImage } from '../../utils/badgeImages';

interface MemberCardProps {
  categoryTag?: { label: string; color: string };// Optional pill tag
  member: Member;
  badgeCount: number;
  onClick: () => void;
  onContactClick: () => void;
  onRoleChange: (newRole: string) => void;
  disableRoleDropdown?: boolean; // New prop to disable role dropdown
  hideRolePill?: boolean; // New prop to completely hide role pill
  isSuperadmin?: boolean; // New prop to indicate if member is superadmin
  onViewProfile?: () => void; // Optional prop for viewing profile
  extraActions?: Array<{ label: string; onClick: () => void }>;
  badgeCartographyUrl?: string; // Optional URL for badge cartography
  showCartographyLinkWhenHasBadges?: boolean; // Élèves tab: show link-style when badgeCount > 0 even if URL not ready
}

const MemberCard: React.FC<MemberCardProps> = ({
  member,
  badgeCount,
  onClick,
  onContactClick,
  onRoleChange,
  disableRoleDropdown = false,
  hideRolePill = false,
  isSuperadmin = false,
  onViewProfile,
  categoryTag,
  extraActions = [],
  badgeCartographyUrl,
  showCartographyLinkWhenHasBadges = false
}) => {
  const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false);
  const [showAllClasses, setShowAllClasses] = useState(false);
  const [showAllSchools, setShowAllSchools] = useState<Record<string, boolean>>({});
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
              <span 
                className="organization-type" 
                style={member.organizationType === 'school' 
                  ? { background: "#dcfce71a", color: "#10b981" }
                  : member.organizationType === 'company'
                  ? { background: "#dbeafe1a", color: "#3b82f6" }
                  : { background: "#eef2ff", color: "#4338ca" }
                }
                title={member.organizationType === 'school' 
                  ? "Établissement scolaire"
                  : member.organizationType === 'company'
                  ? "Organisation"
                  : undefined
                }
              >
                {member.organizationType === 'school' && (
                  <i className="fas fa-school" style={{ marginRight: '4px', fontSize: '0.75rem' }}></i>
                )}
                {member.organizationType === 'company' && (
                  <i className="fas fa-building" style={{ marginRight: '4px', fontSize: '0.75rem' }}></i>
                )}
                {member.organization}
              </span>
            )}
            {/* Display common organizations (excluding the primary organization to avoid duplicates) */}
            {member.commonOrganizations && (
              <>
                {member.commonOrganizations.schools
                  .filter(school => 
                    !member.organization || 
                    school.name.trim().toLowerCase() !== member.organization.trim().toLowerCase()
                  )
                  .map((school) => (
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
                {member.commonOrganizations.companies
                  .filter(company => 
                    !member.organization || 
                    company.name.trim().toLowerCase() !== member.organization.trim().toLowerCase()
                  )
                  .map((company) => (
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
              <p className="member-profession" style={{ marginTop: 4 }}>{translatedSystemRole}</p>
            ) : null;
          })()}
          {(() => {
            // Display schools for students (from teacher dashboard)
            const schools = (member as any).schools || [];
            if (schools && schools.length > 0) {
              const memberId = member.id.toString();
              const isExpanded = showAllSchools[memberId] || false;
              const displaySchools = isExpanded || schools.length <= 2 
                ? schools 
                : schools.slice(0, 2);
              const hasMoreSchools = schools.length > 2;
              
              return (
                <div className="member-schools" style={{ marginTop: 4 }}>
                  {displaySchools.map((school: any, index: number) => (
                    <span
                      key={school.id || index}
                      className="organization-type"
                      style={{ background: "#dcfce71a", color: "#10b981", marginRight: '4px', marginBottom: '4px', display: 'inline-block' }}
                      title="École"
                    >
                      <i className="fas fa-school" style={{ marginRight: '4px', fontSize: '0.75rem' }}></i>
                      {school.name}
                    </span>
                  ))}
                  {hasMoreSchools && (
                    <button
                      type="button"
                      className="class-toggle-button"
                      style={{ marginLeft: '4px' }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowAllSchools(prev => ({ ...prev, [memberId]: !prev[memberId] }));
                      }}
                    >
                      {isExpanded ? 'Voir moins' : 'Voir plus'}
                    </button>
                  )}
                </div>
              );
            }
            
            // Display classes for students (fallback to existing behavior)
            const systemRole = (member as any).systemRole || '';
            const studentRoles = ['eleve_primaire', 'collegien', 'collégien', 'lyceen', 'lycéen', 'etudiant', 'étudiant', 'student', 'eleve', 'élève'];
            const isStudent = studentRoles.includes(systemRole.toLowerCase());
            const classes = member.classes || [];
            
            if (!isStudent || !classes || classes.length === 0) {
              return null;
            }
            
            const displayClasses = showAllClasses || classes.length <= 2 
              ? classes 
              : classes.slice(0, 2);
            const hasMoreClasses = classes.length > 2;
            
            return (
              <div className="member-classes">
                {displayClasses.map((cls: any, index: number) => (
                  <span
                    key={cls.id || index}
                    className="class-tag "
                  >
                    {cls.name}
                  </span>
                ))}
                {hasMoreClasses && (
                  <button
                    type="button"
                    className="class-toggle-button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowAllClasses(!showAllClasses);
                    }}
                  >
                    {showAllClasses ? 'Voir moins' : 'Voir plus'}
                  </button>
                )}
              </div>
            );
          })()}
        </div>
      </div>

      {!hideRolePill && (
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
      )}

      {/* Latest Badges Section */}
      {member.latestBadges && member.latestBadges.length > 0 && (
        <div className="member-badges" style={{ 
          marginTop: '16px', 
          marginBottom: '16px',
          paddingTop: '16px',
          borderTop: '1px solid #e5e7eb'
        }}>
          <h4 style={{ 
            fontSize: '0.875rem', 
            fontWeight: 600, 
            color: '#6b7280', 
            marginBottom: '12px',
            marginTop: 0
          }}>
            3 derniers badges reçus
          </h4>
          <div style={{ 
            display: 'flex', 
            gap: '8px', 
            flexWrap: 'wrap',
            alignItems: 'center'
          }}>
            {member.latestBadges.slice(0, 3).map((latestBadge, index) => {
              const badge = latestBadge.badge;
              const badgeLevel = badge.level || 'level_1';
              const badgeImage = badge.image_url || 
                getLocalBadgeImage(badge.name, badgeLevel, badge.series) || 
                '/TouKouLeur-Jaune.png';
              
              return (
                <div
                  key={index}
                  style={{
                    position: 'relative',
                    width: '48px',
                    height: '48px',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    border: '1px solid #e5e7eb',
                    cursor: 'pointer',
                    transition: 'transform 0.2s ease',
                  }}
                  title={`${badge.name} - ${badgeLevel.replace('level_', 'Niveau ')}`}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'scale(1.1)';
                    e.currentTarget.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.15)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'scale(1)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <img
                    src={badgeImage}
                    alt={badge.name}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'contain',
                      padding: '4px',
                      backgroundColor: '#f9fafb'
                    }}
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}

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
      
      {(showCartographyLinkWhenHasBadges && badgeCount > 0) || badgeCartographyUrl ? (
        <a
          href={badgeCartographyUrl || '#'}
          className="badge-counter"
          target={badgeCartographyUrl ? '_blank' : undefined}
          rel={badgeCartographyUrl ? 'noopener noreferrer' : undefined}
          onClick={(e) => {
            e.stopPropagation();
            if (!badgeCartographyUrl) e.preventDefault();
          }}
          style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}
          aria-label={badgeCartographyUrl ? `Voir la cartographie des badges de ${member.firstName} ${member.lastName}` : undefined}
        >
          <img src="/icons_logo/Icon=Badges.svg" alt="Badge" className="badge-icon" />
          <span>{badgeCount}</span>
        </a>
      ) : (
        <div className="badge-counter">
          <img src="/icons_logo/Icon=Badges.svg" alt="Badge" className="badge-icon" />
          <span>{badgeCount}</span>
        </div>
      )}
    </div>
  );
};

export default MemberCard;
