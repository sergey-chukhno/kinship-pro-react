import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../../context/AppContext';
import {
  FormationCard,
  FormationStatus,
  FINANCEMENT_LABEL,
  MOCK_OF_ORG,
  PARTICIPATION_LABEL,
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
  const [justAddedId, setJustAddedId] = useState<string | null>(null);
  const [addFunderOpen, setAddFunderOpen] = useState(false);
  const [funderQuery, setFunderQuery] = useState('');
  const [funderEmail, setFunderEmail] = useState('');
  const [funderShare, setFunderShare] = useState<'nominatif' | 'anonyme'>('nominatif');
  const [addPartnerOpen, setAddPartnerOpen] = useState(false);
  const [partnerName, setPartnerName] = useState('');
  const [documents, setDocuments] = useState<{ id: string; name: string; size: number }[]>([]);
  const [addDocsOpen, setAddDocsOpen] = useState(true);
  const [docDragOver, setDocDragOver] = useState(false);
  const [justAddedDocId, setJustAddedDocId] = useState<string | null>(null);
  const [datePanelOpen, setDatePanelOpen] = useState(false);
  const [newStart, setNewStart] = useState('');
  const [newEnd, setNewEnd] = useState('');
  const [dateMotif, setDateMotif] = useState('');

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

  const canChangeDates = formation?.status === 'coming';
  const canRemoveFunder = formation?.status === 'coming';

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

    const accepted: { id: string; name: string; size: number }[] = [];
    for (const file of incoming.slice(0, remaining)) {
      if (file.size > MAX_DOC_BYTES) {
        showError(`${file.name} dépasse 1 Mo.`);
        continue;
      }
      accepted.push({
        id: `doc-${Date.now()}-${file.name}-${file.size}`,
        name: file.name,
        size: file.size,
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

      <header className="fd-hero">
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
          <button type="button" className="fd-seeaff" onClick={openAffiche}>
            Voir l&apos;affiche →
          </button>
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
            <div className="fd-readonly">{formation.title}</div>
          </label>
          <label className="fd-field">
            <span>Description {freezeTag('figée à la création')}</span>
            <div className="fd-readonly">
              {formation.description || '—'}
            </div>
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
            <span>Durée en heures {freezeTag('figée à la création')}</span>
            <div className="fd-readonly">
              {formation.durationHours ? `${formation.durationHours} heures` : '—'}
            </div>
          </label>
          <label className="fd-field">
            <span>Financement {freezeTag('figé à la création')}</span>
            <div className="fd-readonly">
              {formation.financement ? FINANCEMENT_LABEL[formation.financement] : '—'}
            </div>
          </label>
          <label className="fd-field">
            <span>Mode de participation</span>
            <div className="fd-readonly">
              {formation.participationMode
                ? PARTICIPATION_LABEL[formation.participationMode]
                : '—'}
            </div>
          </label>
          <div className="fd-field">
            <span>Acquis d&apos;apprentissage {freezeTag('figés à la création')}</span>
            {(formation.learningOutcomes ?? []).length === 0 ? (
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
            Le formulaire s&apos;affiche tel quel — durée, financement, programme, module : rien ne
            s&apos;y modifie après la création. La seule porte : les dates.
          </p>
        </div>
      )}

      {activeTab === 'gestion' && (
        <div className="fd-gestion">
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

          {visibility === 'financeur' && followPreview && (
            <FunderFollowView data={followPreview} preview />
          )}

          {visibility === 'structure' && (
            <>
          <section className="fd-sec">
            <h2>
              Participants ({participants.length}){' '}
              <button type="button" className="fd-add" onClick={() => setAddPersonOpen((v) => !v)}>
                + Ajouter une personne
              </button>
            </h2>
            <p className="fd-sub">
              Les inscriptions sont ouvertes — le cadre est complet et figé. L&apos;ajout vit ici et
              sur l&apos;affiche : la Porte (déjà inscrit ou pré-inscription), l&apos;import CSV, les
              groupes.
            </p>
            {addPersonOpen && (
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
                        onClick={() => setPersonRole(role)}
                      >
                        {role}
                      </button>
                    )
                  )}
                </div>
                <button type="button" className="fd-btn primary" onClick={addPerson}>
                  Ajouter
                </button>
              </div>
            )}
            {participants.map((p) => (
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
                <label className="fd-field">
                  <span>Rechercher l&apos;organisation sur Kinship</span>
                  <input
                    className="fd-in"
                    value={funderQuery}
                    onChange={(e) => setFunderQuery(e.target.value)}
                    placeholder="OPCO, entreprise, collectivité…"
                  />
                </label>
                <p className="fd-or">— ou —</p>
                <label className="fd-field">
                  <span>Il n&apos;est pas sur Kinship ? Entrez son email</span>
                  <input
                    className="fd-in"
                    value={funderEmail}
                    onChange={(e) => setFunderEmail(e.target.value)}
                    placeholder="contact@opco-atlas.example"
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
                <div className="fd-prow-actions">
                  {justAddedDocId === doc.id && <span className="fd-ok">✓</span>}
                  <button type="button" className="fd-add" onClick={() => removeDocument(doc.id)}>
                    Retirer
                  </button>
                </div>
              </div>
            ))}
          </section>

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

          <div className="fd-foot">
            <button type="button" className="fd-btn primary" onClick={openAffiche}>
              Aller vers l&apos;affiche →
            </button>
          </div>
            </>
          )}
        </div>
      )}
    </section>
  );
};

export default FormationDetail;
