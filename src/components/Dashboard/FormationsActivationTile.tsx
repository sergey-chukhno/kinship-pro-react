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

  if (status === 'activated') {
    return (
      <button type="button" className="fat-tile fat-on" onClick={goFormations} title="Voir Formations">
        <div className="fat-value">{count}</div>
        <div className="fat-label">Formations</div>
      </button>
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
