import React, { useEffect, useState } from 'react';
import './Modal.css';
import AvatarImage from '../UI/AvatarImage';
import AddEntireClassPanel, { EntireClassStudent } from '../Project/AddEntireClassPanel';
import { TeacherVisibleClass } from '../../utils/teacherVisibleClasses';
import {
  addChosenStudentsCtaLabel,
  countSelectableChosen,
} from '../../utils/schoolParticipantLabels';

interface AddParticipantModalProps {
  onClose: () => void;
  onAdd: (participant: {
    id: string;
    memberId: string;
    name: string;
    profession: string;
    email: string;
    avatar: string;
    skills: string[];
    availability: string[];
    organization: string;
  }) => void;
  existingParticipants: {
    memberId: string;
  }[];
  availableMembers: any[];
  /** Teacher context: show « Une classe entière » panel */
  entireClassPanel?: {
    myClasses: TeacherVisibleClass[];
    searchResults: TeacherVisibleClass[];
    searchValue: string;
    onSearchChange: (value: string) => void;
    isSearching?: boolean;
    getStudentsForClass: (classId: string) => EntireClassStudent[] | Promise<EntireClassStudent[]>;
    onAddAll: (classId: string, studentIds: string[]) => void | Promise<void>;
    onChoose: (classId: string, studentIds: string[], preselectedIds: string[]) => void;
    lastToast?: string | null;
  };
}

