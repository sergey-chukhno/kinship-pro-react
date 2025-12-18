import React, { useState } from 'react';
import { Event, Member, EventParticipant } from '../../types';
import './EventCard.css';

interface EventCardProps {
  event: Event;
  members: Member[];
  onClick: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

const EventCard: React.FC<EventCardProps> = ({ event, members, onClick, onEdit, onDelete }) => {
  const [showAllParticipants, setShowAllParticipants] = useState(false);
  
  // const formatDate = (dateString: string) => {
  //   const date = new Date(dateString);
  //   return date.toLocaleDateString('fr-FR', {
  //     day: 'numeric',
  //     month: 'long',
  //     year: 'numeric'
  //   });
  // };

  const toggleParticipants = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowAllParticipants(!showAllParticipants);
  };

  return (
    <div className="event-card" onClick={onClick}>
      <div className="event-header">
        <div className="event-date">
          <div className="event-day">{new Date(event.date).getDate()}</div>
          <div className="event-month">{new Date(event.date).toLocaleDateString('fr-FR', { month: 'short' })}</div>
        </div>
        <div className="event-info">
          <h3 className="event-title">{event.title}</h3>
          <p className="event-description">{event.description}</p>
        </div>
        <div className="event-actions">
          <button 
            className="btn-icon" 
            title="Modifier"
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
          >
            <i className="fas fa-edit"></i>
          </button>
          <button 
            className="btn-icon" 
            title="Supprimer"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
          >
            <i className="fas fa-trash"></i>
          </button>
        </div>
      </div>
      
      <div className="event-details">
        <div className="event-meta">
          <div className="event-meta-item">
            <i className="fas fa-clock"></i>
            <span>{event.time}</span>
          </div>
          <div className="event-meta-item">
            <i className="fas fa-map-marker-alt"></i>
            <span>{event.location}</span>
          </div>
          <div className="event-meta-item">
            <i className="fas fa-users"></i>
            <span>{event.participants.length} participants</span>
          </div>
        </div>
        
        <div className="event-participants">
          <div className="participants-label">Participants:</div>
          <div className="participants-list">
            {(showAllParticipants ? event.participants : event.participants.slice(0, 3)).map((participant, index) => {
              // Check if participant is an object or just an ID string
              const participantObj = typeof participant === 'object' ? participant : null;
              const participantId = typeof participant === 'object' ? participant.id.toString() : participant;
              
              // Try to find member in members array
              const member = members.find(m => m.id === participantId);
              
              // If we have participant object, use it
              if (participantObj) {
                return (
                  <span key={participantId || index} className="participant-tag">
                    {participantObj.first_name} {participantObj.last_name}
                  </span>
                );
              }
              
              // If member found, use it
              if (member) {
                return (
                  <span key={participantId || index} className="participant-tag">
                    {member.firstName} {member.lastName}
                  </span>
                );
              }
              
              // Fallback
              return (
                <span key={participantId || index} className="participant-tag">
                  {participantId}
                </span>
              );
            })}
            {event.participants.length > 3 && (
              <button 
                className="participant-toggle"
                onClick={toggleParticipants}
                title={showAllParticipants ? "Voir moins" : "Voir tous les participants"}
              >
                {showAllParticipants ? "Voir moins" : `+${event.participants.length - 3}`}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EventCard;
