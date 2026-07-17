import React, { useEffect, useRef, useState } from 'react';
import {
  ActivePresenceSession,
  getPresenceSession,
  hasConfirmedPresenceSession,
  markPresenceSessionConfirmed,
  subscribePresenceSession,
} from '../../utils/presenceSessionStore';
import './PresenceBanner.css';

type BannerState = 'input' | 'confirmed' | 'error';

function readInitialSession(): ActivePresenceSession {
  return getPresenceSession();
}

/**
 * Popup participant — session de présence (KIN_UX_TOTP V1.1.2).
 * Une fois le code validé pour une session ouverte, plus de demande (y compris après refresh).
 * Une nouvelle ouverture de session redemande le code.
 */
const PresenceBanner: React.FC = () => {
  const [session, setSession] = useState<ActivePresenceSession>(readInitialSession);
  const alreadyConfirmed = hasConfirmedPresenceSession(session);
  const [code, setCode] = useState('');
  const [state, setState] = useState<BannerState>(alreadyConfirmed ? 'confirmed' : 'input');
  const [dismissed, setDismissed] = useState(alreadyConfirmed);
  const announcedRef = useRef(false);
  const lastSessionIdRef = useRef<string>(session.sessionId || '');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setSession(getPresenceSession());
    return subscribePresenceSession(setSession);
  }, []);

  useEffect(() => {
    if (session.status !== 'open') {
      announcedRef.current = false;
      setState('input');
      setCode('');
      setDismissed(false);
      lastSessionIdRef.current = '';
      return;
    }

    if (session.participantConfirmed) {
      setState('confirmed');
      setDismissed(true);
      announcedRef.current = true;
      lastSessionIdRef.current = session.sessionId;
      return;
    }

    const isNewSession = session.sessionId !== lastSessionIdRef.current;
    lastSessionIdRef.current = session.sessionId;

    if (isNewSession) {
      announcedRef.current = true;
      setDismissed(false);
      setState('input');
      setCode('');
    }
  }, [session.status, session.sessionId, session.participantConfirmed]);

  useEffect(() => {
    if (
      session.status === 'open' &&
      !session.participantConfirmed &&
      !dismissed &&
      state === 'input'
    ) {
      const t = window.setTimeout(() => inputRef.current?.focus(), 50);
      return () => window.clearTimeout(t);
    }
  }, [session.status, session.participantConfirmed, dismissed, state]);

  if (session.status !== 'open') return null;

  // Déjà confirmé pour cette session → rien à afficher (y compris au 1er rendu après refresh)
  if (session.participantConfirmed || (state === 'confirmed' && dismissed)) {
    return null;
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = code.replace(/\s/g, '');
    const current = getPresenceSession();
    if (cleaned.length !== 6 || cleaned !== current.code) {
      setState('error');
      return;
    }
    const next = markPresenceSessionConfirmed();
    setSession(next);
    setState('confirmed');
  };

  const openPopup = () => setDismissed(false);

  if (dismissed) {
    return (
      <button
        type="button"
        className="presence-popup-chip"
        onClick={openPopup}
        aria-label="Ouvrir la session de présence"
      >
        <span aria-hidden="true">📍</span>
        Session de présence
      </button>
    );
  }

  return (
    <div
      className="presence-popup-overlay"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget && state !== 'confirmed') {
          setDismissed(true);
        }
      }}
    >
      <div
        className={`presence-popup ${state === 'error' ? 'error' : ''} ${
          state === 'confirmed' ? 'confirmed' : ''
        }`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="presence-popup-title"
        aria-live={announcedRef.current ? 'off' : 'polite'}
      >
        {state !== 'confirmed' && (
          <button
            type="button"
            className="presence-popup-close"
            onClick={() => setDismissed(true)}
            aria-label="Fermer"
            title="Plus tard"
          >
            ×
          </button>
        )}

        {state === 'confirmed' ? (
          <div className="presence-popup-body confirmed-body">
            <div className="presence-popup-icon ok" aria-hidden="true">
              ✓
            </div>
            <h2 id="presence-popup-title" className="presence-popup-title">
              Présence confirmée
            </h2>
            <p className="presence-popup-meta">
              {session.slotLabel} du {session.sessionDateLabel} — bonne session !
            </p>
            <button
              type="button"
              className="presence-popup-submit"
              onClick={() => setDismissed(true)}
            >
              Fermer
            </button>
          </div>
        ) : (
          <div className="presence-popup-body">
            <div className="presence-popup-icon" aria-hidden="true">
              📍
            </div>
            <h2 id="presence-popup-title" className="presence-popup-title">
              Une session de présence est en cours
            </h2>
            <p className="presence-popup-meta">
              {session.formationTitle} — {session.slotLabel}
              <br />
              Saisissez le code affiché par votre formateur.
            </p>

            <form className="presence-popup-form" onSubmit={handleSubmit}>
              <input
                ref={inputRef}
                className="presence-popup-input"
                placeholder="______"
                value={code}
                onChange={(e) => {
                  const v = e.target.value.replace(/\D/g, '').slice(0, 6);
                  setCode(v);
                  if (state === 'error') setState('input');
                }}
                inputMode="numeric"
                autoComplete="one-time-code"
                aria-label="Code de session"
                maxLength={6}
              />
              <button
                type="submit"
                className="presence-popup-submit"
                disabled={code.length < 6}
              >
                Confirmer ma présence
              </button>
            </form>

            {state === 'error' && (
              <p className="presence-popup-error">
                Ce code n&apos;est pas valide. Vérifiez le code actuellement affiché et
                réessayez.
              </p>
            )}

            <button
              type="button"
              className="presence-popup-later"
              onClick={() => setDismissed(true)}
            >
              Plus tard
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default PresenceBanner;
