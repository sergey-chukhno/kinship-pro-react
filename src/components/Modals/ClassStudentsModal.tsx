import React, { useState, useEffect } from 'react';
import { getLevelStudents } from '../../api/SchoolDashboard/Levels';
import { getCurrentUser } from '../../api/Authentication';
import { useToast } from '../../hooks/useToast';
import './Modal.css';

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
  full_name: string;
  email: string;
  avatar_url: string;
  birthday: string;
  role_in_system: string;
  claim_token?: string;
  has_temporary_email?: boolean;
  status: string;
}

interface ClassStudentsModalProps {
  onClose: () => void;
  levelId: number;
  levelName: string;
  onStudentClick?: (studentId: number) => void;
}

const ClassStudentsModal: React.FC<ClassStudentsModalProps> = ({
  onClose,
  levelId,
  levelName,
  onStudentClick
}) => {
  const { showError } = useToast();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);

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

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
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
                  {/* Cercle de fond */}
                  <div className="absolute inset-0 rounded-full border-4 border-gray-200"></div>
                  {/* Cercle animé */}
                  <div 
                    className="absolute inset-0 rounded-full border-4 border-t-transparent loader-spin"
                    style={{ borderColor: '#3b82f6 transparent transparent transparent' }}
                  ></div>
                  {/* Icône centrale */}
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {students.map((student) => (
                <div
                  key={student.id}
                  className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => onStudentClick?.(student.id)}
                >
                  <div className="flex items-center gap-3">
                    {student.avatar_url ? (
                      <img
                        src={student.avatar_url}
                        alt={student.full_name}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold">
                        {getInitials(student.first_name, student.last_name)}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 truncate">
                        {student.full_name || `${student.first_name} ${student.last_name}`}
                      </h3>
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        {student.has_temporary_email && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                            <i className="fas fa-envelope mr-1"></i>
                            Email temp.
                          </span>
                        )}
                        {student.status === 'confirmed' && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                            <i className="fas fa-check mr-1"></i>
                            Confirmé
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {student.email && (
                    <div className="mt-3 text-sm text-gray-600 truncate">
                      <i className="fas fa-envelope mr-2"></i>
                      {student.email}
                    </div>
                  )}
                  
                  {student.birthday && (
                    <div className="mt-1 text-sm text-gray-600">
                      <i className="fas fa-birthday-cake mr-2"></i>
                      {new Date(student.birthday).toLocaleDateString('fr-FR')}
                    </div>
                  )}
                </div>
              ))}
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
    </>
  );
};

export default ClassStudentsModal;

