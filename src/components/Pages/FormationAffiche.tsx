import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../../context/AppContext';
import {
  FINANCEMENT_LABEL,
  MOCK_OF_ORG,
  PARTICIPATION_LABEL,
  ParticipationMode,
} from '../../data/mockFormations';
import {
  FormationSlot,
  addFormationSlot,
  formatSlotDateLabel,
  getFormationById,
  getFormationPeople,
  getFormationSlots,
  getSelectedFormationId,
  slotStatusLabel,
  subscribeFormationSlots,
  subscribeFormations,
  subscribeFormationPeople,
  updateFormationSlot,
  updateFormation,
  verifyFormationIdentity,
} from '../../utils/formationStore';
import { openPresenceSession } from '../../utils/presenceSessionStore';
import { useToast } from '../../hooks/useToast';
import FunderFollowView from '../FunderView/FunderFollowView';
import { MOCK_FOLLOW_DEBUTER } from '../../data/mockFunderView';
import { followViewFromFormation } from '../../utils/funderFollowFromFormation';
import CloseFormationBirthOverlay from '../Modals/CloseFormationBirthOverlay';
import AttestFormationModal from '../Modals/AttestFormationModal';
import './FormationAffiche.css';

type AfficheTab =
  | 'overview'
  | 'seances'
  | 'participants'
  | 'equipes'
  | 'preuves'
  | 'documents';

const TABS: { id: AfficheTab; label: string }[] = [
  { id: 'overview', label: "Vue d'ensemble" },
  { id: 'seances', label: 'Séances' },
  { id: 'participants', label: 'Participants' },
  { id: 'equipes', label: 'Équipes' },
  { id: 'preuves', label: 'Preuves de compétences' },
  { id: 'documents', label: 'Documents' },
];

const PARTICIPANT_TABS: { id: AfficheTab; label: string }[] = [
  { id: 'overview', label: "Vue d'ensemble" },
  { id: 'seances', label: 'Mes séances' },
  { id: 'preuves', label: 'Mes preuves' },
  { id: 'documents', label: 'Documents' },
];

const DOC_SEED: { id: string; name: string; vis: 'equipe' | 'participants' | 'structure' }[] = [
  { id: 'd1', name: "Livret d'accueil.pdf", vis: 'participants' },
  { id: 'd2', name: 'Convention-type.docx', vis: 'equipe' },
  { id: 'd3', name: 'Plaquette de présentation.pdf', vis: 'structure' },
];

const VIS_LABEL = {
  equipe: 'Équipe',
  participants: 'Participants',
  structure: 'Ma structure',
} as const;

const EU_CADRE_TOTAL = 11;

function parseFrDateValue(s?: string): Date | null {
  if (!s) return null;
  if (s.includes('-')) {
    const [y, m, d] = s.split('-');
    return new Date(Number(y), Number(m) - 1, Number(d));
  }
  const [d, m, y] = s.split('/');
  if (!y) return null;
  return new Date(Number(y), Number(m) - 1, Number(d));
}

function qualiopiExpired(): boolean {
  const d = parseFrDateValue(MOCK_OF_ORG.qualiopiValidUntil);
  return Boolean(d && d.getTime() < Date.now());
}

const MONTHS = ['jan', 'fév', 'mar', 'avr', 'mai', 'juin', 'juil', 'août', 'sep', 'oct', 'nov', 'déc'];

function dayMonth(slot: FormationSlot): { day: string; month: string } {
  if (slot.day && slot.month) return { day: slot.day, month: slot.month };
  if (slot.dateIso) {
    const [, m, d] = slot.dateIso.split('-');
    return { day: d, month: MONTHS[Number(m) - 1] ?? '' };
  }
  return { day: '—', month: '' };
}

