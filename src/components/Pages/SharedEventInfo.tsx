import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { getSharedEvent, joinSharedEvent, SharedEventResponse } from '../../api/Events';
import { getBadges } from '../../api/Badges';
import { BadgeAPI } from '../../types';
import { useAppContext } from '../../context/AppContext';
import { useToast } from '../../hooks/useToast';
import { getLocalBadgeImage } from '../../utils/badgeImages';
import '../Modals/Modal.css';
import './SharedEventInfo.css';

function translateEventTypeName(type: string) {
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
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const months = [
    'Janvier',
    'Février',
    'Mars',
    'Avril',
    'Mai',
    'Juin',
    'Juillet',
    'Août',
    'Septembre',
    'Octobre',
    'Novembre',
    'Décembre'
  ];
  const day = date.getDate();
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  return `${day} ${month} ${year}`;
}

const SharedEventInfo: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { state } = useAppContext();
  const { showError, showSuccess } = useToast();

  const [event, setEvent] = useState<SharedEventResponse | null>(null);
  const [eventBadges, setEventBadges] = useState<BadgeAPI[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isJoining, setIsJoining] = useState(false);

  const badgeIds = useMemo(() => (event?.badges || []).map(String), [event?.badges]);

  useEffect(() => {
    if (!token) {
      setError('Lien invalide');
      setIsLoading(false);
      return;
    }

    const fetchEvent = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const data = await getSharedEvent(token);
        setEvent(data);
      } catch (err: any) {
        console.error('Error fetching shared event:', err);
        setError(err?.response?.status === 404 ? 'Événement introuvable' : "Erreur lors du chargement de l'événement");
      } finally {
        setIsLoading(false);
      }
    };

    fetchEvent();
  }, [token]);

  useEffect(() => {
    const fetchBadges = async () => {
      if (!badgeIds.length) {
        setEventBadges([]);
        return;
      }
      try {
        const allBadges = await getBadges();
        setEventBadges(allBadges.filter((b) => badgeIds.includes(String(b.id))));
      } catch (err) {
        console.error('Error fetching badges for shared event:', err);
      }
    };
    fetchBadges();
  }, [badgeIds]);

  const handleJoinEvent = async () => {
    if (!token) return;

    if (!state.user) {
      const redirect = encodeURIComponent(location.pathname + location.search);
      navigate(`/login?redirect=${redirect}`);
      return;
    }

    try {
      setIsJoining(true);
      await joinSharedEvent(token);
      showSuccess("Votre demande pour rejoindre l'événement a été prise en compte");
    } catch (err: any) {
      console.error('Error joining event from shared link:', err);
      const message =
        err?.response?.data?.message ||
        err?.response?.data?.detail ||
        "Impossible de rejoindre l'événement pour le moment";
      showError(message);
    } finally {
      setIsJoining(false);
    }
  };

  if (isLoading) {
    return (
      <div className="public-project-info-page" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
        <img src="/Kinship_logo.png" alt="Kinship" style={{ width: '160px', height: '40px', objectFit: 'contain', marginBottom: '2rem' }} />
        <div className="loader" style={{ border: '4px solid #f3f3f3', borderTop: '4px solid #6b7280', borderRadius: '50%', width: '48px', height: '48px', animation: 'spin 1s linear infinite' }} />
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="public-project-info-page" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
        <img src="/Kinship_logo.png" alt="Kinship" style={{ width: '160px', height: '40px', objectFit: 'contain', marginBottom: '2rem' }} />
        <p style={{ color: '#6b7280', fontSize: '1.125rem' }}>{error || 'Événement introuvable'}</p>
      </div>
    );
  }

  return (
    <div className="shared-event-page">
      <div className="shared-event-page__sheet">
        <header className="shared-event-page__header">
          <img src="/Kinship_logo.png" alt="Kinship" />
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleJoinEvent}
            disabled={isJoining}
            title="Rejoindre l'événement"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <i className="fas fa-plus" />
            {isJoining ? 'Envoi...' : "Rejoindre l'événement"}
          </button>
        </header>

          <h1 className="event-detail-title">{event.title}</h1>

          <div className="event-detail-meta">
            <div className="meta-item">
              <i className="fas fa-calendar-alt" />
              <span>{formatDate(event.date)}</span>
            </div>
            <div className="meta-item">
              <i className="fas fa-tag" />
              <span>Type d&apos;événement : {translateEventTypeName(event.type)}</span>
            </div>
            <div className="meta-item">
              <i className="fas fa-clock" />
              <span>
                {event.time} -{' '}
                {(() => {
                  const [h, m] = (event.time || '00:00').split(':').map((v) => parseInt(v, 10));
                  const total = h * 60 + m + (event.duration || 0);
                  const hh = String(Math.floor(total / 60)).padStart(2, '0');
                  const mm = String(total % 60).padStart(2, '0');
                  return `${hh}:${mm}`;
                })()}
              </span>
            </div>
          </div>

          <div className="event-detail-main-content">
            <div className="overflow-hidden event-detail-image-container">
              {event.image ? (
                <img src={event.image} alt={event.title} className="event-detail-hero-image" />
              ) : (
                <div className="event-detail-image-placeholder">
                  <i className="fas fa-image" />
                  <span>Aucune image</span>
                </div>
              )}
            </div>

            <div className="event-detail-description-container">
              <h3 className="description-title">Description</h3>
              <p className="description-text">{event.description || 'Aucune description disponible.'}</p>
            </div>
          </div>

          {eventBadges.length > 0 && (
            <div className="bg-white event-detail-participants-section" style={{ borderTop: '1px solid #e5e7eb' }}>
              <h3 className="participants-title">Badges de l&apos;événement</h3>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                  gap: '1rem',
                  paddingTop: '1rem'
                }}
              >
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
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <div
                        style={{
                          width: '80px',
                          height: '80px',
                          marginBottom: '0.75rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
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
                      <h4
                        style={{
                          fontSize: '0.9rem',
                          fontWeight: 600,
                          color: '#1f2937',
                          margin: '0 0 0.5rem 0',
                          textAlign: 'center'
                        }}
                      >
                        {badge.name}
                      </h4>
                      <span style={{ fontSize: '0.75rem', color: '#6b7280', textTransform: 'capitalize' }}>{badge.series}</span>
                      {badge.level && (
                        <span
                          style={{
                            fontSize: '0.7rem',
                            color: '#5570F1',
                            marginTop: '0.25rem',
                            fontWeight: 500,
                            textTransform: 'uppercase'
                          }}
                        >
                          {badge.level.replace('level_', 'Niveau ')}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
      </div>
    </div>
  );
};

export default SharedEventInfo;

