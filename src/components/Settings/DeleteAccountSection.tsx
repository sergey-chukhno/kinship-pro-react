import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAppContext } from '../../context/AppContext';
import { getPersonalUserOrganizations } from '../../api/Projects';
import { transferSuperadminRole, deleteAccount, getEligibleSchoolAdmins, getEligibleCompanyAdmins } from '../../api/UserDashBoard/Profile';
import { useToast } from '../../hooks/useToast';
import { useNavigate } from 'react-router-dom';
import AvatarImage from '../UI/AvatarImage';
import { translateRole } from '../../utils/roleTranslations';
import './DeleteAccountSection.css';

interface Organization {
  id: number;
  name: string;
  type: 'School' | 'Company';
  role: string;
}

interface EligibleUser {
  id: number;
  full_name: string;
  first_name: string;
  last_name: string;
  email: string;
  role_in_school?: string;
  role_in_company?: string;
  avatar_url?: string | null;
}

const DeleteAccountSection: React.FC = () => {
  const { } = useAppContext();
  const { showSuccess, showError } = useToast();
  const navigate = useNavigate();
  
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [selectedUser, setSelectedUser] = useState<EligibleUser | null>(null);
  
  // Eligible users state
  const [eligibleUsers, setEligibleUsers] = useState<EligibleUser[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [usersError, setUsersError] = useState<string | null>(null);
  const observerTargetRef = useRef<HTMLDivElement>(null);
  const perPage = 20;
  
  const [isTransferring, setIsTransferring] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmationText, setConfirmationText] = useState('');

  useEffect(() => {
    loadSuperadminOrganizations();
  }, []);

  const loadSuperadminOrganizations = async () => {
    setIsLoading(true);
    try {
      const response = await getPersonalUserOrganizations();
      const schools = (response.data.schools || []).filter((s: any) => s.my_role === 'superadmin');
      const companies = (response.data.companies || []).filter((c: any) => c.my_role === 'superadmin');
      
      const orgs: Organization[] = [
        ...schools.map((s: any) => ({ id: s.id, name: s.name, type: 'School' as const, role: s.my_role })),
        ...companies.map((c: any) => ({ id: c.id, name: c.name, type: 'Company' as const, role: c.my_role })),
      ];
      
      setOrganizations(orgs);
    } catch (error) {
      console.error('Error loading organizations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (showTransferModal && selectedOrg) {
      // Reset state when modal opens
      setEligibleUsers([]);
      setSearchQuery('');
      setDebouncedSearchQuery('');
      setCurrentPage(1);
      setHasMore(true);
      setSelectedUser(null);
      setUsersError(null);
    } else if (!showTransferModal) {
      // Clean up when modal closes
      setEligibleUsers([]);
      setSearchQuery('');
      setDebouncedSearchQuery('');
      setCurrentPage(1);
      setHasMore(true);
      setSelectedUser(null);
      setUsersError(null);
    }
  }, [showTransferModal, selectedOrg]);

  // Fetch eligible users
  const fetchEligibleUsers = useCallback(async (page: number, append: boolean = false) => {
    if (!selectedOrg) return;

    const loadingState = append ? setIsLoadingMore : setIsLoadingUsers;
    loadingState(true);
    setUsersError(null);

    try {
      const response = selectedOrg.type === 'School'
        ? await getEligibleSchoolAdmins(selectedOrg.id, page, perPage, debouncedSearchQuery || undefined)
        : await getEligibleCompanyAdmins(selectedOrg.id, page, perPage, debouncedSearchQuery || undefined);

      const users = response.data?.data || [];
      const meta = response.data?.meta || {};
      const totalPages = meta.total_pages || 1;

      if (append) {
        // Append to existing users, avoiding duplicates
        setEligibleUsers(prev => {
          const existingIds = new Set(prev.map(u => u.id));
          const newUsers = users.filter((u: EligibleUser) => !existingIds.has(u.id));
          return [...prev, ...newUsers];
        });
      } else {
        // Replace users
        setEligibleUsers(users);
      }

      setHasMore(page < totalPages);
      setCurrentPage(page);
    } catch (error: any) {
      console.error('Error fetching eligible users:', error);
      setUsersError('Erreur lors du chargement des utilisateurs éligibles');
      setHasMore(false);
    } finally {
      loadingState(false);
    }
  }, [selectedOrg, debouncedSearchQuery, perPage]);

  // Initial load when modal opens or search changes
  useEffect(() => {
    if (showTransferModal && selectedOrg) {
      setCurrentPage(1);
      setHasMore(true);
      fetchEligibleUsers(1, false);
    }
  }, [showTransferModal, selectedOrg, debouncedSearchQuery, fetchEligibleUsers]);

  // Infinite scroll observer
  useEffect(() => {
    if (!showTransferModal || !hasMore || isLoadingUsers || isLoadingMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoadingMore) {
          fetchEligibleUsers(currentPage + 1, true);
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
  }, [showTransferModal, hasMore, isLoadingUsers, isLoadingMore, currentPage, fetchEligibleUsers]);

  const handleTransferClick = (org: Organization) => {
    setSelectedOrg(org);
    setShowTransferModal(true);
  };

  const handleTransfer = async () => {
    if (!selectedOrg || !selectedUser) {
      showError('Veuillez sélectionner un nouvel administrateur');
      return;
    }

    setIsTransferring(true);
    try {
      await transferSuperadminRole(selectedOrg.type, selectedOrg.id, selectedUser.id);
      showSuccess('Rôle de superadmin transféré avec succès');
      setShowTransferModal(false);
      setSelectedOrg(null);
      setSelectedUser(null);
      await loadSuperadminOrganizations();
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.response?.data?.error || 'Erreur lors du transfert';
      showError(errorMessage);
    } finally {
      setIsTransferring(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (confirmationText !== 'SUPPRIMER') {
      showError('Veuillez taper "SUPPRIMER" pour confirmer');
      return;
    }

    if (organizations.length > 0) {
      showError('Veuillez transférer tous vos rôles de superadmin avant de supprimer votre compte');
      return;
    }

    if (!window.confirm('Êtes-vous absolument sûr de vouloir supprimer votre compte ? Cette action est irréversible.')) {
      return;
    }

    setIsDeleting(true);
    try {
      await deleteAccount();
      showSuccess('Compte supprimé avec succès');
      // Redirect to login after a delay
      setTimeout(() => {
        navigate('/login');
        window.location.reload();
      }, 2000);
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.response?.data?.error || 'Erreur lors de la suppression du compte';
      showError(errorMessage);
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return <div className="loading-container">Chargement...</div>;
  }

  return (
    <div className="delete-account-section">
      <div className="danger-zone">
        <h3>Zone de danger</h3>
        <p className="section-description">
          La suppression de votre compte est irréversible. Toutes vos données seront supprimées après 90 jours.
        </p>

        {organizations.length > 0 && (
          <div className="superadmin-warning">
            <h4>
              <i className="fas fa-exclamation-triangle"></i>
              Transfert de rôle requis
            </h4>
            <p>
              Vous êtes superadmin des organisations suivantes. Vous devez transférer votre rôle de superadmin avant de pouvoir supprimer votre compte.
            </p>
            <div className="organizations-list">
              {organizations.map((org) => (
                <div key={`${org.type}-${org.id}`} className="org-item">
                  <div className="org-info">
                    <span className="org-name">{org.name}</span>
                    <span className="org-type">{org.type === 'School' ? 'École' : 'Entreprise'}</span>
                  </div>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={() => handleTransferClick(org)}
                  >
                    Transférer le rôle
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="delete-form">
          <h4>Supprimer mon compte</h4>
          <p>
            Pour confirmer la suppression, tapez <strong>SUPPRIMER</strong> dans le champ ci-dessous.
          </p>
          <div className="form-group">
            <input
              type="text"
              className="form-input"
              placeholder="SUPPRIMER"
              value={confirmationText}
              onChange={(e) => setConfirmationText(e.target.value)}
            />
          </div>
          <button
            type="button"
            className="btn btn-danger"
            onClick={handleDeleteAccount}
            disabled={isDeleting || confirmationText !== 'SUPPRIMER' || organizations.length > 0}
          >
            {isDeleting ? 'Suppression...' : 'Supprimer mon compte'}
          </button>
        </div>
      </div>

      {/* Transfer Modal */}
      {showTransferModal && selectedOrg && (
        <div className="modal-overlay" onClick={() => setShowTransferModal(false)}>
          <div className="modal-content transfer-modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Transférer le rôle de superadmin</h3>
            <p>
              Transférez votre rôle de superadmin pour <strong>{selectedOrg.name}</strong> à un autre administrateur.
            </p>

            {/* Search Input */}
            <div className="form-group">
              <label htmlFor="userSearch">Rechercher un administrateur</label>
              <input
                type="text"
                id="userSearch"
                className="user-search-input"
                placeholder="Rechercher par nom ou email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Users List */}
            <div className="users-list-container">
              {isLoadingUsers && eligibleUsers.length === 0 ? (
                <div className="users-list-loading">
                  <i className="fas fa-spinner fa-spin"></i>
                  <p>Chargement des administrateurs...</p>
                </div>
              ) : usersError ? (
                <div className="users-list-error">
                  <i className="fas fa-exclamation-circle"></i>
                  <p>{usersError}</p>
                </div>
              ) : eligibleUsers.length === 0 ? (
                <div className="users-list-empty">
                  <i className="fas fa-users"></i>
                  <p>Aucun administrateur éligible trouvé</p>
                </div>
              ) : (
                <>
                  {eligibleUsers.map((user) => (
                    <div
                      key={user.id}
                      className={`user-item ${selectedUser?.id === user.id ? 'selected' : ''}`}
                      onClick={() => setSelectedUser(user)}
                    >
                      <AvatarImage
                        src={user.avatar_url}
                        alt={user.full_name}
                        className="user-avatar"
                      />
                      <div className="user-info">
                        <span className="user-name">{user.full_name}</span>
                        <span className="user-email">{user.email}</span>
                        <span className="user-role-badge">
                          {translateRole(user.role_in_school || user.role_in_company || 'member')}
                        </span>
                      </div>
                      {selectedUser?.id === user.id && (
                        <i className="fas fa-check-circle user-selected-icon"></i>
                      )}
                    </div>
                  ))}
                  
                  {/* Infinite scroll trigger */}
                  {hasMore && (
                    <div ref={observerTargetRef} className="users-list-load-more-trigger">
                      {isLoadingMore && (
                        <div className="users-list-loading-more">
                          <i className="fas fa-spinner fa-spin"></i>
                          <span>Chargement...</span>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Selected User Display */}
            {selectedUser && (
              <div className="selected-user-display">
                <div className="selected-user-info">
                  <AvatarImage
                    src={selectedUser.avatar_url}
                    alt={selectedUser.full_name}
                    className="selected-user-avatar"
                  />
                  <div>
                    <strong>{selectedUser.full_name}</strong>
                    <span className="selected-user-email">{selectedUser.email}</span>
                  </div>
                </div>
              </div>
            )}

            <div className="modal-actions">
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => {
                  setShowTransferModal(false);
                  setSelectedOrg(null);
                  setSelectedUser(null);
                }}
              >
                Annuler
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleTransfer}
                disabled={isTransferring || !selectedUser}
              >
                {isTransferring ? 'Transfert...' : 'Transférer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeleteAccountSection;

