import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAppContext } from '../../context/AppContext';
import { FormationSessionPerson } from '../../types/formationSession';
import {
  formatSessionDateFr,
  getSelectedSessionId,
  getSessionById,
  openSessionAffiche,
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
  const { setCurrentPage } = useAppContext();
  const { showSuccess } = useToast();
  const [tick, setTick] = useState(0);
  const [tab, setTab] = useState<SpaceTab>('gestion');
  const [visibility, setVisibility] = useState<Visibility>('structure');
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteMode, setInviteMode] = useState<'structure' | 'email'>('structure');
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'formateur' | 'intervenant'>('intervenant');
  const [juryName, setJuryName] = useState('');
  const [juryFunction, setJuryFunction] = useState('');

  useEffect(() => subscribeFormationSessions(() => setTick((n) => n + 1)), []);

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

  const goCatalogue = () => {
    setCurrentPage('catalogue-formations');
    navigate('/catalogue-formations');
  };

  const goAffiche = () => {
    if (!session) return;
    openSessionAffiche(session.id);
    setCurrentPage('formation-affiche');
    navigate(`/formation-affiche/${session.id}`);
  };

  const toggleAttendance = (on: boolean) => {
    if (!session) return;
    updateFormationSession(session.id, { attendanceSurveyOptIn: on });
    showSuccess('✓ Enregistré');
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
    showSuccess('✓ Enregistré');
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
    showSuccess('✓ Enregistré');
  };

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
  const statusChip = session.status === 'in_progress' || session.startDeclared ? 'cours' : 'venir';
  const statusText =
    session.status === 'in_progress' || session.startDeclared ? 'EN COURS' : 'À VENIR';

  let hnote = `Début de la session : à déclarer par ${session.formateur.name}, formateur responsable.`;
  if (session.startDeclared) {
    hnote = `La session a commencé le ${formatSessionDateFr(session.startDate)} — déclaré par ${session.formateur.name}, formateur responsable.`;
  } else if (session.status === 'in_progress' || new Date(`${session.startDate}T00:00:00`) < new Date()) {
    hnote = `La date de début est passée : le début reste à déclarer par ${session.formateur.name}, formateur responsable. Les inscriptions restent ouvertes.`;
  }

  const modalityLabel =
    session.modality === 'presentiel'
      ? 'Présentiel'
      : session.modality === 'distanciel'
        ? 'Distanciel'
        : session.modality === 'hybride'
          ? 'Hybride'
          : session.modality || '—';

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
            <span className="fss-hchip">
              {modalityLabel}
              {session.financement ? ` · ${session.financement}` : ''}
            </span>
          </div>
          <h1>{session.title}</h1>
          <div className="fss-drow">
            <span>
              Session · formateur responsable <strong>{session.formateur.name}</strong>
            </span>
            <span>·</span>
            <span>{session.orgName}</span>
            <span className="fss-hcert">✓ Organisme de formation certifié</span>
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
            onClick={() => setTab('informations')}
          >
            Informations
          </button>
          <button
            type="button"
            className={tab === 'gestion' ? 'on' : ''}
            onClick={() => setTab('gestion')}
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
                  <span className="v">{session.euMc ? 'Microcertification européenne' : "Certificat de l'organisme"}</span>
                </div>
                <div className="fss-row">
                  <span className="k">Durée</span>
                  <span className="v">{session.durationHours ? `${session.durationHours} heures` : '—'}</span>
                </div>
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
                    {formatSessionDateFr(session.startDate)} → {formatSessionDateFr(session.endDate)}
                  </span>
                </div>
                <div className="fss-row">
                  <span className="k">Formateur responsable</span>
                  <span className="v">{session.formateur.name}</span>
                </div>
                <div className="fss-row">
                  <span className="k">Modalité</span>
                  <span className="v">{modalityLabel}</span>
                </div>
                <div className="fss-row">
                  <span className="k">Financement</span>
                  <span className="v">{session.financement || '—'}</span>
                </div>
                <div className="fss-row">
                  <span className="k">Informations pratiques</span>
                  <span className="v">{session.practicalInfo || '—'}</span>
                </div>
              </div>
              <p className="fss-hint">Les dates se modifient tant que la session n&apos;a pas commencé.</p>
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
                      <button type="button" className="fss-add" disabled>
                        Importer une liste
                      </button>
                    </span>
                  )}
                </h4>
                {participants.length === 0 ? (
                  <p className="fss-sub">Aucun participant pour l&apos;instant (import hors scope UI mock).</p>
                ) : (
                  <ul className="fss-list">
                    {participants.map((p) => (
                      <li key={p.id}>
                        <span>
                          <strong>{p.name}</strong>
                          {p.email ? <div className="fss-sub">{p.email}</div> : null}
                        </span>
                        <span className="st">{p.pending ? "en attente d'activation" : 'inscrit'}</span>
                      </li>
                    ))}
                  </ul>
                )}
                <p className="fss-sub">Inscrits à l&apos;import ; chacun a reçu sa confirmation par e-mail.</p>
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
                  Les séances se créent et se tiennent sur l&apos;affiche de la session (onglet Séances) ;
                  le jour J, la présence se constate par le code de la séance.
                </p>
              </div>

              <div className="fss-sec">
                <div className="fss-viewrow" style={{ marginBottom: 8 }}>
                  <span>Présences suivies à chaque séance</span>
                  <div className="fss-ropts">
                    <button
                      type="button"
                      className={`fss-ropt ${session.attendanceSurveyOptIn ? 'sel' : ''}`}
                      onClick={() => toggleAttendance(true)}
                      disabled={visibility === 'financeur'}
                    >
                      Oui
                    </button>
                    <button
                      type="button"
                      className={`fss-ropt ${!session.attendanceSurveyOptIn ? 'sel' : ''}`}
                      onClick={() => toggleAttendance(false)}
                      disabled={visibility === 'financeur'}
                    >
                      Non
                    </button>
                  </div>
                </div>
                <p className="fss-lockl">
                  🔒 Avec l&apos;option <strong>Conformité financeur</strong> : vérification d&apos;identité,
                  blocage CPF, sondage d&apos;assiduité.{' '}
                  <button type="button" className="fss-link">
                    En savoir plus →
                  </button>
                </p>
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
                  Un financeur n&apos;est pas un partenaire : il a son bloc. Le partenaire co-attestant,
                  sans choix de type.
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
                  La visibilité se choisit à l&apos;ajout, document par document : Équipe · Participants ·
                  Ma structure.
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
            <p className="fss-sub">
              « Par e-mail » : nom, prénom, e-mail — il reçoit une invitation et rejoint votre
              structure.
            </p>
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
