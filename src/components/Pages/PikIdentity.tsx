import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getIdentity, getIdentityEncart } from '../../api/AccountIdentity';
import { useToast } from '../../hooks/useToast';
import './Pik.css';

const MOCK_PIK = '3F7K–92MX–Q8ZR–1DPW–K4NB–X6TJ';

const PikIdentity: React.FC = () => {
  const { showSuccess, showError } = useToast();
  const [pik, setPik] = useState(MOCK_PIK);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const identity = await getIdentity();
        // encart dispo pour usage futur / dashboard — sans changer l'UI ici
        void getIdentityEncart().catch(() => null);
        if (cancelled) return;
        if (identity.identity_token) {
          setPik(identity.identity_token);
        }
      } catch {
        if (!cancelled) {
          showError('Impossible de charger votre PIK');
        }
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only; avoid toast ref loop
  }, []);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(pik);
      showSuccess('Clé copiée dans le presse-papier');
    } catch {
      showError('Impossible de copier la clé');
    }
  };

  return (
    <div className="pik-card">
      <div className="pik-card-header">
        <div className="pik-card-header-top">
          <span className="pik-header-icon" aria-hidden="true">🔑</span>
          <div>
            <h1>Mon identité Kinship</h1>
            <p className="pik-card-subtitle">KINSHIP · Votre clé personnelle</p>
          </div>
        </div>
        <p className="pik-card-intro">
          Votre <strong>Preuve d&apos;Identité Kinship (PIK)</strong> est votre clé personnelle.
          Elle vous permet d&apos;exercer vos droits sur vos preuves à tout moment — y compris si
          votre compte est un jour supprimé ou anonymisé.
        </p>
      </div>

      <div className="pik-key-section">
        <div className="pik-key-label">Votre Preuve d&apos;Identité Kinship (PIK)</div>
        <div className="pik-key-row">
          <div className="pik-key-value">{pik}</div>
          <button type="button" className="pik-copy-btn" onClick={handleCopy}>
            Copier
          </button>
        </div>
        <p className="pik-key-hint">
          Conservez-la précieusement — dans un gestionnaire de mots de passe de préférence.
          Elle reste valide sans limite de durée. Kinship ne vous l&apos;enverra jamais par email
          et ne vous la demandera jamais.
        </p>
      </div>

      <div className="pik-info-cards">
        <div className="pik-info-card">
          <div className="pik-info-icon pik-info-icon-shield" aria-hidden="true">🛡️</div>
          <div className="pik-info-content">
            <div className="pik-info-title">À quoi sert cette clé</div>
            <p className="pik-info-text">
              Elle est votre passe-droits : sur la page « Exercer mes droits », elle vous permet
              d&apos;obtenir une copie de vos données, de masquer votre nom sur vos preuves, ou
              d&apos;effacer vos données personnelles — même sans compte.{' '}
              <Link to="/pik/droits" className="pik-link">Exercer mes droits →</Link>
            </p>
          </div>
        </div>

        <div className="pik-info-card">
          <div className="pik-info-icon pik-info-icon-lock" aria-hidden="true">🔒</div>
          <div className="pik-info-content">
            <div className="pik-info-title">Votre clé ne change jamais</div>
            <p className="pik-info-text">
              Elle est unique et vous suit à vie — personne ne peut la remplacer, pas même vous.
              Gardez-la secrète, comme un mot de passe. En cas de doute (clé vue ou copiée par
              quelqu&apos;un d&apos;autre), écrivez à{' '}
              <a href="mailto:dpo@kinshipedu.fr" className="pik-link">dpo@kinshipedu.fr</a>
              {' '} : chaque demande passe par des confirmations et des limites strictes qui
              protègent vos droits.
            </p>
          </div>
        </div>
      </div>

      <div className="pik-card-footer">
        Une seule clé, unique et à vie · En cas de perte : votre clé reste visible ici tant que
        votre compte existe · Questions :{' '}
        <a href="mailto:dpo@kinshipedu.fr" className="pik-link">dpo@kinshipedu.fr</a>
        {' '}· © 2026 Kinship SAS
      </div>
    </div>
  );
};

export default PikIdentity;