function formatFr(iso?: string): string {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

const FormationAffiche: React.FC = () => {
  const navigate = useNavigate();
  const { setCurrentPage } = useAppContext();
  const { showSuccess, showError } = useToast();
  const formationId = getSelectedFormationId() || '';
  const [formation, setFormation] = useState(() => getFormationById(formationId) ?? null);
  const [slots, setSlots] = useState(() => getFormationSlots(formationId));
  const [people, setPeople] = useState(() => getFormationPeople(formationId));
  const [tab, setTab] = useState<AfficheTab>('seances');
  const [visibility, setVisibility] = useState<'structure' | 'financeur'>('structure');
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('12:30');
  const [description, setDescription] = useState('');
  const [mode, setMode] = useState<ParticipationMode>('presentiel');
  const [place, setPlace] = useState('Salle 2');
  const [closeSlotId, setCloseSlotId] = useState<string | null>(null);
  const [cancelSlotId, setCancelSlotId] = useState<string | null>(null);
  const [attestIds, setAttestIds] = useState<Set<string>>(new Set());
  const [closeFormationOpen, setCloseFormationOpen] = useState(false);
  const [birthOpen, setBirthOpen] = useState(false);
  const [attestOpen, setAttestOpen] = useState(false);
  const [attestPerson, setAttestPerson] = useState<string | null>(null);
  const [view, setView] = useState<'porteur' | 'participant'>('porteur');
  const [shareNominatif, setShareNominatif] = useState(true);
  const [docs, setDocs] = useState(DOC_SEED);
  const [mcueWall, setMcueWall] = useState(false);
  const [certTab, setCertTab] = useState<'preuves' | 'certificats'>('preuves');

  useEffect(() => subscribeFormations(() => setFormation(getFormationById(formationId) ?? null)), [formationId]);
  useEffect(
    () =>
      subscribeFormationSlots(() => {
        setSlots(getFormationSlots(formationId));
      }),
    [formationId]
  );
  useEffect(
    () => subscribeFormationPeople(() => setPeople(getFormationPeople(formationId))),
    [formationId]
  );

  const back = () => {
    setCurrentPage('formation-detail');
    navigate('/formation-detail');
  };

  const pending = people.participants.filter((p) => p.pendingActivation);
  const closeSlot = slots.find((s) => s.id === closeSlotId);
  const cancelSlot = slots.find((s) => s.id === cancelSlotId);

  const openSession = (slot: FormationSlot) => {
    if (slot.status === 'closed' || slot.status === 'cancelled') {
      showError('On ne rouvre pas une séance close.');
      return;
    }
    updateFormationSlot(formationId, slot.id, { status: 'open' });
    openPresenceSession({
      formationId,
      slotId: slot.id,
      formationTitle: formation?.title ?? '',
      slotLabel: slot.label,
      sessionDateLabel: slot.dateLabel,
      confirmed: 0,
      total: slot.participantsCount || people.participants.length || 12,
    });
    setCurrentPage('presence-session');
    navigate('/presence-session');
  };

  const createSeance = () => {
    if (!name.trim() || !date) return;
    const [, m, d] = date.split('-');
    const start = startTime.replace(':', 'h');
    const end = endTime.replace(':', 'h');
    addFormationSlot(formationId, {
      label: name.trim(),
      dateLabel: formatSlotDateLabel(new Date(`${date}T12:00:00`)),
      dateIso: date,
      day: d,
      month: MONTHS[Number(m) - 1],
      timeRange: `${start} — ${end}`,
      participantsCount: people.participants.length,
      description: description.trim() || undefined,
      place: place.trim() || undefined,
      participationMode: mode,
      animatedBy: 'vous',
      status: 'planned',
    });
    setName('');
    setDescription('');
    showSuccess('✓ Enregistré');
  };

  const confirmClose = () => {
    if (!closeSlotId) return;
    const attested = attestIds.size;
    const verified = 9;
    const sansSaisie = Math.max(
      0,
      (closeSlot?.participantsCount ?? 12) - verified - attested
    );
    updateFormationSlot(formationId, closeSlotId, {
      status: 'closed',
      confirmedCount: verified + attested,
      proofsCount: verified + attested,
    });
    setCloseSlotId(null);
    setAttestIds(new Set());
    showSuccess(
      `✓ Enregistré — ${verified} vérifiées · ${attested} attestées · ${sansSaisie} sans saisie`
    );
  };

  const confirmCancel = () => {
    if (!cancelSlotId) return;
    updateFormationSlot(formationId, cancelSlotId, { status: 'cancelled' });
    setCancelSlotId(null);
    showSuccess('✓ Enregistré');
  };

  const confirmCloseFormation = (share: boolean) => {
    if (!formation) return;
    const proof = formation.proofNumber || `PF·${new Date().getFullYear()}·FR·4K8NX2QM`;
    updateFormation(formation.id, {
      status: 'ended',
      hasProof: true,
      proofNumber: proof,
      frameLocked: true,
      meta: `clôturée le ${formatFr(formation.endDate)} · ${people.participants.length} participants · ${proof}`,
    });
    setCloseFormationOpen(false);
    setBirthOpen(true);
    if (share) showSuccess('Rapport envoyé aux financeurs cochés');
  };

  const followPreview = useMemo(() => {
    if (!formation) return MOCK_FOLLOW_DEBUTER;
    if (formation.title.startsWith('Débuter dans le numérique')) return MOCK_FOLLOW_DEBUTER;
    return followViewFromFormation(formation, {
      identitiesDone: people.participants.filter((p) => p.identityVerified).length,
      identitiesTotal: people.participants.length,
    });
  }, [formation, people.participants]);

  const nextSlot = slots.find((s) => s.status === 'planned');
  const held = slots.filter((s) => s.status === 'closed').length;
  const openSlot = slots.find((s) => s.status === 'open');
  const visibleTabs = view === 'participant' ? PARTICIPANT_TABS : TABS;
  const canClose =
    view === 'porteur' &&
    (formation?.status === 'in_progress' || formation?.status === 'coming');
  const euFilled = formation
    ? [
        formation.title,
        formation.description,
        formation.startDate && formation.endDate,
        (formation.learningOutcomes ?? []).length,
        formation.participationMode,
        formation.durationHours,
        formation.workloadEcts,
        formation.eqfLevel != null,
        formation.eqfFramework,
        formation.assessmentType,
        (formation.teachingLanguages ?? []).length,
      ].filter(Boolean).length
    : 0;
  const qExpired = qualiopiExpired();
  const qExpiresBeforeEnd = Boolean(
    formation?.endDate &&
      parseFrDateValue(MOCK_OF_ORG.qualiopiValidUntil) &&
      parseFrDateValue(MOCK_OF_ORG.qualiopiValidUntil)!.getTime() <
        parseFrDateValue(formation.endDate)!.getTime()
  );

  const tryCloseFormation = () => {
    if (formation?.isEuMcDeclared && qExpired) {
      setMcueWall(true);
      return;
    }
    setCloseFormationOpen(true);
  };

  if (!formation) {
    return (
      <section className="fa-page">
        <button type="button" className="fa-back" onClick={back}>
          ←
        </button>
        <p>Formation introuvable.</p>
      </section>
    );
  }

  const statusChip =
    formation.status === 'in_progress'
      ? 'EN COURS'
      : formation.status === 'coming'
        ? 'À VENIR'
        : 'TERMINÉE';

  return (
    <section className="fa-page" aria-label="Affiche formation">
      <div className="fa-head">
        <button type="button" className="fa-back" onClick={back} aria-label="Retour">
          ←
        </button>
        <h1>La formation</h1>
        <div className="fa-actions">
          {canClose && (
            <button type="button" className="fa-btn ghost" onClick={tryCloseFormation}>
              ✓ Clôturer la formation
            </button>
          )}
          {view === 'porteur' && formation.status !== 'ended' && formation.status !== 'archived' && (
            <>
              <button type="button" className="fa-btn ghost" onClick={() => setCreateOpen(true)}>
                📅 Créer une séance
              </button>
              <button
                type="button"
                className="fa-btn primary"
                onClick={() => {
                  setAttestPerson(null);
                  setAttestOpen(true);
                }}
              >
                🏅 Attester une compétence
              </button>
            </>
          )}
          <button
            type="button"
            className="fa-btn ghost"
            onClick={() =>
              setView((v) => {
                const next = v === 'porteur' ? 'participant' : 'porteur';
                if (next === 'participant' && (tab === 'participants' || tab === 'equipes')) {
                  setTab('overview');
                }
                return next;
              })
            }
          >
            {view === 'porteur' ? 'Vue participante' : 'Vue porteur'}
          </button>
        </div>
      </div>

      <header className="fa-hero">
        <div className="fa-cover">
          <span>{formation.imageName || 'Débuter dans le numérique'}</span>
        </div>
        <div className="fa-hbody">
          <div className="fa-staterow">
            <span className="fa-chip run">{statusChip}</span>
            <span className="fa-chip date">
              {formatFr(formation.startDate)} → {formatFr(formation.endDate)}
            </span>
            <span className="fa-role">
              {view === 'participant' ? 'Participante' : 'Responsable de la formation'}
            </span>
            {formation.isEuMcDeclared && <span className="fa-chip mc">MC UE déclarée</span>}
          </div>
          <h2>{formation.title}</h2>
          <p className="fa-org">
            {MOCK_OF_ORG.name} · {MOCK_OF_ORG.kind}{' '}
            <span className="fa-qualiopi">{MOCK_OF_ORG.qualiopiLabel}</span>
          </p>
          <p className="fa-desc">{formation.description}</p>
          <div className="fa-meta">
            {view === 'participant' ? (
              <>
                <span>
                  📅 {held}/{slots.length} séances
                </span>
                <span>🏅 2 preuves à moi</span>
              </>
            ) : (
              <>
                <span>👥 {people.participants.length} participants</span>
                <span>📅 {slots.length} séances</span>
              </>
            )}
          </div>
          {view === 'porteur' && (
          <div className="fa-tog">
            <button
              type="button"
              className={visibility === 'structure' ? 'on' : ''}
              onClick={() => setVisibility('structure')}
            >
              Privé — ma structure
            </button>
            <button
              type="button"
              className={visibility === 'financeur' ? 'on' : ''}
              onClick={() => setVisibility('financeur')}
            >
              Ouverte — au financeur
            </button>
          </div>
          )}
        </div>
      </header>

      {formation.isEuMcDeclared && view === 'porteur' && (
        <div className="fa-eubar">
          <div className="fa-eucount">
            {qExpired ? Math.max(0, euFilled - 1) : euFilled}/{EU_CADRE_TOTAL}
          </div>
          <div>
            <b>Le compteur européen.</b>{' '}
            {formation.status === 'ended'
              ? 'La preuve est née — le cadre est posé.'
              : 'Vos inscrits l’ont porté — la clôture écrira le dernier. La preuve naîtra à 11/11.'}
          </div>
        </div>
      )}
      {formation.isEuMcDeclared && view === 'porteur' && (qExpired || qExpiresBeforeEnd) && (
        <div className="fa-cpfban">
          ⚠{' '}
          <div>
            <b>Si une condition tombe, l’alerte est immédiate</b>
            {qExpired
              ? ` — le compteur est redescendu (${Math.max(0, euFilled - 1)}/${EU_CADRE_TOTAL}) : l’agrément a expiré le ${MOCK_OF_ORG.qualiopiValidUntil}.`
              : ` — l’agrément Qualiopi expire le ${MOCK_OF_ORG.qualiopiValidUntil}, avant la fin de la formation.`}
          </div>
        </div>
      )}
      {view === 'participant' && openSlot && (
        <div className="fa-presence">
          <div>
            <b>📍 Une session de présence est en cours</b>
            <p>
              Séance du jour · {openSlot.label} — saisissez le code affiché par votre formateur.
            </p>
          </div>
          <div className="fa-presence-row">
            <input className="fa-code" maxLength={6} placeholder="______" aria-label="Code de présence" />
            <button type="button" className="fa-btn primary">
              Confirmer ma présence
            </button>
          </div>
        </div>
      )}

      {visibility === 'financeur' && view === 'porteur' ? (
        <FunderFollowView data={followPreview} preview />
      ) : (
        <>
          <div className="fa-tabs" role="tablist">
            {visibleTabs.map((item) => (
              <button
                key={item.id}
                type="button"
                className={tab === item.id ? 'on' : ''}
                onClick={() => setTab(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>

          {tab === 'overview' && (
            <div>
              {formation.status === 'ended' && view === 'porteur' && (
                <>
                  <section className="fa-sec fa-pfblock">
                    <h3>🛡 Preuve Formation® — générée</h3>
                    <div className="fa-pfnum">{formation.proofNumber}</div>
                    <p className="fa-sub">
                      {people.participants.length} participants · {formation.durationHours ?? '—'}{' '}
                      heures · {slots.length} séances · présences restituées par séance · accès
                      nominatif
                    </p>
                    <div className="fa-pfacts">
                      <button type="button" className="fa-btn primary">
                        Exporter PDF
                      </button>
                      <button type="button" className="fa-btn ghost">
                        Partager avec DGEFP / Qualiopi
                      </button>
                      <button type="button" className="fa-btn ghost">
                        Vérification publique
                      </button>
                    </div>
                  </section>
                  <section className="fa-sec">
                    <h3>📜 Certificats de réalisation — {people.participants.length} générés</h3>
                    <p className="fa-sub">
                      <b>9 envoyés par email</b> · <b>3 à imprimer</b> — la remise papier est le
                      pont vers leur espace : chaque certificat porte le QR d’activation personnel
                      de l’apprenant.
                    </p>
                    <button type="button" className="fa-btn ghost">
                      🖨 Imprimer les 3 certificats
                    </button>
                  </section>
                </>
              )}
              {view === 'porteur' && (
              <div className="fa-kpis">
                <div>
                  <b>{people.participants.length}</b>
                  <span>Participants</span>
                  <em>
                    identités {people.participants.filter((p) => p.identityVerified).length}/
                    {people.participants.length || 0}
                  </em>
                </div>
                <div>
                  <b>
                    {held}/{slots.length || 0}
                  </b>
                  <span>Séances tenues</span>
                </div>
                <div>
                  <b>{formation.durationHours ?? '—'} h</b>
                  <span>Durée</span>
                </div>
                <div>
                  <b>{held * 2}</b>
                  <span>Preuves</span>
                </div>
              </div>
              )}
              <section className="fa-sec">
                <h3>
                  {view === 'participant'
                    ? '📚 Le programme de la formation'
                    : '📚 Le programme — les acquis d\'apprentissage'}
                </h3>
                <p className="fa-sub">
                  {view === 'participant'
                    ? 'Ce que vous saurez faire — le cadre remis, figé à la création.'
                    : 'La promesse figée à la création — et le travail accompli, acquis par acquis.'}
                </p>
                {view === 'participant' && formation.description ? (
                  <p>{formation.description}</p>
                ) : null}
                {(formation.learningOutcomes ?? []).map((o) => (
                  <div key={o.id} className="fa-acq">
                    <span>{o.text}</span>
                    <span className="fa-cnt">attesté —</span>
                  </div>
                ))}
              </section>
              <section className="fa-sec">
                <h3>📋 Le cadre — figé à la création</h3>
                <p>
                  <b>{formation.durationHours ?? '—'} heures</b>
                  {' · '}
                  {formatFr(formation.startDate)} → {formatFr(formation.endDate)}
                  {' · '}
                  {formation.participationMode
                    ? PARTICIPATION_LABEL[formation.participationMode]
                    : 'Présentiel'}
                  {formation.financement
                    ? ` · ${FINANCEMENT_LABEL[formation.financement]}`
                    : ''}
                </p>
              </section>
              {nextSlot && (
                <article className="fa-seance">
                  <div className="fa-dt">
                    <b>{dayMonth(nextSlot).day}</b>
                    <span>{dayMonth(nextSlot).month}</span>
                  </div>
                  <div>
                    <div className="fa-ti">Prochaine séance — {nextSlot.label}</div>
                    <div className="fa-su">
                      {nextSlot.timeRange}
                      {nextSlot.place ? ` · ${nextSlot.place}` : ''} · animée par{' '}
                      {nextSlot.animatedBy}
                    </div>
                  </div>
                  <span className="fa-sst up">à venir</span>
                </article>
              )}
            </div>
          )}

          {tab === 'seances' && (
            <section className="fa-sec">
              <h3>
                {view === 'participant' ? `📅 Mes séances (${slots.length})` : `📅 Séances (${slots.length})`}{' '}
                {view === 'porteur' && (
                  <button type="button" className="fa-add" onClick={() => setCreateOpen((v) => !v)}>
                    + Créer une séance
                  </button>
                )}
              </h3>

              {createOpen && view === 'porteur' && (
                <div className="fa-panel">
                  <div className="fa-panel-h">
                    <h4>Créer une séance</h4>
                    <button type="button" className="fa-fold" onClick={() => setCreateOpen(false)}>
                      ▴ replier
                    </button>
                  </div>
                  <p className="fa-sub">
                    Elle rejoint la liste — le panneau reste ouvert pour enchaîner, et se replie
                    quand vous n&apos;avez rien à créer.
                  </p>
                  <div className="fa-two">
                    <label>
                      Nom de la séance <em>✱</em>
                      <input value={name} onChange={(e) => setName(e.target.value)} />
                    </label>
                    <label>
                      Date <em>✱</em>
                      <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                    </label>
                  </div>
                  <div className="fa-two">
                    <label>
                      Début
                      <input
                        type="time"
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                      />
                    </label>
                    <label>
                      Fin
                      <input
                        type="time"
                        value={endTime}
                        onChange={(e) => setEndTime(e.target.value)}
                      />
                    </label>
                  </div>
                  <label>
                    Petite description <span className="opt">— optionnelle</span>
                    <input
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Ce que la séance couvre…"
                    />
                  </label>
                  <div className="fa-two">
                    <div>
                      <span className="fa-lab">Mode de participation</span>
                      <div className="fa-modes">
                        {(
                          [
                            ['presentiel', 'Présentiel'],
                            ['distanciel', 'Distanciel'],
                            ['hybride', 'Hybride'],
                          ] as const
                        ).map(([id, label]) => (
                          <button
                            key={id}
                            type="button"
                            className={mode === id ? 'sel' : ''}
                            onClick={() => setMode(id)}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <label>
                      Lieu <span className="opt">— se figera</span>
                      <input value={place} onChange={(e) => setPlace(e.target.value)} />
                    </label>
                  </div>
                  <div className="fa-two">
                    <label>
                      Participants de la séance
                      <input
                        readOnly
                        value={`Tous les inscrits (${people.participants.length})`}
                      />
                      <span className="fa-hint">
                        ou un groupe, ou choisir — verrouillés à l&apos;ouverture de la session
                      </span>
                    </label>
                    <label>
                      Animée par
                      <input readOnly value="Vous" />
                      <span className="fa-hint">
                        à changer seulement pour confier CETTE séance à un formateur ou un
                        intervenant
                      </span>
                    </label>
                  </div>
                  <div className="fa-end">
                    <button type="button" className="fa-btn primary" onClick={createSeance}>
                      Créer la séance
                    </button>
                  </div>
                  <p className="fa-pfoot">
                    <b>En présentiel, la séance s&apos;ouvrira par un code de session</b> — celui
                    qui l&apos;anime la lance le jour J. Avant l&apos;ouverture : nom, date et
                    animateur restent modifiables (✎) — le lieu se fige dès sa pose.
                  </p>
                </div>
              )}

              {slots.map((slot, index) => {
                const dm = dayMonth(slot);
                const n = index + 1;
                const sst =
                  slot.status === 'closed'
                    ? 'done'
                    : slot.status === 'cancelled'
                      ? 'off'
                      : slot.status === 'open'
                        ? 'today'
                        : 'up';
                return (
                  <article
                    key={slot.id}
                    className={`fa-seance ${slot.status === 'cancelled' ? 'cancelled' : ''}`}
                  >
                    <div className="fa-dt">
                      <b>{dm.day}</b>
                      <span>{dm.month}</span>
                    </div>
                    <div className="fa-bd">
                      <div className="fa-ti">
                        Séance {n} — {slot.label}
                      </div>
                      <div className="fa-su">
                        {slot.status === 'cancelled' ? (
                          "annulée — la trace reste, rien ne s'y atteste"
                        ) : (
                          <>
                            {slot.timeRange}
                            {slot.place ? ` · ${slot.place}` : ''} ·{' '}
                            {slot.participantsCount} participants · animée par {slot.animatedBy}
                            {slot.status === 'closed' && (
                              <>
                                {' · '}
                                <b>
                                  {slot.confirmedCount ?? slot.participantsCount}/
                                  {slot.participantsCount} présences confirmées — figé à la
                                  clôture
                                </b>
                                {slot.proofsCount
                                  ? ` · ${slot.proofsCount} preuves de présence générées`
                                  : ''}
                              </>
                            )}
                            {slot.status === 'open' && (
                              <>
                                {' · '}
                                <b>aujourd&apos;hui</b>
                              </>
                            )}
                            {slot.animatedBy &&
                              slot.animatedBy !== 'vous' &&
                              slot.status === 'planned' && (
                                <>
                                  {' — '}
                                  <b>
                                    elle verra « Ouvrir la session » sur SA carte, le jour J
                                  </b>
                                </>
                              )}
                          </>
                        )}
                      </div>
                      {(slot.status === 'planned' || slot.status === 'open') &&
                        view === 'porteur' &&
                        (slot.animatedBy === 'vous' || slot.status === 'open') && (
                          <div className="fa-seance-actions">
                            <button
                              type="button"
                              className="fa-btn primary"
                              onClick={() => openSession(slot)}
                            >
                              Ouvrir la session de présence
                            </button>
                            <button
                              type="button"
                              className="fa-btn ghost"
                              onClick={() => {
                                setCloseSlotId(slot.id);
                                setAttestIds(new Set(pending.map((p) => p.id)));
                              }}
                            >
                              Clôturer la séance
                            </button>
                          </div>
                        )}
                    </div>
                    <div className="fa-side">
                      <span className={`fa-sst ${sst}`}>{slotStatusLabel(slot.status)}</span>
                      {slot.status === 'planned' && view === 'porteur' && (
                        <button
                          type="button"
                          className="fa-btn danger"
                          onClick={() => setCancelSlotId(slot.id)}
                        >
                          Annuler
                        </button>
                      )}
                    </div>
                  </article>
                );
              })}

              {view === 'porteur' && (
              <p className="fa-note">
                <b>Attester avec ou sans séance :</b> au geste « Attester une compétence », le
                choix de la séance est proposé — séance choisie, la preuve porte la séance ;
                sans séance, elle porte la formation. Une séance terminée n&apos;accepte plus
                d&apos;attestation — seules les séances ouvertes sont proposées.
              </p>
              )}
            </section>
          )}

          {tab === 'participants' && (
            <section className="fa-sec">
              <h3>
                👥 Participants ({people.participants.length})
                {view === 'porteur' && (
                  <button
                    type="button"
                    className="fa-add"
                    onClick={() => {
                      setCurrentPage('formation-detail');
                      navigate('/formation-detail');
                    }}
                  >
                    + Ajouter une personne
                  </button>
                )}
              </h3>
              {formation.financement === 'CPF' &&
                people.participants.some((p) => !p.identityVerified) && (
                  <div className="fa-cpfban">
                    ⚠{' '}
                    <div>
                      <b>
                        Identité à vérifier :{' '}
                        {people.participants.filter((p) => !p.identityVerified).length} participant
                      </b>{' '}
                      — formation CPF : à vérifier avant la clôture.
                    </div>
                  </div>
                )}
              {people.participants.map((p) => (
                <div key={p.id} className="fa-person">
                  <div className="fa-av">
                    {p.name
                      .split(' ')
                      .slice(0, 2)
                      .map((w) => w[0])
                      .join('')}
                  </div>
                  <div className="fa-person-bd">
                    <b>{p.name}</b>
                    <div className="fa-sub">
                      {p.preRegistered ? "pré-inscrit · en attente d'activation" : 'inscrit'}
                      {' · '}
                      {p.role ?? 'Participant'}
                    </div>
                    {view === 'porteur' && (
                      <div className="fa-person-actions">
                        <button
                          type="button"
                          className="fa-btn primary"
                          style={{ padding: '3px 8px', fontSize: 11 }}
                          onClick={() => {
                            setAttestPerson(p.id);
                            setAttestOpen(true);
                          }}
                        >
                          🏅 Attester
                        </button>
                        {!p.identityVerified && (
                          <button
                            type="button"
                            className="fa-btn ghost"
                            style={{ padding: '3px 8px', fontSize: 11 }}
                            onClick={() => {
                              setPeople(verifyFormationIdentity(formationId, p.id));
                              showSuccess('✓ Identité vérifiée ce jour — jamais conservée · au journal');
                            }}
                          >
                            ☑ Identité vérifiée ce jour
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                  <span className="fa-role-tag">{p.role ?? 'Participant'}</span>
                  <span className={p.identityVerified ? 'fa-idok' : 'fa-idko'}>
                    {p.identityVerified ? '✓ identité vérifiée' : '⚠ à vérifier'}
                  </span>
                </div>
              ))}
            </section>
          )}

          {tab === 'equipes' && (
            <section className="fa-sec">
              <h3>Équipes &amp; partenaires</h3>
              <p className="fa-sub">Un formateur est une personne : il s&apos;ajoute dans Participants, jamais en partenaire.</p>
              {people.funders.map((f) => (
                <div key={f.id} className="fa-person">
                  <div className="fa-av">{f.initials}</div>
                  <div>
                    <b>{f.name}</b>
                    <div className="fa-sub">financeur · informé du démarrage</div>
                  </div>
                </div>
              ))}
            </section>
          )}

          {tab === 'preuves' && (
            <section className="fa-sec">
              {view === 'participant' ? (
                <>
                  <h3>🏅 Mes preuves (2)</h3>
                  <div className="fa-ptabs">
                    <button
                      type="button"
                      className={certTab === 'preuves' ? 'on' : ''}
                      onClick={() => setCertTab('preuves')}
                    >
                      Preuves (2)
                    </button>
                    <button
                      type="button"
                      className={certTab === 'certificats' ? 'on' : ''}
                      onClick={() => setCertTab('certificats')}
                    >
                      Mes certificats (1)
                    </button>
                  </div>
                  {certTab === 'preuves' ? (
                    <>
                      {formation.status === 'ended' && (
                        <div className="fa-mypf">
                          <div className="fa-mypf-h">Kinship · Preuve Formation®</div>
                          <div className="fa-mypf-t">{formation.title}</div>
                          <div className="fa-mypf-n">{formation.proofNumber}</div>
                        </div>
                      )}
                      <div className="fa-pbgrid">
                        <div className="fa-pbcard">
                          <div className="fa-pbhead ev">PREUVE KINSHIP · ÉVÉNEMENT</div>
                          <div className="fa-pbbody">
                            <b>Présence vérifiée ✓</b>
                            <span>Séance 1 · Atelier Numérique Formation</span>
                          </div>
                        </div>
                        <div className="fa-pbcard">
                          <div className="fa-pbhead sk">PREUVE KINSHIP · COMPÉTENCE</div>
                          <div className="fa-pbbody">
                            <b>Utiliser un traitement de texte</b>
                            <span>📚 DigComp · EQF 2 · ✓ Attestée</span>
                          </div>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="fa-certline">
                      <span>📜 Certificat de réalisation — téléchargeable (visible par vous seule)</span>
                      <button type="button" className="fa-btn ghost">
                        Télécharger
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <h3>Preuves de compétences</h3>
                  <p className="fa-sub">
                    L&apos;attestation reprend le geste existant du produit — une séance ouverte, ou
                    la formation. Les preuves de présence y vivent aussi.
                  </p>
                </>
              )}
            </section>
          )}

          {tab === 'documents' && (
            <section className="fa-sec">
              <h3>Documents ({view === 'participant' ? docs.filter((d) => d.vis === 'participants').length : docs.length})</h3>
              <p className="fa-sub">
                {view === 'participant'
                  ? 'Le livret d’accueil · le programme détaillé — visibles des participants.'
                  : 'Équipe (défaut) · Participants · Ma structure — « Public » n’existe pas pour une formation.'}
              </p>
              {(view === 'participant' ? docs.filter((d) => d.vis === 'participants') : docs).map(
                (doc) => (
                  <div key={doc.id} className="fa-docrow">
                    <span>📄 {doc.name}</span>
                    {view === 'porteur' && (
                      <span className="fa-vispills">
                        {(Object.keys(VIS_LABEL) as Array<keyof typeof VIS_LABEL>).map((id) => (
                          <button
                            key={id}
                            type="button"
                            className={doc.vis === id ? 'on' : ''}
                            onClick={() =>
                              setDocs((prev) =>
                                prev.map((d) => (d.id === doc.id ? { ...d, vis: id } : d))
                              )
                            }
                          >
                            {VIS_LABEL[id]}
                          </button>
                        ))}
                      </span>
                    )}
                  </div>
                )
              )}
            </section>
          )}
        </>
      )}

      {closeSlot && (
        <div className="fa-modal">
          <div className="fa-modal-card">
            <h3>Clôturer la séance ?</h3>
            <p>
              <b>9 présences vérifiées</b> (code saisi).
            </p>
            <div className="fa-attest">
              <b>Sans compte activé — attester leur présence.</b>
              {pending.length === 0 ? (
                <p className="fa-sub">Aucun inscrit sans compte activé.</p>
              ) : (
                pending.map((p) => (
                  <label key={p.id}>
                    <input
                      type="checkbox"
                      checked={attestIds.has(p.id)}
                      onChange={() => {
                        setAttestIds((prev) => {
                          const next = new Set(prev);
                          if (next.has(p.id)) next.delete(p.id);
                          else next.add(p.id);
                          return next;
                        });
                      }}
                    />
                    {p.name}
                  </label>
                ))
              )}
              <p className="fa-legal">
                L&apos;attestation du formateur fait foi — art. R. 6332-26 C. trav.
              </p>
            </div>
            <p>
              Le compte se fige :{' '}
              <b>
                9 vérifiées · {attestIds.size} attestées ·{' '}
                {Math.max(0, (closeSlot.participantsCount ?? 12) - 9 - attestIds.size)} sans saisie
              </b>
              . Les attestations sur cette séance se ferment. On ne rouvre pas une séance close.
            </p>
            <div className="fa-modal-actions">
              <button type="button" className="fa-btn ghost" onClick={() => setCloseSlotId(null)}>
                Annuler
              </button>
              <button type="button" className="fa-btn primary" onClick={confirmClose}>
                Clôturer la séance
              </button>
            </div>
          </div>
        </div>
      )}

      {cancelSlot && (
        <div className="fa-modal">
          <div className="fa-modal-card">
            <h3>Annuler la séance ?</h3>
            <p>
              « {cancelSlot.label} » ne se tiendra pas. La trace reste — rien ne s&apos;y
              attestera.
            </p>
            <div className="fa-modal-actions">
              <button type="button" className="fa-btn ghost" onClick={() => setCancelSlotId(null)}>
                Garder la séance
              </button>
              <button type="button" className="fa-btn danger-solid" onClick={confirmCancel}>
                Annuler la séance
              </button>
            </div>
          </div>
        </div>
      )}

      {mcueWall && formation && (
        <div className="fa-modal">
          <div className="fa-modal-card">
            <h3>Le sceau MC UE ne peut pas être posé</h3>
            <div className="fa-cpfban" style={{ margin: '0 0 12px' }}>
              ⚠{' '}
              <div>
                <b>L’agrément Qualiopi a expiré le {MOCK_OF_ORG.qualiopiValidUntil}</b> — après le
                démarrage. Le compteur est redescendu ({Math.max(0, euFilled - 1)}/{EU_CADRE_TOTAL}
                ). Trois portes, toutes signées :
              </div>
            </div>
            <button
              type="button"
              className="fa-door"
              onClick={() => {
                setMcueWall(false);
                showSuccess('La formation reste ouverte — renouveler l’agrément, puis clore avec le sceau.');
              }}
            >
              <b>Attendre</b> — renouveler l’agrément, puis clore avec le sceau. La formation reste
              ouverte.
            </button>
            <button
              type="button"
              className="fa-door"
              onClick={() => {
                setMcueWall(false);
                if (formation) updateFormation(formation.id, { isEuMcDeclared: false });
                setCloseFormationOpen(true);
              }}
            >
              <b>Renoncer au sceau</b> — clore en Preuve Formation Enrichie.{' '}
              <span className="fa-oneway">Sens unique.</span>
            </button>
            <button
              type="button"
              className="fa-door"
              onClick={() => {
                setMcueWall(false);
                setCloseFormationOpen(true);
              }}
            >
              <b>Dérogation</b> — la cohorte entrée sous agrément valide reste certifiable
              (L.6113-9) — appréciée par apprenant, sous votre signature.
            </button>
            <p className="fa-sub">
              Rien ne bloque en silence : le mur dit la cause, les portes portent une signature.
              Jamais de repli automatique.
            </p>
            <div className="fa-modal-actions">
              <button type="button" className="fa-btn ghost" onClick={() => setMcueWall(false)}>
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {closeFormationOpen && formation && (
        <div className="fa-modal">
          <div className="fa-modal-card fa-close-f">
            <h3>Clôturer la formation</h3>
            <div className="afm-k">1 · Les gardes</div>
            <div className={people.participants.every((p) => p.identityVerified) ? 'fa-guard ok' : 'fa-guard warn'}>
              {people.participants.every((p) => p.identityVerified)
                ? `✓ Identités vérifiées : ${people.participants.length}/${people.participants.length} — la formation CPF peut se clore.`
                : `⚠ Identité à vérifier : ${people.participants.filter((p) => !p.identityVerified).length} — formation CPF : à vérifier avant la clôture.`}
            </div>
            <div className="fa-guard mute">
              {slots.length} séances — {held} closes · {formation.durationHours ?? '—'} heures ·{' '}
              {people.participants.length} participants
            </div>
            <div className="afm-k">3 · Clôturer et partager</div>
            {people.funders.map((f) => (
              <div key={f.id} className="fa-share-row">
                ☑ <b>{f.name}</b> — votre financeur
                <span className="fa-share-mode">
                  <button type="button" className={shareNominatif ? 'on' : ''} onClick={() => setShareNominatif(true)}>
                    nominatif
                  </button>
                  <button type="button" className={!shareNominatif ? 'on' : ''} onClick={() => setShareNominatif(false)}>
                    anonyme
                  </button>
                </span>
              </div>
            ))}
            <p>
              La clôture génère la <b>Preuve Formation</b> — authentique et vérifiable — et le{' '}
              <b>certificat de réalisation de chaque apprenant</b>. On ne rouvre pas une formation close.
            </p>
            <div className="fa-modal-actions">
              <button type="button" className="fa-btn ghost" onClick={() => confirmCloseFormation(false)}>
                Clôturer sans partager
              </button>
              <button type="button" className="fa-btn primary" onClick={() => confirmCloseFormation(true)}>
                Clôturer et partager
              </button>
            </div>
          </div>
        </div>
      )}

      {birthOpen && formation && (
        <CloseFormationBirthOverlay
          title={formation.title}
          organization={MOCK_OF_ORG.name}
          proofNumber={formation.proofNumber}
          datesLabel={`${formatFr(formation.startDate)} → ${formatFr(formation.endDate)}`}
          qualiopi
          euMc={Boolean(formation.isEuMcDeclared)}
          onOpen={() => {
            setBirthOpen(false);
            setCurrentPage('preuve-formation');
            navigate('/preuve-formation');
          }}
          onContinue={() => setBirthOpen(false)}
        />
      )}

      {attestOpen && (
        <AttestFormationModal
          participants={people.participants}
          outcomes={formation?.learningOutcomes ?? []}
          slots={slots.map((s) => ({ id: s.id, label: s.label, status: s.status }))}
          preselectedId={attestPerson}
          onClose={() => setAttestOpen(false)}
          onAttest={() => {
            setAttestOpen(false);
            showSuccess('✓ Compétence attestée — une preuve par personne');
          }}
        />
      )}
    </section>
  );
};

export default FormationAffiche;
