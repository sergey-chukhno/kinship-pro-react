import React, { useState, useEffect, useCallback } from 'react';
import AttachOrganizationModal from '../Modals/AttachOrganizationModal';
import PartnershipModal from '../Modals/PartnershipModal';
import OrganizationDetailsModal from '../Modals/OrganizationDetailsModal';
import PartnershipRequestDetailsModal from '../Modals/PartnershipRequestDetailsModal';
import JoinOrganizationModal from '../Modals/JoinOrganizationModal';
import MemberModal from '../Modals/MemberModal';
import OrganizationCard from '../Network/OrganizationCard';
import MemberCard from '../Members/MemberCard';
import { Member } from '../../types';
import { translateRole, translateRoles } from '../../utils/roleTranslations';
import { getSchools, getCompanies, searchOrganizations } from '../../api/RegistrationRessource';
import { getPartnerships, Partnership, acceptPartnership, rejectPartnership, getSubOrganizations, createPartnership, CreatePartnershipPayload, getPersonalUserNetwork, joinSchool, joinCompany, getPersonalUserOrganizations } from '../../api/Projects';
import { getSkills } from '../../api/Skills';
import { useAppContext } from '../../context/AppContext';
import { getOrganizationId, getOrganizationType } from '../../utils/projectMapper';
import { useToast } from '../../hooks/useToast';
import './Network.css';

interface Organization {
  id: string;
  name: string;
  type: 'sub-organization' | 'partner' | 'schools' | 'companies';
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


interface School {
  id: number;
  name: string;
  city: string;
  zip_code: string;
  school_type: string;
  status: string;
  logo_url: string | null;
  email?: string | null;
  members_count?: number;
}

interface Company {
  id: number;
  name: string;
  city?: string;
  zip_code?: string;
  status: string;
  logo_url: string | null;
  email?: string | null;
  members_count?: number;
}

// NetworkUser interface for API response
interface NetworkUser {
  id: number;
  full_name: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  job: string | null;
  take_trainee?: boolean;
  propose_workshop?: boolean;
  avatar_url: string | null;
  skills: Array<{ id: number; name: string }>;
  availability?: {
    id: number;
    monday: boolean;
    tuesday: boolean;
    wednesday: boolean;
    thursday: boolean;
    friday: boolean;
    saturday: boolean;
    sunday: boolean;
    other: boolean;
    available: boolean;
  } | null;
  common_organizations: Array<{ id: number; name: string; type: string }>;
}

const Network: React.FC = () => {
  const { state } = useAppContext();
  const { showSuccess, showError } = useToast();
  const [isPartnershipModalOpen, setIsPartnershipModalOpen] = useState(false);
  const [isAttachModalOpen, setIsAttachModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isPartnershipRequestDetailsModalOpen, setIsPartnershipRequestDetailsModalOpen] = useState(false);
  const [isJoinOrganizationModalOpen, setIsJoinOrganizationModalOpen] = useState(false);
  const [selectedOrganization, setSelectedOrganization] = useState<Organization | null>(null);
  const [selectedOrganizationForDetails, setSelectedOrganizationForDetails] = useState<Organization | null>(null);
  const [selectedPartnershipRequest, setSelectedPartnershipRequest] = useState<{ partnership: Partnership; partnerName: string } | null>(null);
  const [selectedNetworkMember, setSelectedNetworkMember] = useState<Member | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<'schools' | 'companies' | 'partner' | 'partnership-requests' | 'sub-organizations' | 'my-requests' | 'search'>('schools');
  const [schools, setSchools] = useState<School[]>([]);
  const [schoolsLoading, setSchoolsLoading] = useState(false);
  const [schoolsError, setSchoolsError] = useState<string | null>(null);
  const [schoolsPage, setSchoolsPage] = useState(1);
  const [schoolsTotalPages, setSchoolsTotalPages] = useState(1);
  const [schoolsTotalCount, setSchoolsTotalCount] = useState(0);
  // Global totals that never change (for summary cards)
  const [globalSchoolsTotalCount, setGlobalSchoolsTotalCount] = useState(0);
  const [globalCompaniesTotalCount, setGlobalCompaniesTotalCount] = useState(0);

  const [companies, setCompanies] = useState<Company[]>([]);
  const [companiesLoading, setCompaniesLoading] = useState(false);
  const [companiesError, setCompaniesError] = useState<string | null>(null);
  const [companiesPage, setCompaniesPage] = useState(1);
  const [companiesTotalPages, setCompaniesTotalPages] = useState(1);
  const [companiesTotalCount, setCompaniesTotalCount] = useState(0);


  // Partners state (for organizational users) or Network users (for personal users)
  const [partners, setPartners] = useState<Partnership[] | NetworkUser[]>([]);
  const [partnersLoading, setPartnersLoading] = useState(false);
  const [partnersError, setPartnersError] = useState<string | null>(null);
  const [partnersPage, setPartnersPage] = useState(1);
  const [partnersTotalPages, setPartnersTotalPages] = useState(1);
  const [partnersTotalCount, setPartnersTotalCount] = useState(0);

  // Filters for personal user network
  const [competenceFilter, setCompetenceFilter] = useState('');
  const [availabilityFilter, setAvailabilityFilter] = useState<string[]>([]);
  const [organizationFilter, setOrganizationFilter] = useState('');
  const [skillsOptions, setSkillsOptions] = useState<string[]>([]);
  const [skillsLoading, setSkillsLoading] = useState(false);
  const [isAvailabilityDropdownOpen, setIsAvailabilityDropdownOpen] = useState(false);

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
  const [myRequests, setMyRequests] = useState<{ schools: any[]; companies: any[] }>({ schools: [], companies: [] });
  const [myRequestsLoading, setMyRequestsLoading] = useState(false);
  const [myRequestsError, setMyRequestsError] = useState<string | null>(null);

  // Search results state
  const [searchResults, setSearchResults] = useState<{ schools: any[]; companies: any[] }>({ schools: [], companies: [] });
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchPage, setSearchPage] = useState(1);
  const [searchTotalPages, setSearchTotalPages] = useState(1);
  const [searchTotalCount, setSearchTotalCount] = useState(0);

