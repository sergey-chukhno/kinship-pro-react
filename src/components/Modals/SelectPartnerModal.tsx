import React, { useCallback, useEffect, useState } from 'react';
import { searchOrganizations } from '../../api/RegistrationRessource';
import './Modal.css';

export interface SelectPartnerOrganization {
  id: string;
  name: string;
  type: 'schools' | 'companies';
  description: string;
  members_count: number;
  location: string;
  website?: string;
  logo?: string;
  status: 'active' | 'pending' | 'inactive';
  joinedDate: string;
  contactPerson: string;
  email: string;
}

interface SelectPartnerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPartner: (organization: SelectPartnerOrganization) => void;
  onViewAllResults: (searchTerm: string) => void;
}

const DEBOUNCE_MS = 300;

function mapSchoolToOrg(school: any): SelectPartnerOrganization {
  return {
    id: String(school.id),
    name: school.name || 'Établissement scolaire',
    type: 'schools',
    description: `${school.school_type || 'Établissement scolaire'} - ${school.city || ''} ${school.zip_code ? `(${school.zip_code})` : ''}`.trim(),
    members_count: school.members_count || 0,
    location: school.city && school.zip_code ? `${school.city}, ${school.zip_code}` : school.city || school.zip_code || '',
    logo: school.logo_url || undefined,
    status: school.status === 'confirmed' ? 'active' : 'pending',
    joinedDate: '',
    contactPerson: '',
    email: school.email || '',
  };
}

function mapCompanyToOrg(company: any): SelectPartnerOrganization {
  return {
    id: String(company.id),
    name: company.name || 'Organisation',
    type: 'companies',
    description: `${company.city || ''} ${company.zip_code ? `(${company.zip_code})` : ''}`.trim() || 'Organisation',
    members_count: company.members_count || 0,
    location: company.city && company.zip_code ? `${company.city}, ${company.zip_code}` : company.city || company.zip_code || '',
    logo: company.logo_url || undefined,
    status: company.status === 'confirmed' ? 'active' : 'pending',
    joinedDate: '',
    contactPerson: '',
    email: company.email || '',
  };
}

const SelectPartnerModal: React.FC<SelectPartnerModalProps> = ({
  isOpen,
  onClose,
  onSelectPartner,
  onViewAllResults,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedTerm, setDebouncedTerm] = useState('');
  const [results, setResults] = useState<SelectPartnerOrganization[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const t = setTimeout(() => setDebouncedTerm(searchTerm.trim()), DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [searchTerm, isOpen]);

  const fetchSearch = useCallback(async (q: string) => {
    if (!q) {
      setResults([]);
      setHasSearched(false);
      return;
    }
    setLoading(true);
    setError(null);
    setHasSearched(true);
    try {
      const response = await searchOrganizations({ q, page: 1, per_page: 50 });
      const data = response?.data ?? {};
      const schools = Array.isArray(data.schools) ? data.schools : [];
      const companies = Array.isArray(data.companies) ? data.companies : [];
      const list = [
        ...schools.map(mapSchoolToOrg),
        ...companies.map(mapCompanyToOrg),
      ];
      setResults(list);
    } catch (err: any) {
      console.error('SelectPartnerModal search error:', err);
      setError(err?.response?.data?.message || err?.message || 'Erreur lors de la recherche');
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    if (!debouncedTerm) {
      setResults([]);
      setHasSearched(false);
      setLoading(false);
      return;
    }
    fetchSearch(debouncedTerm);
  }, [isOpen, debouncedTerm, fetchSearch]);

  const handleSelect = (org: SelectPartnerOrganization) => {
    onSelectPartner(org);
    onClose();
  };

  const handleViewAll = () => {
    onViewAllResults(searchTerm.trim());
    onClose();
  };

  const showViewAllLink = hasSearched && !loading && searchTerm.trim() !== '';

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '560px' }}>
        <div className="modal-header">
          <h2>Sélectionner un partenaire</h2>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Fermer">
            <i className="fas fa-times"></i>
          </button>
        </div>
        <div className="modal-body">
          <p style={{ marginBottom: '12px', fontWeight: 600, color: 'var(--text-primary, #374151)' }}>
            Rechercher une organisation pour lui envoyer une demande de partenariat
          </p>
          <input
            type="text"
            className="form-input"
            placeholder="Rechercher un établissement ou une organisation..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: '100%', marginBottom: '16px' }}
            autoFocus
          />
          {loading && (
            <p style={{ textAlign: 'center', padding: '1rem', color: '#6b7280' }}>Recherche en cours…</p>
          )}
          {error && (
            <p style={{ color: '#dc2626', padding: '0 0 1rem', margin: 0 }}>{error}</p>
          )}
          {!loading && !error && searchTerm.trim() && results.length === 0 && hasSearched && (
            <p style={{ textAlign: 'center', padding: '1rem', color: '#6b7280' }}>Aucun résultat trouvé.</p>
          )}
          {!loading && !error && results.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '50vh', overflowY: 'auto', marginBottom: '16px' }}>
              {results.map((org) => (
                <button
                  key={`${org.type}-${org.id}`}
                  type="button"
                  onClick={() => handleSelect(org)}
                  style={{
                    display: 'block',
                    textAlign: 'left',
                    padding: '12px 16px',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    background: '#fff',
                    cursor: 'pointer',
                    fontSize: '0.9375rem',
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.background = '#f3f4f6';
                    e.currentTarget.style.borderColor = '#3b82f6';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.background = '#fff';
                    e.currentTarget.style.borderColor = '#e5e7eb';
                  }}
                >
                  <span style={{ fontWeight: 600 }}>{org.name}</span>
                  <span style={{ display: 'block', fontSize: '0.875rem', color: '#6b7280', marginTop: '4px' }}>
                    {org.type === 'schools' ? 'Établissement scolaire' : 'Organisation'}
                    {org.location ? ` • ${org.location}` : ''}
                  </span>
                </button>
              ))}
            </div>
          )}
          {showViewAllLink && (
            <p style={{ marginTop: '8px', marginBottom: 0 }}>
              <button
                type="button"
                onClick={handleViewAll}
                className="btn btn-link"
                style={{ padding: 0, fontSize: '0.875rem', textDecoration: 'underline', color: 'var(--primary, #5570F1)' }}
              >
                Voir tous les résultats de votre recherche sur la page Kinship
              </button>
            </p>
          )}
        </div>
        <div className="modal-footer">
          <button type="button" className="btn btn-outline" onClick={onClose}>
            Annuler
          </button>
        </div>
      </div>
    </div>
  );
};

export default SelectPartnerModal;
