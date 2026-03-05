import React from 'react';
import { getLocalBadgeImage } from '../../utils/badgeImages';
import { getLevelLabel } from '../../utils/badgeLevelLabels';
import './MemberCardBadgeProgressModal.css';

export interface MemberCardBadgeProgressModalProps {
  isOpen: boolean;
  onClose: () => void;
  badge: {
    name: string;
    level: string;
    series: string;
    image_url?: string | null;
  };
  fullExpertiseNames: string[];
  receivedExpertiseNames: string[];
}

const MemberCardBadgeProgressModal: React.FC<MemberCardBadgeProgressModalProps> = ({
  isOpen,
  onClose,
  badge,
  fullExpertiseNames,
  receivedExpertiseNames,
}) => {
  if (!isOpen) return null;

  const total = fullExpertiseNames.length;
  const received = receivedExpertiseNames.length;
  const isComplete = total > 0 && received >= total;
  const badgeLevel = badge.level || 'level_1';
  const levelNum = badgeLevel.replace('level_', '');
  const levelLabel = getLevelLabel(badge.series, levelNum);
  const badgeImage =
    badge.image_url ||
    getLocalBadgeImage(badge.name, badgeLevel, badge.series) ||
    '/TouKouLeur-Jaune.png';
  const receivedSet = new Set(receivedExpertiseNames);

  const getLevelColor = (level: string) => {
    if (level.includes('Niveau 1')) return '#10b981';
    if (level.includes('Niveau 2')) return '#3b82f6';
    if (level.includes('Niveau 3')) return '#f59e0b';
    if (level.includes('Niveau 4')) return '#ef4444';
    return '#6b7280';
  };

  return (
    <div className="modal-overlay member-card-badge-progress-overlay" onClick={onClose} role="presentation">
      <div
        className="modal-content member-card-badge-progress-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="member-card-badge-progress-title"
      >
        <div className="member-card-badge-progress-header">
          <h2 id="member-card-badge-progress-title">Progression du badge</h2>
          <button type="button" className="member-card-badge-progress-close" onClick={onClose} aria-label="Fermer">
            <i className="fas fa-times" />
          </button>
        </div>
        <div className="member-card-badge-progress-body">
          <div className="member-card-badge-progress-badge-row">
            <div className={`member-card-badge-progress-logo ${!isComplete ? 'member-card-badge-progress-logo-greyed' : ''}`}>
              <img src={badgeImage} alt={badge.name} />
            </div>
            <div className="member-card-badge-progress-meta">
              <h3 className="member-card-badge-progress-name">{badge.name}</h3>
              <span className="member-card-badge-progress-level" style={{ backgroundColor: getLevelColor(levelLabel) }}>
                {levelLabel}
              </span>
            </div>
          </div>

          {total > 0 && (
            <div className="member-card-badge-progress-wrap">
              <div
                className="member-card-badge-progress-segments"
                role="progressbar"
                aria-valuenow={received}
                aria-valuemin={0}
                aria-valuemax={total}
                aria-label={`${received} sur ${total} compétences`}
              >
                {fullExpertiseNames.map((name, idx) => (
                  <div
                    key={idx}
                    className={`member-card-badge-progress-segment ${receivedSet.has(name) ? 'member-card-badge-progress-segment-filled' : ''}`}
                    title={name}
                  />
                ))}
              </div>
              <span className="member-card-badge-progress-label">{received} / {total}</span>
            </div>
          )}

          {fullExpertiseNames.length > 0 && (
            <ul className="member-card-badge-progress-legend">
              {fullExpertiseNames.map((name, idx) => (
                <li key={idx} className="member-card-badge-progress-legend-item">
                  {receivedSet.has(name) ? (
                    <i className="fas fa-check-circle member-card-badge-progress-legend-check" aria-hidden />
                  ) : (
                    <i className="far fa-circle member-card-badge-progress-legend-empty" aria-hidden />
                  )}
                  <span>{name}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default MemberCardBadgeProgressModal;
