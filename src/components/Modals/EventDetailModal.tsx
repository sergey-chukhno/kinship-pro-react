import React from 'react';
import { Event, Member, EventParticipant } from '../../types';
import { useAppContext } from '../../context/AppContext';
import './Modal.css';
import AvatarImage from '../UI/AvatarImage';

interface EventDetailModalProps {
  event: Event;
  onClose: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

const EventDetailModal: React.FC<EventDetailModalProps> = ({ 
  event, 
  onClose, 
  onEdit, 
  onDelete 
}) => {
  const { state } = useAppContext();

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'session': 'Session',
      'meeting': 'Réunion',
      'workshop': 'Atelier',
      'training': 'Formation',
      'celebration': 'Célébration',
      'other': 'Autre'
    };
    return labels[type] || type;
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      'upcoming': 'À venir',
      'ongoing': 'En cours',
      'completed': 'Terminé',
      'cancelled': 'Annulé'
    };
    return labels[status] || status;
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'upcoming': '#2196f3',
      'ongoing': '#ff9800',
      'completed': '#4caf50',
      'cancelled': '#f44336'
    };
    return colors[status] || '#666';
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes} minutes`;
    } else if (minutes === 60) {
      return '1 heure';
    } else if (minutes < 120) {
      return `${Math.floor(minutes / 60)}h${minutes % 60 > 0 ? minutes % 60 : ''}`;
    } else {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return mins > 0 ? `${hours}h${mins}` : `${hours} heures`;
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content event-detail-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Détails de l'événement</h2>
          <button className="modal-close" onClick={onClose}>
            <i className="fas fa-times"></i>
          </button>
        </div>
        
        <div className="modal-body event-detail-body">
          {/* Event Image */}
          {event.image && (
            <div className="event-detail-image">
              <img src={event.image} alt={event.title} />
            </div>
          )}

          {/* Event Title and Status */}
          <div className="event-detail-header">
            <h3>{event.title}</h3>
            <span 
              className="event-status-badge"
              style={{ 
                backgroundColor: getStatusColor(event.status),
                color: 'white',
                padding: '4px 12px',
                borderRadius: '12px',
                fontSize: '12px',
                fontWeight: '500'
              }}
            >
              {getStatusLabel(event.status)}
            </span>
          </div>

          {/* Event Type */}
          <div className="event-detail-section">
            <div className="event-detail-label">
              <i className="fas fa-tag"></i> Type
            </div>
            <div className="event-detail-value">{getTypeLabel(event.type)}</div>
          </div>

          {/* Date and Time */}
          <div className="event-detail-section">
            <div className="event-detail-label">
              <i className="fas fa-calendar-alt"></i> Date
            </div>
            <div className="event-detail-value">{formatDate(event.date)}</div>
          </div>

          <div className="event-detail-section">
            <div className="event-detail-label">
              <i className="fas fa-clock"></i> Heure
            </div>
            <div className="event-detail-value">
              {event.time} - Durée: {formatDuration(event.duration)}
            </div>
          </div>

          {/* Location */}
          {event.location && (
            <div className="event-detail-section">
              <div className="event-detail-label">
                <i className="fas fa-map-marker-alt"></i> Lieu
              </div>
              <div className="event-detail-value">{event.location}</div>
            </div>
          )}

          {/* Description */}
          {event.description && (
            <div className="event-detail-section">
              <div className="event-detail-label">
                <i className="fas fa-align-left"></i> Description
              </div>
              <div className="event-detail-value">{event.description}</div>
            </div>
          )}

          {/* Participants */}
          <div className="event-detail-section">
            <div className="event-detail-label">
              <i className="fas fa-users"></i> Participants ({event.participants.length})
            </div>
            <div className="event-detail-participants">
              {event.participants.length > 0 ? (
                <div className="participants-list">
                  {event.participants.map((participant, index) => {
                    // Check if participant is an object or just an ID string
                    const participantObj = typeof participant === 'object' 
                      ? participant 
                      : null;
                    const participantId = typeof participant === 'object' 
                      ? participant.id.toString() 
                      : participant;

                    // Try to find member in state.members first
                    let member = state.members.find(m => m.id === participantId);
                    
                    // If not found and we have participant object, use it
                    if (!member && participantObj) {
                      return (
                        <div key={participantId || index} className="participant-item">
                          <div
                            style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '50%',
                              backgroundColor: '#3b82f6',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: 'white',
                              fontWeight: 'bold',
                              fontSize: '14px',
                              marginRight: '8px'
                            }}
                          >
                            {participantObj.first_name.charAt(0).toUpperCase()}
                            {participantObj.last_name.charAt(0).toUpperCase()}
                          </div>
                          <div style={{ flex: 1 }}>
                            <span className="participant-name">
                              {participantObj.first_name} {participantObj.last_name}
                            </span>
                            {participantObj.email && (
                              <div style={{ fontSize: '11px', color: '#666', marginTop: '2px' }}>
                                {participantObj.email}
                              </div>
                            )}
                            {participantObj.claim_token && (
                              <div style={{ fontSize: '10px', color: '#ff9800', marginTop: '2px', fontStyle: 'italic' }}>
                                <i className="fas fa-exclamation-circle"></i> En attente d'activation
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    }

                    // If member found in state.members
                    if (member) {
                      return (
                        <div key={participantId || index} className="participant-item">
                          <AvatarImage 
                            src={member.avatar} 
                            alt={`${member.firstName} ${member.lastName}`} 
                            className="participant-avatar" 
                          />
                          <span className="participant-name">
                            {member.firstName} {member.lastName}
                          </span>
                        </div>
                      );
                    }

                    // Fallback
                    return (
                      <div key={participantId || index} className="participant-item">
                        <span className="participant-name">Participant ID: {participantId}</span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="event-detail-value" style={{ color: '#999', fontStyle: 'italic' }}>
                  Aucun participant
                </div>
              )}
            </div>
          </div>

          {/* Badges */}
          {event.badges && event.badges.length > 0 && (
            <div className="event-detail-section">
              <div className="event-detail-label">
                <i className="fas fa-award"></i> Badges ({event.badges.length})
              </div>
              <div className="event-detail-badges">
                {event.badges.map((badgeId, index) => (
                  <span key={index} className="badge-tag">
                    Badge #{badgeId}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
        
        <div className="modal-footer">
          {onDelete && (
            <button 
              type="button" 
              className="btn btn-danger" 
              onClick={onDelete}
            >
              <i className="fas fa-trash"></i> Supprimer
            </button>
          )}
          <div style={{ flex: 1 }}></div>
          {onEdit && (
            <button 
              type="button" 
              className="btn btn-primary" 
              onClick={onEdit}
            >
              <i className="fas fa-edit"></i> Modifier
            </button>
          )}
          <button type="button" className="btn btn-outline" onClick={onClose}>
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};

export default EventDetailModal;
