import React from 'react';

interface ClassProjectListItemProps {
  project: any;
  variant: 'classic' | 'mlds';
  onClick: () => void;
}

const statusLabel = (status: string) => {
  if (status === 'draft') return 'Brouillon';
  if (status === 'coming') return 'À venir';
  if (status === 'in_progress') return 'En cours';
  return 'Terminé';
};

const statusColors = (status: string) => {
  if (status === 'in_progress') return { bg: '#dcfce7', color: '#15803d' };
  if (status === 'ended') return { bg: '#f3f4f6', color: '#4b5563' };
  if (status === 'coming') return { bg: '#fef3c7', color: '#92400e' };
  return { bg: '#e0e7ff', color: '#3730a3' };
};

const ClassProjectListItem: React.FC<ClassProjectListItemProps> = ({ project, variant, onClick }) => {
  const colors = statusColors(project.status);

  return (
    <div
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      style={{
        border: '1px solid #e5e7eb',
        borderRadius: '0.5rem',
        padding: '1rem',
        backgroundColor: '#ffffff',
        cursor: 'pointer',
        transition: 'all 0.2s',
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)';
        e.currentTarget.style.borderColor = '#3b82f6';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = '0 1px 3px 0 rgba(0, 0, 0, 0.1)';
        e.currentTarget.style.borderColor = '#e5e7eb';
      }}
      onClick={onClick}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.75rem' }}>
        <div style={{ flex: 1 }}>
          <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 600, color: '#111827' }}>
            {project.title}
          </h3>
          {variant === 'mlds' && project.mlds_information?.requested_by && (
            <span
              style={{
                display: 'inline-block',
                marginTop: '0.5rem',
                padding: '0.25rem 0.75rem',
                backgroundColor: '#dbeafe',
                color: '#1e40af',
                borderRadius: '9999px',
                fontSize: '0.75rem',
                fontWeight: 500,
              }}
            >
              {project.mlds_information.requested_by === 'departement' ? 'Département' : 'Réseau foquale'}
            </span>
          )}
        </div>
        <span
          style={{
            padding: '0.25rem 0.75rem',
            borderRadius: '0.375rem',
            fontSize: '0.75rem',
            fontWeight: 600,
            backgroundColor: colors.bg,
            color: colors.color,
          }}
        >
          {statusLabel(project.status)}
        </span>
      </div>

      {project.description && (
        <p
          style={{
            margin: '0.75rem 0',
            color: '#6b7280',
            fontSize: '0.875rem',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {project.description}
        </p>
      )}

      <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.75rem', fontSize: '0.875rem', color: '#6b7280' }}>
        {project.start_date && project.end_date && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
            <i className="fas fa-calendar" />
            <span>
              {new Date(project.start_date).toLocaleDateString('fr-FR')} -{' '}
              {new Date(project.end_date).toLocaleDateString('fr-FR')}
            </span>
          </div>
        )}
        {variant === 'mlds' && project.mlds_information?.expected_participants && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
            <i className="fas fa-users" />
            <span>{project.mlds_information.expected_participants} participants prévus</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default ClassProjectListItem;
