import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../context/AppContext';
import { getPersonalUserOrganizations } from '../../api/Projects';
import { transferSuperadminRole, deleteAccount } from '../../api/UserDashBoard/Profile';
import { useToast } from '../../hooks/useToast';
import { useNavigate } from 'react-router-dom';
import './DeleteAccountSection.css';

interface Organization {
  id: number;
  name: string;
  type: 'School' | 'Company';
  role: string;
}

const DeleteAccountSection: React.FC = () => {
  const { state } = useAppContext();
  const { showSuccess, showError } = useToast();
  const navigate = useNavigate();
  
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [newSuperadminId, setNewSuperadminId] = useState<number | null>(null);
  const [availableAdmins, setAvailableAdmins] = useState<Array<{ id: number; name: string }>>([]);
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

  const handleTransferClick = (org: Organization) => {
    setSelectedOrg(org);
    setShowTransferModal(true);
    // TODO: Load available admins for this organization
    // For now, we'll use a simple input
    setAvailableAdmins([]);
  };

  const handleTransfer = async () => {
    if (!selectedOrg || !newSuperadminId) {
      showError('Veuillez sélectionner un nouvel administrateur');
      return;
    }

    setIsTransferring(true);
    try {
      await transferSuperadminRole(selectedOrg.type, selectedOrg.id, newSuperadminId);
      showSuccess('Rôle de superadmin transféré avec succès');
      setShowTransferModal(false);
      setSelectedOrg(null);
      setNewSuperadminId(null);
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
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Transférer le rôle de superadmin</h3>
            <p>
              Transférez votre rôle de superadmin pour <strong>{selectedOrg.name}</strong> à un autre administrateur.
            </p>
            <div className="form-group">
              <label htmlFor="newSuperadminId">ID de l'utilisateur qui recevra le rôle</label>
              <input
                type="number"
                id="newSuperadminId"
                className="form-input"
                placeholder="ID utilisateur"
                value={newSuperadminId || ''}
                onChange={(e) => setNewSuperadminId(Number(e.target.value) || null)}
              />
              <small className="form-hint">
                Entrez l'ID de l'utilisateur qui doit recevoir le rôle de superadmin. Cet utilisateur doit être un administrateur confirmé de l'organisation.
              </small>
            </div>
            <div className="modal-actions">
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => {
                  setShowTransferModal(false);
                  setSelectedOrg(null);
                  setNewSuperadminId(null);
                }}
              >
                Annuler
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleTransfer}
                disabled={isTransferring || !newSuperadminId}
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

