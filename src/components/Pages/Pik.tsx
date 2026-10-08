import React from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAppContext } from '../../context/AppContext';
import { isProofCategory, isProofDocumentType, PROOF_CATEGORIES } from '../../data/proofCategories';
import PikIdentity from './PikIdentity';
import PikProofCategoryList from './PikProofCategoryList';
import PikProofDetail from './PikProofDetail';
import './Pik.css';

const CATEGORY_PATH_RE = /^\/pik\/preuves\/([^/]+)$/;
const DETAIL_PATH_RE = /^\/pik\/preuve\/([^/]+)\/([^/]+)$/;

const CATEGORY_SIDEBAR: Record<
  string,
  { icon: string; subtitle: string; iconClass?: string }
> = {
  projet: { icon: '📁', subtitle: 'Preuves projet (PP)' },
  badge: { icon: '🏅', subtitle: 'Compétence (PB)', iconClass: 'pik-sidebar-icon-proof' },
  evenement: { icon: '📅', subtitle: 'Événement (PE)', iconClass: 'pik-sidebar-icon-proof' },
  parcours: { icon: '🛤️', subtitle: 'Parcours (PA) · Formations (PF)' },
};

const Pik: React.FC = () => {
  const { setCurrentPage } = useAppContext();
  const navigate = useNavigate();
  const location = useLocation();

  const categoryMatch = location.pathname.match(CATEGORY_PATH_RE);
  const detailMatch = location.pathname.match(DETAIL_PATH_RE);

  const categorySlug = categoryMatch?.[1];
  const documentType = detailMatch?.[1];
  const proofToken = detailMatch?.[2];

  const renderMain = () => {
    if (documentType && proofToken && isProofDocumentType(documentType)) {
      return <PikProofDetail documentType={documentType} token={proofToken} />;
    }

    if (categorySlug && isProofCategory(categorySlug)) {
      return <PikProofCategoryList category={categorySlug} />;
    }

    return <PikIdentity />;
  };

  return (
    <section className="pik-layout">
      <div className="dashboard-back-link-wrap">
        <button
          type="button"
          className="dashboard-back-link"
          onClick={() => {
            setCurrentPage('dashboard');
            navigate('/dashboard');
          }}
        >
          ← Vers mon tableau de bord
        </button>
      </div>

      <div className="pik-layout-body">
        <aside className="pik-sidebar">
          <div className="pik-sidebar-title">Mes preuves Kinship</div>

          <nav className="pik-sidebar-nav">
            <NavLink
              to="/pik"
              end
              className={({ isActive }) =>
                `pik-sidebar-item ${isActive ? 'pik-sidebar-item-active' : ''}`
              }
            >
              <span className="pik-sidebar-icon" aria-hidden="true">🔑</span>
              <span>
                <span className="pik-sidebar-item-label">Mon identité Kinship</span>
                <span className="pik-sidebar-item-sub">Votre clé PIK</span>
              </span>
            </NavLink>

            <div className="pik-sidebar-section">Mes preuves</div>

            {PROOF_CATEGORIES.map((category) => {
              const sidebar = CATEGORY_SIDEBAR[category.slug];
              return (
              <NavLink
                key={category.slug}
                to={`/pik/preuves/${category.slug}`}
                className={({ isActive }) =>
                  `pik-sidebar-item ${isActive ? 'pik-sidebar-item-active' : ''}`
                }
              >
                <span
                  className={`pik-sidebar-icon ${sidebar?.iconClass ?? ''}`.trim()}
                  aria-hidden="true"
                >
                  {sidebar?.icon}
                </span>
                <span>
                  <span className="pik-sidebar-item-label">{category.label}</span>
                  <span className="pik-sidebar-item-sub">{sidebar?.subtitle}</span>
                </span>
              </NavLink>
              );
            })}
          </nav>
        </aside>

        <main className="pik-main pik-main-wide">{renderMain()}</main>
      </div>
    </section>
  );
};

export default Pik;