const AddParticipantModal: React.FC<AddParticipantModalProps> = ({
  onClose,
  onAdd,
  existingParticipants,
  availableMembers,
  entireClassPanel
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMember, setSelectedMember] = useState<any | null>(null);
  const [chooseClass, setChooseClass] = useState<{
    classId: string;
    studentIds: string[];
    selected: Set<string>;
  } | null>(null);

  const existingMemberIds = existingParticipants.map(p => p.memberId);

  useEffect(() => {
    if (!entireClassPanel) return;
    // no-op: keep chooseClass in sync if panel resets
  }, [entireClassPanel]);

  const filteredMembers = availableMembers.filter(member => {
    if (existingMemberIds.includes(member.memberId)) {
      return false;
    }

    const fullName = (member.name || '').toLowerCase();
    const email = (member.email || '').toLowerCase();
    const profession = (member.profession || '').toLowerCase();
    const search = searchTerm.toLowerCase();

    return (
      fullName.includes(search) ||
      email.includes(search) ||
      profession.includes(search) ||
      (member.skills || []).some((skill: string) => skill.toLowerCase().includes(search))
    );
  });

  const handleMemberSelect = (member: any) => {
    setSelectedMember(member);
  };

  const handleSubmit = () => {
    if (selectedMember) {
      const participantData = {
        id: Date.now().toString(),
        memberId: selectedMember.memberId,
        name: selectedMember.name,
        profession: selectedMember.profession,
        email: selectedMember.email,
        avatar: selectedMember.avatar,
        skills: selectedMember.skills || [],
        availability: selectedMember.availability || [],
        organization: selectedMember.organization || 'Non spécifiée'
      };

      onAdd(participantData);
      onClose();
    }
  };

  const handleChooseConfirm = async () => {
    if (!chooseClass || !entireClassPanel) return;
    const toAdd = Array.from(chooseClass.selected).filter(id => !existingMemberIds.includes(id));
    await entireClassPanel.onAddAll(chooseClass.classId, toAdd);
    setChooseClass(null);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: entireClassPanel ? 560 : undefined }}>
        <div className="modal-header">
          <h2>Ajouter un participant</h2>
          <button className="modal-close" onClick={onClose}>
            <i className="fas fa-times"></i>
          </button>
        </div>

        <div className="modal-body">
          <p style={{ margin: '0 0 12px', fontSize: '0.9rem', color: '#6b7280' }}>
            Les élèves et les enseignants qui prennent part au projet.
          </p>

          {entireClassPanel && !chooseClass && (
            <AddEntireClassPanel
              myClasses={entireClassPanel.myClasses}
              searchResults={entireClassPanel.searchResults}
              searchValue={entireClassPanel.searchValue}
              onSearchChange={entireClassPanel.onSearchChange}
              isSearching={entireClassPanel.isSearching}
              existingParticipantIds={existingMemberIds}
              getStudentsForClass={entireClassPanel.getStudentsForClass}
              onAddAll={entireClassPanel.onAddAll}
              onChoose={(classId, studentIds, preselectedIds) => {
                setChooseClass({
                  classId,
                  studentIds,
                  selected: new Set(preselectedIds)
                });
              }}
              lastToast={entireClassPanel.lastToast}
            />
          )}

          {chooseClass && (() => {
            const addableCount = countSelectableChosen(chooseClass.selected, existingMemberIds);
            const ctaLabel = addChosenStudentsCtaLabel(addableCount);
            return (
            <div className="form-group">
              <label>Choisir les élèves</label>
              <button
                type="button"
                className="btn btn-link"
                style={{ padding: '4px 0', fontSize: '0.85rem', marginBottom: 8 }}
                onClick={() => {
                  setChooseClass(prev => {
                    if (!prev) return prev;
                    const next = new Set(prev.selected);
                    prev.studentIds.forEach(id => {
                      if (!existingMemberIds.includes(id)) next.delete(id);
                    });
                    return { ...prev, selected: next };
                  });
                }}
              >
                Tout décocher
              </button>
              <div className="member-selection-list" style={{ maxHeight: 280 }}>
                {chooseClass.studentIds.map(id => {
                  const already = existingMemberIds.includes(id);
                  const checked = chooseClass.selected.has(id);
                  const member = availableMembers.find(m => m.memberId === id || m.id === id);
                  const label = member?.name || `Élève ${id}`;
                  return (
                    <label
                      key={id}
                      className="member-selection-item"
                      style={{ opacity: already ? 0.55 : 1, cursor: already ? 'default' : 'pointer' }}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={already}
                        onChange={() => {
                          if (already) return;
                          setChooseClass(prev => {
                            if (!prev) return prev;
                            const next = new Set(prev.selected);
                            if (next.has(id)) next.delete(id);
                            else next.add(id);
                            return { ...prev, selected: next };
                          });
                        }}
                      />
                      <span style={{ marginLeft: 8 }}>{label}{already ? ' (déjà dans le projet)' : ''}</span>
                    </label>
                  );
                })}
              </div>
              <div className="flex gap-2" style={{ marginTop: 12 }}>
                <button type="button" className="btn btn-outline" onClick={() => setChooseClass(null)}>
                  Retour
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={addableCount === 0}
                  onClick={handleChooseConfirm}
                >
                  {ctaLabel}
                </button>
              </div>
            </div>
            );
          })()}

          {!chooseClass && (
            <>
              <div className="form-group">
                <label>Rechercher un élève ou un enseignant</label>
                <div className="search-input-container">
                  <i className="fas fa-search search-icon"></i>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Rechercher un élève ou un enseignant…"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Membres disponibles</label>
                <div className="member-selection-list">
                  {filteredMembers.length === 0 ? (
                    <div className="no-members">
                      <i className="fas fa-users"></i>
                      <p>Aucun membre trouvé</p>
                    </div>
                  ) : (
                    filteredMembers.map(member => (
                      <div
                        key={member.id}
                        className={`member-selection-item ${selectedMember?.id === member.id ? 'selected' : ''}`}
                        onClick={() => handleMemberSelect(member)}
                      >
                        <div className="member-avatar">
                          <AvatarImage src={member.avatar} alt={member.name} />
                        </div>
                        <div className="member-info">
                          <h4 className="member-name">{member.name}</h4>
                          <p className="member-profession">{member.profession}</p>
                          <p className="member-email" title={member.email}>
                            {member.email}
                          </p>
                          {member.organization && (
                            <div className="member-organization">{member.organization}</div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {!chooseClass && (
          <div className="modal-footer">
            <button type="button" className="btn btn-outline" onClick={onClose}>
              Annuler
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleSubmit}
              disabled={!selectedMember}
            >
              <i className="fas fa-plus"></i>
              Ajouter le participant
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AddParticipantModal;
