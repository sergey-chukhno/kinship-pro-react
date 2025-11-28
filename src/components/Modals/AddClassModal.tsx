import React, { useState, useEffect } from 'react'
import { ClassList, Member } from '../../types';
import { useToast } from '../../hooks/useToast';
import { useAppContext } from '../../context/AppContext';
import { getCurrentUser } from '../../api/Authentication';
import { getSchoolMembersAccepted } from '../../api/SchoolDashboard/Members';

type Props = {
  onClose: () => void;
  onAdd: (levelData: { level: { name: string; level: string; teacher_ids?: number[]; school_id?: number | null } }) => void;
  initialData?: { name: string; level: string; id?: number; teacher_ids?: number[] };
  isEdit?: boolean;
}

export default function AddClassModal({ onClose, onAdd, initialData, isEdit = false }: Props) {
  const { state } = useAppContext();
  const isTeacherContext = state.showingPageType === 'teacher';
  const isEduContext = state.showingPageType === 'edu';
  const [name, setName] = useState(initialData?.name || '');
  const [level, setLevel] = useState(initialData?.level || '');
  const [selectedStaffIds, setSelectedStaffIds] = useState<number[]>(initialData?.teacher_ids || []);
  const [availableStaff, setAvailableStaff] = useState<Member[]>([]);
  const [selectedSchoolId, setSelectedSchoolId] = useState<number | null>(null);
  const [availableSchools, setAvailableSchools] = useState<Array<{ id: number; name: string }>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStaff, setLoadingStaff] = useState(false);
  const { showError, showSuccess } = useToast();

  // Charger les écoles disponibles pour les teachers (seulement celles où l'utilisateur est admin, superadmin ou referent)
  useEffect(() => {
    const fetchSchools = async () => {
      if (!isTeacherContext) return;
      
      try {
        const currentUser = await getCurrentUser();
        const schools = currentUser.data?.available_contexts?.schools || [];
        
        // Filtrer pour ne garder que les écoles où l'utilisateur est admin, superadmin ou referent
        const filteredSchools = schools.filter((school: any) => 
          school.role === 'admin' || school.role === 'superadmin' || school.role === 'referent'
        );
        
        const schoolsList = filteredSchools.map((school: any) => ({
          id: school.id,
          name: school.name
        }));
        
        setAvailableSchools(schoolsList);
        
        // Par défaut, ne rien sélectionner (option "Aucun")
        setSelectedSchoolId(null);
      } catch (error) {
        console.error("Erreur lors du chargement des écoles", error);
      }
    };
    
    fetchSchools();
  }, [isTeacherContext]);

  // Charger la liste des staff pour le contexte edu (selon l'école sélectionnée pour les teachers)
  useEffect(() => {
    let isMounted = true;
    
    const fetchStaff = async () => {
      if (!isEduContext || !isMounted) return;
      
      try {
        setLoadingStaff(true);
        const currentUser = await getCurrentUser();
        const schoolId = currentUser.data?.available_contexts?.schools?.[0]?.id;
        
        if (!schoolId) {
          if (isMounted) {
            setAvailableStaff([]);
          }
          return;
        }

        const membersRes = await getSchoolMembersAccepted(schoolId);
        const basicMembers = membersRes.data.data || membersRes.data || [];
        
        // Filtrer pour ne garder que les staff (pas les étudiants)
        const staffMembers: Member[] = basicMembers
          .filter((m: any) => {
            // Exclure les étudiants (rôles typiques d'étudiants)
            const role = (m.role_in_school || m.role_in_system || m.role || '').toLowerCase();
            return !['eleve', 'student', 'étudiant'].includes(role);
          })
          .map((m: any) => ({
            id: m.id.toString(),
            firstName: m.first_name || '',
            lastName: m.last_name || '',
            fullName: m.full_name || `${m.first_name || ''} ${m.last_name || ''}`.trim(),
            email: m.email || '',
            profession: m.role_in_system || m.role || '',
            roles: [m.role_in_school || m.role || 'member'],
            skills: [],
            availability: [],
            avatar: m.avatar_url || '/default-avatar.png',
            isTrusted: m.status === 'confirmed',
            badges: [],
            organization: '',
            canProposeStage: false,
            canProposeAtelier: false,
          }));

        if (isMounted) {
          setAvailableStaff(staffMembers);
        }
      } catch (err) {
        if (isMounted) {
          console.error('Erreur lors du chargement des staff:', err);
          showError('Impossible de charger la liste des staff');
        }
      } finally {
        if (isMounted) {
          setLoadingStaff(false);
        }
      }
    };

    fetchStaff();
    
    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEduContext, selectedSchoolId]);

  // Mettre à jour les données quand initialData change (mode édition)
  useEffect(() => {
    if (initialData) {
      setName(initialData.name || '');
      setLevel(initialData.level || '');
      setSelectedStaffIds(initialData.teacher_ids || []);
    } else {
      // Réinitialiser si on passe en mode création
      setName('');
      setLevel('');
      setSelectedStaffIds([]);
    }
  }, [initialData]);

  // Auto-assigner le teacher actuel si on est en mode teacher (seulement si pas en mode édition)
  useEffect(() => {
    let isMounted = true;
    
    const assignCurrentTeacher = async () => {
      if (!isTeacherContext || !isMounted || isEdit) return;
      
      try {
        const currentUser = await getCurrentUser();
        const teacherId = currentUser.data?.id;
        if (teacherId && isMounted) {
          setSelectedStaffIds([Number(teacherId)]);
        }
      } catch (err) {
        if (isMounted) {
          console.error('Erreur lors de la récupération du teacher:', err);
        }
      }
    };

    assignCurrentTeacher();
    
    return () => {
      isMounted = false;
    };
  }, [isTeacherContext, isEdit]);

  const handleStaffToggle = (staffId: number) => {
    setSelectedStaffIds(prev => {
      if (prev.includes(staffId)) {
        return prev.filter(id => id !== staffId);
      } else {
        return [...prev, staffId];
      }
    });
  };

  const handleSubmit = async () => {
    if (!name.trim() || !level.trim()) {
      showError('Veuillez remplir tous les champs');
      return;
    }

    // Pour edu, au moins un staff doit être sélectionné
    if (isEduContext && selectedStaffIds.length === 0) {
      showError('Veuillez sélectionner au moins un membre du staff');
      return;
    }


    try {
      setIsLoading(true);
      const levelData = {
        level: {
          name: name.trim(),
          level: level.trim(),
          ...(selectedStaffIds.length > 0 && { teacher_ids: selectedStaffIds }),
          // Pour les teachers avec des écoles disponibles, inclure school_id même si null (pour "Aucun")
          ...(isTeacherContext && availableSchools.length > 0 && { 
            school_id: selectedSchoolId !== null ? selectedSchoolId : null 
          })
        }
      };

      await onAdd(levelData);
      showSuccess(`La classe ${levelData.level.name} a été ajoutée avec succès`);
    } catch (error) {
      console.error("Erreur lors de l'ajout de la classe :", error);
      showError("Erreur lors de l'ajout de la classe");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{isEdit ? 'Modifier la classe' : 'Ajouter une classe'}</h2>
        </div>
        <div className="modal-body">
          <div className="form-group">
            <label htmlFor="name">Nom de la classe</label>
            <input 
              type="text" 
              id="name" 
              name="name" 
              className='form-input'
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label htmlFor="level">Niveau de la classe</label>
            <input 
              type="text" 
              id="level" 
              name="level" 
              className='form-input'
              value={level}
              onChange={(e) => setLevel(e.target.value)}
            />
          </div>

          {/* Sélecteur d'école pour les teachers (toujours affiché si au moins une école disponible) */}
          {isTeacherContext && availableSchools.length > 0 && (
            <div className="form-group">
              <label htmlFor="schoolId">Établissement</label>
              <select
                id="schoolId"
                name="schoolId"
                value={selectedSchoolId !== null ? selectedSchoolId : ''}
                onChange={(e) => {
                  const value = e.target.value;
                  setSelectedSchoolId(value === '' ? null : Number(value));
                }}
                className="form-select"
                disabled={isEdit}
              >
                <option value="">Aucun</option>
                {availableSchools.map((school) => (
                  <option key={school.id} value={school.id}>
                    {school.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          
          {/* Sélecteur de staff pour le contexte edu */}
          {isEduContext && (
            <div className="form-group">
              <label htmlFor="staff">Assigner des membres du staff *</label>
              {loadingStaff ? (
                <div className="text-gray-500">Chargement des staff...</div>
              ) : availableStaff.length === 0 ? (
                <div className="text-gray-500">Aucun staff disponible</div>
              ) : (
                <div className="staff-selector" style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid #ddd', borderRadius: '4px', padding: '8px' }}>
                  {availableStaff.map((staff) => (
                    <label 
                      key={staff.id} 
                      style={{ display: 'flex', alignItems: 'center', padding: '8px', cursor: 'pointer' }}
                    >
                      <input
                        type="checkbox"
                        checked={selectedStaffIds.includes(Number(staff.id))}
                        onChange={() => handleStaffToggle(Number(staff.id))}
                        style={{ marginRight: '8px' }}
                      />
                      <span>{staff.fullName} {staff.profession ? `- ${staff.profession}` : ''}</span>
                    </label>
                  ))}
                </div>
              )}
              {selectedStaffIds.length > 0 && (
                <div className="text-sm text-gray-600 mt-2">
                  {selectedStaffIds.length} membre(s) sélectionné(s)
                </div>
              )}
            </div>
          )}

          {/* Indication pour le contexte teacher */}
          {isTeacherContext && (
            <div className="form-group">
              <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded">
                <i className="fas fa-info-circle mr-2"></i>
                Cette classe vous sera automatiquement assignée en tant qu'enseignant.
              </div>
            </div>
          )}

          <div className="modal-footer">
            <button type="button" className="btn btn-outline" onClick={onClose} disabled={isLoading}>
              Annuler
            </button>
            <button type="submit" className="btn btn-primary" onClick={handleSubmit} disabled={isLoading}>
              <i className={isEdit ? 'fas fa-save' : 'fas fa-plus'}></i>
              {isLoading ? (isEdit ? 'Modification en cours...' : 'Ajout en cours...') : (isEdit ? 'Modifier la classe' : 'Ajouter la classe')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}