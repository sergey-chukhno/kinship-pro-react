import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCatalogue } from '../../api/FormationCatalogue';
import { useAppContext } from '../../context/AppContext';
import { FormationFiche } from '../../types/formationCatalogue';
import { subscribeCatalogue } from '../../utils/formationCatalogueStore';
import './CatalogueFormationsPage.css';

function modalityLabel(m: FormationFiche['modality']): string {
  if (m === 'presentiel') return 'Présentiel';
  if (m === 'distanciel') return 'Distanciel';
  if (m === 'hybride') return 'Hybride';
  return '';
}

const CatalogueFormationsPage: React.FC = () => {
  const navigate = useNavigate();
  const { setCurrentPage } = useAppContext();
  const [fiches, setFiches] = useState<FormationFiche[]>([]);
  const [search, setSearch] = useState('');
  const [school, setSchool] = useState('all');

  const refresh = () => {
    getCatalogue().then(setFiches);
  };

  useEffect(() => {
    refresh();
    return subscribeCatalogue(refresh);
  }, []);

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
    /* Ticket 16 : ouverture de session depuis la fiche. Pas d’annonce d’absence. */
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
        <button
          type="button"
          onClick={() => {
            setCurrentPage('dashboard');
            navigate('/dashboard');
          }}
        >
          ← Tableau de bord
        </button>
        &nbsp;›&nbsp; Catalogue de formations
      </div>
      <h1>Catalogue de formations</h1>
      <p className="catf-who">
        Sélectionnez une formation pour ouvrir une session : programme, modalités d’évaluation et
        jury sont déjà renseignés.
      </p>

      <div className="catf-toolbar">
        <input
          className="catf-search"
          placeholder="🔍 Rechercher par intitulé ou code RNCP / RS"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <span style={{ fontSize: 12, fontWeight: 700 }}>École</span>
        <select
          className="catf-filter"
          value={school}
          onChange={(e) => setSchool(e.target.value)}
        >
          <option value="all">Toutes les écoles</option>
          {schools.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <span className="catf-count">
          {filtered.length} formation{filtered.length > 1 ? 's' : ''}
        </span>
        <div className="catf-actions">
          <button type="button" className="catf-btn s" onClick={openImport}>
            Charger un tableau
          </button>
        </div>
      </div>

      <div className="catf-grid">
        {filtered.map((f) => (
          <article key={f.id} className={`catf-card ${f.euMc ? 'mcue' : ''}`}>
            <div className="hd">
              <span>{f.schoolLabel || f.orgName}</span>
              <span className="cd">{f.certificationCode || ''}</span>
            </div>
            {(f.categoryBand || f.status !== 'catalog') && (
              <div className={`band ${!f.categoryBand || f.status !== 'catalog' ? 'muted' : ''}`}>
                {f.categoryBand || 'Certificat de l’organisme'}
              </div>
            )}
            <div className="ti">{f.title || 'Sans titre'}</div>
            {f.assessmentType && <div className="sub">{f.assessmentType}</div>}
            <div className="pills">
              {f.durationHours && <span className="catf-pp h">{f.durationHours} h</span>}
              {f.jury && <span className="catf-pp">Jury</span>}
            </div>
            {(f.modality || f.financement) && (
              <div className="sub" style={{ paddingTop: 0 }}>
                {[modalityLabel(f.modality), f.financement].filter(Boolean).join(' · ')}
              </div>
            )}
            <div className="catf-prod">
              <span className="pl">Délivre</span>
              {f.euMc ? (
                <span className="catf-pp or">MC UE</span>
              ) : (
                <span className="catf-pp">PF</span>
              )}
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
                <button type="button" className="catf-btn p" onClick={() => openSessionStub(f)}>
                  Ouvrir une session →
                </button>
              ) : f.status === 'draft' ? null : (
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
