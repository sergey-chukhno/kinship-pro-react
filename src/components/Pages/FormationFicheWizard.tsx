import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  applyCertificationCode,
  createCatalogueDraft,
  getCatalogue,
  getCatalogueFlags,
  getCatalogueFiche,
  listCatalogueFiche,
  saveCatalogueFiche,
} from '../../api/FormationCatalogue';
import { resolveCatalogueOrg } from '../../api/formationCatalogOrg';
import {
  loadProgrammeSeriesOptions,
  ProgrammeSeriesOption,
} from '../../api/formationCatalogSeries';
import { useAppContext } from '../../context/AppContext';
import {
  CatalogueServerFlags,
  FinancementType,
  FormationFiche,
  IdentityAtAssessment,
  ParticipationMode,
  ProgrammeLine,
} from '../../types/formationCatalogue';
import { getEuMcGateCheckboxLabel } from '../../utils/euMcGateCopy';
import './FormationFicheWizard.css';

const DRAFT_KEY = 'kinship.ficheDraft';

function ficheIdFromPath(pathname: string): string | undefined {
  const m = pathname.match(/^\/formation-fiche\/([^/]+)\/?$/);
  return m?.[1];
}

const ASSESS_SUGGESTIONS = [
  'QCM',
  'mise en situation évaluée',
  'projet évalué',
  'oral',
  'portfolio',
];
const FINANCEMENTS: FinancementType[] = [
  'CPF',
  'OPCO',
  'Entreprise',
  'Association',
  'Institution',
  'Autre',
];
const MODALITIES: { id: ParticipationMode; label: string }[] = [
  { id: 'presentiel', label: 'Présentiel' },
  { id: 'distanciel', label: 'Distanciel' },
  { id: 'hybride', label: 'Hybride' },
];
const IDENTITY_OPTS: { id: IdentityAtAssessment; label: string }[] = [
  { id: 'unsupervised', label: 'Non supervisée, sans vérification d’identité' },
  { id: 'supervised_no_id', label: 'Supervisée, sans vérification d’identité' },
  { id: 'supervised_online', label: 'Supervisée en ligne' },
  { id: 'onsite_id', label: 'Sur place, avec vérification d’identité' },
];

type FicheDraftLock = {
  orgKey: string;
  orgName: string;
  orgInitials: string;
  orgCertified: boolean;
  euMc: boolean;
};

function emptyFiche(lock: FicheDraftLock): FormationFiche {
  const now = new Date().toISOString();
  return {
    id: `fiche-${Date.now()}`,
    status: 'draft',
    orgKey: lock.orgKey,
    orgName: lock.orgName,
    orgInitials: lock.orgInitials,
    orgCertified: lock.orgCertified,
    euMc: lock.euMc,
    title: '',
    description: '',
    programmeMode: lock.euMc ? 'series' : 'none',
    programmeLines: [],
    durationHours: '',
    modality: '',
    financement: '',
    prerequisites: '',
    languages: ['Français'],
    practicalInfo: '',
    assessmentType: '',
    jury: false,
    categoryBand: 'Certificat de l’organisme',
    schoolLabel: lock.orgName.split('—')[0]?.trim() || lock.orgName,
    eqfLevelDisplay: lock.euMc ? 'non applicable' : undefined,
    workloadEcts: '',
    validityUnlimited: true,
    validityMonths: '',
    identityAtAssessment: '',
    certificationTarget: 'title',
    certificationRegistry: null,
    certificationLookupError: null,
    createdAt: now,
    updatedAt: now,
  };
}

function readLock(): FicheDraftLock | null {
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as FicheDraftLock;
  } catch {
    return null;
  }
}

function modalityLabel(m: ParticipationMode | ''): string {
  if (m === 'presentiel') return 'Présentiel';
  if (m === 'distanciel') return 'Distanciel';
  if (m === 'hybride') return 'Hybride';
  return '';
}

function missingCatalogFields(f: FormationFiche): string[] {
  const missing: string[] = [];
  if (!f.title.trim()) missing.push('le titre');
  if (!f.description.trim()) missing.push('la description');
  if (f.euMc) {
    if (f.programmeMode !== 'series' || !f.programmeSeries) missing.push('le programme');
    if (!f.assessmentType.trim()) missing.push('le type d’évaluation');
  } else {
    const hasProg =
      (f.programmeMode === 'free_lines' && f.programmeLines.some((l) => l.text.trim())) ||
      (f.programmeMode === 'series' && f.programmeSeries);
    if (!hasProg) missing.push('le programme');
  }
  if (!f.durationHours.trim()) missing.push('la durée en heures');
  if (!f.modality) missing.push('la modalité');
  if (!f.financement) missing.push('le financement');
  return missing;
}

