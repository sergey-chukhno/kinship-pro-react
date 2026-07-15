import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAppContext } from '../../context/AppContext';
import { useToast } from '../../hooks/useToast';
import './Pik.css';

const MOCK_PIK = '3F7K–92MX–Q8ZR–1DPW–K4NB–X6TJ';

const Pik: React.FC = () => {
  const { setCurrentPage } = useAppContext();
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();
  const [pik, setPik] = useState(MOCK_PIK);
  const [showRegenerateModal, setShowRegenerateModal] = useState(false);
  const [regeneratedAt, setRegeneratedAt] = useState<string | null>(null);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(pik);
      showSuccess('Clé copiée dans le presse-papier');
    } catch {
      showError('Impossible de copier la clé');
    }
  };

  const handleRegenerate = () => {
    const segments = Array.from({ length: 6 }, () =>
      Math.random().toString(36).substring(2, 6).toUpperCase()
    );
    setPik(segments.join('–'));
    setRegeneratedAt(
      new Date().toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    );
    setShowRegenerateModal(false);
    showSuccess('Nouvelle clé générée');
  };

  return (
    <section className="pik-page">
      <div className="dashboard-back-link-wrap">
        <button
          type="button"
          className="dashboard-back-link"
          onClick={() => {
            setCurrentPage('dashboard');
            navigate('/dashboard');
          }}
        >
          ← Vers mon tableau de bord
        </button>
      </div>

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

        {regeneratedAt && (
          <div className="pik-success-banner">
            ✓ Nouvelle clé générée le {regeneratedAt}
          </div>
        )}

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
                <Link to="/droits" className="pik-link">Exercer mes droits →</Link>
              </p>
            </div>
          </div>

          <div className="pik-info-card">
            <div className="pik-info-icon pik-info-icon-refresh" aria-hidden="true">🔄</div>
            <div className="pik-info-content">
              <div className="pik-info-title">Régénérer ma clé</div>
              <p className="pik-info-text">
                Si vous pensez que votre clé a été vue ou copiée par quelqu&apos;un d&apos;autre :
                régénérez-la. Une nouvelle clé remplace l&apos;ancienne, qui cesse immédiatement de
                fonctionner. Limité à une fois par jour.
              </p>
              <button
                type="button"
                className="pik-regenerate-btn"
                onClick={() => setShowRegenerateModal(true)}
              >
                Régénérer ma clé
              </button>
            </div>
          </div>
        </div>

        <div className="pik-card-footer">
          Une seule clé valide à la fois · En cas de perte : votre clé reste visible ici tant que
          votre compte existe · Questions :{' '}
          <a href="mailto:dpo@kinshipedu.fr" className="pik-link">dpo@kinshipedu.fr</a>
          {' '}· © 2026 Kinship SAS
        </div>
      </div>

      {showRegenerateModal && (
        <div className="pik-modal-overlay" onClick={() => setShowRegenerateModal(false)}>
          <div className="pik-modal" onClick={(e) => e.stopPropagation()}>
            <div className="pik-modal-header">
              <div className="pik-card-header-top">
                <span className="pik-header-icon" aria-hidden="true">🔄</span>
                <div>
                  <h2>Régénérer ma clé ?</h2>
                  <p className="pik-card-subtitle">KINSHIP · Confirmation</p>
                </div>
              </div>
            </div>
            <div className="pik-modal-body">
              <div className="pik-warning-box">
                Une nouvelle clé va être générée.{' '}
                <strong>Votre clé actuelle cessera immédiatement de fonctionner</strong> — si vous
                l&apos;avez notée quelque part, elle ne servira plus. Les demandes en cours liées à
                l&apos;ancienne clé seront annulées. Cette opération est limitée à une fois par jour.
              </div>
              <div className="pik-modal-actions">
                <button type="button" className="pik-copy-btn" onClick={handleRegenerate}>
                  Régénérer maintenant
                </button>
                <button
                  type="button"
                  className="pik-cancel-btn"
                  onClick={() => setShowRegenerateModal(false)}
                >
                  Annuler
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default Pik;
