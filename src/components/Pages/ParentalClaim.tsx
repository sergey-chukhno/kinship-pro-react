import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { confirmParentalClaim } from '../../api/ParentalClaim';
import './ParentalClaim.css';

const ParentalClaim: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const [status, setStatus] = useState<'loading' | 'confirmed' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage("Ce lien n'est pas valide ou a expiré.");
      return;
    }

    const run = async () => {
      try {
        const response = await confirmParentalClaim(token);
        if (response.data?.status === 'confirmed') {
          setStatus('confirmed');
          setMessage(response.data.message || 'Votre autorisation parentale a été enregistrée.');
        } else {
          setStatus('error');
          setMessage(response.data?.message || "Ce lien n'est pas valide ou a expiré.");
        }
      } catch {
        setStatus('error');
        setMessage("Ce lien n'est pas valide ou a expiré.");
      }
    };

    run();
  }, [token]);

  return (
    <div className="parental-claim-page">
      <div className="parental-claim-card">
        <img src="/Kinship_logo.png" alt="Kinship" className="parental-claim-logo" />
        <h1>Renouvellement autorisation parentale</h1>
        {status === 'loading' && <p>Validation en cours…</p>}
        {status === 'confirmed' && (
          <>
            <p className="parental-claim-success">{message}</p>
            <p className="parental-claim-hint">Vous pouvez fermer cette page.</p>
          </>
        )}
        {status === 'error' && <p className="parental-claim-error">{message}</p>}
      </div>
    </div>
  );
};

export default ParentalClaim;
