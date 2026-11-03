import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../../context/AppContext';
import './CatalogueSessionTodoTile.css';

/** Carte « À faire » School/Company — copy P4.0. */
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
      <button type="button" className="cst-card" onClick={goCatalogue} style={{ ['--c' as string]: '#115E59' }}>
        <div className="cst-kicker">Votre catalogue</div>
        <div className="cst-title">Ouvrir une session</div>
        <div className="cst-sub">
          Choisissez une formation dans votre catalogue : dates, formateur responsable, participants.
        </div>
        <div className="cst-cta">Ouvrir une session →</div>
      </button>
    </section>
  );
};

export default CatalogueSessionTodoTile;
