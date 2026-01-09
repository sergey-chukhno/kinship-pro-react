import React, { useState, useEffect, useCallback, useMemo } from 'react';
import AttachOrganizationModal from '../Modals/AttachOrganizationModal';
import PartnershipModal from '../Modals/PartnershipModal';
import OrganizationDetailsModal from '../Modals/OrganizationDetailsModal';
import PartnershipRequestDetailsModal from '../Modals/PartnershipRequestDetailsModal';
import BranchRequestDetailsModal from '../Modals/BranchRequestDetailsModal';
import JoinOrganizationModal from '../Modals/JoinOrganizationModal';
import MemberModal from '../Modals/MemberModal';
import OrganizationCard from '../Network/OrganizationCard';
import MemberCard from '../Members/MemberCard';
import { Member } from '../../types';
import { translateRole, translateRoles } from '../../utils/roleTranslations';
import { getSchools, getCompanies, searchOrganizations } from '../../api/RegistrationRessource';
import { getPartnerships, Partnership, acceptPartnership, rejectPartnership, getSubOrganizations, createPartnership, CreatePartnershipPayload, getPersonalUserNetwork, joinSchool, joinCompany, getPersonalUserOrganizations, getUserMembershipRequests, createSchoolBranchRequest, createCompanyBranchRequest, getBranchRequests, confirmBranchRequest, rejectBranchRequest, deleteBranchRequest, BranchRequest, getOrganizationNetwork } from '../../api/Projects';
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
  take_trainee?: boolean;
  propose_workshop?: boolean;
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
  organizations?: {
    schools?: Array<{ id: number; name: string; role: string }>;
    companies?: Array<{ id: number; name: string; role: string }>;
  };
  common_organizations: Array<{ id: number; name: string; type: string }>;
}

const availabilityToLabels = (availability: any = {}) => {
  const mapping: Record<string, string> = {
    monday: 'Lundi',
    tuesday: 'Mardi',
    wednesday: 'Mercredi',
    thursday: 'Jeudi',
    friday: 'Vendredi',
    saturday: 'Samedi',
    sunday: 'Dimanche',
    other: 'Autre',
  };

  const labels = Object.entries(mapping).reduce<string[]>((acc, [key, label]) => {
    if (availability?.[key]) acc.push(label);
    return acc;
  }, []);

  if (availability?.available && labels.length === 0) {
    labels.push('Disponible');
  }

  return labels;
};

