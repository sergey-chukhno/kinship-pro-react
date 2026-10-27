import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  analyzeSessionParticipantsImport,
  downloadSessionParticipantsImportTemplate,
  importSessionParticipants,
} from '../../api/FormationSessionParticipantsImport';
import { getFormationSession } from '../../api/FormationSessions';
import { resolveCatalogueOrg } from '../../api/formationCatalogOrg';
import { useAppContext } from '../../context/AppContext';
import type {
  SessionImportAnalyzeResponse,
  SessionImportResponse,
} from '../../types/formationSession';
import {
  cacheFormationSession,
  formatSessionDateFr,
  getSelectedSessionId,
  getSessionById,
  openSessionSpace,
} from '../../utils/formationSessionStore';
import './FormationSessionParticipantsImportPage.css';

function sessionIdFromPath(pathname: string): string | null {
  const from = (p: string) =>
    p.match(/^\/formation-session-import\/([^/]+)\/?$/)?.[1] ?? null;
  return from(pathname) || from(window.location.pathname) || getSelectedSessionId();
}

function formatBirthdayFr(iso: string): string {
  if (!iso) return '—';
  if (iso.includes('/')) return iso;
  return formatSessionDateFr(iso.slice(0, 10));
}

type Phase = 'pick' | 'preview' | 'recap';

