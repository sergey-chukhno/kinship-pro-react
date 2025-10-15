import React from 'react';
import './RolePill.css';

interface RolePillProps {
  role: string;
  color: string;
  onClick?: (e: React.MouseEvent) => void;
  isDropdown?: boolean;
}

const RolePill: React.FC<RolePillProps> = ({ role, color, onClick, isDropdown = false }) => {
  return (
    <span
      className={`role-pill ${color} ${isDropdown ? 'dropdown' : ''}`}
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
    >
      {role}
      {isDropdown && <i className="fas fa-chevron-down"></i>}
    </span>
  );
};

export default RolePill;
