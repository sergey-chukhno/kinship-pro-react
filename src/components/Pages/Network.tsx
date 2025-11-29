import React, { useState, useEffect } from 'react';
import AttachOrganizationModal from '../Modals/AttachOrganizationModal';
import PartnershipModal from '../Modals/PartnershipModal';
import OrganizationDetailsModal from '../Modals/OrganizationDetailsModal';
import OrganizationCard from '../Network/OrganizationCard';
import { getSchools, getCompanies, searchOrganizations } from '../../api/RegistrationRessource';
import { getPartnerships, Partnership, acceptPartnership, rejectPartnership, getSubOrganizations, getPersonalUserRequests } from '../../api/Projects';
import { useAppContext } from '../../context/AppContext';
import { getOrganizationId, getOrganizationType } from '../../utils/projectMapper';
import './Network.css';

interface Organization {
  id: string;
  name: string;
  type: 'sub-organization' | 'partner' | 'schools' | 'companies';
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

interface School {
  id: number;
  name: string;
  city: string;
  zip_code: string;
  school_type: string;
  status: string;
  logo_url: string | null;
  email?: string | null;
}

interface Company {
  id: number;
  name: string;
  city?: string;
  zip_code?: string;
  status: string;
  logo_url: string | null;
  email?: string | null;
}

const Network: React.FC = () => {
  const { state } = useAppContext();
  const [isPartnershipModalOpen, setIsPartnershipModalOpen] = useState(false);
  const [isAttachModalOpen, setIsAttachModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedOrganization, setSelectedOrganization] = useState<Organization | null>(null);
  const [selectedOrganizationForDetails, setSelectedOrganizationForDetails] = useState<Organization | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<'schools' | 'companies' | 'partner' | 'partnership-requests' | 'sub-organizations' | 'my-requests' | 'search'>('schools');
  const [schools, setSchools] = useState<School[]>([]);
  const [schoolsLoading, setSchoolsLoading] = useState(false);
  const [schoolsError, setSchoolsError] = useState<string | null>(null);
  const [schoolsPage, setSchoolsPage] = useState(1);
  const [schoolsTotalPages, setSchoolsTotalPages] = useState(1);
  const [schoolsTotalCount, setSchoolsTotalCount] = useState(0);

  const [companies, setCompanies] = useState<Company[]>([]);
  const [companiesLoading, setCompaniesLoading] = useState(false);
  const [companiesError, setCompaniesError] = useState<string | null>(null);
  const [companiesPage, setCompaniesPage] = useState(1);
  const [companiesTotalPages, setCompaniesTotalPages] = useState(1);
  const [companiesTotalCount, setCompaniesTotalCount] = useState(0);


  // Partners state
  const [partners, setPartners] = useState<Partnership[]>([]);
  const [partnersLoading, setPartnersLoading] = useState(false);
  const [partnersError, setPartnersError] = useState<string | null>(null);
  const [partnersPage, setPartnersPage] = useState(1);
  const [partnersTotalPages, setPartnersTotalPages] = useState(1);
  const [partnersTotalCount, setPartnersTotalCount] = useState(0);

  // Partnership requests state
  const [partnershipRequests, setPartnershipRequests] = useState<Partnership[]>([]);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [requestsError, setRequestsError] = useState<string | null>(null);
  const [requestsPage, setRequestsPage] = useState(1);
  const [requestsTotalPages, setRequestsTotalPages] = useState(1);
  const [requestsTotalCount, setRequestsTotalCount] = useState(0);

  // Sub-organizations state
  const [subOrganizations, setSubOrganizations] = useState<any[]>([]);
  const [subOrgsLoading, setSubOrgsLoading] = useState(false);
  const [subOrgsError, setSubOrgsError] = useState<string | null>(null);

  // Personal user requests state
  const [myRequests, setMyRequests] = useState<{ partnerships: Partnership[]; attachRequests: any[] }>({ partnerships: [], attachRequests: [] });
  const [myRequestsLoading, setMyRequestsLoading] = useState(false);
  const [myRequestsError, setMyRequestsError] = useState<string | null>(null);

  // Search results state
  const [searchResults, setSearchResults] = useState<{ schools: any[]; companies: any[] }>({ schools: [], companies: [] });
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchPage, setSearchPage] = useState(1);
  const [searchTotalPages, setSearchTotalPages] = useState(1);
  const [searchTotalCount, setSearchTotalCount] = useState(0);

  // Reset page to 1 when search term changes
  useEffect(() => {
    setSchoolsPage(1);
    setCompaniesPage(1);
    setPartnersPage(1);
    setRequestsPage(1);
    setSearchPage(1);
  }, [searchTerm]);

  // Auto-switch to search tab when search term is entered
  useEffect(() => {
    if (searchTerm && searchTerm.trim()) {
      setSelectedType('search');
    } else if (selectedType === 'search') {
      setSelectedType('schools');
    }
  }, [searchTerm, selectedType]);

  // Fetch search results when search tab is selected
  useEffect(() => {
    const fetchSearchResults = async () => {
      if (!searchTerm || !searchTerm.trim()) {
        setSearchResults({ schools: [], companies: [] });
        return;
      }

      setSearchLoading(true);
      setSearchError(null);

      try {
        const params: any = {
          q: searchTerm.trim(),
          page: searchPage,
          per_page: 50
        };

        const response = await searchOrganizations(params);
        const responseData = response?.data ?? {};
        
        // Handle new structure: { schools: [], companies: [], meta: {} }
        const schools = Array.isArray(responseData.schools) ? responseData.schools : [];
        const companies = Array.isArray(responseData.companies) ? responseData.companies : [];
        const meta = responseData.meta || {};

        setSearchResults({ schools, companies });

        if (meta) {
          // Use the maximum of schools_pages and companies_pages for total pages
          const maxPages = Math.max(meta.schools_pages || 1, meta.companies_pages || 1);
          setSearchTotalPages(maxPages);
          setSearchTotalCount(meta.total_count || (schools.length + companies.length));
        } else {
          setSearchTotalPages(1);
          setSearchTotalCount(schools.length + companies.length);
        }
      } catch (err) {
        console.error('Error fetching search results:', err);
        setSearchError('Erreur lors de la recherche');
        setSearchResults({ schools: [], companies: [] });
      } finally {
        setSearchLoading(false);
      }
    };

    if (selectedType === 'search') {
      fetchSearchResults();
    }
  }, [selectedType, searchTerm, searchPage]);

