import React, { useEffect, useRef, useState } from 'react';
import {
  ActivePresenceSession,
  getPresenceSession,
  subscribePresenceSession,
} from '../../utils/presenceSessionStore';
import './PresenceBanner.css';

type BannerState = 'input' | 'confirmed' | 'error';

/**
 * Encart participant — bandeau persistant (KIN_UX_TOTP V1.1.2).
 * Couleur : --couleur-espace de l'espace participant (indigo #30387A).
 */
const PresenceBanner: React.FC = () => {
  const [session, setSession] = useState<ActivePresenceSession>(getPresenceSession);
  const [code, setCode] = useState('');
  const [state, setState] = useState<BannerState>('input');
  const announcedRef = useRef(false);

  useEffect(() => {
    setSession(getPresenceSession());
    return subscribePresenceSession(setSession);
  }, []);

  useEffect(() => {
    if (session.status === 'open' && !announcedRef.current) {
      announcedRef.current = true;
    }
    if (session.status !== 'open') {
      announcedRef.current = false;
      setState('input');
      setCode('');
    }
  }, [session.status]);

  if (session.status !== 'open') return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = code.replace(/\s/g, '');
    if (cleaned.length !== 6 || cleaned !== session.code) {
      // Message UNIQUE quel que soit le motif (expiré / incorrect / déjà saisi)
      setState('error');
      return;
    }
    setState('confirmed');
  };

  if (state === 'confirmed') {
    return (
      <div className="presence-banner confirmed" role="status">
        <div className="presence-banner-title-row">
          <span aria-hidden="true">✓</span>
          <div>
            <div className="presence-banner-title">Présence confirmée</div>
            <div className="presence-banner-meta">
              {session.slotLabel} du {session.sessionDateLabel} — bonne session !
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`presence-banner ${state === 'error' ? 'error' : ''}`}
      role="region"
      aria-label="Session de présence"
      aria-live={announcedRef.current ? 'off' : 'polite'}
    >
      <div className="presence-banner-title-row">
        <span aria-hidden="true">📍</span>
        <div className="presence-banner-title">Une session de présence est en cours</div>
      </div>
      <div className="presence-banner-meta">
        {session.formationTitle} — {session.slotLabel} · Saisissez le code affiché par votre
        formateur.
      </div>
      <form className="presence-banner-form" onSubmit={handleSubmit}>
        <input
          className="presence-banner-input"
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
        <button type="submit" className="presence-banner-submit" disabled={code.length < 6}>
          Confirmer ma présence
        </button>
      </form>
      {state === 'error' && (
        <div className="presence-banner-error">
          Ce code n&apos;est pas valide. Vérifiez le code actuellement affiché et réessayez.
        </div>
      )}
    </div>
  );
};

export default PresenceBanner;
