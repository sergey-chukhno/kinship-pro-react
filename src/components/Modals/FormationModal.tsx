import React, { useMemo, useState } from 'react';
import {
  DIGCOMP_SERIES_OUTCOME,
  FINANCEMENT_LABEL,
  FinancementType,
  FormationStatus,
  LearningOutcome,
  MOCK_OF_ORG,
  ParticipationMode,
} from '../../data/mockFormations';
import './Modal.css';
import './FormationModal.css';

export type FormationSaveIntent = 'draft' | 'update' | 'create';

export interface FormationFormData {
  title: string;
  description: string;
  projectKind: 'formation';
  financement: FinancementType | '';
  isEuMcDeclared: boolean;
  startDate: string;
  endDate: string;
  attendanceSurveyOptIn: boolean;
  durationHours: string;
  participationMode: ParticipationMode;
  learningOutcomes: LearningOutcome[];
  imageName: string;
  intent: FormationSaveIntent;
}

interface FormationModalProps {
  onClose: () => void;
  onSave: (data: FormationFormData) => void;
  initialData?: Partial<FormationFormData> | null;
  /** Brouillon rouvert depuis le hub « Modifier » */
  isEdit?: boolean;
  status?: FormationStatus;
}

const FINANCEMENT_OPTIONS: FinancementType[] = [
  'CPF',
  'OPCO',
  'Entreprise',
  'Associative',
  'Autre',
];

const PARTICIPATION_OPTIONS: { id: ParticipationMode; label: string }[] = [
  { id: 'presentiel', label: 'Présentiel' },
  { id: 'distanciel', label: 'Distanciel' },
  { id: 'hybride', label: 'Hybride' },
];

function newOutcome(kind: LearningOutcome['kind'], text = ''): LearningOutcome {
  return { id: `lo-${Date.now()}-${text.length}`, text, kind };
}

