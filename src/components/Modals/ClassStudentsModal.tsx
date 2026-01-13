import React, { useState, useEffect, useRef, useCallback } from 'react';
import { getLevelStudents, getSchoolLevel } from '../../api/SchoolDashboard/Levels';
import { getCurrentUser } from '../../api/Authentication';
import { getTeacherClassStudents, getTeacherClass } from '../../api/Dashboard';
import { useToast } from '../../hooks/useToast';
import { useAppContext } from '../../context/AppContext';
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
  const { state } = useAppContext();
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
  const observerTargetRef = useRef<HTMLDivElement>(null);
  const perPage = 20;

  // Keep showError ref updated
  useEffect(() => {
    showErrorRef.current = showError;
  }, [showError]);

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
  }, [levelId, fetchStudents]);

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
              <h2>Élèves - {levelName}</h2>
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

          <div className="modal-body">
            {loading ? (
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
                      <div className="flex items-center gap-2 text-gray-500">
                        <i className="fas fa-spinner fa-spin"></i>
                        <span className="text-sm">Chargement...</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

        <div className="modal-footer">
          <div className="flex justify-between items-center w-full">
            <span className="text-sm text-gray-600">
              {loading ? (
                <span className="flex gap-2 items-center">
                  <i className="fas fa-spinner fa-spin"></i>
                  Chargement...
                </span>
              ) : (
                <span>
                  {totalCount > 0 ? `${students.length} / ${totalCount}` : students.length} élève{totalCount !== 1 && totalCount > 0 ? 's' : students.length !== 1 ? 's' : ''}
                </span>
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

