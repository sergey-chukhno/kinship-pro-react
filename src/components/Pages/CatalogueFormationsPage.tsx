import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  deleteCatalogueFiche,
  getCatalogue,
  withdrawCatalogueFiche,
} from '../../api/FormationCatalogue';
import { resolveCatalogueOrg } from '../../api/formationCatalogOrg';
import { useAppContext } from '../../context/AppContext';
import { FormationFiche } from '../../types/formationCatalogue';
import './CatalogueFormationsPage.css';

function modalityLabel(m: FormationFiche['modality']): string {
  if (m === 'presentiel') return 'Présentiel';
  if (m === 'distanciel') return 'Distanciel';
  if (m === 'hybride') return 'Hybride';
  return '';
}

const CatalogueFormationsPage: React.FC = () => {
  const navigate = useNavigate();
  const { setCurrentPage, state } = useAppContext();
  const [fiches, setFiches] = useState<FormationFiche[]>([]);
  const [search, setSearch] = useState('');
  const [school, setSchool] = useState('all');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const org = useMemo(
    () => resolveCatalogueOrg(state.user, state.showingPageType),
    [state.user, state.showingPageType]
  );

  const refresh = useCallback(() => {
    if (!org) {
      setFiches([]);
      setLoading(false);
      setError('Choisissez une école ou une entreprise (contexte School / Company).');
      return;
    }
    setLoading(true);
    setError(null);
    getCatalogue(org)
      .then(setFiches)
      .catch((e) => setError(e?.message || 'Catalogue indisponible.'))
      .finally(() => setLoading(false));
  }, [org]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const schools = useMemo(() => {
    const set = new Set(fiches.map((f) => f.schoolLabel || f.orgName));
    return Array.from(set).sort();
  }, [fiches]);

  const filtered = fiches.filter((f) => {
    const q = search.trim().toLowerCase();
    const matchQ =
      !q ||
      f.title.toLowerCase().includes(q) ||
      (f.certificationCode || '').toLowerCase().includes(q);
    const matchSchool = school === 'all' || (f.schoolLabel || f.orgName) === school;
    return matchQ && matchSchool;
  });

  const openFiche = (f: FormationFiche) => {
    setCurrentPage('formation-fiche');
    navigate(`/formation-fiche/${f.id}`);
  };

  const openSessionStub = (_f: FormationFiche) => {
    /* Ticket 16 */
  };

  const withdraw = async (f: FormationFiche) => {
    try {
      await withdrawCatalogueFiche(f.id);
      refresh();
    } catch (e: any) {
      setError(e?.message || 'Retrait impossible.');
    }
  };

  const removeDraft = async (f: FormationFiche) => {
    try {
      await deleteCatalogueFiche(f.id);
      refresh();
    } catch (e: any) {
      setError(e?.message || 'Suppression impossible.');
    }
  };

  const createFiche = () => {
    setCurrentPage('create');
    navigate('/create?type=formation');
  };

  const openImport = () => {
    setCurrentPage('catalogue-import');
    navigate('/catalogue-import');
  };

  return (
    <div className="catf">
      <div className="catf-crumb">
        <button type="button" onClick={() => { setCurrentPage('dashboard'); navigate('/dashboard'); }}>
          Tableau de bord
        </button>
        <span>›</span>
        <span>Catalogue de formations</span>
      </div>
      <div className="catf-head">
        <div>
          <h1>Catalogue de formations</h1>
          <p>
            Choisissez une formation pour ouvrir une session : programmes et modalités d’évaluation déjà
            renseignés.
          </p>
        </div>
        <button type="button" className="catf-btn p" onClick={openImport}>
          Charger un tableau
        </button>
      </div>
      <div className="catf-filters">
        <input
          type="search"
          placeholder="Rechercher par intitulé ou code RNCP / RS"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select value={school} onChange={(e) => setSchool(e.target.value)}>
          <option value="all">Toutes les écoles</option>
          {schools.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <span className="catf-count">{filtered.length} formation{filtered.length > 1 ? 's' : ''}</span>
      </div>

      {error && <div className="catf-err">{error}</div>}
      {loading && <p className="catf-sub">Chargement…</p>}

      <div className="catf-grid">
        {filtered.map((f) => (
          <article key={f.id} className={`catf-card ${f.euMc ? 'mcue' : ''}`}>
            <div className="catf-top">
              <span>{f.orgName}</span>
              {f.certificationCode && <span>{f.certificationCode}</span>}
            </div>
            <div className="catf-band">
              {f.categoryBand || 'Certificat de l’organisme'}
            </div>
            {f.imageDataUrl ? (
              <div className="catf-media">
                <img src={f.imageDataUrl} alt="" />
              </div>
            ) : null}
            <h2 className="catf-title">{f.title || 'Sans titre'}</h2>
            {f.description && <p className="catf-desc">{f.description.slice(0, 80)}</p>}
            <div className="catf-pills">
              {f.durationHours && <span className="catf-pp h">{f.durationHours} h</span>}
              {f.jury && <span className="catf-pp">Jury</span>}
            </div>
            {(f.modality || f.financement) && (
              <div className="catf-meta">
                {[modalityLabel(f.modality), f.financement].filter(Boolean).join(' · ')}
              </div>
            )}
            <div className="catf-prod">
              <span className="pl">Délivre</span>
              {f.euMc ? <span className="catf-pp or">MC UE</span> : <span className="catf-pp">PF</span>}
              {f.certificationCode && <span className="catf-pp">PC</span>}
            </div>
            {f.status === 'catalog' && (
              <button type="button" className="catf-fl" onClick={() => openFiche(f)}>
                La fiche →
              </button>
            )}
            <div className="catf-sess">
              {f.status === 'catalog' ? null : f.status === 'draft' ? (
                <>
                  <span className="catf-st brouillon">Brouillon</span>
                  <span>à compléter</span>
                  <button type="button" className="catf-sess-link" onClick={() => openFiche(f)}>
                    Reprendre la fiche →
                  </button>
                </>
              ) : (
                <>
                  <span className="catf-st retiree">Retirée du catalogue</span>
                  <button type="button" className="catf-sess-link" onClick={() => openFiche(f)}>
                    La fiche →
                  </button>
                </>
              )}
            </div>
            <div className="catf-act">
              {f.status === 'catalog' ? (
                <>
                  <button type="button" className="catf-btn p" onClick={() => openSessionStub(f)}>
                    Ouvrir une session →
                  </button>
                  <button type="button" className="catf-btn s" onClick={() => withdraw(f)}>
                    Retirer du catalogue
                  </button>
                </>
              ) : f.status === 'draft' ? (
                <button type="button" className="catf-btn s" onClick={() => removeDraft(f)}>
                  Supprimer le brouillon
                </button>
              ) : (
                <button type="button" className="catf-btn s" onClick={() => openFiche(f)}>
                  La fiche →
                </button>
              )}
            </div>
          </article>
        ))}
      </div>

      <div className="catf-more">
        Formation absente du catalogue&nbsp;?{' '}
        <button type="button" onClick={createFiche}>
          <b>Créer une formation →</b>
        </button>
      </div>
    </div>
  );
};

export default CatalogueFormationsPage;