const Network: React.FC = () => {
  const { state } = useAppContext();
  const { showSuccess, showError } = useToast();
  const [isPartnershipModalOpen, setIsPartnershipModalOpen] = useState(false);
  const [isAttachModalOpen, setIsAttachModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isPartnershipRequestDetailsModalOpen, setIsPartnershipRequestDetailsModalOpen] = useState(false);
  const [isBranchRequestDetailsModalOpen, setIsBranchRequestDetailsModalOpen] = useState(false);
  const [isJoinOrganizationModalOpen, setIsJoinOrganizationModalOpen] = useState(false);
  const [selectedOrganization, setSelectedOrganization] = useState<Organization | null>(null);
  const [selectedOrganizationForDetails, setSelectedOrganizationForDetails] = useState<Organization | null>(null);
  const [selectedPartnershipRequest, setSelectedPartnershipRequest] = useState<{ partnership: Partnership; partnerName: string } | null>(null);
  const [selectedBranchRequest, setSelectedBranchRequest] = useState<BranchRequest | null>(null);
  const [selectedNetworkMember, setSelectedNetworkMember] = useState<Member | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const isOrgDashboardInitial = state.showingPageType === 'edu' || state.showingPageType === 'pro';
  const isPersonalUserForType = state.showingPageType === 'teacher' || state.showingPageType === 'user';
  const [selectedType, setSelectedType] = useState<'schools' | 'companies' | 'partner' | 'partnership-requests' | 'sub-organizations' | 'branch-requests' | 'my-requests' | 'search' | 'join-organization' | null>(
    isOrgDashboardInitial || isPersonalUserForType ? null : 'schools'
  );
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
  const [expandedMessages, setExpandedMessages] = useState<Set<string>>(new Set());

  // Filters for personal user network
  const [competenceFilter, setCompetenceFilter] = useState('');
  const [availabilityFilter, setAvailabilityFilter] = useState<string[]>([]);
  const [organizationFilter, setOrganizationFilter] = useState('');
  const [skillsOptions, setSkillsOptions] = useState<string[]>([]);
  const [skillsLoading, setSkillsLoading] = useState(false);
  const [isAvailabilityDropdownOpen, setIsAvailabilityDropdownOpen] = useState(false);
  const [isPropositionsDropdownOpen, setIsPropositionsDropdownOpen] = useState(false);
  // Filters - stage / atelier
  const [filterStage, setFilterStage] = useState(false); // Propose un stage (take_trainee)
  const [filterWorkshop, setFilterWorkshop] = useState(false); // Propose un atelier (propose_workshop)

  // Partnership requests state
  const [partnershipRequests, setPartnershipRequests] = useState<Partnership[]>([]);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [requestsError, setRequestsError] = useState<string | null>(null);
  const [requestsPage, setRequestsPage] = useState(1);
  const [requestsTotalPages, setRequestsTotalPages] = useState(1);
  const [requestsTotalCount, setRequestsTotalCount] = useState(0);

  // Sub-organizations state
  const [subOrganizations, setSubOrganizations] = useState<any[]>([]);
  const [subOrgsIsParent, setSubOrgsIsParent] = useState<boolean>(false);
  const [subOrgsLoading, setSubOrgsLoading] = useState(false);
  const [subOrgsError, setSubOrgsError] = useState<string | null>(null);

  // Branch requests state
  const [branchRequests, setBranchRequests] = useState<BranchRequest[]>([]);
  const [branchRequestsLoading, setBranchRequestsLoading] = useState(false);
  const [branchRequestsError, setBranchRequestsError] = useState<string | null>(null);

  // Personal user requests state (for "Mes demandes" tab - pending/accepted/rejected)
  const [myRequests, setMyRequests] = useState<{ schools: any[]; companies: any[] }>({ schools: [], companies: [] });
  const [myRequestsLoading, setMyRequestsLoading] = useState(false);
  const [myRequestsError, setMyRequestsError] = useState<string | null>(null);
  
  // Personal user confirmed organizations (for activeCard display)
  const [myOrganizations, setMyOrganizations] = useState<{ schools: any[]; companies: any[] }>({ schools: [], companies: [] });
  const [myOrganizationsLoading, setMyOrganizationsLoading] = useState(false);

  // Search results state
  const [searchResults, setSearchResults] = useState<{ schools: any[]; companies: any[] }>({ schools: [], companies: [] });
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchPage, setSearchPage] = useState(1);
  const [searchTotalPages, setSearchTotalPages] = useState(1);
  const [searchTotalCount, setSearchTotalCount] = useState(0);

  // Active card state (for school/company dashboards and personal user dashboards)
  const isPersonalUserInitial = state.showingPageType === 'teacher' || state.showingPageType === 'user';
  const [activeCard, setActiveCard] = useState<'partners' | 'branches' | 'members' | 'schools' | 'companies' | 'network-members' | null>(
    isPersonalUserInitial ? 'schools' : 'partners'
  );
  
  // Local search term for filtering within activeCard tabs
  const [localSearchTerm, setLocalSearchTerm] = useState('');
  
  // Network members state (for "Membres de mon réseau" card)
  const [networkMembers, setNetworkMembers] = useState<Member[]>([]);
  const [networkMembersLoading, setNetworkMembersLoading] = useState(false);
  const [networkMembersError, setNetworkMembersError] = useState<string | null>(null);
  // Helpers: filter members by stage / workshop proposal and other filters
  const memberMatchesFilters = useCallback(
    (member: Member) => {
      if (filterStage && !member.take_trainee) return false;
      if (filterWorkshop && !member.propose_workshop) return false;
      
      // Apply competence filter (if set)
      if (competenceFilter && member.skills) {
        const memberSkills = Array.isArray(member.skills) 
          ? member.skills.map((s: any) => typeof s === 'string' ? s : s?.name || '').filter(Boolean)
          : [];
        if (!memberSkills.some(skill => skill.toLowerCase().includes(competenceFilter.toLowerCase()))) {
          return false;
        }
      }
      
      // Apply availability filter (if set)
      if (availabilityFilter.length > 0 && member.availability) {
        const memberAvailability = Array.isArray(member.availability) ? member.availability : [];
        if (!availabilityFilter.some(day => memberAvailability.includes(day))) {
          return false;
        }
      }
      
      // Apply organization filter from common_organizations (if set)
      if (organizationFilter) {
        if (member.commonOrganizations) {
          const matchesOrg = 
            member.commonOrganizations.schools.some(s => s.name.toLowerCase().includes(organizationFilter.toLowerCase())) ||
            member.commonOrganizations.companies.some(c => c.name.toLowerCase().includes(organizationFilter.toLowerCase()));
          if (!matchesOrg) {
            return false;
          }
        } else {
          // Fallback to member.organization if commonOrganizations is not available
          if (member.organization && !member.organization.toLowerCase().includes(organizationFilter.toLowerCase())) {
            return false;
          } else if (!member.organization) {
            return false;
          }
        }
      }
      
      return true;
    },
    [filterStage, filterWorkshop, competenceFilter, availabilityFilter, organizationFilter]
  );
  const filteredNetworkMembers = useMemo(
    () => networkMembers.filter(member => {
      // Apply all filters (stage, workshop, competence, availability, organization)
      if (!memberMatchesFilters(member)) return false;
      
      // Apply local search term for activeCard === 'members'
      if (localSearchTerm && localSearchTerm.trim()) {
        const searchLower = localSearchTerm.toLowerCase().trim();
        const matchesSearch = 
          (member.fullName && member.fullName.toLowerCase().includes(searchLower)) ||
          member.email.toLowerCase().includes(searchLower) ||
          (member.commonOrganizations && (
            member.commonOrganizations.schools.some(s => s.name.toLowerCase().includes(searchLower)) ||
            member.commonOrganizations.companies.some(c => c.name.toLowerCase().includes(searchLower))
          )) ||
          (member.organization && member.organization.toLowerCase().includes(searchLower));
        return matchesSearch;
      }
      
      return true;
    }),
    [networkMembers, memberMatchesFilters, localSearchTerm]
  );

  // Auto-switch to join-organization tab when user starts typing in search (if in join-organization tab)
  useEffect(() => {
    // Only auto-switch if there's a search term and we're in the join-organization tab
    // This allows user to manually switch to another tab after typing
    if (searchTerm && searchTerm.trim() && selectedType === 'join-organization') {
      // Already on the right tab, no need to switch
      // The search will trigger automatically via the useEffect that fetches search results
    } else if (!searchTerm || !searchTerm.trim()) {
      // When search is cleared, stay on join-organization tab (don't redirect)
      // This allows user to continue searching
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, selectedType]); // Include selectedType to check if we're on join-organization tab

  // Reset search page to 1 when search term changes (only for search/join-organization tabs)
  useEffect(() => {
    if (selectedType === 'search' || selectedType === 'join-organization') {
      setSearchPage(1);
    }
  }, [searchTerm, selectedType]);

  // Fetch search results when search or join-organization tab is selected
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

    if (selectedType === 'search' || selectedType === 'join-organization') {
      fetchSearchResults();
    }
  }, [selectedType, searchTerm, searchPage]);

  // Fetch sub-organizations (reusable function)
  const fetchSubOrganizations = useCallback(async () => {
    const organizationId = getOrganizationId(state.user, state.showingPageType);
    const organizationType = getOrganizationType(state.showingPageType);

    if (!organizationId || !organizationType || (organizationType !== 'school' && organizationType !== 'company')) {
      setSubOrganizations([]);
      setSubOrgsIsParent(false);
      return;
    }

    setSubOrgsLoading(true);
    setSubOrgsError(null);

    try {
      const response = await getSubOrganizations(organizationId, organizationType);
      const data = response.data ?? [];

      if (Array.isArray(data)) {
        setSubOrganizations(data);
        setSubOrgsIsParent(response.isParent || false);
      } else {
        setSubOrganizations([]);
        setSubOrgsIsParent(false);
      }
    } catch (err) {
      console.error('Error fetching sub-organizations:', err);
      // setSubOrgsError('Erreur lors du chargement des sous-organisations');
      setSubOrganizations([]);
      setSubOrgsIsParent(false);
    } finally {
      setSubOrgsLoading(false);
    }
  }, [state.user, state.showingPageType]);

  // Fetch sub-organizations on mount and when context changes (for organizational users)
  useEffect(() => {
    const organizationId = getOrganizationId(state.user, state.showingPageType);
    const organizationType = getOrganizationType(state.showingPageType);

    // Only fetch if user has an organizational context (edu or pro)
    if (organizationId && organizationType && (organizationType === 'school' || organizationType === 'company')) {
      fetchSubOrganizations();
    }
  }, [state.user, state.showingPageType, fetchSubOrganizations]);

  // Fetch branch requests when tab is selected
  const fetchBranchRequests = useCallback(async () => {
    const organizationId = getOrganizationId(state.user, state.showingPageType);
    const organizationType = getOrganizationType(state.showingPageType);

    if (!organizationId || !organizationType || (organizationType !== 'school' && organizationType !== 'company')) {
      setBranchRequests([]);
      return;
    }

    setBranchRequestsLoading(true);
    setBranchRequestsError(null);

    try {
      const response = await getBranchRequests(organizationId, organizationType);
      const data = response.data ?? [];

      if (Array.isArray(data)) {
        setBranchRequests(data);
      } else {
        setBranchRequests([]);
      }
    } catch (err: any) {
      console.error('Error fetching branch requests:', err);
      // Check if it's a 403 Forbidden error with superadmin requirement
      if (err?.response?.status === 403 && err?.response?.data?.message?.includes('Superadmin')) {
        setBranchRequestsError('Vous devez être superadmin pour voir et gérer les demandes de rattachement');
      } else {
        setBranchRequestsError('Erreur lors du chargement des demandes de rattachement');
      }
      setBranchRequests([]);
    } finally {
      setBranchRequestsLoading(false);
    }
  }, [state.user, state.showingPageType]);

  // Fetch branch requests on mount and when context changes (for organizational users)
  useEffect(() => {
    const organizationId = getOrganizationId(state.user, state.showingPageType);
    const organizationType = getOrganizationType(state.showingPageType);

    // Only fetch if user has an organizational context (edu or pro)
    if (organizationId && organizationType && (organizationType === 'school' || organizationType === 'company')) {
      fetchBranchRequests();
    }
  }, [state.user, state.showingPageType, fetchBranchRequests]);

  // Fetch global schools count on mount (for summary cards - never changes)
  useEffect(() => {
    const fetchGlobalSchoolsCount = async () => {
      try {
        const isPersonalUser = state.showingPageType === 'teacher' || state.showingPageType === 'user';
        
        if (isPersonalUser) {
          // For personal users, count only confirmed organizations from their own list
          const response = await getPersonalUserOrganizations();
          const data = response.data;
          
          if (data) {
            const confirmedSchools = (data.schools || []).filter((school: any) => school.my_status === 'confirmed');
            setGlobalSchoolsTotalCount(confirmedSchools.length);
          } else {
            setGlobalSchoolsTotalCount(0);
          }
        } else {
          // For organization users, count all confirmed schools in the system
          const params: any = {
            page: 1,
            per_page: 50, // Just to get the meta.total_count
            status: 'confirmed'
          };

          const response = await getSchools(params);
          const meta = response?.data?.meta;

          if (meta) {
            setGlobalSchoolsTotalCount(meta.total_count || 0);
          }
        }
      } catch (err) {
        console.error('Error fetching global schools count:', err);
        setGlobalSchoolsTotalCount(0);
      }
    };

    fetchGlobalSchoolsCount();
  }, [state.showingPageType]);

  // Fetch global companies count on mount (for summary cards - never changes)
  useEffect(() => {
    const fetchGlobalCompaniesCount = async () => {
      try {
        const isPersonalUser = state.showingPageType === 'teacher' || state.showingPageType === 'user';
        
        if (isPersonalUser) {
          // For personal users, count only confirmed organizations from their own list
          const response = await getPersonalUserOrganizations();
          const data = response.data;
          
          if (data) {
            const confirmedCompanies = (data.companies || []).filter((company: any) => company.my_status === 'confirmed');
            setGlobalCompaniesTotalCount(confirmedCompanies.length);
          } else {
            setGlobalCompaniesTotalCount(0);
          }
        } else {
          // For organization users, count all confirmed companies in the system
          const params: any = {
            page: 1,
            per_page: 50, // Just to get the meta.total_count
            status: 'confirmed'
          };

          const response = await getCompanies(params);
          const meta = response?.data?.meta;

          if (meta) {
            setGlobalCompaniesTotalCount(meta.total_count || 0);
          }
        }
      } catch (err) {
        console.error('Error fetching global companies count:', err);
        setGlobalCompaniesTotalCount(0);
      }
    };

    fetchGlobalCompaniesCount();
  }, [state.showingPageType]);


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
          per_page: 50, // Just to get the meta.total_count
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
          per_page: 1000 // Fetch all members at once (consistent with pro/edu dashboards)
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
          page: 1, // Always fetch from first page since we're getting all members
          per_page: 1000 // Fetch all members at once (consistent with pro/edu dashboards)
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
    } catch (err: any) {
      console.error('Error fetching partners:', err);
      // Check if it's a 403 Forbidden error with superadmin requirement
      if (err?.response?.status === 403 && err?.response?.data?.message?.includes('Superadmin')) {
        setPartnersError('Vous devez être superadmin pour voir et gérer les partenariats de l\'organisation');
      } else {
        setPartnersError('Erreur lors du chargement des partenaires');
      }
      setPartners([]);
    } finally {
      setPartnersLoading(false);
    }
  }, [state.user, state.showingPageType, partnersPage, competenceFilter, availabilityFilter, skillsOptions]);

  // Fetch skills for personal users and organizations
  const fetchSkills = useCallback(async () => {
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
  }, []);

  // Load skills on mount for all user types (needed for filters)
  useEffect(() => {
    fetchSkills();
  }, [fetchSkills]);

  // Reset filters when changing tabs (activeCard or selectedType)
  useEffect(() => {
    setCompetenceFilter('');
    setAvailabilityFilter([]);
    setOrganizationFilter('');
    setFilterStage(false);
    setFilterWorkshop(false);
    setLocalSearchTerm('');
    setIsAvailabilityDropdownOpen(false);
    setIsPropositionsDropdownOpen(false);
  }, [activeCard, selectedType]);

  // Redirect from 'my-requests' tab if there are no requests
  useEffect(() => {
    if (selectedType === 'my-requests' && 
        myRequests.schools.length === 0 && 
        myRequests.companies.length === 0) {
      // Redirect to schools tab for personal users
      setSelectedType(null);
      setActiveCard('schools');
    }
  }, [selectedType, myRequests.schools.length, myRequests.companies.length]);

  // Close availability and propositions dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if ((isAvailabilityDropdownOpen || isPropositionsDropdownOpen) && !target.closest('.filter-group')) {
        setIsAvailabilityDropdownOpen(false);
        setIsPropositionsDropdownOpen(false);
      }
    };

    if (isAvailabilityDropdownOpen || isPropositionsDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isAvailabilityDropdownOpen, isPropositionsDropdownOpen]);

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

  // Fetch partners data when partner tab is selected OR when activeCard is 'partners' or 'network-members'
  useEffect(() => {
    const isOrgDashboard = state.showingPageType === 'edu' || state.showingPageType === 'pro';
    const isPersonalUserDashboard = state.showingPageType === 'teacher' || state.showingPageType === 'user';
    if (selectedType === 'partner' || (isOrgDashboard && activeCard === 'partners') || (isPersonalUserDashboard && activeCard === 'network-members')) {
      fetchPartners();
    }
  }, [selectedType, activeCard, state.showingPageType, fetchPartners]);

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
    } catch (err: any) {
      console.error('Error fetching partnership requests:', err);
      // Check if it's a 403 Forbidden error with superadmin requirement
      if (err?.response?.status === 403 && err?.response?.data?.message?.includes('Superadmin')) {
        setRequestsError('Vous devez être superadmin pour voir et gérer les demandes de partenariats');
      } else {
        setRequestsError('Erreur lors du chargement des demandes de partenariats');
      }
      setPartnershipRequests([]);
    } finally {
      setRequestsLoading(false);
    }
  }, [state.user, state.showingPageType, requestsPage]);

  // Fetch partnership requests count on mount (for displaying count in tab)
  useEffect(() => {
    fetchRequestsCount();
  }, [fetchRequestsCount]);

  // Fetch partnership requests when tab is selected OR when activeCard is 'partners'
  useEffect(() => {
    const isOrgDashboard = state.showingPageType === 'edu' || state.showingPageType === 'pro';
    if (selectedType === 'partnership-requests' || (isOrgDashboard && activeCard === 'partners')) {
      fetchRequests();
    }
  }, [selectedType, activeCard, state.showingPageType, fetchRequests]);

  // Function to fetch personal user membership requests (pending, accepted, rejected)
  const fetchMyRequests = useCallback(async () => {
    const isPersonalUser = state.showingPageType === 'teacher' || state.showingPageType === 'user';
    
    if (!isPersonalUser) {
      setMyRequests({ schools: [], companies: [] });
      return;
    }

    setMyRequestsLoading(true);
    setMyRequestsError(null);

    try {
      const response = await getUserMembershipRequests();
      const data = response.data;

      console.log('Membership requests response:', data);

      if (data) {
        setMyRequests({
          schools: data.schools || [],
          companies: data.companies || []
        });
      } else {
        setMyRequests({ schools: [], companies: [] });
      }
    } catch (err) {
      console.error('Error fetching membership requests:', err);
      setMyRequestsError('Erreur lors du chargement de vos demandes');
      setMyRequests({ schools: [], companies: [] });
    } finally {
      setMyRequestsLoading(false);
    }
  }, [state.showingPageType]);

  // Function to fetch personal user confirmed organizations (for activeCard display)
  const fetchMyOrganizations = useCallback(async () => {
    const isPersonalUser = state.showingPageType === 'teacher' || state.showingPageType === 'user';
    
    if (!isPersonalUser) {
      setMyOrganizations({ schools: [], companies: [] });
      return;
    }

    setMyOrganizationsLoading(true);

    try {
      const response = await getPersonalUserOrganizations();
      const data = response.data;

      console.log('My confirmed organizations response:', data);

      if (data) {
        setMyOrganizations({
          schools: data.schools || [],
          companies: data.companies || []
        });
      } else {
        setMyOrganizations({ schools: [], companies: [] });
      }
    } catch (err) {
      console.error('Error fetching confirmed organizations:', err);
      setMyOrganizations({ schools: [], companies: [] });
    } finally {
      setMyOrganizationsLoading(false);
    }
  }, [state.showingPageType]);

  // Fetch my requests and organizations on component mount if user is personal user
  useEffect(() => {
    const isPersonalUser = state.showingPageType === 'teacher' || state.showingPageType === 'user';
    if (isPersonalUser) {
      fetchMyRequests();
      fetchMyOrganizations();
    }
  }, [state.showingPageType, fetchMyRequests, fetchMyOrganizations]);

  // Function to count all unique partners (confirmed only, excluding pending)
  const countAllPartners = useCallback((): number => {
    const isPersonalUser = state.showingPageType === 'teacher' || state.showingPageType === 'user';
    
    if (isPersonalUser) {
      // For personal users, count network users
      return partnersTotalCount;
    }

    // For organizational users, count only confirmed partnerships (exclude pending)
    const organizationId = getOrganizationId(state.user, state.showingPageType);
    if (!organizationId) return 0;

    // Get all unique partner IDs from confirmed partnerships only
    const confirmedPartnerIds = new Set<number>();
    (partners as Partnership[])
      .filter(p => p.status === 'confirmed')
      .forEach(partnership => {
        (partnership.partners || []).forEach(partner => {
          if (partner.id !== organizationId) {
            confirmedPartnerIds.add(partner.id);
          }
        });
      });

    return confirmedPartnerIds.size;
  }, [state.user, state.showingPageType, partners, partnersTotalCount]);

  // Function to count branches (0 if it's a branch itself)
  // Only confirmed branches (exclude pending requests)
  const countBranches = useCallback((): number => {
    // If isParent is false, it means this organization is a branch, so return 0
    if (subOrgsIsParent === false && subOrganizations.length > 0) {
      return 0;
    }
    // Count confirmed branches only
    const confirmedBranchesCount = subOrganizations.length;
    return confirmedBranchesCount;
  }, [subOrganizations, subOrgsIsParent]);

  // Function to fetch network members (from partners with share_members=true + all branch members)
  const fetchNetworkMembers = useCallback(async () => {
    const isPersonalUser = state.showingPageType === 'teacher' || state.showingPageType === 'user';
    const organizationId = getOrganizationId(state.user, state.showingPageType);
    const organizationType = getOrganizationType(state.showingPageType);

    if (isPersonalUser || !organizationId || !organizationType || (organizationType !== 'school' && organizationType !== 'company')) {
      setNetworkMembers([]);
      return;
    }

    setNetworkMembersLoading(true);
    setNetworkMembersError(null);

    try {
      // Use the new network endpoint that returns all network members
      const networkData = await getOrganizationNetwork(organizationId, organizationType, true);
      
      // Convert to Member format
      const convertedMembers: Member[] = networkData.map((m: any) => {
        // Extract common organizations
        const commonOrganizations = m.common_organizations ? {
          schools: (m.common_organizations.schools || []).map((school: any) => ({
            id: school.id,
            name: school.name,
            type: school.type || 'School'
          })),
          companies: (m.common_organizations.companies || []).map((company: any) => ({
            id: company.id,
            name: company.name,
            type: company.type || 'Company'
          }))
        } : { schools: [], companies: [] };

        return {
          id: String(m.id),
          firstName: m.first_name,
          lastName: m.last_name,
          fullName: m.full_name || `${m.first_name} ${m.last_name}`,
          email: m.email || '',
          profession: m.profession || m.job || '',
          roles: translateRoles([m.role || m.role_in_school || m.role_in_company || 'member']),
          skills: (() => {
            const allSkills: string[] = [];
            if (m.skills && Array.isArray(m.skills)) {
              m.skills.forEach((s: any) => {
                // Handle string format (legacy)
                if (typeof s === 'string') {
                  allSkills.push(s);
                }
                // Handle object format with name and sub_skills
                else if (typeof s === 'object' && s !== null) {
                  // Add main skill name
                  if (s.name) allSkills.push(s.name);
                  // Add sub-skill names
                  if (s.sub_skills && Array.isArray(s.sub_skills)) {
                    s.sub_skills.forEach((sub: any) => {
                      if (sub.name) allSkills.push(sub.name);
                      // Also handle if sub_skill is a string
                      else if (typeof sub === 'string') allSkills.push(sub);
                    });
                  }
                }
              });
            }
            return allSkills;
          })(),
          availability: availabilityToLabels(m.availability),
          avatar: m.avatar_url || '',
          isTrusted: false,
          badges: m.badges || [],
          organization: m.organization_name || m.company_name || m.school_name || '',
          organizationType: m.school_name ? 'school' as const : (m.company_name || m.organization_name) ? 'company' as const : undefined,
          take_trainee: m.take_trainee || false,
          propose_workshop: m.propose_workshop || false,
          commonOrganizations
        };
      });

      setNetworkMembers(convertedMembers);
    } catch (err) {
      console.error('Error fetching network members:', err);
      setNetworkMembersError('Erreur lors du chargement des membres du réseau');
      setNetworkMembers([]);
    } finally {
      setNetworkMembersLoading(false);
    }
  }, [state.user, state.showingPageType]);

  // Count network members
  const countNetworkMembers = useCallback((): number => {
    return networkMembers.filter(memberMatchesFilters).length;
  }, [networkMembers, memberMatchesFilters]);

  // Fetch network members for org dashboards (counter + card)
  useEffect(() => {
    const isPersonalUser = state.showingPageType === 'teacher' || state.showingPageType === 'user';
    if (!isPersonalUser) {
      fetchNetworkMembers();
    }
  }, [activeCard, state.showingPageType, fetchNetworkMembers]);

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

  const handleSaveAttachRequest = async (attachData: any) => {
    const organizationId = getOrganizationId(state.user, state.showingPageType);
    const organizationType = getOrganizationType(state.showingPageType);

    if (!organizationId || !organizationType || (organizationType !== 'school' && organizationType !== 'company')) {
      showError('Contexte d\'organisation invalide');
      return;
    }

    if (!selectedOrganization) {
      showError('Aucune organisation sélectionnée');
      return;
    }

    try {
      const parentId = parseInt(selectedOrganization.id);
      const message = attachData.motivation || 'Demande de rattachement';

      // Validate: Branch requests can only be same-type (company->company, school->school)
      // Partnerships can be cross-type, but branches cannot
      if (organizationType === 'school' && selectedOrganization.type !== 'schools') {
        showError('Une école ne peut devenir une branche que d\'une autre école. Pour collaborer avec une organisation, utilisez la fonctionnalité de partenariat.');
        return;
      }
      
      if (organizationType === 'company' && selectedOrganization.type !== 'companies') {
        showError('Une organisation ne peut devenir une branche que d\'une autre organisation. Pour collaborer avec une école, utilisez la fonctionnalité de partenariat.');
        return;
      }

      // Use current organization type to determine which endpoint to call
      // Use parent organization type to determine which parameter to send
      if (organizationType === 'school') {
        // Current org is a school - use school endpoint
        const payload: any = { message: message };
        if (selectedOrganization.type === 'schools') {
          payload.parent_school_id = parentId;
        } else {
          showError('Type d\'organisation parent non supporté pour le rattachement');
          return;
        }
        await createSchoolBranchRequest(organizationId, payload);
      } else if (organizationType === 'company') {
        // Current org is a company - use company endpoint
        const payload: any = { message: message };
        if (selectedOrganization.type === 'companies') {
          payload.parent_company_id = parentId;
        } else {
          showError('Type d\'organisation parent non supporté pour le rattachement');
          return;
        }
        await createCompanyBranchRequest(organizationId, payload);
      } else {
        showError('Type d\'organisation non supporté pour le rattachement');
        return;
      }

      showSuccess('Demande de rattachement envoyée avec succès');
      setIsAttachModalOpen(false);
      setSelectedOrganization(null);

      // Refresh branch requests (data is now loaded in background)
      await fetchBranchRequests();
    } catch (err: any) {
      console.error('Error creating branch request:', err);
      showError(err?.response?.data?.message || 'Erreur lors de l\'envoi de la demande de rattachement');
    }
  };

  // Handle confirm branch request
  const handleConfirmBranchRequest = async (requestId: number) => {
    const organizationId = getOrganizationId(state.user, state.showingPageType);
    const organizationType = getOrganizationType(state.showingPageType);

    if (!organizationId || !organizationType || (organizationType !== 'school' && organizationType !== 'company')) {
      return;
    }

    try {
      await confirmBranchRequest(organizationId, organizationType, requestId);
      showSuccess('Demande de rattachement confirmée avec succès');
      
      // Refresh branch requests
      await fetchBranchRequests();
      
      // Refresh sub-organizations (the confirmed request becomes a branch)
      await fetchSubOrganizations();
    } catch (err: any) {
      console.error('Error confirming branch request:', err);
      showError(err?.response?.data?.message || 'Erreur lors de la confirmation de la demande');
    }
  };

  // Handle reject branch request
  const handleRejectBranchRequest = async (requestId: number) => {
    const organizationId = getOrganizationId(state.user, state.showingPageType);
    const organizationType = getOrganizationType(state.showingPageType);

    if (!organizationId || !organizationType || (organizationType !== 'school' && organizationType !== 'company')) {
      return;
    }

    try {
      await rejectBranchRequest(organizationId, organizationType, requestId);
      showSuccess('Demande de rattachement rejetée');
      
      // Refresh branch requests
      await fetchBranchRequests();
    } catch (err: any) {
      console.error('Error rejecting branch request:', err);
      showError(err?.response?.data?.message || 'Erreur lors du rejet de la demande');
    }
  };

  // Handle delete/cancel branch request (by initiator)
  const handleDeleteBranchRequest = async (requestId: number) => {
    const organizationId = getOrganizationId(state.user, state.showingPageType);
    const organizationType = getOrganizationType(state.showingPageType);

    if (!organizationId || !organizationType || (organizationType !== 'school' && organizationType !== 'company')) {
      return;
    }

    try {
      await deleteBranchRequest(organizationId, organizationType, requestId);
      showSuccess('Demande de rattachement annulée');
      
      // Refresh branch requests
      await fetchBranchRequests();
    } catch (err: any) {
      console.error('Error deleting branch request:', err);
      showError(err?.response?.data?.message || 'Erreur lors de l\'annulation de la demande');
    }
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
  // Display all schools and companies for all dashboards (partnerships can be cross-type)
  // Branch requests will be validated separately to ensure same-type only
  const searchResultsAsOrganizations: Organization[] = useMemo(() => [
    // Convert schools (show all for all dashboards)
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
      email: school.email || '',
      take_trainee: school.take_trainee,
      propose_workshop: school.propose_workshop
    })),
    // Convert companies (show all for all dashboards)
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
      email: company.email || '',
      take_trainee: company.take_trainee,
      propose_workshop: company.propose_workshop
    }))
  ], [searchResults.schools, searchResults.companies]);
  
  // Filter search results by propositions if filters are active
  const filteredSearchResults = useMemo(() => {
    console.log('Filtering search results - filterStage:', filterStage, 'filterWorkshop:', filterWorkshop);
    console.log('Total search results:', searchResultsAsOrganizations.length);
    
    const filtered = searchResultsAsOrganizations.filter((org: any) => {
      // If any proposition filter is active, show only companies (not schools)
      if (filterStage || filterWorkshop) {
        // Exclude schools when proposition filters are active
        if (org.type === 'schools') {
          console.log('Excluding school:', org.name);
          return false;
        }
        
        // Filter companies by stage proposition (take_trainee)
        if (filterStage && !org.take_trainee) {
          console.log('Excluding company (no stage):', org.name, 'take_trainee:', org.take_trainee);
          return false;
        }
        // Filter companies by workshop proposition (propose_workshop)
        if (filterWorkshop && !org.propose_workshop) {
          console.log('Excluding company (no workshop):', org.name, 'propose_workshop:', org.propose_workshop);
          return false;
        }
        
        console.log('Including company:', org.name, 'take_trainee:', org.take_trainee, 'propose_workshop:', org.propose_workshop);
      }
      return true;
    });
    
    console.log('Filtered results count:', filtered.length);
    return filtered;
  }, [searchResultsAsOrganizations, filterStage, filterWorkshop]);

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
  const isOrgDashboard = state.showingPageType === 'edu' || state.showingPageType === 'pro';
  const isPersonalUserDashboard = state.showingPageType === 'teacher' || state.showingPageType === 'user';
  
  // For personal users, partners are NetworkUser[] - no conversion needed
  // For organizational users, convert partnerships to organizations (confirmed only, excluding pending)
  const partnersAsOrganizations: Organization[] = isPersonalUser
    ? [] // Personal users don't use Organization format
    : // For organizational users, only include confirmed partnerships (exclude pending)
      [
        // Confirmed partnerships only - No description for active partners
        ...(partners as Partnership[])
          .filter(partnership => partnership.status === 'confirmed')
          .flatMap(partnership => {
            const organizationId = getOrganizationId(state.user, state.showingPageType);
            return (partnership.partners || [])
              .filter(partner => partner.id !== organizationId)
              .map(partner => ({
                id: String(partner.id),
                name: partner.name,
                type: 'partner' as const,
                description: '', // No description for confirmed partners
                members_count: partner.members_count || 0,
                location: partner.city && partner.zip_code ? `${partner.city}, ${partner.zip_code}` : partner.city || partner.zip_code || '',
                logo: undefined,
                status: 'active' as const,
                joinedDate: partnership.created_at || '',
                contactPerson: '',
                email: partner.email || ''
              }));
          })
      ];

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
        
        // Extract common organizations - convert flat array to structured format
        const commonOrganizations = user.common_organizations && Array.isArray(user.common_organizations) ? {
          schools: user.common_organizations
            .filter((org: any) => org.type === 'School' || org.type === 'school')
            .map((org: any) => ({
              id: org.id,
              name: org.name,
              type: org.type || 'School'
            })),
          companies: user.common_organizations
            .filter((org: any) => org.type === 'Company' || org.type === 'company')
            .map((org: any) => ({
              id: org.id,
              name: org.name,
              type: org.type || 'Company'
            }))
        } : { schools: [], companies: [] };
        

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
          organization: (() => {
            // Use user's own organizations (from organizations field) - priority
            if (user.organizations) {
              // Check schools first
              if (user.organizations.schools && user.organizations.schools.length > 0) {
                return user.organizations.schools[0].name;
              }
              // Then check companies
              if (user.organizations.companies && user.organizations.companies.length > 0) {
                return user.organizations.companies[0].name;
              }
            }
            // Fallback to common organizations if no own organizations
            if (user.common_organizations && Array.isArray(user.common_organizations) && user.common_organizations.length > 0) {
              return user.common_organizations[0].name;
            }
            return '';
          })(),
          // Store all organizations the user belongs to for filtering
          allOrganizations: (() => {
            const orgs: string[] = [];
            // Add all user's own organizations
            if (user.organizations) {
              if (user.organizations.schools && Array.isArray(user.organizations.schools)) {
                const schoolNames = user.organizations.schools
                  .map(s => s?.name?.trim() || '')
                  .filter(name => name.length > 0);
                orgs.push(...schoolNames);
              }
              if (user.organizations.companies && Array.isArray(user.organizations.companies)) {
                const companyNames = user.organizations.companies
                  .map(c => c?.name?.trim() || '')
                  .filter(name => name.length > 0);
                orgs.push(...companyNames);
              }
            }
            // Add common organizations from flat array
            if (user.common_organizations && Array.isArray(user.common_organizations)) {
              const commonNames = user.common_organizations
                .map(org => org?.name?.trim() || '')
                .filter(name => name.length > 0);
              orgs.push(...commonNames);
            }
            // Also add from the structured commonOrganizations object (in case there's a mismatch)
            // This ensures we catch all organizations
            const structuredCommonOrgs = commonOrganizations;
            if (structuredCommonOrgs) {
              if (structuredCommonOrgs.schools && Array.isArray(structuredCommonOrgs.schools)) {
                const schoolNames = structuredCommonOrgs.schools
                  .map(s => s?.name?.trim() || '')
                  .filter(name => name.length > 0);
                orgs.push(...schoolNames);
              }
              if (structuredCommonOrgs.companies && Array.isArray(structuredCommonOrgs.companies)) {
                const companyNames = structuredCommonOrgs.companies
                  .map(c => c?.name?.trim() || '')
                  .filter(name => name.length > 0);
                orgs.push(...companyNames);
              }
            }
            // Remove duplicates and return
            const finalOrgs = Array.from(new Set(orgs));
            
            return finalOrgs;
          })(),
          organizationType: (() => {
            // Determine organization type based on source
            if (user.organizations) {
              if (user.organizations.schools && user.organizations.schools.length > 0) {
                return 'school' as const;
              }
              if (user.organizations.companies && user.organizations.companies.length > 0) {
                return 'company' as const;
              }
            }
            // Fallback to common organizations
            if (user.common_organizations && Array.isArray(user.common_organizations) && user.common_organizations.length > 0) {
              const firstOrg = user.common_organizations[0];
              if (firstOrg.type === 'School' || firstOrg.type === 'school') {
                return 'school' as const;
              }
              if (firstOrg.type === 'Company' || firstOrg.type === 'company') {
                return 'company' as const;
              }
            }
            return undefined;
          })(),
          take_trainee: user.take_trainee || false,
          propose_workshop: user.propose_workshop || false,
          commonOrganizations
        } as Member;
      })
    : [];

  // Get unique organizations for filter dropdown from all organizations members belong to
  const organizationOptions = isPersonalUser
    ? Array.from(new Set(
        networkUsersAsMembers.flatMap(member => {
          // Use allOrganizations if available (contains all orgs from user.organizations + common_organizations)
          if ((member as any).allOrganizations && (member as any).allOrganizations.length > 0) {
            return (member as any).allOrganizations;
          }
          // Fallback to old method if allOrganizations not available
          const orgs: string[] = [];
          if (member.organization) {
            orgs.push(member.organization);
          }
          if (member.commonOrganizations) {
            orgs.push(
              ...member.commonOrganizations.schools.map(s => s.name),
              ...member.commonOrganizations.companies.map(c => c.name)
            );
          }
          return orgs;
        }).filter((org): org is string => !!org)
      )).sort()
    : isOrgDashboard
    ? Array.from(new Set(
        networkMembers.flatMap(member => {
          if (!member.commonOrganizations) return [];
          return [
            ...member.commonOrganizations.schools.map(s => s.name),
            ...member.commonOrganizations.companies.map(c => c.name)
          ];
        }).filter((org): org is string => !!org)
      )).sort()
    : [];

  // Filter personal user network by skills, availability, and organization
  const filteredNetworkUsers: Member[] = isPersonalUser
    ? networkUsersAsMembers.filter((member: Member) => {
        const matchesCompetence = !competenceFilter || 
          member.skills.some(skill => skill.toLowerCase().includes(competenceFilter.toLowerCase()));
        
        // Filter by organization (check all organizations the member belongs to)
        // Use multiple fallbacks to ensure we catch all organizations
        const matchesOrganization = !organizationFilter || 
          (() => {
            const allOrgs = (member as any).allOrganizations;
            const filterLower = organizationFilter.trim().toLowerCase();
            
            // Check allOrganizations first
            if (allOrgs && Array.isArray(allOrgs) && allOrgs.length > 0) {
              if (allOrgs.some((org: string) => org && org.trim().toLowerCase() === filterLower)) {
                return true;
              }
            }
            
            // Fallback: check member.organization
            if (member.organization && member.organization.trim().toLowerCase() === filterLower) {
              return true;
            }
            
            // Fallback: check commonOrganizations
            if (member.commonOrganizations) {
              const commonOrgs = [
                ...(member.commonOrganizations.schools || []).map(s => s.name),
                ...(member.commonOrganizations.companies || []).map(c => c.name)
              ];
              if (commonOrgs.some(org => org && org.trim().toLowerCase() === filterLower)) {
                return true;
              }
            }
            
            return false;
          })();
        
        // Note: availability is not in the NetworkUser interface, so we skip that filter for now
        const matchesStageWorkshop = memberMatchesFilters(member);
        
        // Local search filter for network-members activeCard (include common organizations)
        const matchesLocalSearch = !localSearchTerm || !localSearchTerm.trim() || 
          (member.fullName && member.fullName.toLowerCase().includes(localSearchTerm.toLowerCase())) ||
          member.email.toLowerCase().includes(localSearchTerm.toLowerCase()) ||
          (member.commonOrganizations && (
            member.commonOrganizations.schools.some(s => s.name.toLowerCase().includes(localSearchTerm.toLowerCase())) ||
            member.commonOrganizations.companies.some(c => c.name.toLowerCase().includes(localSearchTerm.toLowerCase()))
          ));
        
        return matchesCompetence && matchesOrganization && matchesStageWorkshop && matchesLocalSearch;
      })
    : [];

  // No filtering for partners - show all partners (for organizational users)
  const filteredPartners = partnersAsOrganizations;

  const toggleMessage = (key: string) => {
    setExpandedMessages(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  // Get confirmed branch requests (used to hide "Se rattacher" button)
  const confirmedBranchRequests = branchRequests.filter(req => req.status === 'confirmed');
  
  // Check if current organization has any branch requests (pending or confirmed) as a child
  // If yes, hide "Se rattacher" button for all organizations (one branch relationship only)
  const currentOrganizationId = getOrganizationId(state.user, state.showingPageType);
  const hasAnyBranchRequest = currentOrganizationId ? branchRequests.some(req => {
    const childOrg = req.child_school || req.child_company;
    return childOrg?.id === currentOrganizationId;
  }) : false;

  // Convert sub-organizations to organization-like format for display
  const subOrgsAsOrganizations: Organization[] = subOrganizations.map((subOrg) => {
    // If isParent is true, all items come from parent endpoint (usually just one)
    const isParent = subOrgsIsParent;
    
    return {
      id: String(subOrg.id),
      name: subOrg.name || subOrg.company_name || subOrg.school_name || 'Sous-organisation',
      type: 'sub-organization' as const,
      description: subOrg.description || (subOrg.city ? `${subOrg.city}${subOrg.zip_code ? ` (${subOrg.zip_code})` : ''}` : 'Sous-organisation'),
      members_count: subOrg.members_count || 0,
      location: subOrg.city && subOrg.zip_code ? `${subOrg.city}, ${subOrg.zip_code}` : subOrg.city || subOrg.zip_code || '',
      logo: subOrg.logo_url || undefined,
      status: subOrg.status === 'confirmed' ? 'active' as const : 'pending' as const,
      joinedDate: subOrg.created_at || '',
      contactPerson: subOrg.referent_phone_number ? `Tél: ${subOrg.referent_phone_number}` : '',
      email: subOrg.email || '',
      isParent: isParent
    } as Organization & { isParent?: boolean };
  });

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
        description: partnership.description || '',
        members_count: 0, // Partners don't have members_count in the API
        location: '',
        logo: undefined,
        status: 'pending' as const,
        joinedDate: partnership.created_at || '',
        contactPerson: '',
        email: '',
        partnershipId: partnership.id, // Store partnership ID for accept/reject
        partnership: partnership, // Store full partnership data
        message: partnership.description || ''
      } as Organization & { partnershipId: number; partnership: Partnership; message?: string }));
  });

  // No filtering for partnership requests - show all requests
  const filteredRequests = requestsAsOrganizations;

  // Convert branch requests to organization-like format for display
  const branchRequestsAsOrganizations: Organization[] = branchRequests.map(request => {
    const parentOrg = request.parent_school || request.parent_company;
    const childOrg = request.child_school || request.child_company;
    
    // Show the organization that is NOT the current user's organization
    const displayOrg = request.initiator === 'child' ? parentOrg : childOrg;
    
    return {
      id: String(request.id),
      name: displayOrg?.name || 'Organisation inconnue',
      type: request.parent_school || request.child_school ? 'schools' : 'companies',
      description: request.message || '',
      members_count: 0,
      location: '',
      status: request.status as 'active' | 'pending' | 'inactive',
      joinedDate: request.created_at || '',
      contactPerson: '',
      email: '',
      branchRequestId: request.id,
      branchRequest: request,
      initiator: request.initiator,
      recipient: request.recipient
    } as Organization & { branchRequestId: number; branchRequest: BranchRequest; initiator: string; recipient: string };
  });

  // Filter branch requests: exclude confirmed ones (they appear in sub-organizations)
  const filteredBranchRequests = branchRequestsAsOrganizations.filter(
    org => {
      const branchRequest = (org as any).branchRequest;
      return !branchRequest || branchRequest.status !== 'confirmed';
    }
  );

  // Combine schools, companies and partners based on selected type or activeCard
  // For school/company dashboards, use activeCard; for personal users, use selectedType
  
  // Function to filter items by local search term
  const filterByLocalSearch = (items: Organization[]) => {
    if (!localSearchTerm || !localSearchTerm.trim()) return items;
    
    const searchLower = localSearchTerm.toLowerCase().trim();
    return items.filter(item => 
      item.name.toLowerCase().includes(searchLower) ||
      item.location.toLowerCase().includes(searchLower) ||
      item.description.toLowerCase().includes(searchLower) ||
      item.email.toLowerCase().includes(searchLower)
    );
  };
  
  const displayItems = selectedType === 'search' || selectedType === 'join-organization'
    ? filteredSearchResults
    : selectedType === 'branch-requests'
    ? filteredBranchRequests
    : selectedType === 'partnership-requests'
    ? filteredRequests
    : selectedType === 'schools' 
    ? schoolsAsOrganizations 
    : selectedType === 'companies'
    ? companiesAsOrganizations
    : selectedType === 'partner'
    ? filteredPartners
    : selectedType === 'sub-organizations'
    ? filteredSubOrgs
    : selectedType === 'my-requests'
    ? filteredMyRequests
    : isOrgDashboard && activeCard
    ? (activeCard === 'partners'
        ? filterByLocalSearch(filteredPartners)
        : activeCard === 'branches'
        ? filterByLocalSearch(filteredSubOrgs)
        : []) // members are displayed separately
    : isPersonalUserDashboard && activeCard
    ? (activeCard === 'schools'
        ? filterByLocalSearch(myOrganizations.schools.filter((school: any) => school.my_status === 'confirmed').map((school: any): Organization => ({
            id: String(school.id),
            name: school.name || 'École',
            type: 'schools' as const,
            description: school.school_type || '',
            members_count: school.members_count || 0,
            location: school.city || '',
            logo: school.logo_url || '',
            status: 'active' as const,
            joinedDate: school.joined_at || '',
            contactPerson: '',
            email: school.email || '',
            website: ''
          })))
        : activeCard === 'companies'
        ? filterByLocalSearch(myOrganizations.companies.filter((company: any) => company.my_status === 'confirmed').map((company: any): Organization => ({
            id: String(company.id),
            name: company.name || 'Entreprise',
            type: 'companies' as const,
            description: company.company_type?.name || '',
            members_count: company.members_count || 0,
            location: company.city || '',
            logo: company.logo_url || '',
            status: 'active' as const,
            joinedDate: company.joined_at || '',
            contactPerson: '',
            email: company.email || '',
            website: ''
          })))
        : []) // network-members are displayed separately
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

      {/* Network Summary Cards */}
      {/* Show different cards for school/company dashboards vs personal users */}
      {(state.showingPageType === 'edu' || state.showingPageType === 'pro') ? (
        <div className="network-summary">
          <div 
            className={`summary-card ${activeCard === 'partners' ? 'active' : ''}`}
            onClick={() => {
              setActiveCard('partners');
              setSelectedType(null);
            }}
            style={{ cursor: 'pointer' }}
          >
            <div className="summary-icon">
              <img src="/icons_logo/Icon=Reseau.svg" alt="Mes partenaires" className="summary-icon-img" />
            </div>
            <div className="summary-content">
              <h3>{countAllPartners()}</h3>
              <p>Mes partenaires</p>
            </div>
          </div>
          <div 
            className={`summary-card ${activeCard === 'branches' ? 'active' : ''}`}
            onClick={() => {
              setActiveCard('branches');
              setSelectedType(null);
            }}
            style={{ cursor: 'pointer' }}
          >
            <div className="summary-icon">
              <img src="/icons_logo/Icon=Reseau.svg" alt="Mes sous-organisations" className="summary-icon-img" />
            </div>
            <div className="summary-content">
              <h3>{countBranches()}</h3>
              <p>Mes sous-organisations</p>
            </div>
          </div>
          <div 
            className={`summary-card ${activeCard === 'members' ? 'active' : ''}`}
            onClick={() => {
              setActiveCard('members');
              setSelectedType(null);
            }}
            style={{ cursor: 'pointer' }}
          >
            <div className="summary-icon">
              <img src="/icons_logo/Icon=Membres.svg" alt="Membres de mon réseau" className="summary-icon-img" />
            </div>
            <div className="summary-content">
              <h3>{countNetworkMembers()}</h3>
              <p>Membres de mon réseau</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="network-summary">
          <div 
            className={`summary-card ${activeCard === 'schools' ? 'active' : ''}`}
            onClick={() => {
              setActiveCard('schools');
              setSelectedType(null);
            }}
            style={{ cursor: 'pointer' }}
          >
            <div className="summary-icon">
              <img src="/icons_logo/Icon=Tableau de bord.svg" alt="Mes établissements scolaires" className="summary-icon-img" />
            </div>
            <div className="summary-content">
              <h3>{globalSchoolsTotalCount}</h3>
              <p>Mes établissements scolaires</p>
            </div>
          </div>
          <div 
            className={`summary-card ${activeCard === 'companies' ? 'active' : ''}`}
            onClick={() => {
              setActiveCard('companies');
              setSelectedType(null);
            }}
            style={{ cursor: 'pointer' }}
          >
            <div className="summary-icon">
              <img src="/icons_logo/Icon=Reseau.svg" alt="Mes organisations" className="summary-icon-img" />
            </div>
            <div className="summary-content">
              <h3>{globalCompaniesTotalCount}</h3>
              <p>Mes organisations</p>
            </div>
          </div>
          <div 
            className={`summary-card ${activeCard === 'network-members' ? 'active' : ''}`}
            onClick={() => {
              setActiveCard('network-members');
              setSelectedType(null);
            }}
            style={{ cursor: 'pointer' }}
          >
            <div className="summary-icon">
              <img src="/icons_logo/Icon=Membres.svg" alt="Total" className="summary-icon-img" />
            </div>
            <div className="summary-content">
              <h3>{partnersTotalCount}</h3>
              <p>Membres de mon réseau</p>
            </div>
          </div>
        </div>
      )}

      {/* Local Search Bar for activeCard tabs */}
      {activeCard && (
        activeCard === 'schools' || 
        activeCard === 'companies' || 
        activeCard === 'network-members' ||
        activeCard === 'partners' ||
        activeCard === 'branches' ||
        activeCard === 'members'
      ) && (
        <div className="network-search-container" style={{ marginTop: '16px' }}>
          <div className="search-bar !w-full">
            <i className="fas fa-search search-icon"></i>
            <input
              type="text"
              className="search-input !w-full"
              placeholder={
                activeCard === 'schools' 
                  ? "Rechercher un établissement par nom, ville..."
                  : activeCard === 'companies'
                  ? "Rechercher une organisation par nom, ville..."
                  : activeCard === 'partners'
                  ? "Rechercher un partenaire par nom, ville..."
                  : activeCard === 'branches'
                  ? "Rechercher une sous-organisation par nom, ville..."
                  : activeCard === 'members' || activeCard === 'network-members'
                  ? "Rechercher un membre par nom, email, organisation..."
                  : "Rechercher..."
              }
              value={localSearchTerm}
              onChange={(e) => setLocalSearchTerm(e.target.value)}
            />
            {localSearchTerm && (
              <button
                onClick={() => setLocalSearchTerm('')}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#6b7280',
                  fontSize: '1rem',
                  padding: '4px'
                }}
              >
                <i className="fas fa-times"></i>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Type Filter */}
      <div className="network-filters">

        <div className="filter-tabs">
          {/* Always visible tab for joining organizations */}
          <button 
            className={`filter-tab ${selectedType === 'join-organization' ? 'active' : ''}`}
            onClick={() => { setActiveCard(null); setSelectedType('join-organization'); }}
          >
            + Rejoindre un établissement ou une organisation supplémentaire
          </button>
          {/* Hide schools and companies tabs for personal users and organization dashboards */}
          {/* Show partnership requests and branch requests tabs only for school (edu) and pro (company) roles */}
          {(state.showingPageType === 'edu' || state.showingPageType === 'pro') && (
            <>
              {/* Show partnership requests tab only if there are requests */}
              {requestsTotalCount > 0 && (
                <button 
                  className={`filter-tab ${selectedType === 'partnership-requests' ? 'active' : ''}`}
                  onClick={() => { setActiveCard(null); setSelectedType('partnership-requests'); }}
                >
                  Demandes de partenariats ({requestsTotalCount})
                </button>
              )}
              {/* Show branch requests tab only if there are requests */}
              {filteredBranchRequests.length > 0 && (
                <button 
                  className={`filter-tab ${selectedType === 'branch-requests' ? 'active' : ''}`}
                  onClick={() => { setActiveCard(null); setSelectedType('branch-requests'); }}
                >
                  Demandes de rattachement ({filteredBranchRequests.length})
                </button>
              )}
            </>
          )}
          {/* Show my requests tab only for personal users (teacher/user) and if there are requests */}
          {(state.showingPageType === 'teacher' || state.showingPageType === 'user') && 
           (myRequests.schools.length > 0 || myRequests.companies.length > 0) && (
            <button 
              className={`filter-tab ${selectedType === 'my-requests' ? 'active' : ''}`}
              onClick={() => { setActiveCard(null); setSelectedType('my-requests'); }}
            >
              Mes demandes ({filteredMyRequests.length})
            </button>
          )}
        </div>

        {/* Search Bar - Only show in join-organization tab */}
        {selectedType === 'join-organization' && (
          <div className="network-search-container" style={{ marginTop: '20px', marginBottom: '20px' }}>
            <div className="search-bar !w-full">
              <i className="fas fa-search search-icon"></i>
              <input
                type="text"
                className="search-input !w-full"
                placeholder="Rechercher une organisation ou un établissement par nom, par ville ou code postal"
                value={searchTerm}
                onChange={(e) => {
                  const newValue = e.target.value;
                  setSearchTerm(newValue);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && selectedType !== 'join-organization' && searchTerm.trim()) {
                    e.preventDefault();
                  }
                }}
              />
            </div>
          </div>
        )}

        {/* Filters for personal user network and organization dashboards - Show on all tabs except schools */}
        {(
          (isPersonalUser && (selectedType === 'my-requests' || selectedType === 'search' || selectedType === 'join-organization')) || 
          (isPersonalUserDashboard && activeCard && activeCard !== 'schools') ||
          (isOrgDashboard && (selectedType === 'search' || selectedType === 'join-organization' || activeCard === 'members'))
        ) && (
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
            <div style={{ 
              display: 'flex', 
              gap: '12px', 
              flexWrap: 'wrap', 
              alignItems: 'flex-end', 
              justifyContent: (() => {
                // Calculate number of visible filters
                let visibleFiltersCount = 2; // Compétence and Propositions are always visible
                if (selectedType !== 'search' && selectedType !== 'join-organization' && activeCard !== 'companies') {
                  visibleFiltersCount += 2; // Disponibilité and Établissement/Organisation
                }
                return visibleFiltersCount > 3 ? 'space-between' : 'flex-start';
              })()
            }}>
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
              
              {/* Disponibilité filter - Hidden in search, join-organization and companies */}
              {selectedType !== 'search' && selectedType !== 'join-organization' && activeCard !== 'companies' && (
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
              )}
              
              {/* Établissement / Organisation filter - Hidden in search, join-organization and companies */}
              {selectedType !== 'search' && selectedType !== 'join-organization' && activeCard !== 'companies' && (
                <div className="filter-group" style={{ flex: '1', minWidth: '200px' }}>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.875rem', fontWeight: 600, color: '#374151' , whiteSpace: 'nowrap'}}>
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
                    <option value="">Tous </option>
                    {organizationOptions.map((org) => (
                      <option key={org} value={org}>
                        {org}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              
              {/* Stage and Workshop filters */}
              <div className="filter-group" style={{ flex: '1', minWidth: '200px', position: 'relative' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.875rem', fontWeight: 600, color: '#374151' }}>
                  <i className="fas fa-briefcase" style={{ marginRight: '6px' }}></i>
                  Propositions
                </label>
                <div style={{ position: 'relative' }}>
                  <button
                    type="button"
                    onClick={() => setIsPropositionsDropdownOpen(!isPropositionsDropdownOpen)}
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
                    <span style={{ color: (filterStage || filterWorkshop) ? '#1f2937' : '#9ca3af' }}>
                      {filterStage && filterWorkshop
                        ? 'Stage et Atelier'
                        : filterStage
                        ? 'Propose un stage'
                        : filterWorkshop
                        ? 'Propose un atelier'
                        : 'Toutes les propositions'}
                    </span>
                    <i className={`fas fa-chevron-${isPropositionsDropdownOpen ? 'up' : 'down'}`} style={{ fontSize: '0.75rem', color: '#9ca3af' }}></i>
                  </button>
                  {isPropositionsDropdownOpen && (
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
                        zIndex: 1000
                      }}
                    >
                      <label
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
                          checked={filterStage}
                          onChange={(e) => setFilterStage(e.target.checked)}
                          style={{
                            marginRight: '8px',
                            cursor: 'pointer'
                          }}
                        />
                        <span style={{ fontSize: '0.875rem', color: '#374151' }}>Propose un stage</span>
                      </label>
                      <label
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
                          checked={filterWorkshop}
                          onChange={(e) => setFilterWorkshop(e.target.checked)}
                          style={{
                            marginRight: '8px',
                            cursor: 'pointer'
                          }}
                        />
                        <span style={{ fontSize: '0.875rem', color: '#374151' }}>Propose un atelier</span>
                      </label>
                    </div>
                  )}
                </div>
              </div>
            </div>
            {(competenceFilter || availabilityFilter.length > 0 || organizationFilter || filterStage || filterWorkshop) && (
              <div style={{ marginTop: '12px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button
                  onClick={() => {
                    setCompetenceFilter('');
                    setAvailabilityFilter([]);
                    setOrganizationFilter('');
                    setFilterStage(false);
                    setFilterWorkshop(false);
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
        {partnersLoading && (selectedType === 'partner' || (isOrgDashboard && activeCard === 'partners')) && (
          <div className="loading-message">Chargement des partenaires...</div>
        )}
        {partnersError && (selectedType === 'partner' || (isOrgDashboard && activeCard === 'partners')) && (
          <div className="error-message">{partnersError}</div>
        )}
        {subOrgsLoading && (selectedType === 'sub-organizations' || (isOrgDashboard && activeCard === 'branches')) && (
          <div className="loading-message">Chargement des sous-organisations...</div>
        )}
        {subOrgsError && (selectedType === 'sub-organizations' || (isOrgDashboard && activeCard === 'branches')) && (
          <div className="error-message">{subOrgsError}</div>
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
        {branchRequestsLoading && selectedType === 'branch-requests' && (
          <div className="loading-message">Chargement des demandes de rattachement...</div>
        )}
        {branchRequestsError && selectedType === 'branch-requests' && (
          <div className="error-message">{branchRequestsError}</div>
        )}
        {myRequestsLoading && selectedType === 'my-requests' && (
          <div className="loading-message">Chargement de vos demandes...</div>
        )}
        {myRequestsError && selectedType === 'my-requests' && (
          <div className="error-message">{myRequestsError}</div>
        )}
        {/* Search Results Header - Only show in join-organization tab when there are results */}
        {selectedType === 'join-organization' && 
         filteredSearchResults.length > 0 && 
         !searchLoading && (
          <div className="search-results-header" style={{ marginBottom: '16px', marginTop: '8px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary, #374151)' }}>
              Résultats de recherche ({searchTotalCount > 0 ? searchTotalCount : filteredSearchResults.length})
            </h3>
          </div>
        )}
        {searchLoading && (selectedType === 'search' || selectedType === 'join-organization') && (
          <div className="loading-message">Recherche en cours...</div>
        )}
        {searchError && (selectedType === 'search' || selectedType === 'join-organization') && (
          <div className="error-message">{searchError}</div>
        )}
        {displayItems.length === 0 && !schoolsLoading && !companiesLoading && !partnersLoading && !requestsLoading && !subOrgsLoading && !branchRequestsLoading && !myRequestsLoading && !searchLoading && !networkMembersLoading && isPersonalUser && selectedType === 'partner' && filteredNetworkUsers.length === 0 && (
          <div className="empty-message">Aucun résultat trouvé</div>
        )}
        {displayItems.length === 0 && !schoolsLoading && !companiesLoading && !partnersLoading && !requestsLoading && !subOrgsLoading && !branchRequestsLoading && !myRequestsLoading && !searchLoading && !networkMembersLoading && !(isPersonalUser && selectedType === 'partner') && !(isOrgDashboard && activeCard === 'members') && !(isPersonalUserDashboard && activeCard === 'network-members') && (
          <div className="empty-message">Aucun résultat trouvé</div>
        )}
        
        {/* Display network members for school/company dashboards when activeCard is 'members' */}
        {isOrgDashboard && activeCard === 'members' && (
          <>
            {networkMembersLoading && (
              <div className="loading-message">Chargement des membres du réseau...</div>
            )}
            {networkMembersError && (
              <div className="error-message">{networkMembersError}</div>
            )}
            {!networkMembersLoading && !networkMembersError && filteredNetworkMembers.length === 0 && (
              <div className="empty-message">Aucun membre du réseau trouvé</div>
            )}
            {!networkMembersLoading && !networkMembersError && filteredNetworkMembers.length > 0 && (
              <div className="members-grid">
                {filteredNetworkMembers.map((member) => (
                  <MemberCard
                    key={member.id}
                    member={member}
                    badgeCount={member.badges?.length || 0}
                    categoryTag={{ label: 'Membre individuel', color: '#ec4899' }}
                    onClick={() => {
                      setSelectedNetworkMember(member);
                    }}
                    onContactClick={() => {
                      console.log('Contact member:', member.email);
                    }}
                    onViewProfile={() => {
                      setSelectedNetworkMember(member);
                    }}
                    onRoleChange={(newRole) => {
                      console.log('Role change not applicable for network members');
                    }}
                    disableRoleDropdown={true}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {/* Display network members for personal users when activeCard is 'network-members' */}
        {isPersonalUserDashboard && activeCard === 'network-members' && (
          <>
            {networkMembersLoading && (
              <div className="loading-message">Chargement des membres du réseau...</div>
            )}
            {networkMembersError && (
              <div className="error-message">{networkMembersError}</div>
            )}
            {!networkMembersLoading && !networkMembersError && filteredNetworkUsers.length === 0 && (
              <div className="empty-message">Aucun membre du réseau trouvé</div>
            )}
            {!networkMembersLoading && !networkMembersError && filteredNetworkUsers.length > 0 && (
              <div className="members-grid">
                {filteredNetworkUsers.map((member) => (
                  <MemberCard
                    key={member.id}
                    member={member}
                    badgeCount={member.badges?.length || 0}
                    categoryTag={{ label: 'Membre individuel', color: '#ec4899' }}
                    onClick={() => {
                      setSelectedNetworkMember(member);
                    }}
                    onContactClick={() => {
                      console.log('Contact member:', member.email);
                    }}
                    onViewProfile={() => {
                      setSelectedNetworkMember(member);
                    }}
                    onRoleChange={(newRole) => {
                      console.log('Role change not applicable for network members');
                    }}
                    disableRoleDropdown={true}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {/* Display network users for personal users using MemberCard */}
        {isPersonalUser && selectedType === 'partner' && (
          <div className="members-grid">
            {filteredNetworkUsers.length > 0 ? filteredNetworkUsers.map((member) => (
              <MemberCard
                key={member.id}
                member={member}
                badgeCount={member.badges?.length || 0}
                categoryTag={{ label: 'Membre individuel', color: '#ec4899' }}
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
        {!(isPersonalUser && selectedType === 'partner') && 
         !(isOrgDashboard && activeCard === 'members') && 
         !(isPersonalUserDashboard && activeCard === 'network-members') &&
         (selectedType === 'search' || 
          selectedType === 'join-organization' ||
          selectedType === 'partnership-requests' || 
          selectedType === 'branch-requests' || 
          (isOrgDashboard && (activeCard === 'partners' || activeCard === 'branches')) || 
          (isPersonalUserDashboard && (activeCard === 'schools' || activeCard === 'companies')) ||
          (!(isOrgDashboard && activeCard) && !(isPersonalUserDashboard && activeCard))) && (
          <div className="grid !grid-cols-3">
            {displayItems.length > 0 ? (
              displayItems.map((organization) => {
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

              const message = (orgWithPartnership as any).message || organization.description || '';
              const messageKey = `pr-${organization.id}`;
              const maxMsgLength = 180;
              const isMessageExpanded = expandedMessages.has(messageKey);
              const messagePreview = !isMessageExpanded && message.length > maxMsgLength
                ? `${message.slice(0, maxMsgLength)}…`
                : message;

              // Determine organization type from partnership partner
              const organizationId = getOrganizationId(state.user, state.showingPageType);
              const partner = (partnership.partners || []).find(p => p.id !== organizationId);
              const isSchool = partner?.type === 'School';
              const orgTypeLabel = isSchool ? 'Établissement scolaire' : 'Organisation';
              const orgTypeColor = isSchool ? '#10b981' : '#3b82f6';

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
                        <span 
                          className="organization-type"
                          style={{
                            background: `${orgTypeColor}15`,
                            color: orgTypeColor
                          }}
                        >
                          {orgTypeLabel}
                        </span>
                        <span className="whitespace-nowrap organization-status" style={{ color: '#f59e0b' }}>
                          En attente
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="organization-content">
                    {message && (
                      <div className="organization-description" style={{ marginBottom: '12px' }}>
                        <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{messagePreview}</p>
                        {message.length > maxMsgLength && (
                          <button
                            className="btn btn-link"
                            style={{ padding: 0, marginTop: '6px' }}
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleMessage(messageKey);
                            }}
                          >
                            Voir {isMessageExpanded ? 'moins' : 'plus'}
                          </button>
                        )}
                      </div>
                    )}
                    {/* Indicateur visuel pour demande envoyée/reçue */}
                    <div style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {isInitiator ? (
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '4px 10px',
                          borderRadius: '12px',
                          fontSize: '0.75rem',
                          fontWeight: '600',
                          background: '#dbeafe',
                          color: '#1e40af',
                          border: '1px solid #93c5fd'
                        }}>
                          <i className="fas fa-paper-plane" style={{ fontSize: '0.7rem' }}></i>
                          Demande envoyée
                        </span>
                      ) : (
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '4px 10px',
                          borderRadius: '12px',
                          fontSize: '0.75rem',
                          fontWeight: '600',
                          background: '#fef3c7',
                          color: '#92400e',
                          border: '1px solid #fcd34d'
                        }}>
                          <i className="fas fa-inbox" style={{ fontSize: '0.7rem' }}></i>
                          Demande reçue
                        </span>
                      )}
                    </div>
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

            // Check if this is a branch request
            const isBranchRequest = selectedType === 'branch-requests' && 
              'branchRequestId' in organization;
            
            if (isBranchRequest && 'branchRequestId' in organization) {
              const orgWithBranchRequest = organization as Organization & { branchRequestId: number; branchRequest: BranchRequest; initiator: string; recipient: string };
              const branchRequestId = orgWithBranchRequest.branchRequestId;
              const branchRequest = orgWithBranchRequest.branchRequest;
              
              // Check if current user is the recipient (can confirm/reject)
              const organizationId = getOrganizationId(state.user, state.showingPageType);
              const organizationType = getOrganizationType(state.showingPageType);
              
              const isRecipient = branchRequest.recipient === 'parent' 
                ? (organizationType === 'school' && branchRequest.parent_school?.id === organizationId) ||
                  (organizationType === 'company' && branchRequest.parent_company?.id === organizationId)
                : (organizationType === 'school' && branchRequest.child_school?.id === organizationId) ||
                  (organizationType === 'company' && branchRequest.child_company?.id === organizationId);
              
              const canAction = isRecipient && branchRequest.status === 'pending';
              
              // Determine organization type from branch request
              const isSchool = organization.type === 'schools';
              const orgTypeLabel = isSchool ? 'Établissement scolaire' : 'Organisation';
              const orgTypeColor = isSchool ? '#10b981' : '#3b82f6';
              
              return (
                <div 
                  key={organization.id} 
                  className="organization-card"
                  onClick={() => {
                    setSelectedBranchRequest(branchRequest);
                    setIsBranchRequestDetailsModalOpen(true);
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
                        <span 
                          className="organization-type"
                          style={{
                            background: `${orgTypeColor}15`,
                            color: orgTypeColor
                          }}
                        >
                          {orgTypeLabel}
                        </span>
                        <span className="whitespace-nowrap organization-status" style={{ 
                          color: branchRequest.status === 'pending' ? '#f59e0b' : 
                                 branchRequest.status === 'confirmed' ? '#10b981' : '#ef4444'
                        }}>
                          {branchRequest.status === 'pending' ? 'En attente' : 
                           branchRequest.status === 'confirmed' ? 'Confirmée' : 'Rejetée'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="organization-content">
                    <p className="organization-description">{organization.description}</p>
                    {/* Indicateur visuel pour demande envoyée/reçue */}
                    <div style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {(() => {
                        // Determine if current user is the initiator
                        const currentUserIsInitiator = branchRequest.initiator === 'child' 
                          ? (organizationType === 'company' && branchRequest.child_company?.id === organizationId) ||
                            (organizationType === 'school' && branchRequest.child_school?.id === organizationId)
                          : (organizationType === 'company' && branchRequest.parent_company?.id === organizationId) ||
                            (organizationType === 'school' && branchRequest.parent_school?.id === organizationId);
                        
                        return currentUserIsInitiator ? (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '4px 10px',
                            borderRadius: '12px',
                            fontSize: '0.75rem',
                            fontWeight: '600',
                            background: '#dbeafe',
                            color: '#1e40af',
                            border: '1px solid #93c5fd'
                          }}>
                            <i className="fas fa-paper-plane" style={{ fontSize: '0.7rem' }}></i>
                            Demande envoyée
                          </span>
                        ) : (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '4px 10px',
                            borderRadius: '12px',
                            fontSize: '0.75rem',
                            fontWeight: '600',
                            background: '#fef3c7',
                            color: '#92400e',
                            border: '1px solid #fcd34d'
                          }}>
                            <i className="fas fa-inbox" style={{ fontSize: '0.7rem' }}></i>
                            Demande reçue
                          </span>
                        );
                      })()}
                    </div>
                    {canAction && (
                      <div className="organization-actions" style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                        <button
                          className="btn btn-primary"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleConfirmBranchRequest(branchRequestId);
                          }}
                          style={{ flex: 1 }}
                        >
                          <i className="fas fa-check"></i> Accepter
                        </button>
                        <button
                          className="btn btn-outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRejectBranchRequest(branchRequestId);
                          }}
                          style={{ flex: 1 }}
                        >
                          <i className="fas fa-times"></i> Refuser
                        </button>
                      </div>
                    )}
                    {!canAction && branchRequest.status === 'pending' && (
                      <div style={{ marginTop: '16px', padding: '12px', background: '#f3f4f6', borderRadius: '8px', color: '#6b7280', fontSize: '0.9rem' }}>
                        <i className="fas fa-info-circle"></i> {branchRequest.initiator === 'child' ? 'Votre demande de rattachement a été envoyée' : 'En attente de réponse'}
                      </div>
                    )}
                  </div>
                </div>
              );
            }
            
            // Don't show hover actions for partners (they're already connected)
            // For search/join-organization results, DO NOT block on existing partners to allow proposing partnerships
            const targetOrgId = parseInt(organization.id);
            const isPartnerFromList = partnersAsOrganizations.some(partner => parseInt(partner.id) === targetOrgId);
            const isPartner =
              selectedType === 'partner' ||
              ((isOrgDashboard && activeCard === 'partners') && selectedType !== 'search' && selectedType !== 'join-organization') ||
              (selectedType !== 'search' && selectedType !== 'join-organization' && isPartnerFromList);
            
            // Don't show hover actions for sub-organizations (they're part of the current organization)
            // For search/join-organization results, DO NOT block on existing sub-organizations to allow hover actions
            const isSubOrganizationFromList = subOrgsAsOrganizations.some(subOrg => parseInt(subOrg.id) === targetOrgId);
            const isSubOrganization =
              selectedType === 'sub-organizations' ||
              ((isOrgDashboard && activeCard === 'branches') && selectedType !== 'search' && selectedType !== 'join-organization') ||
              (selectedType !== 'search' && selectedType !== 'join-organization' && isSubOrganizationFromList);
            
            // Don't show hover actions for branch requests
            const isBranchRequestType = selectedType === 'branch-requests';
            
            // Check if this is a pending partnership (from activeCard === 'partners')
            const isPendingPartnership = isOrgDashboard && activeCard === 'partners' && 'partnershipId' in organization;
            
            // Personal users (teacher/user) cannot attach to organizations
            const isPersonalUser = state.showingPageType === 'teacher' || state.showingPageType === 'user';
            
            // Check if there's already a confirmed branch request with this organization
            const hasConfirmedBranchRequest = confirmedBranchRequests.some(req => {
              const parentOrg = req.parent_school || req.parent_company;
              const childOrg = req.child_school || req.child_company;
              
              // Check if this organization is involved in a confirmed branch request
              return (parentOrg?.id === targetOrgId || childOrg?.id === targetOrgId) &&
                     req.status === 'confirmed';
            });
            
            // If this is a pending partnership from activeCard, show partnership request actions
            if (isPendingPartnership && 'partnershipId' in organization) {
              const orgWithPartnership = organization as Organization & { partnershipId: number; partnership: Partnership };
              const partnershipId = orgWithPartnership.partnershipId;
              const partnership = orgWithPartnership.partnership;
              
              // Check if current user is the initiator
              const isInitiator = (() => {
                if (!partnership.initiator_id || !partnership.initiator_type) {
                  return false;
                }
                const companyIds = state.user.available_contexts?.companies?.map(c => c.id) || [];
                if (partnership.initiator_type === 'Company' && companyIds.includes(partnership.initiator_id)) {
                  return true;
                }
                const schoolIds = state.user.available_contexts?.schools?.map(s => s.id) || [];
                if (partnership.initiator_type === 'School' && schoolIds.includes(partnership.initiator_id)) {
                  return true;
                }
                return false;
              })();
              
              // Determine organization type from partnership partner
              const organizationId = getOrganizationId(state.user, state.showingPageType);
              const partner = (partnership.partners || []).find(p => p.id !== organizationId);
              const isSchool = partner?.type === 'School';
              const orgTypeLabel = isSchool ? 'Établissement scolaire' : 'Organisation';
              const orgTypeColor = isSchool ? '#10b981' : '#3b82f6';
              
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
                        <span 
                          className="organization-type"
                          style={{
                            background: `${orgTypeColor}15`,
                            color: orgTypeColor
                          }}
                        >
                          {orgTypeLabel}
                        </span>
                        <span className="whitespace-nowrap organization-status" style={{ color: '#f59e0b' }}>
                          En attente
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="organization-content">
                    <p className="organization-description">{organization.description}</p>
                    {/* Indicateur visuel pour demande envoyée/reçue */}
                    <div style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {isInitiator ? (
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '4px 10px',
                          borderRadius: '12px',
                          fontSize: '0.75rem',
                          fontWeight: '600',
                          background: '#dbeafe',
                          color: '#1e40af',
                          border: '1px solid #93c5fd'
                        }}>
                          <i className="fas fa-paper-plane" style={{ fontSize: '0.7rem' }}></i>
                          Demande envoyée
                        </span>
                      ) : (
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '4px 10px',
                          borderRadius: '12px',
                          fontSize: '0.75rem',
                          fontWeight: '600',
                          background: '#fef3c7',
                          color: '#92400e',
                          border: '1px solid #fcd34d'
                        }}>
                          <i className="fas fa-inbox" style={{ fontSize: '0.7rem' }}></i>
                          Demande reçue
                        </span>
                      )}
                    </div>
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
            
            // Determine which hover actions should be available
            // Check if this is the user's own organization
            const organizationId = getOrganizationId(state.user, state.showingPageType);
            const isOwnOrganization = organizationId && parseInt(organization.id) === organizationId;
            
            // Hide "Se rattacher" if current org already has a branch request (pending or confirmed) OR if it's user's own organization
            const attachAction = !isPartner && !isSubOrganization && !isBranchRequestType && !isPersonalUser && !hasConfirmedBranchRequest && !hasAnyBranchRequest && !isOwnOrganization ? () => handleAttachRequest(organization) : undefined;
            
            // For search results, check if partnership or branch request already exists
            let hasExistingPartnershipRequest = false;
            let hasExistingBranchRequest = false;
            
            if (selectedType === 'search' || selectedType === 'join-organization') {
              // organizationId and isOwnOrganization are already defined above, reuse them
              
              // Check if a partnership request (pending) already exists for this organization
              hasExistingPartnershipRequest = partnershipRequests.some(partnership => {
                return (partnership.partners || []).some(partner => partner.id === targetOrgId && partner.id !== organizationId);
              });
              
              // Also check if it's already a confirmed partner
              if (!hasExistingPartnershipRequest) {
                hasExistingPartnershipRequest = (partners as Partnership[]).some(partnership => {
                  return partnership.status === 'confirmed' && 
                         (partnership.partners || []).some(partner => partner.id === targetOrgId && partner.id !== organizationId);
                });
              }
              
              // Check if a branch request already exists for this organization (pending or confirmed)
              hasExistingBranchRequest = branchRequests.some(req => {
                const parentOrg = req.parent_school || req.parent_company;
                const childOrg = req.child_school || req.child_company;
                return (parentOrg?.id === targetOrgId || childOrg?.id === targetOrgId);
              });
            }
            
            // Hide "Partenariats" button if partnership request already exists, if it's already a partner, OR if it's user's own organization
            const partnershipAction = !isPartner && !isSubOrganization && !isBranchRequestType && !isPersonalUser && !hasExistingPartnershipRequest && !isOwnOrganization ? () => handlePartnershipProposal(organization) : undefined;
            
            // Hide "Se rattacher" button if branch request already exists OR if it's user's own organization (for search/join-organization results)
            const attachActionForSearch = (selectedType === 'search' || selectedType === 'join-organization') && (hasExistingBranchRequest || isOwnOrganization) ? undefined : attachAction;
            
            // Check if user is already a confirmed member of this organization
            const isAlreadyConfirmedMember = isPersonalUser && (
              (organization.type === 'schools' && myOrganizations.schools.some((school: any) => String(school.id) === organization.id && school.my_status === 'confirmed')) ||
              (organization.type === 'companies' && myOrganizations.companies.some((company: any) => String(company.id) === organization.id && company.my_status === 'confirmed'))
            );
            
            // Check if user has a pending join request for this organization
            const hasPendingJoinRequest = isPersonalUser && (
              (organization.type === 'schools' && myRequests.schools.some((request: any) => {
                const school = request.school || {};
                return String(school.id || request.id) === organization.id && request.status === 'pending';
              })) ||
              (organization.type === 'companies' && myRequests.companies.some((request: any) => {
                const company = request.company || {};
                return String(company.id || request.id) === organization.id && request.status === 'pending';
              }))
            );
            
            // Hide "Rejoindre" button if:
            // 1. User is viewing their own organizations (activeCard === 'schools' or 'companies')
            // 2. User is already a confirmed member of this organization
            // 3. User has already made a join request (pending) for this organization
            const joinAction = isPersonalUser && 
                              (organization.type === 'schools' || organization.type === 'companies') && 
                              selectedType !== 'my-requests' && 
                              activeCard !== 'schools' && 
                              activeCard !== 'companies' &&
                              !isAlreadyConfirmedMember &&
                              !hasPendingJoinRequest ? () => handleJoinOrganizationRequest(organization) : undefined;
            
            // Check if there are any hover actions
            const hasHoverActions = !!attachActionForSearch || !!partnershipAction || !!joinAction;
            
            return (
          <OrganizationCard
            key={organization.id}
            organization={organization}
            onEdit={() => console.log('Edit organization:', organization.id)}
            onDelete={() => console.log('Delete organization:', organization.id)}
            onAttach={attachActionForSearch}
            onPartnership={partnershipAction}
            onJoin={joinAction}
            isPersonalUser={isPersonalUser}
            onClick={hasHoverActions ? undefined : () => handleViewDetails(organization)}
            hideJoinButton={selectedType === 'my-requests'}
            hideMembersCount={selectedType === 'my-requests'}
          />
            );
          })
            ) : (
              // Empty state for search/join-organization and other tabs
              (selectedType === 'search' || selectedType === 'join-organization') && !searchLoading ? (
                <div className="empty-message">Aucun résultat de recherche trouvé</div>
              ) : null
            )}
          </div>
        )}
      </div>

      {/* Pagination for Schools */}
      {selectedType === 'schools' && schoolsTotalPages > 1 && (schoolsTotalCount > 0 || filteredSchools.length > 0) && !(isOrgDashboard && activeCard) && (
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
      {selectedType === 'partnership-requests' && requestsTotalPages > 1 && (requestsTotalCount > 0 || filteredRequests.length > 0) && (
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
      {selectedType === 'partner' && partnersTotalPages > 1 && (partnersTotalCount > 0 || filteredPartners.length > 0) && !(isOrgDashboard && activeCard === 'partners') && (
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
      {(selectedType === 'search' || selectedType === 'join-organization') && searchTotalPages > 1 && (searchTotalCount > 0 || filteredSearchResults.length > 0) && (
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
      {selectedType === 'companies' && companiesTotalPages > 1 && (companiesTotalCount > 0 || filteredCompanies.length > 0) && !(isOrgDashboard && activeCard) && (
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

      {/* Branch Request Details Modal */}
      {isBranchRequestDetailsModalOpen && selectedBranchRequest && (
        <BranchRequestDetailsModal
          branchRequest={selectedBranchRequest}
          user={state.user}
          onClose={() => {
            setIsBranchRequestDetailsModalOpen(false);
            setSelectedBranchRequest(null);
          }}
          onAccept={handleConfirmBranchRequest}
          onReject={handleRejectBranchRequest}
          onDelete={handleDeleteBranchRequest}
        />
      )}

      {isDetailsModalOpen && selectedOrganizationForDetails && (() => {
        // Use the same logic as OrganizationCard to determine if actions should be shown
        const targetOrgId = parseInt(selectedOrganizationForDetails.id);
        const isPartnerFromList = partnersAsOrganizations.some(partner => parseInt(partner.id) === targetOrgId);
        const isPartner = selectedType === 'partner' ||
          ((isOrgDashboard && activeCard === 'partners') && selectedType !== 'search' && selectedType !== 'join-organization') ||
          (selectedType !== 'search' && selectedType !== 'join-organization' && isPartnerFromList);
        const isSubOrganizationFromList = subOrgsAsOrganizations.some(subOrg => parseInt(subOrg.id) === targetOrgId);
        const isSubOrganization = selectedType === 'sub-organizations' ||
          ((isOrgDashboard && activeCard === 'branches') && selectedType !== 'search' && selectedType !== 'join-organization') ||
          (selectedType !== 'search' && selectedType !== 'join-organization' && isSubOrganizationFromList);
        const isPersonalUser = state.showingPageType === 'teacher' || state.showingPageType === 'user';
        
        // Check if this is the user's own organization
        const organizationId = getOrganizationId(state.user, state.showingPageType);
        const isOwnOrganization = organizationId && parseInt(selectedOrganizationForDetails.id) === organizationId;
        
        // Check if there's already a confirmed branch request with this organization
        const hasConfirmedBranchRequest = confirmedBranchRequests.some(req => {
          const parentOrg = req.parent_school || req.parent_company;
          const childOrg = req.child_school || req.child_company;
          
          // Check if this organization is involved in a confirmed branch request
          return (parentOrg?.id === targetOrgId || childOrg?.id === targetOrgId) &&
                 req.status === 'confirmed';
        });
        
        // Check if user is already a confirmed member of this organization
        const isAlreadyConfirmedMember = isPersonalUser && (
          (selectedOrganizationForDetails.type === 'schools' && 
           myOrganizations.schools.some((school: any) => 
             String(school.id) === selectedOrganizationForDetails.id && 
             school.my_status === 'confirmed')) ||
          (selectedOrganizationForDetails.type === 'companies' && 
           myOrganizations.companies.some((company: any) => 
             String(company.id) === selectedOrganizationForDetails.id && 
             company.my_status === 'confirmed'))
        );
        
        // Check if user has a pending join request for this organization
        const hasPendingJoinRequest = isPersonalUser && (
          (selectedOrganizationForDetails.type === 'schools' && myRequests.schools.some((request: any) => {
            const school = request.school || {};
            return String(school.id || request.id) === selectedOrganizationForDetails.id && request.status === 'pending';
          })) ||
          (selectedOrganizationForDetails.type === 'companies' && myRequests.companies.some((request: any) => {
            const company = request.company || {};
            return String(company.id || request.id) === selectedOrganizationForDetails.id && request.status === 'pending';
          }))
        );
        
        return (
          <OrganizationDetailsModal
            organization={selectedOrganizationForDetails}
            onClose={() => {
              setIsDetailsModalOpen(false);
              setSelectedOrganizationForDetails(null);
            }}
            onAttach={
              !isPartner && !isSubOrganization && !isPersonalUser && !hasConfirmedBranchRequest && !hasAnyBranchRequest && !isOwnOrganization
                ? () => handleAttachRequest(selectedOrganizationForDetails)
                : undefined
            }
            onPartnership={
              !isPartner && !isSubOrganization && selectedType !== 'my-requests' && !isOwnOrganization && !isAlreadyConfirmedMember && !hasPendingJoinRequest
                ? () => handlePartnershipProposal(selectedOrganizationForDetails)
                : undefined
            }
            onJoin={
              isPersonalUser && 
              selectedOrganizationForDetails && 
              (selectedOrganizationForDetails.type === 'schools' || selectedOrganizationForDetails.type === 'companies') &&
              selectedType !== 'my-requests' &&
              !isAlreadyConfirmedMember &&
              !hasPendingJoinRequest
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
          hideEditButton={true}
        />
      )}
    </section>
  );
};

export default Network;
