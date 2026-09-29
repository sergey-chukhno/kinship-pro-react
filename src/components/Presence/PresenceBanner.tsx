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
 * Popup participant — session de présence (KIN_UX_TOTP V1.2).
 * Design et textes du spec, présentés en popup.
 * Une fois le code validé pour une session ouverte, plus de demande (y compris après refresh).
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

  useEffect(() => {
    if (state !== 'confirmed' || dismissed) return;
    const t = window.setTimeout(() => setDismissed(true), 2500);
    return () => window.clearTimeout(t);
  }, [state, dismissed]);

  if (session.status !== 'open') return null;

  if (dismissed) {
    if (session.participantConfirmed || state === 'confirmed') return null;
    return (
      <button
        type="button"
        className="presence-popup-chip"
        onClick={() => setDismissed(false)}
        aria-label="Ouvrir la session de présence"
      >
        <span aria-hidden="true">📍</span>
        Session de présence
      </button>
    );
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

  return (
    <div
      className="presence-popup-overlay"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) setDismissed(true);
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
          <div className="presence-popup-confirmed">
            <span className="presence-popup-emoji" aria-hidden="true">
              ✓
            </span>
            <div>
              <h2 id="presence-popup-title" className="presence-popup-title ok">
                Présence confirmée
              </h2>
              <p className="presence-popup-meta">
                {session.slotLabel} du {session.sessionDateLabel} — bonne session !
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="presence-popup-heading">
              <span className="presence-popup-emoji" aria-hidden="true">
                📍
              </span>
              <h2 id="presence-popup-title" className="presence-popup-title">
                Une session de présence est en cours
              </h2>
            </div>
            <p className="presence-popup-meta">
              {session.formationTitle} — {session.slotLabel} · Saisissez le code affiché par votre
              formateur.
            </p>
            {state === 'error' && (
              <p className="presence-popup-error" role="alert">
                Ce code n&apos;est pas valide. Vérifiez le code actuellement affiché et réessayez.
              </p>
            )}
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
          </>
        )}
      </div>
    </div>
  );
};

export default PresenceBanner;
