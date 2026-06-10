import React from 'react';
import { Link } from 'react-router-dom';
import './CartographyVerifyLink.css';

interface CartographyVerifyLinkProps {
  className?: string;
}

/** Lien vers la page publique /verify depuis une cartographie */
const CartographyVerifyLink: React.FC<CartographyVerifyLinkProps> = ({ className = '' }) => (
  <Link to="/verify" className={`cartography-verify-link ${className}`.trim()}>
    <i className="fas fa-shield-halved" aria-hidden />
    Vérifier une preuve
  </Link>
);

export default CartographyVerifyLink;
