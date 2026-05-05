import React, { useState, useEffect } from 'react';
import { Project } from '../../types';
import { useAppContext } from '../../context/AppContext';
import {
  getPartnerships,
  getOrganizationMembers,
  getTeacherMembers,
  getTeacherSchoolMembers,
  createProject,
  getMldsServiceLinesFromMldsInfo
} from '../../api/Projects';
import { getSchoolLevels } from '../../api/SchoolDashboard/Levels';
import {
  getOrganizationId,
  getOrganizationType,
  base64ToFile,
  validateImages
} from '../../utils/projectMapper';
import { buildMldsCoResponsibleContexts } from '../../utils/memberContextPayload';
import './Modal.css';
import AvatarImage from '../UI/AvatarImage';
import { translateRole } from '../../utils/roleTranslations';
import { useToast } from '../../hooks/useToast';
import {
  countServiceQuoteFiles,
  MAX_SERVICE_QUOTE_FILES,
  validateServiceQuoteSelection
} from '../../utils/mldsServiceQuotes';
import { hvLineHours } from '../../utils/mldsHvLines';

/** Taux HV par défaut (€/heure) — lignes crédits HV */
const HV_DEFAULT_RATE = 50.73;

// Rôles système considérés comme "élèves" (tous contextes)
const STUDENT_SYSTEM_ROLES = [
  'eleve_primaire',
  'collegien',
  'lyceen',
  'etudiant',
  'student',
  'eleve'
];

/** Contact partenaire dont le rôle org est référent — exclu de la modale co-responsables partenaire. */
function isPartnerContactOrgReferent(contact: { role?: string; role_in_organization?: string }): boolean {
  const raw = (contact.role_in_organization ?? contact.role ?? '').toString();
  const n = raw.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return n.includes('referent');
}

interface MLDSProjectModalProps {
  onClose: () => void;
  onSave: (projectData: Omit<Project, 'id'>) => void;
  initialDataFromProject?: Project | null;
  variant?: 'perseverance' | 'remediation';
}

