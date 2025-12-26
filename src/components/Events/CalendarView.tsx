import React, { useState } from 'react';
import { Event } from '../../types';
import './CalendarView.css';
import { useAppContext } from '../../context/AppContext';

interface CalendarViewProps {
  events: Event[];
  currentDate: Date;
  onDateChange: (date: Date) => void;
  onEventClick: (event: Event) => void;
  onCreateEvent: () => void;
  onDuplicateEvent: (event: Event) => void;
}

const CalendarView: React.FC<CalendarViewProps> = ({
  events,
  currentDate,
  onDateChange,
  onEventClick,
  onCreateEvent,
  onDuplicateEvent
}) => {
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day'>('month');
  const [viewDate, setViewDate] = useState(currentDate);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showEventsPopup, setShowEventsPopup] = useState(false);
  const { state } = useAppContext();
  const monthNames = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ];

  const dayNames = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

  const getEventsForDate = (date: Date) => {
    // Use local date formatting to avoid timezone issues
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    return events.filter(event => event.date === dateStr);
  };

  const getEventsForTimeSlot = (date: Date, hour: number) => {
    // Use local date formatting to avoid timezone issues
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    return events.filter(event => {
      if (event.date !== dateStr) return false;
      const eventHour = parseInt(event.time.split(':')[0]);
      return eventHour === hour;
    });
  };

  const previousPeriod = () => {
    const newDate = new Date(viewDate);
    if (viewMode === 'month') {
      newDate.setMonth(newDate.getMonth() - 1);
    } else if (viewMode === 'week') {
      newDate.setDate(newDate.getDate() - 7);
    } else {
      newDate.setDate(newDate.getDate() - 1);
    }
    setViewDate(newDate);
    onDateChange(newDate);
  };

  const nextPeriod = () => {
    const newDate = new Date(viewDate);
    if (viewMode === 'month') {
      newDate.setMonth(newDate.getMonth() + 1);
    } else if (viewMode === 'week') {
      newDate.setDate(newDate.getDate() + 7);
    } else {
      newDate.setDate(newDate.getDate() + 1);
    }
    setViewDate(newDate);
    onDateChange(newDate);
  };

  const goToToday = () => {
    const today = new Date();
    setViewDate(today);
    onDateChange(today);
  };

  const getCurrentPeriodText = () => {
    if (viewMode === 'month') {
      return `${monthNames[viewDate.getMonth()]} ${viewDate.getFullYear()}`;
    } else if (viewMode === 'week') {
      const weekStart = new Date(viewDate);
      weekStart.setDate(viewDate.getDate() - viewDate.getDay());
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      return `${weekStart.getDate()}/${weekStart.getMonth() + 1} - ${weekEnd.getDate()}/${weekEnd.getMonth() + 1}`;
    } else {
      return `${viewDate.getDate()} ${monthNames[viewDate.getMonth()]} ${viewDate.getFullYear()}`;
    }
  };

  const renderMonthView = () => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const firstDay = new Date(year, month, 1);
    // const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());

    const days = [];
    for (let i = 0; i < 42; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      const dayEvents = getEventsForDate(date);
      
      days.push(
        <div
          key={i}
          className={`calendar-day ${date.getMonth() !== month ? 'other-month' : ''} ${date.toDateString() === new Date().toDateString() ? 'today' : ''}`}
          onClick={() => {
            setViewDate(date);
            onDateChange(date);
          }}
        >
          <div className="day-number">{date.getDate()}</div>
          {dayEvents.length > 0 && (
            <div className="day-events">
              {dayEvents.slice(0, 2).map((event, index) => (
                <div
                  key={index}
                  className="flex gap-2 day-event"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEventClick(event);
                  }}
                >
                  <span style={{ flex: 1 }}>{event.title}</span>
                  {state.showingPageType !== 'user' && (
                  <button
                    className="calendar-event-dup-btn"
                    title="Dupliquer"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDuplicateEvent(event);
                    }}
                    style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#6b7280' }}
                  >
                    <i className="fas fa-copy"></i>
                  </button>
                  )}
                </div>
              ))}
              {dayEvents.length > 2 && (
                <div 
                  className="day-event-more"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedDate(date);
                    setShowEventsPopup(true);
                  }}
                  style={{ cursor: 'pointer' }}
                >
                  {dayEvents.length - 2} autres
                </div>
              )}
            </div>
          )}
        </div>
      );
    }

    return (
      <div className="calendar-grid month-view">
        {dayNames.map(day => (
          <div key={day} className="calendar-weekday">{day}</div>
        ))}
        {days}
      </div>
    );
  };

  const renderWeekView = () => {
    const weekStart = new Date(viewDate);
    weekStart.setDate(viewDate.getDate() - viewDate.getDay());
    
    const days = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(weekStart);
      date.setDate(weekStart.getDate() + i);
      const dayEvents = getEventsForDate(date);
      
      days.push(
        <div key={i} className="week-day">
          <div className="week-day-header">
            <div className="week-day-name">{dayNames[i]}</div>
            <div className="week-day-number">{date.getDate()}</div>
          </div>
          <div className="week-day-events">
            {dayEvents.map((event, index) => (
              <div
                key={index}
                className="flex gap-2 bg-red-500 week-event"
                onClick={() => onEventClick(event)}
              >
                <div className="week-event-time">{event.time}</div>
                <div className="week-event-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ flex: 1 }}>{event.title}</span>
                  <button
                    className="calendar-event-dup-btn"
                    title="Dupliquer"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDuplicateEvent(event);
                    }}
                    style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#6b7280' }}
                  >
                    <i className="fas fa-copy"></i>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    return (
      <div className="calendar-grid week-view">
        {days}
      </div>
    );
  };

  const renderDayView = () => {
    // const dayEvents = getEventEventsForDate(viewDate);
    const hours = Array.from({ length: 24 }, (_, i) => i);
    
    return (
      <div className="calendar-grid day-view">
        <div className="day-hours">
          {hours.map(hour => {
            const timeSlotEvents = getEventsForTimeSlot(viewDate, hour);
            return (
              <div key={hour} className="time-slot">
                <div className="time-label">{hour.toString().padStart(2, '0')}:00</div>
                <div className="time-events">
                  {timeSlotEvents.map((event, index) => (
                    <div
                      key={index}
                      className="time-event"
                      onClick={() => onEventClick(event)}
                    >
                      <span style={{ flex: 1 }}>{event.title}</span>
                      <button
                        className="calendar-event-dup-btn"
                        title="Dupliquer"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDuplicateEvent(event);
                        }}
                        style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#6b7280' }}
                      >
                        <i className="fas fa-copy"></i>
                      </button>
                    </div>
                  ))}
                  {timeSlotEvents.length === 0 && (
                    <div
                      className="time-slot-empty"
                      onClick={() => {
                        // TODO: Create event at this time
                        onCreateEvent();
                      }}
                    >
                      +
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="calendar-section">
      {/* Calendar Toolbar */}
      <div className="calendar-toolbar">
        <div className="calendar-toolbar-left">
          <button className="btn-today" onClick={goToToday}>
            Aujourd'hui
          </button>
          <div className="calendar-nav">
            <button className="btn-nav" onClick={previousPeriod}>
              <i className="fas fa-chevron-left"></i>
            </button>
            <button className="btn-nav" onClick={nextPeriod}>
              <i className="fas fa-chevron-right"></i>
            </button>
          </div>
          <h2 className="current-period">{getCurrentPeriodText()}</h2>
        </div>
        <div className="calendar-toolbar-right">
          <div className="view-toggle">
            <button 
              className={`view-btn ${viewMode === 'month' ? 'active' : ''}`}
              onClick={() => setViewMode('month')}
            >
              Mois
            </button>
            <button 
              className={`view-btn ${viewMode === 'week' ? 'active' : ''}`}
              onClick={() => setViewMode('week')}
            >
              Semaine
            </button>
            <button 
              className={`view-btn ${viewMode === 'day' ? 'active' : ''}`}
              onClick={() => setViewMode('day')}
            >
              Jour
            </button>
          </div>
        </div>
      </div>

      {/* Calendar Content */}
      <div className="calendar-content">
        {viewMode === 'month' && renderMonthView()}
        {viewMode === 'week' && renderWeekView()}
        {viewMode === 'day' && renderDayView()}
      </div>

      {/* Events Popup */}
      {showEventsPopup && selectedDate && (
        <div 
          className="calendar-events-popup-overlay"
          onClick={() => setShowEventsPopup(false)}
        >
          <div 
            className="calendar-events-popup"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="calendar-events-popup-header">
              <div className="calendar-events-popup-date">
                <div className="calendar-events-popup-day-name">
                  {dayNames[selectedDate.getDay()]}
                </div>
                <div className="calendar-events-popup-day-number">
                  {selectedDate.getDate()}
                </div>
              </div>
              <button 
                className="calendar-events-popup-close"
                onClick={() => setShowEventsPopup(false)}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="calendar-events-popup-content">
              {getEventsForDate(selectedDate).length === 0 ? (
                <div className="calendar-events-popup-empty">
                  Aucun événement ce jour
                </div>
              ) : (
                <div className="calendar-events-popup-list">
                  {getEventsForDate(selectedDate).map((event, index) => {
                    // Determine event color and style based on type
                    const getEventStyle = () => {
                      switch (event.type) {
                        case 'session':
                          return { color: '#7c3aed', isSolid: true }; // Purple solid
                        case 'workshop':
                        case 'meeting':
                          return { color: '#3b82f6', isSolid: false }; // Blue hollow
                        default:
                          return { color: '#5570F1', isSolid: true }; // Default primary solid
                      }
                    };

                    const style = getEventStyle();
                    
                    return (
                      <div
                        key={event.id || index}
                        className="calendar-events-popup-item"
                        onClick={() => {
                          setShowEventsPopup(false);
                          onEventClick(event);
                        }}
                      >
                        <div 
                          className="calendar-events-popup-item-dot"
                          style={{
                            background: style.isSolid ? style.color : 'transparent',
                            border: style.isSolid ? 'none' : `2px solid ${style.color}`,
                            width: style.isSolid ? '12px' : '10px',
                            height: style.isSolid ? '12px' : '10px'
                          }}
                        ></div>
                        <div className="calendar-events-popup-item-time">
                          {event.time}
                        </div>
                        <div className="calendar-events-popup-item-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {event.title}
                          <button
                            className="calendar-event-dup-btn"
                            title="Dupliquer"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDuplicateEvent(event);
                            }}
                            style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#6b7280' }}
                          >
                            <i className="fas fa-copy"></i>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CalendarView;
