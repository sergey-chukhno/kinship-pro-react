import React from 'react';
import { getLocalBadgeImage } from '../../utils/badgeImages';
import './CompactProgressBadge.css';

export interface CompactProgressBadgeProps {
  badge: {
    name: string;
    level: string;
    series: string;
    image_url?: string | null;
  };
  fullExpertiseNames: string[];
  receivedExpertiseNames: string[];
  onClick: () => void;
}

const CompactProgressBadge: React.FC<CompactProgressBadgeProps> = ({
  badge,
  fullExpertiseNames,
  receivedExpertiseNames,
  onClick,
}) => {
  const total = fullExpertiseNames.length;
  const received = receivedExpertiseNames.length;
  const isComplete = total > 0 && received >= total;
  const badgeLevel = badge.level || 'level_1';
  const badgeImage =
    badge.image_url ||
    getLocalBadgeImage(badge.name, badgeLevel, badge.series) ||
    '/TouKouLeur-Jaune.png';
  const receivedSet = new Set(receivedExpertiseNames);

  return (
    <div
      className="compact-progress-badge"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          e.stopPropagation();
          onClick();
        }
      }}
      role="button"
      tabIndex={0}
      title={badge.name}
    >
      <div className={`compact-progress-badge-icon ${!isComplete ? 'compact-progress-badge-icon-greyed' : ''}`}>
        <img src={badgeImage} alt={badge.name} />
      </div>
      {total > 0 && (
        <div
          className="compact-progress-badge-bar"
          role="progressbar"
          aria-valuenow={received}
          aria-valuemin={0}
          aria-valuemax={total}
          aria-label={`${received} sur ${total} compétences`}
        >
          {fullExpertiseNames.map((name, idx) => (
            <div
              key={idx}
              className={`compact-progress-badge-segment ${receivedSet.has(name) ? 'compact-progress-badge-segment-filled' : ''}`}
              title={name}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default CompactProgressBadge;
