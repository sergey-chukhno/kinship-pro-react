import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useAppContext } from '../../context/AppContext';
import { getSchoolAssignedBadges, getCompanyAssignedBadges, getTeacherAssignedBadges } from '../../api/Dashboard';
import { getUserBadges } from '../../api/Badges';
import { getOrganizationId } from '../../utils/projectMapper';
import { getLocalBadgeImage } from '../../utils/badgeImages';
import './Modal.css';
import './BadgeAttributionsModal.css';

interface BadgeAttributionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  badgeName: string;
  badgeLevel: string;
  badgeId?: string; // Badge ID for filtering
}

interface BadgeAttribution {
  id: number;
  receiver: {
    id: number;
    full_name: string;
    email: string;
    role?: string;
  };
  sender: {
    id: number;
    full_name: string;
    email?: string;
  };
  project: {
    id: number;
    title: string;
  } | null;
  event?: {
    id: number;
    title: string;
  } | null;
  assigned_at: string;
  comment: string | null;
  documents: Array<{
    name: string;
    type: string;
    size: string;
    url?: string;
  }>;
}

const BadgeAttributionsModal: React.FC<BadgeAttributionsModalProps> = ({
  isOpen,
  onClose,
  badgeName,
  badgeLevel,
  badgeId
}) => {
  const { state } = useAppContext();
  const [attributions, setAttributions] = useState<BadgeAttribution[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [badgeImageUrl, setBadgeImageUrl] = useState<string | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const observerTargetRef = useRef<HTMLDivElement>(null);
  const perPage = 20;

  const organizationId = getOrganizationId(state.user, state.showingPageType);

  const fetchAttributions = useCallback(async (page: number, append: boolean = false) => {
    // Allow user context without organization ID
    if (!organizationId && state.showingPageType !== 'teacher' && state.showingPageType !== 'user') {
      setError('Organization ID not found');
      return;
    }

    const loadingState = append ? setIsLoadingMore : setIsLoading;
    loadingState(true);
    setError(null);

    try {
      let response;

      if (state.showingPageType === 'user') {
        // Personal user: fetch received badges filtered by badge_id
        const badgeIdNum = badgeId ? parseInt(badgeId) : undefined;
        const filters: any = {};
        if (badgeIdNum) {
          filters.badge_id = badgeIdNum;
        }
        response = await getUserBadges(page, perPage, filters);
        // Track if client-side filtering was applied
        const needsClientSideFilter = !badgeId;
        // If no badge_id, filter client-side by name and level
        if (needsClientSideFilter && response.data) {
          response.data = response.data.filter((item: any) => 
            item.badge?.name === badgeName && 
            (item.badge?.level === badgeLevel.replace('Niveau ', 'level_') ||
             item.badge?.level === badgeLevel)
          );
        }
        // Transform response to match expected format
        response = {
          data: {
            data: response.data || [],
            meta: response.meta || {},
            needsClientSideFilter: needsClientSideFilter
          }
        };
      } else if (state.showingPageType === 'pro' && organizationId) {
        const badgeIdNum = badgeId ? parseInt(badgeId) : undefined;
        response = await getCompanyAssignedBadges(Number(organizationId), perPage, badgeIdNum, page);
        // If no badge_id, filter client-side by name and level
        if (!badgeId && response.data?.data) {
          response.data.data = response.data.data.filter((item: any) => 
            item.badge?.name === badgeName && 
            (item.badge?.level === badgeLevel.replace('Niveau ', 'level_') ||
             item.badge?.level === badgeLevel)
          );
        }
      } else if (state.showingPageType === 'edu' && organizationId) {
        const badgeIdNum = badgeId ? parseInt(badgeId) : undefined;
        response = await getSchoolAssignedBadges(Number(organizationId), perPage, badgeIdNum, page);
        // If no badge_id, filter client-side by name and level
        if (!badgeId && response.data?.data) {
          response.data.data = response.data.data.filter((item: any) => 
            item.badge?.name === badgeName && 
            (item.badge?.level === badgeLevel.replace('Niveau ', 'level_') ||
             item.badge?.level === badgeLevel)
          );
        }
      } else if (state.showingPageType === 'teacher') {
        const badgeIdNum = badgeId ? parseInt(badgeId) : undefined;
        response = await getTeacherAssignedBadges(perPage, badgeIdNum, page);
        // If no badge_id, filter client-side by name and level
        if (!badgeId && response.data?.data) {
          response.data.data = response.data.data.filter((item: any) => 
            item.badge?.name === badgeName && 
            (item.badge?.level === badgeLevel.replace('Niveau ', 'level_') ||
             item.badge?.level === badgeLevel)
          );
        }
      } else {
        setError('Invalid context for fetching badges');
        return;
      }

      const payload = response.data?.data ?? response.data ?? [];
      
      // Extract badge image from first item if available
      if (payload.length > 0 && !badgeImageUrl) {
        const firstItem = payload[0];
        const badge = firstItem?.badge;
        if (badge?.image_url) {
          setBadgeImageUrl(badge.image_url);
        }
      }
      
      const mapped = (Array.isArray(payload) ? payload : []).map((item: any): BadgeAttribution => {
        // Handle different response formats (user badges vs organization badges)
        const receiver = item.receiver || { 
          id: item.receiver_id || 0, 
          full_name: item.receiver?.full_name || 'Unknown', 
          email: item.receiver?.email || '' 
        };
        const sender = item.sender || { 
          id: item.sender_id || 0, 
          full_name: item.sender?.full_name || 'Unknown',
          email: item.sender?.email || ''
        };
        const project = item.project || (item.project_id ? { id: item.project_id, title: item.project?.title || 'Unknown' } : null);
        const event = item.event || (item.event_id ? { id: item.event_id, title: item.event?.title || 'Événement' } : null);
        
        return {
          id: item.id,
          receiver: receiver,
          sender: sender,
          project: project,
          event: event,
          assigned_at: item.assigned_at || item.created_at,
          comment: item.comment || null,
          documents: item.documents || []
        };
      });

      if (append) {
        // Deduplicate by ID when appending to prevent duplicates
        setAttributions(prev => {
          const existingIds = new Set(prev.map(a => a.id));
          const newItems = mapped.filter(item => !existingIds.has(item.id));
          return [...prev, ...newItems];
        });
      } else {
        setAttributions(mapped);
      }

      const meta = response.data?.meta || response.data?.pagination;
      const totalPages = meta?.total_pages || 1;
      
      // Determine total count based on filtering method
      let total: number;
      if (state.showingPageType === 'user' && response.data?.needsClientSideFilter) {
        // Client-side filtering: use filtered array length
        // Note: This only reflects current page, but is more accurate than unfiltered total
        total = mapped.length;
      } else {
        // Server-side filtering or organization context: use meta total
        total = meta?.total_count || meta?.total_items || mapped.length;
      }

      setTotalCount(total);
      setHasMore(page < totalPages);
      setCurrentPage(page);
    } catch (err: any) {
      console.error('Error fetching badge attributions:', err);
      setError('Erreur lors du chargement des attributions de badges');
    } finally {
      loadingState(false);
    }
  }, [organizationId, state.showingPageType, badgeId, badgeName, badgeLevel, perPage, badgeImageUrl]);

  // Initial load
  useEffect(() => {
    if (isOpen) {
      setAttributions([]);
      setCurrentPage(1);
      setHasMore(true);
      setError(null);
      setBadgeImageUrl(null); // Reset badge image when modal opens
      fetchAttributions(1, false);
    }
  }, [isOpen, fetchAttributions]);

  // Infinite scroll observer
  useEffect(() => {
    if (!isOpen || !hasMore || isLoading || isLoadingMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoadingMore) {
          fetchAttributions(currentPage + 1, true);
        }
      },
      { threshold: 0.1 }
    );

    const target = observerTargetRef.current;
    if (target) {
      observer.observe(target);
    }

    return () => {
      if (target) {
        observer.unobserve(target);
      }
    };
  }, [isOpen, hasMore, isLoading, isLoadingMore, currentPage, fetchAttributions]);

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  // Get badge image from API response or use local mapping
  const badgeImage = useMemo(() => {
    if (badgeImageUrl) {
      return badgeImageUrl;
    }
    return getLocalBadgeImage(badgeName) || '/TouKouLeur-Jaune.png';
  }, [badgeName, badgeImageUrl]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay badge-attributions-modal-overlay" onClick={onClose}>
      <div className="modal-content badge-attributions-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2>Attributions du badge</h2>
            <p className="badge-attributions-subtitle">
              <img 
                src={badgeImage} 
                alt={badgeName} 
                className="badge-attributions-subtitle-icon"
              />
              {badgeName} - {badgeLevel}
              {totalCount > 0 && <span className="badge-count-badge">({totalCount})</span>}
            </p>
          </div>
          <button className="modal-close" onClick={onClose}>
            <i className="fas fa-times"></i>
          </button>
        </div>

        <div className="modal-body badge-attributions-body" ref={scrollContainerRef}>
          {error && (
            <div className="badge-attributions-error">
              <i className="fas fa-exclamation-circle"></i>
              {error}
            </div>
          )}

          {!error && !isLoading && attributions.length === 0 && (
            <div className="badge-attributions-empty">
              <i className="fas fa-inbox"></i>
              <p>Aucune attribution trouvée pour ce badge</p>
            </div>
          )}

          {!error && attributions.length > 0 && (
            <div className="badge-attributions-table-container">
              <table className="badge-attributions-table">
                <thead>
                  <tr>
                    <th>Contexte</th>
                    <th>Attribué à</th>
                    <th>Attribué par</th>
                    <th>Commentaire</th>
                    <th>Preuve</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {attributions.map((attribution) => (
                    <tr key={attribution.id}>
                      <td>
                        {attribution.event ? (
                          <span className="badge-pill" style={{ background: '#eef2ff', color: '#312e81', borderRadius: '999px', padding: '6px 10px' }}>
                            Événement · {attribution.event.title}
                          </span>
                        ) : attribution.project ? (
                          <span className="badge-pill" style={{ background: '#eef2ff', color: 'var(--primary)', borderRadius: '999px', padding: '6px 10px' }}>
                            Projet · {attribution.project.title}
                          </span>
                        ) : (
                          <span className="badge-pill badge-muted">Non lié</span>
                        )}
                      </td>
                      <td>
                        <div className="person-cell">
                          <span className="person-name">{attribution.receiver.full_name}</span>
                          {attribution.receiver.email && (
                            <span className="person-email">{attribution.receiver.email}</span>
                          )}
                        </div>
                      </td>
                      <td>
                        <div className="person-cell">
                          <span className="person-name">{attribution.sender.full_name}</span>
                          {attribution.sender.email && (
                            <span className="person-email">{attribution.sender.email}</span>
                          )}
                        </div>
                      </td>
                      <td>
                        {attribution.comment ? (
                          <span className="" title={attribution.comment}>{attribution.comment}</span>
                        ) : (
                          <span className="no-comment">-</span>
                        )}
                      </td>
                      <td>
                        {attribution.documents && attribution.documents.length > 0 ? (
                          <div className="proof-files">
                            {attribution.documents.map((doc, index) => (
                              doc.url ? (
                                <a
                                  key={index}
                                  href={doc.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="proof-file-link"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <i className="fas fa-file"></i>
                                  {doc.name}
                                </a>
                              ) : (
                                <span key={index} className="proof-file-name">
                                  <i className="fas fa-file"></i>
                                  {doc.name} ({doc.size})
                                </span>
                              )
                            ))}
                          </div>
                        ) : (
                          <span className="no-proof">-</span>
                        )}
                      </td>
                      <td>
                        <span className="date-text">{formatDate(attribution.assigned_at)}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Loading indicator for initial load */}
          {isLoading && (
            <div className="badge-attributions-loading">
              <i className="fas fa-spinner fa-spin"></i>
              <p>Chargement des attributions...</p>
            </div>
          )}

          {/* Infinite scroll trigger */}
          {!isLoading && hasMore && (
            <div ref={observerTargetRef} className="badge-attributions-load-more-trigger">
              {isLoadingMore && (
                <div className="badge-attributions-loading-more">
                  <i className="fas fa-spinner fa-spin"></i>
                  <span>Chargement...</span>
                </div>
              )}
            </div>
          )}

        </div>

        <div className="modal-footer">
          <button className="btn btn-primary" onClick={onClose}>
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};

export default BadgeAttributionsModal;