  // Fetch sub-organizations when tab is selected
  useEffect(() => {
    const fetchSubOrganizations = async () => {
      const organizationId = getOrganizationId(state.user, state.showingPageType);
      const organizationType = getOrganizationType(state.showingPageType);

      if (!organizationId || !organizationType || (organizationType !== 'school' && organizationType !== 'company')) {
        setSubOrganizations([]);
        return;
      }

      setSubOrgsLoading(true);
      setSubOrgsError(null);

      try {
        const response = await getSubOrganizations(organizationId, organizationType);
        const data = response.data ?? [];

        if (Array.isArray(data)) {
          setSubOrganizations(data);
        } else {
          setSubOrganizations([]);
        }
      } catch (err) {
        console.error('Error fetching sub-organizations:', err);
        setSubOrgsError('Erreur lors du chargement des sous-organisations');
        setSubOrganizations([]);
      } finally {
        setSubOrgsLoading(false);
      }
    };

    if (selectedType === 'sub-organizations') {
      fetchSubOrganizations();
    }
  }, [selectedType, state.user, state.showingPageType]);

  // Fetch schools count on mount (for displaying count in tab)
  useEffect(() => {
    const fetchSchoolsCount = async () => {
      try {
        const params: any = {
          page: 1,
          per_page: 1, // Just to get the meta.total_count
          status: 'confirmed'
        };

        const response = await getSchools(params);
        const meta = response?.data?.meta;

        if (meta) {
          setSchoolsTotalCount(meta.total_count || 0);
          setSchoolsTotalPages(meta.total_pages || 1);
        }
      } catch (err) {
        console.error('Error fetching schools count:', err);
        setSchoolsTotalCount(0);
      }
    };

    fetchSchoolsCount();
  }, []);


  // Fetch schools from API
  useEffect(() => {
    const fetchSchools = async () => {
      setSchoolsLoading(true);
      setSchoolsError(null);
      
      try {
        let response;
        let data: any[] = [];
        let meta: any = null;
        
        if (searchTerm && searchTerm.trim()) {
          // Use search endpoint when there's a search term
        const params: any = {
            q: searchTerm.trim(),
            page: schoolsPage,
            per_page: 50
          };

          response = await searchOrganizations(params);
          const responseData = response?.data ?? {};
          data = Array.isArray(responseData.schools) ? responseData.schools : [];
          meta = responseData.meta;
        } else {
          // Use regular endpoint when no search
          const params: any = {
            page: schoolsPage,
          per_page: 50,
          status: 'confirmed'
        };

          response = await getSchools(params);
          data = response?.data?.data ?? [];
          meta = response?.data?.meta;
        }

        if (Array.isArray(data)) {
          setSchools(data);
          if (meta) {
            setSchoolsTotalPages(meta.schools_pages || meta.total_pages || 1);
            setSchoolsTotalCount(meta.schools_count || meta.total_count || data.length);
          }
        } else {
          setSchools([]);
        }
      } catch (err) {
        console.error('Error fetching schools:', err);
        setSchoolsError('Erreur lors du chargement des écoles');
        setSchools([]);
      } finally {
        setSchoolsLoading(false);
      }
    };

    // Only fetch schools when schools tab is selected
    if (selectedType === 'schools') {
      fetchSchools();
    }
  }, [selectedType, searchTerm, schoolsPage]);

  // Fetch companies from API
  useEffect(() => {
    const fetchCompanies = async () => {
      setCompaniesLoading(true);
      setCompaniesError(null);
      
      try {
        let response;
        let data: any[] = [];
        let meta: any = null;
        
        if (searchTerm && searchTerm.trim()) {
          // Use search endpoint when there's a search term
        const params: any = {
            q: searchTerm.trim(),
            page: companiesPage,
            per_page: 50
          };

          response = await searchOrganizations(params);
          const responseData = response?.data ?? {};
          data = Array.isArray(responseData.companies) ? responseData.companies : [];
          meta = responseData.meta;
        } else {
          // Use regular endpoint when no search
          const params: any = {
            page: companiesPage,
          per_page: 50,
          status: 'confirmed'
        };

          response = await getCompanies(params);
          data = response?.data?.data ?? [];
          meta = response?.data?.meta;
        }

        if (Array.isArray(data)) {
          setCompanies(data);
          if (meta) {
            setCompaniesTotalPages(meta.companies_pages || meta.total_pages || 1);
            setCompaniesTotalCount(meta.companies_count || meta.total_count || data.length);
          }
        } else {
          setCompanies([]);
        }
      } catch (err) {
        console.error('Error fetching companies:', err);
        setCompaniesError('Erreur lors du chargement des entreprises');
        setCompanies([]);
      } finally {
        setCompaniesLoading(false);
      }
    };

    // Only fetch companies when companies tab is selected
    if (selectedType === 'companies') {
      fetchCompanies();
    }
  }, [selectedType, searchTerm, companiesPage]);

  // Fetch companies count on mount (for displaying count in tab)
  useEffect(() => {
    const fetchCompaniesCount = async () => {
      try {
        const params: any = {
          page: 1,
          per_page: 1, // Just to get the meta.total_count
          status: 'confirmed'
        };

        const response = await getCompanies(params);
        const meta = response?.data?.meta;

        if (meta) {
          setCompaniesTotalCount(meta.total_count || 0);
          setCompaniesTotalPages(meta.total_pages || 1);
        }
      } catch (err) {
        console.error('Error fetching companies count:', err);
        setCompaniesTotalCount(0);
      }
    };

    fetchCompaniesCount();
  }, []);

