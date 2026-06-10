import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  IDENTITY_MASKED_SHARE_HINT,
  IDENTITY_MASKED_SHARE_LABEL,
  JSON_EXPORT_DISABLED_LABEL,
  PRESENCE_VERIFIED_LABEL,
  PROJECT_PROOF_PENDING_LABEL,
} from '../../constants/badgeProofUx';
import { BadgeProofViewData } from '../../types/badgeProof';
import { applyShowOwnerNameToView } from '../../utils/badgeProofMapper';
import { buildVerifyPagePath } from '../../utils/badgeProofVerifyQuery';
import './Modal.css';
import './BadgeProofModal.css';

interface BadgeProofModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: BadgeProofViewData | null;
  /** Persiste show_owner_name côté API et met à jour la cartographie */
  onShowOwnerNameChange?: (userBadgeId: string | number, showOwnerName: boolean) => void | Promise<void>;
}

const QA_CLASS_MAP: Record<string, string> = {
  'qa-accreditation-pub': 'badge-proof-qa-accreditation-pub',
  'qa-externe-renf': 'badge-proof-qa-externe-renf',
  'qa-externe-sup': 'badge-proof-qa-externe-sup',
  'qa-externe': 'badge-proof-qa-externe',
  'qa-interne': 'badge-proof-qa-interne',
  'qa-standard': 'badge-proof-qa-standard',
};

function qaCssClass(qaClass: string): string {
  return QA_CLASS_MAP[qaClass] || QA_CLASS_MAP['qa-standard'];
}

