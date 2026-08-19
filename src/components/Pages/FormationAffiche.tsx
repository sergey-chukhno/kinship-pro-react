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
  updateFormationSlot,
} from '../../utils/formationStore';
import { openPresenceSession } from '../../utils/presenceSessionStore';
import { useToast } from '../../hooks/useToast';
import FunderFollowView from '../FunderView/FunderFollowView';
import { MOCK_FOLLOW_DEBUTER } from '../../data/mockFunderView';
import { followViewFromFormation } from '../../utils/funderFollowFromFormation';
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
  const people = getFormationPeople(formationId);
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

  useEffect(() => subscribeFormations(() => setFormation(getFormationById(formationId) ?? null)), [formationId]);
  useEffect(
    () =>
      subscribeFormationSlots(() => {
        setSlots(getFormationSlots(formationId));
      }),
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
          <button type="button" className="fa-btn ghost" onClick={() => setCreateOpen(true)}>
            📅 Créer une séance
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
            <span className="fa-role">Responsable de la formation</span>
          </div>
          <h2>{formation.title}</h2>
          <p className="fa-org">
            {MOCK_OF_ORG.name} · {MOCK_OF_ORG.kind}{' '}
            <span className="fa-qualiopi">{MOCK_OF_ORG.qualiopiLabel}</span>
          </p>
          <p className="fa-desc">{formation.description}</p>
          <div className="fa-meta">
            <span>👥 {people.participants.length} participants</span>
            <span>📅 {slots.length} séances</span>
          </div>
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
        </div>
      </header>

      {visibility === 'financeur' ? (
        <FunderFollowView data={followPreview} preview />
      ) : (
        <>
          <div className="fa-tabs" role="tablist">
            {TABS.map((item) => (
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
              <div className="fa-kpis">
                <div>
                  <b>{people.participants.length}</b>
                  <span>Participants</span>
                </div>
                <div>
                  <b>
                    {held}/{slots.length}
                  </b>
                  <span>Séances tenues</span>
                </div>
                <div>
                  <b>{formation.durationHours ?? '—'} h</b>
                  <span>Durée</span>
                </div>
              </div>
              <section className="fa-sec">
                <h3>📚 Le programme — les acquis d&apos;apprentissage</h3>
                <p className="fa-sub">
                  La promesse figée à la création — et le travail accompli, acquis par acquis.
                </p>
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
                📅 Séances ({slots.length}){' '}
                <button type="button" className="fa-add" onClick={() => setCreateOpen((v) => !v)}>
                  + Créer une séance
                </button>
              </h3>

              {createOpen && (
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
                      {slot.status === 'planned' && (
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

              <p className="fa-note">
                <b>Attester avec ou sans séance :</b> au geste « Attester une compétence », le
                choix de la séance est proposé — séance choisie, la preuve porte la séance ;
                sans séance, elle porte la formation. Une séance terminée n&apos;accepte plus
                d&apos;attestation — seules les séances ouvertes sont proposées.
              </p>
            </section>
          )}

          {tab === 'participants' && (
            <section className="fa-sec">
              <h3>Participants ({people.participants.length})</h3>
              {people.participants.map((p) => (
                <div key={p.id} className="fa-person">
                  <div className="fa-av">
                    {p.name
                      .split(' ')
                      .slice(0, 2)
                      .map((w) => w[0])
                      .join('')}
                  </div>
                  <div>
                    <b>{p.name}</b>
                    <div className="fa-sub">
                      {p.preRegistered ? 'pré-inscrite · en attente d&apos;activation' : 'inscrite'}{' '}
                      · {p.role ?? 'Participant'}
                    </div>
                  </div>
                  <span className={p.identityVerified ? 'fa-idok' : 'fa-idko'}>
                    {p.identityVerified ? '✓ identité' : '⚠ à vérifier'}
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
              <h3>Preuves de compétences</h3>
              <p className="fa-sub">
                L&apos;attestation reprend le geste existant du produit — une séance ouverte, ou
                la formation.
              </p>
            </section>
          )}

          {tab === 'documents' && (
            <section className="fa-sec">
              <h3>Documents</h3>
              <p className="fa-sub">Les documents s&apos;ajoutent aussi depuis l&apos;espace de gestion.</p>
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
    </section>
  );
};

export default FormationAffiche;