  // Fetch partners count on mount (for displaying count in tab)
  useEffect(() => {
    const fetchPartnersCount = async () => {
      const organizationId = getOrganizationId(state.user, state.showingPageType);
      const organizationType = getOrganizationType(state.showingPageType);

      if (!organizationId || !organizationType || (organizationType !== 'school' && organizationType !== 'company')) {
        setPartnersTotalCount(0);
        return;
      }

      try {
        const params: any = {
          page: 1,
          per_page: 1, // Just to get the meta.total_count
          status: 'confirmed' // Only count confirmed partnerships
        };

        const response = await getPartnerships(organizationId, organizationType, params);
        const meta = response.meta;

        if (meta) {
          setPartnersTotalCount(meta.total_count || 0);
          setPartnersTotalPages(meta.total_pages || 1);
        }
      } catch (err) {
        console.error('Error fetching partners count:', err);
        setPartnersTotalCount(0);
      }
    };

    fetchPartnersCount();
  }, [state.user, state.showingPageType]);

  // Fetch partners data when partner tab is selected
  useEffect(() => {
    const fetchPartners = async () => {
      const organizationId = getOrganizationId(state.user, state.showingPageType);
      const organizationType = getOrganizationType(state.showingPageType);

      if (!organizationId || !organizationType || (organizationType !== 'school' && organizationType !== 'company')) {
        setPartners([]);
        return;
      }

      setPartnersLoading(true);
      setPartnersError(null);

      try {
        const params: any = {
          page: partnersPage,
          per_page: 50,
          status: 'confirmed' // Only fetch confirmed partnerships
        };

        const response = await getPartnerships(organizationId, organizationType, params);
        const data = response.data ?? [];
        const meta = response.meta;

        if (Array.isArray(data)) {
          setPartners(data);
          if (meta) {
            setPartnersTotalPages(meta.total_pages || 1);
            setPartnersTotalCount(meta.total_count || 0);
          }
        } else {
          setPartners([]);
        }
      } catch (err) {
        console.error('Error fetching partners:', err);
        setPartnersError('Erreur lors du chargement des partenaires');
        setPartners([]);
      } finally {
        setPartnersLoading(false);
      }
    };

    // Only fetch partners data when partner tab is selected
    if (selectedType === 'partner') {
      fetchPartners();
    }
  }, [selectedType, state.user, state.showingPageType, partnersPage]);

  // Fetch partnership requests count on mount (for displaying count in tab)
  useEffect(() => {
    const fetchRequestsCount = async () => {
      const organizationId = getOrganizationId(state.user, state.showingPageType);
      const organizationType = getOrganizationType(state.showingPageType);

      if (!organizationId || !organizationType || (organizationType !== 'school' && organizationType !== 'company')) {
        setRequestsTotalCount(0);
        return;
      }

      try {
        const params: any = {
          page: 1,
          per_page: 1,
          status: 'pending'
        };

        const response = await getPartnerships(organizationId, organizationType, params);
        const meta = response.meta;

        if (meta) {
          setRequestsTotalCount(meta.total_count || 0);
          setRequestsTotalPages(meta.total_pages || 1);
        }
      } catch (err) {
        console.error('Error fetching partnership requests count:', err);
        setRequestsTotalCount(0);
      }
    };

    fetchRequestsCount();
  }, [state.user, state.showingPageType]);

  // Fetch partnership requests when tab is selected
  useEffect(() => {
    const fetchRequests = async () => {
      const organizationId = getOrganizationId(state.user, state.showingPageType);
      const organizationType = getOrganizationType(state.showingPageType);

      if (!organizationId || !organizationType || (organizationType !== 'school' && organizationType !== 'company')) {
        setPartnershipRequests([]);
        return;
      }

      setRequestsLoading(true);
      setRequestsError(null);

      try {
        const params: any = {
          page: requestsPage,
          per_page: 50,
          status: 'pending'
        };

        const response = await getPartnerships(organizationId, organizationType, params);
        const data = response.data ?? [];
        const meta = response.meta;

        if (Array.isArray(data)) {
          setPartnershipRequests(data);
          if (meta) {
            setRequestsTotalPages(meta.total_pages || 1);
            setRequestsTotalCount(meta.total_count || 0);
          }
        } else {
          setPartnershipRequests([]);
        }
      } catch (err) {
        console.error('Error fetching partnership requests:', err);
        setRequestsError('Erreur lors du chargement des demandes de partenariats');
        setPartnershipRequests([]);
      } finally {
        setRequestsLoading(false);
      }
    };

    if (selectedType === 'partnership-requests') {
      fetchRequests();
    }
  }, [selectedType, state.user, state.showingPageType, requestsPage]);

  // No client-side filtering for schools and companies - search is done server-side
  // This ensures pagination works correctly with server-side search
  const filteredSchools = schools;
  const filteredCompanies = companies;

  const handlePartnershipProposal = (organization?: Organization) => {
    if (organization) {
      setSelectedOrganization(organization);
    }
    setIsPartnershipModalOpen(true);
  };

  const handleAttachRequest = (organization?: Organization) => {
    if (organization) {
      setSelectedOrganization(organization);
    }
    setIsAttachModalOpen(true);
  };

  const handleViewDetails = (organization: Organization) => {
    setSelectedOrganizationForDetails(organization);
    setIsDetailsModalOpen(true);
  };

  const handleSavePartnership = (partnershipData: any) => {
    // TODO: Implement partnership creation
    console.log('Save partnership:', partnershipData);
    setIsPartnershipModalOpen(false);
    setSelectedOrganization(null);
  };

  const handleSaveAttachRequest = (attachData: any) => {
    // TODO: Implement attach request
    console.log('Save attach request:', attachData);
    setIsAttachModalOpen(false);
    setSelectedOrganization(null);
  };