const BadgeProofModal: React.FC<BadgeProofModalProps> = ({
  isOpen,
  onClose,
  data,
  onShowOwnerNameChange,
}) => {
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const [displayData, setDisplayData] = useState<BadgeProofViewData | null>(data);
  const [privacySaving, setPrivacySaving] = useState(false);
  const [privacyError, setPrivacyError] = useState<string | null>(null);

  useEffect(() => {
    setDisplayData(data);
    setPrivacyError(null);
  }, [data]);

  const handleCopyLink = useCallback(() => {
    const url = displayData?.shareUrlCopy || displayData?.shareUrl;
    if (!url) return;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [displayData?.shareUrlCopy, displayData?.shareUrl]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  const handleMaskIdentityToggle = async (masked: boolean) => {
    if (!displayData?.canControlOwnerVisibility) return;

    const showOwnerName = !masked;
    const previous = displayData;
    const next = applyShowOwnerNameToView(displayData, showOwnerName);
    setDisplayData(next);
    setPrivacyError(null);

    if (!onShowOwnerNameChange) return;

    const badgeId = displayData.userBadgeId;
    if (badgeId == null || String(badgeId).startsWith('example-')) return;

    setPrivacySaving(true);
    try {
      await onShowOwnerNameChange(badgeId, showOwnerName);
    } catch {
      setDisplayData(previous);
      setPrivacyError('Impossible d’enregistrer ce choix. Réessayez.');
    } finally {
      setPrivacySaving(false);
    }
  };

  if (!isOpen || !displayData) return null;

  const renderQaBadge = (qa: { label: string; qaClass: string; qualityFramework?: string }) => (
    <div className="badge-proof-emetteur-qa-row">
      <span className={`badge-proof-qa-badge ${qaCssClass(qa.qaClass)}`}>{qa.label}</span>
      {qa.qualityFramework && (
        <span className="badge-proof-qa-framework">{qa.qualityFramework}</span>
      )}
    </div>
  );

  return (
    <div className="modal-overlay badge-proof-modal-overlay" onClick={onClose} role="presentation">
      <div
        className="modal-content badge-proof-modal-content"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="badge-proof-title"
      >
        <div className="badge-proof-card">
          {/* Zone 1 — Header */}
          <section
            className="badge-proof-zone1"
            style={{ background: displayData.headerColor }}
            aria-label="Zone 1 — Identité du badge"
          >
            <button type="button" className="badge-proof-modal-close" onClick={onClose} aria-label="Fermer">
              ×
            </button>
            <div className="badge-proof-z1-top">
              <div className="badge-proof-z1-badge-wrap">
                <div className="badge-proof-z1-icon">{displayData.badgeAcronym}</div>
                <div>
                  <div className="badge-proof-z1-surtitle">Preuve Badge</div>
                  <h2 id="badge-proof-title" className="badge-proof-z1-title">
                    {displayData.badgeTitle}
                  </h2>
                  <div className="badge-proof-z1-pills">
                    {displayData.levelPill && (
                      <span className="badge-proof-pill badge-proof-pill-level">{displayData.levelPill}</span>
                    )}
                    {displayData.seriesPill && (
                      <span className="badge-proof-pill badge-proof-pill-series">{displayData.seriesPill}</span>
                    )}
                    {displayData.eqfFrameworkPill && (
                      <span className="badge-proof-pill badge-proof-pill-series">{displayData.eqfFrameworkPill}</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="badge-proof-z1-status">
                <div className="badge-proof-z1-attested">✓ Attesté</div>
                {displayData.proofNumber && (
                  <div className="badge-proof-z1-proof-num">{displayData.proofNumber}</div>
                )}
              </div>
            </div>
            {displayData.contextItems.length > 0 && (
              <div className="badge-proof-z1-context">
                {displayData.contextItems.map((item) => (
                  <div key={`${item.label}-${item.value}`}>
                    <div className="badge-proof-z1-ctx-label">{item.label}</div>
                    <div className="badge-proof-z1-ctx-value">{item.value}</div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Zone 2 — Porteur */}
          <section className="badge-proof-zone" aria-label="Zone 2 — Porteur">
            <div className="badge-proof-zone-label">Porteur</div>
            <div className="badge-proof-person-row">
              <div
                className={`badge-proof-avatar${displayData.receiver.masked ? ' badge-proof-avatar--masked' : ''}`}
                style={
                  displayData.receiver.masked
                    ? undefined
                    : {
                        background: displayData.receiver.avatarBg,
                        color: displayData.receiver.avatarColor,
                      }
                }
                aria-hidden={displayData.receiver.masked}
              >
                {displayData.receiver.initials}
              </div>
              <div>
                <div
                  className={`badge-proof-person-name${
                    displayData.receiver.masked ? ' badge-proof-person-name--masked' : ''
                  }`}
                >
                  {displayData.receiver.name}
                </div>
                {displayData.receiver.subtitle && (
                  <div className="badge-proof-person-sub">{displayData.receiver.subtitle}</div>
                )}
              </div>
            </div>
          </section>

          {/* Zone 3 — Émetteur */}
          <section className="badge-proof-zone" aria-label="Zone 3 — Émetteur du badge">
            <div className="badge-proof-zone-label">Émetteur du badge</div>
            {displayData.optionC ? (
              <div className="badge-proof-option-c">
                <div className="badge-proof-emetteur-block">
                  <p className="badge-proof-option-c-label">Émis par {displayData.optionC.issuedByOrg}</p>
                  {renderQaBadge(displayData.optionC.issuedByQa)}
                </div>
                <div className="badge-proof-authority-block">
                  <p className="badge-proof-authority-label">Accrédité par</p>
                  <p className="badge-proof-authority-name">{displayData.optionC.accreditedByOrg}</p>
                  {renderQaBadge(displayData.optionC.accreditedByQa)}
                </div>
              </div>
            ) : (
              displayData.sender && (
                <div className="badge-proof-emetteur-block">
                  <div
                    className={`badge-proof-avatar${displayData.senderCivilErased ? ' badge-proof-avatar--masked' : ''}`}
                    style={
                      displayData.senderCivilErased
                        ? undefined
                        : {
                            background: displayData.sender.avatarBg,
                            color: displayData.sender.avatarColor,
                          }
                    }
                  >
                    {displayData.sender.initials}
                  </div>
                  <div>
                    <div className="badge-proof-person-name">{displayData.sender.name}</div>
                    {displayData.sender.subtitle && (
                      <div className="badge-proof-person-sub">{displayData.sender.subtitle}</div>
                    )}
                    {!displayData.hideOrganizationName && displayData.orgName && (
                      <div className="badge-proof-emetteur-org">
                        <span className="badge-proof-flag">{displayData.countryFlag}</span>
                        <span className="badge-proof-org-name">{displayData.orgName}</span>
                      </div>
                    )}
                    {displayData.hideOrganizationName && (
                      <div className="badge-proof-emetteur-org">
                        <span className="badge-proof-flag">{displayData.countryFlag}</span>
                      </div>
                    )}
                    {renderQaBadge(displayData.qaBadge)}
                  </div>
                </div>
              )
            )}
          </section>

          {/* Zone 4 — Compétences ou présence */}
          <section className="badge-proof-zone" aria-label="Zone 4 — Compétences validées">
            <div className="badge-proof-zone-label">
              {displayData.zone4Mode === 'presence' ? 'Présence' : 'Compétences validées'}
            </div>
            {displayData.zone4Mode === 'presence' ? (
              <div className="badge-proof-presence-block">
                <span className="badge-proof-presence-icon" aria-hidden>
                  ✓
                </span>
                <div>
                  <div className="badge-proof-presence-text">{PRESENCE_VERIFIED_LABEL}</div>
                  {displayData.presenceDate && (
                    <div className="badge-proof-presence-sub">{displayData.presenceDate}</div>
                  )}
                  {displayData.presenceLocation && (
                    <div className="badge-proof-presence-sub">{displayData.presenceLocation}</div>
                  )}
                </div>
              </div>
            ) : displayData.skills.length > 0 ? (
              <ul className="badge-proof-skills">
                {displayData.skills.map((skill) => (
                  <li key={skill} className="badge-proof-skill-item">
                    <span className="badge-proof-skill-dot" aria-hidden />
                    <span className="badge-proof-skill-text">{skill}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="badge-proof-empty-hint">Aucune compétence indiquée</p>
            )}
          </section>

          {/* Zone 5 — Justificatif */}
          <section className="badge-proof-zone" aria-label="Zone 5 — Justificatif de l'attribution">
            <div className="badge-proof-zone-label">Justificatif de l&apos;attribution</div>
            <div
              className={`badge-proof-evidence${displayData.evidenceEmpty ? ' badge-proof-evidence--empty' : ''}`}
            >
              <div className="badge-proof-evidence-icon">{displayData.evidenceIcon}</div>
              <div>
                <div className="badge-proof-evidence-name">{displayData.evidenceName}</div>
                {displayData.evidenceHash && (
                  <div className="badge-proof-evidence-hash">evidence_hash : {displayData.evidenceHash}</div>
                )}
              </div>
            </div>
            {displayData.comment && (
              <div className="badge-proof-comment">
                <div className="badge-proof-comment-header">
                  <span>Commentaire de l&apos;émetteur</span>
                  {displayData.commentLanguage && (
                    <span className="badge-proof-comment-lang">🇫🇷 {displayData.commentLanguage}</span>
                  )}
                </div>
                <p className="badge-proof-comment-text">{displayData.comment}</p>
              </div>
            )}
            {(displayData.payloadHash || displayData.hashVersion) && (
              <div className="badge-proof-integrity">
                <div className="badge-proof-zone-label badge-proof-zone-label--inline">
                  Intégrité cryptographique
                </div>
                {displayData.payloadHash && (
                  <div className="badge-proof-integrity-row">
                    <span>payload_hash</span>
                    <span className="badge-proof-integrity-val">{displayData.payloadHash}</span>
                  </div>
                )}
                {displayData.hashVersion && (
                  <div className="badge-proof-integrity-row">
                    <span>hash_version</span>
                    <span className="badge-proof-integrity-val">{displayData.hashVersion}</span>
                  </div>
                )}
              </div>
            )}
            <div className="badge-proof-retention">{displayData.retentionText}</div>
            <div className="badge-proof-pp-link">
              <span className="badge-proof-pp-link-text">
                {displayData.projectProofPending
                  ? PROJECT_PROOF_PENDING_LABEL
                  : displayData.projectProofNumber
                    ? `PP·${displayData.projectProofNumber}`
                    : PROJECT_PROOF_PENDING_LABEL}
              </span>
            </div>
            <button
              type="button"
              className="badge-proof-verify-btn"
              onClick={() => {
                onClose();
                navigate(
                  buildVerifyPagePath({
                    proofNumber: displayData.proofNumber,
                    payloadHash: displayData.payloadHash,
                  })
                );
              }}
            >
              Vérifier cette preuve ↗
            </button>
          </section>

          {/* Zone 6 — Partager */}
          <section
            className="badge-proof-zone badge-proof-zone--share"
            aria-label="Zone 6 — Partager et exporter"
          >
            <div className="badge-proof-zone-label">Partager et exporter</div>
            {displayData.canControlOwnerVisibility && (
              <div className="badge-proof-privacy">
                <label className="badge-proof-privacy-toggle">
                  <input
                    type="checkbox"
                    className="badge-proof-privacy-checkbox"
                    checked={!displayData.showOwnerName}
                    disabled={privacySaving}
                    onChange={(e) => void handleMaskIdentityToggle(e.target.checked)}
                  />
                  <span className="badge-proof-privacy-label">{IDENTITY_MASKED_SHARE_LABEL}</span>
                </label>
                <p className="badge-proof-privacy-hint">{IDENTITY_MASKED_SHARE_HINT}</p>
                {!displayData.showOwnerName && (
                  <p className="badge-proof-privacy-preview">
                    Aperçu zone Porteur : identité masquée (avatar « ? », aucun nom affiché).
                  </p>
                )}
                {privacySaving && <p className="badge-proof-privacy-status">Enregistrement…</p>}
                {privacyError && <p className="badge-proof-privacy-error">{privacyError}</p>}
              </div>
            )}

            <div className="badge-proof-share-section">
              <p className="badge-proof-share-heading">Partager</p>
              <div className="badge-proof-share-row">
                <div
                  className="badge-proof-share-url"
                  title={displayData.shareUrlCopy}
                  aria-label="URL de partage"
                >
                  {displayData.shareUrl}
                </div>
                <button
                  type="button"
                  className="badge-proof-copy-btn"
                  onClick={handleCopyLink}
                  aria-label="Copier le lien de partage"
                >
                  {copied ? 'Copié' : 'Copier le lien'}
                </button>
              </div>
            </div>

            <p className="badge-proof-share-heading">Exporter</p>
            <div className="badge-proof-export-grid">
              <button type="button" className="badge-proof-export-btn">
                <span className="badge-proof-export-icon" aria-hidden>
                  📄
                </span>
                <span>Télécharger PDF</span>
                <span className="badge-proof-export-sub">Avec QR code /verify</span>
              </button>
              <button
                type="button"
                className="badge-proof-export-btn"
                disabled={displayData.jsonExportDisabled}
                title={displayData.jsonExportDisabled ? JSON_EXPORT_DISABLED_LABEL : undefined}
              >
                <span className="badge-proof-export-icon" aria-hidden>
                  {'{ }'}
                </span>
                <span>Exporter JSON</span>
                <span className="badge-proof-export-sub">{JSON_EXPORT_DISABLED_LABEL}</span>
              </button>
              <button type="button" className="badge-proof-export-btn">
                <span className="badge-proof-export-icon" aria-hidden>
                  🏅
                </span>
                <span>Ajouter au profil</span>
                <span className="badge-proof-export-sub">LinkedIn · Credly · Badgr</span>
              </button>
            </div>
            <div className="badge-proof-footer">
              <span>{displayData.footerRetentionNote}</span>
              <button type="button" className="badge-proof-rights">
                Exercer mes droits
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default BadgeProofModal;
