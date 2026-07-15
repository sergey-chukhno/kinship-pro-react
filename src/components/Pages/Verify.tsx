import React from 'react';
import './Verify.css';

const Verify: React.FC = () => {
  return (
    <div className="verify-page">
      <img
        src="/Kinship_logo.png"
        alt="Kinship"
        className="verify-logo"
      />
      <p className="verify-message">
        La vérification publique des preuves Kinship ouvre à la rentrée 2026.
      </p>
    </div>
  );
};

export default Verify;