const FormationSessionParticipantsImportPage: React.FC = () => {
  const { pathname } = useLocation();
  const sessionId = sessionIdFromPath(pathname);
  const navigate = useNavigate();
  const { state, setCurrentPage } = useAppContext();
  const inputRef = useRef<HTMLInputElement>(null);

  const org = useMemo(
    () => resolveCatalogueOrg(state.user, state.showingPageType),
    [state.user, state.showingPageType]
  );

  const session = sessionId ? getSessionById(sessionId) : undefined;

  const [phase, setPhase] = useState<Phase>('pick');
  const [file, setFile] = useState<File | null>(null);
  const [analyze, setAnalyze] = useState<SessionImportAnalyzeResponse | null>(null);
  const [imported, setImported] = useState<SessionImportResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!sessionId) return;
    if (getSessionById(sessionId)) return;
    getFormationSession(sessionId, org?.name || '', org || null)
      .then((s) => {
        if (s) cacheFormationSession(s);
      })
      .catch(() => undefined);
  }, [sessionId, org?.name, org?.key]);

  const goSpace = () => {
    if (!sessionId) {
      setCurrentPage('catalogue-formations');
      navigate('/catalogue-formations');
      return;
    }
    openSessionSpace(sessionId, 'gestion');
    setCurrentPage('formation-session-space');
    navigate(`/formation-session-space/${sessionId}`);
  };

  const resetPick = () => {
    setPhase('pick');
    setFile(null);
    setAnalyze(null);
    setImported(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  const onFile = async (next: File | null) => {
    setError(null);
    setAnalyze(null);
    setImported(null);
    setFile(next);
    if (!next || !sessionId) return;
    setBusy(true);
    try {
      const result = await analyzeSessionParticipantsImport(sessionId, next, org);
      setAnalyze(result);
      setPhase('preview');
    } catch (e: any) {
      setError(e?.message || 'Analyse impossible.');
      setPhase('pick');
    } finally {
      setBusy(false);
    }
  };

  const downloadTemplate = async () => {
    if (!sessionId) return;
    setError(null);
    try {
      await downloadSessionParticipantsImportTemplate(sessionId);
    } catch (e: any) {
      setError(e?.message || 'Modèle indisponible.');
    }
  };

  const runImport = async () => {
    if (!sessionId || !file || !analyze || analyze.importable_count <= 0) return;
    setBusy(true);
    setError(null);
    try {
      const result = await importSessionParticipants(sessionId, file, org);
      setImported(result);
      setPhase('recap');
      try {
        const refreshed = await getFormationSession(sessionId, org?.name || '', org || null);
        if (refreshed) cacheFormationSession(refreshed);
      } catch {
        /* keep local cache */
      }
    } catch (e: any) {
      setError(e?.message || 'Import impossible.');
    } finally {
      setBusy(false);
    }
  };

  const openFilePicker = () => inputRef.current?.click();

  if (!sessionId) {
    return (
      <div className="spi">
        <div className="spi-shell">
          <div className="spi-inner">
            <p className="spi-sub">Session introuvable.</p>
            <button type="button" className="spi-btn g" onClick={goSpace}>
              Retour
            </button>
          </div>
        </div>
      </div>
    );
  }

  const titleLabel = session?.title || 'Session';
  const remainingPreview =
    analyze && analyze.detected_count > analyze.preview_rows.length
      ? analyze.detected_count - analyze.preview_rows.length
      : 0;

  return (
    <div className="spi">
      <div className="spi-shell">
        <div className="spi-bar">
          <span>Import des participants</span>
          <span>{titleLabel}</span>
        </div>
        <div className="spi-inner">
          {phase === 'pick' && (
            <>
              <h1 className="spi-title">Importer la liste des participants</h1>
              <p className="spi-sub">
                Fichier CSV ou Excel, au format de votre logiciel : les colonnes sont reconnues
                automatiquement.
              </p>
              <button type="button" className="spi-link" onClick={downloadTemplate}>
                ⬇ Télécharger le modèle (CSV)
              </button>
              <p className="spi-hint">
                Colonnes obligatoires : nom, prénom, date de naissance, e-mail. Téléphone
                facultatif.
              </p>
              <button
                type="button"
                className={`spi-drop ${file ? 'has-file' : ''}`}
                onClick={openFilePicker}
                disabled={busy}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  void onFile(e.dataTransfer.files?.[0] || null);
                }}
              >
                📄
                <div>
                  <b>{file ? file.name : 'CSV ou Excel'}</b>
                  <div style={{ fontSize: 9.5, color: '#6d6b64' }}>
                    Cliquez ou déposez le fichier
                  </div>
                </div>
                {busy && <span className="spi-ok">…</span>}
              </button>
              <input
                ref={inputRef}
                type="file"
                accept=".csv,.xlsx,.xls,text/csv"
                className="spi-file-native"
                tabIndex={-1}
                aria-hidden
                onChange={(e) => void onFile(e.target.files?.[0] || null)}
              />
              {error && <div className="spi-err">{error}</div>}
              <div className="spi-foot">
                <button type="button" className="spi-btn g" onClick={goSpace} disabled={busy}>
                  Annuler
                </button>
              </div>
            </>
          )}

          {phase === 'preview' && analyze && file && (
            <>
              <h1 className="spi-title">Importer la liste des participants</h1>
              <p className="spi-sub">
                Vérifiez l’aperçu avant d’inscrire. Rien n’est enregistré tant que vous n’importez
                pas.
              </p>
              <button
                type="button"
                className={`spi-drop has-file ${analyze.importable_count > 0 ? 'ok' : ''}`}
                onClick={openFilePicker}
                disabled={busy}
              >
                📄
                <div>
                  <b>{file.name}</b>
                  <div style={{ fontSize: 9.5, color: '#6d6b64' }}>
                    {analyze.detected_count} participant
                    {analyze.detected_count > 1 ? 's' : ''} détecté
                    {analyze.detected_count > 1 ? 's' : ''}
                  </div>
                </div>
                {analyze.importable_count > 0 ? (
                  <span className="spi-ok">✓ Fichier valide</span>
                ) : (
                  <span className="spi-ok" style={{ color: '#8a6d1a' }}>
                    Aucune ligne importable
                  </span>
                )}
              </button>
              <input
                ref={inputRef}
                type="file"
                accept=".csv,.xlsx,.xls,text/csv"
                className="spi-file-native"
                tabIndex={-1}
                aria-hidden
                onChange={(e) => void onFile(e.target.files?.[0] || null)}
              />

              {analyze.preview_rows.length > 0 && (
                <>
                  <div className="spi-meta">Aperçu</div>
                  <table className="spi-table">
                    <thead>
                      <tr>
                        <th>Nom ✱</th>
                        <th>Prénom ✱</th>
                        <th>Date de naissance ✱</th>
                        <th>E-mail ✱</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analyze.preview_rows.map((row) => {
                        const rowWarnings = (analyze.warnings || []).filter(
                          (w) => w.line === row.line
                        );
                        return (
                          <tr key={`${row.line}-${row.email}`}>
                            <td>{row.last_name}</td>
                            <td>{row.first_name}</td>
                            <td>
                              {formatBirthdayFr(row.birthday)}
                              {rowWarnings.map((w) => (
                                <div key={`${w.line}-${w.code}`} className="spi-warn">
                                  {w.message}
                                </div>
                              ))}
                            </td>
                            <td>{row.email}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {remainingPreview > 0 && (
                    <p className="spi-more">+ {remainingPreview} participants</p>
                  )}
                </>
              )}

              {analyze.reject_preview.length > 0 && (
                <div className="spi-rejects">
                  <h4>Lignes écartées</h4>
                  <ul>
                    {analyze.reject_preview.map((r) => (
                      <li key={`rej-${r.line}-${r.reason_code}`}>
                        Ligne {r.line} — {r.message}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <p className="spi-hint">
                Les participants sont inscrits à la session dès l’import et reçoivent une
                confirmation par e-mail.
              </p>

              {error && <div className="spi-err">{error}</div>}

              <div className="spi-foot">
                <button type="button" className="spi-btn g" onClick={resetPick} disabled={busy}>
                  Changer de fichier
                </button>
                <button
                  type="button"
                  className="spi-btn p"
                  onClick={runImport}
                  disabled={busy || analyze.importable_count <= 0}
                >
                  {busy
                    ? 'Import…'
                    : `Importer les ${analyze.importable_count} participant${
                        analyze.importable_count > 1 ? 's' : ''
                      }`}
                </button>
              </div>
            </>
          )}

          {phase === 'recap' && imported && (
            <>
              <h1 className="spi-title">Import terminé</h1>
              <div className="spi-recap">
                <div className="n">{imported.inscribed_count}</div>
                <div className="l">
                  inscrit{imported.inscribed_count > 1 ? 's' : ''}
                </div>
              </div>

              {imported.rejected.length > 0 && (
                <div className="spi-rejects">
                  <h4>Lignes écartées</h4>
                  <ul>
                    {imported.rejected.map((r) => (
                      <li key={`done-${r.line}-${r.reason_code}`}>
                        Ligne {r.line} — {r.message}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="spi-foot">
                <button type="button" className="spi-btn s" onClick={resetPick}>
                  Importer un autre fichier
                </button>
                <button type="button" className="spi-btn p" onClick={goSpace}>
                  Retour à la session →
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default FormationSessionParticipantsImportPage;
