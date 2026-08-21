import React from 'react';
import './CloseProjectModal.css';

interface CloseProjectModalProps {
  isOpen: boolean;
  projectTitle: string;
  hasFunders?: boolean;
  isSubmitting?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const CloseProjectModal: React.FC<CloseProjectModalProps> = ({
  isOpen,
  projectTitle,
  hasFunders = false,
  isSubmitting = false,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div className="cp-close-ov" onClick={() => !isSubmitting && onCancel()} role="presentation">
      <div
        className="cp-close-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cp-close-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="cp-close-head">
          <div className="cp-close-ico" aria-hidden>!</div>
          <h2 id="cp-close-title">Clôture définitive du projet</h2>
          <button type="button" className="cp-close-x" onClick={onCancel} aria-label="Fermer">✕</button>
        </div>
        <div className="cp-close-body">
          Vous êtes sur le point de clôturer le projet <b>{projectTitle}</b>.
          <br />
          Cette action est définitive et irréversible.
          <br />
          Une fois clôturé :
          <br />
          <span className="cp-close-born">— Sa Preuve Projet est générée — authentique et vérifiable</span>
          {hasFunders && (
            <>
              <br />
              — Vos financeurs recevront leur rapport
            </>
          )}
          <br />
          — Le projet passe en lecture seule — plus aucune modification possible
          <br />
          — Les membres peuvent toujours le consulter et voir leurs preuves
          <br />
          — Vous pourrez ensuite l’archiver quand vous le souhaitez
          <br />
          Les données du projet sont conservées conformément au registre des traitements RGPD de Kinship.
          <br />
          Confirmez-vous la clôture définitive de ce projet ?
        </div>
        <div className="cp-close-btns">
          <button type="button" className="cp-close-cancel" onClick={onCancel} disabled={isSubmitting}>
            Annuler
          </button>
          <button type="button" className="cp-close-go" onClick={onConfirm} disabled={isSubmitting}>
            {isSubmitting ? 'Clôture…' : 'Confirmer la clôture définitive'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CloseProjectModal;
