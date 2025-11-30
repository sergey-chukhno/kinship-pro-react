import React from 'react';
import './Modal.css';

interface SubscriptionRequiredModalProps {
  onClose: () => void;
  featureName?: string;
}

const SubscriptionRequiredModal: React.FC<SubscriptionRequiredModalProps> = ({
  onClose,
  featureName = 'cette fonctionnalité'
}) => {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Fonctionnalité Premium</h2>
          <button className="modal-close" onClick={onClose}>
            <i className="fas fa-times"></i>
          </button>
        </div>

        <div className="modal-body">
          <div style={{ 
            textAlign: 'center', 
            padding: '2rem',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '1.5rem'
          }}>
            <div style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '2.5rem',
              color: 'white',
              marginBottom: '1rem'
            }}>
              <i className="fas fa-crown"></i>
            </div>
            
            <h3 style={{ 
              fontSize: '1.5rem', 
              fontWeight: 600, 
              color: '#1f2937',
              margin: 0
            }}>
              Disponible avec un abonnement Découverte
            </h3>
            
            <p style={{ 
              fontSize: '1rem', 
              color: '#6b7280',
              lineHeight: '1.6',
              maxWidth: '400px',
              margin: 0
            }}>
              {featureName} est disponible avec un abonnement Découverte. 
              Passez à un abonnement pour accéder à cette fonctionnalité et bien plus encore.
            </p>
          </div>
        </div>

        <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
          <button 
            type="button" 
            className="btn btn-outline" 
            onClick={onClose}
          >
            Fermer
          </button>
          {/* <button 
            type="button" 
            className="btn btn-primary" 
            onClick={() => {
              // TODO: Rediriger vers la page d'abonnement
              console.log('Rediriger vers la page d\'abonnement');
              onClose();
            }}
          >
            <i className="fas fa-arrow-right"></i>
            Voir les abonnements
          </button> */}
        </div>
      </div>
    </div>
  );
};

export default SubscriptionRequiredModal;