const MLDSProjectModal: React.FC<MLDSProjectModalProps> = ({
  onClose,
  onSave,
  initialDataFromProject,
  variant = 'perseverance',
}) => {
  const { state } = useAppContext();
  const { showError } = useToast();

  const [formData, setFormData] = useState({
    title: '', // Will be auto-generated as [id_mlds_information]_[year]
    networkIssueAddressed: '',
    description: '',
    startDate: '',
    endDate: '',
    organization: '',
    status: 'coming' as 'draft' | 'to_process' | 'pending_validation' | 'coming' | 'in_progress' | 'ended' | 'archived',
    visibility: 'private' as 'public' | 'private', // MLDS projects are private by default
    pathway: 'mlds', // Set to MLDS by default
    tags: '',
    links: '',
    image: '',
    coResponsibles: [] as string[],
    isPartnership: false,
    partners: [] as string[],
    additionalImages: [] as string[],
    // MLDS specific fields
    mldsRequestedBy: 'departement', // Demande faite par: Departement / reseau foquale
    mldsDepartment: '', // Département sélectionné
    mldsOrganizations: [] as string[], // Organisation porteuse (multi-select)
    mldsTargetAudience: 'students_without_solution', // Public ciblé
    mldsActionObjectives: [] as string[], // Objectifs de l'action (multi-select)
    mldsActionObjectivesOther: '', // Autre objectif (texte libre)
    mldsCompetenciesDeveloped: '', // Compétences développées par l'action
    mldsExpectedParticipants: '', // Effectifs prévisionnel
    mldsObjectives: '',
    mldsCompetencies: [] as string[],
    // Financial means
    mldsFinancialHSE: '', // HSE (nombre d'heures) — déclaratif, hors totaux
    mldsFinancialRate: '50.73', // Taux €/heure (HV, lignes crédits)
    mldsFinancialTransport: [] as Array<{ transport_name: string; price: string }>, // Frais de transport
    mldsFinancialOperating: [] as Array<{ operating_name: string; price: string }>, // Frais de fonctionnement
    /** Crédits HV par enseignant (heures × taux) — champ `hour` côté API */
    mldsFinancialHvLines: [] as Array<{ teacher_name: string; hour: string }>,
    mldsFinancialService: [] as Array<{ service_name: string; hours: string; price: string; comment: string }>, // Prestataires
    /** Hors total Crédits ; inclus dans le total général avec les crédits */
    mldsFinancialAutres: [] as Array<{ autres_name: string; price: string }>,
  });

  /** Devis par ligne prestataire (max 5 fichiers au total, 1 Mo chacun) — index aligné sur mldsFinancialService */
  const [mldsServiceQuoteFiles, setMldsServiceQuoteFiles] = useState<(File | null)[]>([]);

  const [imagePreview, setImagePreview] = useState<string>('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [successData, setSuccessData] = useState<{ title: string, image: string } | null>(null);

  // Loading states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);
  const [isLoadingPartnerships, setIsLoadingPartnerships] = useState(false);
  const [isLoadingClasses, setIsLoadingClasses] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [availablePartnerships, setAvailablePartnerships] = useState<any[]>([]);
  const [partnershipContactMembers, setPartnershipContactMembers] = useState<any[]>([]);
  const [partnershipCoResponsiblesPopup, setPartnershipCoResponsiblesPopup] = useState<{
    partnershipId: string;
    partnershipName: string;
    contactUsers: any[];
  } | null>(null);
  const [partnershipCoResponsibles, setPartnershipCoResponsibles] = useState<Record<string, string[]>>({});
  const [partnershipCoResponsiblesSearchTerm, setPartnershipCoResponsiblesSearchTerm] = useState<string>('');
  const [availableClasses, setAvailableClasses] = useState<any[]>([]);
  const [departments, setDepartments] = useState<Array<{ code: string; nom: string }>>([]);
  const [isLoadingDepartments, setIsLoadingDepartments] = useState(false);
  const [searchTerms, setSearchTerms] = useState({
    coResponsibles: '',
    partner: ''
  });

  // Co-responsibles options for teacher context (school staff, not students)
  const [coResponsibleOptions, setCoResponsibleOptions] = useState<any[]>([]);
  const [isLoadingCoResponsibles, setIsLoadingCoResponsibles] = useState(false);

  // Selected school (établissement) for filtering classes / organisations porteuses
  const [selectedSchoolId, setSelectedSchoolId] = useState<string | null>(null);

  // Prefill from an existing MLDS project when duplicating
  useEffect(() => {
    if (!initialDataFromProject) return;

    const source = initialDataFromProject;
    const mldsInfo: any = (source as any).mlds_information || {};

    // Try to pre-select the school (établissement) based on the original project organization or context
    const schools = state.user?.available_contexts?.schools || [];
    let defaultSchoolId: string | null = null;
    if (schools.length > 0) {
      // 1. Match by name (organization string from original project)
      const byName = source.organization
        ? schools.find((s: any) => s.name === source.organization)
        : null;
      // 2. Fallback to first school in context
      const chosenSchool = byName || schools[0];
      if (chosenSchool?.id != null) {
        defaultSchoolId = chosenSchool.id.toString();
      }
    }

    const today = new Date();
    const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, today.getDate());
    const toIso = (d: Date) => d.toISOString().split('T')[0];

    setFormData(prev => ({
      ...prev,
      title: `${source.title} (copie)`,
      networkIssueAddressed: mldsInfo?.network_issue_addressed ?? '',
      description: source.description,
      startDate: toIso(today),
      endDate: toIso(nextMonth),
      organization: defaultSchoolId
        ? (schools.find((s: any) => s.id?.toString() === defaultSchoolId)?.name || source.organization)
        : source.organization,
      status: 'draft',
      visibility: 'private',
      pathway: 'mlds',
      tags: (source.tags || []).join(', '),
      links: source.links || '',
      image: '',
      coResponsibles: [],
      isPartnership: false,
      partners: [],
      additionalImages: [],
      mldsRequestedBy: mldsInfo?.requested_by || 'departement',
      mldsDepartment: mldsInfo?.department_number || mldsInfo?.department_code || '',
      mldsOrganizations: [],
      mldsTargetAudience: mldsInfo?.target_audience || 'students_without_solution',
      mldsActionObjectives: mldsInfo?.action_objectives || [],
      mldsActionObjectivesOther: mldsInfo?.action_objectives_other || '',
      mldsCompetenciesDeveloped: mldsInfo?.competencies_developed || '',
      mldsExpectedParticipants: mldsInfo?.expected_participants != null ? String(mldsInfo.expected_participants) : '',
      mldsObjectives: mldsInfo?.objectives || '',
      mldsCompetencies: [],
      mldsFinancialHSE: mldsInfo?.financial_hse != null ? String(mldsInfo.financial_hse) : '',
      mldsFinancialRate:
        mldsInfo?.financial_rate != null
          ? String(mldsInfo.financial_rate)
          : (mldsInfo?.financial_hv != null ? String(mldsInfo.financial_hv) : prev.mldsFinancialRate),
      mldsFinancialTransport: Array.isArray(mldsInfo?.financial_transport) ? mldsInfo.financial_transport : [],
      mldsFinancialOperating: Array.isArray(mldsInfo?.financial_operating) ? mldsInfo.financial_operating : [],
      mldsFinancialAutres: Array.isArray(mldsInfo?.financial_autres_financements)
        ? mldsInfo.financial_autres_financements.map((l: { autres_name?: string; price?: string }) => ({
            autres_name: String(l.autres_name ?? ''),
            price: l.price != null ? String(l.price) : ''
          }))
        : [],
      mldsFinancialHvLines: (() => {
        if (Array.isArray(mldsInfo?.financial_hv_lines) && mldsInfo.financial_hv_lines.length > 0) {
          return mldsInfo.financial_hv_lines.map(
            (l: { teacher_name?: string; hour?: string; price?: string }) => ({
              teacher_name: String(l.teacher_name ?? ''),
              hour:
                l.hour != null && l.hour !== ''
                  ? String(l.hour)
                  : l.price != null
                    ? String(l.price)
                    : ''
            })
          );
        }
        const hv = mldsInfo?.financial_hv;
        if (hv != null && Number(hv) > 0) {
          return [{ teacher_name: '', hour: String(hv) }];
        }
        return [];
      })(),
      mldsFinancialService: (() => {
        const rows = getMldsServiceLinesFromMldsInfo(mldsInfo);
        if (rows.length === 0) return [];
        return rows.map(l => ({
          service_name: String(l.service_name ?? ''),
          hours: l.hours != null && l.hours !== '' ? String(l.hours) : '',
          price: l.price != null ? String(l.price) : '',
          comment: l.comment != null ? String(l.comment) : ''
        }));
      })(),
    }));
    if (defaultSchoolId) {
      setSelectedSchoolId(defaultSchoolId);
    }
    const svcLen = getMldsServiceLinesFromMldsInfo(mldsInfo).length;
    setMldsServiceQuoteFiles(Array.from({ length: svcLen }, () => null));
    setImagePreview('');
  }, [initialDataFromProject, state.user]);

  // Default school selection on mount (when not duplicating)
  useEffect(() => {
    if (initialDataFromProject) return; // Already handled by duplication prefill
    if (selectedSchoolId) return; // Already selected
    const schools = state.user?.available_contexts?.schools || [];
    if (schools.length > 0) {
      const defaultSchool = schools[0];
      if (defaultSchool?.id != null) {
        const id = defaultSchool.id.toString();
        setSelectedSchoolId(id);
        setFormData(prev => ({
          ...prev,
          organization: defaultSchool.name || prev.organization
        }));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.user?.available_contexts?.schools]);

  // MLDS options
  const mldsRequestedByOptions = [
    { value: 'departement', label: 'Departement' },
    { value: 'reseau_foquale', label: 'Reseau foquale' }
  ];

  const mldsTargetAudienceOptions = [
    { value: 'students_without_solution', label: 'Élèves sans solution à la rentrée' },
    { value: 'students_at_risk', label: 'Élèves en situation de décrochage repérés par le GPDS' },
    { value: 'school_teams', label: 'Équipes des établissements' }
  ];

  const remediationTargetAudienceOptions = [
    { value: 'mlds_assigned', label: 'Élèves affectés à la MLDS' },
    { value: 'pafi_tdo', label: 'Élèves en PAFI TDO' },
  ];

  const mldsActionObjectivesOptions = [
    {
      value: 'path_security',
      label: 'La sécurisation des parcours : liaison inter-cycles pour les élèves les plus fragiles'
    },
    {
      value: 'professional_discovery',
      label: 'La découverte des filières professionnelles'
    },
    {
      value: 'student_mobility',
      label: 'Le développement de la mobilité des élèves'
    },
    {
      value: 'cps_development',
      label: 'Le développement des CPS pour les élèves en situation ou en risque de décrochage scolaire avéré'
    },
    {
      value: 'territory_partnership',
      label: 'Le rapprochement des établissements avec les partenaires du territoire (missions locales, associations, entreprises, etc.) afin de mettre en place des parcours personnalisés (PAFI, TDO, Avenir Pro Plus, autres)'
    },
    {
      value: 'family_links',
      label: 'Le renforcement des liens entre les familles et les élèves en risque ou en situation de décrochage scolaire'
    },
    {
      value: 'professional_development',
      label: 'Des actions de co-développement professionnel ou d\'accompagnement d\'équipes (tutorat, intervention de chercheurs, etc.)'
    },
    {
      value: 'other',
      label: 'Autre'
    }
  ];

  const remediationActionObjectivesOptions = [
    {
      value: 'professional_discovery',
      label: 'La découverte des filières professionnelles'
    },
    {
      value: 'aec_development',
      label: 'Parcours d\'éducation artistique et culturelle'
    },
    {
      value: 'future_path_development',
      label: 'Parcours d\'avenir'
    },
    {
      value: 'citizen_path_development',
      label: 'Parcours citoyen'
    },
    {
      value: 'pe_development',
      label: 'Apprendre par l\'éducation physique et sportive'
    },
    {
      value: 'disciplinary_courses',
      label: 'Cours disciplinaires'
    },
    {
      value: 'job_discovery',
      label: 'Découverte des métiers'
    },
    {
      value: 'training_discovery',
      label: 'Découverte des formations'
    },
    {
      value: 'other',
      label: 'Autre'
    }
  ];

  const mldsCompetenciesOptions = [
    'Autonomie',
    'Communication',
    'Travail en équipe',
    'Gestion du temps',
    'Résolution de problèmes',
    'Créativité',
    'Adaptabilité',
    'Esprit critique',
  ];

  // Fetch members
  useEffect(() => {
    const fetchMembers = async () => {
      setIsLoadingMembers(true);
      try {
        const organizationType = getOrganizationType(state.showingPageType);
        const organizationId = getOrganizationId(state.user, state.showingPageType);

        if (state.showingPageType === 'teacher') {
          const membersData = await getTeacherMembers();
          setMembers(membersData || []);
        } else if (organizationType && organizationId) {
          const membersData = await getOrganizationMembers(organizationId, organizationType);
          setMembers(membersData || []);
        }
      } catch (err) {
        console.error('Error fetching members:', err);
        setMembers([]);
      } finally {
        setIsLoadingMembers(false);
      }
    };

    fetchMembers();
  }, [state.showingPageType, state.user]);

  // Fetch co-responsible options (school staff) when teacher selects a school
  useEffect(() => {
    if (state.showingPageType !== 'teacher' || !selectedSchoolId) {
      setCoResponsibleOptions([]);
      return;
    }
    const fetchCoResponsibles = async () => {
      setIsLoadingCoResponsibles(true);
      try {
        const membersResponse = await getTeacherSchoolMembers(Number.parseInt(selectedSchoolId, 10), { per_page: 500, exclude_me: true });
        setCoResponsibleOptions(membersResponse.data || []);
      } catch (err) {
        console.error('Error fetching teacher school members:', err);
        setCoResponsibleOptions([]);
      } finally {
        setIsLoadingCoResponsibles(false);
      }
    };
    fetchCoResponsibles();
  }, [state.showingPageType, selectedSchoolId]);

  // Fetch partnerships - only when partnership checkbox is checked
  useEffect(() => {
    const fetchPartnerships = async () => {
      if (!formData.isPartnership) {
        setAvailablePartnerships([]);
        return;
      }

      setIsLoadingPartnerships(true);
      try {
        const organizationType = getOrganizationType(state.showingPageType);
        const organizationId = getOrganizationId(state.user, state.showingPageType);

        if (organizationType && organizationId) {
          const response = await getPartnerships(organizationId, organizationType);
          const allPartnerships = response.data || [];
          const schoolOnlyPartnerships = allPartnerships.filter((partnership: any) => {
            const partners = partnership.partners || [];
            if (!Array.isArray(partners) || partners.length === 0) return false;
            const hasSchool = partners.some((p: any) => p?.type?.toLowerCase() === 'school');
            const hasCompany = partners.some((p: any) => p?.type?.toLowerCase() === 'company');
            return hasSchool && !hasCompany;
          });
          setAvailablePartnerships(schoolOnlyPartnerships);
        }
      } catch (err) {
        console.error('Error fetching partnerships:', err);
        setAvailablePartnerships([]);
      } finally {
        setIsLoadingPartnerships(false);
      }
    };

    fetchPartnerships();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.showingPageType, state.user, formData.isPartnership]);

  // Fetch classes (levels) from selected school (or current context school by default)
  useEffect(() => {
    const fetchClasses = async () => {
      setIsLoadingClasses(true);
      try {
        const organizationType = getOrganizationType(state.showingPageType);
        const organizationId = getOrganizationId(state.user, state.showingPageType);

        // Determine which school ID to use: selected in the form, or current context
        const orgIdForLevels = selectedSchoolId
          ? Number.parseInt(selectedSchoolId, 10)
          : organizationId;

        // Only fetch classes for school context
        if (organizationType === 'school' && orgIdForLevels) {
          const response = await getSchoolLevels(orgIdForLevels, 1, 100);
          setAvailableClasses(response.data?.data || []);
        } else {
          setAvailableClasses([]);
        }
      } catch (err) {
        console.error('Error fetching classes:', err);
        setAvailableClasses([]);
      } finally {
        setIsLoadingClasses(false);
      }
    };

    fetchClasses();
  }, [state.showingPageType, state.user, selectedSchoolId]);

  // Co-responsables : enseignants des organisations porteuses + contacts partenaires choisis dans la popup
  useEffect(() => {
    const fromClasses: string[] = [];
    formData.mldsOrganizations.forEach(orgId => {
      const selectedClass = availableClasses.find((c: any) => c.id?.toString() === orgId);
      const teacherIds =
        selectedClass?.teachers?.map((t: any) => t.id?.toString()).filter(Boolean) || [];
      teacherIds.forEach((id: string) => {
        if (!fromClasses.includes(id)) fromClasses.push(id);
      });
    });
    const fromPartnerships: string[] = [];
    formData.partners.forEach(partnershipId => {
      (partnershipCoResponsibles[String(partnershipId)] || []).forEach(id => {
        if (!fromPartnerships.includes(id)) fromPartnerships.push(id);
      });
    });
    const allSelectedIds = new Set([...fromClasses, ...fromPartnerships]);
    setFormData(prev => {
      const nonManaged = prev.coResponsibles.filter(id => !allSelectedIds.has(id));
      const allCoResponsibles = Array.from(new Set([...nonManaged, ...fromClasses, ...fromPartnerships]));
      return { ...prev, coResponsibles: allCoResponsibles };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partnershipCoResponsibles, formData.partners, formData.mldsOrganizations, availableClasses]);

  // Fetch departments from API
  useEffect(() => {
    const fetchDepartments = async () => {
      setIsLoadingDepartments(true);
      try {
        const response = await fetch('https://geo.api.gouv.fr/departements');
        if (response.ok) {
          const data = await response.json();
          // Sort departments by name
          const sortedData = data.sort((a: { nom: string }, b: { nom: string }) =>
            a.nom.localeCompare(b.nom)
          );
          setDepartments(sortedData);
        } else {
          console.error('Error fetching departments:', response.statusText);
          setDepartments([]);
        }
      } catch (err) {
        console.error('Error fetching departments:', err);
        setDepartments([]);
      } finally {
        setIsLoadingDepartments(false);
      }
    };

    fetchDepartments();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === 'isPartnership') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({
        ...prev,
        isPartnership: checked,
        partners: checked ? prev.partners : []
      }));
      if (!checked) {
        setPartnershipCoResponsibles({});
        setPartnershipCoResponsiblesPopup(null);
        setPartnershipCoResponsiblesSearchTerm('');
        setPartnershipContactMembers([]);
      }
    } else if (name === 'mldsRequestedBy') {
      // Reset department when changing "Demande faite par"
      setFormData(prev => ({
        ...prev,
        [name]: value,
        mldsDepartment: value === 'departement' ? prev.mldsDepartment : ''
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleSchoolChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const schoolId = e.target.value;
    setSelectedSchoolId(schoolId || null);

    const selectedSchool = state.user?.available_contexts?.schools?.find(
      (s: any) => s.id?.toString() === schoolId
    );

    setFormData(prev => ({
      ...prev,
      organization: selectedSchool?.name || '',
      // Reset selections tied to the current school context
      coResponsibles: [],
      mldsOrganizations: []
    }));

    setPartnershipCoResponsibles({});
    setPartnershipCoResponsiblesPopup(null);
    setPartnershipCoResponsiblesSearchTerm('');
    setPartnershipContactMembers([]);

    // Clear search inputs (avoid confusing stale selections)
    setSearchTerms(prev => ({
      ...prev,
      coResponsibles: ''
    }));
  };

  const handleCompetencyToggle = (competency: string) => {
    setFormData(prev => ({
      ...prev,
      mldsCompetencies: prev.mldsCompetencies.includes(competency)
        ? prev.mldsCompetencies.filter(c => c !== competency)
        : [...prev.mldsCompetencies, competency]
    }));
  };

  // Helper functions for managing financial lines
  const addFinancialLine = (
    fieldName: 'mldsFinancialTransport' | 'mldsFinancialOperating' | 'mldsFinancialService' | 'mldsFinancialHvLines' | 'mldsFinancialAutres'
  ) => {
    if (fieldName === 'mldsFinancialService') {
      setMldsServiceQuoteFiles(q => [...q, null]);
    }
    setFormData(prev => {
      if (fieldName === 'mldsFinancialTransport') {
        return { ...prev, [fieldName]: [...prev[fieldName], { transport_name: '', price: '' }] };
      }
      if (fieldName === 'mldsFinancialOperating') {
        return { ...prev, [fieldName]: [...prev[fieldName], { operating_name: '', price: '' }] };
      }
      if (fieldName === 'mldsFinancialHvLines') {
        return { ...prev, [fieldName]: [...prev[fieldName], { teacher_name: '', hour: '' }] };
      }
      if (fieldName === 'mldsFinancialAutres') {
        return { ...prev, [fieldName]: [...prev[fieldName], { autres_name: '', price: '' }] };
      }
      return { ...prev, [fieldName]: [...prev[fieldName], { service_name: '', hours: '', price: '', comment: '' }] };
    });
  };

  const removeFinancialLine = (
    fieldName: 'mldsFinancialTransport' | 'mldsFinancialOperating' | 'mldsFinancialService' | 'mldsFinancialHvLines' | 'mldsFinancialAutres',
    index: number
  ) => {
    if (fieldName === 'mldsFinancialService') {
      setMldsServiceQuoteFiles(q => q.filter((_, i) => i !== index));
    }
    setFormData(prev => {
      const arr = prev[fieldName] as Array<unknown>;
      const filtered = arr.filter((_: unknown, i: number) => i !== index);
      type FinancialLinesType =
        | Array<{ transport_name: string; price: string }>
        | Array<{ operating_name: string; price: string }>
        | Array<{ service_name: string; hours: string; price: string; comment: string }>
        | Array<{ teacher_name: string; hour: string }>
        | Array<{ autres_name: string; price: string }>;
      return {
        ...prev,
        [fieldName]: filtered as FinancialLinesType
      };
    });
  };

  const updateFinancialLine = (
    fieldName: 'mldsFinancialTransport' | 'mldsFinancialOperating' | 'mldsFinancialService' | 'mldsFinancialHvLines' | 'mldsFinancialAutres',
    index: number,
    field: 'name' | 'price' | 'hours' | 'hour' | 'comment',
    value: string
  ) => {
    setFormData(prev => {
      const newArray = [...prev[fieldName]] as any[];
      if (fieldName === 'mldsFinancialTransport') {
        newArray[index] = {
          ...newArray[index],
          transport_name: field === 'name' ? value : newArray[index].transport_name,
          price: field === 'price' ? value : newArray[index].price
        };
      } else if (fieldName === 'mldsFinancialOperating') {
        newArray[index] = {
          ...newArray[index],
          operating_name: field === 'name' ? value : newArray[index].operating_name,
          price: field === 'price' ? value : newArray[index].price
        };
      } else if (fieldName === 'mldsFinancialHvLines') {
        newArray[index] = {
          ...newArray[index],
          teacher_name: field === 'name' ? value : newArray[index].teacher_name,
          hour: field === 'hour' ? value : newArray[index].hour
        };
      } else if (fieldName === 'mldsFinancialAutres') {
        newArray[index] = {
          ...newArray[index],
          autres_name: field === 'name' ? value : newArray[index].autres_name,
          price: field === 'price' ? value : newArray[index].price
        };
      } else {
        newArray[index] = {
          ...newArray[index],
          service_name: field === 'name' ? value : newArray[index].service_name,
          hours: field === 'hours' ? value : newArray[index].hours,
          price: field === 'price' ? value : newArray[index].price,
          comment: field === 'comment' ? value : newArray[index].comment
        };
      }
      return { ...prev, [fieldName]: newArray };
    });
  };

  /** Taux horaire affiché pour un prestataire : montant / heures */
  const computedServiceHourlyRate = (line: { hours: string; price: string }): string => {
    const h = Number.parseFloat(line.hours);
    const p = Number.parseFloat(line.price);
    if (!line.hours?.trim() || h <= 0 || Number.isNaN(h)) return '—';
    if (Number.isNaN(p)) return '—';
    return `${(p / h).toFixed(2)} €/h`;
  };

  // Calculate total from financial lines array
  const calculateFinancialLinesTotal = (
    lines: Array<{ transport_name?: string; operating_name?: string; service_name?: string; price: string }>
  ): number => {
    return lines.reduce((sum, line) => {
      const price = Number.parseFloat(line.price) || 0;
      return sum + price;
    }, 0);
  };

  /** Somme des crédits HV : pour chaque ligne, heures × taux horaire MLDS */
  const calculateHvLinesTotal = (
    lines: Array<{ teacher_name: string; hour: string }>,
    financialRate: number
  ): number => {
    const rate = Number.isFinite(financialRate) && financialRate > 0 ? financialRate : HV_DEFAULT_RATE;
    return lines.reduce((sum, line) => sum + hvLineHours(line) * rate, 0);
  };

  const calculateAutresFinancementTotal = (lines: Array<{ autres_name: string; price: string }>): number => {
    return lines.reduce((sum, line) => sum + (Number.parseFloat(line.price) || 0), 0);
  };

  const handleActionObjectiveToggle = (objective: string) => {
    setFormData(prev => ({
      ...prev,
      mldsActionObjectives: prev.mldsActionObjectives.includes(objective)
        ? prev.mldsActionObjectives.filter(o => o !== objective)
        : [...prev.mldsActionObjectives, objective]
    }));
  };

  const handleOrganizationToggle = (orgId: string) => {
    setFormData(prev => {
      const isAlreadySelected = prev.mldsOrganizations.includes(orgId);

      // Toggle selection of the organization (school level)
      const updatedOrganizations = isAlreadySelected
        ? prev.mldsOrganizations.filter(o => o !== orgId)
        : [...prev.mldsOrganizations, orgId];

      // Co-responsables enseignants : synchronisés via useEffect (mldsOrganizations + partenariats)
      return {
        ...prev,
        mldsOrganizations: updatedOrganizations
      };
    });
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setImagePreview(base64String);
        setFormData(prev => ({ ...prev, image: base64String }));
      };
      reader.readAsDataURL(file);
    }
  };

  // Helper functions for member and partner selection
  const getFilteredMembers = (searchTerm: string) => {
    if (!members || !Array.isArray(members)) {
      return [];
    }

    const currentUserId = state.user?.id?.toString();
    let availableMembers = members.filter((member: any) => {
      if (!member) return false;
      const memberIdStr = member.id?.toString();
      if (currentUserId && memberIdStr === currentUserId) {
        return false;
      }
      return true;
    });

    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      availableMembers = availableMembers.filter((member: any) => {
        const fullName = `${member.first_name || ''} ${member.last_name || ''}`.toLowerCase();
        const memberFullName = member.full_name?.toLowerCase() || '';
        const memberRole = member.role?.toLowerCase() || '';
        const memberEmail = member.email?.toLowerCase() || '';

        return fullName.includes(searchLower) ||
          memberFullName.includes(searchLower) ||
          memberRole.includes(searchLower) ||
          memberEmail.includes(searchLower);
      });
    }

    return availableMembers;
  };

  // Co-responsables : enseignants / adultes, jamais les élèves
  const getFilteredCoResponsibles = (searchTerm: string) => {
    if (state.showingPageType === 'teacher' && selectedSchoolId) {
      const selectedIds = formData.coResponsibles.map(id => id.toString());
      const currentUserId = state.user?.id?.toString();
      let list = (coResponsibleOptions || []).filter((m: any) => {
        const id = m?.id?.toString();
        if (currentUserId && id === currentUserId) return false;
        if (selectedIds.includes(id)) return false;
        return true;
      });
      const byId = new Map<string, any>();
      list.forEach((m: any) => {
        if (m?.id != null) byId.set(String(m.id), m);
      });
      (partnershipContactMembers || []).forEach((m: any) => {
        if (m?.id == null || isPartnerContactOrgReferent(m)) return;
        const idStr = String(m.id);
        if (!byId.has(idStr)) {
          byId.set(idStr, {
            ...m,
            avatar_url: m.avatar_url,
            role: m.role ?? m.role_in_organization ?? ''
          });
        }
      });
      list = Array.from(byId.values()).filter((m: any) => {
        const id = m?.id?.toString();
        if (currentUserId && id === currentUserId) return false;
        if (selectedIds.includes(id)) return false;
        return true;
      });
      if (searchTerm.trim()) {
        const lower = searchTerm.toLowerCase();
        list = list.filter((m: any) =>
          (m.full_name || `${m.first_name || ''} ${m.last_name || ''}`).toLowerCase().includes(lower) ||
          (m.email || '').toLowerCase().includes(lower) ||
          (m.role || '').toLowerCase().includes(lower)
        );
      }
      return list;
    }
    const baseList = getFilteredMembers(searchTerm);
    let filtered = baseList.filter((m: any) => {
      const role = (m.role_in_system || m.role || '').toString().toLowerCase();
      const id = m?.id?.toString();
      const alreadyCoResponsible = formData.coResponsibles.includes(id || '');
      return !STUDENT_SYSTEM_ROLES.includes(role) && !alreadyCoResponsible;
    });
    const byId = new Map<string, any>();
    filtered.forEach((m: any) => {
      if (m?.id != null) byId.set(String(m.id), m);
    });
    (partnershipContactMembers || []).forEach((m: any) => {
      if (m?.id == null || isPartnerContactOrgReferent(m)) return;
      const idStr = String(m.id);
      if (!byId.has(idStr)) {
        byId.set(idStr, {
          ...m,
          avatar_url: m.avatar_url,
          role: m.role ?? m.role_in_organization ?? ''
        });
      }
    });
    filtered = Array.from(byId.values()).filter((m: any) => {
      const role = (m.role_in_system || m.role || '').toString().toLowerCase();
      const id = m?.id?.toString();
      const alreadyCoResponsible = formData.coResponsibles.includes(id || '');
      return !STUDENT_SYSTEM_ROLES.includes(role) && !alreadyCoResponsible;
    });
    return filtered;
  };

  const getFilteredPartners = (searchTerm: string) => {
    if (!availablePartnerships || !Array.isArray(availablePartnerships)) return [];

    const savedContextId = localStorage.getItem('selectedContextId');
    const savedContextType = localStorage.getItem('selectedContextType');

    let filtered = availablePartnerships;
    if (savedContextId && savedContextType) {
      const currentOrgId = Number.parseInt(savedContextId);
      filtered = availablePartnerships.filter(partnership => {
        return !partnership.partners?.some((partner: any) =>
          partner.id === currentOrgId &&
          partner.type?.toLowerCase() === savedContextType.toLowerCase()
        );
      });
    }

    // Filter out already selected partnerships
    filtered = filtered.filter((partnership: any) =>
      !formData.partners.includes(partnership.id?.toString())
    );

    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter((partnership: any) => {
        const partnerNames = partnership.partners?.map((p: any) => p.name.toLowerCase()).join(' ') || '';
        const partnershipName = partnership.name?.toLowerCase() || '';
        return partnerNames.includes(searchLower) || partnershipName.includes(searchLower);
      });
    }

    return filtered;
  };

  const handleSearchChange = (field: string, value: string) => {
    setSearchTerms(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleMemberSelect = (field: string, memberId: string) => {
    if (field === 'coResponsibles') {
      const newCoResponsibles = formData.coResponsibles.includes(memberId)
        ? formData.coResponsibles.filter(id => id !== memberId)
        : [...formData.coResponsibles, memberId];
      setFormData(prev => ({ ...prev, coResponsibles: newCoResponsibles }));
    }
  };

  const formatPartnershipDisplayName = (name: string | undefined): string => {
    if (!name) return '';
    return name.replace(/\bPartnership\b/gi, 'Partenariat');
  };

  const handlePartnerSelect = (partnerId: string) => {
    const idStr = partnerId?.toString();
    const partnership = availablePartnerships.find((p: any) => p.id?.toString() === idStr || p.id === Number(partnerId));

    if (!partnership) return;

    const ownerId = state.user?.id != null ? state.user.id.toString() : null;
    const contactUsersRaw = (partnership.partners || []).flatMap((p: any) => (p.contact_users || []).map((c: any) => ({
      id: c.id,
      full_name: c.full_name || '',
      email: c.email || '',
      role: c.role_in_organization || c.role || '',
      role_in_organization: c.role_in_organization || '',
      organization: p.name || ''
    })));
    const withoutReferents = contactUsersRaw.filter((c: any) => !isPartnerContactOrgReferent(c));
    const contactUsers = ownerId
      ? withoutReferents.filter((c: any) => c.id?.toString() !== ownerId)
      : withoutReferents;

    const contactIds = contactUsers.map((c: any) => c.id.toString());
    const isAlreadySelected = formData.partners.some(p => String(p) === String(partnerId));

    if (isAlreadySelected) {
      setFormData(prev => ({
        ...prev,
        partners: prev.partners.filter(id => String(id) !== String(partnerId)),
        coResponsibles: prev.coResponsibles.filter(id => !contactIds.includes(id.toString()))
      }));
      setPartnershipContactMembers(prev => {
        const toRemoveIds = new Set(contactIds);
        return prev.filter((m: any) => !toRemoveIds.has(m.id?.toString()));
      });
      setPartnershipCoResponsibles(prev => {
        const next = { ...prev };
        delete next[String(partnerId)];
        return next;
      });
    } else {
      setFormData(prev => ({
        ...prev,
        partners: [...prev.partners, String(partnerId)]
      }));

      const partnerOrgs = partnership.partners || [];
      const partnershipName = partnerOrgs.map((p: any) => p.name).join(', ') || formatPartnershipDisplayName(partnership.name);

      setPartnershipCoResponsiblesPopup({
        partnershipId: String(partnerId),
        partnershipName,
        contactUsers
      });
      setPartnershipCoResponsiblesSearchTerm('');
      setPartnershipContactMembers(prev => [...prev, ...contactUsers]);
    }
  };

  const togglePartnershipCoResponsible = (partnershipId: string, memberId: string) => {
    const idStr = memberId.toString();
    const key = String(partnershipId);
    setPartnershipCoResponsibles(prev => {
      const current = prev[key] || [];
      const newList = current.includes(idStr)
        ? current.filter(id => id !== idStr)
        : [...current, idStr];
      return { ...prev, [key]: newList };
    });
  };

  /** Filtrer les contact users du partenariat pour la popup de co-responsables */
  const getFilteredPartnershipCoResponsibles = (contactUsers: any[], searchTerm: string) => {
    const withoutReferents = (contactUsers || []).filter((u: any) => !isPartnerContactOrgReferent(u));
    if (!searchTerm.trim()) return withoutReferents;
    const term = searchTerm.toLowerCase();
    return withoutReferents.filter((user: any) => {
      const name = (user.full_name || `${user.first_name || ''} ${user.last_name || ''}`.trim()).toLowerCase();
      const email = (user.email || '').toLowerCase();
      const role = (user.role_in_organization || user.role || '').toLowerCase();
      const org = (user.organization || '').toLowerCase();
      return name.includes(term) || email.includes(term) || role.includes(term) || org.includes(term);
    });
  };

  const getSelectedMember = (memberId: string) => {
    const id = memberId.toString();
    const byId = (m: any) => m?.id?.toString() === id || m?.id === Number.parseInt(memberId, 10);
    return members.find(byId) ?? coResponsibleOptions.find(byId) ?? partnershipContactMembers.find(byId) ?? null;
  };

  const getSelectedPartner = (partnerId: string) => {
    return availablePartnerships.find((p: any) => p.id === partnerId || p.id === Number.parseInt(partnerId));
  };

  /** Libellés des partenariats pour lesquels ce user a été désigné co-responsable (popup contacts partenaire). */
  const getPartnershipContextLabelsForCoResponsible = (memberId: string): string[] => {
    const idStr = memberId.toString();
    const labels: string[] = [];
    (formData.partners || []).forEach((partnershipId: string) => {
      const key = String(partnershipId);
      const ids = partnershipCoResponsibles[key] || [];
      if (!ids.includes(idStr)) return;
      const p = availablePartnerships.find((x: any) => String(x.id) === key || x.id === Number.parseInt(key, 10));
      const partnerNames = (p?.partners || []).map((org: any) => org.name).filter(Boolean).join(', ');
      const label = partnerNames || formatPartnershipDisplayName(p?.name) || `Partenariat #${partnershipId}`;
      if (label && !labels.includes(label)) labels.push(label);
    });
    return labels;
  };

  const submitProject = async (desiredStatus?: 'draft' | 'to_process' | 'pending_validation' | 'coming' | 'in_progress' | 'ended' | 'archived') => {
    setIsSubmitting(true);
    setSubmitError(null);

    const effectiveStatus: 'draft' | 'to_process' | 'pending_validation' | 'coming' | 'in_progress' | 'ended' | 'archived' =
      desiredStatus || formData.status;

    try {
      // Validate required fields only if not in draft mode
      if (effectiveStatus !== 'draft') {
        if (
          !formData.title ||
          !formData.description ||
          !formData.startDate ||
          !formData.endDate ||
          !formData.mldsRequestedBy ||
          !formData.mldsTargetAudience
        ) {
          setSubmitError('Veuillez remplir tous les champs obligatoires');
          setIsSubmitting(false);
          return;
        }
        // Validate department if "Demande faite par" is "Département"
        if (formData.mldsRequestedBy === 'departement' && !formData.mldsDepartment) {
          setSubmitError('Veuillez sélectionner un département');
          setIsSubmitting(false);
          return;
        }
        // Validate établissement porteur (organization)
        if (!formData.organization || formData.organization.trim() === '') {
          setSubmitError('Veuillez sélectionner un établissement porteur');
          setIsSubmitting(false);
          return;
        }
      }
      // Validate network issue addressed for to_process, in_progress, and coming statuses
      if (effectiveStatus === 'to_process' || effectiveStatus === 'in_progress' || effectiveStatus === 'coming') {
        if (!formData.networkIssueAddressed || formData.networkIssueAddressed.trim() === '') {
          setSubmitError('Veuillez remplir la problématique du réseau à laquelle l\'action répond');
          setIsSubmitting(false);
          return;
        }
      }

      // Convert school level IDs from strings to numbers
      const schoolLevelIds = formData.mldsOrganizations.map(id => Number.parseInt(id, 10)).filter(id => !Number.isNaN(id));

      // Require at least one organisation porteuse when submitting (non-draft)
      if (effectiveStatus !== 'draft' && schoolLevelIds.length === 0) {
        setSubmitError('Veuillez sélectionner au moins une organisation porteuse');
        setIsSubmitting(false);
        return;
      }

      // Get context and organization ID
      const organizationType = getOrganizationType(state.showingPageType);
      const organizationId = getOrganizationId(state.user, state.showingPageType);

      // Map organizationType to context
      let context: 'company' | 'school' | 'teacher' | 'general' = 'general';
      if (organizationType === 'company') context = 'company';
      else if (organizationType === 'school') context = 'school';
      else if (organizationType === 'teacher') context = 'teacher';

      const serviceEntries = formData.mldsFinancialService
        .map((line, idx) => ({ line, idx }))
        .filter(({ line }) => line.service_name.trim() || line.price.trim() || line.hours.trim());
      const serviceQuoteFilesPayload = serviceEntries.map(({ idx }) => mldsServiceQuoteFiles[idx] ?? null);
      const quoteFilesList = serviceQuoteFilesPayload.filter((f): f is File => f != null);
      if (quoteFilesList.length > MAX_SERVICE_QUOTE_FILES) {
        setSubmitError(`Vous pouvez joindre au maximum ${MAX_SERVICE_QUOTE_FILES} devis (prestataires)`);
        setIsSubmitting(false);
        return;
      }
      if (quoteFilesList.some(f => f.size > 1024 * 1024)) {
        setSubmitError('Chaque devis doit faire moins de 1 Mo');
        setIsSubmitting(false);
        return;
      }

      const organizationIdForPayload = selectedSchoolId
        ? Number.parseInt(selectedSchoolId, 10)
        : formData.organization
          ? Number.parseInt(formData.organization, 10)
          : organizationId;

      const coResponsibleIds = formData.coResponsibles.map(id => Number.parseInt(id, 10)).filter(id => !Number.isNaN(id));

      const coResponsibleContexts = buildMldsCoResponsibleContexts({
        coResponsibleIds,
        partnershipCoResponsibles,
        formPartners: formData.partners,
        availablePartnerships,
        mldsOrgLevelIds: formData.mldsOrganizations,
        availableLevels: availableClasses,
        schoolContextId: organizationIdForPayload ?? null
      });

      // Prepare MLDS-specific payload
      const mldsPayload = {
        context,
        organization_id: organizationIdForPayload,
        project: {
          title: formData.title,
          description: formData.description,
          start_date: formData.startDate,
          end_date: formData.endDate,
          status: effectiveStatus,
          private: formData.visibility === 'private',
          participants_number: formData.mldsExpectedParticipants
            ? Number.parseInt(formData.mldsExpectedParticipants, 10)
            : undefined,
          school_level_ids: schoolLevelIds,
          skill_ids: [],
          tag_ids: [],
          company_ids: [],
          // Add co-responsibles and partners if needed
          co_responsible_ids: coResponsibleIds,
          ...(coResponsibleContexts.length > 0 ? { co_responsible_contexts: coResponsibleContexts } : {}),
          partnership_ids: formData.partners.length > 0
            ? formData.partners.map(id => Number.parseInt(id, 10)).filter(id => !Number.isNaN(id))
            : undefined,
          mlds_information_attributes: {
            requested_by: formData.mldsRequestedBy,
            department_number: formData.mldsRequestedBy === 'departement' && formData.mldsDepartment ? formData.mldsDepartment : null,
            type_mlds: isRemediation ? 'remediation' : 'perseverance',
            school_level_ids: schoolLevelIds,
            target_audience: formData.mldsTargetAudience,
            action_objectives: formData.mldsActionObjectives,
            action_objectives_other: formData.mldsActionObjectivesOther || null,
            competencies_developed: formData.mldsCompetenciesDeveloped || null,
            expected_participants: formData.mldsExpectedParticipants ? Number.parseInt(formData.mldsExpectedParticipants, 10) : null,
            financial_hse: formData.mldsFinancialHSE ? Number.parseFloat(formData.mldsFinancialHSE) : null,
            financial_hv: null,
            financial_rate: formData.mldsFinancialRate ? Number.parseFloat(formData.mldsFinancialRate) : null,
            financial_hv_lines:
              formData.mldsFinancialHvLines.length > 0
                ? formData.mldsFinancialHvLines.filter(line => line.teacher_name.trim() || line.hour.trim())
                : null,
            financial_transport: formData.mldsFinancialTransport.length > 0 ? formData.mldsFinancialTransport.filter(line => line.transport_name.trim() || line.price.trim()) : null,
            financial_operating: formData.mldsFinancialOperating.length > 0 ? formData.mldsFinancialOperating.filter(line => line.operating_name.trim() || line.price.trim()) : null,
            financial_autres_financements:
              formData.mldsFinancialAutres.length > 0
                ? formData.mldsFinancialAutres.filter(line => line.autres_name.trim() || line.price.trim())
                : null,
            mlds_financial_service_lines_attributes:
              serviceEntries.length > 0
                ? serviceEntries.map(({ line }, pos) => ({
                    position: pos,
                    service_name: line.service_name,
                    price: line.price,
                    ...(line.hours.trim() ? { hours: line.hours } : {}),
                    comment: line.comment.trim() ? line.comment.trim() : null
                  }))
                : null,
            objectives: formData.mldsObjectives || null,
            network_issue_addressed: formData.networkIssueAddressed || null
          }
        }
      };

      // Convert Base64 image to File object
      let mainImageFile: File | null = null;
      if (imagePreview) {
        mainImageFile = base64ToFile(imagePreview, 'main-image.jpg');
      }

      // Validate image
      const imageValidation = validateImages(mainImageFile, []);
      if (!imageValidation.valid) {
        setSubmitError(imageValidation.errors.join(', '));
        setIsSubmitting(false);
        return;
      }

      // Create project via API (pass image as separate parameter ; devis prestataires via multipart)
      const response = await createProject(mldsPayload, mainImageFile, [], [], {
        serviceQuoteFiles: serviceQuoteFilesPayload
      });

      if (response) {
        // Get the actual title from API response or use the form title
        const actualTitle = response.title || formData.title;

        // Show success message
        setSuccessData({
          title: actualTitle,
          image: formData.image
        });
        setShowSuccess(true);

        // Build a Project object that matches the expected type
        const projectData: Omit<Project, 'id'> = {
          title: actualTitle,
          description: formData.description,
          startDate: formData.startDate,
          endDate: formData.endDate,
          organization: formData.organization,
          status: effectiveStatus,
          visibility: formData.visibility,
          pathway: formData.pathway,
          tags: formData.tags ? formData.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
          links: formData.links,
          participants: 0,
          badges: 0,
          image: formData.image,
          additionalPhotos: formData.additionalImages,
          owner: state.user?.name || '',
          progress: 0,
          members: [],
          events: [],
          badges_list: [],
          coResponsibles: formData.coResponsibles.map(id => {
            const member = members.find(m => m.id.toString() === id);
            return {
              id: id,
              name: member ? `${member.first_name} ${member.last_name}` : '',
              avatar: member?.avatar_url || '',
              profession: member?.role || '',
              organization: '',
              email: member?.email || ''
            };
          }),
          partner: formData.isPartnership && formData.partners.length > 0 ? {
            id: formData.partners[0],
            name: availablePartnerships.find(p => p.id.toString() === formData.partners[0])?.name || '',
            logo: '',
            organization: ''
          } : null,
          responsible: null
        };

        // Call onSave callback
        setTimeout(() => {
          onSave(projectData);
          setShowSuccess(false);
          onClose();
        }, 2000);
      }
    } catch (err: any) {
      console.error('Error creating MLDS project:', err);
      const message = err.response?.data?.message || 'Une erreur est survenue lors de la création du projet';
      setSubmitError(message);
      showError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Pour les enseignants, on soumet toujours le projet en statut "À traiter"
    const isTeacher = state.showingPageType === 'teacher' || state.user?.role === 'teacher';

    let statusForSubmit: 'draft' | 'to_process' | 'pending_validation' | 'coming' | 'in_progress' | 'ended' | 'archived';

    if (isTeacher) {
      statusForSubmit = 'to_process';
    } else {
      // Pour les admins / superadmins (rôles organisationnels), on détermine automatiquement
      // le statut en fonction de la date de début : "En cours" si déjà commencée, sinon "À venir".
      let computedStatus: 'coming' | 'in_progress' = 'coming';
      if (formData.startDate) {
        const startDate = new Date(formData.startDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        startDate.setHours(0, 0, 0, 0);
        if (startDate <= today) {
          computedStatus = 'in_progress';
        } else {
          computedStatus = 'coming';
        }
      }
      statusForSubmit = computedStatus;
      // Garder formData cohérent avec le statut envoyé
      setFormData(prev => ({ ...prev, status: computedStatus }));
    }

    await submitProject(statusForSubmit);
  };

  const handleSaveDraft = async () => {
    setFormData(prev => ({ ...prev, status: 'draft' }));
    await submitProject('draft');
  };

  const isRemediation = variant === 'remediation';
  const successMessage = isRemediation
    ? 'Votre projet MLDS Volet Remédiation a été créé et est maintenant visible.'
    : 'Votre projet MLDS Volet Persévérance Scolaire a été créé et est maintenant visible.';
  const headerTitle = isRemediation
    ? 'Créer un projet MLDS Volet Remédiation'
    : 'Créer un projet MLDS Volet Persévérance Scolaire';
  const headerSubtitle = isRemediation
    ? 'Mission de Lutte contre le Décrochage Scolaire - Volet Remédiation'
    : 'Mission de Lutte contre le Décrochage Scolaire - Volet Persévérance Scolaire';
  const sectionTitle = isRemediation ? 'Volet Remédiation' : 'Volet Persévérance Scolaire';

  const remediationNetworkIssueOptions = [
    { value: 'sas_rentree', label: 'SAS de rentrée' },
    { value: 'sas_positionnement', label: 'SAS de positionnement' },
    { value: 'actions_remobilisation', label: 'Actions de remobilisation' },
    { value: 'actions_remise_niveau', label: 'Actions de remise à niveau (disciplinaire, réalisé par des enseignants)' },
    // { value: 'securisation_parcours', label: 'Sécurisation des parcours' },
  ];

  if (showSuccess && successData) {
    return (
      <div className="modal-overlay" onClick={onClose} role="presentation">
        <div className="modal-content success-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
          <div className="success-animation">
            <div className="success-checkmark">
              <i className="fas fa-check"></i>
            </div>
          </div>
          <h2 className="success-title">Projet MLDS créé avec succès !</h2>
          {successData.image && (
            <div className="success-image">
              <img src={successData.image} alt={successData.title} />
            </div>
          )}
          <p className="success-project-title">{successData.title}</p>
          <p className="success-message">{successMessage}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={onClose} role="presentation">
      <div className="modal-content project-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <button className="modal-close" onClick={onClose}>
          <i className="fas fa-times"></i>
        </button>

        <div className="flex flex-col gap-2 modal-header">
          <h2>
            <i className="fas fa-graduation-cap" style={{ marginRight: '12px' }}></i>
            {headerTitle}
          </h2>
          <p className="modal-subtitle">
            {headerSubtitle}
          </p>
        </div>

        {submitError && (
          <div className="error-message" style={{
            padding: '12px',
            marginBottom: '16px',
            backgroundColor: '#fee2e2',
            color: '#dc2626',
            borderRadius: '8px',
            fontSize: '14px'
          }}>
            <i className="fas fa-exclamation-circle" style={{ marginRight: '8px' }}></i>
            {submitError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="modal-form">
          {/* Basic Information */}
          <div className="form-section">
            <h3 className="form-section-title">Informations générales</h3>
            <div className="form-group">
              <label htmlFor="mldsRequestedBy">Demande faite par <span style={{ color: 'red' }}>*</span></label>
              <select
                id="mldsRequestedBy"
                name="mldsRequestedBy"
                className="form-select"
                value={formData.mldsRequestedBy}
                onChange={handleInputChange}
              >
                {mldsRequestedByOptions.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>

            {/* Département select - Only visible when "Demande faite par" is "Département" */}
            {formData.mldsRequestedBy === 'departement' && (
              <div className="form-group">
                <label htmlFor="mldsDepartment">Département <span style={{ color: 'red' }}>*</span></label>
                {isLoadingDepartments ? (
                  <div style={{ padding: '12px', textAlign: 'center', color: '#6b7280' }}>
                    <i className="fas fa-spinner fa-spin" style={{ marginRight: '8px' }}></i>
                    Chargement des départements...
                  </div>
                ) : (
                  <select
                    id="mldsDepartment"
                    name="mldsDepartment"
                    className="form-select"
                    value={formData.mldsDepartment}
                    onChange={handleInputChange}
                    required={formData.mldsRequestedBy === 'departement'}
                  >
                    <option value="">Sélectionnez un département</option>
                    {departments.map(dept => (
                      <option key={dept.code} value={dept.code}>
                        {dept.nom} ({dept.code})
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}

            {/* Sélection de l'établissement (école) */}
            <div className="form-group">
              <label htmlFor="organization">Établissement porteur <span style={{ color: 'red' }}>*</span></label>
              {state.user?.available_contexts?.schools && state.user.available_contexts.schools.length > 0 ? (
                <select
                  id="organization"
                  name="organization"
                  className="form-select"
                  value={selectedSchoolId ?? ''}
                  onChange={handleSchoolChange}
                  required
                >
                  {/* <option value="">Sélectionnez un établissement</option> */}
                  {state.user.available_contexts.schools.map((school: any) => (
                    <option key={school.id} value={school.id.toString()}>
                      {school.name}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  id="organization"
                  name="organization"
                  className="form-input"
                  value={formData.organization}
                  onChange={handleInputChange}
                  placeholder="Nom de l'établissement porteur"
                  required
                />
              )}
            </div>

            <div className="form-group">
              <div className="form-label">Organisation porteuse</div>
              {availableClasses.length > 0 ? (
                <div className="multi-select-container" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                  {availableClasses.map(classItem => (
                    <label
                      key={classItem.id}
                      className={`multi-select-item  !flex items-center gap-2 ${formData.mldsOrganizations.includes(classItem.id.toString()) ? 'selected' : ''}`}
                    >
                      <input
                        type="checkbox"
                        checked={formData.mldsOrganizations.includes(classItem.id.toString())}
                        onChange={() => handleOrganizationToggle(classItem.id.toString())}
                      />
                      <div className="multi-select-checkmark">
                        <i className="fas fa-check"></i>
                      </div>
                      <span className="multi-select-label">{classItem.name} {classItem.level ? `- ${classItem.level}` : ''}</span>
                    </label>
                  ))}
                </div>
              ) : (
                <div className={isLoadingClasses ? 'loading-message' : 'no-items-message'}>
                  {isLoadingClasses ? (
                    <>
                      <i className="fas fa-spinner fa-spin"></i>
                      <span>Chargement des classes...</span>
                    </>
                  ) : (
                    'Aucune classe disponible'
                  )}
                </div>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="title" className="required">Titre du projet</label>
              <input
                type="text"
                id="title"
                name="title"
                className="form-input"
                value={formData.title}
                onChange={handleInputChange}
                placeholder="Entrez le titre du projet"
                required={formData.status !== 'draft'}
              />
            </div>
            <div className="form-group">
              <div className="form-label">
                {isRemediation ? 'Actions concernées' : "Problématique du réseau à laquelle l'action répond"}{' '}
                <span style={{ color: 'red' }}>*</span>
              </div>
              {isRemediation ? (
                <div className="multi-select-container">
                  {remediationNetworkIssueOptions.map((opt) => {
                    const selectedValues = formData.networkIssueAddressed
                      ? formData.networkIssueAddressed.split(' | ')
                      : [];
                    const checked = selectedValues.includes(opt.label);
                    return (
                      <label
                        key={opt.value}
                        className={`multi-select-item !flex items-center gap-2 ${checked ? 'selected' : ''}`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => {
                            const current = formData.networkIssueAddressed
                              ? formData.networkIssueAddressed.split(' | ')
                              : [];
                            const next = checked
                              ? current.filter((v) => v !== opt.label)
                              : [...current, opt.label];
                            setFormData((prev) => ({
                              ...prev,
                              networkIssueAddressed: next.join(' | '),
                            }));
                          }}
                        />
                        <div className="multi-select-checkmark">
                          <i className="fas fa-check"></i>
                        </div>
                        <span className="multi-select-label">{opt.label}</span>
                      </label>
                    );
                  })}
                </div>
              ) : (
                <textarea
                  id="networkIssueAddressed"
                  name="networkIssueAddressed"
                  className="form-input"
                  value={formData.networkIssueAddressed}
                  required={
                    formData.status === 'to_process' ||
                    formData.status === 'in_progress' ||
                    formData.status === 'coming'
                  }
                  onChange={handleInputChange}
                  placeholder="S&#39;appuyer sur des données quantitatives et
qualitatives (indicateurs, besoins identifiés, freins…)"
                  rows={4}
                />
              )}
            </div>

            <div className="form-group">
              <label htmlFor="description" className="required">Description</label>
              <textarea
                id="description"
                name="description"
                className="form-textarea"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Description de l'action MLDS et de ses objectifs"
                rows={4}
              />
            </div>
            {/* Project Image Selection */}
            <div className="form-section">
              <h3>Image du projet</h3>
              <div className="avatar-selection">
                <div className="avatar-preview">
                  {imagePreview ? (
                    <img src={imagePreview} alt="Project preview" className="avatar-image" />
                  ) : (
                    <div className="avatar-placeholder">
                      <i className="fas fa-image"></i>
                      <span>Image par défaut</span>
                    </div>
                  )}
                </div>
                <div className="avatar-actions">
                  <button
                    type="button"
                    onClick={() => document.getElementById('projectImage')?.click()}
                    className="btn btn-outline btn-sm"
                  >
                    <i className="fas fa-upload"></i>
                    Choisir une image
                  </button>
                  <input
                    id="projectImage"
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    style={{ display: 'none' }}
                  />
                  <p className="avatar-note">
                    Si aucune image n'est sélectionnée, l'image par défaut sera utilisée
                  </p>
                </div>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="startDate" className="required">Date de début</label>
                <input
                  type="date"
                  id="startDate"
                  name="startDate"
                  className="form-input"
                  value={formData.startDate}
                  onChange={handleInputChange}
                />
              </div>
              <div className="form-group">
                <label htmlFor="endDate" className="required">Date de fin</label>
                <input
                  type="date"
                  id="endDate"
                  name="endDate"
                  className="form-input"
                  value={formData.endDate}
                  onChange={handleInputChange}
                />
              </div>
            </div>

            {/* Statut non affiché pour les projets MLDS : il est déterminé automatiquement à partir des dates */}

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="mldsExpectedParticipants">Effectifs prévisionnel</label>
                <input
                  type="number"
                  id="mldsExpectedParticipants"
                  name="mldsExpectedParticipants"
                  className="form-input"
                  value={formData.mldsExpectedParticipants}
                  onChange={handleInputChange}
                  placeholder="Nbr participants"
                  min="0"
                />
              </div>
              <div className="form-group">
                <label htmlFor="mldsTargetAudience">Public ciblé <span style={{ color: 'red' }}>*</span></label>
                <select
                  id="mldsTargetAudience"
                  name="mldsTargetAudience"
                  className="form-select"
                  value={formData.mldsTargetAudience}
                  onChange={handleInputChange}
                >
                {(isRemediation ? remediationTargetAudienceOptions : mldsTargetAudienceOptions).map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
                </select>
              </div>
            </div>

            {/* Partnership Section */}
            <div className="form-group">
              <label className={`multi-select-item !flex items-center gap-2 ${formData.isPartnership ? 'selected' : ''}`} style={{ cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  id="isPartnership"
                  name="isPartnership"
                  checked={formData.isPartnership}
                  onChange={handleInputChange}
                />
                <div className="multi-select-checkmark">
                  <i className="fas fa-check"></i>
                </div>
                <div className="">
                  <span className="multi-select-label">Ajouter un partenaire du réseau FOQUALE présent sur Kinship {"  "}</span>
                  <span className="info-tooltip-wrapper">
                    <i className="fas fa-info-circle" style={{ color: '#6b7280', fontSize: '0.875rem', cursor: 'help' }}></i>
                    <div className="info-tooltip">
                      <div style={{ fontWeight: '600', marginBottom: '8px' }}>En ajoutant un partenaire présent sur Kinship :</div>
                      <ul>
                        <li>Son Admin ou Superadmin pourra être désigné co-responsable du projet. </li>
                        <li>Il pourra co-rédiger, co-gérer et suivre le projet MLDS avec vous.</li>
                      </ul>
                    </div>
                  </span>

                </div>
              </label>
            </div>

            {/* Partenaires - Only visible if En partenariat is checked */}
            {formData.isPartnership && (
              <div className="form-group">
                <label htmlFor="projectPartner">Partenaire(s)</label>
                <div className="compact-selection">
                  <div className="search-input-container">
                    <i className="fas fa-search search-icon"></i>
                    <input
                      type="text"
                      className="form-input placeholder:text-sm"
                      placeholder="ex : établissements du réseau FOQUALE, DCIO, Pôle Persévérance Scolaire — Académie de Nice, autres réseaux FOQUALE (pour les projets inter-réseaux)"
                      value={searchTerms.partner}
                      onChange={(e) => handleSearchChange('partner', e.target.value)}
                    />
                  </div>

                  {formData.partners.length > 0 && (
                    <div className="selected-items">
                      {formData.partners.map((partnerId) => {
                        const selected = getSelectedPartner(partnerId);
                        if (!selected) return null;

                        const partnerOrgs = selected.partners || [];
                        const firstPartner = partnerOrgs[0];
                        const roleInPartnership = firstPartner?.role_in_partnership;

                        return (
                          <div key={partnerId} className="selected-member">
                            <AvatarImage
                              src={firstPartner?.logo_url || '/default-avatar.png'}
                              alt={firstPartner?.name || 'Partnership'}
                              className="selected-avatar"
                            />
                            <div className="selected-info">
                              <div className="selected-name">
                                {partnerOrgs.map((p: any) => p.name).join(', ')}
                              </div>
                              <div className="selected-role">{selected.name || ''}</div>
                              {roleInPartnership && (
                                <div className="selected-org" style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: '0.2rem' }}>
                                  Rôle dans le partenariat : {roleInPartnership}
                                </div>
                              )}
                            </div>
                            <button
                              type="button"
                              className="remove-selection"
                              onClick={() => handlePartnerSelect(partnerId)}
                            >
                              <i className="fas fa-times"></i>
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <div className="selection-list">
                    {getFilteredPartners(searchTerms.partner).map((partnership) => {
                      const partnerOrgs = partnership.partners || [];
                      const firstPartner = partnerOrgs[0];
                      const roleInPartnership = firstPartner?.role_in_partnership;

                      return (
                        <div
                          key={partnership.id}
                          className="selection-item"
                          onClick={() => handlePartnerSelect(partnership.id)}
                        >
                          <AvatarImage
                            src={firstPartner?.logo_url || '/default-avatar.png'}
                            alt={firstPartner?.name || 'Partnership'}
                            className="item-avatar"
                          />
                          <div className="item-info">
                            <div className="item-name">
                              {partnerOrgs.map((p: any) => p.name).join(', ')}
                            </div>
                            <div className="item-role">{partnership.name || ''}</div>
                            {roleInPartnership && (
                              <div className="item-org" style={{ fontSize: '0.8rem', color: '#6b7280' }}>Rôle dans le partenariat : {roleInPartnership}</div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Co-responsables */}
            <div className="form-group">
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
                <label htmlFor="projectCoResponsibles">Co-responsable(s)</label>
                <span className="info-tooltip-wrapper">
                  <i className="fas fa-info-circle" style={{ color: '#6b7280', fontSize: '0.875rem', cursor: 'help' }}></i>
                  <div className="info-tooltip">
                    <div style={{ fontWeight: '600', marginBottom: '8px' }}>Les co-responsables peuvent :</div>
                    <ul>
                      <li>voir le projet dans leur profil</li>
                      <li>ajouter des membres de leur organisation uniquement et modifier leur statut (sauf admin)</li>
                      <li>attribuer des badges</li>
                      <li>faire des équipes et donner des rôles dans équipe</li>
                      <li>plus tard attribuer des tâches (Kanban)</li>
                    </ul>
                  </div>
                </span>
              </div>
              <div className="compact-selection">
                <div className="search-input-container">
                  <i className="fas fa-search search-icon"></i>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Rechercher des co-responsables..."
                    value={searchTerms.coResponsibles}
                    onChange={(e) => handleSearchChange('coResponsibles', e.target.value)}
                    disabled={isLoadingMembers || isLoadingCoResponsibles}
                  />
                </div>

                {(isLoadingMembers || isLoadingCoResponsibles) ? (
                  <div className="loading-members" style={{ padding: '1rem', textAlign: 'center', color: '#6b7280' }}>
                    <i className="fas fa-spinner fa-spin" style={{ marginRight: '0.5rem' }}></i>
                    <span>Chargement des collaborateurs...</span>
                  </div>
                ) : (
                  <>
                    {formData.coResponsibles.length > 0 && (
                      <div className="selected-items">
                        {formData.coResponsibles.map((memberId) => {
                          const member = getSelectedMember(memberId);
                          const memberOrg = typeof member?.organization === 'string' ? member?.organization : (member?.organization?.name ?? '');
                          const partnershipContexts = getPartnershipContextLabelsForCoResponsible(memberId);
                          return member ? (
                            <div key={memberId} className="selected-member">
                              <AvatarImage src={member.avatar_url || '/default-avatar.png'} alt={member.full_name || `${member.first_name} ${member.last_name}`} className="selected-avatar" />
                              <div className="selected-info">
                                <div className="selected-name">{member.full_name || `${member.first_name} ${member.last_name}`}</div>
                                <div className="selected-role">{translateRole(member.role_in_system ?? member.role ?? '')}</div>
                                {partnershipContexts.length > 0 && (
                                  <div className="selected-org" style={{ fontSize: '0.8rem', color: '#0369a1', marginTop: '0.2rem', fontWeight: 600 }}>
                                    Co-responsable via le partenariat : {partnershipContexts.join(' · ')}
                                  </div>
                                )}
                                {memberOrg && (
                                  <div className="selected-org" style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: '0.2rem' }}>Organisation : {memberOrg}</div>
                                )}
                              </div>
                              <button
                                type="button"
                                className="remove-selection"
                                onClick={() => handleMemberSelect('coResponsibles', memberId)}
                              >
                                <i className="fas fa-times"></i>
                              </button>
                            </div>
                          ) : null;
                        })}
                      </div>
                    )}
                    <div className="selection-list">
                      {getFilteredCoResponsibles(searchTerms.coResponsibles).length === 0 ? (
                        <div className="no-members-message" style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>
                          <i className="fas fa-users" style={{ fontSize: '2rem', marginBottom: '0.5rem', display: 'block' }}></i>
                          <p>Aucun membre disponible</p>
                        </div>
                      ) : (
                        getFilteredCoResponsibles(searchTerms.coResponsibles).map((member: any) => (
                          <div
                            key={member.id}
                            className="selection-item"
                            onClick={() => handleMemberSelect('coResponsibles', member.id)}
                          >
                            <AvatarImage src={member.avatar_url || '/default-avatar.png'} alt={member.full_name || `${member.first_name} ${member.last_name}`} className="item-avatar" />
                            <div className="item-info">
                              <div className="item-name">{member.full_name || `${member.first_name} ${member.last_name}`}</div>
                              <div className="item-role">{translateRole(member.role_in_system ?? member.role)}</div>
                              {(typeof member.organization === 'string' ? member.organization : member.organization?.name) && (
                                <div className="item-org" style={{ fontSize: '0.8rem', color: '#6b7280' }}>Organisation : {typeof member.organization === 'string' ? member.organization : member.organization?.name}</div>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>

          </div>

          {/* MLDS Specific Section */}
          <div className="form-section">
            <h3 className="form-section-title">{sectionTitle}</h3>

            {/* <div className="form-group">
              <label htmlFor="mldsObjectives">Objectifs pédagogiques</label>
              <textarea
                id="mldsObjectives"
                name="mldsObjectives"
                className="form-textarea"
                value={formData.mldsObjectives}
                onChange={handleInputChange}
                placeholder="Décrire les objectifs de remobilisation et de persévérance scolaire..."
                rows={3}
              />
            </div> */}


            <div className="form-group">
              <div className="form-label">Objectifs de l'action</div>
              <div className="multi-select-container">
                {(isRemediation ? remediationActionObjectivesOptions : mldsActionObjectivesOptions).map(objective => (
                  <label
                    key={objective.value}
                    className={`multi-select-item  !flex items-center gap-2 ${formData.mldsActionObjectives.includes(objective.value) ? 'selected' : ''}`}
                  >
                    <input
                      type="checkbox"
                      checked={formData.mldsActionObjectives.includes(objective.value)}
                      onChange={() => handleActionObjectiveToggle(objective.value)}
                    />
                    <div className="multi-select-checkmark">
                      <i className="fas fa-check"></i>
                    </div>
                    <span className="multi-select-label">{objective.label}</span>
                  </label>
                ))}
              </div>
              {formData.mldsActionObjectives.includes('other') && (
                <div style={{ marginTop: '12px' }}>
                  <label htmlFor="mldsActionObjectivesOther">Précisez l'autre objectif</label>
                  <textarea
                    id="mldsActionObjectivesOther"
                    name="mldsActionObjectivesOther"
                    className="form-textarea"
                    value={formData.mldsActionObjectivesOther}
                    onChange={handleInputChange}
                    placeholder="Décrivez l'autre objectif..."
                    rows={2}
                    style={{ marginTop: '8px' }}
                  />
                </div>
              )}
            </div>

            <div className="form-group">
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
                <label htmlFor="mldsCompetenciesDeveloped">Compétences développées par l'action</label>
                <span className="info-tooltip-wrapper">
                  <i className="fas fa-info-circle" style={{ color: '#6b7280', fontSize: '0.875rem', cursor: 'help' }}></i>
                  <div className="info-tooltip">
                    <div style={{ fontWeight: '600', marginBottom: '8px' }}>Compétences développées par l'action :</div>
                    <ul>
                      <li>Les compétences que vous décrivez ici seront traduites en badges Kinship
                        attribués aux élèves participants. Elles apparaîtront dans les Stats &amp; KPI de votre
                        action.</li>
                    </ul>
                  </div>
                </span>
              </div>
              <textarea
                id="mldsCompetenciesDeveloped"
                name="mldsCompetenciesDeveloped"
                className="form-textarea"
                value={formData.mldsCompetenciesDeveloped}
                onChange={handleInputChange}
                placeholder="Commencer par un verbe d&#39;action pour lister les compétences
développées par les participants"
                rows={3}
              />
            </div>

            <div className="form-group">
              <div className="form-label">Moyens financiers demandés</div>
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '1rem',
                marginTop: '12px',
                padding: '16px',
                background: '#f9fafb',
                borderRadius: '8px',
                border: '1px solid #e5e7eb'
              }}>
                <div className="form-group" style={{ marginBottom: '0' }}>
                  <label htmlFor="mldsFinancialHSE">HSE</label>
                  <input
                    type="number"
                    id="mldsFinancialHSE"
                    name="mldsFinancialHSE"
                    className="form-input"
                    value={formData.mldsFinancialHSE}
                    onChange={handleInputChange}
                    placeholder="Nombre d'heures HSE"
                    min="0"
                    step="0.01"
                  />
                </div>
                <div className="form-group" style={{ marginBottom: '0' }}>
                  <label htmlFor="mldsFinancialRate">Taux (€/h)</label>
                  <input
                    type="number"
                    id="mldsFinancialRate"
                    name="mldsFinancialRate"
                    className="form-input !cursor-not-allowed !opacity-50"
                    disabled={true}
                    value={formData.mldsFinancialRate}
                    onChange={handleInputChange}
                    placeholder="Taux en €/heure"
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>

              <div style={{
                marginTop: '12px',
                padding: '16px',
                background: '#f9fafb',
                borderRadius: '8px',
                border: '1px solid #e5e7eb'
              }}>
                <h4 style={{
                  fontSize: '0.95rem',
                  fontWeight: 600,
                  color: '#374151',
                  marginBottom: '12px',
                  marginTop: '0'
                }}>
                  Crédits
                </h4>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr',
                  gap: '1rem'
                }}>
                  {/* Crédits HV (par enseignant) */}
                  <div className="form-group" style={{ marginBottom: '0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <label htmlFor="mldsFinancialHvLines">HV (crédits)</label>
                      <button
                        type="button"
                        onClick={() => addFinancialLine('mldsFinancialHvLines')}
                        className="btn btn-outline btn-sm"
                        style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                      >
                        <i className="fas fa-plus" style={{ marginRight: '4px' }}></i>
                        Ajouter une ligne
                      </button>
                    </div>
                    {formData.mldsFinancialHvLines.length === 0 ? (
                      <div style={{ padding: '12px', textAlign: 'center', color: '#6b7280', fontSize: '0.875rem', backgroundColor: '#f9fafb', borderRadius: '6px' }}>
                        Aucune ligne. Cliquez sur « Ajouter une ligne » pour saisir les heures HV par enseignant (crédits = heures × taux horaire).
                      </div>
                    ) : (
                      formData.mldsFinancialHvLines.map((line, index) => (
                        <div key={index} style={{ display: 'flex', gap: '8px', marginBottom: '8px', alignItems: 'center' }}>
                          <input
                            type="text"
                            className="form-input"
                            value={line.teacher_name}
                            onChange={(e) => updateFinancialLine('mldsFinancialHvLines', index, 'name', e.target.value)}
                            placeholder="Nom de l'enseignant"
                            style={{ flex: 2 }}
                          />
                          <input
                            type="number"
                            className="form-input"
                            value={line.hour}
                            onChange={(e) => updateFinancialLine('mldsFinancialHvLines', index, 'hour', e.target.value)}
                            placeholder="Heures HV"
                            min="0"
                            step="0.01"
                            style={{ flex: 1 }}
                          />
                          <button
                            type="button"
                            onClick={() => removeFinancialLine('mldsFinancialHvLines', index)}
                            className="btn btn-outline btn-sm"
                            style={{ padding: '8px 12px', color: '#dc2626' }}
                          >
                            <i className="fas fa-trash"></i>
                          </button>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Frais de transport */}
                  <div className="form-group" style={{ marginBottom: '0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <label htmlFor="mldsFinancialTransport">Frais de transport</label>
                      <button
                        type="button"
                        onClick={() => addFinancialLine('mldsFinancialTransport')}
                        className="btn btn-outline btn-sm"
                        style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                      >
                        <i className="fas fa-plus" style={{ marginRight: '4px' }}></i>
                        Ajouter une ligne
                      </button>
                    </div>
                    {formData.mldsFinancialTransport.length === 0 ? (
                      <div style={{ padding: '12px', textAlign: 'center', color: '#6b7280', fontSize: '0.875rem', backgroundColor: '#f9fafb', borderRadius: '6px' }}>
                        Aucune ligne. Cliquez sur "Ajouter une ligne" pour commencer.
                      </div>
                    ) : (
                      formData.mldsFinancialTransport.map((line, index) => (
                        <div key={index} style={{ display: 'flex', gap: '8px', marginBottom: '8px', alignItems: 'center' }}>
                          <input
                            type="text"
                            className="form-input"
                            value={line.transport_name}
                            onChange={(e) => updateFinancialLine('mldsFinancialTransport', index, 'name', e.target.value)}
                            placeholder="Nom du transport"
                            style={{ flex: 2 }}
                          />
                          <input
                            type="number"
                            className="form-input"
                            value={line.price}
                            onChange={(e) => updateFinancialLine('mldsFinancialTransport', index, 'price', e.target.value)}
                            placeholder="Prix en €"
                            min="0"
                            step="0.01"
                            style={{ flex: 1 }}
                          />
                          <button
                            type="button"
                            onClick={() => removeFinancialLine('mldsFinancialTransport', index)}
                            className="btn btn-outline btn-sm"
                            style={{ padding: '8px 12px', color: '#dc2626' }}
                          >
                            <i className="fas fa-trash"></i>
                          </button>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Frais de fonctionnement */}
                  <div className="form-group" style={{ marginBottom: '0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <label htmlFor="mldsFinancialOperating">Frais de fonctionnement</label>
                      <button
                        type="button"
                        onClick={() => addFinancialLine('mldsFinancialOperating')}
                        className="btn btn-outline btn-sm"
                        style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                      >
                        <i className="fas fa-plus" style={{ marginRight: '4px' }}></i>
                        Ajouter une ligne
                      </button>
                    </div>
                    {formData.mldsFinancialOperating.length === 0 ? (
                      <div style={{ padding: '12px', textAlign: 'center', color: '#6b7280', fontSize: '0.875rem', backgroundColor: '#f9fafb', borderRadius: '6px' }}>
                        Aucune ligne. Cliquez sur "Ajouter une ligne" pour commencer.
                      </div>
                    ) : (
                      formData.mldsFinancialOperating.map((line, index) => (
                        <div key={index} style={{ display: 'flex', gap: '8px', marginBottom: '8px', alignItems: 'center' }}>
                          <input
                            type="text"
                            className="form-input"
                            value={line.operating_name}
                            onChange={(e) => updateFinancialLine('mldsFinancialOperating', index, 'name', e.target.value)}
                            placeholder="Nom du fonctionnement"
                            style={{ flex: 2 }}
                          />
                          <input
                            type="number"
                            className="form-input"
                            value={line.price}
                            onChange={(e) => updateFinancialLine('mldsFinancialOperating', index, 'price', e.target.value)}
                            placeholder="Prix en €"
                            min="0"
                            step="0.01"
                            style={{ flex: 1 }}
                          />
                          <button
                            type="button"
                            onClick={() => removeFinancialLine('mldsFinancialOperating', index)}
                            className="btn btn-outline btn-sm"
                            style={{ padding: '8px 12px', color: '#dc2626' }}
                          >
                            <i className="fas fa-trash"></i>
                          </button>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Prestataires de service */}
                  <div className="form-group" style={{ marginBottom: '0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <label htmlFor="mldsFinancialService">Prestataires de service</label>
                      <button
                        type="button"
                        onClick={() => addFinancialLine('mldsFinancialService')}
                        className="btn btn-outline btn-sm"
                        style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                      >
                        <i className="fas fa-plus" style={{ marginRight: '4px' }}></i>
                        Ajouter une ligne
                      </button>
                    </div>
                    <p style={{ fontSize: '0.8rem', color: '#6b7280', margin: '0 0 4px 0' }}>
                      Joindre un devis par prestataire : au plus {MAX_SERVICE_QUOTE_FILES} fichiers au total, 1 Mo chacun (PDF, Word, image…).
                    </p>
                    <p style={{ fontSize: '0.8rem', color: '#0369a1', margin: '0 0 8px 0', fontWeight: 600 }}>
                      Devis joints : {countServiceQuoteFiles(mldsServiceQuoteFiles)} / {MAX_SERVICE_QUOTE_FILES}
                    </p>
                    {formData.mldsFinancialService.length === 0 ? (
                      <div style={{ padding: '12px', textAlign: 'center', color: '#6b7280', fontSize: '0.875rem', backgroundColor: '#f9fafb', borderRadius: '6px' }}>
                        Aucune ligne. Cliquez sur &quot;Ajouter une ligne&quot; pour commencer.
                      </div>
                    ) : (
                      formData.mldsFinancialService.map((line, index) => (
                        <div
                          key={index}
                          style={{
                            marginBottom: '10px',
                            padding: '10px',
                            border: '1px solid #e5e7eb',
                            borderRadius: '8px',
                            background: '#fff'
                          }}
                        >
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
                            <input
                              type="text"
                              className="form-input"
                              value={line.service_name}
                              onChange={(e) => updateFinancialLine('mldsFinancialService', index, 'name', e.target.value)}
                              placeholder="Nom du prestataire / service"
                              style={{ minWidth: '160px', flex: '2 1 160px' }}
                            />
                            <input
                              type="number"
                              className="form-input"
                              value={line.hours}
                              onChange={(e) => updateFinancialLine('mldsFinancialService', index, 'hours', e.target.value)}
                              placeholder="Heures (h)"
                              min="0"
                              step="0.01"
                              style={{ width: '110px' }}
                            />
                            <input
                              type="number"
                              className="form-input"
                              value={line.price}
                              onChange={(e) => updateFinancialLine('mldsFinancialService', index, 'price', e.target.value)}
                              placeholder="Montant (€)"
                              min="0"
                              step="0.01"
                              style={{ width: '120px' }}
                            />
                            <span
                              style={{
                                fontSize: '0.8125rem',
                                color: '#374151',
                                fontWeight: 600,
                                minWidth: '88px'
                              }}
                              title="Taux horaire = montant ÷ heures"
                            >
                              {computedServiceHourlyRate(line)}
                            </span>
                            {(() => {
                              const qCount = countServiceQuoteFiles(mldsServiceQuoteFiles);
                              const hasThis = mldsServiceQuoteFiles[index] != null;
                              const canPickMore = qCount < MAX_SERVICE_QUOTE_FILES || hasThis;
                              return canPickMore ? (
                            <label
                              className="btn btn-outline btn-sm"
                              style={{ cursor: 'pointer', marginBottom: 0 }}
                            >
                              <i className="fas fa-paperclip" style={{ marginRight: '6px' }} aria-hidden />
                              Joindre un devis
                              <input
                                type="file"
                                style={{ display: 'none' }}
                                accept=".pdf,.doc,.docx,.xls,.xlsx,image/*"
                                onChange={(e) => {
                                  const f = e.target.files?.[0];
                                  if (!f) return;
                                  const check = validateServiceQuoteSelection(f, mldsServiceQuoteFiles, index);
                                  if (!check.ok) {
                                    showError(check.message);
                                    e.target.value = '';
                                    return;
                                  }
                                  setMldsServiceQuoteFiles(prev => {
                                    const next = [...prev];
                                    while (next.length <= index) next.push(null);
                                    next[index] = f;
                                    return next;
                                  });
                                  e.target.value = '';
                                }}
                              />
                            </label>
                              ) : (
                                <span style={{ fontSize: '0.75rem', color: '#9ca3af' }} title={`Maximum ${MAX_SERVICE_QUOTE_FILES} devis`}>
                                  Quota atteint ({MAX_SERVICE_QUOTE_FILES}/{MAX_SERVICE_QUOTE_FILES})
                                </span>
                              );
                            })()}
                            {mldsServiceQuoteFiles[index] && (
                              <span style={{ fontSize: '0.75rem', color: '#059669', maxWidth: '160px', display: 'inline-flex', alignItems: 'center', gap: '6px' }} className="truncate">
                                <span className="truncate" title={mldsServiceQuoteFiles[index]!.name}>{mldsServiceQuoteFiles[index]!.name}</span>
                                <button
                                  type="button"
                                  className="btn btn-outline btn-sm"
                                  style={{ padding: '2px 6px', fontSize: '0.7rem', flexShrink: 0 }}
                                  onClick={() => {
                                    setMldsServiceQuoteFiles(prev => {
                                      const next = [...prev];
                                      while (next.length <= index) next.push(null);
                                      next[index] = null;
                                      return next;
                                    });
                                  }}
                                >
                                  Retirer
                                </button>
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={() => removeFinancialLine('mldsFinancialService', index)}
                              className="btn btn-outline btn-sm"
                              style={{ padding: '8px 12px', color: '#dc2626', marginLeft: 'auto' }}
                            >
                              <i className="fas fa-trash"></i>
                            </button>
                          </div>
                          <input
                            type="text"
                            className="form-input"
                            value={line.comment}
                            onChange={(e) => updateFinancialLine('mldsFinancialService', index, 'comment', e.target.value)}
                            placeholder="Commentaire (optionnel)"
                            style={{ width: '100%', marginTop: '8px' }}
                          />
                        </div>
                      ))
                    )}
                  </div>
                </div>
                <div style={{
                  marginTop: '12px',
                  padding: '10px',
                  background: '#e0f2fe',
                  borderRadius: '6px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <span style={{ fontWeight: 600, color: '#0369a1' }}>Total des crédits :</span>
                  <span style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0369a1' }}>
                    {(
                      calculateHvLinesTotal(
                        formData.mldsFinancialHvLines,
                        Number.parseFloat(formData.mldsFinancialRate) || HV_DEFAULT_RATE
                      ) +
                      calculateFinancialLinesTotal(formData.mldsFinancialTransport) +
                      calculateFinancialLinesTotal(formData.mldsFinancialOperating) +
                      calculateFinancialLinesTotal(formData.mldsFinancialService)
                    ).toFixed(2)} €
                  </span>
                </div>
              </div>

              <div style={{
                marginTop: '12px',
                padding: '16px',
                background: '#f9fafb',
                borderRadius: '8px',
                border: '1px solid #e5e7eb'
              }}>
                <h4 style={{
                  fontSize: '0.95rem',
                  fontWeight: 600,
                  color: '#374151',
                  marginBottom: '8px',
                  marginTop: '0'
                }}>
                  Autres financements
                </h4>
                <p style={{ fontSize: '0.8rem', color: '#6b7280', margin: '0 0 12px 0' }}>
                  Non inclus dans le total Crédits (HV, transport, frais de fonctionnement, prestataires). Ils s&apos;ajoutent au total général.
                </p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#374151' }}>Lignes</span>
                  <button
                    type="button"
                    onClick={() => addFinancialLine('mldsFinancialAutres')}
                    className="btn btn-outline btn-sm"
                    style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                  >
                    <i className="fas fa-plus" style={{ marginRight: '4px' }}></i>
                    Ajouter une ligne
                  </button>
                </div>
                {formData.mldsFinancialAutres.length === 0 ? (
                  <div style={{ padding: '12px', textAlign: 'center', color: '#6b7280', fontSize: '0.875rem', backgroundColor: '#fff', borderRadius: '6px', border: '1px dashed #d1d5db' }}>
                    Aucune ligne. Utilisez « Ajouter une ligne » pour d&apos;autres sources de financement.
                  </div>
                ) : (
                  formData.mldsFinancialAutres.map((line, index) => (
                    <div key={index} style={{ display: 'flex', gap: '8px', marginBottom: '8px', alignItems: 'center' }}>
                      <input
                        type="text"
                        className="form-input"
                        value={line.autres_name}
                        onChange={(e) => updateFinancialLine('mldsFinancialAutres', index, 'name', e.target.value)}
                        placeholder="Libellé"
                        style={{ flex: 2 }}
                      />
                      <input
                        type="number"
                        className="form-input"
                        value={line.price}
                        onChange={(e) => updateFinancialLine('mldsFinancialAutres', index, 'price', e.target.value)}
                        placeholder="Montant (€)"
                        min="0"
                        step="0.01"
                        style={{ flex: 1 }}
                      />
                      <button
                        type="button"
                        onClick={() => removeFinancialLine('mldsFinancialAutres', index)}
                        className="btn btn-outline btn-sm"
                        style={{ padding: '8px 12px', color: '#dc2626' }}
                      >
                        <i className="fas fa-trash"></i>
                      </button>
                    </div>
                  ))
                )}
                <div style={{
                  marginTop: '12px',
                  padding: '10px',
                  background: '#fef3c7',
                  borderRadius: '6px',
                  border: '1px solid #fcd34d',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <span style={{ fontWeight: 600, color: '#92400e' }}>Total autres financements :</span>
                  <span style={{ fontSize: '1.1rem', fontWeight: 700, color: '#92400e' }}>
                    {calculateAutresFinancementTotal(formData.mldsFinancialAutres).toFixed(2)} €
                  </span>
                </div>
              </div>

              <div style={{
                marginTop: '12px',
                padding: '12px',
                background: 'linear-gradient(135deg, #dbeafe 0%, #e0f2fe 100%)',
                borderRadius: '8px',
                border: '2px solid #0369a1',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <span style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0c4a6e' }}>
                  Total général :
                </span>
                <span style={{ fontSize: '1.3rem', fontWeight: 700, color: '#0c4a6e' }}>
                  {(() => {
                    const totalCredits =
                      calculateHvLinesTotal(
                        formData.mldsFinancialHvLines,
                        Number.parseFloat(formData.mldsFinancialRate) || HV_DEFAULT_RATE
                      ) +
                      calculateFinancialLinesTotal(formData.mldsFinancialTransport) +
                      calculateFinancialLinesTotal(formData.mldsFinancialOperating) +
                      calculateFinancialLinesTotal(formData.mldsFinancialService);
                    const totalAutres = calculateAutresFinancementTotal(formData.mldsFinancialAutres);
                    return (totalCredits + totalAutres).toFixed(2);
                  })()} €
                </span>
              </div>
            </div>

          </div>

          {/* Popup sélection co-responsables de partenariat */}
          {partnershipCoResponsiblesPopup && (
            <div
              className="modal-overlay"
              style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0,0,0,0.5)',
                zIndex: 10000,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              onClick={() => setPartnershipCoResponsiblesPopup(null)}
              role="presentation"
            >
              <div
                className="modal-content"
                style={{
                  background: 'white',
                  borderRadius: '8px',
                  maxWidth: '500px',
                  width: '90%',
                  maxHeight: '80vh',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column'
                }}
                onClick={e => e.stopPropagation()}
              >
                <div style={{ padding: '16px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '4px' }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.1rem', marginBottom: '4px' }}>Sélectionner les co-responsables</h3>
                    <p style={{ margin: 0, fontSize: '0.875rem', color: '#6b7280' }}>{partnershipCoResponsiblesPopup.partnershipName}</p>
                  </div>
                  <button type="button" className="p-1 !px-2.5 rounded-full border border-gray-100" onClick={() => setPartnershipCoResponsiblesPopup(null)}>
                    <i className="fas fa-times" />
                  </button>
                </div>
                <div style={{ padding: '16px', overflowY: 'auto', flex: 1 }}>
                  <div className="search-input-container" style={{ marginBottom: '16px' }}>
                    <i className="fas fa-search search-icon"></i>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Rechercher un co-responsable..."
                      value={partnershipCoResponsiblesSearchTerm}
                      onChange={(e) => setPartnershipCoResponsiblesSearchTerm(e.target.value)}
                    />
                  </div>
                  {(() => {
                    const contactUsers = getFilteredPartnershipCoResponsibles(
                      partnershipCoResponsiblesPopup.contactUsers,
                      partnershipCoResponsiblesSearchTerm
                    );
                    const selectedIds = partnershipCoResponsibles[partnershipCoResponsiblesPopup.partnershipId] || [];

                    if (contactUsers.length === 0) {
                      return (
                        <div className="no-members-message" style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>
                          <i className="fas fa-users" style={{ fontSize: '2rem', marginBottom: '0.5rem', display: 'block' }}></i>
                          <p>{partnershipCoResponsiblesSearchTerm ? 'Aucun contact trouvé' : 'Aucun contact disponible pour ce partenariat'}</p>
                        </div>
                      );
                    }

                    return (
                      <div className="selection-list">
                        {contactUsers.map((user: any) => {
                          const userId = user.id?.toString();
                          const isSelected = selectedIds.includes(userId);
                          const name = user.full_name || `${user.first_name || ''} ${user.last_name || ''}`.trim();
                          return (
                            <div
                              key={user.id}
                              className="selection-item"
                              onClick={() => togglePartnershipCoResponsible(partnershipCoResponsiblesPopup.partnershipId, userId)}
                              style={{
                                cursor: 'pointer',
                                ...(isSelected
                                  ? {
                                      backgroundColor: 'rgba(85, 112, 241, 0.1)',
                                      border: '1px solid #5570F1',
                                      borderRadius: '8px',
                                      boxShadow: '0 0 0 2px rgba(85, 112, 241, 0.15)'
                                    }
                                  : {})
                              }}
                            >
                              <AvatarImage
                                src={user.avatar_url || '/default-avatar.png'}
                                alt={name}
                                className="item-avatar"
                              />
                              <div className="item-info">
                                <div className="item-name">{name}</div>
                                <div className="item-role">{user.role_in_organization || user.role || ''}</div>
                                {user.email && (
                                  <div className="item-org" style={{ fontSize: '0.8rem', color: '#6b7280' }}>{user.email}</div>
                                )}
                                {user.organization && (
                                  <div className="item-org" style={{ fontSize: '0.8rem', color: '#6b7280' }}>Organisation : {user.organization}</div>
                                )}
                              </div>
                              {isSelected && (
                                <div style={{ flexShrink: 0, color: '#5570F1' }} title="Sélectionné">
                                  <i className="fas fa-check-circle" style={{ fontSize: '1.25rem' }} />
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
                <div style={{ padding: '16px', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() => setPartnershipCoResponsiblesPopup(null)}
                  >
                    Terminer
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Form Actions */}
          <div className="flex !flex-wrap gap-2 modal-actions">
            <button type="button" className="btn btn-outline" onClick={onClose} disabled={isSubmitting}>
              Annuler
            </button>
            <button
              type="button"
              className="btn btn-outline"
              onClick={handleSaveDraft}
              disabled={isSubmitting}
            >
              Sauvegarder en brouillon
            </button>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <i className="fas fa-spinner fa-spin" style={{ marginRight: '8px' }}></i>
                  Création en cours...
                </>
              ) : (
                <>
                  <i className="fas fa-plus" style={{ marginRight: '8px' }}></i>
                  {state.showingPageType === 'teacher' || state.user?.role === 'teacher'
                    ? 'Soumettre le projet MLDS'
                    : 'Créer le projet MLDS'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MLDSProjectModal;

