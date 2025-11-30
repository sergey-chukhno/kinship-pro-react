import React from 'react';
import './UserCard.css';

export interface NetworkUser {
  id: number;
  full_name: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  job: string | null;
  avatar_url: string | null;
  skills: Array<{ id: number; name: string }>;
  common_organizations: Array<{ id: number; name: string; type: string }>;
}

interface UserCardProps {
  user: NetworkUser;
  onClick?: () => void;
}

const UserCard: React.FC<UserCardProps> = ({ user, onClick }) => {
  return (
    <div className="user-card" onClick={onClick} style={{ cursor: onClick ? 'pointer' : 'default' }}>
      <div className="user-header">
        <div className="user-avatar">
          {user.avatar_url ? (
            <img src={user.avatar_url} alt={user.full_name} />
          ) : (
            <div className="avatar-placeholder">
              <i className="fas fa-user"></i>
            </div>
          )}
        </div>
        <div className="user-info">
          <h3 className="user-name">{user.full_name}</h3>
          <div className="user-meta">
            <span className="user-role">{user.role}</span>
            {user.job && <span className="user-job">{user.job}</span>}
          </div>
        </div>
      </div>
      <div className="user-content">
        <div className="user-email">
          <i className="fas fa-envelope"></i>
          {user.email}
        </div>
        {user.skills && user.skills.length > 0 && (
          <div className="user-skills">
            <div className="skills-label">Compétences:</div>
            <div className="skills-list">
              {user.skills.map((skill, index) => (
                <span key={skill.id || index} className="skill-tag">
                  {skill.name}
                </span>
              ))}
            </div>
          </div>
        )}
        {user.common_organizations && user.common_organizations.length > 0 && (
          <div className="user-organizations">
            <div className="organizations-label">Organisations communes:</div>
            <div className="organizations-list">
              {user.common_organizations.map((org, index) => (
                <span key={org.id || index} className="org-tag">
                  {org.name} ({org.type})
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserCard;

