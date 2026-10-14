import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CATALOGUE_CSV_TEMPLATE,
  commitCatalogueImport,
  previewCatalogueUpload,
} from '../../api/FormationCatalogue';
import { useAppContext } from '../../context/AppContext';
import { CatalogueImportPreview } from '../../types/formationCatalogue';
import './CatalogueImportPage.css';

const PENDING_KEY = 'kinship.catalogueImport.pending';

const CatalogueImportPage: React.FC = () => {
  const navigate = useNavigate();
  const { setCurrentPage, state } = useAppContext();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<CatalogueImportPreview | null>(null);
  const [busy, setBusy] = useState(false);
  const [pendingWarn, setPendingWarn] = useState<string | null>(null);

  const orgName =
    state.user?.available_contexts?.formation_organizations?.[0]?.name ||
    'Skolae — CFPJ';
  const orgInitials = orgName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(PENDING_KEY);
      if (raw) {
        const p = JSON.parse(raw) as { at?: string; fileName?: string };
        if (p.at) {
          const d = new Date(p.at);
          const label = Number.isNaN(d.getTime())
            ? 'récemment'
            : d.toLocaleString('fr-FR', {
                day: '2-digit',
                month: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
              });
          setPendingWarn(
            `Un tableau chargé ${label}${p.fileName ? ` (« ${p.fileName} »)` : ''} n’a pas été validé. Ce nouveau chargement le remplace.`
          );
        }
      }
    } catch {
      /* ignore */
    }
  }, []);

  const goCatalogue = () => {
    setCurrentPage('catalogue-formations');
    navigate('/catalogue-formations');
  };

  const downloadTemplate = () => {
    const blob = new Blob([CATALOGUE_CSV_TEMPLATE], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'modele_catalogue_formations.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const onFile = (next: File | null) => {
    setError(null);
    setPreview(null);
    setFile(next);
    if (next) {
      sessionStorage.setItem(
        PENDING_KEY,
        JSON.stringify({ at: new Date().toISOString(), fileName: next.name })
      );
    }
  };

  const verify = async () => {
    setError(null);
    if (!file) {
      setError('Choisissez un fichier Excel ou CSV.');
      return;
    }
    setBusy(true);
    try {
      const result = await previewCatalogueUpload(file);
      setPreview(result);
    } catch (e: any) {
      setError(e?.message || 'Fichier illisible.');
      setPreview(null);
    } finally {
      setBusy(false);
    }
  };

  const commit = async () => {
    if (!preview) return;
    setBusy(true);
    try {
      await commitCatalogueImport(preview, {
        key: 'of-import',
        name: orgName,
        initials: orgInitials || 'OF',
      });
      sessionStorage.removeItem(PENDING_KEY);
      goCatalogue();
    } finally {
      setBusy(false);
    }
  };

  const showRows = preview?.rows.slice(0, 6) || [];

  const formatDuration = (raw: string) => {
    const t = (raw || '').trim();
    if (!t) return '';
    if (/\bh\b/i.test(t) || /heure/i.test(t)) return t;
    return `${t} h`;
  };

  const openFilePicker = () => inputRef.current?.click();

  return (
    <div className="cimp">
      <div className="cimp-shell">
        <div className="cimp-bar">
          <span>Charger un tableau</span>
          <span />
        </div>
        <div className="cimp-inner">
          {!preview ? (
            <>
              <h1 className="cimp-title">Charger un tableau de formations</h1>
              <p className="cimp-sub">
                Une ligne par formation. Rien n’est enregistré avant votre validation.
              </p>
              <button type="button" className="cimp-link" onClick={downloadTemplate}>
                ⬇ Télécharger le modèle (Excel, CSV)
              </button>
              <div className="cimp-hint" style={{ marginBottom: 10 }}>
                Colonnes obligatoires : titre, description, programme, durée en heures, modalité,
                financement
              </div>
              {pendingWarn && (
                <div className="cimp-warn" style={{ marginBottom: 10 }}>
                  ⚠ <div>{pendingWarn}</div>
                </div>
              )}
              <div className="cimp-field">
                <label>Organisation</label>
                <div className="cimp-in" style={{ display: 'inline-block' }}>
                  {orgName}
                </div>
                <div className="cimp-hint">
                  Si votre tableau a une colonne « Organisation », elle l’emporte, ligne par ligne.
                </div>
              </div>
              <button
                type="button"
                className={`cimp-drop ${file ? 'has-file' : ''}`}
                onClick={openFilePicker}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onFile(e.dataTransfer.files?.[0] || null);
                }}
              >
                📄
                <div>
                  <b>{file ? file.name : 'Excel ou CSV'}</b>
                  <div style={{ fontSize: 9.5, color: '#6d6b64' }}>
                    Une ligne par formation — cliquez ou déposez
                  </div>
                </div>
                {file && <span className="cimp-ok">✓</span>}
              </button>
              <input
                ref={inputRef}
                type="file"
                accept=".csv,.xlsx,.xls,text/csv"
                className="cimp-file-native"
                tabIndex={-1}
                aria-hidden
                onChange={(e) => onFile(e.target.files?.[0] || null)}
              />
              {error && (
                <div className="cimp-refus">
                  <b>{error}</b>
                </div>
              )}
              <div className="cimp-foot">
                <button type="button" className="cimp-btn g" onClick={goCatalogue}>
                  Annuler
                </button>
                <button
                  type="button"
                  className="cimp-btn p"
                  onClick={verify}
                  disabled={!file || busy}
                >
                  Vérifier le tableau →
                </button>
              </div>
            </>
          ) : (
            <>
              <h1 className="cimp-title">Vérifiez avant de valider</h1>
              <p className="cimp-sub">Rien n’est encore enregistré.</p>
              <div className="cimp-found">
                <b>J’ai trouvé :</b> {preview.columnsFound.join(' · ') || '—'}
                <br />
                {preview.columnsIgnored.length > 0 && (
                  <span style={{ color: '#8f8d86' }}>
                    Colonnes non lues : {preview.columnsIgnored.join(', ')}.
                  </span>
                )}
                {preview.rncpColumnIgnored && (
                  <>
                    <br />
                    <span style={{ color: '#8f8d86' }}>
                      Colonne « Code RNCP/RS » : non lue (registre fermé).
                    </span>
                  </>
                )}
              </div>
              <div className="cimp-cnt">
                <div>
                  <div className="n">{preview.counts.read}</div>
                  <div className="l">lignes lues</div>
                </div>
                <div className="ok">
                  <div className="n">{preview.counts.catalog}</div>
                  <div className="l">au catalogue</div>
                </div>
                <div className="br">
                  <div className="n">{preview.counts.draft}</div>
                  <div className="l">brouillons</div>
                </div>
                <div className="no">
                  <div className="n">{preview.counts.rejected}</div>
                  <div className="l">non créées</div>
                </div>
              </div>
              <table className="cimp-table">
                <thead>
                  <tr>
                    <th>Titre</th>
                    <th>Durée</th>
                    <th>Modalité · Financement</th>
                    <th>État</th>
                  </tr>
                </thead>
                <tbody>
                  {showRows.map((r) => (
                    <tr key={r.line}>
                      <td>{r.title}</td>
                      <td>{formatDuration(r.durationHours)}</td>
                      <td>
                        {r.modality} · {r.financement}
                        {r.orgName ? (
                          <div style={{ fontSize: 9, color: '#8f8d86' }}>{r.orgName}</div>
                        ) : null}
                      </td>
                      <td>
                        <span
                          className={`cimp-st ${
                            r.state === 'catalog' ? 'ok' : r.state === 'draft' ? 'br' : 'no'
                          }`}
                        >
                          {r.state === 'catalog'
                            ? 'Au catalogue'
                            : r.state === 'draft'
                              ? 'Brouillon'
                              : 'Non créée'}
                        </span>
                        {r.detail && (
                          <div style={{ fontSize: 9, color: '#8a5a00', marginTop: 2 }}>{r.detail}</div>
                        )}
                      </td>
                    </tr>
                  ))}
                  {preview.rows.length > showRows.length && (
                    <tr>
                      <td colSpan={4} style={{ color: '#8f8d86' }}>
                        + {preview.rows.length - showRows.length} lignes
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
              <div className="cimp-hint" style={{ marginBottom: 10 }}>
                Les brouillons se complètent ensuite, fiche par fiche. Une ligne non créée se corrige
                dans le tableau, ou à la main.
              </div>
              <div className="cimp-foot">
                <button
                  type="button"
                  className="cimp-btn g"
                  onClick={() => {
                    setPreview(null);
                    setError(null);
                  }}
                >
                  Retour
                </button>
                <button
                  type="button"
                  className="cimp-btn p"
                  disabled={busy || preview.counts.catalog + preview.counts.draft === 0}
                  onClick={commit}
                >
                  Valider — {preview.counts.catalog + preview.counts.draft} formation
                  {preview.counts.catalog + preview.counts.draft > 1 ? 's' : ''}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default CatalogueImportPage;
