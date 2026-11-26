import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { fetchProofByProjectId, fetchProofByToken } from '../../api/proofPage';
import ProofPage from '../ProofPage/ProofPage';
import {
  ProofPageGoneError,
  ProofPageNotFoundError,
  ProofPageResponse,
} from '../../types/proofPage';
import '../ProofPage/ProofPage.css';

type Mode = 'token' | 'project';

interface ProofPageRouteProps {
  mode: Mode;
}

function setNoIndexMeta(on: boolean) {
  const ensure = (name: string, content: string) => {
    let el = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement | null;
    if (!el) {
      el = document.createElement('meta');
      el.setAttribute('name', name);
      document.head.appendChild(el);
    }
    el.setAttribute('content', content);
    return el;
  };
  if (on) {
    ensure('robots', 'noindex, nofollow');
    document.title = 'Preuve Kinship';
  }
}

const ProofPageRoute: React.FC<ProofPageRouteProps> = ({ mode }) => {
  const params = useParams<{ token?: string; projectId?: string }>();
  const [data, setData] = useState<ProofPageResponse | null>(null);
  const [error, setError] = useState<'404' | '410' | 'load' | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setNoIndexMeta(true);
    let cancelled = false;

    const run = async () => {
      setLoading(true);
      setError(null);
      setData(null);
      try {
        const res =
          mode === 'token'
            ? await fetchProofByToken(params.token || '')
            : await fetchProofByProjectId(params.projectId || '');
        if (!cancelled) setData(res);
      } catch (e) {
        if (cancelled) return;
        if (e instanceof ProofPageGoneError) setError('410');
        else if (e instanceof ProofPageNotFoundError) setError('404');
        else setError('load');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
    // One read per page open — deps = route identity only (not tab changes).
  }, [mode, params.token, params.projectId]);

  if (loading) {
    return (
      <div className="ppg-page">
        <div className="ppg-status">
          <p>Chargement de la preuve…</p>
        </div>
      </div>
    );
  }

  if (error === '410') {
    return (
      <div className="ppg-page">
        <div className="ppg-status" role="status">
          <h1>Lien supprimé</h1>
          <p>
            Ce lien de preuve n’est plus actif. La titulaire l’a retiré, ou il a cessé.
          </p>
        </div>
      </div>
    );
  }

  if (error === '404' || error === 'load' || !data) {
    return (
      <div className="ppg-page">
        <div className="ppg-status" role="status">
          <h1>Preuve introuvable</h1>
          <p>Cette page n’existe pas ou n’est pas accessible.</p>
        </div>
      </div>
    );
  }

  return <ProofPage data={data} />;
};

export default ProofPageRoute;
