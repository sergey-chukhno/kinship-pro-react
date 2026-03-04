import React from 'react';
import { Badge } from '../../types';
import './CompetencesOrienterProgressCard.css';

export interface CompetencesOrienterProgressCardProps {
  badge: Badge;
  fullExpertiseNames: string[];
  receivedExpertiseNames: string[];
  badgeId?: string;
  onClick: () => void;
}

const CompetencesOrienterProgressCard: React.FC<CompetencesOrienterProgressCardProps> = ({
  badge,
  fullExpertiseNames,
  receivedExpertiseNames,
  onClick,
}) => {
  const total = fullExpertiseNames.length;
  const received = receivedExpertiseNames.length;
  const isComplete = total > 0 && received >= total;

  const getLevelColor = (level: string) => {
    if (level.includes('Niveau 1')) return '#10b981';
    if (level.includes('Niveau 2')) return '#3b82f6';
    if (level.includes('Niveau 3')) return '#f59e0b';
    if (level.includes('Niveau 4')) return '#ef4444';
    return '#6b7280';
  };

  const receivedSet = new Set(receivedExpertiseNames);

  return (
    <div className="competences-orienter-progress-card" onClick={onClick} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && onClick()}>
      <div className="competences-orienter-card-header">
        <div className={`competences-orienter-card-logo ${!isComplete ? 'competences-orienter-card-logo-greyed' : ''}`}>
          {badge.image ? (
            <img src={badge.image} alt={badge.name} />
          ) : (
            <div className="badge-placeholder">
              <i className="fas fa-award"></i>
            </div>
          )}
        </div>
        <div className="competences-orienter-card-level" style={{ backgroundColor: getLevelColor(badge.level) }}>
          <span>{badge.level}</span>
        </div>
      </div>

      <div className="competences-orienter-card-content">
        <h3 className="competences-orienter-card-title">{badge.name}</h3>

        {/* Segmented progress bar */}
        {total > 0 && (
          <div className="competences-orienter-progress-wrap">
            <div className="competences-orienter-progress-segments" role="progressbar" aria-valuenow={received} aria-valuemin={0} aria-valuemax={total} aria-label={`${received} sur ${total} compétences`}>
              {fullExpertiseNames.map((name, idx) => (
                <div
                  key={idx}
                  className={`competences-orienter-progress-segment ${receivedSet.has(name) ? 'competences-orienter-progress-segment-filled' : ''}`}
                  title={name}
                />
              ))}
            </div>
            <span className="competences-orienter-progress-label">{received} / {total}</span>
          </div>
        )}

        {/* Legend: one list with checkmarks */}
        {fullExpertiseNames.length > 0 && (
          <ul className="competences-orienter-legend">
            {fullExpertiseNames.map((name, idx) => (
              <li key={idx} className="competences-orienter-legend-item">
                {receivedSet.has(name) ? (
                  <i className="fas fa-check-circle competences-orienter-legend-check" aria-hidden />
                ) : (
                  <i className="far fa-circle competences-orienter-legend-empty" aria-hidden />
                )}
                <span>{name}</span>
              </li>
            ))}
          </ul>
        )}

        <div className="competences-orienter-card-click-hint">
          <span>Cliquer pour voir les attributions du badge</span>
          <i className="fas fa-chevron-right"></i>
        </div>
      </div>
    </div>
  );
};

export default CompetencesOrienterProgressCard;