  // Handle accept partnership request
  const handleAcceptPartnership = async (partnershipId: number) => {
    const organizationId = getOrganizationId(state.user, state.showingPageType);
    const organizationType = getOrganizationType(state.showingPageType);

    if (!organizationId || !organizationType || (organizationType !== 'school' && organizationType !== 'company')) {
      return;
    }

    try {
      await acceptPartnership(organizationId, organizationType, partnershipId);
      // Remove from requests and update count
      setPartnershipRequests(prev => prev.filter(p => p.id !== partnershipId));
      setRequestsTotalCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Error accepting partnership:', err);
      setRequestsError('Erreur lors de l\'acceptation du partenariat');
    }
  };

  // Handle reject partnership request
  const handleRejectPartnership = async (partnershipId: number) => {
    const organizationId = getOrganizationId(state.user, state.showingPageType);
    const organizationType = getOrganizationType(state.showingPageType);

    if (!organizationId || !organizationType || (organizationType !== 'school' && organizationType !== 'company')) {
      return;
    }

    try {
      await rejectPartnership(organizationId, organizationType, partnershipId);
      // Remove from requests and update count
      setPartnershipRequests(prev => prev.filter(p => p.id !== partnershipId));
      setRequestsTotalCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Error rejecting partnership:', err);
      setRequestsError('Erreur lors du rejet du partenariat');
    }
  };

  // Convert search results to organization-like format for display
  const searchResultsAsOrganizations: Organization[] = [
    // Convert schools
    ...searchResults.schools.map((school: any) => ({
      id: String(school.id),
      name: school.name || 'Établissement scolaire',
      type: 'schools' as const,
      description: `${school.school_type || 'Établissement scolaire'} - ${school.city || ''} ${school.zip_code ? `(${school.zip_code})` : ''}`.trim(),
      members: 0,
      location: school.city && school.zip_code ? `${school.city}, ${school.zip_code}` : school.city || school.zip_code || '',
      logo: school.logo_url || undefined,
      status: school.status === 'confirmed' ? 'active' as const : 'pending' as const,
      joinedDate: '',
      contactPerson: '',
      email: school.email || ''
    })),
    // Convert companies
    ...searchResults.companies.map((company: any) => ({
      id: String(company.id),
      name: company.name || 'Organisation',
      type: 'companies' as const,
      description: `${company.city || ''} ${company.zip_code ? `(${company.zip_code})` : ''}`.trim() || 'Organisation',
      members: 0,
      location: company.city && company.zip_code ? `${company.city}, ${company.zip_code}` : company.city || company.zip_code || '',
      logo: company.logo_url || undefined,
      status: company.status === 'confirmed' ? 'active' as const : 'pending' as const,
      joinedDate: '',
      contactPerson: '',
      email: company.email || ''
    }))
  ];

  // Convert schools to organization-like format for display
  const schoolsAsOrganizations: Organization[] = filteredSchools.map(school => ({
    id: String(school.id),
    name: school.name,
    type: 'schools' as const,
    description: `${school.school_type} - ${school.city} (${school.zip_code})`,
    members: 0,
    location: `${school.city}, ${school.zip_code}`,
    logo: school.logo_url || undefined,
    status: school.status === 'confirmed' ? 'active' as const : 'pending' as const,
    joinedDate: '',
    contactPerson: '',
    email: school.email || ''
  }));

  // Convert companies to organization-like format for display
  const companiesAsOrganizations: Organization[] = filteredCompanies.map(company => ({
    id: String(company.id),
    name: company.name,
    type: 'companies' as const,
    description: company.city && company.zip_code ? `${company.city} (${company.zip_code})` : 'Entreprise',
    members: 0,
    location: company.city && company.zip_code ? `${company.city}, ${company.zip_code}` : '',
    logo: company.logo_url || undefined,
    status: company.status === 'confirmed' ? 'active' as const : 'pending' as const,
    joinedDate: '',
    contactPerson: '',
    email: company.email || ''
  }));

  // Convert partners to organization-like format for display
  // Partners contain organizations, so we need to extract and flatten them
  // Only include confirmed partnerships in the partners list
  const partnersAsOrganizations: Organization[] = partners
    .filter(partnership => partnership.status === 'confirmed') // Only confirmed partnerships
    .flatMap(partnership => {
    // Get organizations from the partnership (partners array)
    const organizationId = getOrganizationId(state.user, state.showingPageType);
    return (partnership.partners || [])
      .filter(partner => partner.id !== organizationId)
      .map(partner => ({
        id: String(partner.id),
        name: partner.name,
        type: 'partner' as const,
        description: `Partenariat ${partnership.partnership_type} - Rôle: ${partner.role_in_partnership}`,
        members: 0,
        location: '',
        logo: undefined,
          status: 'active' as const, // All partners here are confirmed
        joinedDate: partnership.created_at || '',
        contactPerson: '',
        email: ''
      }));
  });

