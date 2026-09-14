import React from 'react';
import { Link } from 'react-router-dom';

/**
 * Legal notice for self-registration (Kinship as data controller).
 * Validated wording — Patrick / DPO, Sep 2026. Do not invent variants.
 */
const SelfRegistrationLegalNotice: React.FC = () => (
  <div className="form-step visible">
    <p>
      Cette application se conforme au Règlement (UE) 2016/679 et à la loi n° 78-17 du 6 janvier 1978
      modifiée.
    </p>
    <p>
      En créant votre compte ici, vous vous inscrivez auprès de KINSHIP SAS, responsable du
      traitement de vos données. Vos données servent à créer et gérer votre compte, et à vous donner
      accès aux fonctions de la plateforme.
    </p>
    <p>
      Vous pouvez exercer vos droits d&apos;accès, de rectification, d&apos;effacement,
      d&apos;opposition et de portabilité auprès de KINSHIP SAS —{' '}
      <a href="mailto:dpo@kinshipedu.fr">dpo@kinshipedu.fr</a>, et introduire une réclamation auprès
      de la <a href="https://www.cnil.fr/fr">CNIL</a>, autorité de contrôle.
    </p>
    <p>
      Plus de détails :{' '}
      <Link to="/privacy-policy">Politique de protection des données de Kinship</Link>.
    </p>
  </div>
);

export default SelfRegistrationLegalNotice;
