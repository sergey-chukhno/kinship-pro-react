import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../../context/AppContext';
import { getFormations } from '../../utils/formationStore';
import {
  getOfActivationStatus,
  subscribeOfActivation,
} from '../../utils/ofActivationStore';
import './FormationsActivationTile.css';

const FormationsActivationTile: React.FC = () => {
  const { setCurrentPage, setShowingPageType } = useAppContext();
  const navigate = useNavigate();
  const [status, setStatus] = useState(() => getOfActivationStatus());
  const count = getFormations().filter((f) => f.status !== 'archived').length;

  useEffect(() => subscribeOfActivation(() => setStatus(getOfActivationStatus())), []);

  const goActivation = () => {
    setCurrentPage('of-activation');
    navigate('/of-activation');
  };

  const goFormations = () => {
    if (status === 'activated') {
      localStorage.setItem('selectedPageType', 'of');
      localStorage.setItem('selectedContextType', 'formation');
      localStorage.setItem('selectedContextId', 'of-demo');
      setShowingPageType('of');
    }
    setCurrentPage('formations');
    navigate('/formations');
  };

  const goCatalogue = () => {
    if (status === 'activated') {
      localStorage.setItem('selectedPageType', 'of');
      localStorage.setItem('selectedContextType', 'formation');
      localStorage.setItem('selectedContextId', 'of-demo');
      setShowingPageType('of');
    }
    setCurrentPage('catalogue-formations');
    navigate('/catalogue-formations');
  };

  if (status === 'activated') {
    return (
      <div className="fat-activated-row" style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <button
          type="button"
          className="stat-card2 stat-card-clickable"
          onClick={goCatalogue}
          title="Catalogue de formations"
        >
          <div className="stat-icon">
            <img src="/icons_logo/Icon=Projet grand.svg" alt="Catalogue" />
          </div>
          <div className="stat-content">
            <div className="stat-value">📚</div>
            <div className="stat-label2">Catalogue</div>
          </div>
        </button>
        <button
          type="button"
          className="stat-card2 stat-card-clickable"
          onClick={goFormations}
          title="Sessions"
        >
          <div className="stat-icon">
            <img src="/icons_logo/Icon=Projet grand.svg" alt="Sessions" />
          </div>
          <div className="stat-content">
            <div className="stat-value">{count}</div>
            <div className="stat-label2">Sessions</div>
          </div>
        </button>
      </div>
    );
  }

  if (status === 'submitted' || status === 'verifying') {
    return (
      <button type="button" className="fat-tile fat-pending" onClick={goActivation}>
        <div className="fat-title">FORMATIONS</div>
        <div className="fat-sub">● Validation en cours — 48 h ouvrées</div>
        <div className="fat-cta">Suivre mon dossier →</div>
      </button>
    );
  }

  if (status === 'rejected') {
    return (
      <button type="button" className="fat-tile fat-reject" onClick={goActivation}>
        <div className="fat-title">FORMATIONS</div>
        <div className="fat-sub">votre dossier n’a pas pu être validé</div>
        <div className="fat-cta">Corriger mon dossier →</div>
      </button>
    );
  }

  return (
    <button type="button" className="fat-tile fat-idle" onClick={goActivation}>
      <div className="fat-title">FORMATIONS</div>
      <div className="fat-sub">réservé aux organismes vérifiés et agréés</div>
      <div className="fat-cta">Vérifier mon organisme →</div>
    </button>
  );
};

export default FormationsActivationTile;
