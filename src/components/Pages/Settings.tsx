import React, { useState } from 'react';
import SubscriptionManagement from '../Settings/SubscriptionManagement';
import UserManagement from '../Settings/UserManagement';
import './Settings.css';

const Settings: React.FC = () => {
  // const { state } = useAppContext();
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
      </div>
    </section>
  );
};

export default Settings;
