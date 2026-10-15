import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../../context/AppContext';
import './CatalogueSessionTodoTile.css';

/** Carte « À faire » School/Company — ouvrir une session depuis le catalogue (P4.0). */
const CatalogueSessionTodoTile: React.FC = () => {
  const { setCurrentPage } = useAppContext();
  const navigate = useNavigate();

  const goCatalogue = () => {
    setCurrentPage('catalogue-formations');
    navigate('/catalogue-formations');
  };

  return (
    <section className="cst-section" aria-label="À faire">
      <h3 className="cst-heading">À faire</h3>
      <button type="button" className="cst-card" onClick={goCatalogue}>
        <div className="cst-kicker">Catalogue de formations</div>
        <div className="cst-title">Votre catalogue est prêt</div>
        <div className="cst-sub">
          Choisissez une fiche pour ouvrir une session : programme et modalités déjà renseignés.
        </div>
        <div className="cst-cta">Ouvrir une session →</div>
      </button>
    </section>
  );
};

export default CatalogueSessionTodoTile;