  // Auto-switch to search tab when user starts typing in search
  useEffect(() => {
    // Only auto-switch if there's a search term and we're not already on search tab
    // This allows user to manually switch to another tab after typing
    if (searchTerm && searchTerm.trim() && selectedType !== 'search') {
      setSelectedType('search');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm]); // Intentionally excluding selectedType to allow manual tab switching after auto-switch

  // Reset search page to 1 when search term changes (only for search tab)
  useEffect(() => {
    if (selectedType === 'search') {
      setSearchPage(1);
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

  // Fetch global schools count on mount (for summary cards - never changes)
  useEffect(() => {
    const fetchGlobalSchoolsCount = async () => {
      try {
        const params: any = {
          page: 1,
          per_page: 1, // Just to get the meta.total_count
          status: 'confirmed'
        };

        const response = await getSchools(params);
        const meta = response?.data?.meta;

        if (meta) {
          setGlobalSchoolsTotalCount(meta.total_count || 0);
        }
      } catch (err) {
        console.error('Error fetching global schools count:', err);
        setGlobalSchoolsTotalCount(0);
      }
    };

    fetchGlobalSchoolsCount();
  }, []);

  // Fetch global companies count on mount (for summary cards - never changes)
  useEffect(() => {
    const fetchGlobalCompaniesCount = async () => {
      try {
        const params: any = {
          page: 1,
          per_page: 1, // Just to get the meta.total_count
          status: 'confirmed'
        };

        const response = await getCompanies(params);
        const meta = response?.data?.meta;

        if (meta) {
          setGlobalCompaniesTotalCount(meta.total_count || 0);
        }
      } catch (err) {
        console.error('Error fetching global companies count:', err);
        setGlobalCompaniesTotalCount(0);
      }
    };

    fetchGlobalCompaniesCount();
  }, []);


  // Fetch schools from API
  useEffect(() => {
    const fetchSchools = async () => {
      setSchoolsLoading(true);
      setSchoolsError(null);
      
      try {
        // Always use regular endpoint for schools tab (no search)
        const params: any = {
          page: schoolsPage,
          per_page: 50,
          status: 'confirmed'
        };

        const response = await getSchools(params);
        const data = response?.data?.data ?? [];
        const meta = response?.data?.meta;

        if (Array.isArray(data)) {
          setSchools(data);
          if (meta) {
            setSchoolsTotalPages(meta.total_pages || 1);
            setSchoolsTotalCount(meta.total_count || data.length);
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
  }, [selectedType, schoolsPage]);

  // Fetch companies from API
  useEffect(() => {
    const fetchCompanies = async () => {
      setCompaniesLoading(true);
      setCompaniesError(null);
      
      try {
        // Always use regular endpoint for companies tab (no search)
        const params: any = {
          page: companiesPage,
          per_page: 50,
          status: 'confirmed'
        };

        const response = await getCompanies(params);
        const data = response?.data?.data ?? [];
        const meta = response?.data?.meta;

        if (Array.isArray(data)) {
          setCompanies(data);
          if (meta) {
            setCompaniesTotalPages(meta.total_pages || 1);
            setCompaniesTotalCount(meta.total_count || data.length);
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
  }, [selectedType, companiesPage]);

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

  // Function to fetch partners count (reusable)
  const fetchPartnersCount = useCallback(async () => {
    const isPersonalUser = state.showingPageType === 'teacher' || state.showingPageType === 'user';

    // For personal users, use the personal network endpoint
    if (isPersonalUser) {
      try {
        const params: any = {
          page: 1,
          per_page: 1 // Just to get the meta.total_count
        };

        const response = await getPersonalUserNetwork(params);
        const meta = response.meta;

        if (meta) {
          setPartnersTotalCount(meta.total_count || 0);
          setPartnersTotalPages(meta.total_pages || 1);
        } else {
          // Fallback: use data length if no meta
          setPartnersTotalCount(response.data?.length || 0);
          setPartnersTotalPages(1);
        }
      } catch (err) {
        console.error('Error fetching personal user network count:', err);
        setPartnersTotalCount(0);
      }
      return;
    }

    // For organizational users (school/company), use the partnerships endpoint
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
  }, [state.user, state.showingPageType]);

  // Function to fetch partners (reusable)
  const fetchPartners = useCallback(async () => {
    const isPersonalUser = state.showingPageType === 'teacher' || state.showingPageType === 'user';

    setPartnersLoading(true);
    setPartnersError(null);

    // For personal users, use the personal network endpoint
    if (isPersonalUser) {
      try {
        // Get skill IDs from skill names if filter is set
        let skillIds: number[] = [];
        if (competenceFilter && skillsOptions.length > 0) {
          // We need to match skill names to IDs - for now, we'll pass skill names
          // The API might accept skill names or IDs
          const skill = skillsOptions.find(s => s === competenceFilter);
          // If the API expects IDs, we'd need to fetch the skill list with IDs
          // For now, we'll pass the filter as-is and let the API handle it
        }

        const params: any = {
          page: partnersPage,
          per_page: 12
        };

        // Add filters if set
        if (competenceFilter) {
          // The API might accept skill_ids or skill names - adjust based on API docs
          // For now, we'll pass it as a query parameter
          params.skill_name = competenceFilter;
        }
        if (availabilityFilter.length > 0) {
          params.availability = availabilityFilter;
        }
        // Note: organization filter is applied client-side since it's in common_organizations

        const response = await getPersonalUserNetwork(params);
        const data = response.data ?? [];
        const meta = response.meta;

        if (Array.isArray(data)) {
          // Store network users directly
          setPartners(data as NetworkUser[]);
          if (meta) {
            setPartnersTotalPages(meta.total_pages || 1);
            setPartnersTotalCount(meta.total_count || 0);
          } else {
            // Fallback: use data length if no meta
            setPartnersTotalCount(data.length);
            setPartnersTotalPages(1);
          }
        } else {
          setPartners([]);
        }
      } catch (err) {
        console.error('Error fetching personal user network:', err);
        setPartnersError('Erreur lors du chargement de votre réseau');
        setPartners([]);
      } finally {
        setPartnersLoading(false);
      }
      return;
    }

    // For organizational users (school/company), use the partnerships endpoint
    const organizationId = getOrganizationId(state.user, state.showingPageType);
    const organizationType = getOrganizationType(state.showingPageType);

    if (!organizationId || !organizationType || (organizationType !== 'school' && organizationType !== 'company')) {
      setPartners([]);
      setPartnersLoading(false);
      return;
    }

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
  }, [state.user, state.showingPageType, partnersPage, competenceFilter, availabilityFilter, skillsOptions]);

  // Fetch skills for personal users
  const fetchSkills = useCallback(async () => {
    const isPersonalUser = state.showingPageType === 'teacher' || state.showingPageType === 'user';
    if (!isPersonalUser) return;

    try {
      setSkillsLoading(true);
      const response = await getSkills();
      const rawSkills = response.data?.data || response.data || [];
      const parsedSkills: string[] = rawSkills
        .map((skill: any) => {
          if (typeof skill === 'string') return skill;
          if (skill?.attributes?.name) return skill.attributes.name;
          return skill?.name || '';
        })
        .filter(
          (skillName: string | undefined): skillName is string =>
            typeof skillName === 'string' && skillName.trim().length > 0
        );
      const normalizedSkills = Array.from(new Set(parsedSkills)).sort((a, b) =>
        a.localeCompare(b, 'fr', { sensitivity: 'base' })
      );
      setSkillsOptions(normalizedSkills);
    } catch (err) {
      console.error('Erreur récupération des compétences :', err);
    } finally {
      setSkillsLoading(false);
    }
  }, [state.showingPageType]);

  useEffect(() => {
    const isPersonalUser = state.showingPageType === 'teacher' || state.showingPageType === 'user';
    if (isPersonalUser && selectedType === 'partner') {
      fetchSkills();
    }
  }, [state.showingPageType, selectedType, fetchSkills]);

  // Close availability dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (isAvailabilityDropdownOpen && !target.closest('.filter-group')) {
        setIsAvailabilityDropdownOpen(false);
      }
    };

    if (isAvailabilityDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isAvailabilityDropdownOpen]);

  // Handle join organization request (opens modal)
  const handleJoinOrganizationRequest = (organization: Organization) => {
    setSelectedOrganization(organization);
    setIsJoinOrganizationModalOpen(true);
  };

  // Handle save join organization (for personal users)
  const handleSaveJoinOrganization = async (message: string) => {
    if (!selectedOrganization) return;

    const organizationId = parseInt(selectedOrganization.id);
    const organizationType = selectedOrganization.type === 'schools' ? 'school' : 'company';

    try {
      if (organizationType === 'school') {
        await joinSchool(organizationId);
        showSuccess('Demande de rattachement à l\'établissement envoyée avec succès');
      } else {
        await joinCompany(organizationId);
        showSuccess('Demande de rattachement à l\'organisation envoyée avec succès');
      }
      
      // Close modal and clear selection
      setIsJoinOrganizationModalOpen(false);
      setSelectedOrganization(null);
      
      // Refresh membership requests to update the list
      await fetchMyRequests();
      
      // Refresh network after joining
      if (selectedType === 'partner') {
        await fetchPartners();
      }
    } catch (err: any) {
      console.error('Error joining organization:', err);
      const errorMessage = err.response?.data?.message || err.message || 'Erreur lors de la demande de rattachement';
      showError(errorMessage);
    }
  };

  // Fetch partners count on mount (for displaying count in tab)
  useEffect(() => {
    fetchPartnersCount();
  }, [fetchPartnersCount]);

  // Fetch partners data when partner tab is selected
  useEffect(() => {
    // Only fetch partners data when partner tab is selected
    if (selectedType === 'partner') {
      fetchPartners();
    }
  }, [selectedType, fetchPartners]);

  // Function to fetch partnership requests count (reusable)
  const fetchRequestsCount = useCallback(async () => {
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
  }, [state.user, state.showingPageType]);

  // Function to fetch partnership requests (reusable)
  const fetchRequests = useCallback(async () => {
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
  }, [state.user, state.showingPageType, requestsPage]);

  // Fetch partnership requests count on mount (for displaying count in tab)
  useEffect(() => {
    fetchRequestsCount();
  }, [fetchRequestsCount]);

  // Fetch partnership requests when tab is selected
  useEffect(() => {
    if (selectedType === 'partnership-requests') {
      fetchRequests();
    }
  }, [selectedType, fetchRequests]);

  // Function to fetch personal user organization requests
  const fetchMyRequests = useCallback(async () => {
    const isPersonalUser = state.showingPageType === 'teacher' || state.showingPageType === 'user';
    
    if (!isPersonalUser) {
      setMyRequests({ schools: [], companies: [] });
      return;
    }

    setMyRequestsLoading(true);
    setMyRequestsError(null);

    try {
      const response = await getPersonalUserOrganizations();
      const data = response.data;

      if (data) {
        setMyRequests({
          schools: data.schools || [],
          companies: data.companies || []
        });
      } else {
        setMyRequests({ schools: [], companies: [] });
      }
    } catch (err) {
      console.error('Error fetching personal user organizations:', err);
      setMyRequestsError('Erreur lors du chargement de vos demandes');
      setMyRequests({ schools: [], companies: [] });
    } finally {
      setMyRequestsLoading(false);
    }
  }, [state.showingPageType]);

  // Fetch my requests on component mount if user is personal user (before tab selection)
  useEffect(() => {
    const isPersonalUser = state.showingPageType === 'teacher' || state.showingPageType === 'user';
    if (isPersonalUser) {
      fetchMyRequests();
    }
  }, [state.showingPageType, fetchMyRequests]);

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

  const handleSavePartnership = async (partnershipData: any) => {
    const organizationId = getOrganizationId(state.user, state.showingPageType);
    const organizationType = getOrganizationType(state.showingPageType);

    if (!organizationId || !organizationType || (organizationType !== 'school' && organizationType !== 'company')) {
      console.error('Invalid organization context for partnership creation');
      return;
    }

    if (!selectedOrganization) {
      console.error('No organization selected for partnership');
      return;
    }

    try {
      // Determine partner IDs based on organization type
      const partnerId = parseInt(selectedOrganization.id);
      const isPartnerCompany = selectedOrganization.type === 'companies';
      const isPartnerSchool = selectedOrganization.type === 'schools';

      if (!isPartnerCompany && !isPartnerSchool) {
        console.error('Selected organization is not a valid company or school');
        return;
      }

      // Determine roles based on organization type and partner type
      let initiatorRole: 'beneficiary' | 'sponsor' = 'beneficiary';
      let partnerRole: 'beneficiary' | 'sponsor' = 'sponsor';
      let hasSponsorship = false;

      // If school (edu) partnering with company: school = beneficiary, company = sponsor
      if (organizationType === 'school' && isPartnerCompany) {
        initiatorRole = 'beneficiary';
        partnerRole = 'sponsor';
        hasSponsorship = true;
      }
      // If company (pro) partnering with school: company = sponsor, school = beneficiary
      else if (organizationType === 'company' && isPartnerSchool) {
        initiatorRole = 'sponsor';
        partnerRole = 'beneficiary';
        hasSponsorship = true;
      }

      // Build payload with hardcoded values
      const payload: CreatePartnershipPayload = {
        partnership_type: 'bilateral',
        name: `${selectedOrganization.name} Partnership`,
        description: partnershipData.description || '',
        partner_company_ids: isPartnerCompany ? [partnerId] : [],
        partner_school_ids: isPartnerSchool ? [partnerId] : [],
        share_members: false,
        share_projects: false,
        has_sponsorship: hasSponsorship,
        initiator_role: initiatorRole,
        partner_role: partnerRole
      };

      // Create partnership
      const response = await createPartnership(organizationId, organizationType, payload);
      
      // Success - close modal
      setIsPartnershipModalOpen(false);
      setSelectedOrganization(null);
      
      console.log('Partnership created successfully:', response);
      
      // Show success toast
      showSuccess('Demande de partenariat créée avec succès');
      
      // Refresh partners list and count (always refresh, not just if on partner tab)
      await fetchPartnersCount();
      await fetchPartners();
      
      // Also refresh partnership requests count and list (the new partnership is pending)
      await fetchRequestsCount();
      if (selectedType === 'partnership-requests') {
        await fetchRequests();
      }
    } catch (err: any) {
      console.error('Error creating partnership:', err);
      const errorMessage = err.response?.data?.message || err.message || 'Erreur lors de la création du partenariat';
      showError(errorMessage);
    }
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
      
      // Show success toast
      showSuccess('Partenariat accepté avec succès');
      
      // Remove from requests and update count
      setPartnershipRequests(prev => prev.filter(p => p.id !== partnershipId));
      setRequestsTotalCount(prev => Math.max(0, prev - 1));
      
      // Refresh partners list and count (the partnership is now confirmed)
      await fetchPartnersCount();
      await fetchPartners();
    } catch (err) {
      console.error('Error accepting partnership:', err);
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors de l\'acceptation du partenariat';
      showError(errorMessage);
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
      members_count: school.members_count || 0,
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
      members_count: company.members_count || 0,
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
    members_count: school.members_count || 0,
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
    members_count: company.members_count || 0,
    location: company.city && company.zip_code ? `${company.city}, ${company.zip_code}` : '',
    logo: company.logo_url || undefined,
    status: company.status === 'confirmed' ? 'active' as const : 'pending' as const,
    joinedDate: '',
    contactPerson: '',
    email: company.email || ''
  }));

  // Convert partners to organization-like format for display
  const isPersonalUser = state.showingPageType === 'teacher' || state.showingPageType === 'user';
  
  // For personal users, partners are NetworkUser[] - no conversion needed
  // For organizational users, convert partnerships to organizations
  const partnersAsOrganizations: Organization[] = isPersonalUser
    ? [] // Personal users don't use Organization format
    : // For organizational users, use the existing partnership conversion logic
      (partners as Partnership[])
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
              members_count: 0, // Partners don't have members_count in the API
              location: '',
              logo: undefined,
              status: 'active' as const, // All partners here are confirmed
              joinedDate: partnership.created_at || '',
              contactPerson: '',
              email: ''
            }));
        });

  // Convert NetworkUser to Member format for MemberCard
  const networkUsersAsMembers: Member[] = isPersonalUser
    ? (partners as NetworkUser[]).map((user: NetworkUser) => {
        // Extract first and last name from full_name
        const nameParts = user.full_name.split(' ');
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || '';
        
        // Translate role
        const translatedRole = translateRole(user.role);
        const translatedRoles = translateRoles([user.role || 'member']);
        
        return {
          id: String(user.id),
          firstName,
          lastName,
          fullName: user.full_name,
          email: user.email,
          profession: translateRole(user.job) || translatedRole,
          roles: translatedRoles,
          skills: user.skills.map((skill: { id: number; name: string }) => skill.name),
          availability: (() => {
            // Convert availability object to array of strings
            if (!user.availability || typeof user.availability !== 'object') return [];
            
            const dayLabels: { [key: string]: string } = {
              monday: 'Lundi',
              tuesday: 'Mardi',
              wednesday: 'Mercredi',
              thursday: 'Jeudi',
              friday: 'Vendredi',
              saturday: 'Samedi',
              sunday: 'Dimanche',
              other: 'Autre'
            };
            
            // Convert availability object to array of day labels
            const availabilityArray: string[] = [];
            Object.entries(user.availability).forEach(([key, value]) => {
              // Skip 'id' and 'available' keys, only process day keys
              if (key !== 'id' && key !== 'available' && value === true && dayLabels[key]) {
                availabilityArray.push(dayLabels[key]);
              }
            });
            
            // If 'available' is true but no specific days, add "Disponible"
            if (user.availability.available && availabilityArray.length === 0) {
              availabilityArray.push('Disponible');
            }
            
            return availabilityArray;
          })(),
          avatar: user.avatar_url || '',
          isTrusted: false,
          badges: [],
          organization: user.common_organizations?.map(org => org.name).join(', ') || '',
          take_trainee: user.take_trainee || false,
          propose_workshop: user.propose_workshop || false
        } as Member;
      })
    : [];

  // Get unique organizations for filter dropdown
  const organizationOptions = isPersonalUser
    ? Array.from(new Set(
        networkUsersAsMembers
          .map(member => member.organization)
          .filter((org): org is string => !!org)
      )).sort()
    : [];

  // Filter personal user network by skills, availability, and organization
  const filteredNetworkUsers: Member[] = isPersonalUser
    ? networkUsersAsMembers.filter((member: Member) => {
        const matchesCompetence = !competenceFilter || 
          member.skills.some(skill => skill.toLowerCase().includes(competenceFilter.toLowerCase()));
        const matchesOrganization = !organizationFilter || 
          member.organization?.toLowerCase().includes(organizationFilter.toLowerCase());
        // Note: availability is not in the NetworkUser interface, so we skip that filter for now
        return matchesCompetence && matchesOrganization;
      })
    : [];

  // No filtering for partners - show all partners (for organizational users)
  const filteredPartners = partnersAsOrganizations;

  // Convert sub-organizations to organization-like format for display
  const subOrgsAsOrganizations: Organization[] = subOrganizations.map(subOrg => ({
    id: String(subOrg.id),
    name: subOrg.name || subOrg.company_name || subOrg.school_name || 'Sous-organisation',
    type: 'sub-organization' as const,
    description: subOrg.description || subOrg.city ? `${subOrg.city}${subOrg.zip_code ? ` (${subOrg.zip_code})` : ''}` : 'Sous-organisation',
    members_count: subOrg.members_count || 0,
    location: subOrg.city && subOrg.zip_code ? `${subOrg.city}, ${subOrg.zip_code}` : subOrg.city || '',
    logo: subOrg.logo_url || undefined,
    status: subOrg.status === 'confirmed' ? 'active' as const : 'pending' as const,
    joinedDate: subOrg.created_at || '',
    contactPerson: '',
    email: ''
  }));

  // No filtering for sub-organizations - show all sub-organizations
  const filteredSubOrgs = subOrgsAsOrganizations;

  // Convert personal user organization requests to organization-like format for display
  const myRequestsAsOrganizations: Organization[] = [
    // School membership requests
    ...myRequests.schools.map((request: any) => {
      const school = request.school || {};
      return {
        id: String(school.id || request.id),
        name: school.name || 'École',
        type: 'schools' as const,
        description: `Demande de rattachement - Statut: ${request.status === 'pending' ? 'En attente' : request.status === 'accepted' || request.status === 'confirmed' ? 'Accepté' : 'Refusé'}`,
        members_count: 0,
        location: school.city || '',
        logo: school.logo_url || undefined,
        status: (request.status === 'accepted' || request.status === 'confirmed') ? 'active' as const : request.status === 'pending' ? 'pending' as const : 'inactive' as const,
        joinedDate: request.requested_at || request.updated_at || '',
        contactPerson: '',
        email: '',
        membershipRequestId: request.id,
        role: request.role
      } as Organization & { membershipRequestId: number; role: string };
    }),
    // Company membership requests
    ...myRequests.companies.map((request: any) => {
      const company = request.company || {};
      return {
        id: String(company.id || request.id),
        name: company.name || 'Entreprise',
        type: 'companies' as const,
        description: `Demande de rattachement - Statut: ${request.status === 'pending' ? 'En attente' : request.status === 'accepted' || request.status === 'confirmed' ? 'Accepté' : 'Refusé'}`,
        members_count: 0,
        location: company.city || '',
        logo: company.logo_url || undefined,
        status: (request.status === 'accepted' || request.status === 'confirmed') ? 'active' as const : request.status === 'pending' ? 'pending' as const : 'inactive' as const,
        joinedDate: request.requested_at || request.updated_at || '',
        contactPerson: '',
        email: '',
        membershipRequestId: request.id,
        role: request.role
      } as Organization & { membershipRequestId: number; role: string };
    })
  ];

  // No filtering for my requests - show all requests
  const filteredMyRequests = myRequestsAsOrganizations;

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
        members_count: 0, // Partners don't have members_count in the API
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

  // No filtering for partnership requests - show all requests
  const filteredRequests = requestsAsOrganizations;

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
            onChange={(e) => {
              // Ne jamais changer l'onglet automatiquement lors de la saisie
              const newValue = e.target.value;
              setSearchTerm(newValue);
              // S'assurer que l'onglet ne change pas automatiquement
              // L'utilisateur doit cliquer explicitement sur l'onglet "Recherche"
            }}
            onKeyDown={(e) => {
              // Empêcher toute action automatique sur Enter si on n'est pas sur l'onglet recherche
              if (e.key === 'Enter' && selectedType !== 'search' && searchTerm.trim()) {
                e.preventDefault();
              }
            }}
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
            <h3>{globalSchoolsTotalCount}</h3>
            <p>Établissements scolaires</p>
          </div>
        </div>
        <div className="summary-card">
          <div className="summary-icon">
            <img src="/icons_logo/Icon=Reseau.svg" alt="Entreprises" className="summary-icon-img" />
          </div>
          <div className="summary-content">
            <h3>{globalCompaniesTotalCount}</h3>
            <p>Organisations</p>
          </div>
        </div>
        <div className="summary-card">
          <div className="summary-icon">
            <img src="/icons_logo/Icon=Membres.svg" alt="Total" className="summary-icon-img" />
          </div>
          <div className="summary-content">
            <h3>{globalSchoolsTotalCount + globalCompaniesTotalCount}</h3>
            <p>Total</p>
          </div>
        </div>
      </div>

      {/* Type Filter */}
      <div className="network-filters">

        <div className="filter-tabs">
          {/* Show search tab only when there's a search term */}
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
            Organisations ({companiesTotalCount > 0 ? companiesTotalCount : filteredCompanies.length})
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
                {/* Filters for personal user network */}
                {isPersonalUser && selectedType === 'partner' && (
          <div className="network-user-filters" style={{ 
            marginBottom: '20px', 
            padding: '16px', 
            background: '#f9fafb', 
            borderRadius: '12px',
            border: '1px solid #e5e7eb'
          }}>
            <div style={{ marginBottom: '12px', fontSize: '1rem', fontWeight: 600, color: '#1f2937' }}>
              <i className="fas fa-filter" style={{ marginRight: '8px' }}></i>
              Filtres
            </div>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <div className="filter-group" style={{ flex: '1', minWidth: '200px' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.875rem', fontWeight: 600, color: '#374151' }}>
                  <i className="fas fa-tools" style={{ marginRight: '6px' }}></i>
                  Compétence
                </label>
                <select
                  value={competenceFilter}
                  onChange={(e) => {
                    setCompetenceFilter(e.target.value);
                    setPartnersPage(1); // Reset to first page when filter changes
                  }}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '0.875rem',
                    background: 'white',
                    cursor: 'pointer'
                  }}
                >
                  <option value="">Toutes les compétences</option>
                  {skillsOptions.map((skill) => (
                    <option key={skill} value={skill}>
                      {skill}
                    </option>
                  ))}
                </select>
              </div>
              <div className="filter-group" style={{ flex: '1', minWidth: '200px', position: 'relative' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.875rem', fontWeight: 600, color: '#374151' }}>
                  <i className="fas fa-calendar-alt" style={{ marginRight: '6px' }}></i>
                  Disponibilité
                </label>
                <div style={{ position: 'relative' }}>
                  <button
                    type="button"
                    onClick={() => setIsAvailabilityDropdownOpen(!isAvailabilityDropdownOpen)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '0.875rem',
                      background: 'white',
                      cursor: 'pointer',
                      textAlign: 'left',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <span style={{ color: availabilityFilter.length > 0 ? '#1f2937' : '#9ca3af' }}>
                      {availabilityFilter.length > 0 
                        ? `${availabilityFilter.length} jour${availabilityFilter.length > 1 ? 's' : ''} sélectionné${availabilityFilter.length > 1 ? 's' : ''}`
                        : 'Toutes les disponibilités'}
                    </span>
                    <i className={`fas fa-chevron-${isAvailabilityDropdownOpen ? 'up' : 'down'}`} style={{ fontSize: '0.75rem', color: '#9ca3af' }}></i>
                  </button>
                  {isAvailabilityDropdownOpen && (
                    <div
                      style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        marginTop: '4px',
                        padding: '8px',
                        border: '1px solid #d1d5db',
                        borderRadius: '8px',
                        background: 'white',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                        zIndex: 1000,
                        maxHeight: '200px',
                        overflowY: 'auto'
                      }}
                    >
                      {[
                        { value: 'monday', label: 'Lundi' },
                        { value: 'tuesday', label: 'Mardi' },
                        { value: 'wednesday', label: 'Mercredi' },
                        { value: 'thursday', label: 'Jeudi' },
                        { value: 'friday', label: 'Vendredi' },
                        { value: 'saturday', label: 'Samedi' },
                        { value: 'sunday', label: 'Dimanche' },
                        { value: 'other', label: 'Autre' }
                      ].map((option) => (
                        <label
                          key={option.value}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            padding: '8px',
                            cursor: 'pointer',
                            borderRadius: '4px',
                            transition: 'background-color 0.2s'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = '#f3f4f6';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'transparent';
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={availabilityFilter.includes(option.value)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setAvailabilityFilter([...availabilityFilter, option.value]);
                              } else {
                                setAvailabilityFilter(availabilityFilter.filter(a => a !== option.value));
                              }
                              setPartnersPage(1); // Reset to first page when filter changes
                            }}
                            style={{
                              marginRight: '10px',
                              cursor: 'pointer',
                              width: '16px',
                              height: '16px'
                            }}
                          />
                          <span style={{ fontSize: '0.875rem', color: '#374151' }}>{option.label}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="filter-group" style={{ flex: '1', minWidth: '200px' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.875rem', fontWeight: 600, color: '#374151' }}>
                  <i className="fas fa-building" style={{ marginRight: '6px' }}></i>
                  Établissement / Organisation
                </label>
                <select
                  value={organizationFilter}
                  onChange={(e) => {
                    setOrganizationFilter(e.target.value);
                    setPartnersPage(1); // Reset to first page when filter changes
                  }}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '0.875rem',
                    background: 'white',
                    cursor: 'pointer'
                  }}
                >
                  <option value="">Tous les établissements</option>
                  {organizationOptions.map((org) => (
                    <option key={org} value={org}>
                      {org}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {(competenceFilter || availabilityFilter.length > 0 || organizationFilter) && (
              <div style={{ marginTop: '12px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button
                  onClick={() => {
                    setCompetenceFilter('');
                    setAvailabilityFilter([]);
                    setOrganizationFilter('');
                  }}
                  style={{
                    padding: '6px 12px',
                    background: '#ef4444',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '0.875rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <i className="fas fa-times"></i>
                  Réinitialiser les filtres
                </button>
              </div>
            )}
          </div>
        )}
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
        {displayItems.length === 0 && !schoolsLoading && !companiesLoading && !partnersLoading && !requestsLoading && !subOrgsLoading && !myRequestsLoading && !searchLoading && isPersonalUser && selectedType === 'partner' && filteredNetworkUsers.length === 0 && (
          <div className="empty-message">Aucun résultat trouvé</div>
        )}
        {displayItems.length === 0 && !schoolsLoading && !companiesLoading && !partnersLoading && !requestsLoading && !subOrgsLoading && !myRequestsLoading && !searchLoading && !(isPersonalUser && selectedType === 'partner') && (
          <div className="empty-message">Aucun résultat trouvé</div>
        )}
        
        {/* Display network users for personal users using MemberCard */}
        {isPersonalUser && selectedType === 'partner' && (
          <div className="members-grid">
            {filteredNetworkUsers.length > 0 ? filteredNetworkUsers.map((member) => (
              <MemberCard
                key={member.id}
                member={member}
                badgeCount={member.badges?.length || 0}
                onClick={() => {
                  // Handle member card click - could open a profile modal
                  console.log('View member profile:', member.id);
                }}
                onContactClick={() => {
                  // Handle contact click - mailto is handled in MemberCard
                  console.log('Contact member:', member.email);
                }}
                onViewProfile={() => {
                  // Open member profile modal
                  setSelectedNetworkMember(member);
                }}
                onRoleChange={(newRole) => {
                  // For network users, role change might not be applicable
                  console.log('Role change not applicable for network users');
                }}
                disableRoleDropdown={true}
              />
            )) : (
              null
            )}
          </div>
        )}
        
        {/* Display organizations for other tabs */}
        {!(isPersonalUser && selectedType === 'partner') && (
          <div className="grid !grid-cols-3">
            {displayItems.map((organization) => {
            // Check if this is a partnership request
            const isPartnershipRequest = selectedType === 'partnership-requests' && 
              'partnershipId' in organization;
            
            if (isPartnershipRequest && 'partnershipId' in organization) {
              const orgWithPartnership = organization as Organization & { partnershipId: number; partnership: Partnership };
              const partnershipId = orgWithPartnership.partnershipId;
              const partnership = orgWithPartnership.partnership;
              
              // Check if current user is the initiator by checking all their organization/school IDs
              const isInitiator = (() => {
                if (!partnership.initiator_id || !partnership.initiator_type) {
                  return false;
                }
                
                // Check all companies
                const companyIds = state.user.available_contexts?.companies?.map(c => c.id) || [];
                if (partnership.initiator_type === 'Company' && companyIds.includes(partnership.initiator_id)) {
                  return true;
                }
                
                // Check all schools
                const schoolIds = state.user.available_contexts?.schools?.map(s => s.id) || [];
                if (partnership.initiator_type === 'School' && schoolIds.includes(partnership.initiator_id)) {
                  return true;
                }
                
                return false;
              })();
              
              return (
                <div 
                  key={organization.id} 
                  className="organization-card"
                  onClick={() => {
                    setSelectedPartnershipRequest({ partnership, partnerName: organization.name });
                    setIsPartnershipRequestDetailsModalOpen(true);
                  }}
                  style={{ cursor: 'pointer' }}
                >
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
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAcceptPartnership(partnershipId);
                          }}
                          style={{ flex: 1 }}
                        >
                          <i className="fas fa-check"></i> Accepter
                        </button>
                        <button
                          className="btn btn-outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRejectPartnership(partnershipId);
                          }}
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
            onPartnership={!isPartner && !isSubOrganization && !isPersonalUser ? () => handlePartnershipProposal(organization) : undefined}
            onJoin={isPersonalUser && (organization.type === 'schools' || organization.type === 'companies') && selectedType !== 'my-requests' ? () => handleJoinOrganizationRequest(organization) : undefined}
            isPersonalUser={isPersonalUser}
            onClick={() => handleViewDetails(organization)}
            hideJoinButton={selectedType === 'my-requests'}
            hideMembersCount={selectedType === 'my-requests'}
          />
            );
          })}
          </div>
        )}
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

      {/* Join Organization Modal (for personal users) */}
      {isJoinOrganizationModalOpen && selectedOrganization && (
        <JoinOrganizationModal
          onClose={() => {
            setIsJoinOrganizationModalOpen(false);
            setSelectedOrganization(null);
          }}
          onSave={handleSaveJoinOrganization}
          initialOrganization={selectedOrganization}
          organizationType={selectedOrganization.type === 'schools' ? 'school' : 'company'}
        />
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
          organizationType={getOrganizationType(state.showingPageType)}
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

      {/* Partnership Request Details Modal */}
      {isPartnershipRequestDetailsModalOpen && selectedPartnershipRequest && (
        <PartnershipRequestDetailsModal
          partnership={selectedPartnershipRequest.partnership}
          partnerName={selectedPartnershipRequest.partnerName}
          user={state.user}
          onClose={() => {
            setIsPartnershipRequestDetailsModalOpen(false);
            setSelectedPartnershipRequest(null);
          }}
          onAccept={handleAcceptPartnership}
          onReject={handleRejectPartnership}
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
              !isPartner && !isSubOrganization && selectedType !== 'my-requests'
                ? () => handlePartnershipProposal(selectedOrganizationForDetails)
                : undefined
            }
            onJoin={
              isPersonalUser && 
              selectedOrganizationForDetails && 
              (selectedOrganizationForDetails.type === 'schools' || selectedOrganizationForDetails.type === 'companies') &&
              selectedType !== 'my-requests'
                ? () => handleJoinOrganizationRequest(selectedOrganizationForDetails)
                : undefined
            }
            isPersonalUser={isPersonalUser}
            hideJoinButton={selectedType === 'my-requests'}
            hideMembersCount={selectedType === 'my-requests'}
          />
        );
      })()}

      {/* Member Profile Modal for network members */}
      {selectedNetworkMember && (
        <MemberModal
          member={selectedNetworkMember}
          onClose={() => setSelectedNetworkMember(null)}
          onUpdate={() => {
            // For network members, updates might not be applicable
            // But we can refresh the network list if needed
            console.log('Update network member:', selectedNetworkMember.id);
          }}
          onDelete={() => {
            // For network members, deletion is not applicable
            console.log('Delete not applicable for network members');
          }}
          onContactClick={() => {
            // Contact is handled via mailto in MemberCard
            console.log('Contact network member:', selectedNetworkMember.email);
          }}
          hideDeleteButton={true}
        />
      )}
    </section>
  );
};

export default Network;
