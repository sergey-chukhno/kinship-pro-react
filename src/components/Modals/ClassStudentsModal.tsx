import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { getLevelStudents, getSchoolLevel } from '../../api/SchoolDashboard/Levels';
import { fetchAllLevelMldsProjects } from '../../utils/mldsProjectFetch';
import { splitClassLevelProjects } from '../../utils/mldsProjectFilters';
import { getCurrentUser } from '../../api/Authentication';
import { getTeacherClassStudents, getTeacherClass } from '../../api/Dashboard';
import { useToast } from '../../hooks/useToast';
import { useAppContext } from '../../context/AppContext';
import { mapApiProjectToFrontendProject } from '../../utils/projectMapper';
import { getSelectedSchoolId } from '../../utils/contextUtils';
import { ClassModalProjectsTab } from '../../types';
import ClassProjectListItem from './ClassProjectListItem';
import './Modal.css';
import QRCodePrintModal from './QRCodePrintModal';
import AvatarImage from '../UI/AvatarImage';

const loaderStyles = `
  @keyframes spinLoader {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }
  
  .loader-spin {
    animation: spinLoader 1s linear infinite;
  }
  
  .loader-pulse {
    animation: pulse 1.5s ease-in-out infinite;
  }
`;

type ClassModalTab = 'students' | ClassModalProjectsTab;

interface Student {
  id: number;
  first_name: string;
  last_name: string;
  full_name?: string;
  email?: string;
  avatar_url?: string;
  birthday?: string;
  role_in_system?: string;
  claim_token?: string;
  has_temporary_email?: boolean;
  status?: string;
}

interface ClassStudentsModalProps {
  onClose: () => void;
  levelId: number;
  levelName: string;
  initialTab?: ClassModalTab;
  onStudentDetails?: (student: Student) => void;
}

const tabButtonStyle = (isActive: boolean): React.CSSProperties => ({
  padding: '0.75rem 1rem',
  border: 'none',
  background: 'none',
  cursor: 'pointer',
  borderBottom: isActive ? '2px solid #3b82f6' : '2px solid transparent',
  color: isActive ? '#3b82f6' : '#6b7280',
  fontWeight: isActive ? 600 : 400,
  transition: 'all 0.2s',
});

const ProjectsLoading = () => (
  <div className="flex flex-col justify-center items-center py-12 min-h-[300px]">
    <div className="relative mb-6 w-20 h-20">
      <div className="absolute inset-0 rounded-full border-4 border-gray-200" />
      <div
        className="absolute inset-0 rounded-full border-4 border-t-transparent loader-spin"
        style={{ borderColor: '#3b82f6 transparent transparent transparent' }}
      />
      <div className="flex absolute inset-0 justify-center items-center">
        <i className="text-2xl text-blue-500 fas fa-project-diagram loader-pulse" />
      </div>
    </div>
    <p className="mt-2 text-lg font-semibold text-gray-700">Chargement des projets...</p>
    <p className="mt-1 text-sm text-gray-500">Veuillez patienter quelques instants</p>
  </div>
);

