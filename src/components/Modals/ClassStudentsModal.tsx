import React, { useState, useEffect, useRef, useCallback } from 'react';
import { getLevelStudents, getSchoolLevel, getLevelMLDSProjects } from '../../api/SchoolDashboard/Levels';
import { getCurrentUser } from '../../api/Authentication';
import { getTeacherClassStudents, getTeacherClass } from '../../api/Dashboard';
import { useToast } from '../../hooks/useToast';
import { useAppContext } from '../../context/AppContext';
import { mapApiProjectToFrontendProject } from '../../utils/projectMapper';
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
  onStudentDetails?: (student: Student) => void;
}

const ClassStudentsModal: React.FC<ClassStudentsModalProps> = ({
  onClose,
  levelId,
  levelName,
  onStudentDetails
}) => {
  const { state, setCurrentPage: navigateToPage, setSelectedProject } = useAppContext();
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
  const [teachers, setTeachers] = useState<Array<{ id: number; full_name: string; email: string; is_creator: boolean }>>([]);
  const [mldsProjects, setMldsProjects] = useState<any[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [activeTab, setActiveTab] = useState<'students' | 'projects'>('students');
  const observerTargetRef = useRef<HTMLDivElement>(null);
  const perPage = 20;

  // Keep showError ref updated
  useEffect(() => {
    showErrorRef.current = showError;
  }, [showError]);

  // Fetch MLDS projects for this class
  const fetchMLDSProjects = useCallback(async () => {
    if (!levelId) return;
    
    setLoadingProjects(true);
    try {
      const response = await getLevelMLDSProjects(levelId);
      const projectsData = response.data?.data || response.data || [];
      setMldsProjects(Array.isArray(projectsData) ? projectsData : []);
    } catch (error) {
      console.error('Erreur lors de la récupération des projets MLDS:', error);
      // Don't show error toast, just log it
      setMldsProjects([]);
    } finally {
      setLoadingProjects(false);
    }
  }, [levelId]);

  const fetchStudents = useCallback(async (page: number, append: boolean = false) => {
    if (!levelId) return;
    
    const loadingState = append ? setIsLoadingMore : setLoading;
    loadingState(true);
    
    try {
      let studentsResponse;
      let classResponse;
      let schoolId: number | null = null;
      
      if (isTeacherContext) {
        // Pour les teachers, utiliser l'API teachers/classes
        [studentsResponse, classResponse] = await Promise.all([
          getTeacherClassStudents(levelId, page, perPage),
          getTeacherClass(levelId)
        ]);
      } else {
        // Pour les admins d'école, utiliser l'API schools/levels
        const currentUser = await getCurrentUser();
        schoolId = currentUser.data?.available_contexts?.schools?.[0]?.id;

        if (!schoolId) {
          showErrorRef.current("Impossible de récupérer l'identifiant de l'école");
          return;
        }

        [studentsResponse, classResponse] = await Promise.all([
          getLevelStudents(Number(schoolId), levelId, page, perPage),
          getSchoolLevel(Number(schoolId), levelId)
        ]);
      }
      
      // Handle different response structures
      let studentsData: Student[] = [];
      if (studentsResponse.data?.data) {
        studentsData = studentsResponse.data.data;
      } else if (Array.isArray(studentsResponse.data)) {
        studentsData = studentsResponse.data;
      } else if (studentsResponse.data) {
        studentsData = [];
      }
      
      const meta = studentsResponse.data?.meta || {};
      const totalPages = meta.total_pages || 1;
      const total = meta.total_count || studentsData.length;
      
      if (append) {
        // Append to existing students, avoiding duplicates
        setStudents(prev => {
          const existingIds = new Set(prev.map(s => s.id));
          const newStudents = studentsData.filter((s: Student) => !existingIds.has(s.id));
          return [...prev, ...newStudents];
        });
      } else {
        setStudents(Array.isArray(studentsData) ? studentsData : []);
      }
      
      // Set teachers only on first load
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
  }, [levelId, isTeacherContext, perPage]);

  // Initial load
  useEffect(() => {
    setStudents([]);
    setCurrentPage(1);
    setHasMore(true);
    setTotalCount(0);
    fetchStudents(1, false);
    fetchMLDSProjects();
  }, [levelId, fetchStudents, fetchMLDSProjects]);

  // Infinite scroll observer
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
                  <strong>Responsable{teachers.length > 1 ? 's' : ''} :</strong> {teachers.map(t => t.full_name).join(', ')}
                </p>
              )}
            </div>
            <button className="modal-close" onClick={onClose}>
              <i className="fas fa-times"></i>
            </button>
          </div>

          {/* Tabs */}
          <div style={{ 
            display: 'flex', 
            gap: '1rem', 
            borderBottom: '1px solid #e5e7eb', 
            padding: '0 1.5rem',
            marginBottom: '1rem'
          }}>
            <button
              style={{
                padding: '0.75rem 1rem',
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                borderBottom: activeTab === 'students' ? '2px solid #3b82f6' : '2px solid transparent',
                color: activeTab === 'students' ? '#3b82f6' : '#6b7280',
                fontWeight: activeTab === 'students' ? 600 : 400,
                transition: 'all 0.2s'
              }}
              onClick={() => setActiveTab('students')}
            >
              <i className="fas fa-users" style={{ marginRight: '0.5rem' }}></i>
              Élèves ({totalCount})
            </button>
            <button
              style={{
                padding: '0.75rem 1rem',
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                borderBottom: activeTab === 'projects' ? '2px solid #3b82f6' : '2px solid transparent',
                color: activeTab === 'projects' ? '#3b82f6' : '#6b7280',
                fontWeight: activeTab === 'projects' ? 600 : 400,
                transition: 'all 0.2s'
              }}
              onClick={() => setActiveTab('projects')}
            >
              <i className="fas fa-project-diagram" style={{ marginRight: '0.5rem' }}></i>
              Projets MLDS ({mldsProjects.length})
            </button>
          </div>

          <div className="modal-body">
            {activeTab === 'students' ? (
              loading ? (
                <div className="flex flex-col justify-center items-center py-12 min-h-[300px]">
                  <div className="relative mb-6 w-20 h-20">
                    <div className="absolute inset-0 rounded-full border-4 border-gray-200"></div>
                    <div 
                      className="absolute inset-0 rounded-full border-4 border-t-transparent loader-spin"
                      style={{ borderColor: '#3b82f6 transparent transparent transparent' }}
                    ></div>
                    <div className="flex absolute inset-0 justify-center items-center">
                      <i className="text-2xl text-blue-500 fas fa-users loader-pulse"></i>
                    </div>
                  </div>
                  <p className="mt-2 text-lg font-semibold text-gray-700">Chargement des élèves...</p>
                  <p className="mt-1 text-sm text-gray-500">Veuillez patienter quelques instants</p>
                </div>
              ) : students.length === 0 ? (
                <div className="py-8 text-center">
                  <i className="mb-4 text-5xl text-gray-400 fas fa-users"></i>
                  <p className="text-lg text-gray-500">Aucun élève dans cette classe</p>
                </div>
              ) : (
              <div className="users-table class-students-table" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
                <div className="table-header class-students-header">
                  <div className="table-cell">Élèves</div>
                </div>

                {students
                  .filter((student, index, self) => 
                    // Remove duplicates based on id, or use index if id is missing
                    student.id ? 
                      index === self.findIndex(s => s.id === student.id) :
                      index === self.findIndex(s => !s.id && s === student)
                  )
                  .map((student, index) => (
                  <div key={student.id || `student-${index}`} className="table-row class-students-row">
                    <div className="table-cell class-students-cell">
                      <div className="user-info class-students-user-info">
                        <AvatarImage src={student.avatar_url} alt={student.full_name} className="user-avatar class-students-avatar" />
                        <span className="class-students-name">{student.full_name || `${student.first_name} ${student.last_name}`}</span>
                        {student.birthday && (
                          <span className="class-students-birthday">
                            <i className="fas fa-birthday-cake"></i>
                            {new Date(student.birthday).toLocaleDateString('fr-FR')}
                          </span>
                        )}
                        <div className="class-students-actions-spacer"></div>
                        <div className="action-buttons class-students-action-buttons">
                          <button
                            className="btn-icon"
                            title="Afficher le QR Code"
                            onClick={() => {
                              if (!student.claim_token) {
                                console.log('Student:', student);
                                showError("Pas de QR code disponible pour cet élève");
                                return;
                              }
                              setQrStudent(student);
                            }}
                          >
                            <i className="fas fa-qrcode"></i>
                          </button>
                          <button
                            className="btn-icon"
                            title="Voir les détails"
                            onClick={() => onStudentDetails?.(student)}
                          >
                            <i className="fas fa-eye"></i>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                
                {/* Infinite scroll trigger */}
                {hasMore && (
                  <div ref={observerTargetRef} style={{ height: '20px', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '10px' }}>
                    {isLoadingMore && (
                      <div className="flex gap-2 items-center text-gray-500">
                        <i className="fas fa-spinner fa-spin"></i>
                        <span className="text-sm">Chargement...</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
              )
            ) : (
              // Tab Projets MLDS
              loadingProjects ? (
                <div className="flex flex-col justify-center items-center py-12 min-h-[300px]">
                  <div className="relative mb-6 w-20 h-20">
                    <div className="absolute inset-0 rounded-full border-4 border-gray-200"></div>
                    <div 
                      className="absolute inset-0 rounded-full border-4 border-t-transparent loader-spin"
                      style={{ borderColor: '#3b82f6 transparent transparent transparent' }}
                    ></div>
                    <div className="flex absolute inset-0 justify-center items-center">
                      <i className="text-2xl text-blue-500 fas fa-project-diagram loader-pulse"></i>
                    </div>
                  </div>
                  <p className="mt-2 text-lg font-semibold text-gray-700">Chargement des projets...</p>
                  <p className="mt-1 text-sm text-gray-500">Veuillez patienter quelques instants</p>
                </div>
              ) : mldsProjects.length === 0 ? (
                <div className="py-8 text-center">
                  <i className="mb-4 text-5xl text-gray-400 fas fa-project-diagram"></i>
                  <p className="text-lg text-gray-500">Aucun projet MLDS pour cette classe</p>
                </div>
              ) : (
                <div style={{ maxHeight: '60vh', overflowY: 'auto', padding: '0 1rem' }}>
                  <div style={{ display: 'grid', gap: '1rem' }}>
                    {mldsProjects.map((project: any) => (
                      <div 
                        key={project.id} 
                        style={{
                          border: '1px solid #e5e7eb',
                          borderRadius: '0.5rem',
                          padding: '1rem',
                          backgroundColor: '#ffffff',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)';
                          e.currentTarget.style.borderColor = '#3b82f6';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.boxShadow = '0 1px 3px 0 rgba(0, 0, 0, 0.1)';
                          e.currentTarget.style.borderColor = '#e5e7eb';
                        }}
                        onClick={() => {
                          // Map API project to frontend format
                          const mappedProject = mapApiProjectToFrontendProject(project, state.showingPageType, state.user);
                          // Set selected project and navigate
                          setSelectedProject(mappedProject);
                          navigateToPage('project-management');
                          // Close the modal
                          onClose();
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.75rem' }}>
                          <div style={{ flex: 1 }}>
                            <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 600, color: '#111827' }}>
                              {project.title}
                            </h3>
                            {project.mlds_information?.requested_by && (
                              <span style={{
                                display: 'inline-block',
                                marginTop: '0.5rem',
                                padding: '0.25rem 0.75rem',
                                backgroundColor: '#dbeafe',
                                color: '#1e40af',
                                borderRadius: '9999px',
                                fontSize: '0.75rem',
                                fontWeight: 500
                              }}>
                                {project.mlds_information.requested_by === 'departement' ? 'Département' : 'Réseau foquale'}
                              </span>
                            )}
                          </div>
                          <span style={{
                            padding: '0.25rem 0.75rem',
                            borderRadius: '0.375rem',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            backgroundColor: project.status === 'in_progress' ? '#dcfce7' : 
                                           project.status === 'ended' ? '#f3f4f6' : 
                                           project.status === 'coming' ? '#fef3c7' : '#e0e7ff',
                            color: project.status === 'in_progress' ? '#15803d' : 
                                   project.status === 'ended' ? '#4b5563' : 
                                   project.status === 'coming' ? '#92400e' : '#3730a3'
                          }}>
                            {project.status === 'draft' ? 'Brouillon' : 
                             project.status === 'coming' ? 'À venir' : 
                             project.status === 'in_progress' ? 'En cours' : 'Terminé'}
                          </span>
                        </div>
                        
                        {project.description && (
                          <p style={{ 
                            margin: '0.75rem 0', 
                            color: '#6b7280', 
                            fontSize: '0.875rem',
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden'
                          }}>
                            {project.description}
                          </p>
                        )}
                        
                        <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.75rem', fontSize: '0.875rem', color: '#6b7280' }}>
                          {project.start_date && project.end_date && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                              <i className="fas fa-calendar"></i>
                              <span>{new Date(project.start_date).toLocaleDateString('fr-FR')} - {new Date(project.end_date).toLocaleDateString('fr-FR')}</span>
                            </div>
                          )}
                          {project.mlds_information?.expected_participants && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                              <i className="fas fa-users"></i>
                              <span>{project.mlds_information.expected_participants} participants prévus</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            )}
          </div>

        <div className="modal-footer">
          <div className="flex justify-between items-center w-full">
            <span className="text-sm text-gray-600">
              {activeTab === 'students' ? (
                loading ? (
                  <span className="flex gap-2 items-center">
                    <i className="fas fa-spinner fa-spin"></i>
                    Chargement...
                  </span>
                ) : (
                  <span>
                    {totalCount > 0 ? `${students.length} / ${totalCount}` : students.length} élève{totalCount !== 1 && totalCount > 0 ? 's' : students.length !== 1 ? 's' : ''}
                  </span>
                )
              ) : (
                loadingProjects ? (
                  <span className="flex gap-2 items-center">
                    <i className="fas fa-spinner fa-spin"></i>
                    Chargement...
                  </span>
                ) : (
                  <span>
                    {mldsProjects.length} projet{mldsProjects.length !== 1 ? 's' : ''} MLDS
                  </span>
                )
              )}
            </span>
            <button className="btn btn-outline" onClick={onClose}>
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

