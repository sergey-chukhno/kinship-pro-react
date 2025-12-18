import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../context/AppContext';
import { Event } from '../../types';
import EventModal from '../Modals/EventModal';
import EventCard from '../Events/EventCard';
import CalendarView from '../Events/CalendarView';
import { getSchoolEvents, getCompanyEvents, getTeacherEvents, EventResponse } from '../../api/Events';
import { getOrganizationId } from '../../utils/projectMapper';
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
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState(false);
  const [eventsError, setEventsError] = useState<string | null>(null);

  // Transform API response to frontend Event format
  const transformEventResponse = (apiEvent: EventResponse): Event => {
    return {
      id: apiEvent.id.toString(),
      title: apiEvent.title,
      description: apiEvent.description || '',
      date: apiEvent.date,
      time: apiEvent.time,
      duration: apiEvent.duration,
      type: apiEvent.type as Event['type'],
      location: apiEvent.location || '',
      participants: apiEvent.participants?.map(p => p.toString()) || [],
      badges: apiEvent.badges?.map(b => b.toString()) || [],
      image: apiEvent.image_url || '',
      status: apiEvent.status as Event['status'],
      projectId: '',
      createdBy: '',
      createdAt: apiEvent.created_at
    };
  };

  // Fetch events from API
  useEffect(() => {
    const fetchEvents = async () => {
      // Skip for user context (no events API for users)
      if (state.showingPageType === 'user') {
        setEvents(state.events);
        return;
      }

      setIsLoadingEvents(true);
      setEventsError(null);

      try {
        const organizationId = getOrganizationId(state.user, state.showingPageType);
        let eventsResponse;

        if (state.showingPageType === 'edu' && organizationId) {
          eventsResponse = await getSchoolEvents(organizationId);
        } else if (state.showingPageType === 'pro' && organizationId) {
          eventsResponse = await getCompanyEvents(organizationId);
        } else if (state.showingPageType === 'teacher') {
          eventsResponse = await getTeacherEvents();
        } else {
          // Fallback to context events
          setEvents(state.events);
          setIsLoadingEvents(false);
          return;
        }

        // Transform API events to frontend format
        const transformedEvents = eventsResponse.data.map(transformEventResponse);
        setEvents(transformedEvents);
      } catch (error: any) {
        console.error('Error fetching events:', error);
        setEventsError(error.response?.data?.message || error.message || 'Erreur lors du chargement des événements');
        // Fallback to context events on error
        setEvents(state.events);
      } finally {
        setIsLoadingEvents(false);
      }
    };

    fetchEvents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.showingPageType, state.user.id]);

  const filteredEvents = events.filter(event => {
    // Search filter
    const matchesSearch = event?.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event?.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
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

  const handleSaveEvent = async (eventData: Omit<Event, 'id'>) => {
    try {
      if (selectedEvent) {
        updateEvent(selectedEvent.id, eventData);
        setSuccessMessage('Événement modifié avec succès !');
        // Update local events
        setEvents(prev => prev.map(e => e.id === selectedEvent.id ? { ...e, ...eventData } : e));
      } else {
        const newEvent: Event = {
          ...eventData,
          id: Date.now().toString()
        };
        addEvent(newEvent);
        setSuccessMessage('Événement créé avec succès !');
        // Add to local events
        setEvents(prev => [...prev, newEvent]);
      }
      setIsEventModalOpen(false);
      setSelectedEvent(null);
      
      // Hide success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage('');
      }, 3000);

      // Reload events from API after a short delay to get the latest data
      setTimeout(async () => {
        const organizationId = getOrganizationId(state.user, state.showingPageType);
        try {
          let eventsResponse;
          if (state.showingPageType === 'edu' && organizationId) {
            eventsResponse = await getSchoolEvents(organizationId);
          } else if (state.showingPageType === 'pro' && organizationId) {
            eventsResponse = await getCompanyEvents(organizationId);
          } else if (state.showingPageType === 'teacher') {
            eventsResponse = await getTeacherEvents();
          } else {
            return;
          }
          const transformedEvents = eventsResponse.data.map(transformEventResponse);
          setEvents(transformedEvents);
        } catch (error) {
          console.error('Error reloading events:', error);
        }
      }, 1000);
    } catch (error) {
      console.error('Error saving event:', error);
    }
  };

  const handleDeleteEvent = (id: string) => {
    deleteEvent(id);
    setEvents(prev => prev.filter(e => e.id !== id));
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
              <option value="session">Session</option>
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

      {/* Loading State */}
      {isLoadingEvents && (
        <div style={{ padding: '20px', textAlign: 'center' }}>
          <i className="fas fa-spinner fa-spin"></i> Chargement des événements...
        </div>
      )}

      {/* Error State */}
      {eventsError && !isLoadingEvents && (
        <div style={{ padding: '20px', backgroundColor: '#f8d7da', color: '#721c24', borderRadius: '4px', margin: '10px 0' }}>
          <i className="fas fa-exclamation-circle"></i> {eventsError}
        </div>
      )}

      {/* Events Content */}
      {!isLoadingEvents && (
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
              {filteredEvents.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
                  <i className="fas fa-calendar-times" style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.5 }}></i>
                  <p>Aucun événement trouvé</p>
                </div>
              ) : (
                filteredEvents.map((event) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    members={state.members}
                    onClick={() => handleEventClick(event)}
                    onEdit={() => handleEditEvent(event)}
                    onDelete={() => handleDeleteEvent(event.id)}
                  />
                ))
              )}
            </div>
          )}
        </div>
      )}

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
