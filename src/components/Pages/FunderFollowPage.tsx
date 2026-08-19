import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getProjectFunderFollow } from '../../api/Projects';
import { getFunderFollow, FunderFollowData } from '../../data/mockFunderView';
import { getFormationById, getFormationPeople } from '../../utils/formationStore';
import { followViewFromFormation } from '../../utils/funderFollowFromFormation';
import FunderFollowView from '../FunderView/FunderFollowView';
import NotFoundPage from './NotFoundPage';
import '../FunderView/FunderView.css';

function followViewFromProjectApi(payload: Awaited<ReturnType<typeof getProjectFunderFollow>>): FunderFollowData {
  const outcomes = (payload.learning_outcomes || '')
    .split(/\n+/)
    .map((text) => text.trim())
    .filter(Boolean)
    .map((text) => ({ text, source: 'projet' }));

  return {
    token: payload.token,
    kind: 'project',
    closed: payload.closed,
    closedOn: payload.closed_on || undefined,
    title: payload.title,
    org: payload.org || '',
    dateRange: payload.date_range,
    financement: '',
    statusLabel: payload.status_label,
    qualiopi: false,
    attendanceSurvey: false,
    hoursDone: '',
    hoursTotal: '',
    hoursPercent: 0,
    attendanceRate: '',
    sessionsDone: 0,
    sessionsTotal: 0,
    identitiesDone: 0,
    identitiesTotal: 0,
    showIdentities: false,
    phase: payload.closed ? 'report' : 'live',
    location: '',
    level: '',
    language: '',
    description: payload.description || '',
    outcomes,
    sessions: [],
    signals: [],
  };
}

const FunderFollowPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<FunderFollowData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const payload = await getProjectFunderFollow(token);
        if (!cancelled) setData(followViewFromProjectApi(payload));
        return;
      } catch {
        const known = getFunderFollow(token);
        const formation = !known ? getFormationById(token) : undefined;
        const people = formation ? getFormationPeople(formation.id) : undefined;
        const fallback =
          known ??
          (formation
            ? followViewFromFormation(formation, {
                identitiesDone: people?.participants.filter((p) => p.identityVerified).length,
                identitiesTotal: people?.participants.length,
              })
            : undefined);
        if (!cancelled) setData(fallback ?? null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [token]);

  if (loading) return null;
  if (!data) return <NotFoundPage />;

  return (
    <div className="fv-page">
      <div className={`fv-shell ${data.closed ? 'ended' : ''}`}>
        <FunderFollowView data={data} />
      </div>
    </div>
  );
};

export default FunderFollowPage;
