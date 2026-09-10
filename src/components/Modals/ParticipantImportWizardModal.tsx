import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  createParticipantImport,
  destroyParticipantImport,
  downloadRecapCoupons,
  downloadRecapDirectionNote,
  downloadRecapRouteSheets,
  eraseRecapNominative,
  getParticipantImport,
  getParticipantImportDocumentIndex,
  getParticipantImportRecap,
  LiveBatchConflict,
  ParticipantImportBatch,
  ParticipantImportLine,
  RecapDocumentIndex,
  RecapSummary,
  resolveParticipantImportLine,
  validateParticipantImport,
} from '../../api/ParticipantImports';
import './Modal.css';
import './ParticipantImportWizardModal.css';

type Step = 'deposit' | 'mapping' | 'control' | 'live' | 'expired' | 'receipt';

const LEVEL_OPTIONS = [
  { value: 'sixieme', label: 'sixième' },
  { value: 'cinquieme', label: 'cinquième' },
  { value: 'quatrieme', label: 'quatrième' },
  { value: 'troisieme', label: 'troisième' },
  { value: 'seconde', label: 'seconde' },
  { value: 'premiere', label: 'première' },
  { value: 'terminale', label: 'terminale' },
  { value: 'other', label: 'autre' },
];

const FIELD_LABELS: Record<string, string> = {
  prenom: 'Prénom',
  nom: 'Nom',
  date_de_naissance: 'Date de naissance',
  classe: 'Classe',
  email_du_representant_legal: 'Email du représentant légal',
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  schoolId: number;
  schoolName?: string;
  onValidated?: () => void;
};

function operatorLabel(batch?: ParticipantImportBatch | null) {
  if (!batch?.operator_first_name) return 'un collègue';
  const initial = batch.operator_last_initial ? ` ${batch.operator_last_initial}.` : '';
  return `${batch.operator_first_name}${initial}`;
}

function formatShortDate(iso?: string | null) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
}

function formatLongDate(iso?: string | null) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
}

function hasResolution(line: ParticipantImportLine) {
  const r = line.resolution;
  if (r == null || r === '') return false;
  if (typeof r === 'object') return Object.values(r).some((v) => v != null && String(v).trim() !== '');
  return true;
}

function lineDisplayName(line: ParticipantImportLine) {
  const prenom = line.identity?.prenom || '';
  const nom = (line.identity?.nom || '').toUpperCase();
  return `${prenom} ${nom}`.trim();
}

