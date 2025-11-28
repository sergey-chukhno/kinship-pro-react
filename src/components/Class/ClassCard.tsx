import React from 'react';
import './ClassCard.css';

interface ClassCardProps {
  name: string;
  teacher: string;
  studentCount: number;
  level?: string;
  teachers?: Array<{ id: number; full_name: string; email: string; is_creator: boolean }>;
  onClick?: () => void;
  onDelete?: (e: React.MouseEvent) => void;
  onEdit?: (e: React.MouseEvent) => void;
}

const ClassCard: React.FC<ClassCardProps> = ({ name, teacher, studentCount, level, teachers, onClick, onDelete, onEdit }) => {
  const handleCardClick = (e: React.MouseEvent) => {
    // Ne pas déclencher onClick si on clique sur les boutons d'action
    if ((e.target as HTMLElement).closest('.class-card-action-btn')) {
      return;
    }
    onClick?.();
  };

  return (
    <div className="class-card" onClick={handleCardClick} style={{ cursor: onClick ? 'pointer' : 'default', position: 'relative' }}>
      {(onEdit || onDelete) && (
        <div style={{
          position: 'absolute',
          top: '8px',
          right: '8px',
          display: 'flex',
          gap: '4px'
        }}>
          {onEdit && (
            <button
              className="class-card-action-btn"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(e);
              }}
              title="Modifier la classe"
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                padding: '4px 8px',
                borderRadius: '4px',
                color: '#3b82f6',
                fontSize: '16px',
                transition: 'background-color 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#dbeafe';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <i className="fas fa-edit"></i>
            </button>
          )}
          {onDelete && (
            <button
              className="class-card-action-btn"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(e);
              }}
              title="Supprimer la classe"
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                padding: '4px 8px',
                borderRadius: '4px',
                color: '#ef4444',
                fontSize: '16px',
                transition: 'background-color 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#fee2e2';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <i className="fas fa-trash"></i>
            </button>
          )}
        </div>
      )}
      <div className="class-card-header">
        {/* <img src="/icons_logo/Icon=Class.svg" alt="Classe" className="class-icon" /> */}
        <i className="fas fa-school"></i>
        <h4>{name}</h4>
      </div>
      <div className="class-card-body">
        <p><strong>Niveau :</strong> {level}</p>
        {teachers && teachers.length > 0 && (
          <p><strong>Responsable{teachers.length > 1 ? 's' : ''} :</strong> {teachers.map(t => t.full_name).join(', ')}</p>
        )}
        <p><strong>Étudiants :</strong> {studentCount}</p>
      </div>
    </div>
  );
};

export default ClassCard;
