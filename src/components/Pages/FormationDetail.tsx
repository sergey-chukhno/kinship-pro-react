import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../../context/AppContext';
import {
  FormationCard,
  FormationStatus,
  FinancementType,
  FINANCEMENT_LABEL,
  FINANCEMENT_OPTIONS,
  MOCK_OF_ORG,
  PARTICIPATION_LABEL,
  ParticipationMode,
} from '../../data/mockFormations';
import {
  FormationFunder,
  FormationParticipant,
  FormationPartner,
  FormationPersonRole,
  getFormationById,
  getFormationPeople,
  getSelectedFormationId,
  setFormationPeople,
  setSelectedFormationId,
  subscribeFormations,
  updateFormation,
  missingCadre,
} from '../../utils/formationStore';
import { useToast } from '../../hooks/useToast';
import FunderFollowView from '../FunderView/FunderFollowView';
import { MOCK_FOLLOW_DEBUTER } from '../../data/mockFunderView';
import { followViewFromFormation } from '../../utils/funderFollowFromFormation';
import './FormationDetail.css';

const STATUS_CHIP: Record<FormationStatus, string> = {
  draft: 'Brouillon',
  coming: 'À venir',
  in_progress: 'En cours',
  ended: 'Terminée',
  archived: 'Archivée',
};