const ClassStudentsModal: React.FC<ClassStudentsModalProps> = ({
  onClose,
  levelId,
  levelName,
  initialTab,
  onStudentDetails,
}) => {
  const {
    state,
    setCurrentPage: navigateToPage,
    setSelectedProject,
    setClassModalReturn,
  } = useAppContext();
  const isTeacherContext = state.showingPageType === 'teacher';
  const { showError } = useToast();
  const showErrorRef = useRef(showError);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [qrStudent, setQrStudent] = useState<Student | null>(null);
  const [teachers, setTeachers] = useState<
    Array<{ id: number; full_name: string; email: string; is_creator: boolean }>
  >([]);
  const [allClassProjects, setAllClassProjects] = useState<any[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [activeTab, setActiveTab] = useState<ClassModalTab>(initialTab ?? 'students');
  const observerTargetRef = useRef<HTMLDivElement>(null);
  const perPage = 20;

  const { classic: classicProjects, mlds: mldsProjects } = useMemo(
    () => splitClassLevelProjects(allClassProjects),
    [allClassProjects]
  );

  useEffect(() => {
    showErrorRef.current = showError;
  }, [showError]);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab, levelId]);

  const fetchClassProjects = useCallback(async () => {
    if (!levelId) return;

    setLoadingProjects(true);
    try {
      const projects = await fetchAllLevelMldsProjects(levelId);
      setAllClassProjects(projects);
    } catch (error) {
      console.error('Erreur lors de la récupération des projets de la classe:', error);
      setAllClassProjects([]);
    } finally {
      setLoadingProjects(false);
    }
  }, [levelId]);

  const handleOpenProject = useCallback(
    (project: any, projectsTab: ClassModalProjectsTab) => {
      const mappedProject = mapApiProjectToFrontendProject(project, state.showingPageType, state.user);
      setClassModalReturn({
        levelId,
        levelName,
        activeTab: projectsTab,
      });
      setSelectedProject(mappedProject);
      navigateToPage('project-management');
    },
    [levelId, levelName, navigateToPage, setClassModalReturn, setSelectedProject, state.showingPageType, state.user]
  );

  const fetchStudents = useCallback(
    async (page: number, append: boolean = false) => {
      if (!levelId) return;

      const loadingState = append ? setIsLoadingMore : setLoading;
      loadingState(true);

      try {
        let studentsResponse;
        let classResponse;
        let schoolId: number | null = null;

        if (isTeacherContext) {
          [studentsResponse, classResponse] = await Promise.all([
            getTeacherClassStudents(levelId, page, perPage),
            getTeacherClass(levelId),
          ]);
        } else {
          const currentUser = await getCurrentUser();
          schoolId = getSelectedSchoolId(currentUser.data, state.showingPageType);

          if (!schoolId) {
            showErrorRef.current("Impossible de récupérer l'identifiant de l'école");
            return;
          }

          [studentsResponse, classResponse] = await Promise.all([
            getLevelStudents(Number(schoolId), levelId, page, perPage),
            getSchoolLevel(Number(schoolId), levelId),
          ]);
        }

        let studentsData: Student[] = [];
        if (studentsResponse.data?.data) {
          studentsData = studentsResponse.data.data;
        } else if (Array.isArray(studentsResponse.data)) {
          studentsData = studentsResponse.data;
        }

        const meta = studentsResponse.data?.meta || {};
        const totalPages = meta.total_pages || 1;
        const total = meta.total_count || studentsData.length;

        if (append) {
          setStudents((prev) => {
            const existingIds = new Set(prev.map((s) => s.id));
            const newStudents = studentsData.filter((s: Student) => !existingIds.has(s.id));
            return [...prev, ...newStudents];
          });
        } else {
          setStudents(Array.isArray(studentsData) ? studentsData : []);
        }

        if (!append) {
          const classData = classResponse.data?.data ?? classResponse.data ?? {};
          setTeachers(classData.teachers || []);
        }

        setTotalCount(total);
        setHasMore(page < totalPages);
        setCurrentPage(page);
      } catch (error) {
        console.error('Erreur lors de la récupération des données:', error);
        showErrorRef.current('Impossible de récupérer les données de la classe');
        setHasMore(false);
      } finally {
        loadingState(false);
      }
    },
    [levelId, isTeacherContext, perPage, state.showingPageType]
  );

  useEffect(() => {
    setStudents([]);
    setCurrentPage(1);
    setHasMore(true);
    setTotalCount(0);
    setAllClassProjects([]);
    fetchStudents(1, false);
    fetchClassProjects();
  }, [levelId, fetchStudents, fetchClassProjects]);

  useEffect(() => {
    if (!hasMore || loading || isLoadingMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoadingMore) {
          fetchStudents(currentPage + 1, true);
        }
      },
      { threshold: 0.1 }
    );

    const target = observerTargetRef.current;
    if (target) {
      observer.observe(target);
    }

    return () => {
      if (target) {
        observer.unobserve(target);
      }
    };
  }, [hasMore, loading, isLoadingMore, currentPage, fetchStudents]);

  const renderProjectList = (projects: any[], variant: 'classic' | 'mlds', tab: ClassModalProjectsTab) => {
    if (loadingProjects) {
      return <ProjectsLoading />;
    }
    if (projects.length === 0) {
      return (
        <div className="py-8 text-center">
          <i className="mb-4 text-5xl text-gray-400 fas fa-project-diagram" />
          <p className="text-lg text-gray-500">
            {variant === 'mlds'
              ? 'Aucun projet MLDS pour cette classe'
              : 'Aucun projet classique pour cette classe'}
          </p>
        </div>
      );
    }
    return (
      <div style={{ maxHeight: '60vh', overflowY: 'auto', padding: '0 1rem' }}>
        <div style={{ display: 'grid', gap: '1rem' }}>
          {projects.map((project: any) => (
            <ClassProjectListItem
              key={project.id}
              project={project}
              variant={variant}
              onClick={() => handleOpenProject(project, tab)}
            />
          ))}
        </div>
      </div>
    );
  };

  const footerProjectsLabel = () => {
    if (loadingProjects) {
      return (
        <span className="flex gap-2 items-center">
          <i className="fas fa-spinner fa-spin" />
          Chargement...
        </span>
      );
    }
    if (activeTab === 'classic-projects') {
      return (
        <span>
          {classicProjects.length} projet{classicProjects.length !== 1 ? 's' : ''} classique
          {classicProjects.length !== 1 ? 's' : ''}
        </span>
      );
    }
    return (
      <span>
        {mldsProjects.length} projet{mldsProjects.length !== 1 ? 's' : ''} MLDS
      </span>
    );
  };

  return (
    <>
      <style>{loaderStyles}</style>
      <div className="modal-overlay" onClick={onClose}>
        <div className="max-w-4xl modal-content" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <div>
              <h2>{levelName}</h2>
              {teachers.length > 0 && (
                <p style={{ marginTop: '8px', fontSize: '0.9rem', color: '#6b7280' }}>
                  <strong>Responsable{teachers.length > 1 ? 's' : ''} :</strong>{' '}
                  {teachers.map((t) => t.full_name).join(', ')}
                </p>
              )}
            </div>
            <button className="modal-close" onClick={onClose}>
              <i className="fas fa-times" />
            </button>
          </div>

          <div
            style={{
              display: 'flex',
              gap: '1rem',
              borderBottom: '1px solid #e5e7eb',
              padding: '0 1.5rem',
              marginBottom: '1rem',
              flexWrap: 'wrap',
            }}
          >
            <button type="button" style={tabButtonStyle(activeTab === 'students')} onClick={() => setActiveTab('students')}>
              <i className="fas fa-users" style={{ marginRight: '0.5rem' }} />
              Élèves ({totalCount})
            </button>
            <button
              type="button"
              style={tabButtonStyle(activeTab === 'classic-projects')}
              onClick={() => setActiveTab('classic-projects')}
            >
              <i className="fas fa-folder-open" style={{ marginRight: '0.5rem' }} />
              Projets classiques ({classicProjects.length})
            </button>
            <button
              type="button"
              style={tabButtonStyle(activeTab === 'mlds-projects')}
              onClick={() => setActiveTab('mlds-projects')}
            >
              <i className="fas fa-project-diagram" style={{ marginRight: '0.5rem' }} />
              Projets MLDS ({mldsProjects.length})
            </button>
          </div>

          <div className="modal-body">
            {activeTab === 'students' ? (
              loading ? (
                <div className="flex flex-col justify-center items-center py-12 min-h-[300px]">
                  <div className="relative mb-6 w-20 h-20">
                    <div className="absolute inset-0 rounded-full border-4 border-gray-200" />
                    <div
                      className="absolute inset-0 rounded-full border-4 border-t-transparent loader-spin"
                      style={{ borderColor: '#3b82f6 transparent transparent transparent' }}
                    />
                    <div className="flex absolute inset-0 justify-center items-center">
                      <i className="text-2xl text-blue-500 fas fa-users loader-pulse" />
                    </div>
                  </div>
                  <p className="mt-2 text-lg font-semibold text-gray-700">Chargement des élèves...</p>
                  <p className="mt-1 text-sm text-gray-500">Veuillez patienter quelques instants</p>
                </div>
              ) : students.length === 0 ? (
                <div className="py-8 text-center">
                  <i className="mb-4 text-5xl text-gray-400 fas fa-users" />
                  <p className="text-lg text-gray-500">Aucun élève dans cette classe</p>
                </div>
              ) : (
                <div className="users-table class-students-table" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
                  <div className="table-header class-students-header">
                    <div className="table-cell">Élèves</div>
                  </div>

                  {students
                    .filter((student, index, self) =>
                      student.id
                        ? index === self.findIndex((s) => s.id === student.id)
                        : index === self.findIndex((s) => !s.id && s === student)
                    )
                    .map((student, index) => (
                      <div key={student.id || `student-${index}`} className="table-row class-students-row">
                        <div className="table-cell class-students-cell">
                          <div className="user-info class-students-user-info">
                            <AvatarImage
                              src={student.avatar_url}
                              alt={student.full_name}
                              className="user-avatar class-students-avatar"
                            />
                            <span className="class-students-name">
                              {student.full_name || `${student.first_name} ${student.last_name}`}
                            </span>
                            {student.birthday && (
                              <span className="class-students-birthday">
                                <i className="fas fa-birthday-cake" />
                                {new Date(student.birthday).toLocaleDateString('fr-FR')}
                              </span>
                            )}
                            <div className="class-students-actions-spacer" />
                            <div className="action-buttons class-students-action-buttons">
                              <button
                                type="button"
                                className="btn-icon"
                                title="Afficher le QR Code"
                                onClick={() => {
                                  if (!student.claim_token) {
                                    showError('Pas de QR code disponible pour cet élève');
                                    return;
                                  }
                                  setQrStudent(student);
                                }}
                              >
                                <i className="fas fa-qrcode" />
                              </button>
                              <button
                                type="button"
                                className="btn-icon"
                                title="Voir les détails"
                                onClick={() => onStudentDetails?.(student)}
                              >
                                <i className="fas fa-eye" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}

                  {hasMore && (
                    <div
                      ref={observerTargetRef}
                      style={{
                        height: '20px',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        padding: '10px',
                      }}
                    >
                      {isLoadingMore && (
                        <div className="flex gap-2 items-center text-gray-500">
                          <i className="fas fa-spinner fa-spin" />
                          <span className="text-sm">Chargement...</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            ) : activeTab === 'classic-projects' ? (
              renderProjectList(classicProjects, 'classic', 'classic-projects')
            ) : (
              renderProjectList(mldsProjects, 'mlds', 'mlds-projects')
            )}
          </div>

          <div className="modal-footer">
            <div className="flex justify-between items-center w-full">
              <span className="text-sm text-gray-600">
                {activeTab === 'students' ? (
                  loading ? (
                    <span className="flex gap-2 items-center">
                      <i className="fas fa-spinner fa-spin" />
                      Chargement...
                    </span>
                  ) : (
                    <span>
                      {totalCount > 0 ? `${students.length} / ${totalCount}` : students.length} élève
                      {totalCount !== 1 && totalCount > 0 ? 's' : students.length !== 1 ? 's' : ''}
                    </span>
                  )
                ) : (
                  footerProjectsLabel()
                )}
              </span>
              <button type="button" className="btn btn-outline" onClick={onClose}>
                Fermer
              </button>
            </div>
          </div>
        </div>
      </div>

      {qrStudent && qrStudent.claim_token && (
        <QRCodePrintModal
          onClose={() => setQrStudent(null)}
          claimToken={qrStudent.claim_token}
          studentName={qrStudent.full_name || `${qrStudent.first_name} ${qrStudent.last_name}`}
        />
      )}
    </>
  );
};

export default ClassStudentsModal;
