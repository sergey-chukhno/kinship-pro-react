import React from 'react';
import { BadgeAPI } from '../../types';
import { getLocalBadgeImage } from '../../utils/badgeImages';
import { getLevelLabel } from '../../utils/badgeLevelLabels';
import { getBadgeValidationRules, getBadgeCompetencies, normalizeCompetencyName } from './BadgeAssignmentModal';
import './Modal.css';
import './BadgeAssignmentModal.css';
import './BadgeInfoModal.css';

interface BadgeInfoModalProps {
  badge: BadgeAPI | null;
  onClose: () => void;
}

const BadgeInfoModal: React.FC<BadgeInfoModalProps> = ({ badge, onClose }) => {
  if (!badge) return null;

  const series = badge.series ?? '';
  const levelNum = badge.level?.replace('level_', '') || '1';
  const levelLabel = getLevelLabel(series, levelNum);
  const imageUrl = getLocalBadgeImage(badge.name, badge.level, badge.series);
  const competencies = getBadgeCompetencies(badge);
  const rules = getBadgeValidationRules(badge.name);
  const normalizedMandatory = rules ? rules.mandatoryCompetencies.map(normalizeCompetencyName) : [];

  return (
    <div className="modal-overlay" onClick={onClose} role="presentation">
      <div
        className="modal-content badge-info-modal-content"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="badge-info-modal-title"
      >
        <div className="badge-info-modal-header">
          <h2 id="badge-info-modal-title" className="badge-info-modal-title">
            {badge.name}
          </h2>
          <button
            type="button"
            className="badge-info-modal-close"
            onClick={onClose}
            aria-label="Fermer"
          >
            <i className="fas fa-times" />
          </button>
        </div>
        <div className="badge-info-modal-body">
          <div className="badge-info-modal-badge-row">
            {imageUrl ? (
              <img
                src={imageUrl}
                alt=""
                className="badge-info-modal-image"
              />
            ) : (
              <div className="badge-info-modal-image-placeholder" />
            )}
            <div className="badge-info-modal-meta">
              <span className="badge-info-modal-level">{levelLabel}</span>
              {badge.description?.trim() && (
                <div className="badge-info-modal-description-wrap">
                  <strong className="badge-info-modal-description-label">Description :</strong>
                  <p className="badge-info-modal-description">{badge.description.trim()}</p>
                </div>
              )}
            </div>
          </div>
          {competencies.length > 0 && (
            <div className="badge-info-modal-competencies">
              <div className="competencies-label-container">
                <span className="badge-info-modal-competencies-label">Compétences</span>
                {rules?.hintText && (
                  <span className="competencies-hint-text">{rules.hintText}</span>
                )}
              </div>
              <div className="competencies-list-container badge-info-competencies-list">
                {competencies.map((c) => {
                  const isMandatory = normalizedMandatory.includes(normalizeCompetencyName(c.name));
                  return (
                    <div
                      key={c.id}
                      className={`competency-item ${isMandatory ? 'competency-item-mandatory' : ''}`}
                    >
                      <span className="competency-item-text">
                        {c.name}
                        {isMandatory && (
                          <span className="competency-mandatory-indicator"> (Obligatoire)</span>
                        )}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BadgeInfoModal;
