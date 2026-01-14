import React, { useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import ProfileSection from '../Settings/ProfileSection';
import SecuritySection from '../Settings/SecuritySection';
import SkillsAvailabilitySection from '../Settings/SkillsAvailabilitySection';
import ProfessionSection from '../Settings/ProfessionSection';
import OrganizationsSection from '../Settings/OrganizationsSection';
import RoleSection from '../Settings/RoleSection';
import DeleteAccountSection from '../Settings/DeleteAccountSection';
import './PersonalSettings.css';

const PersonalSettings: React.FC = () => {
  const { state } = useAppContext();
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'skills' | 'profession' | 'organizations' | 'role' | 'delete'>('profile');

  return (
    <section className="personal-settings-container with-sidebar">
      <div className="personal-settings-content">
        <div className="personal-settings-header">
          <h1>Paramètres personnels</h1>
          <p>Gérez vos informations personnelles et préférences</p>
        </div>

        <div className="personal-settings-tabs">
          <button 
            className={`tab-button ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => setActiveTab('profile')}
          >
            <i className="fas fa-user"></i> Profil
          </button>
          <button 
            className={`tab-button ${activeTab === 'security' ? 'active' : ''}`}
            onClick={() => setActiveTab('security')}
          >
            <i className="fas fa-lock"></i> Sécurité
          </button>
          <button 
            className={`tab-button ${activeTab === 'skills' ? 'active' : ''}`}
            onClick={() => setActiveTab('skills')}
          >
            <i className="fas fa-tasks"></i> Compétences & Disponibilités
          </button>
          <button 
            className={`tab-button ${activeTab === 'profession' ? 'active' : ''}`}
            onClick={() => setActiveTab('profession')}
          >
            <i className="fas fa-briefcase"></i> Profession & Offres de stage
          </button>
          <button 
            className={`tab-button ${activeTab === 'organizations' ? 'active' : ''}`}
            onClick={() => setActiveTab('organizations')}
          >
            <i className="fas fa-building"></i> Organisations
          </button>
          {state.showingPageType === 'user' && (
            <button 
              className={`tab-button ${activeTab === 'role' ? 'active' : ''}`}
              onClick={() => setActiveTab('role')}
            >
              <i className="fas fa-user-tag"></i> Rôle
            </button>
          )}
          <button 
            className={`tab-button ${activeTab === 'delete' ? 'active' : ''}`}
            onClick={() => setActiveTab('delete')}
          >
            <i className="fas fa-trash"></i> Supprimer le compte
          </button>
        </div>

        <div className="personal-settings-tab-content">
          {activeTab === 'profile' && (
            <div className="settings-section">
              <ProfileSection />
            </div>
          )}
          {activeTab === 'security' && (
            <div className="settings-section">
              <SecuritySection />
            </div>
          )}
          {activeTab === 'skills' && (
            <div className="settings-section">
              <SkillsAvailabilitySection />
            </div>
          )}
          {activeTab === 'profession' && (
            <div className="settings-section">
              <ProfessionSection />
            </div>
          )}
          {activeTab === 'organizations' && (
            <div className="settings-section">
              <OrganizationsSection />
            </div>
          )}
          {activeTab === 'role' && state.showingPageType === 'user' && (
            <div className="settings-section">
              <RoleSection />
            </div>
          )}
          {activeTab === 'delete' && (
            <div className="settings-section">
              <DeleteAccountSection />
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default PersonalSettings;