const FormationFicheWizard: React.FC = () => {
  const location = useLocation();
  const id = ficheIdFromPath(location.pathname);
  const navigate = useNavigate();
  const { setCurrentPage, state } = useAppContext();
  const org = useMemo(
    () => resolveCatalogueOrg(state.user, state.showingPageType),
    [state.user, state.showingPageType]
  );
  const lock = useMemo(() => readLock(), []);
  const imgRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<1 | 2 | 3>(lock || id ? 2 : 1);
  const [flags, setFlags] = useState<CatalogueServerFlags | null>(null);
  const [fiche, setFiche] = useState<FormationFiche | null>(null);
  const [euMcChoice, setEuMcChoice] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [langInput, setLangInput] = useState('');
  const [titleClash, setTitleClash] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [step3Missing, setStep3Missing] = useState<string[]>([]);
  const [existingTitles, setExistingTitles] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [seriesOptions, setSeriesOptions] = useState<ProgrammeSeriesOption[]>([]);
  const [seriesOpen, setSeriesOpen] = useState(false);
  const [seriesLoading, setSeriesLoading] = useState(false);

  useEffect(() => {
    if (!org) return;
    getCatalogueFlags(org).then(setFlags).catch(() => setFlags(null));
    getCatalogue(org)
      .then((list) =>
        setExistingTitles(
          list.filter((f) => !id || f.id !== id).map((f) => f.title.trim().toLowerCase())
        )
      )
      .catch(() => setExistingTitles([]));
  }, [id, org]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (id) {
        try {
          const existing = await getCatalogueFiche(id);
          if (!cancelled && existing) {
            setFiche(existing);
            setEuMcChoice(existing.euMc);
            setStep(2);
          }
        } catch (e: any) {
          if (!cancelled) setError(e?.message || 'Fiche introuvable.');
        }
        return;
      }
      if (lock && org) {
        setEuMcChoice(lock.euMc);
        setFiche(
          emptyFiche({
            orgKey: org.key,
            orgName: org.name,
            orgInitials: org.initials,
            orgCertified: lock.orgCertified,
            euMc: lock.euMc,
          })
        );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, lock, org]);

  const gateLabel = flags ? getEuMcGateCheckboxLabel(flags.eu_mc_gate) : null;
  const euMc = fiche?.euMc ?? euMcChoice;

  /** Serveur compliance si présent ; sinon estimation locale (base 4 + champs). */
  const goldCount = useMemo(() => {
    if (!euMc || !fiche) return 0;
    if (fiche.compliance && typeof fiche.compliance.count === 'number') {
      return Math.min(fiche.compliance.count, 9);
    }
    let n = 4;
    if (fiche.title.trim()) n += 1;
    if (fiche.programmeMode === 'series' && fiche.programmeSeries) n += 1;
    if (fiche.durationHours.trim()) n += 1;
    if (fiche.assessmentType.trim()) n += 1;
    if (fiche.modality) n += 1;
    return Math.min(n, 9);
  }, [euMc, fiche]);

  const goCatalogue = () => {
    setCurrentPage('catalogue-formations');
    navigate('/catalogue-formations');
  };

  const ensureFicheFromStep1 = async () => {
    if (fiche?.id && !fiche.id.startsWith('local-') && !fiche.id.startsWith('fiche-')) {
      return fiche;
    }
    if (!org) {
      setError('Choisissez une école ou une entreprise.');
      return null;
    }
    setBusy(true);
    setError(null);
    try {
      const created = await createCatalogueDraft(
        {
          euMc: euMcChoice && Boolean(flags?.eu_mc_gate.allowed),
          orgCertified: lock?.orgCertified ?? true,
        },
        org
      );
      setFiche(created);
      sessionStorage.setItem(
        DRAFT_KEY,
        JSON.stringify({
          orgKey: org.key,
          orgName: org.name,
          orgInitials: org.initials,
          orgCertified: created.orgCertified,
          euMc: created.euMc,
        })
      );
      navigate(`/formation-fiche/${created.id}`, { replace: true });
      return created;
    } catch (e: any) {
      setError(e?.message || 'Création impossible.');
      return null;
    } finally {
      setBusy(false);
    }
  };

  const update = (patch: Partial<FormationFiche>) => {
    setFiche((prev) => (prev ? { ...prev, ...patch } : prev));
  };

  const checkTitleClash = (title: string) => {
    const t = title.trim().toLowerCase();
    if (t && existingTitles.includes(t)) {
      setTitleClash(title.trim());
    } else {
      setTitleClash(null);
    }
  };

  const addLine = () => {
    if (!fiche || fiche.euMc) return;
    const line: ProgrammeLine = { id: `l-${Date.now()}`, text: '' };
    update({
      programmeMode: 'free_lines',
      programmeSeries: undefined,
      programmeLines: [...fiche.programmeLines, line],
    });
  };

  const openSeriesPicker = async () => {
    if (!fiche) return;
    setSeriesOpen(true);
    if (seriesOptions.length) return;
    setSeriesLoading(true);
    try {
      const opts = await loadProgrammeSeriesOptions();
      setSeriesOptions(opts);
      if (!opts.length) setError('Aucune série catalogue disponible (F2).');
    } catch (e: any) {
      setError(e?.message || 'Séries indisponibles.');
    } finally {
      setSeriesLoading(false);
    }
  };

  const pickSeries = (opt: ProgrammeSeriesOption) => {
    update({
      programmeMode: 'series',
      programmeLines: [],
      programmeSeries: opt.programme,
      eqfLevelDisplay: euMc ? 'non applicable' : fiche?.eqfLevelDisplay,
    });
    setSeriesOpen(false);
  };

  const lookupCertification = async (codeRaw: string) => {
    if (!fiche || !org) return;
    const code = codeRaw.trim();
    if (!fiche.id || fiche.id.startsWith('local-') || fiche.id.startsWith('fiche-')) {
      setError('Enregistrez d’abord la fiche avant le code RNCP/RS.');
      return;
    }
    setBusy(true);
    try {
      const updated = await applyCertificationCode(fiche.id, code, org);
      setFiche(updated);
      setError(null);
    } catch (e: any) {
      update({
        certificationCode: codeRaw,
        certificationRegistry: null,
        certificationLookupError: e?.message || 'Registre indisponible.',
      });
    } finally {
      setBusy(false);
    }
  };

  const onImage = (file: File | null) => {
    setImageFile(file);
    if (!file) {
      update({ imageDataUrl: undefined });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') update({ imageDataUrl: reader.result });
    };
    reader.readAsDataURL(file);
  };

  const goStep3 = () => {
    if (!fiche) return;
    setError(null);
    if (titleClash) {
      setError(
        `Ce titre est déjà celui d’une fiche de votre organisme : ${titleClash}. Reprenez-la, ou changez le titre.`
      );
      return;
    }
    setStep3Missing([]);
    setConfirmOpen(false);
    setStep(3);
  };

  const saveDraft = async () => {
    if (!fiche || !org) return;
    setError(null);
    setBusy(true);
    try {
      await saveCatalogueFiche({ ...fiche, status: 'draft' }, org, {
        imageFile: imageFile || undefined,
      });
      setImageFile(null);
      sessionStorage.removeItem(DRAFT_KEY);
      goCatalogue();
    } catch (e: any) {
      setError(e?.message || 'Enregistrement impossible.');
    } finally {
      setBusy(false);
    }
  };

  const requestAddToCatalog = () => {
    if (!fiche) return;
    const missing = missingCatalogFields(fiche);
    if (missing.length) {
      setStep3Missing(missing);
      setConfirmOpen(false);
      return;
    }
    if (titleClash) {
      setStep3Missing([]);
      setError(
        `Ce titre est déjà celui d’une fiche de votre organisme : ${titleClash}. Reprenez-la, ou changez le titre.`
      );
      return;
    }
    setStep3Missing([]);
    setConfirmOpen(true);
  };

  const confirmAddToCatalog = async () => {
    if (!fiche || !org) return;
    setBusy(true);
    setError(null);
    try {
      const saved = await saveCatalogueFiche({ ...fiche, status: 'draft' }, org, {
        imageFile: imageFile || undefined,
      });
      setImageFile(null);
      const listed = await listCatalogueFiche(saved.id, org);
      setFiche(listed);
      sessionStorage.removeItem(DRAFT_KEY);
      setConfirmOpen(false);
      goCatalogue();
    } catch (e: any) {
      setError(e?.message || 'Ajout au catalogue impossible.');
      setConfirmOpen(false);
    } finally {
      setBusy(false);
    }
  };

  const progCount = fiche
    ? fiche.programmeSeries
      ? fiche.programmeSeries.competenceLabels.length
      : fiche.programmeLines.filter((l) => l.text.trim()).length
    : 0;

  if (!flags) {
    return (
      <div className="ffw">
        <p className="ffw-sub">Chargement…</p>
      </div>
    );
  }

  return (
    <div className="ffw">
      <div className="ffw-shell">
        <div className="ffw-bar">
          <span>
            Formation · {fiche?.orgName || lock?.orgName || 'Organisme de formation'}
          </span>
          <span />
        </div>
        <div className="ffw-inner">
          <div className="ffw-steps">
            <span className={step === 1 ? 'on' : 'done'}>1 · Créer</span>
            <span className={step === 2 ? 'on' : step === 3 ? 'done' : ''}>2 · La fiche</span>
            <span className={step === 3 ? 'on' : ''}>3 · Catalogue</span>
          </div>

          {error && <div className="ffw-err">{error}</div>}

          {step === 1 && (
            <>
              <h1 className="ffw-title">Que voulez-vous créer&nbsp;?</h1>
              <div className="ffw-blk">
                <h4>Organisation porteuse</h4>
                <div className="ffw-org">
                  <div className="ffw-dot">{lock?.orgInitials || 'OF'}</div>
                  <div>
                    <div className="ffw-orgname">{lock?.orgName || 'Organisme de formation'}</div>
                    <div className="ffw-orgsub">
                      Organisme de formation
                      {(lock?.orgCertified ?? true) && (
                        <span className="ffw-cert">✓ Organisme de formation certifié</span>
                      )}
                    </div>
                  </div>
                  <div className="ffw-lock">définitive</div>
                </div>
              </div>
              <div className="ffw-blk">
                <h4>Le type</h4>
                <p className="ffw-hint2">FORMATION sélectionnée — programme, sessions, participants</p>
              </div>
              <div className="ffw-blk">
                <h4>Le cadre</h4>
                <label className={`ffw-mc ${!gateLabel?.disabled ? 'gold' : 'off'}`}>
                  <input
                    type="checkbox"
                    checked={euMcChoice}
                    disabled={gateLabel?.disabled}
                    onChange={(e) => setEuMcChoice(e.target.checked)}
                  />
                  <div>
                    <b>Microcertification européenne</b> — {gateLabel?.body}
                  </div>
                </label>
              </div>
              {euMcChoice && flags.eu_mc_gate.allowed && (
                <div className="ffw-orbar">
                  <div className="cnt">4/11</div>
                  <div className="lbl">
                    <b>Le compteur européen s’allume.</b> Pays, organisme, assurance qualité et niveau
                    sont déjà renseignés. La fiche complète le cadre.
                  </div>
                </div>
              )}
              <div className="ffw-warn">
                ⚠
                <div>
                  <b>Ces trois choix seront définitifs au premier enregistrement</b> — brouillon
                  compris.
                </div>
              </div>
              <div className="ffw-foot">
                <button type="button" className="ffw-btn g" onClick={goCatalogue}>
                  Annuler
                </button>
                <button
                  type="button"
                  className="ffw-btn p"
                  onClick={() => {
                    ensureFicheFromStep1().then((created) => {
                      if (created) setStep(2);
                    });
                  }}
                >
                  Continuer →
                </button>
              </div>
            </>
          )}

          {step === 2 && fiche && (
            <>
              {euMc && (
                <div className={`ffw-orbar ${goldCount < 9 ? 'low' : ''}`}>
                  <div className="cnt">{goldCount}/11</div>
                  <div className="lbl">
                    {goldCount >= 9 ? (
                      <>
                        <b>Cadre européen complet.</b> Les inscrits de la session porteront le
                        compteur à 10 ; la clôture écrira le onzième.
                      </>
                    ) : (
                      <b>Le cadre européen n’est pas complet.</b>
                    )}
                  </div>
                </div>
              )}
              <h1 className="ffw-title">La fiche de la formation</h1>
              <p className="ffw-sub">Elle entre à votre catalogue ; chaque session la reprend.</p>

              {flags.certification_links_enabled && (
                <div className="ffw-gold petrol">
                  <label>
                    Code RNCP ou RS{' '}
                    <span className="hint">— si la formation prépare une certification enregistrée</span>
                  </label>
                  <input
                    className="ffw-in"
                    style={{ maxWidth: 220 }}
                    value={fiche.certificationCode || ''}
                    onChange={(e) =>
                      update({
                        certificationCode: e.target.value,
                        certificationLookupError: null,
                      })
                    }
                    onBlur={(e) => lookupCertification(e.target.value)}
                    placeholder="RNCP40281"
                  />
                  {fiche.certificationLookupError && (
                    <div className="ffw-err" style={{ marginTop: 8 }}>
                      {fiche.certificationLookupError}
                    </div>
                  )}
                  {fiche.certificationRegistry && (
                    <>
                      <div className="ffw-recap" style={{ marginTop: 8 }}>
                        <div className="lab">Lu au registre</div>
                        <div className="r">
                          <span className="k">Intitulé exact</span>
                          <span>
                            <b>{fiche.certificationRegistry.label}</b>
                          </span>
                        </div>
                        <div className="r">
                          <span className="k">Niveau</span>
                          <span>{fiche.certificationRegistry.level}</span>
                        </div>
                        <div className="r">
                          <span className="k">Certificateur</span>
                          <span>{fiche.certificationRegistry.certificateur}</span>
                        </div>
                        <div className="r">
                          <span className="k">Blocs</span>
                          <span>{fiche.certificationRegistry.blocks}</span>
                        </div>
                      </div>
                      <div className="ffw-hint2" style={{ marginTop: 9 }}>
                        Cette fiche vise
                      </div>
                      <div className="ffw-radio">
                        <button
                          type="button"
                          className={`ffw-ropt ${fiche.certificationTarget !== 'block' ? 'sel' : ''}`}
                          onClick={() => update({ certificationTarget: 'title' })}
                        >
                          Le titre entier
                        </button>
                        <button
                          type="button"
                          className={`ffw-ropt ${fiche.certificationTarget === 'block' ? 'sel' : ''}`}
                          onClick={() => update({ certificationTarget: 'block' })}
                        >
                          Un bloc ▾
                        </button>
                      </div>
                      <p className="ffw-hint2">
                        Une fiche vise le titre entier ou un bloc ; pour un autre bloc, une autre
                        fiche.
                      </p>
                    </>
                  )}
                </div>
              )}

              <div className="ffw-field">
                <label>
                  Titre de la formation <span className="ob">✱</span>
                  {euMc && <span className="ffw-ortag">cadre européen — intitulé exact</span>}
                </label>
                <input
                  className="ffw-in"
                  value={fiche.title}
                  onChange={(e) => {
                    update({ title: e.target.value });
                    checkTitleClash(e.target.value);
                  }}
                  onBlur={() => checkTitleClash(fiche.title)}
                />
                {titleClash && (
                  <div className="ffw-err" style={{ marginTop: 6 }}>
                    Ce titre est déjà celui d’une fiche de votre organisme : <b>{titleClash}</b>.
                    Reprenez-la, ou changez le titre.
                  </div>
                )}
              </div>
              <div className="ffw-field">
                <label>
                  Description <span className="ob">✱</span>
                </label>
                <textarea
                  className="ffw-ta"
                  value={fiche.description}
                  onChange={(e) => update({ description: e.target.value })}
                />
              </div>

              <div className={`ffw-gold ${euMc ? '' : 'petrol'}`}>
                <label>
                  Programme — les compétences visées <span className="ob">✱</span>
                  {euMc && <span className="ffw-ortag">cadre européen</span>}
                </label>
                {!euMc && (
                  <p className="ffw-hint2">Vos propres lignes, ou une série — jamais les deux.</p>
                )}
                {fiche.programmeMode === 'series' && fiche.programmeSeries ? (
                  <>
                    <div className="ffw-line">
                      <span className="ffw-ser">{fiche.programmeSeries.label}</span>
                      <button
                        type="button"
                        className="ffw-add"
                        onClick={() =>
                          update({ programmeSeries: undefined, programmeMode: 'none' })
                        }
                      >
                        ✕
                      </button>
                    </div>
                    {fiche.programmeSeries.competenceLabels.map((c) => (
                      <div key={c} className="ffw-line">
                        <span>☑</span>
                        <span style={{ flex: 1 }}>{c}</span>
                      </div>
                    ))}
                  </>
                ) : (
                  fiche.programmeLines.map((line) => (
                    <div key={line.id} className="ffw-line">
                      <span>⠿</span>
                      <input
                        value={line.text}
                        onChange={(e) =>
                          update({
                            programmeLines: fiche.programmeLines.map((l) =>
                              l.id === line.id ? { ...l, text: e.target.value } : l
                            ),
                          })
                        }
                      />
                      <button
                        type="button"
                        className="ffw-add"
                        onClick={() =>
                          update({
                            programmeLines: fiche.programmeLines.filter((l) => l.id !== line.id),
                          })
                        }
                      >
                        ✕
                      </button>
                    </div>
                  ))
                )}
                <div style={{ marginTop: 8 }}>
                  {!euMc && (
                    <button type="button" className="ffw-add" onClick={addLine}>
                      + Ajouter une ligne
                    </button>
                  )}
                  <button type="button" className="ffw-add" onClick={openSeriesPicker}>
                    📚 Choisir une série ▾
                  </button>
                </div>
                {seriesOpen && (
                  <div className="ffw-series-pick">
                    {seriesLoading && <div className="ffw-hint2">Chargement des séries F2…</div>}
                    {!seriesLoading &&
                      seriesOptions.map((opt) => (
                        <button
                          key={opt.catalogKey}
                          type="button"
                          className="ffw-series-opt"
                          onClick={() => pickSeries(opt)}
                        >
                          {opt.label}
                          <span>
                            {opt.programme.competenceLabels.length} compétence
                            {opt.programme.competenceLabels.length > 1 ? 's' : ''}
                          </span>
                        </button>
                      ))}
                    <button type="button" className="ffw-add" onClick={() => setSeriesOpen(false)}>
                      Fermer
                    </button>
                  </div>
                )}
                {euMc && (
                  <p className="ffw-hint2" style={{ color: '#8a6d1a' }}>
                    Une série, ses compétences cochées.
                  </p>
                )}
              </div>

              <div className="ffw-two">
                <div className={euMc ? 'ffw-gold' : 'ffw-field'}>
                  <label>
                    Durée en heures <span className="ob">✱</span>
                    {euMc && <span className="ffw-ortag">cadre européen</span>}
                  </label>
                  <input
                    className="ffw-in"
                    style={{ maxWidth: 140 }}
                    value={fiche.durationHours}
                    onChange={(e) => update({ durationHours: e.target.value })}
                  />
                </div>
                <div className={euMc ? 'ffw-gold' : 'ffw-field'}>
                  <label>
                    Modalité <span className="ob">✱</span>
                    {euMc && <span className="ffw-ortag">cadre européen</span>}
                  </label>
                  <div className="ffw-radio">
                    {MODALITIES.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        className={`ffw-ropt ${fiche.modality === m.id ? 'sel' : ''}`}
                        onClick={() => update({ modality: m.id })}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="ffw-field">
                <label>
                  Financement <span className="ob">✱</span>
                </label>
                <div className="ffw-radio">
                  {FINANCEMENTS.map((f) => (
                    <button
                      key={f}
                      type="button"
                      className={`ffw-ropt ${fiche.financement === f ? 'sel' : ''}`}
                      onClick={() => update({ financement: f })}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              <div className="ffw-field">
                <label>Prérequis</label>
                <textarea
                  className="ffw-ta"
                  placeholder="Ce qu’il faut savoir ou avoir avant d’entrer"
                  value={fiche.prerequisites}
                  onChange={(e) => update({ prerequisites: e.target.value })}
                />
              </div>

              <div className="ffw-field">
                <label>Langue de la formation</label>
                {fiche.languages.map((lang) => (
                  <span key={lang} className="ffw-chip">
                    {lang}
                    <button
                      type="button"
                      className="ffw-add"
                      onClick={() =>
                        update({ languages: fiche.languages.filter((l) => l !== lang) })
                      }
                    >
                      ✕
                    </button>
                  </span>
                ))}
                <div style={{ marginTop: 6, display: 'flex', gap: 6 }}>
                  <input
                    className="ffw-in"
                    style={{ maxWidth: 160 }}
                    placeholder="Ajouter"
                    value={langInput}
                    onChange={(e) => setLangInput(e.target.value)}
                  />
                  <button
                    type="button"
                    className="ffw-add"
                    onClick={() => {
                      if (!langInput.trim()) return;
                      update({ languages: [...fiche.languages, langInput.trim()] });
                      setLangInput('');
                    }}
                  >
                    + Ajouter une langue
                  </button>
                </div>
              </div>

              <div className="ffw-field">
                <label>Informations pratiques</label>
                <textarea
                  className="ffw-ta"
                  placeholder="Le lieu, les horaires, le matériel"
                  value={fiche.practicalInfo}
                  onChange={(e) => update({ practicalInfo: e.target.value })}
                />
              </div>

              <div className={`ffw-gold ${euMc ? '' : 'petrol'}`}>
                <label>
                  Évaluation {euMc && <span className="ffw-ortag">cadre européen</span>}
                </label>
                <div className="ffw-hint2">
                  Type d’évaluation {euMc && <span className="ob">✱</span>}
                </div>
                <input
                  className="ffw-in"
                  value={fiche.assessmentType}
                  onChange={(e) => update({ assessmentType: e.target.value })}
                />
                <div className="ffw-sug">
                  {ASSESS_SUGGESTIONS.map((s) => (
                    <button key={s} type="button" onClick={() => update({ assessmentType: s })}>
                      {s}
                    </button>
                  ))}
                </div>
                <div className="ffw-hint2" style={{ marginTop: 9 }}>
                  Jury
                </div>
                <div className="ffw-radio">
                  <button
                    type="button"
                    className={`ffw-ropt ${fiche.jury === true ? 'sel' : ''}`}
                    onClick={() => update({ jury: true })}
                  >
                    Oui
                  </button>
                  <button
                    type="button"
                    className={`ffw-ropt ${fiche.jury === false ? 'sel' : ''}`}
                    onClick={() => update({ jury: false })}
                  >
                    Non
                  </button>
                </div>
              </div>

              {euMc && (
                <div className="ffw-gold">
                  <label>
                    Cadre européen <span className="ffw-ortag">cadre européen</span>
                  </label>
                  <div className="ffw-two" style={{ marginTop: 4 }}>
                    <div>
                      <div className="ffw-hint2">Niveau et cadre</div>
                      <div className="ffw-in" style={{ background: '#fbfaf8', color: '#6d6b64' }}>
                        {fiche.eqfLevelDisplay || 'non applicable'}
                      </div>
                      <p className="ffw-hint2" style={{ color: '#8a6d1a' }}>
                        Calculé automatiquement ; avec une certification visée, c’est le niveau du
                        registre.
                      </p>
                    </div>
                    <div>
                      <div className="ffw-hint2">Crédits ECTS — si applicable</div>
                      <input
                        className="ffw-in"
                        style={{ maxWidth: 90 }}
                        value={fiche.workloadEcts || ''}
                        onChange={(e) => update({ workloadEcts: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="ffw-hint2" style={{ marginTop: 9 }}>
                    Validité — si applicable
                  </div>
                  <div className="ffw-radio">
                    <button
                      type="button"
                      className={`ffw-ropt ${fiche.validityUnlimited !== false ? 'sel' : ''}`}
                      onClick={() => update({ validityUnlimited: true })}
                    >
                      ● Sans limite
                    </button>
                    <button
                      type="button"
                      className={`ffw-ropt ${fiche.validityUnlimited === false ? 'sel' : ''}`}
                      onClick={() => update({ validityUnlimited: false })}
                    >
                      ○ [N] mois
                    </button>
                  </div>
                  {fiche.validityUnlimited === false && (
                    <input
                      className="ffw-in"
                      style={{ maxWidth: 90, marginTop: 6 }}
                      placeholder="mois"
                      value={fiche.validityMonths || ''}
                      onChange={(e) => update({ validityMonths: e.target.value })}
                    />
                  )}
                  <div className="ffw-hint2" style={{ marginTop: 11 }}>
                    L’identité à l’évaluation — si vous le savez
                  </div>
                  <div className="ffw-radio">
                    {IDENTITY_OPTS.map((o) => (
                      <button
                        key={o.id}
                        type="button"
                        className={`ffw-ropt ${fiche.identityAtAssessment === o.id ? 'sel' : ''}`}
                        onClick={() => update({ identityAtAssessment: o.id })}
                      >
                        {o.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className={`ffw-field ${euMc ? 'ffw-gold' : ''}`}>
                <div className="ffw-deliv">
                  Délivre{' '}
                  <span className={`tag ${euMc ? 'gold' : ''}`}>
                    {euMc ? 'Microcertification européenne' : 'Preuve de formation'}
                  </span>
                  {fiche.certificationRegistry && !euMc && (
                    <span className="tag">Preuve certification</span>
                  )}
                  {fiche.certificationRegistry && euMc && (
                    <span className="tag">Preuve certification</span>
                  )}
                </div>
                {euMc && (
                  <p className="ffw-hint2" style={{ color: '#8a6d1a' }}>
                    Avec une certification visée : la Preuve certification en plus.
                  </p>
                )}
              </div>

              <div className="ffw-field">
                <label>
                  Image de la formation <span className="hint">— optionnelle</span>
                </label>
                <div className="ffw-imgzone">
                  <div
                    className="ffw-imgprev"
                    style={
                      fiche.imageDataUrl
                        ? {
                            backgroundImage: `url(${fiche.imageDataUrl})`,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                          }
                        : undefined
                    }
                  >
                    {!fiche.imageDataUrl &&
                      (fiche.title
                        ? fiche.title.toUpperCase().slice(0, 40)
                        : 'TITRE SUR LA COULEUR')}
                  </div>
                  <div className="ffw-imgnote">
                    Sans image, la carte porte le titre sur la couleur de votre organisation.
                    <button
                      type="button"
                      className="ffw-add"
                      style={{ display: 'block', marginTop: 6 }}
                      onClick={() => imgRef.current?.click()}
                    >
                      {fiche.imageDataUrl ? 'Changer l’image →' : 'Ajouter une image →'}
                    </button>
                    {fiche.imageDataUrl && (
                      <button
                        type="button"
                        className="ffw-add"
                        style={{ marginTop: 4 }}
                        onClick={() => update({ imageDataUrl: undefined })}
                      >
                        Retirer
                      </button>
                    )}
                  </div>
                  <input
                    ref={imgRef}
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={(e) => onImage(e.target.files?.[0] || null)}
                  />
                </div>
              </div>

              <div className="ffw-rule">
                Chaque session reprend la fiche telle qu’elle est à son ouverture.
              </div>

              <div className="ffw-foot">
                <button type="button" className="ffw-btn g" onClick={goCatalogue}>
                  Annuler
                </button>
                <div className="ffw-fcol">
                  <button type="button" className="ffw-btn s" onClick={saveDraft}>
                    Enregistrer en brouillon
                  </button>
                  {euMc && goldCount < 9 && (
                    <div className="ffw-mc9">Le compteur attendra.</div>
                  )}
                </div>
                <button type="button" className="ffw-btn p" onClick={goStep3}>
                  Continuer →
                </button>
              </div>
            </>
          )}

          {step === 3 && fiche && (
            <>
              <h1 className="ffw-title">Ajouter la formation à votre catalogue</h1>
              <p className="ffw-sub">
                Voici sa carte. Vous ouvrirez ses sessions depuis le catalogue.
              </p>

              {step3Missing.length > 0 && (
                <>
                  {euMc && (
                    <div className="ffw-orbar low">
                      <div className="cnt">{goldCount}/11</div>
                      <div className="lbl">
                        <b>Le cadre européen n’est pas complet.</b>
                      </div>
                    </div>
                  )}
                  <div className="ffw-warn">
                    ⚠
                    <div>
                      <b>Il manque : {step3Missing.join(', ')}.</b> Complétez la fiche, ou
                      enregistrez-la en brouillon.
                    </div>
                  </div>
                </>
              )}

              <div className="ffw-cardrow">
                <div className={`ffw-card ${fiche.euMc ? 'mcue' : ''}`}>
                  <div className="hd">
                    <span>{fiche.schoolLabel || fiche.orgName}</span>
                    <span className="cd">{fiche.certificationCode || ''}</span>
                  </div>
                  <div className="band">{fiche.categoryBand || 'Certificat de l’organisme'}</div>
                  <div className="ti">{fiche.title || 'Sans titre'}</div>
                  {fiche.assessmentType && <div className="sub">{fiche.assessmentType}</div>}
                  <div className="pills">
                    {fiche.durationHours && <span className="pp h">{fiche.durationHours} h</span>}
                    {fiche.jury && <span className="pp">Jury</span>}
                  </div>
                  {(fiche.modality || fiche.financement) && (
                    <div className="sub" style={{ paddingTop: 0 }}>
                      {[modalityLabel(fiche.modality), fiche.financement].filter(Boolean).join(' · ')}
                    </div>
                  )}
                  <div className="prod">
                    <span className="pl">Délivre</span>
                    {fiche.euMc ? (
                      <span className="pp or">MC UE</span>
                    ) : (
                      <span className="pp">PF</span>
                    )}
                    {fiche.certificationRegistry && <span className="pp">PC</span>}
                  </div>
                </div>
                <div className="ffw-recap">
                  <div className="lab">
                    {fiche.euMc ? `Cadre européen — ${goldCount}/11` : 'La fiche'}
                  </div>
                  {fiche.euMc ? (
                    <>
                      <div className="r">
                        <span className="k">Intitulé exact</span>
                        <span>{fiche.title.trim() ? '✓' : '—'}</span>
                      </div>
                      <div className="r">
                        <span className="k">Programme</span>
                        <span>
                          {progCount} compétence{progCount > 1 ? 's' : ''}
                        </span>
                      </div>
                      <div className="r">
                        <span className="k">Durée</span>
                        <span>
                          {fiche.durationHours || '—'}
                          {fiche.workloadEcts ? ` h · ${fiche.workloadEcts} ECTS` : fiche.durationHours ? ' h' : ''}
                        </span>
                      </div>
                      <div className="r">
                        <span className="k">Niveau</span>
                        <span>{fiche.eqfLevelDisplay || 'non applicable'}</span>
                      </div>
                      <div className="r">
                        <span className="k">Évaluation</span>
                        <span>{fiche.assessmentType || '—'}</span>
                      </div>
                      <div className="r">
                        <span className="k">Modalité</span>
                        <span>{modalityLabel(fiche.modality) || '—'}</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="r">
                        <span className="k">Programme</span>
                        <span>
                          {progCount} compétence{progCount > 1 ? 's' : ''}
                        </span>
                      </div>
                      <div className="r">
                        <span className="k">Durée</span>
                        <span>{fiche.durationHours ? `${fiche.durationHours} heures` : '—'}</span>
                      </div>
                      <div className="r">
                        <span className="k">Modalité</span>
                        <span>{modalityLabel(fiche.modality) || '—'}</span>
                      </div>
                      <div className="r">
                        <span className="k">Financement</span>
                        <span>{fiche.financement || '—'}</span>
                      </div>
                      <div className="r">
                        <span className="k">Évaluation</span>
                        <span>{fiche.assessmentType || '—'}</span>
                      </div>
                      <div className="r">
                        <span className="k">Décision</span>
                        <span>
                          {fiche.jury === true ? 'Le jury' : fiche.jury === false ? 'Sans jury' : '—'}
                        </span>
                      </div>
                      <div className="r">
                        <span className="k">Délivre</span>
                        <span>Preuve de formation</span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="ffw-foot">
                <button type="button" className="ffw-btn g" onClick={() => setStep(2)}>
                  Retour
                </button>
                <button type="button" className="ffw-btn s" onClick={saveDraft}>
                  Enregistrer en brouillon
                </button>
                <button
                  type="button"
                  className="ffw-btn am"
                  disabled={step3Missing.length > 0}
                  onClick={requestAddToCatalog}
                >
                  Ajouter au catalogue
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {confirmOpen && fiche && (
        <div className="ffw-modalwrap" role="dialog" aria-modal="true">
          <div className="ffw-modal">
            <h5>Ajouter la formation à votre catalogue&nbsp;?</h5>
            <p>
              <b>{fiche.title}</b> — {fiche.durationHours || '?'} heures
              {fiche.modality ? `, ${modalityLabel(fiche.modality).toLowerCase()}` : ''}
              {fiche.financement ? `, ${fiche.financement}` : ''}
              {fiche.assessmentType ? `, ${fiche.assessmentType}` : ''}
              {fiche.jury === true ? ', décision du jury' : ''}
              {progCount ? ` ; programme de ${progCount} compétences` : ''}.
            </p>
            {fiche.euMc && (
              <div className="ffw-figeor">
                <b>Cadre européen — {goldCount}/11 :</b> le titre, le programme, la durée, le niveau,
                le type d’évaluation, la modalité — avec le pays, l’organisme et l’assurance qualité
                de votre vérification. Les inscrits de chaque session feront le dixième, sa clôture
                le onzième.
              </div>
            )}
            <p>
              Elle délivre{' '}
              {fiche.euMc
                ? 'une microcertification européenne'
                : 'une preuve de formation'}
              .
            </p>
            <div className="ffw-porte">
              Vous ouvrirez sa première session depuis sa carte : dates, formateur responsable,
              participants.
            </div>
            <div className="ffw-btnrow">
              <button type="button" className="ffw-btn g" onClick={() => setConfirmOpen(false)}>
                Annuler
              </button>
              <button type="button" className="ffw-btn am" onClick={confirmAddToCatalog}>
                Ajouter au catalogue
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FormationFicheWizard;
