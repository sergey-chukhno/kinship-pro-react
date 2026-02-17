import React, { useState, useEffect } from 'react';
import { getSchools } from '../../api/RegistrationRessource';
import { getCompanies } from '../../api/RegistrationRessource';
import { createTeacherPartnershipRequest, CreateTeacherPartnershipRequestPayload } from '../../api/Projects';
import { useToast } from '../../hooks/useToast';
import './Modal.css';

/** Organisation partenaire pré-remplie (carte sur laquelle l'utilisateur a cliqué) */
export interface InitialPartnerOrganization {
  id: string;
  name: string;
  type: 'schools' | 'companies';
}

interface TeacherPartnershipRequestModalProps {
  onClose: () => void;
  onSuccess: () => void;
  schoolId: number;
  schoolName: string;
  /** Si fourni, pré-remplit le partenaire et le nom du partenariat (ouverture depuis une carte) */
  initialPartnerOrganization?: InitialPartnerOrganization | null;
}

const TeacherPartnershipRequestModal: React.FC<TeacherPartnershipRequestModalProps> = ({
  onClose,
  onSuccess,
  schoolId,
  schoolName,
  initialPartnerOrganization,
}) => {
  const { showSuccess, showError } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    partnership_type: 'bilateral',
    share_projects: true,
    share_members: false,
  });
  const [partnerSchoolIds, setPartnerSchoolIds] = useState<number[]>([]);
  const [partnerCompanyIds, setPartnerCompanyIds] = useState<number[]>([]);

  // School search for partners
  const [schoolSearchQuery, setSchoolSearchQuery] = useState('');
  const [schoolSearchResults, setSchoolSearchResults] = useState<Array<{ id: number; name: string; city?: string }>>([]);
  const [schoolSearching, setSchoolSearching] = useState(false);
  const [selectedPartnerSchools, setSelectedPartnerSchools] = useState<Array<{ id: number; name: string }>>([]);

  // Company search for partners
  const [companySearchQuery, setCompanySearchQuery] = useState('');
  const [companySearchResults, setCompanySearchResults] = useState<Array<{ id: number; name: string; city?: string }>>([]);
  const [companySearching, setCompanySearching] = useState(false);
  const [selectedPartnerCompanies, setSelectedPartnerCompanies] = useState<Array<{ id: number; name: string }>>([]);

  // Pré-remplir partenaire et nom quand on ouvre depuis une carte (initialPartnerOrganization)
  useEffect(() => {
    if (!initialPartnerOrganization) return;
    const id = parseInt(initialPartnerOrganization.id, 10);
    if (Number.isNaN(id)) return;
    if (initialPartnerOrganization.type === 'schools') {
      setPartnerSchoolIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
      setSelectedPartnerSchools((prev) => (prev.some((s) => s.id === id) ? prev : [...prev, { id, name: initialPartnerOrganization.name }]));
    } else {
      setPartnerCompanyIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
      setSelectedPartnerCompanies((prev) => (prev.some((c) => c.id === id) ? prev : [...prev, { id, name: initialPartnerOrganization.name }]));
    }
    setFormData((prev) => ({
      ...prev,
      name: prev.name.trim() ? prev.name : `Partenariat ${schoolName} - ${initialPartnerOrganization.name}`,
    }));
  }, [initialPartnerOrganization, schoolName]);

  useEffect(() => {
    if (schoolSearchQuery.length < 2) {
      setSchoolSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setSchoolSearching(true);
      try {
        const response = await getSchools({ search: schoolSearchQuery, per_page: 20 });
        const data = response?.data?.data ?? response?.data ?? response ?? [];
        const list = Array.isArray(data) ? data : [];
        const mapped = list
          .filter((s: any) => s.id !== schoolId)
          .map((s: any) => ({ id: s.id, name: s.name, city: s.city }));
        setSchoolSearchResults(mapped);
      } catch {
        setSchoolSearchResults([]);
      } finally {
        setSchoolSearching(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [schoolSearchQuery, schoolId]);

  useEffect(() => {
    if (companySearchQuery.length < 2) {
      setCompanySearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setCompanySearching(true);
      try {
        const response = await getCompanies({ search: companySearchQuery });
        const data = response?.data?.data ?? response?.data ?? response ?? [];
        const list = Array.isArray(data) ? data : [];
        const mapped = list.map((c: any) => ({ id: c.id, name: c.name, city: c.city }));
        setCompanySearchResults(mapped);
      } catch {
        setCompanySearchResults([]);
      } finally {
        setCompanySearching(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [companySearchQuery]);

  const addPartnerSchool = (school: { id: number; name: string }) => {
    if (partnerSchoolIds.includes(school.id)) return;
    setPartnerSchoolIds((prev) => [...prev, school.id]);
    setSelectedPartnerSchools((prev) => [...prev, school]);
    setSchoolSearchQuery('');
    setSchoolSearchResults([]);
  };

  const removePartnerSchool = (id: number) => {
    setPartnerSchoolIds((prev) => prev.filter((x) => x !== id));
    setSelectedPartnerSchools((prev) => prev.filter((s) => s.id !== id));
  };

  const addPartnerCompany = (company: { id: number; name: string }) => {
    if (partnerCompanyIds.includes(company.id)) return;
    setPartnerCompanyIds((prev) => [...prev, company.id]);
    setSelectedPartnerCompanies((prev) => [...prev, company]);
    setCompanySearchQuery('');
    setCompanySearchResults([]);
  };

  const removePartnerCompany = (id: number) => {
    setPartnerCompanyIds((prev) => prev.filter((x) => x !== id));
    setSelectedPartnerCompanies((prev) => prev.filter((c) => c.id !== id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (partnerSchoolIds.length === 0 && partnerCompanyIds.length === 0) {
      showError('Sélectionnez au moins un partenaire (école ou entreprise)');
      return;
    }
    if (!formData.name.trim()) {
      showError('Le nom du partenariat est requis');
      return;
    }
    if (!formData.description.trim()) {
      showError('La description est requise');
      return;
    }

    setSubmitting(true);
    try {
      const payload: CreateTeacherPartnershipRequestPayload = {
        school_id: schoolId,
        partner_school_ids: partnerSchoolIds,
        partner_company_ids: partnerCompanyIds,
        partnership_type: formData.partnership_type,
        name: formData.name.trim(),
        description: formData.description.trim(),
        share_projects: formData.share_projects,
        share_members: formData.share_members,
      };
      await createTeacherPartnershipRequest(payload);
      showSuccess('Demande de partenariat envoyée. L\'établissement pourra la valider.');
      onSuccess();
      onClose();
    } catch (err: any) {
      const msg = err.response?.data?.message || err.response?.data?.error || err.message || 'Erreur lors de l\'envoi de la demande';
      showError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Demander un partenariat pour mon établissement</h2>
          <button type="button" className="modal-close" onClick={onClose}>
            <i className="fas fa-times"></i>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="modal-body">
          <p className="form-group" style={{ marginBottom: '1rem' }}>
            Établissement concerné : <strong>{schoolName}</strong>
          </p>

          {/* Partenaire pré-rempli (depuis la carte) : affichage en lecture seule, soit établissement soit entreprise */}
          {initialPartnerOrganization ? (
            <div className="form-group">
              <label>
                {initialPartnerOrganization.type === 'schools' ? 'Établissement partenaire' : 'Entreprise partenaire'}
              </label>
              <div
                style={{
                  padding: '0.75rem 1rem',
                  background: '#f3f4f6',
                  borderRadius: '8px',
                  border: '1px solid #e5e7eb',
                  fontWeight: 600,
                  color: '#1f2937',
                }}
              >
                {initialPartnerOrganization.name}
              </div>
            </div>
          ) : (
            <>
              <div className="form-group">
                <label>Écoles partenaires *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Rechercher une école..."
                  value={schoolSearchQuery}
                  onChange={(e) => setSchoolSearchQuery(e.target.value)}
                />
                {schoolSearching && <span className="text-sm text-gray-500">Recherche...</span>}
                {schoolSearchQuery.length >= 2 && schoolSearchResults.length > 0 && (
                  <ul className="search-results-list" style={{ marginTop: 8, maxHeight: 200, overflow: 'auto' }}>
                    {schoolSearchResults.map((s) => (
                      <li key={s.id}>
                        <button type="button" className="btn-link" onClick={() => addPartnerSchool(s)}>
                          {s.name} {s.city && `(${s.city})`}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                {selectedPartnerSchools.length > 0 && (
                  <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {selectedPartnerSchools.map((s) => (
                      <span key={s.id} className="badge" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        {s.name}
                        <button type="button" className="p-0 btn-link" style={{ fontSize: '1rem' }} onClick={() => removePartnerSchool(s.id)} aria-label="Retirer">
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="form-group">
                <label>Entreprises partenaires</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Rechercher une entreprise..."
                  value={companySearchQuery}
                  onChange={(e) => setCompanySearchQuery(e.target.value)}
                />
                {companySearching && <span className="text-sm text-gray-500">Recherche...</span>}
                {companySearchQuery.length >= 2 && companySearchResults.length > 0 && (
                  <ul className="search-results-list" style={{ marginTop: 8, maxHeight: 200, overflow: 'auto' }}>
                    {companySearchResults.map((c) => (
                      <li key={c.id}>
                        <button type="button" className="btn-link" onClick={() => addPartnerCompany(c)}>
                          {c.name} {c.city && `(${c.city})`}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                {selectedPartnerCompanies.length > 0 && (
                  <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {selectedPartnerCompanies.map((c) => (
                      <span key={c.id} className="badge" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        {c.name}
                        <button type="button" className="p-0 btn-link" style={{ fontSize: '1rem' }} onClick={() => removePartnerCompany(c.id)} aria-label="Retirer">
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {/* Type fixé à "bilateral" pour le moment — champ masqué */}
          {/* Nom du partenariat pré-rempli dans le payload — champ masqué */}

          <div className="form-group">
            <label htmlFor="description">Description *</label>
            <textarea
              id="description"
              className="form-textarea"
              value={formData.description}
              onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="Décrivez le partenariat envisagé"
              rows={3}
              required
            />
          </div>

          <div className="form-group">
            <label className="flex gap-2 items-center" style={{ cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={formData.share_projects}
                onChange={(e) => setFormData((prev) => ({ ...prev, share_projects: e.target.checked }))}
              />
              Partager les projets
            </label>
          </div>
          <div className="form-group">
            <label className="flex gap-2 items-center" style={{ cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={formData.share_members}
                onChange={(e) => setFormData((prev) => ({ ...prev, share_members: e.target.checked }))}
              />
              Partager les membres
            </label>
          </div>
        </form>
        <div className="modal-footer">
          <button type="button" className="btn btn-outline" onClick={onClose}>
            Annuler
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            onClick={handleSubmit}
            disabled={submitting || (partnerSchoolIds.length === 0 && partnerCompanyIds.length === 0)}
          >
            {submitting ? 'Envoi...' : 'Envoyer la demande'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TeacherPartnershipRequestModal;
