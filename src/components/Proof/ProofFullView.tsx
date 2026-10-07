import React, { useState } from 'react';
import { ProofData } from '../../types/proof';
import { TRUST_LEVEL_STYLES } from '../../utils/proofTrustLevel';
import { useToast } from '../../hooks/useToast';
import {
  ProofFooter,
  ProofHeader,
  ProofSkillsList,
} from './ProofShared';
import './Proof.css';

interface ProofFullViewProps {
  proof: ProofData;
}

const EVIDENCE_ICONS: Record<string, string> = {
  video: '🎬',
  image: '🖼️',
  pdf: '📄',
  document: '📎',
};

/** Patrick — hide (do not delete) until re-enabled for production polish. */
const PROOF_PAGE_VISIBILITY = {
  integrityHashes: false,
  exportJson: false,
} as const;

export const ProofFullView: React.FC<ProofFullViewProps> = ({ proof }) => {
  const { showSuccess } = useToast();
  const [accordionOpen, setAccordionOpen] = useState(false);
  const [copyLabel, setCopyLabel] = useState('Copier le lien');
  const style = TRUST_LEVEL_STYLES[proof.trustLevel];

  const handleVerify = () => {
    window.open('/verify', '_blank', 'noopener,noreferrer');
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(`https://${proof.shareUrl}`);
      setCopyLabel('Copié ✓');
      showSuccess('Lien copié');
      setTimeout(() => setCopyLabel('Copier le lien'), 2000);
    } catch {
      setCopyLabel('Copier le lien');
    }
  };

  const holderDisplay = proof.holderName;

  const senderDisplay = proof.senderCivilErased ? 'Données civiles effacées' : proof.senderName;

  // Accordion « Détails et vérification » only when zone 5 has content (Patrick 07/10).
  const hasDetailsContent =
    Boolean(proof.evidence?.filename) ||
    Boolean(proof.senderComment) ||
    Boolean(proof.ppProofNumber) ||
    PROOF_PAGE_VISIBILITY.integrityHashes;

  return (
    <div className="proof-card">
      <ProofHeader proof={proof} />

      {/* Zone 2 — Titulaire (libellé "Titulaire" demandé par Patrick, 01/10) */}
      <div className="proof-zone proof-zone-main">
        <div className="proof-zone-label">Titulaire</div>
        <div className="proof-porteur-row">
          <div
            className={`proof-avatar ${proof.holderMasked ? 'proof-avatar-masked' : ''}`}
            style={proof.holderMasked ? undefined : style.avatarStyle}
          >
            {proof.holderInitials}
          </div>
          <div>
            <div className="proof-porteur-name">{holderDisplay}</div>
            {proof.holderRole ? (
              <div className="proof-porteur-role">{proof.holderRole}</div>
            ) : null}
          </div>
        </div>
      </div>

      {/* Zone 3 — Émetteur */}
      <div className="proof-zone proof-zone-main">
        <div className="proof-zone-label">Émetteur de la preuve</div>
        <div className="proof-emetteur-block">
          <div
            className="proof-avatar"
            style={proof.senderCivilErased ? { background: '#f1efe8', color: '#9e9d97' } : style.avatarStyle}
          >
            {proof.senderCivilErased ? '—' : proof.senderInitials}
          </div>
          <div style={{ flex: 1 }}>
            <div className="proof-emetteur-name">{senderDisplay}</div>
            {!proof.senderCivilErased && proof.senderJob && (
              <div className="proof-emetteur-job">{proof.senderJob}</div>
            )}
            {!proof.senderCivilErased && proof.senderOrg && (
              <div className="proof-emetteur-org">
                <span>{proof.senderCountryFlag}</span>
                <span className="proof-org-name">{proof.senderOrg}</span>
              </div>
            )}
            {!proof.senderCivilErased && (
              <div className="proof-emetteur-org" style={{ marginTop: 6 }}>
                <span className={`proof-qa-badge ${style.qaClass}`}>{proof.qaLabel}</span>
              </div>
            )}
            {proof.authority && (
              <div className="proof-authority-block">
                <div className="proof-authority-label">Accrédité par</div>
                <div className="proof-authority-name">{proof.authority.name}</div>
                <span
                  className={`proof-qa-badge ${TRUST_LEVEL_STYLES[proof.authority.trustLevel].qaClass}`}
                  style={{ fontSize: 10, padding: '2px 7px', marginTop: 4 }}
                >
                  {proof.authority.qaLabel}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Zone 4 — Compétences (masquée si liste vide et pas de présence vérifiée) */}
      {(proof.presenceVerified || proof.skills.length > 0) && (
        <div className="proof-zone proof-zone-main">
          <div className="proof-zone-label" style={{ color: style.accentColor }}>
            Compétences
            {proof.eventLanguage && (
              <span style={{ fontWeight: 400, marginLeft: 8, textTransform: 'none', letterSpacing: 0 }}>
                {proof.eventLanguage}
              </span>
            )}
          </div>
          <ProofSkillsList proof={proof} />
        </div>
      )}

      {/* Bouton Vérifier — gated par verify_service_enabled (contrat Sergey/Patrick 01/10, même flag serveur que GET /api/v1/proofs/verify/*) */}
      {proof.verifyServiceEnabled && (
        <div className="proof-zone" style={{ padding: '12px 24px' }}>
          <button
            type="button"
            className="proof-verify-btn"
            style={{ background: style.accentColor, margin: 0 }}
            onClick={handleVerify}
          >
            Vérifier cette preuve ↗
          </button>
        </div>
      )}

      {/* Accordéon Zone 5 — uniquement s’il y a du contenu (Patrick 07/10) */}
      {hasDetailsContent && (
        <>
          <button
            type="button"
            className="proof-accordion-trigger"
            onClick={() => setAccordionOpen((open) => !open)}
            aria-expanded={accordionOpen}
          >
            <span className="proof-accordion-title">Détails et vérification</span>
            <span className={`proof-accordion-arrow ${accordionOpen ? 'open' : ''}`}>▼</span>
          </button>

          {accordionOpen && (
            <div className="proof-zone">
              {proof.evidence.filename ? (
                <>
                  <div className="proof-zone-label">Justificatif de l&apos;attribution</div>
                  <div className="proof-evidence-block">
                    <div className="proof-evidence-icon">
                      {EVIDENCE_ICONS[proof.evidence.type ?? 'document'] ?? '📎'}
                    </div>
                    <div>
                      <div className="proof-evidence-name">{proof.evidence.filename}</div>
                      {proof.evidence.hash && (
                        <div className="proof-evidence-hash">evidence_hash : {proof.evidence.hash}</div>
                      )}
                    </div>
                  </div>
                </>
              ) : null}

              {proof.senderComment && (
                <div className="proof-comment-block">
                  <div className="proof-comment-header">
                    <span className="proof-comment-label">Commentaire de l&apos;émetteur</span>
                    {proof.senderCommentLang && (
                      <span className="proof-comment-lang">{proof.senderCommentLang}</span>
                    )}
                  </div>
                  <div className="proof-comment-text">{proof.senderComment}</div>
                </div>
              )}

              {PROOF_PAGE_VISIBILITY.integrityHashes && (
                <div style={{ margin: '10px 0 6px' }}>
                  <div className="proof-zone-label" style={{ marginBottom: 6 }}>
                    🔐 Intégrité &amp; vérification
                  </div>
                  <div className="proof-integrity-row">
                    <span className="proof-integrity-key">payload_hash</span>
                    <span className="proof-integrity-val">{proof.payloadHash}</span>
                  </div>
                  <div className="proof-integrity-row">
                    <span className="proof-integrity-key">hash_version</span>
                    <span className="proof-integrity-val">{proof.hashVersion}</span>
                  </div>
                </div>
              )}

              {proof.ppProofNumber ? (
                <div className="proof-pp-link">Voir la Preuve Projet →</div>
              ) : null}
            </div>
          )}
        </>
      )}

      {/* Zone 6 — Partager (hors accordéon ; hide when no share_token e.g. post-assign card) */}
      {proof.shareToken ? (
        <div className="proof-zone">
          <div className="proof-zone-label">Partager et exporter</div>
          <div className="proof-share-row">
            <div className="proof-share-url">{proof.shareUrl}</div>
            <button type="button" className="proof-copy-btn" onClick={handleCopyLink}>
              {copyLabel}
            </button>
          </div>
          <div className="proof-export-grid">
            <button type="button" className="proof-export-btn">
              <span className="proof-export-icon">📄</span>
              <span className="proof-export-label">Télécharger PDF</span>
              <span className="proof-export-sub">Avec QR code /verify</span>
            </button>
            {PROOF_PAGE_VISIBILITY.exportJson && (
              <button type="button" className="proof-export-btn" disabled>
                <span className="proof-export-icon">{'{ }'}</span>
                <span className="proof-export-label">Exporter JSON</span>
                <span className="proof-export-sub">Bientôt disponible</span>
              </button>
            )}
            <button type="button" className="proof-export-btn">
              <span className="proof-export-icon">🏅</span>
              <span className="proof-export-label">Ajouter à un profil</span>
              <span className="proof-export-sub">LinkedIn · Credly · Badgr</span>
            </button>
          </div>
        </div>
      ) : null}

      {/* Footer — toujours visible */}
      <ProofFooter proof={proof} />
    </div>
  );
};

export default ProofFullView;
