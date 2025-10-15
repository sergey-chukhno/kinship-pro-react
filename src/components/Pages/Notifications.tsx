import React, { useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { mockNotifications } from '../../data/mockData';
import { Notification } from '../../types';
import NotificationCard from '../Notifications/NotificationCard';
import './Notifications.css';

const Notifications: React.FC = () => {
  const { state, markNotificationAsRead } = useAppContext();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<'all' | 'event' | 'project' | 'badge' | 'system'>('all');
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'read' | 'unread'>('all');

  // Use mock data for now
  const notifications = mockNotifications;

  const filteredNotifications = notifications.filter(notification => {
    const matchesSearch = notification.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         notification.message.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = selectedType === 'all' || notification.type === selectedType;
    const matchesStatus = selectedStatus === 'all' || 
                         (selectedStatus === 'read' && notification.isRead) ||
                         (selectedStatus === 'unread' && !notification.isRead);
    return matchesSearch && matchesType && matchesStatus;
  });

  const handleMarkAllAsRead = () => {
    notifications.forEach(notification => {
      if (!notification.isRead) {
        markNotificationAsRead(notification.id);
      }
    });
  };

  const handleClearAll = () => {
    // TODO: Implement clear all notifications
    console.log('Clear all notifications');
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.isRead) {
      markNotificationAsRead(notification.id);
    }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;
  const eventNotifications = notifications.filter(n => n.type === 'event').length;
  const projectNotifications = notifications.filter(n => n.type === 'project').length;
  const badgeNotifications = notifications.filter(n => n.type === 'badge').length;

  return (
    <section className="notifications-container with-sidebar">
      <div className="notifications-content">
        {/* Header with icon, title and action buttons */}
        <div className="section-title-row">
          <div className="section-title-left">
            <img src="/icons_logo/Icon=Notifications.svg" alt="Mes notifications" className="section-icon" />
            <h2>Mes notifications</h2>
            {unreadCount > 0 && (
              <span className="unread-badge">{unreadCount}</span>
            )}
          </div>
          <div className="notifications-actions">
            <button className="btn btn-outline" onClick={handleMarkAllAsRead}>
              <i className="fas fa-check-double"></i> Tout marquer comme lu
            </button>
            <button className="btn btn-primary" onClick={handleClearAll}>
              <i className="fas fa-trash"></i> Effacer tout
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="notifications-search-container">
          <div className="search-bar">
            <i className="fas fa-search search-icon"></i>
            <input
              type="text"
              className="search-input"
              placeholder="Rechercher une notification par type, expéditeur, contenu..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button className="filter-toggle-btn inline">
            <i className="fas fa-filter"></i> Filtres
          </button>
        </div>

        {/* Notification Filters */}
        <div className="notifications-filters">
          <div className="filter-tabs">
            <button 
              className={`filter-tab ${selectedType === 'all' ? 'active' : ''}`}
              onClick={() => setSelectedType('all')}
            >
              Toutes ({notifications.length})
            </button>
            <button 
              className={`filter-tab ${selectedType === 'event' ? 'active' : ''}`}
              onClick={() => setSelectedType('event')}
            >
              Événements ({eventNotifications})
            </button>
            <button 
              className={`filter-tab ${selectedType === 'project' ? 'active' : ''}`}
              onClick={() => setSelectedType('project')}
            >
              Projets ({projectNotifications})
            </button>
            <button 
              className={`filter-tab ${selectedType === 'badge' ? 'active' : ''}`}
              onClick={() => setSelectedType('badge')}
            >
              Badges ({badgeNotifications})
            </button>
          </div>
          
          <div className="status-filters">
            <button 
              className={`status-filter ${selectedStatus === 'all' ? 'active' : ''}`}
              onClick={() => setSelectedStatus('all')}
            >
              Toutes
            </button>
            <button 
              className={`status-filter ${selectedStatus === 'unread' ? 'active' : ''}`}
              onClick={() => setSelectedStatus('unread')}
            >
              Non lues ({unreadCount})
            </button>
            <button 
              className={`status-filter ${selectedStatus === 'read' ? 'active' : ''}`}
              onClick={() => setSelectedStatus('read')}
            >
              Lues
            </button>
          </div>
        </div>

        {/* Notifications Grid */}
        <div className="notifications-grid">
          {filteredNotifications.map((notification) => (
            <NotificationCard
              key={notification.id}
              notification={notification}
              onClick={() => handleNotificationClick(notification)}
            />
          ))}
        </div>

        {filteredNotifications.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon">
              <i className="fas fa-bell-slash"></i>
            </div>
            <h3>Aucune notification</h3>
            <p>Vous n'avez aucune notification correspondant à vos critères de recherche.</p>
          </div>
        )}
      </div>
    </section>
  );
};

export default Notifications;
