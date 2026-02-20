import React, { useState, useEffect, useCallback } from 'react';
import { getPersonalUserOrganizations, joinSchool, joinCompany, getJoinableCompaniesForMinor } from '../../api/Projects';
import { removeSchoolAssociation, removeCompanyAssociation } from '../../api/UserDashBoard/Profile';
import { useSchoolSearch } from '../../hooks/useSchoolSearch';
import { useToast } from '../../hooks/useToast';
import { getCompanies } from '../../api/RegistrationRessource';
import { useAppContext } from '../../context/AppContext';
import { isStudentRole } from '../../utils/roleUtils';
import { isUnder15 } from '../../utils/ageUtils';
import './OrganizationsSection.css';

interface Organization {
  id: number;
  name: string;
  city?: string;
  logo_url?: string;
  my_role?: string;
  my_status?: string;
}

const OrganizationsSection: React.FC = () => {
  const { state } = useAppContext();
  const { showSuccess, showError } = useToast();
  const [schools, setSchools] = useState<Organization[]>([]);
  const [companies, setCompanies] = useState<Organization[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRemoving, setIsRemoving] = useState<number | null>(null);
  
  // Masquer la section Organisations pour les rôles teacher et school (edu)
  const shouldHideCompaniesSection = state.showingPageType === 'teacher' || state.showingPageType === 'edu';

  // For personal users under 15: only show Organisations subsection if they have at least one confirmed school
  const isMinorPersonalUser = state.showingPageType === 'user' && isUnder15(state.user?.birthday);
  const hasConfirmedSchools = schools.some((s) => s.my_status === 'confirmed');
  const shouldHideOrganisationsSubsectionForMinor = isMinorPersonalUser && !hasConfirmedSchools;

  // School search
  const {
    schools: schoolSearchResults,
    searchQuery: schoolSearchQuery,
    setSearchQuery: setSchoolSearchQuery,
    loading: isSearchingSchools,
  } = useSchoolSearch(20);

  // Company search - using a simple state-based approach since useClientSideSearch doesn't support dynamic fetchFunction
  const [companySearchQuery, setCompanySearchQuery] = useState('');
  const [companySearchResults, setCompanySearchResults] = useState<Organization[]>([]);
  const [isSearchingCompanies, setIsSearchingCompanies] = useState(false);

  // Debounced company search (for minors under 15: use joinable companies from school partners only)
  useEffect(() => {
    if (companySearchQuery.length < 2) {
      setCompanySearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearchingCompanies(true);
      try {
        if (isMinorPersonalUser) {
          const response = await getJoinableCompaniesForMinor({ search: companySearchQuery });
          const list = response?.data ?? [];
          const mapped = Array.isArray(list) ? list.map((c: any) => ({
            id: c.id,
            name: c.name,
            city: c.city,
            logo_url: c.logo_url,
          })) : [];
          setCompanySearchResults(mapped);
        } else {
          const response = await getCompanies({ search: companySearchQuery });
          const data = response?.data?.data ?? response?.data ?? response ?? [];
          const companies = Array.isArray(data) ? data.map((c: any) => ({
            id: c.id,
            name: c.name,
            city: c.city,
            logo_url: c.logo_url,
          })) : [];
          setCompanySearchResults(companies);
        }
      } catch (error) {
        console.error('Error searching companies:', error);
        setCompanySearchResults([]);
      } finally {
        setIsSearchingCompanies(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [companySearchQuery, isMinorPersonalUser]);

  const loadOrganizations = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await getPersonalUserOrganizations();
      setSchools(response.data.schools || []);
      setCompanies(response.data.companies || []);
    } catch (error) {
      console.error('Error loading organizations:', error);
      showError('Erreur lors du chargement des organisations');
    } finally {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadOrganizations();
  }, [loadOrganizations]);

  const handleJoinSchool = async (schoolId: number) => {
    try {
      await joinSchool(schoolId);
      showSuccess('Demande d\'adhésion envoyée avec succès');
      setSchoolSearchQuery('');
      await loadOrganizations();
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.response?.data?.error || 'Erreur lors de la demande d\'adhésion';
      showError(errorMessage);
    }
  };

  const handleJoinCompany = async (companyId: number) => {
    try {
      await joinCompany(companyId);
      showSuccess('Demande d\'adhésion envoyée avec succès');
      setCompanySearchQuery('');
      await loadOrganizations();
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.response?.data?.error || 'Erreur lors de la demande d\'adhésion';
      showError(errorMessage);
    }
  };

  const handleRemoveSchool = async (schoolId: number) => {
    if (!window.confirm('Êtes-vous sûr de vouloir quitter cette école ?')) {
      return;
    }

    setIsRemoving(schoolId);
    try {
      await removeSchoolAssociation(schoolId);
      showSuccess('Association avec l\'école supprimée avec succès');
      await loadOrganizations();
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.response?.data?.error || 'Erreur lors de la suppression de l\'association';
      showError(errorMessage);
    } finally {
      setIsRemoving(null);
    }
  };

  const handleRemoveCompany = async (companyId: number) => {
    if (!window.confirm('Êtes-vous sûr de vouloir quitter cette entreprise ?')) {
      return;
    }

    setIsRemoving(companyId);
    try {
      await removeCompanyAssociation(companyId);
      showSuccess('Association avec l\'entreprise supprimée avec succès');
      await loadOrganizations();
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.response?.data?.error || 'Erreur lors de la suppression de l\'association';
      showError(errorMessage);
    } finally {
      setIsRemoving(null);
    }
  };

  const isAlreadyMember = (id: number, type: 'school' | 'company'): boolean => {
    if (type === 'school') {
      return schools.some(s => s.id === id);
    } else {
      return companies.some(c => c.id === id);
    }
  };

  if (isLoading) {
    return <div className="loading-container">Chargement...</div>;
  }

  return (
    <div className="organizations-section">
      {/* Schools Section */}
      <div className="organization-type-section">
        <h3>Écoles</h3>
        <p className="section-description">
          Gérez vos demandes avec les écoles
        </p>

        {/* Add School */}
        <div className="add-organization">
          <h4>Rejoindre une école</h4>
          <div className="search-container">
            <input
              type="text"
              className="search-input"
              placeholder="Rechercher une école par nom, ville, code postal..."
              value={schoolSearchQuery}
              onChange={(e) => setSchoolSearchQuery(e.target.value)}
            />
            {isSearchingSchools && <div className="loading-spinner"></div>}
          </div>

          {schoolSearchQuery.length >= 2 && schoolSearchResults.length > 0 && (
            <div className="search-results">
              {schoolSearchResults.map((school: any) => (
                <div key={school.id} className="search-result-item">
                  <div className="result-info">
                    <span className="result-name">{school.name}</span>
                    {school.city && <span className="result-city">{school.city}</span>}
                  </div>
                  {isAlreadyMember(school.id, 'school') ? (
                    <span className="already-member">Déjà membre</span>
                  ) : (
                    <button
                      type="button"
                      className="btn btn-sm btn-primary"
                      onClick={() => handleJoinSchool(school.id)}
                    >
                      Rejoindre
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {schoolSearchQuery.length >= 2 && !isSearchingSchools && schoolSearchResults.length === 0 && (
            <p className="no-results">Aucune école trouvée</p>
          )}
        </div>

        {/* My Schools */}
        <div className="my-organizations">
          <h4>Mes écoles</h4>
          {schools.length === 0 ? (
            <p className="no-organizations">Aucune école associée</p>
          ) : (
            <div className="organizations-list">
              {schools.map((school) => (
                <div key={school.id} className="organization-item">
                  <div className="org-info">
                    {school.logo_url && (
                      <img src={school.logo_url} alt={school.name} className="org-logo" />
                    )}
                    <div className="org-details">
                      <span className="org-name">{school.name}</span>
                      {school.city && <span className="org-city">{school.city}</span>}
                      {school.my_role && (
                        <span className="org-role">Rôle: {school.my_role}</span>
                      )}
                      {school.my_status && (
                        <span className={`org-status ${school.my_status}`}>
                          {school.my_status === 'confirmed' ? 'Confirmé' : 'En attente'}
                        </span>
                      )}
                    </div>
                  </div>
                  {!isStudentRole(state.user?.role) && (
                    <button
                      type="button"
                      className="btn btn-outline btn-sm btn-danger"
                      onClick={() => handleRemoveSchool(school.id)}
                      disabled={isRemoving === school.id}
                    >
                      {isRemoving === school.id ? 'Suppression...' : 'Quitter'}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Companies Section - Masquée pour teachers et school (edu); pour les mineurs sans école confirmée, masquer toute la subsection */}
      {!shouldHideCompaniesSection && !shouldHideOrganisationsSubsectionForMinor && (
        <div className="organization-type-section">
          <h3>Organisations</h3>
          <p className="section-description">
            Gérer vos demandes de rattachement avec les organisations
          </p>

          {/* Add Company */}
          <div className="add-organization">
            <h4>Rejoindre une entreprise</h4>
            <div className="search-container">
              <input
                type="text"
                className="search-input"
                placeholder="Recherche une organisation (entreprises, associations, institutions,...) par nom, ville, code postal..."
                value={companySearchQuery}
                onChange={(e) => setCompanySearchQuery(e.target.value)}
              />
              {isSearchingCompanies && <div className="loading-spinner"></div>}
            </div>

            {companySearchQuery.length >= 2 && companySearchResults.length > 0 && (
              <div className="search-results">
                {companySearchResults.map((company: any) => (
                  <div key={company.id} className="search-result-item">
                    <div className="result-info">
                      <span className="result-name">{company.name}</span>
                      {company.city && <span className="result-city">{company.city}</span>}
                    </div>
                    {isAlreadyMember(company.id, 'company') ? (
                      <span className="already-member">Déjà membre</span>
                    ) : (
                      <button
                        type="button"
                        className="btn btn-sm btn-primary"
                        onClick={() => handleJoinCompany(company.id)}
                      >
                        Rejoindre
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {companySearchQuery.length >= 2 && !isSearchingCompanies && companySearchResults.length === 0 && (
              <p className="no-results">Aucune entreprise trouvée</p>
            )}
          </div>

          {/* My Companies */}
          <div className="my-organizations">
            <h4>Mes entreprises</h4>
            {companies.length === 0 ? (
              <p className="no-organizations">Aucune entreprise associée</p>
            ) : (
              <div className="organizations-list">
                {companies.map((company) => (
                  <div key={company.id} className="organization-item">
                    <div className="org-info">
                      {company.logo_url && (
                        <img src={company.logo_url} alt={company.name} className="org-logo" />
                      )}
                      <div className="org-details">
                        <span className="org-name">{company.name}</span>
                        {company.city && <span className="org-city">{company.city}</span>}
                        {company.my_role && (
                          <span className="org-role">Rôle: {company.my_role}</span>
                        )}
                        {company.my_status && (
                          <span className={`org-status ${company.my_status}`}>
                            {company.my_status === 'confirmed' ? 'Confirmé' : 'En attente'}
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      className="btn btn-outline btn-sm btn-danger"
                      onClick={() => handleRemoveCompany(company.id)}
                      disabled={isRemoving === company.id}
                    >
                      {isRemoving === company.id ? 'Suppression...' : 'Quitter'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default OrganizationsSection;