const FormationModal: React.FC<FormationModalProps> = ({
  onClose,
  onSave,
  initialData,
  isEdit = false,
}) => {
  const [step, setStep] = useState<1 | 2 | 3>(isEdit ? 2 : 1);
  const [title, setTitle] = useState(initialData?.title ?? '');
  const [description, setDescription] = useState(initialData?.description ?? '');
  const [financement, setFinancement] = useState<FinancementType | ''>(
    initialData?.financement ?? ''
  );
  const [isEuMcDeclared, setIsEuMcDeclared] = useState(
    initialData?.isEuMcDeclared ?? false
  );
  const [startDate, setStartDate] = useState(initialData?.startDate ?? '');
  const [endDate, setEndDate] = useState(initialData?.endDate ?? '');
  const [attendanceSurveyOptIn, setAttendanceSurveyOptIn] = useState(
    initialData?.attendanceSurveyOptIn ?? false
  );
  const [durationHours, setDurationHours] = useState(initialData?.durationHours ?? '');
  const [participationMode, setParticipationMode] = useState<ParticipationMode>(
    initialData?.participationMode ?? 'presentiel'
  );
  const [learningOutcomes, setLearningOutcomes] = useState<LearningOutcome[]>(
    initialData?.learningOutcomes?.length
      ? initialData.learningOutcomes
      : []
  );
  const [imageName, setImageName] = useState(initialData?.imageName ?? '');
  const [showSeriesMenu, setShowSeriesMenu] = useState(false);
  const [showValidation, setShowValidation] = useState(false);
  const [missingMessage, setMissingMessage] = useState<string | null>(null);

  const buildPayload = (intent: FormationSaveIntent): FormationFormData => ({
    title: title.trim(),
    description: description.trim(),
    projectKind: 'formation',
    financement,
    isEuMcDeclared,
    startDate,
    endDate,
    attendanceSurveyOptIn,
    durationHours: durationHours.trim(),
    participationMode,
    learningOutcomes: learningOutcomes.filter((o) => o.text.trim()),
    imageName,
    intent,
  });

  const missingCreateFields = useMemo(() => {
    const missing: string[] = [];
    if (!title.trim()) missing.push('le titre');
    if (!description.trim()) missing.push('la description');
    if (!startDate) missing.push('la date de début');
    if (!endDate) missing.push('la date de fin');
    if (!durationHours.trim() || Number(durationHours) <= 0) missing.push('la durée en heures');
    if (!financement) missing.push('le financement');
    if (!learningOutcomes.some((o) => o.text.trim())) missing.push('le programme (acquis)');
    if (startDate && endDate && endDate < startDate) missing.push('des dates cohérentes');
    return missing;
  }, [title, description, startDate, endDate, durationHours, financement, learningOutcomes]);

  const saveDraft = () => {
    if (!title.trim()) {
      setMissingMessage('Il manque : le titre. Quatre champs suffisent pour un brouillon.');
      return;
    }
    setMissingMessage(null);
    onSave(buildPayload(isEdit ? 'update' : 'draft'));
  };

  const tryCreate = () => {
    if (missingCreateFields.length > 0) {
      setShowValidation(false);
      setMissingMessage(
        `Il manque : ${missingCreateFields.join(' · ')}. La création fige le cadre — complétez-le, ou sauvegardez en brouillon.`
      );
      return;
    }
    setMissingMessage(null);
    setShowValidation(true);
  };

  const confirmCreate = () => {
    onSave(buildPayload('create'));
  };

  const filledOutcomes = learningOutcomes.filter((o) => o.text.trim());

  const freezeTag = (label = 'se fige à la création') => (
    <span className="f1-antag">{label}</span>
  );

  const renderFooterDraftCreate = (primary: { label: string; onClick: () => void }) => (
    <div className="f1-foot">
      <button type="button" className="f1-btn ghost" onClick={onClose}>
        Annuler
      </button>
      <div className="f1-foot-actions">
        <div className="f1-foot-col">
          <button type="button" className="f1-btn secondary" onClick={saveDraft}>
            {isEdit ? 'Enregistrer les modifications' : 'Sauvegarder en brouillon'}
          </button>
          {step === 3 && !isEdit && (
            <p className="f1-micro">Les co-responsables et vos partenaires pourront y accéder.</p>
          )}
        </div>
        <div className="f1-foot-col">
          <button
            type="button"
            className={`f1-btn primary ${
              primary.label === 'Créer la formation' && missingCreateFields.length
                ? 'dim'
                : ''
            }`}
            onClick={primary.onClick}
          >
            {primary.label}
          </button>
          {step === 3 && (
            <p className="f1-micro">
              <b>La validation fige le cadre et ouvre les inscriptions.</b>
            </p>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="modal-overlay" onClick={onClose} role="presentation">
      <div
        className="modal-content formation-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="formation-modal-title"
      >
        {step === 1 && (
          <>
            <div className="f1-head">
              <div>
                <h2 id="formation-modal-title">Que voulez-vous créer&nbsp;?</h2>
                <p className="f1-sub">
                  Trois choix pour commencer — ils deviendront définitifs au premier
                  enregistrement.
                </p>
              </div>
              <button type="button" className="modal-close" onClick={onClose} aria-label="Fermer">
                ×
              </button>
            </div>

            <div className="f1-body">
              <section className="f1-blk">
                <h3>Organisation porteuse</h3>
                <div className="f1-orgchip">
                  <div className="f1-orgdot">{MOCK_OF_ORG.initials}</div>
                  <div>
                    <div className="f1-orgname">{MOCK_OF_ORG.name}</div>
                    <div className="f1-orgsub">
                      {MOCK_OF_ORG.kind}{' '}
                      <span className="f1-qualiopi">{MOCK_OF_ORG.qualiopiLabel}</span>
                    </div>
                  </div>
                  <div className="f1-lock">définitive</div>
                </div>
              </section>

              <section className="f1-blk">
                <h3>Le type</h3>
                <div className="f1-cards">
                  <div className="f1-card" aria-disabled>
                    <span>PROJET</span>
                    <small>il raconte ce qui s&apos;est fait</small>
                  </div>
                  <div className="f1-card" aria-disabled>
                    <span>STAGE</span>
                    <small>en milieu professionnel</small>
                  </div>
                  <div className="f1-card sel">
                    <span>FORMATION</span>
                    <small>elle promet un programme</small>
                  </div>
                </div>
              </section>

              <section className="f1-blk">
                <h3>Le cadre</h3>
                <label className="f1-mc">
                  <input
                    type="checkbox"
                    checked={isEuMcDeclared}
                    onChange={(e) => setIsEuMcDeclared(e.target.checked)}
                  />
                  <span>
                    <b>Microcertification européenne</b> — votre organisme y est éligible. Les
                    éléments du cadre européen seront à compléter avant la création.
                  </span>
                </label>
              </section>

              <div className="f1-warn">
                ⚠
                <div>
                  <b>Ces trois choix seront définitifs au premier enregistrement</b> — brouillon
                  compris. Avant lui, vous pouvez revenir en arrière librement.
                </div>
              </div>
            </div>

            <div className="f1-cta">
              <button type="button" className="f1-btn primary" onClick={() => setStep(2)}>
                Continuer →
              </button>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <div className="f1-head">
              <div>
                <p className="f1-kicker">Formation · {MOCK_OF_ORG.name}</p>
                <h2 id="formation-modal-title">Votre formation</h2>
                <p className="f1-sub">
                  Quatre champs suffisent pour un brouillon — la création exigera le cadre
                  complet.
                </p>
              </div>
              <button type="button" className="modal-close" onClick={onClose} aria-label="Fermer">
                ×
              </button>
            </div>

            <div className="f1-body">
              {isEdit && (
                <p className="f1-gris">
                  Le formulaire entier reste libre — rien n&apos;est figé tant qu&apos;elle n&apos;est
                  pas créée (les trois gravures de l&apos;écran 1 exceptées).
                </p>
              )}
              {missingMessage && step === 2 && (
                <div className="f1-warn" role="alert">
                  ⚠ <div><b>{missingMessage}</b></div>
                </div>
              )}

              <label className="f1-field">
                <span>
                  Titre de la formation <span className="f1-ob">✱</span>
                </span>
                <input
                  className="f1-in"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Débuter dans le numérique — bureautique, internet, démarches en ligne"
                />
              </label>

              <label className="f1-field">
                <span>
                  Description <span className="f1-ob">✱</span> {freezeTag()}
                </span>
                <textarea
                  className="f1-in f1-ta"
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Soixante heures pour prendre en main l'ordinateur…"
                />
              </label>

              <div className="f1-two">
                <label className="f1-field">
                  <span>
                    Date estimée de début <span className="f1-ob">✱</span> {freezeTag()}
                  </span>
                  <input
                    type="date"
                    className="f1-in"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </label>
                <label className="f1-field">
                  <span>
                    Date estimée de fin <span className="f1-ob">✱</span> {freezeTag()}
                  </span>
                  <input
                    type="date"
                    className="f1-in"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </label>
              </div>
              <p className="f1-hint">
                Après la création, les dates gardent une porte : le report reste possible jusqu&apos;au
                démarrage — justifié, chaque inscrit notifié.
              </p>

              <div className="f1-field">
                <span>
                  Image de la formation <span className="f1-hint-inline">— optionnelle</span>
                </span>
                <label className="f1-imgzone">
                  <div className="f1-imgprev">
                    {imageName || 'Sans image'}
                  </div>
                  <div className="f1-imgnote">
                    Sans image, votre affiche porte le titre sur la couleur de confiance de votre
                    organisation. Ajouter une image →
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      setImageName(file?.name ?? '');
                    }}
                  />
                </label>
              </div>

              <div className="f1-gold">
                <span className="f1-gold-label">
                  Acquis d&apos;apprentissage {freezeTag('le programme — exigé à la création')}
                </span>
                <p className="f1-hint" style={{ marginTop: 0 }}>
                  Ce que l&apos;apprenant saura faire — une ligne par acquis.
                </p>
                <div className="f1-outcomes">
                  {learningOutcomes.map((outcome) => (
                    <div key={outcome.id} className="f1-outcome">
                      <span className="f1-drag" aria-hidden>
                        ⠿
                      </span>
                      {outcome.kind === 'series' ? (
                        <span className="f1-outcome-series">{outcome.text}</span>
                      ) : (
                        <input
                          className="f1-in"
                          value={outcome.text}
                          placeholder="Ligne libre"
                          onChange={(e) =>
                            setLearningOutcomes((prev) =>
                              prev.map((o) =>
                                o.id === outcome.id ? { ...o, text: e.target.value } : o
                              )
                            )
                          }
                        />
                      )}
                      {outcome.kind === 'free' && (
                        <span className="f1-outcome-kind">(ligne libre)</span>
                      )}
                      <button
                        type="button"
                        className="f1-remove"
                        aria-label="Retirer"
                        onClick={() =>
                          setLearningOutcomes((prev) => prev.filter((o) => o.id !== outcome.id))
                        }
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
                <div className="f1-outcome-actions">
                  <button
                    type="button"
                    className="f1-linkbtn"
                    onClick={() =>
                      setLearningOutcomes((prev) => [...prev, newOutcome('free')])
                    }
                  >
                    + Ajouter un acquis
                  </button>
                  <div className="f1-series-wrap">
                    <button
                      type="button"
                      className="f1-linkbtn"
                      onClick={() => setShowSeriesMenu((v) => !v)}
                    >
                      📚 Ajouter depuis une série ▾
                    </button>
                    {showSeriesMenu && (
                      <button
                        type="button"
                        className="f1-series-item"
                        onClick={() => {
                          setLearningOutcomes((prev) => [
                            ...prev,
                            newOutcome('series', DIGCOMP_SERIES_OUTCOME.text),
                          ]);
                          setShowSeriesMenu(false);
                        }}
                      >
                        {DIGCOMP_SERIES_OUTCOME.text}
                      </button>
                    )}
                  </div>
                </div>
                <p className="f1-hint">
                  Chaque ligne s&apos;édite et se réordonne — la ligne-référence d&apos;une série se
                  retire d&apos;un ✕, jamais ligne à ligne.
                </p>
              </div>

              <div className="f1-gold">
                <span className="f1-gold-label">Mode de participation</span>
                <div className="f1-radio" role="radiogroup">
                  {PARTICIPATION_OPTIONS.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      className={`f1-ropt ${participationMode === opt.id ? 'sel' : ''}`}
                      onClick={() => setParticipationMode(opt.id)}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                <p className="f1-gold-note">
                  Acquis + participation remplis → votre preuve passera en <b>Enrichie</b>.
                </p>
              </div>
            </div>

            {renderFooterDraftCreate({
              label: 'Continuer →',
              onClick: () => {
                setMissingMessage(null);
                setStep(3);
              },
            })}
          </>
        )}

        {step === 3 && (
          <>
            <div className="f1-head">
              <div>
                <p className="f1-kicker">Formation · {MOCK_OF_ORG.name}</p>
                <h2 id="formation-modal-title">Le module formation</h2>
                <p className="f1-sub">
                  Durée, financement, assiduité — ces éléments se figent à la création.
                </p>
              </div>
              <button type="button" className="modal-close" onClick={onClose} aria-label="Fermer">
                ×
              </button>
            </div>

            <div className="f1-body">
              {missingMessage && (
                <div className="f1-warn" role="alert">
                  ⚠{' '}
                  <div>
                    <b>{missingMessage}</b>
                  </div>
                </div>
              )}

              <label className="f1-gold f1-field">
                <span>
                  Durée en heures <span className="f1-ob">✱</span> {freezeTag()}
                </span>
                <div className="f1-hours">
                  <input
                    type="number"
                    min={1}
                    className="f1-in"
                    value={durationHours}
                    onChange={(e) => setDurationHours(e.target.value)}
                    placeholder="60"
                  />
                  <span>heures</span>
                </div>
              </label>

              <div className="f1-field">
                <span>
                  Financement <span className="f1-ob">✱</span> {freezeTag()}
                </span>
                <div className="f1-fin5" role="radiogroup">
                  {FINANCEMENT_OPTIONS.map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      className={`f1-ropt ${financement === opt ? 'sel' : ''}`}
                      onClick={() => setFinancement(opt)}
                    >
                      {FINANCEMENT_LABEL[opt]}
                    </button>
                  ))}
                </div>
                <p className="f1-hint">
                  Le financeur — l&apos;organisation elle-même — s&apos;identifiera dans Équipe &amp;
                  partenaires.
                </p>
              </div>

              <label className="f1-opt">
                <input
                  type="checkbox"
                  checked={attendanceSurveyOptIn}
                  onChange={(e) => setAttendanceSurveyOptIn(e.target.checked)}
                />
                <span>
                  <b>Vérification d&apos;assiduité</b>
                  <small>
                    En présentiel, chaque séance s&apos;ouvre par un code de session — la présence de
                    chacun est confirmée et prouvée. Cette option y ajoute un sondage indépendant
                    après les séances. Début et durée : l&apos;assiduité prouvée, face à votre
                    financeur. Une fois engagée, elle ne s&apos;éteint plus.
                  </small>
                </span>
              </label>
            </div>

            {renderFooterDraftCreate({
              label: 'Créer la formation',
              onClick: tryCreate,
            })}
          </>
        )}

        {showValidation && (
          <div className="f1-confirm" role="dialog" aria-labelledby="f1-validate-title">
            <div className="f1-confirm-card">
              <h3 id="f1-validate-title">Validation de la formation</h3>
              <div className="f1-fige">
                <b>Se figent :</b> la description · les dates · la durée (
                {durationHours || '—'} heures) · le financement (
                {financement ? FINANCEMENT_LABEL[financement] : '—'}) · le programme (
                {filledOutcomes.length} acquis).
              </div>
              <p>
                <b>S&apos;ouvrent :</b> les inscriptions.
              </p>
              <p>
                Seules les dates resteront reportables jusqu&apos;au démarrage — justifiées, chaque
                inscrit notifié.
              </p>
              <div className="f1-confirm-actions">
                <button type="button" className="f1-btn ghost" onClick={() => setShowValidation(false)}>
                  Annuler
                </button>
                <button type="button" className="f1-btn primary" onClick={confirmCreate}>
                  Valider la formation
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FormationModal;
