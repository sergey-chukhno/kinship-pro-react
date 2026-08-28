import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../../context/AppContext';
import SubscriptionManagement from '../Settings/SubscriptionManagement';
import UserManagement from '../Settings/UserManagement';
import './Settings.css';

const Settings: React.FC = () => {
  const { setCurrentPage } = useAppContext();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'users' | 'subscription'>('users');

  const handleTabChange = (tab: 'users' | 'subscription') => {
    setActiveTab(tab);
  };

  return (
    <section className="settings-container with-sidebar">
      <div className="settings-content">
        <div className="settings-header">
          <h1>Paramètres</h1>
          <p>Gérez les utilisateurs et votre abonnement</p>
        </div>

        <div className="settings-tabs">
          <button
            className={`tab-button ${activeTab === 'users' ? 'active' : ''}`}
            onClick={() => handleTabChange('users')}
          >
            <i className="fas fa-users"></i> Utilisateurs
          </button>
          <button
            className={`tab-button ${activeTab === 'subscription' ? 'active' : ''}`}
            onClick={() => handleTabChange('subscription')}
          >
            <i className="fas fa-credit-card"></i> Gestion des abonnements
          </button>
        </div>

        <div className="settings-tab-content">
          {activeTab === 'users' && <UserManagement />}
          {activeTab === 'subscription' && <SubscriptionManagement />}
        </div>

        <div className="settings-internal">
          <h2>Outil interne Kinship</h2>
          <p>
            File Super Admin — dossiers d’activation OF : vérification aux sources officielles, puis
            décision humaine. Les pièces déposées se téléchargent.
          </p>
          <button
            type="button"
            className="tab-button"
            onClick={() => {
              setCurrentPage('admin-of-queue');
              navigate('/admin-of-queue');
            }}
          >
            Dossiers d’activation à traiter →
          </button>
        </div>
      </div>
    </section>
  );
};

export default Settings;
