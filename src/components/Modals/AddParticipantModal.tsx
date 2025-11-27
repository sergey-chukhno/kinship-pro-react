import React, { useState } from 'react';
import './Modal.css';
import AvatarImage from '../UI/AvatarImage';

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
}

const AddParticipantModal: React.FC<AddParticipantModalProps> = ({ 
  onClose, 
  onAdd, 
  existingParticipants,
  availableMembers 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMember, setSelectedMember] = useState<any | null>(null);

  // Get existing participant member IDs
  const existingMemberIds = existingParticipants.map(p => p.memberId);

  // Filter members based on search term and exclude existing participants
  const filteredMembers = availableMembers.filter(member => {
    // Exclude members who are already participants
    if (existingMemberIds.includes(member.memberId)) {
      return false;
    }

    // Apply search filter
    const fullName = member.name.toLowerCase();
    const email = member.email.toLowerCase();
    const profession = member.profession.toLowerCase();
    const search = searchTerm.toLowerCase();
    
    return fullName.includes(search) || 
           email.includes(search) || 
           profession.includes(search) ||
           (member.skills || []).some((skill: string) => skill.toLowerCase().includes(search));
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

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Ajouter un participant</h2>
          <button className="modal-close" onClick={onClose}>
            <i className="fas fa-times"></i>
          </button>
        </div>

        <div className="modal-body">
          {/* Search */}
          <div className="form-group">
            <label>Rechercher un membre</label>
            <div className="search-input-container">
              <i className="fas fa-search search-icon"></i>
              <input
                type="text"
                className="form-input"
                placeholder="Nom, email, profession ou compétence..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {/* Member Selection */}
          <div className="form-group">
            <label>Membres disponibles</label>
            <div className="member-selection-list">
              {filteredMembers.length === 0 ? (
                <div className="no-members">
                  <i className="fas fa-users"></i>
                  <p>Aucun membre trouvé</p>
                </div>
              ) : (
                filteredMembers.map((member) => (
                  <div
                    key={member.id}
                    className={`member-selection-item ${selectedMember?.id === member.id ? 'selected' : ''}`}
                    onClick={() => handleMemberSelect(member)}
                  >
                    <div className="member-avatar">
                      <AvatarImage src={member.avatar} alt={`${member.firstName} ${member.lastName}`} />
                    </div>
                    <div className="member-info">
                      <h4 className="member-name">{member.name}</h4>
                      <p className="member-profession">{member.profession}</p>
                      <p className="member-email" title={member.email}>{member.email}</p>
                      {member.organization && (
                        <div className="member-organization">{member.organization}</div>
                      )}
                    </div>
                    <div className="member-skills-preview">
                      {(member.skills || []).slice(0, 2).map((skill: string, index: number) => (
                        <span key={index} className="skill-pill-small">{skill}</span>
                      ))}
                      {(member.skills || []).length > 2 && (
                        <span className="skill-more">+{(member.skills || []).length - 2}</span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Selected Member Preview */}
          {selectedMember && (
            <div className="selected-member-preview">
              <h3>Participant sélectionné</h3>
              <div className="preview-card">
                <div className="preview-avatar">
                  <AvatarImage src={selectedMember.avatar} alt={`${selectedMember.firstName} ${selectedMember.lastName}`} />
                </div>
                <div className="preview-info">
                  <h4>{selectedMember.name}</h4>
                  <p>{selectedMember.profession} • {selectedMember.organization || 'Non spécifiée'}</p>
                  <div className="preview-skills">
                    {(selectedMember.skills || []).map((skill: string, index: number) => (
                      <span key={index} className="skill-pill-small">{skill}</span>
                    ))}
                  </div>
                  <div className="preview-availability">
                    <strong>Disponible:</strong>
                    <div className="availability-pills">
                      {(selectedMember.availability || []).map((day: string, index: number) => (
                        <span key={index} className="availability-pill-small">{day}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

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
      </div>
    </div>
  );
};

export default AddParticipantModal;
