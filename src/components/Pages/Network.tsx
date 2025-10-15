import React, { useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import OrganizationCard from '../Network/OrganizationCard';
import PartnershipModal from '../Modals/PartnershipModal';
import AttachOrganizationModal from '../Modals/AttachOrganizationModal';
import './Network.css';

interface Organization {
  id: string;
  name: string;
  type: 'sub-organization' | 'partner';
  description: string;
  members: number;
  location: string;
  website?: string;
  logo?: string;
  status: 'active' | 'pending' | 'inactive';
  joinedDate: string;
  contactPerson: string;
  email: string;
}

const Network: React.FC = () => {
  const { state } = useAppContext();
  const [isPartnershipModalOpen, setIsPartnershipModalOpen] = useState(false);
  const [isAttachModalOpen, setIsAttachModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<'all' | 'sub-organization' | 'partner'>('all');

  // Mock organizations data
  const organizations: Organization[] = [
    {
      id: '1',
      name: 'Lycée Victor Hugo',
      type: 'sub-organization',
      description: 'Établissement scolaire partenaire pour les projets éducatifs',
      members: 45,
      location: 'Paris, France',
      website: 'https://lycee-victor-hugo.fr',
      status: 'active',
      joinedDate: '2023-09-01',
      contactPerson: 'Marie Dubois',
      email: 'marie.dubois@lycee-victor-hugo.fr'
    },
    {
      id: '2',
      name: 'TechCorp Solutions',
      type: 'partner',
      description: 'Entreprise technologique spécialisée dans l\'innovation numérique',
      members: 12,
      location: 'Lyon, France',
      website: 'https://techcorp.fr',
      status: 'active',
      joinedDate: '2023-11-15',
      contactPerson: 'Lucas Bernard',
      email: 'lucas.bernard@techcorp.fr'
    },
    {
      id: '3',
      name: 'Association ÉcoCitoyen',
      type: 'sub-organization',
      description: 'Association environnementale pour la sensibilisation écologique',
      members: 28,
      location: 'Marseille, France',
      status: 'pending',
      joinedDate: '2024-01-10',
      contactPerson: 'Sophie Martin',
      email: 'sophie.martin@ecocitoyen.org'
    }
  ];

  const filteredOrganizations = organizations.filter(org => {
    const matchesSearch = org.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         org.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         org.location.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = selectedType === 'all' || org.type === selectedType;
    return matchesSearch && matchesType;
  });

  const handlePartnershipProposal = () => {
    setIsPartnershipModalOpen(true);
  };

  const handleAttachRequest = () => {
    setIsAttachModalOpen(true);
  };

  const handleSavePartnership = (partnershipData: any) => {
    // TODO: Implement partnership creation
    console.log('Save partnership:', partnershipData);
    setIsPartnershipModalOpen(false);
  };

  const handleSaveAttachRequest = (attachData: any) => {
    // TODO: Implement attach request
    console.log('Save attach request:', attachData);
    setIsAttachModalOpen(false);
  };

  const subOrganizations = filteredOrganizations.filter(org => org.type === 'sub-organization');
  const partners = filteredOrganizations.filter(org => org.type === 'partner');

  return (
    <section className="network-container with-sidebar">
      {/* Section Title + Actions */}
      <div className="section-title-row">
        <div className="section-title-left">
          <img src="/icons_logo/Icon=Reseau.svg" alt="Mon réseau Kinship" className="section-icon" />
          <h2>Mon réseau Kinship</h2>
        </div>
        <div className="network-actions">
          <button className="btn btn-outline" onClick={handlePartnershipProposal}>
            <i className="fas fa-handshake"></i> Proposer un partenariat
          </button>
          <button className="btn btn-primary" onClick={handleAttachRequest}>
            <i className="fas fa-link"></i> Demander un rattachement
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="network-search-container">
        <div className="search-bar">
          <i className="fas fa-search search-icon"></i>
          <input
            type="text"
            className="search-input"
            placeholder="Rechercher une organisation par nom, compétence..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button className="filter-toggle-btn inline">
          <i className="fas fa-filter"></i> Filtres
        </button>
      </div>

      {/* Network Summary Cards */}
      <div className="network-summary">
        <div className="summary-card">
          <div className="summary-icon">
            <img src="/icons_logo/Icon=Tableau de bord.svg" alt="Sous-organisations" className="summary-icon-img" />
          </div>
          <div className="summary-content">
            <h3>{subOrganizations.length}</h3>
            <p>Sous-organisations</p>
          </div>
        </div>
        <div className="summary-card">
          <div className="summary-icon">
            <img src="/icons_logo/Icon=Reseau.svg" alt="Partenaires" className="summary-icon-img" />
          </div>
          <div className="summary-content">
            <h3>{partners.length}</h3>
            <p>Partenaires</p>
          </div>
        </div>
        <div className="summary-card">
          <div className="summary-icon">
            <img src="/icons_logo/Icon=Membres.svg" alt="Membres actifs" className="summary-icon-img" />
          </div>
          <div className="summary-content">
            <h3>{organizations.reduce((sum, org) => sum + org.members, 0)}</h3>
            <p>Membres actifs</p>
          </div>
        </div>
      </div>

      {/* Type Filter */}
      <div className="network-filters">
        <div className="filter-tabs">
          <button 
            className={`filter-tab ${selectedType === 'all' ? 'active' : ''}`}
            onClick={() => setSelectedType('all')}
          >
            Toutes ({organizations.length})
          </button>
          <button 
            className={`filter-tab ${selectedType === 'sub-organization' ? 'active' : ''}`}
            onClick={() => setSelectedType('sub-organization')}
          >
            Sous-organisations ({subOrganizations.length})
          </button>
          <button 
            className={`filter-tab ${selectedType === 'partner' ? 'active' : ''}`}
            onClick={() => setSelectedType('partner')}
          >
            Partenaires ({partners.length})
          </button>
        </div>
      </div>

      {/* Organizations List */}
      <div className="organizations-list">
        {filteredOrganizations.map((organization) => (
          <OrganizationCard
            key={organization.id}
            organization={organization}
            onEdit={() => console.log('Edit organization:', organization.id)}
            onDelete={() => console.log('Delete organization:', organization.id)}
          />
        ))}
      </div>

      {/* Partnership Modal */}
      {isPartnershipModalOpen && (
        <PartnershipModal
          onClose={() => setIsPartnershipModalOpen(false)}
          onSave={handleSavePartnership}
        />
      )}

      {/* Attach Organization Modal */}
      {isAttachModalOpen && (
        <AttachOrganizationModal
          onClose={() => setIsAttachModalOpen(false)}
          onSave={handleSaveAttachRequest}
        />
      )}
    </section>
  );
};

export default Network;
