import React from 'react';
import './DeletedUserDisplay.css';
import { displayPersonName } from '../../utils/civilDataErased';

interface DeletedUserDisplayProps {
  user: {
    full_name?: string;
    first_name?: string;
    last_name?: string;
    email?: string;
    is_deleted?: boolean;
  };
  showEmail?: boolean;
  className?: string;
}

const DeletedUserDisplay: React.FC<DeletedUserDisplayProps> = ({ 
  user, 
  showEmail = true,
  className = '' 
}) => {
  const displayName = displayPersonName(user.full_name, user.first_name, user.last_name, 'Utilisateur supprimé');

  return (
    <div className={`deleted-user-display ${className}`}>
      <i className="fas fa-user-slash deleted-icon" title="Utilisateur supprimé"></i>
      <span className="deleted-user-name">{displayName}</span>
      {showEmail && user.email && (
        <span className="deleted-user-email">{user.email}</span>
      )}
    </div>
  );
};

export default DeletedUserDisplay;




