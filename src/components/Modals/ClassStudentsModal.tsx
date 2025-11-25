import React, { useState, useEffect } from 'react';
import { getLevelStudents } from '../../api/SchoolDashboard/Levels';
import { getCurrentUser } from '../../api/Authentication';
import { useToast } from '../../hooks/useToast';
import './Modal.css';
import QRCodePrintModal from './QRCodePrintModal';

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
  const { showError } = useToast();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [qrStudent, setQrStudent] = useState<Student | null>(null);

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        setLoading(true);
        const currentUser = await getCurrentUser();
        const schoolId = currentUser.data?.available_contexts?.schools?.[0]?.id;

        if (!schoolId) {
          showError("Impossible de récupérer l'identifiant de l'école");
          return;
        }

        const response = await getLevelStudents(Number(schoolId), levelId);
        const studentsData = response.data?.data ?? response.data ?? [];
        
        console.log('Students data:', studentsData);
        setStudents(Array.isArray(studentsData) ? studentsData : []);
      } catch (error) {
        console.error('Erreur lors de la récupération des élèves:', error);
        showError('Impossible de récupérer la liste des élèves');
      } finally {
        setLoading(false);
      }
    };

    fetchStudents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [levelId]);

  const getInitials = (firstName: string = '', lastName: string = '') => {
    const first = firstName ? firstName.charAt(0) : '';
    const last = lastName ? lastName.charAt(0) : '';
    const initials = `${first}${last}`.trim();
    return initials ? initials.toUpperCase() : '?';
  };

  return (
    <>
      <style>{loaderStyles}</style>
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content max-w-4xl" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h2>Élèves - {levelName}</h2>
            <button className="modal-close" onClick={onClose}>
              <i className="fas fa-times"></i>
            </button>
          </div>

          <div className="modal-body">
            {loading ? (
              <div className="flex flex-col justify-center items-center py-12 min-h-[300px]">
                <div className="relative w-20 h-20 mb-6">
                  <div className="absolute inset-0 rounded-full border-4 border-gray-200"></div>
                  <div 
                    className="absolute inset-0 rounded-full border-4 border-t-transparent loader-spin"
                    style={{ borderColor: '#3b82f6 transparent transparent transparent' }}
                  ></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <i className="fas fa-users text-blue-500 text-2xl loader-pulse"></i>
                  </div>
                </div>
                <p className="mt-2 text-gray-700 font-semibold text-lg">Chargement des élèves...</p>
                <p className="mt-1 text-sm text-gray-500">Veuillez patienter quelques instants</p>
              </div>
            ) : students.length === 0 ? (
              <div className="text-center py-8">
                <i className="fas fa-users text-gray-400 text-5xl mb-4"></i>
                <p className="text-gray-500 text-lg">Aucun élève dans cette classe</p>
              </div>
            ) : (
              <div className="users-table max-h-[300px] overflow-y-auto">
                <div className="table-header">
                  <div className="table-cell">Nom</div>
                  <div className="table-cell">Actions</div>
                </div>

                {students.map((student) => {
                  const status = student.status || 'pending';
                  return (
                  <div key={student.id} className="table-row">
                    <div className="table-cell">
                      <div className="user-info">
                        {student.avatar_url ? (
                          <img src={student.avatar_url} alt={student.full_name} className="user-avatar" />
                        ) : (
                          <div
                            className="user-avatar placeholder"
                            style={{ backgroundColor: '#3b82f6', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                          >
                            {getInitials(student.first_name, student.last_name)}
                          </div>
                        )}
                        <div className="flex flex-col">
                          <span className="font-medium text-gray-900">{student.full_name || `${student.first_name} ${student.last_name}`}</span>
                          {student.birthday && (
                            <span className="text-xs text-gray-500">
                              <i className="fas fa-birthday-cake mr-1"></i>
                              {new Date(student.birthday).toLocaleDateString('fr-FR')}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                
                    <div className="table-cell">
                      <div className="action-buttons">
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
                )})}
              </div>
            )}
          </div>

        <div className="modal-footer">
          <div className="flex items-center justify-between w-full">
            <span className="text-sm text-gray-600">
              {loading ? (
                <span className="flex items-center gap-2">
                  <i className="fas fa-spinner fa-spin"></i>
                  Chargement...
                </span>
              ) : (
                <span>
                  {students.length} élève{students.length !== 1 ? 's' : ''}
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

