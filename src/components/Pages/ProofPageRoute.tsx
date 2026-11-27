import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { fetchProofByProjectId, fetchProofByToken } from '../../api/proofPage';
import ProofPage from '../ProofPage/ProofPage';
import ProofPageStatus from '../ProofPage/ProofPageStatus';
import {
  ProofPageGoneError,
  ProofPageNotFoundError,
  ProofPageResponse,
} from '../../types/proofPage';

type Mode = 'token' | 'project';

interface ProofPageRouteProps {
  mode: Mode;
}

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

const ProofPageRoute: React.FC<ProofPageRouteProps> = ({ mode }) => {
  const params = useParams<{ token?: string; projectId?: string }>();
  const [data, setData] = useState<ProofPageResponse | null>(null);
  const [error, setError] = useState<'404' | '410' | 'load' | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setNoIndexMeta();
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
  }, [mode, params.token, params.projectId]);

  if (loading) return <ProofPageStatus kind="load" />;
  if (error === '410') return <ProofPageStatus kind="410" />;
  if (error === '404' || error === 'load' || !data) return <ProofPageStatus kind="404" />;

  return <ProofPage data={data} />;
};

export default ProofPageRoute;
