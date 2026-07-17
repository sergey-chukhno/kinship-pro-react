import React, { useEffect, useRef, useState } from 'react';
import {
  ActivePresenceSession,
  getPresenceSession,
  subscribePresenceSession,
} from '../../utils/presenceSessionStore';
import './PresenceBanner.css';

type BannerState = 'input' | 'confirmed' | 'error';

/**
 * Popup participant — session de présence (KIN_UX_TOTP V1.1.2).
 * Couleur : --couleur-espace espace participant (indigo #30387A).
 */
const PresenceBanner: React.FC = () => {
  const [session, setSession] = useState<ActivePresenceSession>(getPresenceSession);
  const [code, setCode] = useState('');
  const [state, setState] = useState<BannerState>('input');
  const [dismissed, setDismissed] = useState(false);
  const announcedRef = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setSession(getPresenceSession());
    return subscribePresenceSession(setSession);
  }, []);

  useEffect(() => {
    if (session.status === 'open' && !announcedRef.current) {
      announcedRef.current = true;
      setDismissed(false);
    }
    if (session.status !== 'open') {
      announcedRef.current = false;
      setState('input');
      setCode('');
      setDismissed(false);
    }
  }, [session.status]);

  useEffect(() => {
    if (session.status === 'open' && !dismissed && state === 'input') {
      const t = window.setTimeout(() => inputRef.current?.focus(), 50);
      return () => window.clearTimeout(t);
    }
  }, [session.status, dismissed, state]);

  if (session.status !== 'open') return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = code.replace(/\s/g, '');
    if (cleaned.length !== 6 || cleaned !== session.code) {
      setState('error');
      return;
    }
    setState('confirmed');
  };

  const openPopup = () => setDismissed(false);

  // Après confirmation, « Fermer » masque complètement la popup
  if (dismissed) {
    if (state === 'confirmed') return null;
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
