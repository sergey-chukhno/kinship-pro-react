import React from 'react';
import './PublicProjectInfo.css';

const NotFoundPage: React.FC = () => {
  return (
    <div className="public-project-info-page" style={{ minHeight: '100vh', padding: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
      <img src="/Kinship_logo.png" alt="Kinship" style={{ width: '160px', height: '40px', objectFit: 'contain', marginBottom: '1.5rem' }} />
      <h2 style={{ marginBottom: '0.5rem' }}>Lien introuvable</h2>
      <p style={{ color: '#6b7280', maxWidth: 560 }}>
        Ce lien n’est plus valide ou n’est pas accessible.
      </p>
    </div>
  );
};

export default NotFoundPage;

