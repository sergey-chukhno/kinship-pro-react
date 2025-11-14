import React from 'react';
import { Badge } from '../../types';
import './BadgeCard.css';

interface BadgeCardProps {
  badge: Badge;
  onClick: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

const BadgeCard: React.FC<BadgeCardProps> = ({ badge, onClick, onEdit, onDelete }) => {

  const getLevelColor = (level: string) => {
    if (level.includes('Niveau 1')) return '#10b981';
    if (level.includes('Niveau 2')) return '#3b82f6';
    if (level.includes('Niveau 3')) return '#f59e0b';
    if (level.includes('Niveau 4')) return '#ef4444';
    return '#6b7280';
  };

  // const getLevelIcon = (level: string) => {
  //   if (level.includes('Niveau 1')) return 'fas fa-seedling';
  //   if (level.includes('Niveau 2')) return 'fas fa-leaf';
  //   if (level.includes('Niveau 3')) return 'fas fa-tree';
  //   if (level.includes('Niveau 4')) return 'fas fa-crown';
  //   return 'fas fa-award';
  // };

  return (
    <div className="badge-card-vertical" onClick={onClick}>
      <div className="badge-header">
        <div className="badge-logo">
          {badge.image ? (
            <img src={badge.image} alt={badge.name} />
          ) : (
            <div className="badge-placeholder">
              <i className="fas fa-award"></i>
            </div>
          )}
        </div>
        <div className="badge-level" style={{ backgroundColor: getLevelColor(badge.level) }}>
          <span>{badge.level}</span>
        </div>
      </div>

      <div className="badge-content">
        <h3 className="badge-title">{badge.name}</h3>
      </div>

      {/* Green counters positioned like in projects section */}
      <div className="badge-counters">
        <div className="badge-counter">
          <img src="/icons_logo/Icon=Badges.svg" alt="Badges" className="counter-icon" />
          <span>{badge.recipients || 0}</span>
        </div>
      </div>
    </div>
  );
};

export default BadgeCard;
