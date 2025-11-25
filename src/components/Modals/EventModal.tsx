import React, { useState, useEffect } from 'react';
import { Event } from '../../types';
import { useAppContext } from '../../context/AppContext';
import './Modal.css';
import AvatarImage from '../UI/AvatarImage';

interface EventModalProps {
  event?: Event | null;
  onClose: () => void;
  onSave: (eventData: Omit<Event, 'id'>) => void;
}

const EventModal: React.FC<EventModalProps> = ({ event, onClose, onSave }) => {
  const { state } = useAppContext();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    date: '',
    time: '',
    duration: '60',
    type: 'meeting' as 'meeting' | 'workshop' | 'training' | 'celebration' | 'other',
    location: '',
    participants: [] as string[],
    image: ''
  });

  const [imagePreview, setImagePreview] = useState<string>('');
  const [selectedParticipant, setSelectedParticipant] = useState<string>('');

  useEffect(() => {
    if (event) {
      setFormData({
        title: event.title,
        description: event.description,
        date: event.date,
        time: event.time,
        duration: event.duration?.toString() || '60',
        type: event.type,
        location: event.location || '',
        participants: event.participants || [],
        image: event.image || ''
      });
      setImagePreview(event.image || '');
    } else {
      // Set default date and time
      const today = new Date();
      setFormData(prev => ({
        ...prev,
        date: today.toISOString().split('T')[0],
        time: today.toTimeString().slice(0, 5)
      }));
    }
  }, [event]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setImagePreview(result);
        setFormData(prev => ({
          ...prev,
          image: result
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.title && formData.date && formData.time) {
      const eventData = {
        ...formData,
        duration: parseInt(formData.duration),
        status: 'upcoming' as 'upcoming' | 'ongoing' | 'completed' | 'cancelled',
        projectId: '',
        createdBy: '',
        createdAt: new Date().toISOString()
      };
      onSave(eventData);
    }
  };

  const handleInviteParticipant = () => {
    if (selectedParticipant && !formData.participants.includes(selectedParticipant)) {
      setFormData(prev => ({
        ...prev,
        participants: [...prev.participants, selectedParticipant]
      }));
      setSelectedParticipant('');
    }
  };

  const handleRemoveParticipant = (participantId: string) => {
    setFormData(prev => ({
      ...prev,
      participants: prev.participants.filter(id => id !== participantId)
    }));
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{event ? 'Modifier l\'événement' : 'Créer un nouvel événement'}</h2>
          <button className="modal-close" onClick={onClose}>
            <i className="fas fa-times"></i>
          </button>
        </div>
        
        <form id="eventForm" onSubmit={handleSubmit} className="modal-body">
          {/* Event Image Selection */}
          <div className="form-section">
            <h3>Image de l'événement</h3>
            <div className="avatar-selection">
              <div className="avatar-preview">
                {imagePreview ? (
                  <img src={imagePreview} alt="Event preview" className="avatar-image" />
                ) : (
                  <div className="avatar-placeholder">
                    <i className="fas fa-calendar-alt"></i>
                    <span>Image par défaut</span>
                  </div>
                )}
              </div>
              <div className="avatar-actions">
                <button
                  type="button"
                  onClick={() => document.getElementById('eventImage')?.click()}
                  className="btn btn-outline btn-sm"
                >
                  <i className="fas fa-upload"></i>
                  Choisir une image
                </button>
                <input
                  id="eventImage"
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  style={{ display: 'none' }}
                />
                <p className="avatar-note">
                  Si aucune image n'est sélectionnée, l'image par défaut sera utilisée
                </p>
              </div>
            </div>
          </div>
          
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="eventTitle">Titre de l'événement *</label>
              <input 
                type="text" 
                id="eventTitle" 
                name="title"
                required 
                placeholder="Ex: Réunion équipe projet"
                value={formData.title}
                onChange={handleInputChange}
                className="form-input"
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="eventLocation">Lieu</label>
              <input 
                type="text" 
                id="eventLocation" 
                name="location"
                placeholder="Ex: Salle de conférence"
                value={formData.location}
                onChange={handleInputChange}
                className="form-input"
              />
            </div>
          </div>
          
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="eventDate">Date *</label>
              <input 
                type="date" 
                id="eventDate" 
                name="date"
                required
                value={formData.date}
                onChange={handleInputChange}
                className="form-input"
              />
            </div>
            <div className="form-group">
              <label htmlFor="eventTime">Heure *</label>
              <input 
                type="time" 
                id="eventTime" 
                name="time"
                required
                value={formData.time}
                onChange={handleInputChange}
                className="form-input"
              />
            </div>
          </div>
          
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="eventDuration">Durée</label>
              <select 
                id="eventDuration" 
                name="duration"
                value={formData.duration}
                onChange={handleInputChange}
                className="form-select"
              >
                <option value="30">30 minutes</option>
                <option value="60">1 heure</option>
                <option value="90">1h30</option>
                <option value="120">2 heures</option>
                <option value="240">4 heures</option>
                <option value="480">Journée complète</option>
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="eventType">Type d'événement</label>
              <select 
                id="eventType" 
                name="type"
                value={formData.type}
                onChange={handleInputChange}
                className="form-select"
              >
                <option value="meeting">Réunion</option>
                <option value="workshop">Atelier</option>
                <option value="training">Formation</option>
                <option value="celebration">Célébration</option>
                <option value="other">Autre</option>
              </select>
            </div>
          </div>
          
          <div className="form-group">
            <label htmlFor="eventDescription">Description</label>
            <textarea 
              id="eventDescription" 
              name="description"
              rows={4} 
              placeholder="Description de l'événement..."
              value={formData.description}
              onChange={handleInputChange}
              className="form-textarea"
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="eventParticipants">Participants</label>
            <div className="participants-selection">
              <select 
                id="eventParticipants" 
                className="form-select"
                value={selectedParticipant}
                onChange={(e) => setSelectedParticipant(e.target.value)}
              >
                <option value="">Sélectionner un participant</option>
                {state.members.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.firstName} {member.lastName} - {member.profession}
                  </option>
                ))}
              </select>
              <button type="button" className="btn btn-primary btn-sm" onClick={handleInviteParticipant}>
                <i className="fas fa-plus"></i> Inviter
              </button>
            </div>
            
            {formData.participants.length > 0 && (
              <div className="selected-participants">
                <p className="participants-label">Participants invités ({formData.participants.length}):</p>
                <div className="participants-list">
                  {formData.participants.map((participantId) => {
                    const member = state.members.find(m => m.id === participantId);
                    return member ? (
                      <span key={participantId} className="participant-tag">
                        <AvatarImage src={member.avatar} alt={`${member.firstName} ${member.lastName}`} className="participant-avatar" />
                        <span className="participant-name">{member.firstName} {member.lastName}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveParticipant(participantId)}
                          className="participant-remove"
                        >
                          <i className="fas fa-times"></i>
                        </button>
                      </span>
                    ) : null;
                  })}
                </div>
              </div>
            )}
          </div>
        </form>
        
        <div className="modal-footer">
          <button type="button" className="btn btn-outline" onClick={onClose}>Annuler</button>
          <button type="submit" form="eventForm" className="btn btn-primary">
            <i className="fas fa-plus"></i>
            {event ? 'Modifier l\'événement' : 'Créer l\'événement'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EventModal;