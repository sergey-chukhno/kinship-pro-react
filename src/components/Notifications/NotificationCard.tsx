import React from 'react';
import { Notification } from '../../types';
import './NotificationCard.css';

interface NotificationCardProps {
  notification: Notification;
  onClick: () => void;
}

const NotificationCard: React.FC<NotificationCardProps> = ({ notification, onClick }) => {
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'event': return 'fas fa-calendar-alt';
      case 'project': return 'fas fa-project-diagram';
      case 'badge': return 'fas fa-award';
      case 'system': return 'fas fa-cog';
      default: return 'fas fa-bell';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'event': return '#3b82f6';
      case 'project': return '#10b981';
      case 'badge': return '#f59e0b';
      case 'system': return '#6b7280';
      default: return '#5570F1';
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) {
      return 'Il y a moins d\'une heure';
    } else if (diffInHours < 24) {
      return `Il y a ${diffInHours} heure${diffInHours > 1 ? 's' : ''}`;
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      if (diffInDays < 7) {
        return `Il y a ${diffInDays} jour${diffInDays > 1 ? 's' : ''}`;
      } else {
        return date.toLocaleDateString('fr-FR', {
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        });
      }
    }
  };

  return (
    <div 
      className={`notification-card ${!notification.isRead ? 'unread' : ''}`}
      onClick={onClick}
    >
      <div className="notification-icon" style={{ backgroundColor: getTypeColor(notification.type) }}>
        <i className={getTypeIcon(notification.type)}></i>
      </div>
      
      <div className="notification-content">
        <div className="notification-header">
          <h3 className="notification-title">{notification.title}</h3>
          <span className="notification-time">{formatTime(notification.date)}</span>
        </div>
        
        <p className="notification-message">{notification.message}</p>
        
        {notification.sender && (
          <div className="notification-sender">
            <i className="fas fa-user"></i>
            <span>{notification.sender}</span>
          </div>
        )}
        
        {notification.relatedItem && (
          <div className="notification-related">
            <i className="fas fa-link"></i>
            <span>{notification.relatedItem}</span>
          </div>
        )}
      </div>
      
      {!notification.isRead && (
        <div className="notification-unread-indicator"></div>
      )}
    </div>
  );
};

export default NotificationCard;
