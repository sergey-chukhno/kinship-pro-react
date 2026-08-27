import React, { useEffect, useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { confirmFunderFollowToken, declineFunderFollowToken, getProjectFunderFollow } from '../../api/Projects';
import { useAppContext } from '../../context/AppContext';
import { getFunderFollow, FunderFollowData } from '../../data/mockFunderView';
import { getFormationById, getFormationPeople } from '../../utils/formationStore';
import { followViewFromFormation } from '../../utils/funderFollowFromFormation';
import {
  applyCompanySpaceContext,
  currentUserIsDesignatedFunder,
  governableCompanies,
  isAuthenticatedSession,
  isCompanyGovernContext,
} from '../../utils/contextUtils';
import FunderFollowView from '../FunderView/FunderFollowView';
import NotFoundPage from './NotFoundPage';
import '../FunderView/FunderView.css';

function followTokenFromLocation(pathname: string, param?: string): string | undefined {
  if (param) return param;
  const match = pathname.match(/^\/follow\/([^/]+)\/?$/);
  return match?.[1] ? decodeURIComponent(match[1]) : undefined;
}

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
    declined: payload.declined,
    declinedOn: payload.declined_on || undefined,
    closedOn: payload.closed_on || undefined,
    title: payload.title || '',
    org: payload.org || '',
    orgKind: payload.org_kind || undefined,
    dateRange: payload.date_range || '',
    financement: payload.financement || payload.funder_name || '',
    statusLabel: payload.status_label || '',
    qualiopi: false,
    attendanceSurvey: false,
    hoursDone: '',
    hoursTotal: '',
    hoursPercent: payload.week_total ? Math.round(((payload.week_current || 0) / payload.week_total) * 100) : 0,
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
    signals: (payload.signals || []).map((s) => ({
      kind: s.kind === 'overdue' || s.kind === 'dates' ? 'dates' : 'manual',
      label: s.label,
      detail: s.detail,
    })),
    needsConfirmation: payload.needs_confirmation,
    weekCurrent: payload.week_current,
    weekTotal: payload.week_total,
    participantsCount: payload.participants_count,
    proofsCount: payload.proofs_count,
    lastActivityDays: payload.last_activity_days,
    partners: payload.partners,
    designatedOn: payload.designated_on || undefined,
    funderCompanyId: payload.funder_company_id ?? null,
    funderEmail: payload.funder_email ?? null,
    funderUserId: payload.funder_user_id ?? null,
    viewerIsFunder: payload.viewer_is_funder ?? null,
    informedOn: payload.informed_on || undefined,
    reportDue: payload.report_due || undefined,
    report: payload.report
      ? {
          weeks: payload.report.weeks,
          participantsCount: payload.report.participants_count,
          proofsCount: payload.report.proofs_count,
          life: payload.report.life,
          participants: payload.report.participants,
          anonymous: payload.report.anonymous,
          transmittedOn: payload.report.transmitted_on,
        }
      : undefined,
  };
}

const FunderFollowPage: React.FC = () => {
  const { token: paramToken } = useParams<{ token: string }>();
  const { pathname } = useLocation();
  const token = followTokenFromLocation(pathname, paramToken);
  const { state, setShowingPageType } = useAppContext();
  const [data, setData] = useState<FunderFollowData | null>(null);
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const viewerIsLoggedIn = isAuthenticatedSession() && Boolean(state.user?.available_contexts);
  const viewerIsFunder = viewerIsLoggedIn && currentUserIsDesignatedFunder(state.user, data);
  const viewerHasCompanySpace = viewerIsFunder && isCompanyGovernContext(state.user, state.showingPageType);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const payload = await getProjectFunderFollow(token);
        if (!cancelled) {
          setAccessDenied(false);
          setData(followViewFromProjectApi(payload));
        }
        return;
      } catch (error: any) {
        if (error?.response?.status === 403) {
          if (!cancelled) {
            setAccessDenied(true);
            setData(null);
          }
          return;
        }
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

  useEffect(() => {
    if (!viewerIsFunder || loading || !data) return;
    const companies = governableCompanies(state.user);
    if (companies.length === 0) return;
    const preferred = data.funderCompanyId
      ? companies.find((company) => Number(company.id) === Number(data.funderCompanyId))
      : undefined;
    const target = preferred || companies[0];
    if (!target) return;
    if (state.showingPageType === 'pro' && isCompanyGovernContext(state.user, 'pro')) {
      const currentId = localStorage.getItem('selectedContextId');
      if (!preferred || String(currentId) === String(target.id)) return;
    }
    applyCompanySpaceContext(Number(target.id));
    setShowingPageType('pro');
  }, [viewerIsFunder, loading, data, state.user, state.showingPageType, setShowingPageType]);

  if (loading) {
    return (
      <div className="fv-page">
        <div className="fv-shell">
          <div className="fv-follow" style={{ textAlign: 'center', color: '#6d6b64' }}>
            Chargement du suivi…
          </div>
        </div>
      </div>
    );
  }
  if (accessDenied || (viewerIsLoggedIn && data && !viewerIsFunder)) {
    return (
      <div className="fv-page">
        <div className="fv-shell">
          <div className="fv-follow" style={{ textAlign: 'center' }}>
            <p className="fv-ended-title">Ce suivi ne vous est pas destiné</p>
            <p className="fv-ended-sub">
              Cette page est réservée au financeur désigné. Connectez-vous avec le compte de l’organisation
              financeuse.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!data) return <NotFoundPage />;

  if (viewerIsLoggedIn && state.showingPageType === 'pro' && viewerIsFunder && !viewerHasCompanySpace) {
    return (
      <div className="fv-page">
        <div className="fv-shell">
          <div className="fv-follow" style={{ textAlign: 'center' }}>
            <p className="fv-ended-title">Rôle insuffisant sur cet espace</p>
            <p className="fv-ended-sub">
              Ce suivi financeur s’ouvre depuis un espace organisation où vous êtes admin ou super admin.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fv-page">
      <div className={`fv-shell ${data.closed ? 'ended' : ''}`}>
        <FunderFollowView
          data={data}
          viewerIsLoggedIn={viewerIsLoggedIn}
          onConfirmToken={async () => {
            if (!token) return;
            const payload = await confirmFunderFollowToken(token);
            setData(followViewFromProjectApi(payload));
          }}
          onDeclineToken={async () => {
            if (!token) return;
            const payload = await declineFunderFollowToken(token);
            setData(followViewFromProjectApi(payload));
          }}
        />
      </div>
    </div>
  );
};

export default FunderFollowPage;
