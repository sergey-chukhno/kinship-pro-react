import React, { useState, useEffect } from 'react'
import { ClassList, Member } from '../../types';
import { useToast } from '../../hooks/useToast';
import { useAppContext } from '../../context/AppContext';
import { getCurrentUser } from '../../api/Authentication';
import { getSchoolStaff } from '../../api/SchoolDashboard/Members';
import AvatarImage from '../UI/AvatarImage';

type Props = {
  onClose: () => void;
  onAdd: (levelData: { level: { name: string; level: string; teacher_ids?: number[]; pedagogical_team_member_ids?: number[]; school_id?: number | null } }) => void;
  initialData?: { name: string; level: string; id?: number; teacher_ids?: number[]; pedagogical_team_member_ids?: number[] };
  isEdit?: boolean;
}

export default function AddClassModal({ onClose, onAdd, initialData, isEdit = false }: Props) {
  const { state } = useAppContext();
  const isTeacherContext = state.showingPageType === 'teacher';
  const isEduContext = state.showingPageType === 'edu';
  const [name, setName] = useState(initialData?.name || '');
  const [level, setLevel] = useState(initialData?.level || 'petite_section');
  const [selectedStaffIds, setSelectedStaffIds] = useState<number[]>(initialData?.teacher_ids || []);
  const [selectedPedagogicalTeamIds, setSelectedPedagogicalTeamIds] = useState<number[]>([]);
  const [availableStaff, setAvailableStaff] = useState<Member[]>([]);
  const [selectedSchoolId, setSelectedSchoolId] = useState<number | null>(null);
  const [availableSchools, setAvailableSchools] = useState<Array<{ id: number; name: string }>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStaff, setLoadingStaff] = useState(false);
  const [searchTermResponsables, setSearchTermResponsables] = useState('');
  const [searchTermPedagogicalTeam, setSearchTermPedagogicalTeam] = useState('');
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

        const staffRes = await getSchoolStaff(schoolId, 100);
        const staffData = staffRes.data.data || staffRes.data || [];
        
        const staffMembers: Member[] = staffData.map((m: any) => ({
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
      setLevel(initialData.level || 'petite_section');
      setSelectedStaffIds(initialData.teacher_ids || []);
      // TODO: Load pedagogical_team_member_ids from initialData when available
      setSelectedPedagogicalTeamIds(initialData.pedagogical_team_member_ids || []);
    } else {
      // Réinitialiser si on passe en mode création
      setName('');
      setLevel('petite_section');
      setSelectedStaffIds([]);
      setSelectedPedagogicalTeamIds([]);
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

  const handleStaffSelect = (staffId: number) => {
    setSelectedStaffIds(prev => {
      if (prev.includes(staffId)) {
        return prev.filter(id => id !== staffId);
      } else {
        return [...prev, staffId];
      }
    });
  };

  const getFilteredStaff = (searchTerm: string) => {
    if (!availableStaff || !Array.isArray(availableStaff)) {
      return [];
    }
    
    // Filter out already selected staff
    const available = availableStaff.filter((staff) => {
      const staffId = Number(staff.id);
      return !selectedStaffIds.includes(staffId);
    });
    
    // Apply search filter if search term provided
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      return available.filter((staff) => {
        const fullName = staff.fullName?.toLowerCase() || '';
        const firstName = staff.firstName?.toLowerCase() || '';
        const lastName = staff.lastName?.toLowerCase() || '';
        const profession = staff.profession?.toLowerCase() || '';
        const email = staff.email?.toLowerCase() || '';
        
        return fullName.includes(searchLower) ||
               firstName.includes(searchLower) ||
               lastName.includes(searchLower) ||
               profession.includes(searchLower) ||
               email.includes(searchLower);
      });
    }
    
    return available;
  };

  const getSelectedStaffMember = (staffId: number) => {
    return availableStaff.find((s) => Number(s.id) === staffId);
  };

  const handlePedagogicalTeamSelect = (staffId: number) => {
    setSelectedPedagogicalTeamIds(prev => {
      if (prev.includes(staffId)) {
        return prev.filter(id => id !== staffId);
      } else {
        return [...prev, staffId];
      }
    });
  };

  const getFilteredPedagogicalTeam = (searchTerm: string) => {
    if (!availableStaff || !Array.isArray(availableStaff)) {
      return [];
    }
    
    // Filter out already selected responsables and pedagogical team members
    const available = availableStaff.filter((staff) => {
      const staffId = Number(staff.id);
      return !selectedStaffIds.includes(staffId) && !selectedPedagogicalTeamIds.includes(staffId);
    });
    
    // Apply search filter if search term provided
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      return available.filter((staff) => {
        const fullName = staff.fullName?.toLowerCase() || '';
        const firstName = staff.firstName?.toLowerCase() || '';
        const lastName = staff.lastName?.toLowerCase() || '';
        const profession = staff.profession?.toLowerCase() || '';
        const email = staff.email?.toLowerCase() || '';
        
        return fullName.includes(searchLower) ||
               firstName.includes(searchLower) ||
               lastName.includes(searchLower) ||
               profession.includes(searchLower) ||
               email.includes(searchLower);
      });
    }
    
    return available;
  };

  const getSelectedPedagogicalTeamMember = (staffId: number) => {
    return availableStaff.find((s) => Number(s.id) === staffId);
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
          ...(selectedPedagogicalTeamIds.length > 0 && { pedagogical_team_member_ids: selectedPedagogicalTeamIds }),
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
            <select
              id="level" 
              name="level" 
              className="form-select"
              value={level}
              onChange={(e) => setLevel(e.target.value)}
              required
            >
              <option value="">Sélectionner un niveau</option>
              <optgroup label="Maternelle/Primaire">
                <option value="petite_section">Petite section</option>
                <option value="moyenne_section">Moyenne section</option>
                <option value="grande_section">Grande section</option>
                <option value="cp">CP</option>
                <option value="ce1">CE1</option>
                <option value="ce2">CE2</option>
                <option value="cm1">CM1</option>
                <option value="cm2">CM2</option>
              </optgroup>
              <optgroup label="Collège">
                <option value="sixieme">Sixième</option>
                <option value="cinquieme">Cinquième</option>
                <option value="quatrieme">Quatrième</option>
                <option value="troisieme">Troisième</option>
              </optgroup>
              <optgroup label="Lycée">
                <option value="seconde">Seconde</option>
                <option value="premiere">Première</option>
                <option value="terminale">Terminale</option>
                <option value="cap">CAP</option>
                <option value="bts">BTS</option>
              </optgroup>
              <optgroup label="Autre">
                <option value="other">Autre</option>
              </optgroup>
            </select>
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
            <>
              <div className="form-group">
                <label htmlFor="staff">Assigner responsable(s) *</label>
                {loadingStaff ? (
                  <div className="text-gray-500">Chargement des staff...</div>
                ) : (
                  <div className="compact-selection">
                    <div className="search-input-container">
                      <i className="fas fa-search search-icon"></i>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="Rechercher des responsables..."
                        value={searchTermResponsables}
                        onChange={(e) => setSearchTermResponsables(e.target.value)}
                        disabled={loadingStaff}
                      />
                    </div>
                    
                    {selectedStaffIds.length > 0 && (
                      <div className="selected-items">
                        {selectedStaffIds.map((staffId) => {
                          const staff = getSelectedStaffMember(staffId);
                          return staff ? (
                            <div key={staffId} className="selected-member">
                              <AvatarImage src={staff.avatar || '/default-avatar.png'} alt={staff.fullName} className="selected-avatar" />
                              <div className="selected-info">
                                <div className="selected-name">{staff.fullName}</div>
                                <div className="selected-role">{staff.profession}</div>
                              </div>
                              <button
                                type="button"
                                className="remove-selection"
                                onClick={() => handleStaffSelect(staffId)}
                              >
                                <i className="fas fa-times"></i>
                              </button>
                            </div>
                          ) : null;
                        })}
                      </div>
                    )}
                    <div className="selection-list">
                      {getFilteredStaff(searchTermResponsables).length === 0 ? (
                        <div className="no-members-message" style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>
                          <i className="fas fa-users" style={{ fontSize: '2rem', marginBottom: '0.5rem', display: 'block' }}></i>
                          <p>Aucun membre disponible</p>
                        </div>
                      ) : (
                        getFilteredStaff(searchTermResponsables).map((staff: Member) => (
                          <div
                            key={staff.id}
                            className="selection-item"
                            onClick={() => handleStaffSelect(Number(staff.id))}
                          >
                            <AvatarImage src={staff.avatar || '/default-avatar.png'} alt={staff.fullName} className="item-avatar" />
                            <div className="item-info">
                              <div className="item-name">{staff.fullName}</div>
                              <div className="item-role">{staff.profession}</div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
              
              {/* Équipe pédagogique section */}
              {isEduContext && (
                <div className="form-group">
                  <label>Composer les membres de l'équipe pédagogique</label>
                  {loadingStaff ? (
                    <div className="text-gray-500">Chargement des staff...</div>
                  ) : (
                    <div className="compact-selection">
                      <div className="search-input-container">
                        <i className="fas fa-search search-icon"></i>
                        <input
                          type="text"
                          className="form-input"
                          placeholder="Rechercher des membres de l'équipe pédagogique..."
                          value={searchTermPedagogicalTeam}
                          onChange={(e) => setSearchTermPedagogicalTeam(e.target.value)}
                          disabled={loadingStaff}
                        />
                      </div>
                      
                      {selectedPedagogicalTeamIds.length > 0 && (
                        <div className="selected-items">
                          {selectedPedagogicalTeamIds.map((staffId) => {
                            const staff = getSelectedPedagogicalTeamMember(staffId);
                            return staff ? (
                              <div key={staffId} className="selected-member">
                                <AvatarImage src={staff.avatar || '/default-avatar.png'} alt={staff.fullName} className="selected-avatar" />
                                <div className="selected-info">
                                  <div className="selected-name">{staff.fullName}</div>
                                  <div className="selected-role">{staff.profession}</div>
                                </div>
                                <button
                                  type="button"
                                  className="remove-selection"
                                  onClick={() => handlePedagogicalTeamSelect(staffId)}
                                >
                                  <i className="fas fa-times"></i>
                                </button>
                              </div>
                            ) : null;
                          })}
                        </div>
                      )}
                      <div className="selection-list">
                        {getFilteredPedagogicalTeam(searchTermPedagogicalTeam).length === 0 ? (
                          <div className="no-members-message" style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>
                            <i className="fas fa-users" style={{ fontSize: '2rem', marginBottom: '0.5rem', display: 'block' }}></i>
                            <p>Aucun membre disponible</p>
                          </div>
                        ) : (
                          getFilteredPedagogicalTeam(searchTermPedagogicalTeam).map((staff: Member) => (
                            <div
                              key={staff.id}
                              className="selection-item"
                              onClick={() => handlePedagogicalTeamSelect(Number(staff.id))}
                            >
                              <AvatarImage src={staff.avatar || '/default-avatar.png'} alt={staff.fullName} className="item-avatar" />
                              <div className="item-info">
                                <div className="item-name">{staff.fullName}</div>
                                <div className="item-role">{staff.profession}</div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* Indication pour le contexte teacher */}
          {isTeacherContext && (
            <div className="form-group">
              <div className="p-3 text-sm text-gray-600 bg-blue-50 rounded">
                <i className="mr-2 fas fa-info-circle"></i>
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