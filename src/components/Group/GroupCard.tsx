import React from 'react';
import './GroupCard.css';

export type GroupCardData = {
  id: number;
  name: string;
  createdAt: string;
  createdByName?: string;
  membersCount?: number;
};

type Props = {
  group: GroupCardData;
  onClick?: () => void;
  onEdit?: (e: React.MouseEvent) => void;
  onDelete?: (e: React.MouseEvent) => void;
};

const GroupCard: React.FC<Props> = ({ group, onClick, onEdit, onDelete }) => {
  const handleCardClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.group-card-action-btn')) return;
    onClick?.();
  };

  const createdAtDisplay = (() => {
    if (!group.createdAt) return '';
    const d = new Date(group.createdAt);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleDateString('fr-FR');
  })();

  return (
    <div className="group-card" onClick={handleCardClick} style={{ cursor: onClick ? 'pointer' : 'default' }}>
      <div className="group-card-header">
        <div className="group-card-title">
          <i className="fas fa-layer-group" />
          <h4>{group.name}</h4>
        </div>
        {(onEdit || onDelete) && (
          <div className="group-card-actions">
            {onEdit && (
              <button
                className="group-card-action-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(e);
                }}
                title="Modifier le groupe"
              >
                <i className="fas fa-edit" />
              </button>
            )}
            {onDelete && (
              <button
                className="group-card-action-btn danger"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(e);
                }}
                title="Supprimer le groupe"
              >
                <i className="fas fa-trash" />
              </button>
            )}
          </div>
        )}
      </div>
      <div className="group-card-body">
        <p>
          <strong>Créé par :</strong> {group.createdByName || '—'}
        </p>
        <p>
          <strong>Créé le :</strong> {createdAtDisplay || '—'}
        </p>
        {typeof group.membersCount === 'number' && (
          <p>
            <strong>Membres :</strong> {group.membersCount}
          </p>
        )}
      </div>
    </div>
  );
};

export default GroupCard;

