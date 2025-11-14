import React, { useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { Event } from '../../types';
import EventModal from '../Modals/EventModal';
import EventCard from '../Events/EventCard';
import CalendarView from '../Events/CalendarView';
import './Events.css';

const Events: React.FC = () => {
  const { state, addEvent, updateEvent, deleteEvent } = useAppContext();
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [isEventsOverlayOpen, setIsEventsOverlayOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [eventTypeFilter, setEventTypeFilter] = useState<string>('all');
  const [periodFilter, setPeriodFilter] = useState<string>('all');

  // Use events from AppContext
  const events = state.events;

  const filteredEvents = events.filter(event => {
    // Search filter
    const matchesSearch = event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.location.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Event type filter
    const matchesType = eventTypeFilter === 'all' || event.type === eventTypeFilter;
    
    // Period filter
    let matchesPeriod = true;
    if (periodFilter !== 'all') {
      const eventDate = new Date(event.date);
      const today = new Date();
      const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const endOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
      
      switch (periodFilter) {
        case 'today':
          matchesPeriod = eventDate >= startOfToday && eventDate < endOfToday;
          break;
        case 'week':
          const startOfWeek = new Date(today);
          startOfWeek.setDate(today.getDate() - today.getDay());
          startOfWeek.setHours(0, 0, 0, 0);
          const endOfWeek = new Date(startOfWeek);
          endOfWeek.setDate(startOfWeek.getDate() + 7);
          matchesPeriod = eventDate >= startOfWeek && eventDate < endOfWeek;
          break;
        case 'month':
          const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
          const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
          matchesPeriod = eventDate >= startOfMonth && eventDate < endOfMonth;
          break;
        case 'quarter':
          const quarter = Math.floor(today.getMonth() / 3);
          const startOfQuarter = new Date(today.getFullYear(), quarter * 3, 1);
          const endOfQuarter = new Date(today.getFullYear(), quarter * 3 + 3, 1);
          matchesPeriod = eventDate >= startOfQuarter && eventDate < endOfQuarter;
          break;
      }
    }
    
    return matchesSearch && matchesType && matchesPeriod;
  });

  const handleEventClick = (event: Event) => {
    setSelectedEvent(event);
  };

  const handleCreateEvent = () => {
    setSelectedEvent(null);
    setIsEventModalOpen(true);
  };

  const handleEditEvent = (event: Event) => {
    setSelectedEvent(event);
    setIsEventModalOpen(true);
  };

  const handleSaveEvent = (eventData: Omit<Event, 'id'>) => {
    if (selectedEvent) {
      updateEvent(selectedEvent.id, eventData);
      setSuccessMessage('Événement modifié avec succès !');
    } else {
      const newEvent: Event = {
        ...eventData,
        id: Date.now().toString()
      };
      addEvent(newEvent);
      setSuccessMessage('Événement créé avec succès !');
    }
    setIsEventModalOpen(false);
    setSelectedEvent(null);
    
    // Hide success message after 3 seconds
    setTimeout(() => {
      setSuccessMessage('');
    }, 3000);
  };

  const handleDeleteEvent = (id: string) => {
    deleteEvent(id);
    setSelectedEvent(null);
  };

  const handleExportEvents = () => {
    // TODO: Implement export functionality
    console.log('Export events');
  };

  // const handleCopyLink = () => {
  //   navigator.clipboard.writeText(window.location.href);
  //   // TODO: Show notification
  // };

  return (
    <section className="events-container with-sidebar">
      {/* Section Title + Actions */}
      <div className="section-title-row">
        <div className="section-title-left">
          <img src="/icons_logo/Icon=Event.svg" alt="Événements" className="section-icon" />
          <h2>Gestion des événements</h2>
        </div>
        <div className="events-actions">
          <div className="dropdown" style={{ position: 'relative' }}>
            <button className="btn btn-outline" onClick={handleExportEvents}>
              <i className="fas fa-download"></i> Exporter
            </button>
          </div>
          <button className="btn btn-primary" onClick={handleCreateEvent}>
            <i className="fas fa-plus"></i> Créer un événement
          </button>
        </div>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="success-message">
          <div className="success-content">
            <i className="fas fa-check-circle"></i>
            <span>{successMessage}</span>
          </div>
        </div>
      )}

      {/* Search Bar */}
      <div className="events-search-container">
        <div className="search-bar">
          <i className="fas fa-search search-icon"></i>
          <input
            type="text"
            className="search-input"
            placeholder="Rechercher un événement par nom, date, lieu..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="filters-container">
          <div className="filter-group">
            <select 
              className="filter-select"
              value={eventTypeFilter}
              onChange={(e) => setEventTypeFilter(e.target.value)}
            >
              <option value="all">Tous les types</option>
              <option value="meeting">Réunion</option>
              <option value="workshop">Atelier</option>
              <option value="training">Formation</option>
              <option value="celebration">Célébration</option>
              <option value="other">Autre</option>
            </select>
          </div>
          
          <div className="filter-group">
            <select 
              className="filter-select"
              value={periodFilter}
              onChange={(e) => setPeriodFilter(e.target.value)}
            >
              <option value="all">Toutes les périodes</option>
              <option value="today">Aujourd'hui</option>
              <option value="week">Cette semaine</option>
              <option value="month">Ce mois</option>
              <option value="quarter">Ce trimestre</option>
            </select>
          </div>
        </div>
      </div>

      {/* View Toggle */}
      <div className="view-toggle">
        <button 
          className={`view-btn ${viewMode === 'calendar' ? 'active' : ''}`}
          onClick={() => setViewMode('calendar')}
        >
          <i className="fas fa-calendar"></i> Calendrier
        </button>
        <button 
          className={`view-btn ${viewMode === 'list' ? 'active' : ''}`}
          onClick={() => setViewMode('list')}
        >
          <i className="fas fa-list"></i> Liste
        </button>
      </div>

      {/* Events Content */}
      <div className="events-layout">
        {viewMode === 'calendar' ? (
          <CalendarView 
            events={filteredEvents}
            currentDate={currentDate}
            onDateChange={setCurrentDate}
            onEventClick={handleEventClick}
            onCreateEvent={handleCreateEvent}
          />
        ) : (
          <div className="events-list">
            {filteredEvents.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                members={state.members}
                onClick={() => handleEventClick(event)}
                onEdit={() => handleEditEvent(event)}
                onDelete={() => handleDeleteEvent(event.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Events Overlay */}
      {isEventsOverlayOpen && (
        <div className="events-overlay">
          <div className="events-overlay-header">
            <h3>Événements à venir</h3>
            <button className="btn-icon close-btn" onClick={() => setIsEventsOverlayOpen(false)}>
              <i className="fas fa-times"></i>
            </button>
          </div>
          <div className="events-overlay-content">
            {filteredEvents.slice(0, 5).map((event) => (
              <div key={event.id} className="notification-card">
                <div className="notification-icon">
                  <img src="/icons_logo/Icon=Event.svg" alt="Event" />
                </div>
                <div className="notification-content">
                  <div className="notification-header">
                    <h3>{event.title}</h3>
                  </div>
                  <div className="notification-meta">
                    <div className="event-details-row">
                      <span className="event-meta-item">
                        <i className="fas fa-calendar-alt"></i> {event.date}
                      </span>
                      <span className="event-meta-item">
                        <i className="fas fa-clock"></i> {event.time}
                      </span>
                      <span className="event-meta-item">
                        <i className="fas fa-map-marker-alt"></i> {event.location}
                      </span>
                      <span className="event-meta-item">
                        <i className="fas fa-users"></i> {event.participants.length} participants
                      </span>
                    </div>
                  </div>
                </div>
                <div className="notification-actions">
                  <button className="btn-icon" title="Modifier" onClick={() => handleEditEvent(event)}>
                    <i className="fas fa-edit"></i>
                  </button>
                  <button className="btn-icon" title="Supprimer" onClick={() => handleDeleteEvent(event.id)}>
                    <img src="/icons_logo/Icon=trash.svg" alt="Delete" className="action-icon" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Event Modal */}
      {isEventModalOpen && (
        <EventModal
          event={selectedEvent}
          onClose={() => {
            setIsEventModalOpen(false);
            setSelectedEvent(null);
          }}
          onSave={handleSaveEvent}
        />
      )}
    </section>
  );
};

export default Events;
