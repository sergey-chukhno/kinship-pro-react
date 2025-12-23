import React, { useState, useEffect } from 'react';
import { Event, EventParticipant, BadgeAPI } from '../../types';
import { getBadges } from '../../api/Badges';
import { useAppContext } from '../../context/AppContext';
import { useToast } from '../../hooks/useToast';
import './Modal.css';
import AvatarImage from '../UI/AvatarImage';

interface EventCompleteModalProps {
  event: Event;
  onClose: () => void;
  onComplete: (assignments: Array<{ participant_id: number; badge_id: number; proof?: File; comment?: string }>) => void;
}

const EventCompleteModal: React.FC<EventCompleteModalProps> = ({
  event,
  onClose,
  onComplete
}) => {
  const { state } = useAppContext();
  const { showError } = useToast();
  const [badges, setBadges] = useState<BadgeAPI[]>([]);
  const [loadingBadges, setLoadingBadges] = useState(true);
  const [selectedAssignments, setSelectedAssignments] = useState<Map<string, number>>(new Map());
  const [proofFiles, setProofFiles] = useState<Map<string, File>>(new Map()); // Key: "participantId-badgeId"
  const [comments, setComments] = useState<Map<string, string>>(new Map()); // Key: "participantId-badgeId"
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load badges from API
  useEffect(() => {
    const fetchBadges = async () => {
      // Get event badges IDs
      const eventBadgeIds = event.badges || [];
      
      if (eventBadgeIds.length === 0) {
        setLoadingBadges(false);
        return;
      }

      setLoadingBadges(true);
      try {
        // Fetch all badges and filter by event badge IDs
        const allBadges = await getBadges();
        const eventBadges = allBadges.filter(badge => 
          eventBadgeIds.includes(badge.id.toString())
        );
        setBadges(eventBadges);
      } catch (error) {
        console.error('Error fetching badges:', error);
        showError('Erreur lors du chargement des badges');
      } finally {
        setLoadingBadges(false);
      }
    };

    fetchBadges();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event.badges]);

  // Initialize selected assignments with already received badges
  useEffect(() => {
    const initialAssignments = new Map<string, number>();
    const participants = event.participants || [];
    
    participants.forEach((participant) => {
      if (typeof participant === 'object' && participant.received_badge_ids) {
        const participantId = typeof participant.id === 'number' 
          ? participant.id.toString() 
          : participant.id;
        
        participant.received_badge_ids.forEach((badgeIdStr) => {
          const badgeId = parseInt(badgeIdStr);
          if (!isNaN(badgeId)) {
            const key = `${participantId}-${badgeId}`;
            initialAssignments.set(key, badgeId);
          }
        });
      }
    });
    
    setSelectedAssignments(initialAssignments);
  }, [event.participants]);

  // Get participant info
  const getParticipantInfo = (participant: EventParticipant | string) => {
    if (typeof participant === 'string') {
      const member = state.members.find(m => m.id === participant);
      return {
        id: participant,
        name: member ? `${member.firstName} ${member.lastName}` : `Participant ${participant}`,
        avatar: member?.avatar,
        initials: member ? `${member.firstName.charAt(0)}${member.lastName.charAt(0)}` : '??'
      };
    } else {
      const member = state.members.find(m => m.id === participant.id.toString());
      return {
        id: participant.id.toString(),
        name: member 
          ? `${member.firstName} ${member.lastName}`
          : `${participant.first_name} ${participant.last_name}`,
        avatar: member?.avatar,
        initials: member
          ? `${member.firstName.charAt(0)}${member.lastName.charAt(0)}`
          : `${participant.first_name.charAt(0)}${participant.last_name.charAt(0)}`
      };
    }
  };

  // Handle badge selection for a participant
  const handleBadgeSelect = (participantId: string, badgeId: number) => {
    const key = `${participantId}-${badgeId}`;
    const newAssignments = new Map(selectedAssignments);
    
    if (newAssignments.has(key)) {
      newAssignments.delete(key);
    } else {
      newAssignments.set(key, badgeId);
    }
    
    setSelectedAssignments(newAssignments);
  };

  // Check if a badge is selected for a participant
  const isBadgeSelected = (participantId: string, badgeId: number): boolean => {
    const key = `${participantId}-${badgeId}`;
    return selectedAssignments.has(key);
  };

  // Check if a badge is selected for all participants
  const isBadgeSelectedForAll = (badgeId: number): boolean => {
    if (participants.length === 0) return false;
    
    // Normalize participants array to avoid union type issues
    const normalizedParticipants = [...participants] as (EventParticipant | string)[];
    
    return normalizedParticipants.every((participant: EventParticipant | string) => {
      const participantId = typeof participant === 'object' ? participant.id : participant;
      const participantIdNum = typeof participantId === 'number' ? participantId : parseInt(participantId as string);
      const participantIdStr = participantIdNum.toString();
      return isBadgeSelected(participantIdStr, badgeId);
    });
  };

  // Handle select/deselect badge for all participants
  const handleSelectBadgeForAll = (badgeId: number) => {
    const newAssignments = new Map(selectedAssignments);
    const isSelectedForAll = isBadgeSelectedForAll(badgeId);
    
    // Normalize participants array to avoid union type issues
    const normalizedParticipants = [...participants] as (EventParticipant | string)[];
    
    normalizedParticipants.forEach((participant: EventParticipant | string) => {
      const participantId = typeof participant === 'object' ? participant.id : participant;
      const participantIdNum = typeof participantId === 'number' ? participantId : parseInt(participantId as string);
      const participantIdStr = participantIdNum.toString();
      const key = `${participantIdStr}-${badgeId}`;
      
      if (isSelectedForAll) {
        // Deselect for all
        newAssignments.delete(key);
      } else {
        // Select for all
        newAssignments.set(key, badgeId);
      }
    });
    
    setSelectedAssignments(newAssignments);
  };

  // Check if badge requires proof (level 2, 3, 4)
  const requiresProof = (badge: BadgeAPI): boolean => {
    return badge.level === 'level_2' || badge.level === 'level_3' || badge.level === 'level_4';
  };

  // Handle proof file upload
  const handleProofFileChange = (participantId: string, badgeId: number, file: File | null) => {
    const key = `${participantId}-${badgeId}`;
    const newProofFiles = new Map(proofFiles);
    
    if (file) {
      newProofFiles.set(key, file);
    } else {
      newProofFiles.delete(key);
    }
    
    setProofFiles(newProofFiles);
  };

  // Get proof file for a participant/badge combination
  const getProofFile = (participantId: string, badgeId: number): File | undefined => {
    const key = `${participantId}-${badgeId}`;
    return proofFiles.get(key);
  };

  const handleCommentChange = (participantId: string, badgeId: number, value: string) => {
    const key = `${participantId}-${badgeId}`;
    const newComments = new Map(comments);
    if (value.trim()) {
      newComments.set(key, value);
    } else {
      newComments.delete(key);
    }
    setComments(newComments);
  };

  const getComment = (participantId: string, badgeId: number): string => {
    const key = `${participantId}-${badgeId}`;
    return comments.get(key) || '';
  };

  // Handle form submission
  const handleSubmit = () => {
    const confirmClose = window.confirm('Êtes-vous sûr de vouloir clôturer cet événement ?');
    if (!confirmClose) return;

    if (selectedAssignments.size === 0) {
      showError('Veuillez sélectionner au moins une attribution de badge');
      return;
    }

    // Validate that proof files are provided for level 2, 3, 4 badges
    const entries = Array.from(selectedAssignments.entries());
    for (let i = 0; i < entries.length; i++) {
      const [key, badgeId] = entries[i];
      const [participantId] = key.split('-');
      const badge = badges.find(b => b.id === badgeId);
      
      if (badge && requiresProof(badge)) {
        const proofFile = getProofFile(participantId, badgeId);
        if (!proofFile) {
          showError(`Une preuve est requise pour le badge "${badge.name}" (${badge.level.replace('level_', 'Niveau ')})`);
          return;
        }
      }
    }

    // Convert selected assignments to API format
    const assignments: Array<{ participant_id: number; badge_id: number; proof?: File; comment?: string }> = [];
    
    selectedAssignments.forEach((badgeId, key) => {
      const [participantId] = key.split('-');
      const proofFile = getProofFile(participantId, badgeId);
      const comment = comments.get(key);
      
      assignments.push({
        participant_id: parseInt(participantId),
        badge_id: badgeId,
        ...(proofFile && { proof: proofFile }),
        ...(comment ? { comment } : {})
      });
    });

    setIsSubmitting(true);
    onComplete(assignments);
  };

  const participants = event.participants || [];

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 3000 }}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '900px', width: '90%', maxHeight: '90vh', overflowY: 'auto', zIndex: 3001 }}>
        <div className="modal-header">
          <h2>Clôturer l'événement</h2>
          <button className="modal-close" onClick={onClose}>
            <i className="fas fa-times"></i>
          </button>
        </div>

        <div className="modal-body">
          <p style={{ marginBottom: '1.5rem', color: '#6b7280' }}>
            Sélectionnez les badges à attribuer aux participants pour cet événement.
          </p>

          {/* Badges selection for all participants */}
          {!loadingBadges && badges.length > 0 && participants.length > 0 && (
            <div style={{ 
              marginBottom: '2rem', 
              padding: '1.5rem', 
              background: '#f9fafb', 
              borderRadius: '12px',
              border: '1px solid #e5e7eb'
            }}>
              <h3 style={{ 
                fontSize: '0.95rem', 
                fontWeight: 600, 
                color: '#1f2937', 
                margin: '0 0 1rem 0' 
              }}>
                Sélection rapide pour tous les participants
              </h3>
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', 
                gap: '0.75rem' 
              }}>
                {badges.map((badge) => {
                  const isSelectedForAll = isBadgeSelectedForAll(badge.id);
                  return (
                    <button
                      key={badge.id}
                      onClick={() => handleSelectBadgeForAll(badge.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        padding: '0.75rem',
                        border: `2px solid ${isSelectedForAll ? '#5570F1' : '#e5e7eb'}`,
                        borderRadius: '8px',
                        cursor: 'pointer',
                        background: isSelectedForAll ? '#f0f4ff' : '#ffffff',
                        transition: 'all 0.2s ease',
                        textAlign: 'left',
                        width: '100%'
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelectedForAll) {
                          e.currentTarget.style.borderColor = '#5570F1';
                          e.currentTarget.style.background = '#f0f4ff';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelectedForAll) {
                          e.currentTarget.style.borderColor = '#e5e7eb';
                          e.currentTarget.style.background = '#ffffff';
                        }
                      }}
                    >
                      <div style={{ 
                        width: '18px', 
                        height: '18px', 
                        border: `2px solid ${isSelectedForAll ? '#5570F1' : '#d1d5db'}`,
                        borderRadius: '4px',
                        background: isSelectedForAll ? '#5570F1' : 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}>
                        {isSelectedForAll && (
                          <i className="fas fa-check" style={{ color: 'white', fontSize: '0.7rem' }}></i>
                        )}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1 }}>
                        {badge.image_url && (
                          <img 
                            src={badge.image_url} 
                            alt={badge.name}
                            style={{ width: '32px', height: '32px', objectFit: 'contain' }}
                          />
                        )}
                        <span style={{ fontSize: '0.9rem', fontWeight: 500, color: '#1f2937' }}>
                          {badge.name}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {loadingBadges ? (
            <div style={{ textAlign: 'center', padding: '2rem' }}>
              <i className="fas fa-spinner fa-spin" style={{ fontSize: '2rem', color: '#5570F1' }}></i>
              <p>Chargement des badges...</p>
            </div>
          ) : badges.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
              <i className="fas fa-info-circle" style={{ fontSize: '2rem', marginBottom: '1rem' }}></i>
              <p>Aucun badge associé à cet événement.</p>
            </div>
          ) : participants.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
              <i className="fas fa-info-circle" style={{ fontSize: '2rem', marginBottom: '1rem' }}></i>
              <p>Aucun participant à cet événement.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {participants.map((participant, index) => {
                const participantInfo = getParticipantInfo(participant);
                const participantId = typeof participant === 'object' ? participant.id : participant;
                const participantIdNum = typeof participantId === 'number' ? participantId : parseInt(participantId);

                return (
                  <div key={participantId || index} style={{ 
                    border: '1px solid #e5e7eb', 
                    borderRadius: '12px', 
                    padding: '1.5rem',
                    background: '#ffffff'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                      <div style={{ flexShrink: 0 }}>
                        {participantInfo.avatar ? (
                          <AvatarImage 
                            src={participantInfo.avatar} 
                            alt={participantInfo.name}
                            style={{ width: '48px', height: '48px', borderRadius: '50%' }}
                          />
                        ) : (
                          <div style={{
                            width: '48px',
                            height: '48px',
                            borderRadius: '50%',
                            background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                            color: 'white',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 700,
                            fontSize: '1rem'
                          }}>
                            {participantInfo.initials}
                          </div>
                        )}
                      </div>
                      <div style={{ flex: 1 }}>
                        <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: '#1f2937' }}>
                          {participantInfo.name}
                        </h3>
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {badges.map((badge) => {
                        const participantIdStr = participantIdNum.toString();
                        const isSelected = isBadgeSelected(participantIdStr, badge.id);
                        const needsProof = requiresProof(badge);
                        const proofFile = getProofFile(participantIdStr, badge.id);
                        
                        return (
                          <div
                            key={badge.id}
                            style={{
                              border: `2px solid ${isSelected ? '#5570F1' : '#e5e7eb'}`,
                              borderRadius: '8px',
                              padding: '0.75rem',
                              background: isSelected ? '#f0f4ff' : '#ffffff',
                              transition: 'all 0.2s ease'
                            }}
                          >
                            <label
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.75rem',
                                cursor: 'pointer',
                                marginBottom: isSelected && needsProof ? '0.75rem' : '0'
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleBadgeSelect(participantIdStr, badge.id)}
                                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                              />
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1 }}>
                                {badge.image_url && (
                                  <img 
                                    src={badge.image_url} 
                                    alt={badge.name}
                                    style={{ width: '32px', height: '32px', objectFit: 'contain' }}
                                  />
                                )}
                                <span style={{ fontSize: '0.9rem', fontWeight: 500, color: '#1f2937' }}>
                                  {badge.name}
                                </span>
                                {needsProof && (
                                  <span style={{ 
                                    fontSize: '0.7rem', 
                                    color: '#f59e0b', 
                                    fontWeight: 600,
                                    marginLeft: '0.25rem'
                                  }}>
                                    (Preuve requise)
                                  </span>
                                )}
                              </div>
                            </label>
                            
                            {/* Proof file upload for level 2, 3, 4 badges + optional comment */}
                            {isSelected && needsProof && (
                              <div style={{ 
                                marginTop: '0.75rem', 
                                paddingTop: '0.75rem', 
                                borderTop: '1px solid #e5e7eb' 
                              }}>
                                <label style={{ 
                                  fontSize: '0.85rem',
                                  fontWeight: 500,
                                  color: '#374151',
                                  marginBottom: '0.5rem',
                                  display: 'block'
                                }}>
                                  Preuve (document) <span style={{ color: '#ef4444' }}>*</span>
                                </label>
                                <div className="file-upload-container">
                                  <input
                                    type="file"
                                    id={`proof-${participantIdStr}-${badge.id}`}
                                    className="file-input"
                                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                                    onChange={(e) => {
                                      const file = e.target.files?.[0] || null;
                                      handleProofFileChange(participantIdStr, badge.id, file);
                                    }}
                                  />
                                  <label 
                                    htmlFor={`proof-${participantIdStr}-${badge.id}`} 
                                    className="file-upload-label"
                                  >
                                    <i className="fas fa-upload"></i>
                                    <span>{proofFile ? 'Changer le fichier' : 'Choisir un fichier'}</span>
                                  </label>
                                  {proofFile && (
                                    <div className="file-name">
                                      <i className="fas fa-check-circle" style={{ color: '#10b981', marginRight: '0.5rem' }}></i>
                                      {proofFile.name}
                                    </div>
                                  )}
                                </div>
                                <div style={{ marginTop: '0.75rem' }}>
                                  <label style={{ 
                                    fontSize: '0.85rem',
                                    fontWeight: 500,
                                    color: '#374151',
                                    marginBottom: '0.35rem',
                                    display: 'block'
                                  }}>
                                    Commentaire (optionnel)
                                  </label>
                                  <textarea
                                    rows={2}
                                    className="form-textarea"
                                    value={getComment(participantIdStr, badge.id)}
                                    onChange={(e) => handleCommentChange(participantIdStr, badge.id, e.target.value)}
                                    placeholder="Ajoutez un commentaire (optionnel)"
                                    style={{ minHeight: '60px' }}
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button 
            className="btn btn-outline" 
            onClick={onClose}
            disabled={isSubmitting}
          >
            Annuler
          </button>
          <button 
            className="btn btn-primary" 
            onClick={handleSubmit}
            disabled={isSubmitting || selectedAssignments.size === 0 || badges.length === 0 || participants.length === 0}
          >
            {isSubmitting ? (
              <>
                <i className="fas fa-spinner fa-spin"></i>
                <span>Clôture en cours...</span>
              </>
            ) : (
              <>
                <i className="fas fa-check"></i>
                <span>Clôturer l'événement</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EventCompleteModal;

