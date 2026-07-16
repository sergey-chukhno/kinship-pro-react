import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  DROITS_RIGHTS,
  DELETE_CONFIRM_TEXT,
  DPO_INSTRUCTIONS,
  DroitsRightId,
  formatExecutionDate,
  isValidPik,
  MASK_CONFIRM_TEXT,
  MOCK_VALID_PIK,
  PIK_RATE_LIMIT,
  RECTIFY_INSTRUCTIONS,
} from '../../data/droitsContent';
import './Pik.css';
import './PikDroits.css';

interface PendingRequest {
  id: string;
  label: string;
}

type FlowStep = number;

const FLOW_TITLES: Record<DroitsRightId, string> = {
  copy: 'Recevoir une copie',
  rectify: 'Rectifier mes données',
  mask: 'Masquer mon nom',
  export: 'Exporter mes données',
  delete: 'Supprimer mes données',
  dpo: 'Contacter le DPO',
};

const PikDroits: React.FC = () => {
  const [unlocked, setUnlocked] = useState(false);
  const [pikInput, setPikInput] = useState('');
  const [pikError, setPikError] = useState<string | null>(null);
  const [rateLimited, setRateLimited] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);
  const [activeFlow, setActiveFlow] = useState<DroitsRightId | null>(null);
  const [flowStep, setFlowStep] = useState<FlowStep>(0);
  const [maskScope, setMaskScope] = useState<'one' | 'all' | null>(null);
  const [proofNumber, setProofNumber] = useState('');
  const [deleteConfirmPik, setDeleteConfirmPik] = useState('');
  const [preparing, setPreparing] = useState(false);
  const [downloadReady, setDownloadReady] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(() => !!localStorage.getItem('jwt_token'));

  useEffect(() => {
    const token = localStorage.getItem('jwt_token');
    if (token) {
      setIsLoggedIn(true);
      setUnlocked(true);
      setPikInput(MOCK_VALID_PIK);
      setPendingRequests([
        {
          id: 'demo-mask',
          label: 'Masquage — Preuve PP-2024-LYC-0042 — exécution dans 72 h',
        },
      ]);
    }
  }, []);

  const closeFlow = useCallback(() => {
    setActiveFlow(null);
    setFlowStep(0);
    setMaskScope(null);
    setProofNumber('');
    setDeleteConfirmPik('');
    setPreparing(false);
    setDownloadReady(false);
  }, []);

  const openFlow = (id: DroitsRightId) => {
    if (!unlocked && id !== 'dpo') return;
    setActiveFlow(id);
    setFlowStep(0);
    setMaskScope(null);
    setProofNumber('');
    setDeleteConfirmPik('');
    setPreparing(false);
    setDownloadReady(false);

    if (id === 'copy' || id === 'export') {
      setPreparing(true);
      window.setTimeout(() => {
        setPreparing(false);
        setDownloadReady(true);
      }, 1500);
    }
  };

  const handleAccess = () => {
    if (rateLimited) return;

    if (isValidPik(pikInput)) {
      setUnlocked(true);
      setPikError(null);
      setAttempts(0);
      if (pendingRequests.length === 0) {
        setPendingRequests([
          {
            id: 'demo-mask',
            label: 'Masquage — Preuve PP-2024-LYC-0042 — exécution dans 72 h',
          },
        ]);
      }
      return;
    }

    const nextAttempts = attempts + 1;
    setAttempts(nextAttempts);
    setPikError("Cette clé n'est pas reconnue");

    if (nextAttempts >= PIK_RATE_LIMIT) {
      setRateLimited(true);
      setPikError('Trop de tentatives. Réessayez dans 15 minutes.');
    }
  };

  const cancelPending = (id: string) => {
    setPendingRequests((prev) => prev.filter((r) => r.id !== id));
  };

  const submitMask = () => {
    const dates = formatExecutionDate();
    const label =
      maskScope === 'all'
        ? `Masquage — Toutes mes preuves — exécution le ${dates.execution}`
        : `Masquage — Preuve ${proofNumber.trim()} — exécution le ${dates.execution}`;
    setPendingRequests((prev) => [
      ...prev,
      { id: `mask-${Date.now()}`, label },
    ]);
    setFlowStep(3);
  };

  const submitDelete = () => {
    const dates = formatExecutionDate();
    setPendingRequests((prev) => [
      ...prev,
      {
        id: `delete-${Date.now()}`,
        label: `Suppression données civiles — exécution le ${dates.execution}`,
      },
    ]);
    setFlowStep(2);
  };

  const mockDownload = (filename: string) => {
    const blob = new Blob([JSON.stringify({ mock: true, generatedAt: new Date().toISOString() }, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const renderFlow = () => {
    if (!activeFlow) return null;
    const title = FLOW_TITLES[activeFlow];

    return (
      <div className="pik-droits-flow-overlay" onClick={closeFlow} role="presentation">
        <div className="pik-droits-flow" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
          <div className="pik-droits-flow-header">
            <button type="button" className="pik-droits-flow-back" onClick={closeFlow}>
              ← Retour
            </button>
            <span className="pik-droits-flow-title">{title}</span>
          </div>
          <div className="pik-droits-flow-body">
            {activeFlow === 'copy' && (
              <>
                <div className="pik-droits-download-row">
                  <span className="pik-droits-download-status">
                    {preparing ? '⏳ Préparation de votre copie…' : '✓ Copie prête'}
                  </span>
                  {downloadReady && (
                    <button
                      type="button"
                      className="pik-droits-btn-primary"
                      onClick={() => mockDownload('kinship-donnees-copie.json')}
                    >
                      Télécharger
                    </button>
                  )}
                </div>
                <p className="pik-droits-flow-hint">
                  Vos données, la liste de vos preuves (avec numéros) et le lien Notice RGPD — Art. 15
                </p>
              </>
            )}

            {activeFlow === 'export' && (
              <>
                <div className="pik-droits-download-row">
                  <span className="pik-droits-download-status">
                    {preparing ? '⏳ Préparation du paquet JSON…' : '✓ Paquet prêt'}
                  </span>
                  {downloadReady && (
                    <button
                      type="button"
                      className="pik-droits-btn-primary"
                      onClick={() => mockDownload('kinship-export-titulaire.json')}
                    >
                      Télécharger
                    </button>
                  )}
                </div>
                <p className="pik-droits-flow-hint">
                  Export JSON complet du titulaire — le réglage public json_export_enabled ne s&apos;applique jamais au titulaire — Art. 20
                </p>
              </>
            )}

            {activeFlow === 'rectify' && (
              <div className="pik-droits-flow-info">{RECTIFY_INSTRUCTIONS}</div>
            )}

            {activeFlow === 'dpo' && (
              <div className="pik-droits-flow-info">{DPO_INSTRUCTIONS}</div>
            )}

            {activeFlow === 'mask' && flowStep === 0 && (
              <>
                <p className="pik-droits-flow-question">Que souhaitez-vous masquer ?</p>
                <button
                  type="button"
                  className="pik-droits-flow-option"
                  onClick={() => {
                    setMaskScope('one');
                    setFlowStep(1);
                  }}
                >
                  <div className="pik-droits-flow-option-title">Une preuve</div>
                  <div className="pik-droits-flow-option-sub">
                    Saisir le numéro de la preuve concernée
                  </div>
                </button>
                <button
                  type="button"
                  className="pik-droits-flow-option"
                  onClick={() => {
                    setMaskScope('all');
                    setFlowStep(2);
                  }}
                >
                  <div className="pik-droits-flow-option-title">Toutes mes preuves</div>
                  <div className="pik-droits-flow-option-sub">
                    Retirer votre nom de l&apos;ensemble de vos preuves
                  </div>
                </button>
              </>
            )}

            {activeFlow === 'mask' && flowStep === 1 && (
              <>
                <p className="pik-droits-flow-question">Numéro de la preuve</p>
                <input
                  type="text"
                  className="pik-droits-flow-input"
                  placeholder="Ex. PP-2024-LYC-0042"
                  value={proofNumber}
                  onChange={(e) => setProofNumber(e.target.value)}
                />
                <p className="pik-droits-flow-hint">
                  Il figure sur la preuve et dans votre copie de données.
                </p>
                <div className="pik-droits-flow-actions">
                  <button
                    type="button"
                    className="pik-droits-btn-primary"
                    disabled={!proofNumber.trim()}
                    onClick={() => setFlowStep(2)}
                  >
                    Continuer
                  </button>
                </div>
              </>
            )}

            {activeFlow === 'mask' && flowStep === 2 && (
              <>
                <div className="pik-droits-flow-warning">{MASK_CONFIRM_TEXT}</div>
                <div className="pik-droits-flow-actions">
                  <button type="button" className="pik-droits-btn-secondary" onClick={closeFlow}>
                    Annuler
                  </button>
                  <button type="button" className="pik-droits-btn-primary" onClick={submitMask}>
                    Confirmer le masquage
                  </button>
                </div>
              </>
            )}

            {activeFlow === 'mask' && flowStep === 3 && (
              <>
                <div className="pik-droits-flow-success">
                  ✓ Demande enregistrée le {formatExecutionDate().registered}
                  <br />
                  Exécution prévue le {formatExecutionDate().execution}
                  <br />
                  Annulable d&apos;ici là depuis cette page avec votre clé.
                </div>
                <div className="pik-droits-flow-actions">
                  <button type="button" className="pik-droits-btn-primary" onClick={closeFlow}>
                    Fermer
                  </button>
                </div>
              </>
            )}

            {activeFlow === 'delete' && flowStep === 0 && (
              <>
                <p className="pik-droits-flow-question">Re-saisissez votre clé PIK pour confirmer votre identité</p>
                <input
                  type="text"
                  className="pik-droits-flow-input"
                  placeholder={MOCK_VALID_PIK}
                  value={deleteConfirmPik}
                  onChange={(e) => setDeleteConfirmPik(e.target.value)}
                />
                <div className="pik-droits-flow-actions">
                  <button
                    type="button"
                    className="pik-droits-btn-primary"
                    disabled={!isValidPik(deleteConfirmPik)}
                    onClick={() => setFlowStep(1)}
                  >
                    Continuer
                  </button>
                </div>
              </>
            )}

            {activeFlow === 'delete' && flowStep === 1 && (
              <>
                <div className="pik-droits-flow-warning">{DELETE_CONFIRM_TEXT}</div>
                <div className="pik-droits-flow-actions">
                  <button type="button" className="pik-droits-btn-secondary" onClick={closeFlow}>
                    Annuler
                  </button>
                  <button type="button" className="pik-droits-btn-primary danger" onClick={submitDelete}>
                    Confirmer la suppression
                  </button>
                </div>
              </>
            )}

            {activeFlow === 'delete' && flowStep === 2 && (
              <>
                <div className="pik-droits-flow-success">
                  ✓ Demande enregistrée le {formatExecutionDate().registered}
                  <br />
                  Exécution prévue le {formatExecutionDate().execution}
                  <br />
                  Annulable d&apos;ici là depuis cette page avec votre clé.
                </div>
                <div className="pik-droits-flow-actions">
                  <button type="button" className="pik-droits-btn-primary" onClick={closeFlow}>
                    Fermer
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="pik-page">
      <div className="pik-droits-page">
        {isLoggedIn && (
          <div className="pik-droits-back-link-wrap">
            <Link to="/pik" className="pik-link">
              ← Retour à l&apos;espace PIK
            </Link>
          </div>
        )}

        <div className="pik-droits-card">
          <div className="pik-droits-header">
            <div className="pik-droits-header-top">
              <span className="pik-droits-header-icon" aria-hidden="true">
                ⚖️
              </span>
              <div>
                <h1>Exercer mes droits</h1>
                <p className="pik-droits-header-sub">KINSHIP · Vos droits RGPD</p>
              </div>
            </div>
            <p className="pik-droits-header-intro">
              Votre <strong>Preuve d&apos;Identité Kinship (PIK)</strong> vous permet d&apos;exercer vos droits
              sur vos données et vos preuves — même sans compte actif. Saisissez votre clé pour accéder à
              l&apos;ensemble des actions.
            </p>
          </div>

          {unlocked && (
            <div className="pik-droits-unlocked-banner">✓ Clé reconnue</div>
          )}

          {unlocked && pendingRequests.length > 0 && (
            <div className="pik-droits-pending" style={{ marginTop: 16 }}>
              <div className="pik-droits-pending-title">⏳ Demandes en cours</div>
              {pendingRequests.map((req) => (
                <div key={req.id} className="pik-droits-pending-item">
                  <span>{req.label}</span>
                  <button
                    type="button"
                    className="pik-droits-cancel-btn"
                    onClick={() => cancelPending(req.id)}
                  >
                    Annuler
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className={`pik-droits-pik-section ${unlocked ? 'hidden' : ''}`}>
            <div className="pik-droits-label">Votre clé PIK</div>
            <div className="pik-droits-pik-row">
              <input
                type="text"
                className="pik-droits-pik-input"
                placeholder="XXXX–XXXX–XXXX–XXXX–XXXX–XXXX"
                value={pikInput}
                onChange={(e) => {
                  setPikInput(e.target.value);
                  setPikError(null);
                }}
                disabled={rateLimited}
                onKeyDown={(e) => e.key === 'Enter' && handleAccess()}
              />
              <button
                type="button"
                className="pik-droits-access-btn"
                onClick={handleAccess}
                disabled={rateLimited || !pikInput.trim()}
              >
                Accéder à mes droits →
              </button>
            </div>
            <p className="pik-droits-pik-hint">
              Kinship ne vous demandera jamais votre clé par email. Conservez-la en lieu sûr.
            </p>
            {pikError && <div className="pik-droits-error">{pikError}</div>}
          </div>

          <div className="pik-droits-rights">
            <div className="pik-droits-rights-list">
              {DROITS_RIGHTS.map((right) => {
                const isActive = unlocked || right.alwaysActive;
                const cardClass = [
                  'pik-droits-right-card',
                  isActive ? 'clickable' : 'locked',
                  right.alwaysActive && !unlocked ? 'dpo-unlocked' : '',
                ]
                  .filter(Boolean)
                  .join(' ');

                return (
                  <button
                    key={right.id}
                    type="button"
                    className={cardClass}
                    onClick={() => openFlow(right.id)}
                    disabled={!isActive}
                  >
                    <div
                      className="pik-droits-right-icon"
                      style={{ background: right.iconBg }}
                      aria-hidden="true"
                    >
                      {right.icon}
                    </div>
                    <div>
                      <div className="pik-droits-right-title">{right.title}</div>
                      <p className="pik-droits-right-desc">
                        {unlocked ? right.descriptionUnlocked : right.descriptionLocked}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="pik-droits-footer">
            Kinship SAS — Responsable de traitement. DPO : dpo@kinshipedu.fr
            <br />
            <Link to="/privacy-policy" className="pik-droits-link">
              Politique de confidentialité
            </Link>
            {' · '}
            Base légale et durées de conservation : voir Notice RGPD accessible depuis votre copie de données.
          </div>
        </div>
      </div>

      {renderFlow()}
    </div>
  );
};

export default PikDroits;
