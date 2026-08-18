import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getIdentity, getPublicDroits } from '../../api/AccountIdentity';
import {
  DROITS_RIGHTS,
  DELETE_CONFIRM_TEXT,
  DPO_INSTRUCTIONS,
  DroitsRightId,
  formatExecutionDate,
  formatReceiptMessage,
  MASK_CONFIRM_TEXT,
  MOCK_VALID_PIK,
  normalizePik,
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
type UnlockMethod = 'session' | 'pik' | null;

const FLOW_TITLES: Record<DroitsRightId, string> = {
  copy: 'Recevoir une copie de mes données',
  rectify: 'Rectifier mes données',
  mask: 'Masquer mon nom',
  export: 'Exporter mes données',
  delete: 'Supprimer mes données civiles',
  dpo: 'Contacter le délégué à la protection des données',
};

function looksLikeProofNumber(value: string): boolean {
  return /^PB[·.\-\s]/i.test(value.trim());
}

function rightCardDescription(right: (typeof DROITS_RIGHTS)[number], unlocked: boolean) {
  if (right.id === 'dpo' && !unlocked) {
    return (
      <>
        {right.descriptionLocked}{' '}
        <b>Toujours accessible — sans clé.</b>
      </>
    );
  }
  return unlocked ? right.descriptionUnlocked : right.descriptionLocked;
}

const PikDroits: React.FC = () => {
  const [unlocked, setUnlocked] = useState(false);
  const [unlockMethod, setUnlockMethod] = useState<UnlockMethod>(null);
  const [pikInput, setPikInput] = useState('');
  const [knownPik, setKnownPik] = useState<string | null>(null);
  const [pikError, setPikError] = useState<string | null>(null);
  const [rateLimited, setRateLimited] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);
  const [receipt, setReceipt] = useState<string | null>(null);
  const [activeFlow, setActiveFlow] = useState<DroitsRightId | null>(null);
  const [flowStep, setFlowStep] = useState<FlowStep>(0);
  const [maskScope, setMaskScope] = useState<'one' | 'all' | null>(null);
  const [proofNumber, setProofNumber] = useState('');
  const [proofNumberError, setProofNumberError] = useState(false);
  const [deleteConfirmPik, setDeleteConfirmPik] = useState('');
  const [deleteConfirmPassword, setDeleteConfirmPassword] = useState('');
  const [preparing, setPreparing] = useState(false);
  const [downloadReady, setDownloadReady] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(() => !!localStorage.getItem('jwt_token'));
  const [identityLoading, setIdentityLoading] = useState(() => !!localStorage.getItem('jwt_token'));
  const [accessChecking, setAccessChecking] = useState(false);

  useEffect(() => {
    let cancelled = false;

    void getPublicDroits().catch(() => null);

    const token = localStorage.getItem('jwt_token');
    if (!token) {
      setIsLoggedIn(false);
      setIdentityLoading(false);
      return;
    }

    setIsLoggedIn(true);

    (async () => {
      try {
        const identity = await getIdentity();
        if (cancelled) return;
        if (identity.identity_token) {
          setKnownPik(identity.identity_token);
          setPikInput(identity.identity_token);
          setUnlocked(true);
          setUnlockMethod('session');
          setPendingRequests((prev) =>
            prev.length > 0
              ? prev
              : [
                  {
                    id: 'demo-mask',
                    label: `Masquage — PB·2026·FR·3K1A… · exécution le ${formatExecutionDate().execution}`,
                  },
                ]
          );
        }
      } catch {
        // reste sur le flux saisie manuelle
      } finally {
        if (!cancelled) setIdentityLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const closeFlow = useCallback(() => {
    setActiveFlow(null);
    setFlowStep(0);
    setMaskScope(null);
    setProofNumber('');
    setProofNumberError(false);
    setDeleteConfirmPik('');
    setDeleteConfirmPassword('');
    setPreparing(false);
    setDownloadReady(false);
  }, []);

  const goBack = () => {
    if (activeFlow === 'mask') {
      if (flowStep === 1) {
        setFlowStep(0);
        setProofNumberError(false);
        return;
      }
      if (flowStep === 2) {
        setFlowStep(maskScope === 'all' ? 0 : 1);
        return;
      }
    }
    if (activeFlow === 'delete' && flowStep === 1) {
      setFlowStep(0);
      return;
    }
    closeFlow();
  };

  const openFlow = (id: DroitsRightId) => {
    if (!unlocked && id !== 'dpo') return;
    setActiveFlow(id);
    setFlowStep(0);
    setMaskScope(null);
    setProofNumber('');
    setProofNumberError(false);
    setDeleteConfirmPik('');
    setDeleteConfirmPassword('');
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

  const unlockRights = (method: UnlockMethod) => {
    setUnlocked(true);
    setUnlockMethod(method);
    setPikError(null);
    setAttempts(0);
    if (pendingRequests.length === 0) {
      setPendingRequests([
        {
          id: 'demo-mask',
          label: `Masquage — PB·2026·FR·3K1A… · exécution le ${formatExecutionDate().execution}`,
        },
      ]);
    }
  };

  const handleAccess = async () => {
    if (rateLimited || accessChecking) return;
    setAccessChecking(true);
    setPikError(null);

    try {
      const jwt = localStorage.getItem('jwt_token');
      let expected = knownPik;

      if (jwt) {
        try {
          const identity = await getIdentity();
          if (identity.identity_token) {
            expected = identity.identity_token;
            setKnownPik(identity.identity_token);
          }
        } catch {
          // pas de vérif serveur publique : on compare avec la clé déjà connue
        }
      }

      const pasted = normalizePik(pikInput);
      const matchesAccount = Boolean(expected && pasted === normalizePik(expected));
      const matchesDemo = pasted === normalizePik(MOCK_VALID_PIK);

      if (matchesAccount || matchesDemo) {
        unlockRights(jwt && matchesAccount ? 'session' : 'pik');
        return;
      }

      const nextAttempts = attempts + 1;
      setAttempts(nextAttempts);
      setPikError("Cette clé n'est pas reconnue");

      if (nextAttempts >= PIK_RATE_LIMIT) {
        setRateLimited(true);
        setPikError('Trop de tentatives. Réessayez dans 15 minutes.');
      }
    } finally {
      setAccessChecking(false);
    }
  };

  const cancelPending = (id: string) => {
    setPendingRequests((prev) => prev.filter((r) => r.id !== id));
  };

  const submitMask = () => {
    const dates = formatExecutionDate();
    const from = new Date();
    const label =
      maskScope === 'all'
        ? `Masquage — Toutes mes preuves · exécution le ${dates.execution}`
        : `Masquage — ${proofNumber.trim()} · exécution le ${dates.execution}`;
    setPendingRequests((prev) => [...prev, { id: `mask-${Date.now()}`, label }]);
    setReceipt(formatReceiptMessage(from));
    closeFlow();
  };

  const submitDelete = () => {
    const dates = formatExecutionDate();
    const from = new Date();
    setPendingRequests((prev) => [
      ...prev,
      {
        id: `delete-${Date.now()}`,
        label: `Suppression (anonymisation) · exécution le ${dates.execution}`,
      },
    ]);
    setReceipt(formatReceiptMessage(from));
    closeFlow();
  };

  const mockDownload = (filename: string) => {
    const blob = new Blob(
      [JSON.stringify({ mock: true, generatedAt: new Date().toISOString() }, null, 2)],
      { type: 'application/json' }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const deleteIdentityReady =
    unlockMethod === 'session'
      ? deleteConfirmPassword.length > 0
      : Boolean(knownPik && normalizePik(deleteConfirmPik) === normalizePik(knownPik));

  const flowTitle = activeFlow ? FLOW_TITLES[activeFlow] : '';

  const renderFlow = () => {
    if (!activeFlow) return null;

    return (
      <div className="pik-droits-flow-overlay" onClick={closeFlow} role="presentation">
        <div
          className="pik-droits-flow"
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
        >
          <div className="pik-droits-flow-header">
            <button type="button" className="pik-droits-flow-back" onClick={goBack} aria-label="Retour">
              ←
            </button>
            <span className="pik-droits-flow-title">{flowTitle}</span>
          </div>
          <div className="pik-droits-flow-body">
            {activeFlow === 'copy' && (
              <>
                {preparing && (
                  <div className="pik-droits-download-row">
                    <span className="pik-droits-download-status">
                      <span aria-hidden="true">⏳</span> Préparation en cours…
                    </span>
                    <button type="button" className="pik-droits-btn-download-disabled" disabled>
                      Télécharger
                    </button>
                  </div>
                )}
                {downloadReady && (
                  <button
                    type="button"
                    className="pik-droits-btn-primary"
                    onClick={() => mockDownload('kinship-donnees-copie.json')}
                  >
                    Télécharger
                  </button>
                )}
              </>
            )}

            {activeFlow === 'export' && (
              <>
                {preparing && (
                  <div className="pik-droits-download-row">
                    <span className="pik-droits-download-status">
                      <span aria-hidden="true">⏳</span> Préparation en cours…
                    </span>
                    <button type="button" className="pik-droits-btn-download-disabled" disabled>
                      Télécharger
                    </button>
                  </div>
                )}
                {downloadReady && (
                  <button
                    type="button"
                    className="pik-droits-btn-primary"
                    onClick={() => mockDownload('kinship-export-titulaire.json')}
                  >
                    Télécharger
                  </button>
                )}
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
                  <div className="pik-droits-flow-option-title">Une preuve précise</div>
                  <div className="pik-droits-flow-option-sub">
                    vous saisirez son numéro à l&apos;étape suivante
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
                    l&apos;ensemble de vos preuves ne vous nommera plus
                  </div>
                </button>
              </>
            )}

            {activeFlow === 'mask' && flowStep === 1 && (
              <>
                <div className="pik-droits-label">Numéro de la preuve</div>
                <input
                  type="text"
                  className="pik-droits-flow-input"
                  placeholder="PB·2026·FR·________"
                  value={proofNumber}
                  onChange={(e) => {
                    setProofNumber(e.target.value);
                    setProofNumberError(false);
                  }}
                  aria-invalid={proofNumberError}
                />
                <p className="pik-droits-flow-hint">
                  Il figure sur la preuve et dans votre copie de données.
                </p>
                <div className="pik-droits-flow-actions">
                  <button
                    type="button"
                    className="pik-droits-btn-primary"
                    disabled={!proofNumber.trim()}
                    onClick={() => {
                      if (!looksLikeProofNumber(proofNumber)) {
                        setProofNumberError(true);
                        return;
                      }
                      setFlowStep(2);
                    }}
                  >
                    Continuer
                  </button>
                </div>
                {proofNumberError && (
                  <div className="pik-droits-error" role="alert">
                    Ce numéro ne correspond pas à une preuve reliée à cette clé.
                  </div>
                )}
              </>
            )}

            {activeFlow === 'mask' && flowStep === 2 && (
              <>
                <div className="pik-droits-flow-warning">{MASK_CONFIRM_TEXT}</div>
                <div className="pik-droits-flow-actions">
                  <button type="button" className="pik-droits-btn-primary" onClick={submitMask}>
                    Confirmer le masquage
                  </button>
                  <button type="button" className="pik-droits-btn-secondary" onClick={goBack}>
                    Retour
                  </button>
                </div>
              </>
            )}

            {activeFlow === 'delete' && flowStep === 0 && (
              <>
                <p className="pik-droits-flow-question">Confirmez votre identité</p>
                {unlockMethod === 'session' ? (
                  <>
                    <div className="pik-droits-label">Entré par session</div>
                    <input
                      type="password"
                      className="pik-droits-flow-input pik-droits-flow-input-plain"
                      placeholder="Votre mot de passe"
                      value={deleteConfirmPassword}
                      onChange={(e) => setDeleteConfirmPassword(e.target.value)}
                      autoComplete="current-password"
                    />
                  </>
                ) : (
                  <>
                    <div className="pik-droits-label">Entré par clé PIK</div>
                    <input
                      type="text"
                      className="pik-droits-flow-input"
                      placeholder="Re-saisissez votre clé PIK…"
                      value={deleteConfirmPik}
                      onChange={(e) => setDeleteConfirmPik(e.target.value)}
                    />
                  </>
                )}
                <div className="pik-droits-flow-actions">
                  <button
                    type="button"
                    className="pik-droits-btn-primary"
                    disabled={!deleteIdentityReady}
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
                  <button type="button" className="pik-droits-btn-primary danger" onClick={submitDelete}>
                    Confirmer la suppression
                  </button>
                  <button type="button" className="pik-droits-btn-secondary" onClick={goBack}>
                    Retour
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
                🔐
              </span>
              <div>
                <h1>Exercer mes droits</h1>
                <p className="pik-droits-header-sub">KINSHIP SAS · Vos droits RGPD</p>
              </div>
            </div>
            <p className="pik-droits-header-intro">
              Votre <strong>Preuve d&apos;Identité Kinship (PIK)</strong> est disponible à tout moment
              dans votre compte, section « Mon identité Kinship ». Si votre compte a été supprimé ou
              anonymisé, saisissez ci-dessous le PIK que vous avez conservé pour accéder à vos droits.
            </p>
          </div>

          {unlocked && (
            <div className="pik-droits-unlocked-banner">
              ✓ Clé reconnue — vous pouvez exercer vos droits
            </div>
          )}

          {unlocked && receipt && <div className="pik-droits-receipt">{receipt}</div>}

          {unlocked && pendingRequests.length > 0 && (
            <div className="pik-droits-pending">
              <div className="pik-droits-pending-title">⏳ Demandes en cours</div>
              {pendingRequests.map((req) => (
                <div key={req.id} className="pik-droits-pending-item">
                  <span>{req.label}</span>
                  <button
                    type="button"
                    className="pik-droits-cancel-btn"
                    onClick={() => cancelPending(req.id)}
                  >
                    [Annuler]
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className={`pik-droits-pik-section ${unlocked ? 'hidden' : ''}`}>
            <div className="pik-droits-label">Votre Preuve d&apos;Identité Kinship (PIK)</div>
            <div className="pik-droits-pik-row">
              <input
                type="text"
                className="pik-droits-pik-input"
                placeholder="Collez votre token PIK ici..."
                value={pikInput}
                onChange={(e) => {
                  setPikInput(e.target.value);
                  setPikError(null);
                }}
                disabled={rateLimited || identityLoading || accessChecking}
                onKeyDown={(e) => e.key === 'Enter' && void handleAccess()}
              />
              <button
                type="button"
                className="pik-droits-access-btn"
                onClick={() => void handleAccess()}
                disabled={rateLimited || identityLoading || accessChecking || !pikInput.trim()}
              >
                Accéder à mes droits →
              </button>
            </div>
            <p className="pik-droits-pik-hint">
              Votre PIK est disponible dans votre compte, section « Mon identité Kinship ». Elle reste
              valide sans limite — Kinship ne vous l&apos;enverra jamais par email.
            </p>
            {pikError && (
              <div className="pik-droits-error" role="alert">
                {pikError}
              </div>
            )}
          </div>

          <div className="pik-droits-rights">
            <div className="pik-droits-rights-title">Vos droits disponibles</div>
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
                      <p className="pik-droits-right-desc">{rightCardDescription(right, unlocked)}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="pik-droits-footer">
            Responsable de traitement : Kinship SAS —{' '}
            <Link to="/privacy-policy" className="pik-droits-link">
              Notice RGPD
            </Link>
            {' · '}
            Délai de réponse : 1 mois (Art. 12(3)) · Réclamation : CNIL (Art. 77) · Clé compromise
            ou perdue ? Écrivez à dpo@kinshipedu.fr · © 2026 Kinship SAS
          </div>
        </div>
      </div>

      {renderFlow()}
    </div>
  );
};

export default PikDroits;