const ParticipantImportWizardModal: React.FC<Props> = ({
  isOpen,
  onClose,
  schoolId,
  schoolName,
  onValidated,
}) => {
  const fileRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>('deposit');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [drag, setDrag] = useState(false);
  const [batch, setBatch] = useState<ParticipantImportBatch | null>(null);
  const [liveConflict, setLiveConflict] = useState<ParticipantImportBatch | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [classLevels, setClassLevels] = useState<Record<string, string>>({});
  const [openSeries, setOpenSeries] = useState<'dates' | 'homonyms' | 'class' | null>(null);
  const [seriesIndex, setSeriesIndex] = useState(0);
  const [recapToken, setRecapToken] = useState<string | null>(null);
  const [recap, setRecap] = useState<RecapSummary | null>(null);
  const [docIndex, setDocIndex] = useState<RecapDocumentIndex | null>(null);
  const [showRemovals, setShowRemovals] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setStep('deposit');
      setBusy(false);
      setError('');
      setDrag(false);
      setBatch(null);
      setLiveConflict(null);
      setPendingFile(null);
      setClassLevels({});
      setOpenSeries(null);
      setSeriesIndex(0);
      setRecapToken(null);
      setRecap(null);
      setDocIndex(null);
      setShowRemovals(false);
    }
  }, [isOpen]);

  const payload = batch?.payload;
  const lines = payload?.lines || [];

  const dateIssues = useMemo(
    () =>
      lines.filter(
        (l) =>
          l.status === 'pending' &&
          Array.isArray(l.issues) &&
          l.issues.some((i) => i.type === 'invalid_birthday') &&
          !hasResolution(l)
      ),
    [lines]
  );

  const ambiguousLines = useMemo(
    () => lines.filter((l) => l.status === 'ambiguous' && !hasResolution(l)),
    [lines]
  );

  const classConflictGroups = useMemo(() => {
    const groups: Array<{ key: string; lines: ParticipantImportLine[]; classes: string[]; prompt?: string }> = [];
    const seen = new Set<string>();
    const conflicts = payload?.class_conflicts || [];

    conflicts.forEach((c) => {
      const ids = (c.line_ids || []).map(String);
      if (!ids.length) return;
      const key = ids.slice().sort().join('|');
      if (seen.has(key)) return;
      seen.add(key);
      const groupLines = lines.filter((l) => ids.includes(l.line_id) && !hasResolution(l));
      if (!groupLines.length) return;
      groups.push({
        key,
        lines: groupLines,
        classes: c.classes || [],
        prompt: c.prompt,
      });
    });

    lines.forEach((l) => {
      if (l.status !== 'class_conflict' || hasResolution(l)) return;
      const issueClasses =
        l.issues?.find((i) => i.type === 'class_conflict')?.classes || [];
      const key = `solo:${l.line_id}`;
      if (Array.from(seen).some((k) => k.includes(l.line_id))) return;
      seen.add(key);
      groups.push({ key, lines: [l], classes: issueClasses, prompt: 'on la déplace ?' });
    });

    return groups;
  }, [lines, payload?.class_conflicts]);

  const unresolvedCount = dateIssues.length + ambiguousLines.length + classConflictGroups.length;
  const brought = payload?.counts?.brought ?? lines.length;
  const registered = payload?.counts?.registered ?? 0;
  const skippedDepartures = payload?.counts?.skipped_departures ?? 0;
  const skippedExamples = payload?.counts?.skipped_examples ?? 0;
  const removals = payload?.removals || [];

  const classRows = useMemo(() => {
    const preview = payload?.classes || [];
    if (preview.length) {
      return preview.map((c) => {
        const count = lines.filter(
          (l) => (l.identity?.classe || '').trim() === (c.name || '').trim()
        ).length;
        return { name: c.name, count, proposed: c.proposed_level || 'other' };
      });
    }
    const byName: Record<string, number> = {};
    lines.forEach((l) => {
      const name = (l.identity?.classe || '').trim();
      if (!name) return;
      byName[name] = (byName[name] || 0) + 1;
    });
    return Object.entries(byName).map(([name, count]) => ({
      name,
      count,
      proposed: 'other',
    }));
  }, [payload?.classes, lines]);

  useEffect(() => {
    if (!batch) return;
    setClassLevels((prev) => {
      const next = { ...prev };
      classRows.forEach((row) => {
        if (!next[row.name]) next[row.name] = row.proposed;
      });
      return next;
    });
  }, [batch, classRows]);

  if (!isOpen) return null;

  const applyBatch = (next: ParticipantImportBatch) => {
    setBatch(next);
    setError('');
  };

  const uploadFile = async (file: File, replace = false) => {
    setBusy(true);
    setError('');
    try {
      const res = await createParticipantImport(schoolId, file, { replace });
      applyBatch(res.data);
      setPendingFile(null);
      setLiveConflict(null);
      setStep('mapping');
    } catch (err: any) {
      const data = err?.response?.data as LiveBatchConflict | undefined;
      if (err?.response?.status === 409 && data?.code === 'LIVE_BATCH_EXISTS' && data.live_batch) {
        setPendingFile(file);
        setLiveConflict(data.live_batch);
        setStep('live');
      } else {
        setError(
          data && 'message' in (data as object)
            ? String((data as { message?: string }).message || err.message)
            : err?.response?.data?.message || err.message || 'Import impossible'
        );
      }
    } finally {
      setBusy(false);
    }
  };

  const resumeLive = async () => {
    if (!liveConflict?.public_token) return;
    setBusy(true);
    setError('');
    try {
      const res = await getParticipantImport(schoolId, liveConflict.public_token);
      applyBatch(res.data);
      setLiveConflict(null);
      setPendingFile(null);
      setStep('control');
    } catch (err: any) {
      if (err?.response?.status === 410) {
        setStep('expired');
        setBatch({
          ...(liveConflict || ({} as ParticipantImportBatch)),
          status: 'expired',
        });
      } else {
        setError(err?.response?.data?.message || err.message || 'Reprise impossible');
      }
    } finally {
      setBusy(false);
    }
  };

  const replaceLive = async () => {
    if (!pendingFile) return;
    await uploadFile(pendingFile, true);
  };

  const handleResolve = async (
    lineId: string,
    decision: 'match' | 'create' | 'choose_class',
    extra?: { chosen_candidate_token?: string; chosen_classe?: string }
  ) => {
    if (!batch?.public_token) return;
    setBusy(true);
    setError('');
    try {
      const res = await resolveParticipantImportLine(schoolId, batch.public_token, {
        line_id: lineId,
        decision,
        ...extra,
      });
      applyBatch(res.data);
    } catch (err: any) {
      if (err?.response?.status === 410) {
        setStep('expired');
      } else {
        setError(err?.response?.data?.message || err.message || 'Résolution impossible');
      }
    } finally {
      setBusy(false);
    }
  };

  const handleValidate = async () => {
    if (!batch?.public_token) return;
    setBusy(true);
    setError('');

    let validateRes: Awaited<ReturnType<typeof validateParticipantImport>>;
    try {
      validateRes = await validateParticipantImport(schoolId, batch.public_token, classLevels);
    } catch (err: any) {
      if (err?.response?.status === 410) {
        setStep('expired');
      } else {
        setError(err?.response?.data?.message || err.message || 'Validation impossible');
      }
      setBusy(false);
      return;
    }

    const token = validateRes.data.recap.public_token;
    setRecapToken(token);
    setRecap({
      public_token: token,
      counts: validateRes.data.recap.counts,
      nominative_present: true,
    });
    setDocIndex(null);
    setStep('receipt');
    onValidated?.();

    try {
      const [recapRes, indexRes] = await Promise.all([
        getParticipantImportRecap(schoolId, token),
        getParticipantImportDocumentIndex(schoolId, token),
      ]);
      setRecap(recapRes.data);
      setDocIndex(indexRes.data);
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          err.message ||
          'Reçu partiellement disponible — les élèves sont bien inscrits.'
      );
    } finally {
      setBusy(false);
    }
  };

  const handleCancelBatch = async () => {
    if (!batch?.public_token || batch.status === 'validated') {
      onClose();
      return;
    }

    setBusy(true);
    setError('');
    try {
      await destroyParticipantImport(schoolId, batch.public_token);
      setBatch(null);
      onClose();
    } catch (err: any) {
      const status = err?.response?.status;
      // Already gone — treat as success so the operator is not stuck on M4bis.
      if (status === 404) {
        setBatch(null);
        onClose();
        return;
      }
      setError(
        err?.response?.data?.message ||
          err.message ||
          "Impossible d'annuler le lot. Réessayez ou utilisez « Le remplacer » au prochain dépôt."
      );
    } finally {
      setBusy(false);
    }
  };

  const handleEraseNominative = async () => {
    if (!recapToken) return;
    if (!window.confirm('Effacer le contenu nominatif ? On efface la liste, pas les élèves.')) return;
    setBusy(true);
    try {
      await eraseRecapNominative(schoolId, recapToken);
      const [recapRes, indexRes] = await Promise.all([
        getParticipantImportRecap(schoolId, recapToken),
        getParticipantImportDocumentIndex(schoolId, recapToken),
      ]);
      setRecap(recapRes.data);
      setDocIndex(indexRes.data);
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || 'Effacement impossible');
    } finally {
      setBusy(false);
    }
  };

  const runDownload = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError('');
    try {
      await fn();
    } catch (err: any) {
      setError(err?.message || 'Téléchargement impossible');
    } finally {
      setBusy(false);
    }
  };

  const barTitle =
    step === 'deposit'
      ? 'M1 — Le dépôt'
      : step === 'mapping'
        ? "M2 — Voici ce que j'ai compris"
        : step === 'control'
          ? 'M3 — L\'écran de contrôle'
          : step === 'live'
            ? 'M4bis — Un import est en cours'
            : step === 'expired'
              ? 'M4ter — Le lot a expiré'
              : 'M6 — Le reçu';

  const columnEntries = Object.entries(payload?.column_map || {}).sort(
    (a, b) => Number(a[1]) - Number(b[1])
  );
  const unused = payload?.counts?.unused_columns;
  const previewLines = lines.slice(0, 3);

  const activeAmbiguous = ambiguousLines[seriesIndex];
  const activeClassGroup = classConflictGroups[seriesIndex];

  return (
    <div className="piw-overlay" onClick={onClose}>
      <div className="piw-modal" onClick={(e) => e.stopPropagation()}>
        <div className="piw-bar">
          <span>{barTitle}</span>
          <span className="piw-bar-x">{schoolName || 'Établissement'}</span>
        </div>
        <div className="piw-inner">
          {error ? <div className="piw-error">{error}</div> : null}

          {step === 'deposit' && (
            <>
              <div className="piw-title">Ajouter des élèves</div>
              <div className="piw-sub">Trois entrées, un seul moteur. Cette version livre le dépôt de fichier.</div>
              <div
                className={`piw-drop${drag ? ' drag' : ''}`}
                onClick={() => fileRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDrag(true);
                }}
                onDragLeave={() => setDrag(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDrag(false);
                  const f = e.dataTransfer.files?.[0];
                  if (f) void uploadFile(f);
                }}
              >
                <div style={{ fontSize: 20 }}>📄</div>
                <div className="t">Déposez votre fichier</div>
                <div className="s2">Siècle (XML, avec ou sans représentants), Excel ou CSV</div>
              </div>
              <input
                ref={fileRef}
                className="piw-file-input"
                type="file"
                accept=".csv,.xml,.xlsx,.xls,.zip,text/csv,application/xml,application/zip"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void uploadFile(f);
                  e.target.value = '';
                }}
              />
              <div className="piw-mc">
                <div>
                  <b>Nous lisons uniquement :</b> nom, prénom, date de naissance, la classe et son niveau,
                  l&apos;email du représentant s&apos;il est présent — et aucune autre information sur le
                  fichier s&apos;il en contient.
                </div>
              </div>
              <div className="piw-mc">
                <div>
                  Si votre fichier porte des adresses de représentants, les familles seront informées par
                  email après validation.
                </div>
              </div>
              <div className="piw-mc accent">
                <div>
                  <b>Vous utilisez Siècle ?</b> Déposez votre export tel quel : c&apos;est le fichier qui
                  produit le moins d&apos;erreurs — l&apos;identité y est complète, les classes structurées,
                  leur niveau exact, et les élèves sortis sont écartés d&apos;office. Nous n&apos;y lisons
                  que les informations indiquées ci-dessus.
                </div>
              </div>
              <div className="piw-foot" style={{ justifyContent: 'flex-start' }}>
                <button type="button" className="piw-btn" onClick={onClose} disabled={busy}>
                  Fermer
                </button>
                <button
                  type="button"
                  className="piw-btn p"
                  disabled={busy}
                  onClick={() => fileRef.current?.click()}
                >
                  {busy ? 'Analyse…' : 'Choisir un fichier'}
                </button>
              </div>
            </>
          )}

          {step === 'mapping' && batch && (
            <>
              <div className="piw-title">Voici ce que j&apos;ai compris</div>
              <div className="piw-sub">Avant de vous parler de problèmes.</div>
              <div className="piw-blk">
                {columnEntries.length === 0 ? (
                  <div className="piw-muted">Colonnes reconnues automatiquement.</div>
                ) : (
                  columnEntries.map(([field, idx]) => (
                    <div className="piw-map" key={field}>
                      <span className="k">Colonne {String.fromCharCode(65 + Number(idx))}</span>
                      <span className="v">{FIELD_LABELS[field] || field}</span>
                    </div>
                  ))
                )}
                {typeof unused === 'number' && unused > 0 ? (
                  <div className="piw-map">
                    <span className="k">Colonnes non utilisées</span>
                    <span className="v ig">{unused}</span>
                  </div>
                ) : null}
              </div>
              <div className="piw-blk">
                <h4>Les trois premières lignes lues</h4>
                <table className="piw-prev">
                  <thead>
                    <tr>
                      <th>Prénom</th>
                      <th>Nom</th>
                      <th>Naissance</th>
                      <th>Classe</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewLines.map((l) => (
                      <tr key={l.line_id}>
                        <td>{l.identity?.prenom}</td>
                        <td>{l.identity?.nom}</td>
                        <td>{l.identity?.date_de_naissance || l.birthday || '—'}</td>
                        <td>{l.identity?.classe}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="piw-foot">
                <button type="button" className="piw-btn" onClick={() => setStep('deposit')} disabled={busy}>
                  Retour
                </button>
                <button type="button" className="piw-btn p" onClick={() => setStep('control')} disabled={busy}>
                  Continuer →
                </button>
              </div>
            </>
          )}

          {step === 'control' && batch && (
            <>
              <div className="piw-title">Ce qui va se passer</div>
              <div className="piw-sub">Le dépôt n&apos;écrit rien. Trois blocs, toujours dans cet ordre.</div>

              <div className="piw-blk">
                <h4>① Le compte</h4>
                <div className="piw-cnt">
                  <em>{brought}</em> lignes apportées → <em>{registered}</em> personnes inscrites
                </div>
                <div className="piw-chips">
                  {skippedDepartures > 0 ? (
                    <span className="piw-chip o">{skippedDepartures} élèves sortis écartés</span>
                  ) : null}
                  {skippedExamples > 0 ? (
                    <span className="piw-chip o">{skippedExamples} lignes d&apos;exemple ignorées</span>
                  ) : null}
                </div>
                <div className="piw-muted">Le compte bouge à chaque point réglé.</div>
              </div>

              <div className="piw-blk">
                <h4>② Les classes qui vont être créées</h4>
                {classRows.map((row) => {
                  const level = classLevels[row.name] || row.proposed;
                  return (
                    <div className="piw-lvl" key={row.name}>
                      <span>
                        {row.name} <span style={{ color: '#a09d93' }}>· {row.count}</span>
                      </span>
                      <select
                        className={`piw-sel${level === 'other' ? ' o' : ''}`}
                        value={level}
                        onChange={(e) =>
                          setClassLevels((prev) => ({ ...prev, [row.name]: e.target.value }))
                        }
                      >
                        {LEVEL_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  );
                })}
                <div className="piw-muted">Le niveau est une valeur modifiable, pas une question.</div>
              </div>

              <div className="piw-blk">
                <h4>
                  ③ {unresolvedCount} point{unresolvedCount === 1 ? '' : 's'} à régler avant validation
                </h4>

                <div className="piw-serie">
                  <div className={`piw-sh${dateIssues.length === 0 ? ' done' : ''}`}>
                    <span>
                      {dateIssues.length === 0 ? '✓ ' : ''}
                      <b>
                        {dateIssues.length === 0
                          ? 'Dates'
                          : `${dateIssues.length} date${dateIssues.length > 1 ? 's' : ''} manquante${dateIssues.length > 1 ? 's' : ''}`}
                      </b>
                      {dateIssues.length === 0 ? ' — aucune' : ''}
                    </span>
                    {dateIssues.length > 0 ? (
                      <button
                        type="button"
                        className="piw-btn p sm"
                        onClick={() => {
                          setOpenSeries(openSeries === 'dates' ? null : 'dates');
                          setSeriesIndex(0);
                        }}
                      >
                        Voir
                      </button>
                    ) : null}
                  </div>
                  {openSeries === 'dates' && dateIssues[0] ? (
                    <div className="piw-sb">
                      <div className="piw-cpt">
                        {seriesIndex + 1} / {dateIssues.length}
                      </div>
                      <div style={{ fontSize: 11.5, fontWeight: 700, margin: '4px 0 2px' }}>
                        {lineDisplayName(dateIssues[seriesIndex])} —{' '}
                        {dateIssues[seriesIndex].identity?.classe}
                      </div>
                      <div style={{ fontSize: 10, color: '#6d6b64', marginBottom: 8 }}>
                        {dateIssues[seriesIndex].issues?.find((i) => i.type === 'invalid_birthday')
                          ?.message || 'Date de naissance illisible.'}{' '}
                        Corrigez le fichier puis redéposez — « Passer » laisse la ligne en attente.
                      </div>
                      <div style={{ display: 'flex', gap: 7 }}>
                        <button
                          type="button"
                          className="piw-btn sm"
                          disabled={busy || seriesIndex >= dateIssues.length - 1}
                          onClick={() => setSeriesIndex((i) => Math.min(dateIssues.length - 1, i + 1))}
                        >
                          Passer
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>

                <div className="piw-serie">
                  <div className={`piw-sh${ambiguousLines.length === 0 ? ' done' : ''}`}>
                    <span>
                      {ambiguousLines.length === 0 ? '✓ ' : ''}
                      <b>
                        {ambiguousLines.length === 0
                          ? 'Homonymes'
                          : `${ambiguousLines.length} homonyme${ambiguousLines.length > 1 ? 's' : ''}`}
                      </b>
                      {ambiguousLines.length === 0 ? ' — aucun' : ''}
                    </span>
                    {ambiguousLines.length > 0 ? (
                      <button
                        type="button"
                        className="piw-btn s sm"
                        onClick={() => {
                          setOpenSeries(openSeries === 'homonyms' ? null : 'homonyms');
                          setSeriesIndex(0);
                        }}
                      >
                        Régler
                      </button>
                    ) : null}
                  </div>
                  {openSeries === 'homonyms' && activeAmbiguous ? (
                    <div className="piw-sb">
                      <div className="piw-cpt">
                        {seriesIndex + 1} / {ambiguousLines.length}
                      </div>
                      <div className="piw-title" style={{ marginTop: 4 }}>
                        {lineDisplayName(activeAmbiguous)}
                      </div>
                      <div className="piw-sub">
                        née le {activeAmbiguous.identity?.date_de_naissance || activeAmbiguous.birthday}
                      </div>
                      {(activeAmbiguous.candidates || []).map((c) => (
                        <div className="piw-warn" key={c.candidate_token}>
                          ⚠{' '}
                          <div>
                            Une personne du même nom et de la même date de naissance est déjà connue
                            {c.city ? (
                              <>
                                {' '}
                                — <b>à {c.city}</b>
                              </>
                            ) : null}
                            .
                            <div style={{ marginTop: 8, display: 'flex', gap: 7 }}>
                              <button
                                type="button"
                                className="piw-btn sm"
                                disabled={busy}
                                onClick={async () => {
                                  await handleResolve(activeAmbiguous.line_id, 'create');
                                  setSeriesIndex(0);
                                }}
                              >
                                Non, c&apos;en est une autre
                              </button>
                              <button
                                type="button"
                                className="piw-btn p sm"
                                disabled={busy}
                                onClick={async () => {
                                  await handleResolve(activeAmbiguous.line_id, 'match', {
                                    chosen_candidate_token: c.candidate_token,
                                  });
                                  setSeriesIndex(0);
                                }}
                              >
                                C&apos;est bien elle
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                      {!(activeAmbiguous.candidates || []).length ? (
                        <button
                          type="button"
                          className="piw-btn p sm"
                          disabled={busy}
                          onClick={async () => {
                            await handleResolve(activeAmbiguous.line_id, 'create');
                            setSeriesIndex(0);
                          }}
                        >
                          Créer une nouvelle fiche
                        </button>
                      ) : null}
                    </div>
                  ) : null}
                </div>

                <div className="piw-serie">
                  <div className={`piw-sh${classConflictGroups.length === 0 ? ' done' : ''}`}>
                    <span>
                      {classConflictGroups.length === 0 ? '✓ ' : ''}
                      <b>
                        {classConflictGroups.length === 0
                          ? 'Déjà dans une autre classe'
                          : `${classConflictGroups.length} élève${classConflictGroups.length > 1 ? 's' : ''} déjà dans une autre classe`}
                      </b>
                    </span>
                    {classConflictGroups.length > 0 ? (
                      <button
                        type="button"
                        className="piw-btn s sm"
                        onClick={() => {
                          setOpenSeries(openSeries === 'class' ? null : 'class');
                          setSeriesIndex(0);
                        }}
                      >
                        Régler
                      </button>
                    ) : null}
                  </div>
                  {openSeries === 'class' && activeClassGroup ? (
                    <div className="piw-sb">
                      <div className="piw-cpt">
                        {seriesIndex + 1} / {classConflictGroups.length}
                      </div>
                      <div style={{ fontSize: 11.5, fontWeight: 700, margin: '4px 0 6px' }}>
                        {lineDisplayName(activeClassGroup.lines[0])}
                      </div>
                      <div className="piw-warn">
                        ⚠ <div>{activeClassGroup.prompt || 'on la déplace ?'}</div>
                      </div>
                      <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
                        {(activeClassGroup.classes.length
                          ? activeClassGroup.classes
                          : activeClassGroup.lines.map((l) => l.identity?.classe || '').filter(Boolean)
                        ).map((classe) => (
                          <button
                            key={classe}
                            type="button"
                            className="piw-btn p sm"
                            disabled={busy}
                            onClick={async () => {
                              await handleResolve(activeClassGroup.lines[0].line_id, 'choose_class', {
                                chosen_classe: classe,
                              });
                              setSeriesIndex(0);
                            }}
                          >
                            Garder {classe}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
                <div className="piw-muted">Le mécanique d&apos;abord, les personnes ensuite.</div>
              </div>

              {removals.length > 0 ? (
                <div className="piw-blk" style={{ borderColor: '#e7d9ae', background: '#fdf6e3' }}>
                  <h4 style={{ color: '#8a6d1a' }}>④ Ce qui va partir</h4>
                  <div style={{ fontSize: 11, color: '#6b5410', lineHeight: 1.5 }}>
                    <b>
                      {removals.length} élève{removals.length > 1 ? 's' : ''} de vos classes ne figure
                      {removals.length > 1 ? 'nt' : ''} plus dans cet export
                    </b>{' '}
                    — ils seront retirés de vos classes et de l&apos;établissement.
                  </div>
                  <div style={{ margin: '7px 0' }}>
                    <button
                      type="button"
                      className="piw-btn sm"
                      onClick={() => setShowRemovals((v) => !v)}
                    >
                      {showRemovals ? '▴ Masquer' : `▾ Voir les ${removals.length} élèves`}
                    </button>
                  </div>
                  {showRemovals ? (
                    <div style={{ fontSize: 10, color: '#6b5410', lineHeight: 1.6 }}>
                      {removals.slice(0, 12).map((r, i) => (
                        <div key={i}>
                          {r.first_name} {r.last_name}
                          {r.class_names?.length ? ` — ${r.class_names.join(', ')}` : ''}
                        </div>
                      ))}
                      {removals.length > 12 ? (
                        <div style={{ color: '#a08a4a' }}>… et {removals.length - 12} autres</div>
                      ) : null}
                    </div>
                  ) : null}
                  <div className="piw-muted" style={{ color: '#8a6d1a' }}>
                    Leur fiche, leurs preuves et leur historique leur restent.
                  </div>
                </div>
              ) : null}

              <div className="piw-foot">
                <div className="n">
                  {payload?.email_notice ||
                    "La validation déclenchera l'information des familles par email."}
                </div>
                <button type="button" className="piw-btn" onClick={handleCancelBatch} disabled={busy}>
                  Annuler
                </button>
                <button type="button" className="piw-btn p" onClick={handleValidate} disabled={busy}>
                  {busy
                    ? 'Validation…'
                    : `Valider — ${registered} inscription${registered === 1 ? '' : 's'}`}
                </button>
              </div>
              {unresolvedCount > 0 ? (
                <div className="piw-muted">
                  {unresolvedCount} ligne{unresolvedCount > 1 ? 's' : ''} rester
                  {unresolvedCount > 1 ? 'ont' : 'a'} en attente — récupérer le fichier.
                </div>
              ) : null}
              {batch.expires_at ? (
                <div className="piw-muted">
                  Ce lot reste disponible jusqu&apos;au {formatLongDate(batch.expires_at)}.
                </div>
              ) : null}
            </>
          )}

          {step === 'live' && liveConflict && (
            <>
              <div className="piw-warn">
                ⚠{' '}
                <div>
                  <b>
                    Un import est en cours, déposé par {operatorLabel(liveConflict)}
                    {liveConflict.created_at ? ` le ${formatShortDate(liveConflict.created_at)}` : ''}
                    {typeof liveConflict.resolved_count === 'number'
                      ? ` — ${liveConflict.resolved_count} point${liveConflict.resolved_count === 1 ? '' : 's'} déjà réglé${liveConflict.resolved_count === 1 ? '' : 's'}`
                      : ''}
                    .
                  </b>
                  <br />
                  Le remplacer ?
                </div>
              </div>
              <div className="piw-foot" style={{ borderTop: 'none', paddingTop: 0 }}>
                <button type="button" className="piw-btn" onClick={resumeLive} disabled={busy}>
                  Reprendre celui-là
                </button>
                <button type="button" className="piw-btn d" onClick={replaceLive} disabled={busy || !pendingFile}>
                  Le remplacer
                </button>
              </div>
            </>
          )}

          {step === 'expired' && (
            <>
              <div className="piw-title">Cette analyse a expiré</div>
              <div className="piw-blk" style={{ marginTop: 9 }}>
                <div style={{ fontSize: 11, lineHeight: 1.6 }}>
                  Déposée
                  {batch?.created_at ? (
                    <>
                      {' '}
                      le <b>{formatLongDate(batch.created_at)}</b>
                    </>
                  ) : null}
                  {batch?.operator_first_name ? (
                    <>
                      {' '}
                      par {operatorLabel(batch)}
                    </>
                  ) : null}
                  , elle est restée disponible <b>sept jours</b>.
                  <br />
                  <br />
                  {typeof batch?.resolved_count === 'number' ? (
                    <>
                      <b>
                        {batch.resolved_count} point{batch.resolved_count === 1 ? '' : 's'} avaient été
                        réglé{batch.resolved_count === 1 ? '' : 's'}.
                      </b>{' '}
                      Ils ne sont plus disponibles.
                    </>
                  ) : (
                    'Les points déjà réglés ne sont plus disponibles.'
                  )}
                </div>
              </div>
              <div className="piw-foot">
                <button
                  type="button"
                  className="piw-btn p"
                  onClick={() => {
                    setStep('deposit');
                    setBatch(null);
                    setLiveConflict(null);
                    setPendingFile(null);
                  }}
                >
                  Déposer un nouveau fichier
                </button>
              </div>
            </>
          )}

          {step === 'receipt' && recap && (
            <>
              <div className="piw-title">C&apos;est fait</div>
              <div className="piw-sub">Écran final à adresse stable, retrouvable par « Derniers imports ».</div>

              <div className="piw-blk">
                <h4>Ce qui est parti</h4>
                <div className="piw-cnt" style={{ fontSize: 12 }}>
                  <em>{recap.counts?.coupons_generated ?? '—'}</em> coupons générés
                  {typeof recap.counts?.guardian_emails_updated === 'number' ? (
                    <>
                      {' '}
                      — <em>{recap.counts.guardian_emails_updated}</em> adresse
                      {recap.counts.guardian_emails_updated === 1 ? '' : 's'} de représentant mise
                      {recap.counts.guardian_emails_updated === 1 ? '' : 's'} à jour
                    </>
                  ) : null}
                </div>
                <div className="piw-muted">
                  Vous pouvez compléter les adresses de représentants. Les coupons sont produits pour
                  tous les élèves, que la famille ait une adresse ou non.
                </div>
              </div>

              <div className="piw-blk">
                <h4>Vos documents — par classe</h4>
                <div className="piw-dl">
                  {(docIndex?.classes || []).map((c) => (
                    <div className="piw-dlrow" key={c.class_name}>
                      <span>
                        <b>{c.class_name}</b> · {c.student_count} élève
                        {c.student_count === 1 ? '' : 's'}
                      </span>
                      <span style={{ display: 'flex', gap: 6 }}>
                        {c.coupons_available && recap.nominative_present ? (
                          <button
                            type="button"
                            className="piw-chip btnish"
                            disabled={busy}
                            onClick={() =>
                              void runDownload(() =>
                                downloadRecapCoupons(schoolId, recap.public_token, [c.class_name])
                              )
                            }
                          >
                            ⬇ coupons
                          </button>
                        ) : null}
                        {c.route_sheet_available && recap.nominative_present ? (
                          <button
                            type="button"
                            className="piw-chip btnish"
                            disabled={busy}
                            onClick={() =>
                              void runDownload(() =>
                                downloadRecapRouteSheets(schoolId, recap.public_token, [c.class_name])
                              )
                            }
                          >
                            ⬇ feuille de route
                          </button>
                        ) : null}
                      </span>
                    </div>
                  ))}
                  <div className="piw-dlrow" style={{ background: '#f4f2ec' }}>
                    <span>
                      La note à votre direction <span style={{ color: '#8f8d86' }}>— non nominative</span>
                    </span>
                    <button
                      type="button"
                      className="piw-chip btnish"
                      disabled={busy}
                      onClick={() =>
                        void runDownload(() => downloadRecapDirectionNote(schoolId, recap.public_token))
                      }
                    >
                      ⬇ PDF
                    </button>
                  </div>
                </div>
              </div>

              <div className="piw-blk">
                <h4>La liste nominative</h4>
                <div style={{ fontSize: 10.5, color: '#3f3d38' }}>
                  {recap.nominative_present
                    ? 'Conservée jusqu’à ce que vous l’effaciez.'
                    : 'Liste nominative déjà effacée. La note direction reste disponible.'}
                </div>
                {recap.nominative_present ? (
                  <div style={{ marginTop: 8 }}>
                    <button
                      type="button"
                      className="piw-btn d sm"
                      disabled={busy}
                      onClick={handleEraseNominative}
                    >
                      Effacer le contenu nominatif
                    </button>
                  </div>
                ) : null}
                <div className="piw-muted">On efface la liste, pas les élèves.</div>
              </div>

              <div className="piw-foot">
                <button type="button" className="piw-btn p" onClick={onClose}>
                  Fermer
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ParticipantImportWizardModal;
