import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getFormationSession, rescheduleFormationSession } from '../../api/FormationSessions';
import { resolveCatalogueOrg } from '../../api/formationCatalogOrg';
import { useAppContext } from '../../context/AppContext';
import { FormationSessionPerson } from '../../types/formationSession';
import {
  cacheFormationSession,
  formatSessionDateFr,
  getSelectedSessionId,
  getSessionById,
  getSessionSpaceTab,
  openSessionAffiche,
  sessionHeroStatus,
  setSessionSpaceTab,
  subscribeFormationSessions,
  updateFormationSession,
} from '../../utils/formationSessionStore';
import { useToast } from '../../hooks/useToast';
import './FormationSessionSpacePage.css';

type SpaceTab = 'informations' | 'gestion';
type Visibility = 'structure' | 'financeur';

function sessionIdFromPath(pathname: string): string | null {
  const from = (p: string) => p.match(/^\/formation-session-space\/([^/]+)\/?$/)?.[1] ?? null;
  return from(pathname) || from(window.location.pathname) || getSelectedSessionId();
}

const FormationSessionSpacePage: React.FC = () => {
  const { pathname } = useLocation();
  const sessionId = sessionIdFromPath(pathname);
  const navigate = useNavigate();
  const { state, setCurrentPage } = useAppContext();
  const { showSuccess, showError } = useToast();
  const org = useMemo(
    () => resolveCatalogueOrg(state.user, state.showingPageType),
    [state.user, state.showingPageType]
  );
  const [tick, setTick] = useState(0);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<SpaceTab>(() => getSessionSpaceTab());
  const [visibility, setVisibility] = useState<Visibility>('structure');
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteMode, setInviteMode] = useState<'structure' | 'email'>('structure');
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'formateur' | 'intervenant'>('intervenant');
  const [juryName, setJuryName] = useState('');
  const [juryFunction, setJuryFunction] = useState('');
  const [datesEditOpen, setDatesEditOpen] = useState(false);
  const [editStart, setEditStart] = useState('');
  const [editEnd, setEditEnd] = useState('');
  const [editReason, setEditReason] = useState('');
  const [savingDates, setSavingDates] = useState(false);

  useEffect(() => subscribeFormationSessions(() => setTick((n) => n + 1)), []);

  useEffect(() => {
    if (!sessionId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    getFormationSession(sessionId, org?.name || '')
      .then((s) => {
        if (cancelled || !s) return;
        cacheFormationSession({
          ...s,
          attendanceSurveyOptIn:
            getSessionById(s.id)?.attendanceSurveyOptIn ?? s.attendanceSurveyOptIn,
        });
        setTick((n) => n + 1);
      })
      .catch((e) => {
        if (!cancelled) showError(e?.message || 'Chargement impossible.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [sessionId, org?.name]);

  const session = useMemo(
    () => (sessionId ? getSessionById(sessionId) : undefined),
    [sessionId, tick]
  );

  useEffect(() => {
    if (!session) return;
    const jury = session.people.find((p) => p.role === 'jury');
    if (jury) {
      setJuryName(jury.name);
      setJuryFunction(jury.functionLabel || '');
    }
  }, [session?.id]);

  const selectTab = (next: SpaceTab) => {
    setTab(next);
    setSessionSpaceTab(next);
  };

  const goCatalogue = () => {
    setCurrentPage('catalogue-formations');
    navigate('/catalogue-formations');
  };

  const goAffiche = () => {
    if (!session) return;
    openSessionAffiche(session.id, 'structure');
    navigate(`/formation-affiche/${session.id}`);
    setCurrentPage('formation-affiche');
  };

  const saveJury = () => {
    if (!session || !juryName.trim()) return;
    const others = session.people.filter((p) => p.role !== 'jury');
    updateFormationSession(session.id, {
      people: [
        ...others,
        {
          id: 'jury-1',
          name: juryName.trim(),
          role: 'jury',
          functionLabel: juryFunction.trim() || undefined,
        },
      ],
    });
    showSuccess('Enregistré');
  };

  const addPerson = () => {
    if (!session || !inviteName.trim()) return;
    const person: FormationSessionPerson = {
      id: `p-${Date.now()}`,
      name: inviteName.trim(),
      email: inviteMode === 'email' ? inviteEmail.trim() : undefined,
      role: inviteRole,
      pending: inviteMode === 'email',
    };
    updateFormationSession(session.id, { people: [...session.people, person] });
    setInviteName('');
    setInviteEmail('');
    setInviteOpen(false);
    showSuccess('Enregistré');
  };

  const openDatesEdit = () => {
    if (!session) return;
    setEditStart(session.startDate);
    setEditEnd(session.endDate);
    setEditReason('');
    setDatesEditOpen(true);
  };

  const saveDates = async () => {
    if (!session) return;
    if (!editStart || !editEnd) {
      showError('Renseignez les deux dates.');
      return;
    }
    if (editEnd < editStart) {
      showError('La fin doit être après le début.');
      return;
    }
    if (!editReason.trim()) {
      showError('Le motif du report est obligatoire.');
      return;
    }
    setSavingDates(true);
    try {
      const updated = await rescheduleFormationSession(
        session.id,
        editStart,
        editEnd,
        editReason
      );
      cacheFormationSession({
        ...updated,
        attendanceSurveyOptIn: session.attendanceSurveyOptIn,
        people: session.people,
        seances: session.seances,
      });
      setDatesEditOpen(false);
      showSuccess('Dates mises à jour');
      setTick((n) => n + 1);
    } catch (e: any) {
      showError(e?.message || 'Modification impossible.');
    } finally {
      setSavingDates(false);
    }
  };

  if (loading) {
    return (
      <div className="fss">
        <p className="fss-sub">Chargement…</p>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="fss">
        <div className="fss-err">Session introuvable.</div>
        <button type="button" className="fss-btn s" onClick={goCatalogue}>
          Retour au catalogue
        </button>
      </div>
    );
  }

  const participants = session.people.filter((p) => p.role === 'participant');
  const team = session.people.filter((p) => p.role === 'formateur' || p.role === 'intervenant');
  const hero = sessionHeroStatus(session);
  const statusChip = hero === 'in_progress' ? 'cours' : hero === 'ended' ? 'cours' : 'venir';
  const statusText =
    hero === 'in_progress' ? 'EN COURS' : hero === 'ended' ? 'TERMINÉE' : 'À VENIR';

  let hnote = `Début de la session : à déclarer par ${session.formateur.name}, formateur responsable.`;
  if (session.startDeclared) {
    hnote = `La session a commencé le ${formatSessionDateFr(session.startDate)} — déclaré par ${session.formateur.name}, formateur responsable.`;
  } else if (new Date(`${session.startDate}T00:00:00`) < new Date()) {
    hnote = `La date de début est passée : le début reste à déclarer par ${session.formateur.name}, formateur responsable. Les inscriptions restent ouvertes.`;
  }

  const modalityLabel =
    session.modality === 'presentiel'
      ? 'Présentiel'
      : session.modality === 'distanciel'
        ? 'Distanciel'
        : session.modality === 'hybride'
          ? 'Hybride'
          : session.modality || '';

  const canEditDates = !session.startDeclared;
  const orgLabel = session.orgName || org?.name || '';

  const displayOrEmpty = (v?: string | null) => (v && String(v).trim() ? v : null);

  return (
    <div className="fss">
      <div className="fss-crumb">
        <button type="button" onClick={goCatalogue}>
          Catalogue
        </button>
        <span>›</span>
        <span>Espace session</span>
      </div>

      <div className="fss-shell">
        <header className="fss-hero">
          <div className="fss-chips">
            <span className={`fss-hchip ${statusChip}`}>{statusText}</span>
            <span className="fss-hchip">
              {formatSessionDateFr(session.startDate)} → {formatSessionDateFr(session.endDate)}
            </span>
            {(modalityLabel || session.financement) && (
              <span className="fss-hchip">
                {[modalityLabel, session.financement].filter(Boolean).join(' · ')}
              </span>
            )}
          </div>
          <h1>{session.title}</h1>
          <div className="fss-drow">
            <span>
              Session · formateur responsable <strong>{session.formateur.name}</strong>
            </span>
            {orgLabel ? (
              <>
                <span>·</span>
                <span>{orgLabel}</span>
              </>
            ) : null}
            <button type="button" className="fss-seeaff" onClick={goAffiche}>
              Voir l&apos;affiche →
            </button>
          </div>
          <div className="fss-hnote">{hnote}</div>
        </header>

        <div className="fss-mtabs">
          <button
            type="button"
            className={tab === 'informations' ? 'on' : ''}
            onClick={() => selectTab('informations')}
          >
            Informations
          </button>
          <button
            type="button"
            className={tab === 'gestion' ? 'on' : ''}
            onClick={() => selectTab('gestion')}
          >
            Gestion
          </button>
        </div>

        <div className="fss-body">
          {tab === 'informations' && (
            <>
              <div className="fss-recap">
                <div className="fss-recap-label">La fiche de la formation — en consultation</div>
                <div className="fss-row">
                  <span className="k">Certification visée</span>
                  <span className="v">
                    {session.euMc ? 'Microcertification européenne' : "Certificat de l'organisme"}
                  </span>
                </div>
                {session.durationHours ? (
                  <div className="fss-row">
                    <span className="k">Durée</span>
                    <span className="v">{session.durationHours} heures</span>
                  </div>
                ) : null}
                <div className="fss-row">
                  <span className="k">Délivre</span>
                  <span className="v">Preuve de formation</span>
                </div>
              </div>
              <div className="fss-recap">
                <div className="fss-recap-label">La session</div>
                <div className="fss-row">
                  <span className="k">Dates</span>
                  <span className="v">
                    {formatSessionDateFr(session.startDate)} →{' '}
                    {formatSessionDateFr(session.endDate)}
                    {canEditDates && (
                      <>
                        {' '}
                        <button type="button" className="fss-link" onClick={openDatesEdit}>
                          Modifier les dates →
                        </button>
                      </>
                    )}
                  </span>
                </div>
                <div className="fss-row">
                  <span className="k">Formateur responsable</span>
                  <span className="v">{session.formateur.name}</span>
                </div>
                {modalityLabel ? (
                  <div className="fss-row">
                    <span className="k">Modalité</span>
                    <span className="v">{modalityLabel}</span>
                  </div>
                ) : null}
                {session.financement ? (
                  <div className="fss-row">
                    <span className="k">Financement</span>
                    <span className="v">{session.financement}</span>
                  </div>
                ) : null}
                {displayOrEmpty(session.practicalInfo) ? (
                  <div className="fss-row">
                    <span className="k">Informations pratiques</span>
                    <span className="v">{session.practicalInfo}</span>
                  </div>
                ) : null}
              </div>
              <p className="fss-hint">
                {canEditDates
                  ? "Les dates se modifient tant que la session n'a pas commencé."
                  : 'Les dates ne se modifient plus : le début de la session a été déclaré.'}
              </p>
            </>
          )}

          {tab === 'gestion' && (
            <>
              <div className="fss-viewrow">
                <span>Vue :</span>
                <div className="fss-tog">
                  <button
                    type="button"
                    className={visibility === 'structure' ? 'on' : ''}
                    onClick={() => setVisibility('structure')}
                  >
                    Ma structure
                  </button>
                  <button
                    type="button"
                    className={visibility === 'financeur' ? 'on' : ''}
                    onClick={() => setVisibility('financeur')}
                  >
                    Financeur
                  </button>
                </div>
                <span className="fss-hint" style={{ margin: 0 }}>
                  {visibility === 'structure'
                    ? 'visible par : votre structure'
                    : 'visible par : le financeur (aperçu)'}
                </span>
              </div>

              {visibility === 'financeur' && (
                <div className="fss-banner">
                  Aperçu financeur (mock) — suivi allégé, sans actions de gestion.
                </div>
              )}

              <div className="fss-sec">
                <h4>
                  <span>Participants ({participants.length})</span>
                  {visibility === 'structure' && (
                    <span>
                      <button type="button" className="fss-add" disabled>
                        + Ajouter un participant
                      </button>{' '}
                      <button
                        type="button"
                        className="fss-add"
                        onClick={() => {
                          if (!session) return;
                          setCurrentPage('formation-session-import');
                          navigate(`/formation-session-import/${session.id}`);
                        }}
                      >
                        Importer une liste
                      </button>
                    </span>
                  )}
                </h4>
                {participants.length > 0 && (
                  <ul className="fss-list">
                    {participants.map((p) => (
                      <li key={p.id}>
                        <span>
                          <strong>{p.name}</strong>
                          {p.email ? <div className="fss-sub">{p.email}</div> : null}
                        </span>
                        <span className="st">
                          {p.pending ? "en attente d'activation" : 'inscrit'}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="fss-sec">
                <h4>
                  <span>Formateurs et intervenants ({team.length})</span>
                  {visibility === 'structure' && (
                    <button type="button" className="fss-add" onClick={() => setInviteOpen(true)}>
                      + Ajouter un formateur ou un intervenant
                    </button>
                  )}
                </h4>
                <ul className="fss-list">
                  {team.map((p) => (
                    <li key={p.id}>
                      <strong>{p.name}</strong>
                      <span className="st">
                        {p.role === 'formateur' ? 'formateur responsable' : 'intervenant'}
                        {p.pending ? ' · invitation' : ''}
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="fss-sub">
                  Le formateur responsable déclare le début et la fin de la session ; vous pouvez le
                  changer, parmi les formateurs de la session, jusqu&apos;à la clôture.
                </p>
              </div>

              <div className="fss-sec">
                <h4>Séances</h4>
                <button type="button" className="fss-link" onClick={goAffiche}>
                  📅 Planifier les séances →
                </button>
                <p className="fss-sub">
                  Les séances se créent et se tiennent sur l&apos;affiche de la session (onglet
                  Séances) ; le jour J, la présence se constate par le code de la séance.
                </p>
              </div>

              <div className="fss-sec">
                <div className="fss-viewrow" style={{ marginTop: 10 }}>
                  <span>
                    Jury <span style={{ color: '#8f8d86' }}>— facultatif</span>
                  </span>
                </div>
                <div className="fss-jury">
                  <input
                    value={juryName}
                    onChange={(e) => setJuryName(e.target.value)}
                    onBlur={saveJury}
                    placeholder="Nom"
                    disabled={visibility === 'financeur'}
                  />
                  <input
                    value={juryFunction}
                    onChange={(e) => setJuryFunction(e.target.value)}
                    onBlur={saveJury}
                    placeholder="Fonction"
                    disabled={visibility === 'financeur'}
                  />
                </div>
                <p className="fss-sub">Nom et fonction ; sa décision s&apos;enregistre à la clôture.</p>
              </div>

              <div className="fss-sec">
                <h4>
                  <span>Partenaires (0)</span>
                  {visibility === 'structure' && (
                    <button type="button" className="fss-add" disabled>
                      + Ajouter un partenaire
                    </button>
                  )}
                </h4>
                <p className="fss-sub">
                  Un financeur n&apos;est pas un partenaire : il a son bloc. Le partenaire
                  co-attestant, sans choix de type.
                </p>
              </div>

              <div className="fss-sec">
                <h4>
                  <span>Financeurs (0)</span>
                  {visibility === 'structure' && (
                    <button type="button" className="fss-add" disabled>
                      + Ajouter un financeur
                    </button>
                  )}
                </h4>
                <p className="fss-sub">
                  À associer avant le début de la session : il est informé du début, suit la session,
                  reçoit le rapport à la clôture.
                </p>
              </div>

              <div className="fss-sec">
                <h4>
                  <span>Documents (0) · Liens (0) · Photos (0)</span>
                  {visibility === 'structure' && (
                    <button type="button" className="fss-add" disabled>
                      + Ajouter
                    </button>
                  )}
                </h4>
                <p className="fss-sub">
                  La visibilité se choisit à l&apos;ajout, document par document : Équipe ·
                  Participants · Ma structure.
                </p>
              </div>

              <div className="fss-foot">
                <button type="button" className="fss-btn p" onClick={goAffiche}>
                  Aller vers l&apos;affiche →
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {datesEditOpen && (
        <div
          className="fss-modal-backdrop"
          onClick={() => setDatesEditOpen(false)}
          role="presentation"
        >
          <div className="fss-modal" onClick={(e) => e.stopPropagation()} role="dialog">
            <h2>Modifier les dates</h2>
            <div className="fss-sub" style={{ marginBottom: 10 }}>
              Dates actuelles : {formatSessionDateFr(session.startDate)} →{' '}
              {formatSessionDateFr(session.endDate)}
            </div>
            <label>
              Début
              <input
                type="date"
                value={editStart}
                onChange={(e) => setEditStart(e.target.value)}
              />
            </label>
            <label>
              Fin
              <input type="date" value={editEnd} onChange={(e) => setEditEnd(e.target.value)} />
            </label>
            <label>
              Motif du report <span style={{ color: '#c0392b' }}>✱</span>
              <input
                value={editReason}
                onChange={(e) => setEditReason(e.target.value)}
                placeholder="Motif"
              />
            </label>
            <p className="fss-sub">Chaque participant sera prévenu par e-mail.</p>
            <div className="fss-actions">
              <button type="button" className="fss-btn g" onClick={() => setDatesEditOpen(false)}>
                Annuler
              </button>
              <button
                type="button"
                className="fss-btn p"
                disabled={savingDates || !editReason.trim()}
                onClick={() => void saveDates()}
              >
                {savingDates ? 'Enregistrement…' : 'Modifier les dates'}
              </button>
            </div>
          </div>
        </div>
      )}

      {inviteOpen && (
        <div className="fss-modal-backdrop" onClick={() => setInviteOpen(false)} role="presentation">
          <div className="fss-modal" onClick={(e) => e.stopPropagation()} role="dialog">
            <h2>Ajouter à l&apos;équipe de la session</h2>
            <div className="fss-tog" style={{ marginBottom: 10 }}>
              <button
                type="button"
                className={inviteMode === 'structure' ? 'on' : ''}
                onClick={() => setInviteMode('structure')}
              >
                Dans ma structure
              </button>
              <button
                type="button"
                className={inviteMode === 'email' ? 'on' : ''}
                onClick={() => setInviteMode('email')}
              >
                Par e-mail
              </button>
            </div>
            <label>
              Nom
              <input value={inviteName} onChange={(e) => setInviteName(e.target.value)} />
            </label>
            {inviteMode === 'email' && (
              <label>
                E-mail
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                />
              </label>
            )}
            <div className="fss-ropts" style={{ marginBottom: 10 }}>
              <button
                type="button"
                className={`fss-ropt ${inviteRole === 'formateur' ? 'sel' : ''}`}
                onClick={() => setInviteRole('formateur')}
              >
                Formateur
              </button>
              <button
                type="button"
                className={`fss-ropt ${inviteRole === 'intervenant' ? 'sel' : ''}`}
                onClick={() => setInviteRole('intervenant')}
              >
                Intervenant
              </button>
            </div>
            <div className="fss-actions">
              <button type="button" className="fss-btn g" onClick={() => setInviteOpen(false)}>
                Annuler
              </button>
              <button type="button" className="fss-btn p" onClick={addPerson}>
                Ajouter
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FormationSessionSpacePage;
