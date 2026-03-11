import React, { useEffect, useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { Project } from '../../types';
import { getSchoolProjects, getCompanyProjects } from '../../api/Dashboard';
import { getTeacherProjects } from '../../api/Projects';
import { mapApiProjectToFrontendProject, getOrganizationId } from '../../utils/projectMapper';
import './Modal.css';

interface SelectProjectForBadgeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectProject: (project: Project) => void;
}

/** Returns true if the current user can assign badges in this project (owner or project_member with can_assign_badges_in_project). */
function canAssignBadgesInProject(apiProject: any, currentUserId: string): boolean {
  const uid = currentUserId ? Number(currentUserId) : null;
  if (uid == null) return false;
  if (apiProject.owner_id === uid || apiProject.owner?.id === uid) return true;
  const members = apiProject.project_members || [];
  return members.some((m: any) => {
    const memberUserId = m.user_id ?? m.user?.id;
    return memberUserId === uid && m.can_assign_badges_in_project === true;
  });
}

const SelectProjectForBadgeModal: React.FC<SelectProjectForBadgeModalProps> = ({
  isOpen,
  onClose,
  onSelectProject,
}) => {
  const { state } = useAppContext();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const currentUserId = state.user?.id;
    const showingPageType = state.showingPageType;
    const organizationId = getOrganizationId(state.user, showingPageType);

    setLoading(true);
    setError(null);

    const fetchProjects = async () => {
      try {
        let list: any[] = [];
        if (showingPageType === 'edu' && organizationId) {
          const res = await getSchoolProjects(organizationId, false, 200, 1);
          list = res.data?.data ?? res.data ?? [];
        } else if (showingPageType === 'pro' && organizationId) {
          const res = await getCompanyProjects(organizationId, false, 200, 1);
          list = res.data?.data ?? res.data ?? [];
        } else if (showingPageType === 'teacher') {
          const { data } = await getTeacherProjects({ per_page: 200, page: 1 });
          list = data ?? [];
        } else {
          setProjects([]);
          setLoading(false);
          return;
        }

        const filtered = list.filter((p: any) => canAssignBadgesInProject(p, currentUserId));
        const mapped = filtered.map((p: any) =>
          mapApiProjectToFrontendProject(p, showingPageType, state.user)
        );
        setProjects(mapped);
      } catch (err: any) {
        console.error('Error fetching projects for badge assignment:', err);
        setError(err?.response?.data?.message || err?.message || 'Erreur lors du chargement des projets.');
        setProjects([]);
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();
  }, [isOpen, state.user?.id, state.showingPageType, state.user]);

  if (!isOpen) return null;

  const handleSelect = (project: Project) => {
    onSelectProject(project);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '560px' }}>
        <div className="modal-header">
          <h2>Sélectionner un projet dans lequel vous voulez attribuer un badge</h2>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Fermer">
            <i className="fas fa-times"></i>
          </button>
        </div>
        <div className="modal-body">
          {loading && (
            <p style={{ textAlign: 'center', padding: '1rem', color: '#6b7280' }}>
              Chargement des projets…
            </p>
          )}
          {error && (
            <p style={{ color: '#dc2626', padding: '1rem', margin: 0 }}>{error}</p>
          )}
          {!loading && !error && projects.length === 0 && (
            <p style={{ textAlign: 'center', padding: '1rem', color: '#6b7280' }}>
              Aucun projet dans lequel vous pouvez attribuer un badge.
            </p>
          )}
          {!loading && !error && projects.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '60vh', overflowY: 'auto' }}>
              {projects.map((project) => (
                <button
                  key={project.id}
                  type="button"
                  onClick={() => handleSelect(project)}
                  style={{
                    display: 'block',
                    textAlign: 'left',
                    padding: '0.75rem 1rem',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    background: '#fff',
                    cursor: 'pointer',
                    fontSize: '0.9375rem',
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.background = '#f3f4f6';
                    e.currentTarget.style.borderColor = '#3b82f6';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.background = '#fff';
                    e.currentTarget.style.borderColor = '#e5e7eb';
                  }}
                >
                  <span style={{ fontWeight: 600 }}>{project.title}</span>
                  {project.organization && (
                    <span style={{ display: 'block', fontSize: '0.875rem', color: '#6b7280', marginTop: '0.25rem' }}>
                      {project.organization}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button type="button" className="btn btn-outline" onClick={onClose}>
            Annuler
          </button>
        </div>
      </div>
    </div>
  );
};

export default SelectProjectForBadgeModal;
