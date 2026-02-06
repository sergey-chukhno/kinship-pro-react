import React, { useState, useEffect } from 'react';
import { Event, BadgeAPI } from '../../types';
import { useAppContext } from '../../context/AppContext';
import {
  completeSchoolEvent,
  completeCompanyEvent,
  completeTeacherEvent,
  completeUserEvent,
  removeSchoolEventParticipant,
  removeCompanyEventParticipant,
  removeTeacherEventParticipant,
  removeUserEventParticipant
} from '../../api/Events';
import { getBadges } from '../../api/Badges';
import { getOrganizationId } from '../../utils/projectMapper';
import { useToast } from '../../hooks/useToast';
import { getLocalBadgeImage } from '../../utils/badgeImages';
import './Modal.css';
import AvatarImage from '../UI/AvatarImage';
import EventCompleteModal from './EventCompleteModal';

interface EventDetailModalProps {
  event: Event;
  onClose: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onExport?: () => void;
  onComplete?: () => void;
  onParticipantRemoved?: () => void;
}

const EventDetailModal: React.FC<EventDetailModalProps> = ({
  event,
  onClose,
  onEdit,
  onDelete,
  onExport,
  onComplete,
  onParticipantRemoved
}) => {
  const { state } = useAppContext();
  const { showSuccess, showError } = useToast();
  const [isCompleteModalOpen, setIsCompleteModalOpen] = useState(false);
  const [eventBadges, setEventBadges] = useState<BadgeAPI[]>([]);
  const eventDocuments = (event as any).documents || [];
  const eventHasBadges = Boolean(event.badges && event.badges.length > 0);
  const currentUserId = state.user?.id == null ? '' : String(state.user.id);
  const isEventCreator = Boolean(currentUserId && event.createdBy && currentUserId === String(event.createdBy));
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const months = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
      'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
    const day = date.getDate();
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    return `${day} ${month} ${year}`;
  };

  const formatTimeRange = (time: string, duration: number) => {
    const [hours, minutes] = time.split(':').map(Number);
    const startMinutes = hours * 60 + minutes;
    const endMinutes = startMinutes + duration;
    const endHours = Math.floor(endMinutes / 60);
    const endMins = endMinutes % 60;
    return `${time} - ${String(endHours).padStart(2, '0')}:${String(endMins).padStart(2, '0')}`;
  };

  const translateEventTypeName = (type: string) => {
    switch (type) {
      case 'meeting':
        return 'Réunion';
      case 'workshop':
        return 'Atelier';
      case 'training':
        return 'Formation';
      case 'session':
        return 'Session';
      case 'other':
        return 'Autre';
      default:
        return type;
    }
  };
  // Handle event completion
  const handleComplete = async (assignments: Array<{ participant_id: number; badge_id: number; proof?: File }>) => {
    try {
      const organizationId = getOrganizationId(state.user, state.showingPageType);
      const eventId = parseInt(event.id);

      if (state.showingPageType === 'edu' && organizationId) {
        await completeSchoolEvent(organizationId, eventId, { assignments });
      } else if (state.showingPageType === 'pro' && organizationId) {
        await completeCompanyEvent(organizationId, eventId, { assignments });
      } else if (state.showingPageType === 'teacher') {
        await completeTeacherEvent(eventId, { assignments });
      } else if (state.showingPageType === 'user') {
        await completeUserEvent(eventId, { assignments });
      } else {
        showError('Impossible de clôturer l\'événement dans ce contexte');
        return;
      }

      showSuccess('Événement clôturé avec succès');
      setIsCompleteModalOpen(false);

      // Refresh event data
      if (onComplete) {
        await onComplete();
      }

      // Keep modal open to show updated data (status, badges received, etc.)
    } catch (error: any) {
      console.error('Error completing event:', error);
      showError(error.response?.data?.message || 'Erreur lors de la clôture de l\'événement');
    }
  };

  // Handle participant removal
  const handleRemoveParticipant = async (participantId: string | number) => {
    try {
      const organizationId = getOrganizationId(state.user, state.showingPageType);
      const eventId = parseInt(event.id);
      const participantIdNum = typeof participantId === 'number' ? participantId : parseInt(participantId);

      if (state.showingPageType === 'edu' && organizationId) {
        await removeSchoolEventParticipant(organizationId, eventId, participantIdNum);
      } else if (state.showingPageType === 'pro' && organizationId) {
        await removeCompanyEventParticipant(organizationId, eventId, participantIdNum);
      } else if (state.showingPageType === 'teacher') {
        await removeTeacherEventParticipant(eventId, participantIdNum);
      } else if (state.showingPageType === 'user') {
        await removeUserEventParticipant(eventId, participantIdNum);
      } else {
        showError('Impossible de supprimer le participant dans ce contexte');
        return;
      }

      showSuccess('Participant supprimé avec succès');
      if (onParticipantRemoved) {
        onParticipantRemoved();
      }
    } catch (error: any) {
      console.error('Error removing participant:', error);
      showError(error.response?.data?.message || 'Erreur lors de la suppression du participant');
    }
  };

  // Load event badges
  useEffect(() => {
    const fetchEventBadges = async () => {
      const eventBadgeIds = event.badges || [];
      if (eventBadgeIds.length === 0) {
        setEventBadges([]);
        return;
      }

      try {
        const allBadges = await getBadges();
        const badges = allBadges.filter(badge =>
          eventBadgeIds.includes(badge.id.toString())
        );
        setEventBadges(badges);
      } catch (error) {
        console.error('Error fetching event badges:', error);
      }
    };

    fetchEventBadges();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event.badges]);


  return (
    <div className="modal-overlay event-detail-overlay" onClick={onClose}>
      <div className="modal-content event-detail-modal-redesigned" onClick={(e) => e.stopPropagation()}>
        {/* Header with action buttons */}
        <div className="event-detail-header-actions">
          {/* && event.status !== 'completed'  */}
          {event.status !== 'completed' && eventHasBadges && state.showingPageType !== 'user' && isEventCreator && (
            <button
              className="flex gap-2 items-center btn-primary btn-sm"
              onClick={() => setIsCompleteModalOpen(true)}
              title="Clôturer l'événement"
              style={{
                background: 'linear-gradient(135deg, #10b981, #059669)',
                color: 'white',
                border: 'none'
              }}
            >
              <i className="fas fa-check-circle"></i>
              <span>Clôturer</span>
            </button>
          )}
          {onExport && (
            <button className="btn-export" onClick={onExport} title="Exporter">
              <i className="fas fa-download"></i>
              <span>Exporter</span>
            </button>
          )}
          {onEdit && state.showingPageType !== 'user' && isEventCreator && (
            <button className="flex gap-2 items-center btn-primary btn-sm btn-outline" onClick={onEdit} title="Modifier">
              <i className="fas fa-edit"></i>
              <span>Modifier</span>
            </button>
          )}
          {onDelete && state.showingPageType !== 'user' && isEventCreator && (
            <button
              className="flex gap-2 items-center btn-sm"
              onClick={onDelete}
              title="Supprimer l'événement"
              style={{
                background: 'transparent',
                border: '1px solid #ef4444',
                color: '#ef4444'
              }}
            >
              <i className="fas fa-trash"></i>
              <span>Supprimer</span>
            </button>
          )}
          <button className="btn-close-circle" onClick={onClose} title="Fermer">
            <i className="fas fa-times"></i>
          </button>
        </div>

        {/* Event Title */}
        <h1 className="event-detail-title">{event.title}</h1>

        {/* Event Meta Info (Date, Time, Location) */}
        <div className="event-detail-meta">
            <div className="meta-item">
              <i className="fas fa-calendar-alt"></i>
              <span>{formatDate(event.date)}</span>
            </div>
            <div className="meta-item">
              <i className="fas fa-calendar-check"></i>
              <span>Type d'événement : {translateEventTypeName(event.type)}</span>
            </div>
          <div className="meta-item">
            <i className="fas fa-clock"></i>
            <span>{formatTimeRange(event.time, event.duration)}</span>
          </div>
          {event.location && (
            <div className="meta-item">
              <i className="fas fa-map-marker-alt"></i>
              <span>{event.location}</span>
            </div>
          )}
        </div>

        {/* Main Content: Image Left, Description Right */}
        <div className="event-detail-main-content">
          {/* Left: Image */}
          <div className="overflow-hidden event-detail-image-container">

            {event.image ? (
              <img src={event.image} alt={event.title} className="event-detail-hero-image" />
            ) : (
              <div className="event-detail-image-placeholder">
                <i className="fas fa-image"></i>
                <span>Aucune image</span>
              </div>
            )}
          </div>

          {/* Right: Description */}
          <div className="event-detail-description-container">
            <h3 className="description-title">Description</h3>
            <p className="description-text">
              {event.description || "Aucune description disponible."}
            </p>
          </div>
        </div>

        {/* Badges Section */}
        {eventBadges.length > 0 && (
          <div className="bg-white event-detail-participants-section" style={{ borderTop: '1px solid #e5e7eb' }}>
            <h3 className="participants-title">Badges de l'événement</h3>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
              gap: '1rem',
              paddingTop: '1rem'
            }}>
              {eventBadges.map((badge) => {
                const badgeImage = badge.image_url || getLocalBadgeImage(badge.name, badge.level, badge.series) || '/TouKouLeur-Jaune.png';
                return (
                  <div
                    key={badge.id}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      padding: '1rem',
                      background: '#ffffff',
                      border: '1px solid #e5e7eb',
                      borderRadius: '12px',
                      transition: 'all 0.2s ease',
                      cursor: 'pointer'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = '#5570F1';
                      e.currentTarget.style.boxShadow = '0 2px 8px rgba(85, 112, 241, 0.15)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = '#e5e7eb';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    <div style={{
                      width: '80px',
                      height: '80px',
                      marginBottom: '0.75rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <img
                        src={badgeImage}
                        alt={badge.name}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'contain'
                        }}
                      />
                    </div>
                    <h4 style={{
                      fontSize: '0.9rem',
                      fontWeight: 600,
                      color: '#1f2937',
                      margin: '0 0 0.5rem 0',
                      textAlign: 'center'
                    }}>
                      {badge.name}
                    </h4>
                    <span style={{
                      fontSize: '0.75rem',
                      color: '#6b7280',
                      textTransform: 'capitalize'
                    }}>
                      {badge.series}
                    </span>
                    {badge.level && (
                      <span style={{
                        fontSize: '0.7rem',
                        color: '#5570F1',
                        marginTop: '0.25rem',
                        fontWeight: 500,
                        textTransform: 'uppercase'
                      }}>
                        {badge.level.replace('level_', 'Niveau ')}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Documents Section */}
        {eventDocuments && eventDocuments.length > 0 && (
          <div className="bg-white event-detail-participants-section" style={{ borderTop: '1px solid #e5e7eb' }}>
            <h3 className="participants-title">Documents</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {eventDocuments.map((doc: any, idx: number) => {
                const name = doc.name || doc.filename || doc.file_name || `Document ${idx + 1}`;
                const url = doc.url || doc.link || doc.path;
                return (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '10px 12px',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      background: '#f8fafc'
                    }}
                  >
                    <i className="fas fa-file-alt" style={{ color: '#5570F1' }}></i>
                    {url ? (
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: '#1f2937', textDecoration: 'underline', fontWeight: 500 }}
                      >
                        {name}
                      </a>
                    ) : (
                      <span style={{ color: '#1f2937', fontWeight: 500 }}>{name}</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Participants Section */}
        
          <div className="bg-white event-detail-participants-section">
            <h3 className="participants-title">Participants ({event.participants.length})</h3>
            <div className="participants-list-container">
              {event.participants && event.participants.length > 0 ? (
                <div className="participants-list-redesigned">
                  {event.participants.map((participant, index) => {
                    const participantObj = typeof participant === 'object' ? participant : null;
                    const participantId = typeof participant === 'object'
                      ? participant.id.toString()
                      : participant;

                    // Get participant info from event data only
                    const displayName = participantObj
                      ? `${participantObj.first_name} ${participantObj.last_name}`
                      : `Participant ${participantId}`;

                    const role = participantObj?.email || '';
                    const avatar = undefined; // No avatar in event participant data
                    const initials = participantObj
                      ? `${participantObj.first_name.charAt(0)}${participantObj.last_name.charAt(0)}`
                      : '??';

                    // Get received badges for this participant
                    const receivedBadgeIds = participantObj?.received_badge_ids || [];
                    const receivedBadges = eventBadges.filter(badge =>
                      receivedBadgeIds.includes(badge.id.toString())
                    );

                    return (
                      <div key={participantId || index} className="participant-row">
                        <div className="participant-avatar-container">
                          {avatar ? (
                            <AvatarImage
                              src={avatar}
                              alt={displayName}
                              className="participant-avatar-large"
                            />
                          ) : (
                            <div className="participant-avatar-initials">
                              {initials}
                            </div>
                          )}
                        </div>
                        <div className="participant-info">
                          <div className="participant-name-bold">{displayName}</div>
                          {role && <div className="participant-role">{role}</div>}
                          <div className="participant-badges">
                            {/* Event badges received */}
                            {receivedBadges.length > 0 && (
                              <>
                                {receivedBadges.map((badge) => {
                                  const badgeImage = badge.image_url || getLocalBadgeImage(badge.name, badge.level, badge.series);
                                  return (
                                    <span
                                      key={badge.id}
                                      className="badge-pill badge-event-received"
                                      title={badge.name}
                                      style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '0.25rem',
                                        background: '#10b981',
                                        color: 'white',
                                        padding: '0.25rem 0.75rem',
                                        borderRadius: '16px',
                                        fontSize: '0.75rem',
                                        fontWeight: 600
                                      }}
                                    >
                                      {badgeImage && (
                                        <img
                                          src={badgeImage}
                                          alt={badge.name}
                                          style={{ width: '16px', height: '16px', objectFit: 'contain' }}
                                        />
                                      )}
                                      <i className="fas fa-check-circle" style={{ fontSize: '0.7rem' }}></i>
                                      {badge.name}
                                    </span>
                                  );
                                })}
                              </>
                            )}
                            {participantObj?.claim_token && (
                              <span className="badge-pill badge-pending">
                                Compte non validé - En attente
                              </span>
                            )}
                          </div>
                        </div>
                        {state.showingPageType !== 'user' && isEventCreator && (
                        <button
                          className="participant-delete-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (window.confirm(`Êtes-vous sûr de vouloir supprimer ${displayName} de cet événement ?`)) {
                              handleRemoveParticipant(participantId);
                            }
                          }}
                          title="Supprimer le participant"
                        >
                          <i className="fas fa-trash"></i>
                        </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="no-participants">Aucun participant</div>
              )}
            </div>
          </div>
      
      </div>

      {/* Event Complete Modal */}
      {isCompleteModalOpen && (
        <EventCompleteModal
          event={event}
          onClose={() => setIsCompleteModalOpen(false)}
          onComplete={handleComplete}
        />
      )}
    </div>
  );
};

export default EventDetailModal;
