import React from 'react';
import './CartographyIssuerCard.css';

export interface CartographyIssuerCardProps {
  acronym: string;
  title: string;
  subtitle: string;
  statusLabel: string;
  color: string;
  lightAcronymText?: boolean;
  onClick?: () => void;
}

const CartographyIssuerCard: React.FC<CartographyIssuerCardProps> = ({
  acronym,
  title,
  subtitle,
  statusLabel,
  color,
  lightAcronymText = false,
  onClick,
}) => {
  const CardTag = onClick ? 'button' : 'article';

  return (
    <CardTag
      type={onClick ? 'button' : undefined}
      className={`cartography-issuer-card${onClick ? ' cartography-issuer-card--interactive' : ''}`}
      style={{ '--issuer-color': color } as React.CSSProperties}
      onClick={onClick}
    >
      <div className="cartography-issuer-card__accent" aria-hidden />
      <div
        className={`cartography-issuer-card__circle${lightAcronymText ? ' cartography-issuer-card__circle--light' : ''}`}
      >
        <span className="cartography-issuer-card__acronym">{acronym}</span>
      </div>
      <h3 className="cartography-issuer-card__title">{title}</h3>
      <p className="cartography-issuer-card__subtitle">{subtitle}</p>
      <span className="cartography-issuer-card__status">{statusLabel}</span>
    </CardTag>
  );
};

export default CartographyIssuerCard;