  // Filter partners based on search term (client-side for partners)
  const filteredPartners = partnersAsOrganizations.filter(partner => {
    const matchesSearch = partner.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         partner.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  // Convert sub-organizations to organization-like format for display
  const subOrgsAsOrganizations: Organization[] = subOrganizations.map(subOrg => ({
    id: String(subOrg.id),
    name: subOrg.name || subOrg.company_name || subOrg.school_name || 'Sous-organisation',
    type: 'sub-organization' as const,
    description: subOrg.description || subOrg.city ? `${subOrg.city}${subOrg.zip_code ? ` (${subOrg.zip_code})` : ''}` : 'Sous-organisation',
    members: subOrg.members_count || 0,
    location: subOrg.city && subOrg.zip_code ? `${subOrg.city}, ${subOrg.zip_code}` : subOrg.city || '',
    logo: subOrg.logo_url || undefined,
    status: subOrg.status === 'confirmed' ? 'active' as const : 'pending' as const,
    joinedDate: subOrg.created_at || '',
    contactPerson: '',
    email: ''
  }));

  // Filter sub-organizations based on search term
  const filteredSubOrgs = subOrgsAsOrganizations.filter(subOrg => {
    const matchesSearch = subOrg.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         subOrg.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         subOrg.location.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  // Convert personal user requests to organization-like format for display
  const myRequestsAsOrganizations: Organization[] = [
    // Partnership requests
    ...myRequests.partnerships.flatMap(partnership => {
      const userId = typeof state.user?.id === 'string' ? parseInt(state.user.id) : state.user?.id;
      return (partnership.partners || [])
        .filter(partner => partner.id !== userId)
        .map(partner => ({
          id: String(partnership.id),
          name: partner.name,
          type: 'partner' as const,
          description: `Demande de partenariat ${partnership.partnership_type} - Statut: ${partnership.status === 'pending' ? 'En attente' : partnership.status === 'confirmed' ? 'Accepté' : 'Refusé'}`,
          members: 0,
          location: '',
          logo: undefined,
          status: partnership.status === 'confirmed' ? 'active' as const : partnership.status === 'pending' ? 'pending' as const : 'inactive' as const,
          joinedDate: partnership.created_at || '',
          contactPerson: '',
          email: '',
          partnershipId: partnership.id,
          partnership: partnership
        } as Organization & { partnershipId: number; partnership: Partnership }));
    }),
    // Attach requests
    ...myRequests.attachRequests.map((request: any) => ({
      id: String(request.id),
      name: request.organization_name || request.name || 'Organisation',
      type: 'sub-organization' as const,
      description: `Demande de rattachement - Statut: ${request.status === 'pending' ? 'En attente' : request.status === 'accepted' ? 'Accepté' : 'Refusé'}`,
      members: 0,
      location: request.location || '',
      logo: request.logo_url || undefined,
      status: request.status === 'accepted' ? 'active' as const : request.status === 'pending' ? 'pending' as const : 'inactive' as const,
      joinedDate: request.created_at || '',
      contactPerson: '',
      email: '',
      attachRequestId: request.id
    } as Organization & { attachRequestId: number }))
  ];

  // Filter my requests based on search term
  const filteredMyRequests = myRequestsAsOrganizations.filter(request => {
    const matchesSearch = request.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         request.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  // Convert partnership requests to organization-like format for display
  const requestsAsOrganizations: Organization[] = partnershipRequests.flatMap(partnership => {
    const organizationId = getOrganizationId(state.user, state.showingPageType);
    return (partnership.partners || [])
      .filter(partner => partner.id !== organizationId)
      .map(partner => ({
        id: String(partnership.id), // Use partnership ID for the card
        name: partner.name,
        type: 'partner' as const,
        description: `Partenariat ${partnership.partnership_type} - Rôle: ${partner.role_in_partnership}`,
        members: 0,
        location: '',
        logo: undefined,
        status: 'pending' as const,
        joinedDate: partnership.created_at || '',
        contactPerson: '',
        email: '',
        partnershipId: partnership.id, // Store partnership ID for accept/reject
        partnership: partnership // Store full partnership data
      } as Organization & { partnershipId: number; partnership: Partnership }));
  });

  // Filter requests based on search term
  const filteredRequests = requestsAsOrganizations.filter(request => {
    const matchesSearch = request.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         request.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  // Combine schools, companies and partners based on selected type
  const displayItems = selectedType === 'search'
    ? searchResultsAsOrganizations
    : selectedType === 'schools' 
    ? schoolsAsOrganizations 
    : selectedType === 'companies'
    ? companiesAsOrganizations
    : selectedType === 'partner'
    ? filteredPartners
    : selectedType === 'partnership-requests'
    ? filteredRequests
    : selectedType === 'sub-organizations'
    ? filteredSubOrgs
    : selectedType === 'my-requests'
    ? filteredMyRequests
    : [];

  return (
    <section className="network-container with-sidebar">
      {/* Section Title + Actions */}
      <div className="section-title-row">
        <div className="section-title-left">
          <img src="/icons_logo/Icon=Reseau.svg" alt="Mon réseau Kinship" className="section-icon" />
          <h2>Mon réseau Kinship</h2>
        </div>
        <div className="network-actions">
          {/* <button className="btn btn-outline" onClick={() => handlePartnershipProposal()}>
            <i className="fas fa-handshake"></i> {(state.showingPageType === 'teacher' || state.showingPageType === 'user') ? 'Rejoindre une communauté' : 'Proposer un partenariat'}
          </button> */}
          {/* Personal users (teacher/user) cannot attach to organizations */}
          {/* {(state.showingPageType !== 'teacher' && state.showingPageType !== 'user') && (
            <button className="btn btn-primary" onClick={() => handleAttachRequest()}>
            <i className="fas fa-link"></i> Demander un rattachement
          </button>
          )} */}
        </div>
      </div>

      {/* Search Bar */}
      <div className="network-search-container">
        <div className="search-bar !w-full">
          <i className="fas fa-search search-icon"></i>
          <input
            type="text"
            className="search-input !w-full"
            placeholder="Rechercher par nom, code postal ou ville"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Network Summary Cards */}
      <div className="network-summary">
        <div className="summary-card">
          <div className="summary-icon">
            <img src="/icons_logo/Icon=Tableau de bord.svg" alt="Établissements scolaires" className="summary-icon-img" />
          </div>
          <div className="summary-content">
            <h3>{schoolsTotalCount}</h3>
            <p>Établissements scolaires</p>
          </div>
        </div>
        <div className="summary-card">
          <div className="summary-icon">
            <img src="/icons_logo/Icon=Reseau.svg" alt="Entreprises" className="summary-icon-img" />
          </div>
          <div className="summary-content">
            <h3>{companiesTotalCount}</h3>
            <p>Organisations</p>
          </div>
        </div>
        <div className="summary-card">
          <div className="summary-icon">
            <img src="/icons_logo/Icon=Membres.svg" alt="Total" className="summary-icon-img" />
          </div>
          <div className="summary-content">
            <h3>{schoolsTotalCount + companiesTotalCount}</h3>
            <p>Total</p>
          </div>
        </div>
      </div>

      {/* Type Filter */}
      <div className="network-filters">
        <div className="filter-tabs">
          {/* Show search tab when there's a search term */}
          {searchTerm && searchTerm.trim() && (
          <button 
              className={`filter-tab ${selectedType === 'search' ? 'active' : ''}`}
              onClick={() => setSelectedType('search')}
          >
              Recherche ({searchTotalCount > 0 ? searchTotalCount : searchResultsAsOrganizations.length})
          </button>
          )}
          <button 
            className={`filter-tab ${selectedType === 'schools' ? 'active' : ''}`}
            onClick={() => setSelectedType('schools')}
          >
            Établissements scolaires ({schoolsTotalCount > 0 ? schoolsTotalCount : filteredSchools.length})
          </button>
          <button 
            className={`filter-tab ${selectedType === 'companies' ? 'active' : ''}`}
            onClick={() => setSelectedType('companies')}
          >
            Entreprises ({companiesTotalCount > 0 ? companiesTotalCount : filteredCompanies.length})
          </button>
          {/* Show sub-organizations tab only for school (edu) and pro (company) roles */}
          {(state.showingPageType === 'edu' || state.showingPageType === 'pro') && (
            <button 
              className={`filter-tab ${selectedType === 'sub-organizations' ? 'active' : ''}`}
              onClick={() => setSelectedType('sub-organizations')}
            >
              Sous-organisations ({filteredSubOrgs.length})
            </button>
          )}
          {/* Show my requests tab only for personal users (teacher/user) */}
          {(state.showingPageType === 'teacher' || state.showingPageType === 'user') && (
            <button 
              className={`filter-tab ${selectedType === 'my-requests' ? 'active' : ''}`}
              onClick={() => setSelectedType('my-requests')}
            >
              Mes demandes ({filteredMyRequests.length})
            </button>
          )}
          <button 
            className={`filter-tab ${selectedType === 'partner' ? 'active' : ''}`}
            onClick={() => setSelectedType('partner')}
          >
            {(state.showingPageType === 'teacher' || state.showingPageType === 'user') ? 'Mon réseau' : 'Partenaires'} ({partnersTotalCount > 0 ? partnersTotalCount : filteredPartners.length})
          </button>
          {requestsTotalCount > 0 && (
            <button 
              className={`filter-tab ${selectedType === 'partnership-requests' ? 'active' : ''}`}
              onClick={() => setSelectedType('partnership-requests')}
            >
              Demandes de partenariats ({requestsTotalCount})
            </button>
          )}
        </div>
      </div>

      {/* Organizations List */}
      <div className="organizations-list">
        {schoolsLoading && selectedType === 'schools' && (
          <div className="loading-message">Chargement des écoles...</div>
        )}
        {schoolsError && selectedType === 'schools' && (
          <div className="error-message">{schoolsError}</div>
        )}
        {companiesLoading && selectedType === 'companies' && (
          <div className="loading-message">Chargement des entreprises...</div>
        )}
        {companiesError && selectedType === 'companies' && (
          <div className="error-message">{companiesError}</div>
        )}
        {partnersLoading && selectedType === 'partner' && (
          <div className="loading-message">Chargement des partenaires...</div>
        )}
        {partnersError && selectedType === 'partner' && (
          <div className="error-message">{partnersError}</div>
        )}
        {requestsLoading && selectedType === 'partnership-requests' && (
          <div className="loading-message">Chargement des demandes de partenariats...</div>
        )}
        {requestsError && selectedType === 'partnership-requests' && (
          <div className="error-message">{requestsError}</div>
        )}
        {subOrgsLoading && selectedType === 'sub-organizations' && (
          <div className="loading-message">Chargement des sous-organisations...</div>
        )}
        {subOrgsError && selectedType === 'sub-organizations' && (
          <div className="error-message">{subOrgsError}</div>
        )}
        {myRequestsLoading && selectedType === 'my-requests' && (
          <div className="loading-message">Chargement de vos demandes...</div>
        )}
        {myRequestsError && selectedType === 'my-requests' && (
          <div className="error-message">{myRequestsError}</div>
        )}
        {searchLoading && selectedType === 'search' && (
          <div className="loading-message">Recherche en cours...</div>
        )}
        {searchError && selectedType === 'search' && (
          <div className="error-message">{searchError}</div>
        )}
        {displayItems.length === 0 && !schoolsLoading && !companiesLoading && !partnersLoading && !requestsLoading && !subOrgsLoading && !myRequestsLoading && !searchLoading && (
          <div className="empty-message">Aucun résultat trouvé</div>
        )}
        <div className="grid !grid-cols-3">
          {displayItems.map((organization) => {
            // Check if this is a partnership request
            const isPartnershipRequest = selectedType === 'partnership-requests' && 
              'partnershipId' in organization;
            
            if (isPartnershipRequest && 'partnershipId' in organization) {
              const orgWithPartnership = organization as Organization & { partnershipId: number; partnership: Partnership };
              const partnershipId = orgWithPartnership.partnershipId;
              const partnership = orgWithPartnership.partnership;
              
              // Check if current user is the initiator
              const organizationId = getOrganizationId(state.user, state.showingPageType);
              const organizationType = getOrganizationType(state.showingPageType);
              
              // Determine expected initiator type based on current organization type
              let expectedInitiatorType: string | undefined;
              if (organizationType === 'school') {
                expectedInitiatorType = 'School';
              } else if (organizationType === 'company') {
                expectedInitiatorType = 'Company';
              }
              
              const isInitiator = expectedInitiatorType && 
                                 partnership.initiator_type === expectedInitiatorType && 
                                 partnership.initiator_id === organizationId;
              
              return (
                <div key={organization.id} className="organization-card">
                  <div className="organization-header">
                    <div className="organization-logo">
                      <div className="logo-placeholder">
                        <i className="fas fa-building"></i>
                      </div>
                    </div>
                    <div className="organization-info">
                      <h3 className="organization-name">{organization.name}</h3>
                      <div className="organization-meta">
                        <span className="organization-type">Demande</span>
                        <span className="whitespace-nowrap organization-status" style={{ color: '#f59e0b' }}>
                          En attente
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="organization-content">
                    <p className="organization-description">{organization.description}</p>
                    {!isInitiator && (
                      <div className="organization-actions" style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                        <button
                          className="btn btn-primary"
                          onClick={() => handleAcceptPartnership(partnershipId)}
                          style={{ flex: 1 }}
                        >
                          <i className="fas fa-check"></i> Accepter
                        </button>
                        <button
                          className="btn btn-outline"
                          onClick={() => handleRejectPartnership(partnershipId)}
                          style={{ flex: 1 }}
                        >
                          <i className="fas fa-times"></i> Refuser
                        </button>
                      </div>
                    )}
                    {isInitiator && (
                      <div style={{ marginTop: '16px', padding: '12px', background: '#f3f4f6', borderRadius: '8px', color: '#6b7280', fontSize: '0.9rem' }}>
                        <i className="fas fa-info-circle"></i> Votre demande de partenariat a été envoyée
                      </div>
                    )}
                  </div>
                </div>
              );
            }
            
            // Don't show hover actions for partners (they're already connected)
            const isPartner = selectedType === 'partner';
            
            // Don't show hover actions for sub-organizations (they're part of the current organization)
            const isSubOrganization = selectedType === 'sub-organizations';
            
            // Personal users (teacher/user) cannot attach to organizations
            const isPersonalUser = state.showingPageType === 'teacher' || state.showingPageType === 'user';
            
            return (
          <OrganizationCard
            key={organization.id}
            organization={organization}
            onEdit={() => console.log('Edit organization:', organization.id)}
            onDelete={() => console.log('Delete organization:', organization.id)}
            onAttach={!isPartner && !isSubOrganization && !isPersonalUser ? () => handleAttachRequest(organization) : undefined}
            onPartnership={!isPartner && !isSubOrganization ? () => handlePartnershipProposal(organization) : undefined}
            isPersonalUser={isPersonalUser}
            onClick={() => handleViewDetails(organization)}
          />
            );
          })}
        </div>
      </div>

      {/* Pagination for Schools */}
      {selectedType === 'schools' && schoolsTotalPages > 1 && (
        <div className="pagination-container">
          <div className="pagination-info">
            Page {schoolsPage} sur {schoolsTotalPages} ({schoolsTotalCount} résultats)
          </div>
          <div className="pagination-controls">
            <button
              className="pagination-btn"
              onClick={() => setSchoolsPage(prev => Math.max(1, prev - 1))}
              disabled={schoolsPage === 1 || schoolsLoading}
            >
              <i className="fas fa-chevron-left"></i> Précédent
            </button>
            <div className="pagination-pages">
              {Array.from({ length: Math.min(5, schoolsTotalPages) }, (_, i) => {
                let pageNum: number;
                if (schoolsTotalPages <= 5) {
                  pageNum = i + 1;
                } else if (schoolsPage <= 3) {
                  pageNum = i + 1;
                } else if (schoolsPage >= schoolsTotalPages - 2) {
                  pageNum = schoolsTotalPages - 4 + i;
                } else {
                  pageNum = schoolsPage - 2 + i;
                }
                return (
                  <button
                    key={pageNum}
                    className={`pagination-page-btn ${schoolsPage === pageNum ? 'active' : ''}`}
                    onClick={() => setSchoolsPage(pageNum)}
                    disabled={schoolsLoading}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>
            <button
              className="pagination-btn"
              onClick={() => setSchoolsPage(prev => Math.min(schoolsTotalPages, prev + 1))}
              disabled={schoolsPage === schoolsTotalPages || schoolsLoading}
            >
              Suivant <i className="fas fa-chevron-right"></i>
            </button>
          </div>
        </div>
      )}

      {/* Pagination for Partnership Requests */}
      {selectedType === 'partnership-requests' && requestsTotalPages > 1 && (
        <div className="pagination-container">
          <div className="pagination-info">
            Page {requestsPage} sur {requestsTotalPages} ({requestsTotalCount} résultats)
          </div>
          <div className="pagination-controls">
            <button
              className="pagination-btn"
              onClick={() => setRequestsPage(prev => Math.max(1, prev - 1))}
              disabled={requestsPage === 1 || requestsLoading}
            >
              <i className="fas fa-chevron-left"></i> Précédent
            </button>
            <div className="pagination-pages">
              {Array.from({ length: Math.min(5, requestsTotalPages) }, (_, i) => {
                let pageNum: number;
                if (requestsTotalPages <= 5) {
                  pageNum = i + 1;
                } else if (requestsPage <= 3) {
                  pageNum = i + 1;
                } else if (requestsPage >= requestsTotalPages - 2) {
                  pageNum = requestsTotalPages - 4 + i;
                } else {
                  pageNum = requestsPage - 2 + i;
                }
                return (
                  <button
                    key={pageNum}
                    className={`pagination-page-btn ${requestsPage === pageNum ? 'active' : ''}`}
                    onClick={() => setRequestsPage(pageNum)}
                    disabled={requestsLoading}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>
            <button
              className="pagination-btn"
              onClick={() => setRequestsPage(prev => Math.min(requestsTotalPages, prev + 1))}
              disabled={requestsPage === requestsTotalPages || requestsLoading}
            >
              Suivant <i className="fas fa-chevron-right"></i>
            </button>
          </div>
        </div>
      )}

      {/* Pagination for Partners */}
      {selectedType === 'partner' && partnersTotalPages > 1 && (
        <div className="pagination-container">
          <div className="pagination-info">
            Page {partnersPage} sur {partnersTotalPages} ({partnersTotalCount} résultats)
          </div>
          <div className="pagination-controls">
            <button
              className="pagination-btn"
              onClick={() => setPartnersPage(prev => Math.max(1, prev - 1))}
              disabled={partnersPage === 1 || partnersLoading}
            >
              <i className="fas fa-chevron-left"></i> Précédent
            </button>
            <div className="pagination-pages">
              {Array.from({ length: Math.min(5, partnersTotalPages) }, (_, i) => {
                let pageNum: number;
                if (partnersTotalPages <= 5) {
                  pageNum = i + 1;
                } else if (partnersPage <= 3) {
                  pageNum = i + 1;
                } else if (partnersPage >= partnersTotalPages - 2) {
                  pageNum = partnersTotalPages - 4 + i;
                } else {
                  pageNum = partnersPage - 2 + i;
                }
                return (
                  <button
                    key={pageNum}
                    className={`pagination-page-btn ${partnersPage === pageNum ? 'active' : ''}`}
                    onClick={() => setPartnersPage(pageNum)}
                    disabled={partnersLoading}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>
            <button
              className="pagination-btn"
              onClick={() => setPartnersPage(prev => Math.min(partnersTotalPages, prev + 1))}
              disabled={partnersPage === partnersTotalPages || partnersLoading}
            >
              Suivant <i className="fas fa-chevron-right"></i>
            </button>
          </div>
        </div>
      )}

      {/* Pagination for Search */}
      {selectedType === 'search' && searchTotalPages > 1 && (
        <div className="pagination-container">
          <div className="pagination-info">
            Page {searchPage} sur {searchTotalPages} ({searchTotalCount} résultats)
          </div>
          <div className="pagination-controls">
            <button
              className="pagination-btn"
              onClick={() => setSearchPage(prev => Math.max(1, prev - 1))}
              disabled={searchPage === 1 || searchLoading}
            >
              <i className="fas fa-chevron-left"></i> Précédent
            </button>
            <div className="pagination-pages">
              {Array.from({ length: Math.min(5, searchTotalPages) }, (_, i) => {
                let pageNum: number;
                if (searchTotalPages <= 5) {
                  pageNum = i + 1;
                } else if (searchPage <= 3) {
                  pageNum = i + 1;
                } else if (searchPage >= searchTotalPages - 2) {
                  pageNum = searchTotalPages - 4 + i;
                } else {
                  pageNum = searchPage - 2 + i;
                }
                return (
                  <button
                    key={pageNum}
                    className={`pagination-page-btn ${searchPage === pageNum ? 'active' : ''}`}
                    onClick={() => setSearchPage(pageNum)}
                    disabled={searchLoading}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>
            <button
              className="pagination-btn"
              onClick={() => setSearchPage(prev => Math.min(searchTotalPages, prev + 1))}
              disabled={searchPage === searchTotalPages || searchLoading}
            >
              Suivant <i className="fas fa-chevron-right"></i>
            </button>
          </div>
        </div>
      )}

      {/* Pagination for Companies */}
      {selectedType === 'companies' && companiesTotalPages > 1 && (
        <div className="pagination-container">
          <div className="pagination-info">
            Page {companiesPage} sur {companiesTotalPages} ({companiesTotalCount} résultats)
          </div>
          <div className="pagination-controls">
            <button
              className="pagination-btn"
              onClick={() => setCompaniesPage(prev => Math.max(1, prev - 1))}
              disabled={companiesPage === 1 || companiesLoading}
            >
              <i className="fas fa-chevron-left"></i> Précédent
            </button>
            <div className="pagination-pages">
              {Array.from({ length: Math.min(5, companiesTotalPages) }, (_, i) => {
                let pageNum: number;
                if (companiesTotalPages <= 5) {
                  pageNum = i + 1;
                } else if (companiesPage <= 3) {
                  pageNum = i + 1;
                } else if (companiesPage >= companiesTotalPages - 2) {
                  pageNum = companiesTotalPages - 4 + i;
                } else {
                  pageNum = companiesPage - 2 + i;
                }
                return (
                  <button
                    key={pageNum}
                    className={`pagination-page-btn ${companiesPage === pageNum ? 'active' : ''}`}
                    onClick={() => setCompaniesPage(pageNum)}
                    disabled={companiesLoading}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>
            <button
              className="pagination-btn"
              onClick={() => setCompaniesPage(prev => Math.min(companiesTotalPages, prev + 1))}
              disabled={companiesPage === companiesTotalPages || companiesLoading}
            >
              Suivant <i className="fas fa-chevron-right"></i>
            </button>
          </div>
        </div>
      )}

      {/* Partnership Modal */}
      {isPartnershipModalOpen && (
        <PartnershipModal
          onClose={() => {
            setIsPartnershipModalOpen(false);
            setSelectedOrganization(null);
          }}
          onSave={handleSavePartnership}
          initialOrganization={selectedOrganization}
        />
      )}

      {/* Attach Organization Modal */}
      {isAttachModalOpen && (
        <AttachOrganizationModal
          onClose={() => {
            setIsAttachModalOpen(false);
            setSelectedOrganization(null);
          }}
          onSave={handleSaveAttachRequest}
          initialOrganization={selectedOrganization}
        />
      )}

      {isDetailsModalOpen && selectedOrganizationForDetails && (() => {
        // Use the same logic as OrganizationCard to determine if actions should be shown
        const isPartner = selectedType === 'partner';
        const isSubOrganization = selectedType === 'sub-organizations';
        const isPersonalUser = state.showingPageType === 'teacher' || state.showingPageType === 'user';
        
        return (
          <OrganizationDetailsModal
            organization={selectedOrganizationForDetails}
            onClose={() => {
              setIsDetailsModalOpen(false);
              setSelectedOrganizationForDetails(null);
            }}
            onAttach={
              !isPartner && !isSubOrganization && !isPersonalUser
                ? () => handleAttachRequest(selectedOrganizationForDetails)
                : undefined
            }
            onPartnership={
              !isPartner && !isSubOrganization
                ? () => handlePartnershipProposal(selectedOrganizationForDetails)
                : undefined
            }
            isPersonalUser={isPersonalUser}
          />
        );
      })()}
    </section>
  );
};

export default Network;