function formatFrDate(iso?: string): string {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

function initialsOf(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
}

function fileSizeLabel(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  return `${Math.ceil(bytes / 1024)} Ko`;
}

type DetailTab = 'informations' | 'gestion';
type VisibilityView = 'structure' | 'financeur';

const ATTACHED_FUNDERS = [{ name: 'OPCO Atlas', initials: 'OA' }];

const FormationDetail: React.FC = () => {
  const navigate = useNavigate();
  const { setCurrentPage } = useAppContext();
  const { showSuccess, showError } = useToast();
  const [formationId, setFormationId] = useState(() => getSelectedFormationId() || '');
  const [formation, setFormation] = useState<FormationCard | null>(
    () => getFormationById(formationId) ?? null
  );
  const [activeTab, setActiveTab] = useState<DetailTab>(() =>
    sessionStorage.getItem('kinship_f2_tab') === 'informations' ? 'informations' : 'gestion'
  );
  const [visibility, setVisibility] = useState<VisibilityView>('structure');
  const [people, setPeople] = useState(() => getFormationPeople(formationId));
  const [addPersonOpen, setAddPersonOpen] = useState(false);
  const [personName, setPersonName] = useState('');
  const [personRole, setPersonRole] = useState<FormationPersonRole>('Participant');
  const [intervenorIntent, setIntervenorIntent] = useState<'participate' | 'coattest'>('participate');
  const [justAddedId, setJustAddedId] = useState<string | null>(null);
  const [addFunderOpen, setAddFunderOpen] = useState(false);
  const [funderQuery, setFunderQuery] = useState('');
  const [funderEmail, setFunderEmail] = useState('');
  const [funderShare, setFunderShare] = useState<'nominatif' | 'anonyme'>('nominatif');
  const [addPartnerOpen, setAddPartnerOpen] = useState(false);
  const [partnerName, setPartnerName] = useState('');
  type DocVis = 'equipe' | 'participants' | 'structure';
  const [documents, setDocuments] = useState<
    { id: string; name: string; size: number; vis: DocVis }[]
  >([]);
  const [addDocsOpen, setAddDocsOpen] = useState(true);
  const [docDragOver, setDocDragOver] = useState(false);
  const [justAddedDocId, setJustAddedDocId] = useState<string | null>(null);
  const [datePanelOpen, setDatePanelOpen] = useState(false);
  const [newStart, setNewStart] = useState('');
  const [newEnd, setNewEnd] = useState('');
  const [dateMotif, setDateMotif] = useState('');
  const [createOpen, setCreateOpen] = useState(false);

  useEffect(() => {
    sessionStorage.removeItem('kinship_f2_tab');
  }, []);

  useEffect(() => {
    const id = getSelectedFormationId() || '';
    setFormationId(id);
    setFormation(getFormationById(id) ?? null);
    setPeople(getFormationPeople(id));
  }, []);

  useEffect(() => {
    return subscribeFormations(() => {
      const id = getSelectedFormationId() || formationId;
      setFormation(getFormationById(id) ?? null);
    });
  }, [formationId]);

  const persistPeople = (next: typeof people) => {
    setPeople(next);
    setFormationPeople(formationId, next);
  };

  const backToHub = () => {
    setCurrentPage('formations');
    navigate('/formations');
  };

  const canChangeDates = formation?.status === 'coming' || formation?.status === 'draft';
  const canRemoveFunder = formation?.status === 'coming' || formation?.status === 'draft';
  const isDraft = formation?.status === 'draft';
  const isCreated = Boolean(formation && formation.status !== 'draft');
  const cadreGaps = formation ? missingCadre(formation) : [];

  const participants = people.participants;
  const funders = people.funders;
  const partners = people.partners;

  const freezeTag = (label: string) => <span className="fd-antag">{label}</span>;

  const openAffiche = () => {
    setCurrentPage('formation-affiche');
    navigate('/formation-affiche');
  };

  const addPerson = () => {
    const name = personName.trim();
    if (!name) return;
    if (personRole === 'Intervenant' && intervenorIntent === 'coattest') {
      showSuccess('Il recevra le lien de co-attestation à la clôture — sans compte.');
      setPersonName('');
      setAddPersonOpen(false);
      return;
    }
    const added: FormationParticipant = {
      id: `p-${Date.now()}`,
      name,
      identityVerified: false,
      role: personRole,
      preRegistered: true,
      pendingActivation: true,
    };
    persistPeople({ ...people, participants: [added, ...people.participants] });
    setJustAddedId(added.id);
    setPersonName('');
    showSuccess('✓ Enregistré');
    window.setTimeout(() => setJustAddedId(null), 2200);
  };

  const addPartner = () => {
    const name = partnerName.trim();
    if (!name) return;
    const added: FormationPartner = { id: `pt-${Date.now()}`, name };
    persistPeople({ ...people, partners: [added, ...people.partners] });
    setPartnerName('');
    showSuccess('✓ Enregistré');
  };

  const addFunder = () => {
    const name = funderQuery.trim() || funderEmail.trim();
    if (!name) return;
    const added: FormationFunder = {
      id: `fu-${Date.now()}`,
      name: funderQuery.trim() || funderEmail.trim(),
      email: funderEmail.trim() || undefined,
      shareMode: funderShare,
      initials: initialsOf(funderQuery.trim() || 'EM'),
    };
    persistPeople({ ...people, funders: [added, ...people.funders] });
    setFunderQuery('');
    setFunderEmail('');
    setAddFunderOpen(false);
    showSuccess('✓ Enregistré');
  };

  const removeFunder = (id: string) => {
    persistPeople({ ...people, funders: people.funders.filter((f) => f.id !== id) });
    showSuccess('✓ Enregistré');
  };

  const MAX_DOCS = 5;
  const MAX_DOC_BYTES = 1024 * 1024;

  const addDocuments = (fileList: FileList | File[]) => {
    const incoming = Array.from(fileList);
    if (incoming.length === 0) return;

    const remaining = MAX_DOCS - documents.length;
    if (remaining <= 0) {
      showError('5 fichiers max.');
      return;
    }

    const accepted: { id: string; name: string; size: number; vis: DocVis }[] = [];
    for (const file of incoming.slice(0, remaining)) {
      if (file.size > MAX_DOC_BYTES) {
        showError(`${file.name} dépasse 1 Mo.`);
        continue;
      }
      accepted.push({
        id: `doc-${Date.now()}-${file.name}-${file.size}`,
        name: file.name,
        size: file.size,
        vis: 'equipe',
      });
    }

    const last = accepted.at(-1);
    if (!last) return;
    setDocuments((prev) => [...prev, ...accepted]);
    setJustAddedDocId(last.id);
    showSuccess('✓ Enregistré');
    window.setTimeout(() => setJustAddedDocId(null), 2200);
  };

  const removeDocument = (id: string) => {
    setDocuments((prev) => prev.filter((d) => d.id !== id));
    showSuccess('✓ Enregistré');
  };

  const submitDateChange = () => {
    if (!formation || !newStart || !newEnd || !dateMotif.trim()) return;
    if (newEnd < newStart) return;
    const meta = `du ${formatFrDate(newStart)} au ${formatFrDate(newEnd)} · démarrage automatique le ${formatFrDate(newStart)}`;
    const updated = updateFormation(formation.id, {
      startDate: newStart,
      endDate: newEnd,
      meta,
      dateChanges: [
        ...(formation.dateChanges ?? []),
        {
          at: new Date().toISOString(),
          fromStart: formation.startDate ?? '',
          fromEnd: formation.endDate ?? '',
          toStart: newStart,
          toEnd: newEnd,
          motif: dateMotif.trim(),
        },
      ],
    });
    if (updated) setFormation(updated);
    setDatePanelOpen(false);
    setDateMotif('');
    showSuccess('✓ Enregistré — chaque inscrit sera notifié');
  };

  const saveDraft = () => {
    if (!formation) return;
    showSuccess('✓ Brouillon enregistré');
  };

  const confirmCreate = () => {
    if (!formation) return;
    const startsToday = Boolean(formation.startDate && (() => {
      const now = new Date();
      const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      return formation.startDate === today;
    })());
    const status = startsToday ? 'in_progress' : 'coming';
    const meta = startsToday
      ? `du ${formatFrDate(formation.startDate)} au ${formatFrDate(formation.endDate)} · en cours`
      : `du ${formatFrDate(formation.startDate)} au ${formatFrDate(formation.endDate)} · démarrage automatique le ${formatFrDate(formation.startDate)}`;
    updateFormation(formation.id, { status, meta, frameLocked: true });
    setCreateOpen(false);
    showSuccess('Cadre figé — les inscriptions sont ouvertes');
  };

  const followPreview = useMemo(() => {
    if (!formation) return null;
    const isDebuter =
      formation.id === 'f2' ||
      formation.id === 'f-debuter' ||
      formation.title.startsWith('Débuter dans le numérique');
    if (isDebuter) {
      if (formation.status === 'ended' || formation.status === 'archived') {
        return {
          ...MOCK_FOLLOW_DEBUTER,
          closed: true,
          closedOn: '27 mars 2027',
          token: formation.id,
        };
      }
      return MOCK_FOLLOW_DEBUTER;
    }
    return followViewFromFormation(formation, {
      identitiesDone: people.participants.filter((p) => p.identityVerified).length,
      identitiesTotal: people.participants.length,
    });
  }, [formation, people.participants]);

  const heroChips = useMemo(() => {
    if (!formation) return [];
    const chips = [STATUS_CHIP[formation.status]];
    if (formation.startDate && formation.endDate) {
      chips.push(`${formatFrDate(formation.startDate)} → ${formatFrDate(formation.endDate)}`);
    }
    if (formation.status === 'coming' && formation.startDate) {
      chips.push(`démarrage automatique le ${formatFrDate(formation.startDate)}`);
    }
    return chips;
  }, [formation]);

  if (!formation) {
    return (
      <section className="formation-detail">
        <div className="formation-detail-top">
          <button type="button" className="back-button" onClick={backToHub} title="Retour aux formations">
            <i className="fas fa-arrow-left" aria-hidden />
          </button>
          <h1>Formation</h1>
        </div>
        <p className="formation-detail-empty">Formation introuvable.</p>
      </section>
    );
  }

  return (
    <section className="formation-detail" aria-label="Espace de gestion de la formation">
      <div className="formation-detail-top">
        <button type="button" className="back-button" onClick={backToHub} title="Retour aux formations">
          <i className="fas fa-arrow-left" aria-hidden />
        </button>
        {formation.hasProof && (
          <button
            type="button"
            className="fd-btn primary"
            onClick={() => {
              setSelectedFormationId(formation.id);
              setCurrentPage('preuve-formation');
              navigate('/preuve-formation');
            }}
          >
            Consulter la PF
          </button>
        )}
      </div>

      <header className={`fd-hero ${isDraft ? 'draft' : ''}`}>
        <div className="fd-hero-chips">
          {heroChips.map((chip) => (
            <span key={chip} className="fd-hchip">
              {chip}
            </span>
          ))}
        </div>
        <h1>{formation.title}</h1>
        <div className="fd-hero-row">
          <span>
            {MOCK_OF_ORG.name} · {MOCK_OF_ORG.kind}
          </span>
          <span className="fd-hqualiopi">{MOCK_OF_ORG.qualiopiLabel}</span>
          {isDraft ? (
            <span className="fd-seeaff" style={{ opacity: 0.55, borderStyle: 'dashed' }}>
              L’affiche naîtra à la création
            </span>
          ) : (
            <button type="button" className="fd-seeaff" onClick={openAffiche}>
              Voir l&apos;affiche →
            </button>
          )}
        </div>
      </header>

      <div className="formation-detail-tabs" role="tablist">
        {(
          [
            { id: 'informations', label: 'Informations' },
            { id: 'gestion', label: 'Gestion' },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            className={`formation-detail-tab ${activeTab === tab.id ? 'active' : ''}`}
            aria-selected={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'informations' && (
        <div className="fd-info">
          <label className="fd-field">
            <span>Titre de la formation</span>
            {isDraft ? (
              <input
                className="fd-in"
                value={formation.title}
                onChange={(e) => updateFormation(formation.id, { title: e.target.value })}
              />
            ) : (
              <div className="fd-readonly">{formation.title}</div>
            )}
          </label>
          <label className="fd-field">
            <span>Description {!isDraft && freezeTag('figée à la création')}</span>
            {isDraft ? (
              <textarea
                className="fd-in"
                rows={3}
                value={formation.description || ''}
                onChange={(e) => updateFormation(formation.id, { description: e.target.value })}
              />
            ) : (
              <div className="fd-readonly">{formation.description || '—'}</div>
            )}
          </label>
          <label className="fd-field">
            <span>Dates {freezeTag('reportables jusqu’au démarrage')}</span>
            <div className="fd-readonly">
              {formatFrDate(formation.startDate)} → {formatFrDate(formation.endDate)}
            </div>
          </label>
          {canChangeDates && (
            <button
              type="button"
              className="fd-date-door"
              onClick={() => {
                setNewStart(formation.startDate ?? '');
                setNewEnd(formation.endDate ?? '');
                setDatePanelOpen((v) => !v);
              }}
            >
              Modifier les dates →
            </button>
          )}
          {datePanelOpen && canChangeDates && (
            <div className="fd-panel">
              <h3>Modifier les dates</h3>
              <p>
                Dates actuelles : {formatFrDate(formation.startDate)} →{' '}
                {formatFrDate(formation.endDate)}
              </p>
              <div className="fd-two">
                <input
                  type="date"
                  className="fd-in"
                  value={newStart}
                  onChange={(e) => setNewStart(e.target.value)}
                />
                <input
                  type="date"
                  className="fd-in"
                  value={newEnd}
                  onChange={(e) => setNewEnd(e.target.value)}
                />
              </div>
              <label className="fd-field">
                <span>
                  Justification <span className="fd-ob">✱</span>
                </span>
                <textarea
                  className="fd-in"
                  rows={2}
                  value={dateMotif}
                  onChange={(e) => setDateMotif(e.target.value)}
                  placeholder="Le motif du report — il sera journalisé."
                />
              </label>
              <p className="fd-sub">
                Chaque inscrit sera notifié du report. Cette porte se ferme au démarrage de la
                formation.
              </p>
              <div className="fd-panel-actions">
                <button type="button" className="fd-btn" onClick={() => setDatePanelOpen(false)}>
                  Annuler
                </button>
                <button
                  type="button"
                  className="fd-btn primary"
                  disabled={!newStart || !newEnd || !dateMotif.trim()}
                  onClick={submitDateChange}
                >
                  Modifier les dates
                </button>
              </div>
            </div>
          )}

          <label className="fd-field">
            <span>Durée en heures {!isDraft && freezeTag('figée à la création')}</span>
            {isDraft ? (
              <input
                className="fd-in"
                type="number"
                min={1}
                value={formation.durationHours ?? ''}
                onChange={(e) =>
                  updateFormation(formation.id, {
                    durationHours: e.target.value ? Number(e.target.value) : undefined,
                  })
                }
              />
            ) : (
              <div className="fd-readonly">
                {formation.durationHours ? `${formation.durationHours} heures` : '—'}
              </div>
            )}
          </label>
          <label className="fd-field">
            <span>Financement {!isDraft && freezeTag('figé à la création')}</span>
            {isDraft ? (
              <div className="fd-roles">
                {FINANCEMENT_OPTIONS.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    className={`fd-ropt ${formation.financement === opt ? 'sel' : ''}`}
                    onClick={() => updateFormation(formation.id, { financement: opt as FinancementType })}
                  >
                    {FINANCEMENT_LABEL[opt]}
                  </button>
                ))}
              </div>
            ) : (
              <div className="fd-readonly">
                {formation.financement ? FINANCEMENT_LABEL[formation.financement] : '—'}
              </div>
            )}
          </label>
          <label className="fd-field">
            <span>Mode de participation</span>
            {isDraft ? (
              <div className="fd-roles">
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
                    className={`fd-ropt ${formation.participationMode === id ? 'sel' : ''}`}
                    onClick={() =>
                      updateFormation(formation.id, { participationMode: id as ParticipationMode })
                    }
                  >
                    {label}
                  </button>
                ))}
              </div>
            ) : (
              <div className="fd-readonly">
                {formation.participationMode
                  ? PARTICIPATION_LABEL[formation.participationMode]
                  : '—'}
              </div>
            )}
          </label>
          <div className="fd-field">
            <span>Acquis d&apos;apprentissage {!isDraft && freezeTag('figés à la création')}</span>
            {isDraft ? (
              <textarea
                className="fd-in"
                rows={4}
                value={(formation.learningOutcomes ?? []).map((o) => o.text).join('\n')}
                onChange={(e) =>
                  updateFormation(formation.id, {
                    learningOutcomes: e.target.value.split('\n').map((text, i) => ({
                      id: formation.learningOutcomes?.[i]?.id ?? `lo-d-${i}`,
                      text,
                      kind: formation.learningOutcomes?.[i]?.kind ?? 'free',
                    })),
                  })
                }
                placeholder="Un acquis par ligne"
              />
            ) : (formation.learningOutcomes ?? []).length === 0 ? (
              <div className="fd-readonly">—</div>
            ) : (
              <ul className="fd-outcomes">
                {(formation.learningOutcomes ?? []).map((o) => (
                  <li key={o.id}>{o.text}</li>
                ))}
              </ul>
            )}
          </div>
          <p className="fd-sub">
            {isDraft
              ? 'Le cadre reste ouvert jusqu’à « Créer la formation » — ensuite, seule la porte des dates demeure.'
              : 'Le formulaire s’affiche tel quel — durée, financement, programme, module : rien ne s’y modifie après la création. La seule porte : les dates.'}
          </p>
        </div>
      )}

      {activeTab === 'gestion' && (
        <div className="fd-gestion">
          {!isDraft && (
          <div className="fd-cmdrow">
            <div className="fd-tog">
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
            <span className="fd-vis">
              {visibility === 'structure'
                ? 'visible par : votre structure'
                : 'visible par : le financeur (aperçu)'}
            </span>
          </div>
          )}

          {visibility === 'financeur' && followPreview && (
            <FunderFollowView data={followPreview} preview />
          )}

          {visibility === 'structure' && (
            <>
          {isDraft && (
            <div className="fd-draft-banner">
              <b>Tout se prépare ici — rien ne part avant la création de la formation.</b> Les
              demandes de partenariat partiront à la création ; votre financeur sera informé au
              démarrage.
            </div>
          )}
          <section className="fd-sec">
            <h2>
              Participants ({participants.length}){' '}
              {isCreated && (
                <button type="button" className="fd-add" onClick={() => setAddPersonOpen((v) => !v)}>
                  + Ajouter une personne
                </button>
              )}
            </h2>
            {isDraft ? (
              <div className="fd-participants-locked">
                <b>Participants</b> — les inscriptions ouvriront à la création : la validation fige le
                cadre complet, puis elles s’ouvrent — jamais l’inverse (art. L. 6353-8 C. trav.).
              </div>
            ) : (
              <p className="fd-sub">
                Les inscriptions sont ouvertes — le cadre est complet et figé. L&apos;ajout vit ici et
                sur l&apos;affiche : la Porte (déjà inscrit ou pré-inscription), l&apos;import CSV, les
                groupes.
              </p>
            )}
            {isCreated && addPersonOpen && (
              <div className="fd-panel">
                <input
                  className="fd-in"
                  value={personName}
                  onChange={(e) => setPersonName(e.target.value)}
                  placeholder="Nom de la personne"
                />
                <div className="fd-roles">
                  {(['Participant', 'Formateur', 'Intervenant'] as FormationPersonRole[]).map(
                    (role) => (
                      <button
                        key={role}
                        type="button"
                        className={`fd-ropt ${personRole === role ? 'sel' : ''}`}
                        onClick={() => {
                          setPersonRole(role);
                          if (role !== 'Intervenant') setIntervenorIntent('participate');
                        }}
                      >
                        {role}
                      </button>
                    )
                  )}
                </div>
                {personRole === 'Intervenant' && (
                  <div className="fd-interv">
                    <p className="fd-sub">
                      Cette question ne se pose que pour l&apos;intervenant — extérieur à votre
                      structure.
                    </p>
                    <button
                      type="button"
                      className={`fd-intent ${intervenorIntent === 'participate' ? 'sel' : ''}`}
                      onClick={() => setIntervenorIntent('participate')}
                    >
                      <b>Il participe à la formation</b>
                      <span>
                        Il entre comme Intervenant : une invitation part, il active son espace. Il
                        voit l&apos;affiche et atteste des compétences ; il n&apos;a pas votre
                        gestion. À la clôture, il pourra co-attester.
                      </span>
                    </button>
                    <button
                      type="button"
                      className={`fd-intent ${intervenorIntent === 'coattest' ? 'sel' : ''}`}
                      onClick={() => setIntervenorIntent('coattest')}
                    >
                      <b>Il ne fera que co-attester la formation</b>
                      <span>
                        Ne l&apos;ajoutez pas — cela se fera à la clôture : il recevra un lien pour
                        co-attester, sans compte.
                      </span>
                    </button>
                  </div>
                )}
                <button type="button" className="fd-btn primary" onClick={addPerson}>
                  {personRole === 'Intervenant' && intervenorIntent === 'coattest'
                    ? 'Noter pour la clôture'
                    : 'Ajouter'}
                </button>
              </div>
            )}
            {isCreated && participants.map((p) => (
              <div
                key={p.id}
                className={`fd-prow ${justAddedId === p.id ? 'new' : ''}`}
              >
                <div className="fd-pdot">{initialsOf(p.name)}</div>
                <div>
                  <b>{p.name}</b> — inscrite
                  <div className="fd-sub">
                    {p.preRegistered ? 'pré-inscrite · ' : ''}
                    {p.pendingActivation ? "en attente d'activation · " : ''}
                    {p.role ?? 'Participant'}
                  </div>
                </div>
                {justAddedId === p.id && <span className="fd-ok">✓</span>}
              </div>
            ))}
          </section>

          <section className="fd-sec">
            <h2>
              Partenaires ({partners.length}){' '}
              <button type="button" className="fd-add" onClick={() => setAddPartnerOpen((v) => !v)}>
                + Ajouter un partenaire
              </button>
            </h2>
            <p className="fd-sub">
              Un financeur n&apos;est pas un partenaire. Le panneau : le type d&apos;abord — le
              partenariat élargi (bientôt) portera les référents partenaires.
            </p>
            <p className="fd-sub">
              Un formateur est une personne : il s&apos;ajoute dans Participants, jamais en
              partenaire.
            </p>
            {addPartnerOpen && (
              <div className="fd-panel">
                <input
                  className="fd-in"
                  value={partnerName}
                  onChange={(e) => setPartnerName(e.target.value)}
                  placeholder="Nom du partenaire"
                />
                <button type="button" className="fd-btn primary" onClick={addPartner}>
                  Ajouter
                </button>
              </div>
            )}
            {partners.map((p) => (
              <div key={p.id} className="fd-prow">
                <div className="fd-pdot">{initialsOf(p.name)}</div>
                <div>
                  <b>{p.name}</b> — partenaire
                </div>
              </div>
            ))}
          </section>

          <section className="fd-sec">
            <h2>
              Financeur ({funders.length}){' '}
              {formation.financement && (
                <span className="fd-finchip">{FINANCEMENT_LABEL[formation.financement]}</span>
              )}{' '}
              <button type="button" className="fd-add" onClick={() => setAddFunderOpen((v) => !v)}>
                + Ajouter le financeur
              </button>
            </h2>
            <p className="fd-sub">
              Financement déclaré au module — figé à la création. L&apos;organisation financeuse
              s&apos;ajoute ici et sur l&apos;affiche (porteur seul) : elle sera informée du
              démarrage et recevra son lien de suivi — art. L. 6353-10 C. trav.
            </p>
            {addFunderOpen && (
              <div className="fd-panel">
                <div className="fd-k">Vos financeurs — rattachés à votre structure</div>
                {ATTACHED_FUNDERS.map((af) => (
                  <button
                    key={af.name}
                    type="button"
                    className="fd-prow fd-attached"
                    onClick={() => setFunderQuery(af.name)}
                  >
                    <div className="fd-pdot funder">{af.initials}</div>
                    <div style={{ flex: 1 }}>
                      <b>{af.name}</b>
                    </div>
                    {funderQuery === af.name && <span className="fd-ok">✓</span>}
                  </button>
                ))}
                <p className="fd-sub">
                  Le rattachement financeur se demande et s’approuve dans l’espace partenariat — comme
                  le partenariat administratif.
                </p>
                <p className="fd-or">ou</p>
                <label className="fd-field">
                  <span>Rechercher une organisation sur Kinship</span>
                  <input
                    className="fd-in"
                    value={funderQuery}
                    onChange={(e) => setFunderQuery(e.target.value)}
                    placeholder="🔍 OPCO, entreprise, collectivité, fondation…"
                  />
                </label>
                <p className="fd-sub">
                  Pas encore rattachée : elle sera ajoutée à cette formation seulement — son lien
                  partira par email et elle retrouvera la formation dans son espace, avec une pastille
                  « À confirmer ».
                </p>
                <p className="fd-or">ou</p>
                <label className="fd-field">
                  <span>Il n’est pas sur Kinship ? Entrez son email</span>
                  <input
                    className="fd-in"
                    value={funderEmail}
                    onChange={(e) => setFunderEmail(e.target.value)}
                    placeholder="contact@financeur.fr"
                  />
                </label>
                <div className="fd-roles">
                  <button
                    type="button"
                    className={`fd-ropt ${funderShare === 'nominatif' ? 'sel' : ''}`}
                    onClick={() => setFunderShare('nominatif')}
                  >
                    nominatif
                  </button>
                  <button
                    type="button"
                    className={`fd-ropt ${funderShare === 'anonyme' ? 'sel' : ''}`}
                    onClick={() => setFunderShare('anonyme')}
                  >
                    anonyme
                  </button>
                  <span className="fd-sub">— votre choix, jamais implicite</span>
                </div>
                <p className="fd-gris">
                  Il recevra par email l&apos;information du démarrage — art. L. 6353-10 C. trav. —
                  avec l&apos;invitation à créer l&apos;espace de son organisation, puis le rapport à
                  la clôture. Lien révocable, journalisé. <b>Vous êtes responsable de ce partage.</b>
                </p>
                <button type="button" className="fd-btn primary" onClick={addFunder}>
                  Ajouter
                </button>
              </div>
            )}
            {funders.map((f) => (
              <div key={f.id} className="fd-prow">
                <div className="fd-pdot funder">{f.initials}</div>
                <div>
                  <b>{f.name}</b> — financeur
                  <div className="fd-sub">
                    sera informé du démarrage · lien de suivi au jour J · rapport à la clôture ·{' '}
                    {f.shareMode}
                  </div>
                </div>
                {canRemoveFunder ? (
                  <button type="button" className="fd-add" onClick={() => removeFunder(f.id)}>
                    Retirer
                  </button>
                ) : null}
              </div>
            ))}
          </section>

          <section className="fd-sec">
            <h2>
              Documents ({documents.length}/5) · Liens (0) · Photos (0/2){' '}
              <button
                type="button"
                className="fd-add"
                onClick={() => setAddDocsOpen((v) => !v)}
              >
                + Ajouter
              </button>
            </h2>
            <p className="fd-sub">
              1 Mo par fichier · 5 fichiers max (le réel) — votre fichier sera compressé
              automatiquement.
            </p>
            {addDocsOpen && (
              <div className="fd-panel">
                <label
                  className={`fd-dropzone ${docDragOver ? 'over' : ''} ${
                    documents.length >= MAX_DOCS ? 'full' : ''
                  }`}
                  onDragOver={(e) => {
                    e.preventDefault();
                    if (documents.length < MAX_DOCS) setDocDragOver(true);
                  }}
                  onDragLeave={() => setDocDragOver(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDocDragOver(false);
                    addDocuments(e.dataTransfer.files);
                  }}
                >
                  <input
                    type="file"
                    multiple
                    hidden
                    disabled={documents.length >= MAX_DOCS}
                    onChange={(e) => {
                      if (e.target.files) addDocuments(e.target.files);
                      e.target.value = '';
                    }}
                  />
                  <span className="fd-dropzone-icon" aria-hidden>
                    ↑
                  </span>
                  <span className="fd-dropzone-title">
                    {documents.length >= MAX_DOCS
                      ? '5 fichiers max atteints'
                      : 'Déposer un document ici, ou cliquer pour parcourir'}
                  </span>
                  <span className="fd-dropzone-hint">PDF, Word, image — 1 Mo par fichier</span>
                </label>
              </div>
            )}
            {documents.map((doc) => (
              <div
                key={doc.id}
                className={`fd-prow ${justAddedDocId === doc.id ? 'new' : ''}`}
              >
                <div className="fd-pdot">DOC</div>
                <div>
                  <b>{doc.name}</b>
                  <div className="fd-sub">{fileSizeLabel(doc.size)}</div>
                </div>
                <div className="fd-vispills">
                  {(
                    [
                      ['equipe', 'Équipe'],
                      ['participants', 'Participants'],
                      ['structure', 'Ma structure'],
                    ] as const
                  ).map(([id, label]) => (
                    <button
                      key={id}
                      type="button"
                      className={`fd-vispill ${doc.vis === id ? 'on' : ''}`}
                      onClick={() =>
                        setDocuments((prev) =>
                          prev.map((d) => (d.id === doc.id ? { ...d, vis: id } : d))
                        )
                      }
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <div className="fd-prow-actions">
                  {justAddedDocId === doc.id && <span className="fd-ok">✓</span>}
                  <button type="button" className="fd-add" onClick={() => removeDocument(doc.id)}>
                    Retirer
                  </button>
                </div>
              </div>
            ))}
          </section>

          {isCreated && (
            <div className="fd-tile">
              <div className="fd-tile-n">0</div>
              <div>
                <div className="fd-tile-t">Preuves de compétences</div>
                <div className="fd-sub" style={{ margin: 0 }}>
                  attestation directe · récap · vue d&apos;ensemble
                </div>
              </div>
              <span className="fd-go">Gérer →</span>
            </div>
          )}

          {isDraft ? (
            <div className="fd-foot">
              {cadreGaps.length > 0 && (
                <div className="fd-gate" style={{ marginRight: 'auto' }}>
                  ⚠ <b>Il manque : {cadreGaps.join(', ')}.</b> La création fige le cadre — complétez-le,
                  ou restez en brouillon.
                </div>
              )}
              <div className="fd-fcol">
                <button type="button" className="fd-btn" onClick={saveDraft}>
                  Sauvegarder le brouillon
                </button>
                <p className="fd-sub">
                  Vous seul y accédez — les co-responsables et vos partenaires y accéderont une fois la
                  formation créée.
                </p>
              </div>
              <div className="fd-fcol">
                <button
                  type="button"
                  className="fd-btn amber"
                  disabled={cadreGaps.length > 0}
                  onClick={() => setCreateOpen(true)}
                >
                  Créer la formation
                </button>
                <p className="fd-sub">
                  <b>La validation fige le cadre et ouvre les inscriptions.</b>
                </p>
              </div>
            </div>
          ) : (
            <div className="fd-foot">
              <button type="button" className="fd-btn primary" onClick={openAffiche}>
                Aller vers l&apos;affiche →
              </button>
            </div>
          )}
            </>
          )}
        </div>
      )}

      {createOpen && formation && (
        <div className="fd-create-ov" role="dialog" aria-label="Validation de la formation">
          <div className="fd-create-modal">
            <h3>Validation de la formation</h3>
            <div className="fd-fige">
              <b>Se figent :</b> la description · les dates · la durée ({formation.durationHours ?? '—'}{' '}
              heures) · le financement ({formation.financement ?? '—'}) · le programme (
              {(formation.learningOutcomes ?? []).length} acquis).
            </div>
            {formation.isEuMcDeclared && (
              <div className="fd-figeor">
                <b>Le cadre européen — 9/11 réunis — se fige avec :</b> l’intitulé exact · les crédits
                ECTS · le niveau EQF · le type d’évaluation · la langue. Vos inscrits porteront le
                compteur à 10 — la clôture écrira le onzième : la preuve naît à 11/11.
              </div>
            )}
            <p>
              <b>S’ouvrent :</b> les inscriptions.
            </p>
            <p>
              Seules les dates resteront reportables jusqu’au démarrage — justifiées, chaque inscrit
              notifié.
            </p>
            <div className="fd-panel-actions">
              <button type="button" className="fd-btn" onClick={() => setCreateOpen(false)}>
                Annuler
              </button>
              <button type="button" className="fd-btn amber" onClick={confirmCreate}>
                Valider la formation
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default FormationDetail;
