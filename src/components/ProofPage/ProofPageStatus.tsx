import React, { useEffect } from 'react';
import './ProofPage.css';

function setNoIndexMeta() {
  let el = document.querySelector('meta[name="robots"]') as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute('name', 'robots');
    document.head.appendChild(el);
  }
  el.setAttribute('content', 'noindex, nofollow');
  document.title = 'Preuve Kinship';
}

interface ProofPageStatusProps {
  kind: '404' | '410' | 'load';
}

/** Pages neutres Patrick 26/11 — pied + noindex. */
const ProofPageStatus: React.FC<ProofPageStatusProps> = ({ kind }) => {
  useEffect(() => {
    if (kind !== 'load') setNoIndexMeta();
  }, [kind]);

  if (kind === 'load') {
    return (
      <div className="ppg-page ppg-page-status">
        <div className="ppg-status" role="status">
          <p>Chargement de la preuve…</p>
        </div>
      </div>
    );
  }

  const title =
    kind === '404' ? "Cette page n'est pas disponible." : 'Ce lien a été supprimé.';
  const body =
    kind === '404'
      ? null
      : 'Vous pouvez en demander un nouveau à la personne concernée.';

  return (
    <div className="ppg-page ppg-page-status">
      <div className="ppg-status" role="status">
        <h1>{title}</h1>
        {body ? <p>{body}</p> : null}
        <footer className="ppg-footer ppg-footer-status">
          <div className="ppg-footer-discover">
            <a href="https://kinshipedu.fr" target="_blank" rel="noopener noreferrer">
              Découvrir Kinship et créer votre espace — kinshipedu.fr ↗
            </a>
            <span className="ppg-footer-copy">© 2026 Kinship SAS</span>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default ProofPageStatus;
