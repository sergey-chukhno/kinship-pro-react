import React, { useState, useEffect } from 'react';
import { Project } from '../../types';
import { useAppContext } from '../../context/AppContext';
import { getTags, getPartnerships, getOrganizationMembers, getTeacherMembers, createProject } from '../../api/Projects';
import {
  mapFrontendToBackend,
  base64ToFile,
  getContextFromPageType,
  getOrganizationId,
  getOrganizationType,
  validateImages
} from '../../utils/projectMapper';
import './Modal.css';
import AvatarImage from '../UI/AvatarImage';

interface ProjectModalProps {
  project?: Project | null;
  onClose: () => void;
  onSave: (projectData: Omit<Project, 'id'>) => void;
}

const ProjectModal: React.FC<ProjectModalProps> = ({ project, onClose, onSave }) => {
  const { state, addProject, setTags } = useAppContext();

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    startDate: '',
    endDate: '',
    organization: '',
    status: 'coming' as 'coming' | 'in_progress' | 'ended',
    visibility: 'public' as 'public' | 'private',
    pathway: '',
    tags: '',
    links: '',
    participants: [] as string[],
    image: '',
    // responsible: '', // Removed as per request
    coResponsibles: [] as string[],
    isPartnership: false, // New field
    partner: '',
    additionalImages: [] as string[]
  });

  const [imagePreview, setImagePreview] = useState<string>('');
  const [additionalImagePreviews, setAdditionalImagePreviews] = useState<string[]>([]);
  const [searchTerms, setSearchTerms] = useState({
    // responsible: '', // Removed
    coResponsibles: '',
    participants: '',
    partner: ''
  });
  const [showSuccess, setShowSuccess] = useState(false);
  const [successData, setSuccessData] = useState<{ title: string, image: string } | null>(null);

  // Loading states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingTags, setIsLoadingTags] = useState(false);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);
  const [isLoadingPartnerships, setIsLoadingPartnerships] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [availablePartnerships, setAvailablePartnerships] = useState<any[]>([]);
  
  // Teacher project context: 'independent' or 'school'
  const [teacherProjectContext, setTeacherProjectContext] = useState<'independent' | 'school'>('independent');
  const [selectedSchoolId, setSelectedSchoolId] = useState<number | undefined>(undefined);

  // Search functionality with exclusion of already selected members
  // Members are mutually exclusive: cannot be both co-responsible AND participant
  // Project creator (owner) is excluded from selection as they are automatically added
  const getFilteredMembers = (searchTerm: string) => {
    // Defensive check: ensure members is an array
    if (!members || !Array.isArray(members)) {
      console.warn('getFilteredMembers: members is not an array', members);
      return [];
    }
    
    // Get current user ID (project creator) - exclude from selection
    const currentUserId = state.user?.id?.toString();
    
    // Combine all selected member IDs (from both co-responsibles and participants)
    // Normalize to strings for consistent comparison
    const selectedMemberIds = [
      ...formData.coResponsibles.map(id => id.toString()),
      ...formData.participants.map(id => id.toString())
    ];
    
    // Filter out already selected members and project creator
    let availableMembers = members.filter((member: any) => {
      if (!member) return false;
      
      const memberIdStr = member.id?.toString();
      
      // Exclude project creator (owner is automatically added, not selectable)
      if (currentUserId && memberIdStr === currentUserId) {
        return false;
      }
      
      // Exclude members that are already selected (as co-responsible or participant)
      if (selectedMemberIds.includes(memberIdStr)) {
        return false;
      }
      
      return true;
    });
    
    // Apply search filter if search term provided
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

  const getFilteredPartners = (searchTerm: string) => {
    if (!availablePartnerships || !Array.isArray(availablePartnerships)) return [];
    if (!searchTerm.trim()) return availablePartnerships;
    const searchLower = searchTerm.toLowerCase();
    return availablePartnerships.filter(partnership =>
      partnership.name.toLowerCase().includes(searchLower)
    );
  };

  // Reset teacher context when modal opens/closes
  useEffect(() => {
    if (!project && state.showingPageType === 'teacher') {
      setTeacherProjectContext('independent');
      setSelectedSchoolId(undefined);
    }
  }, [project, state.showingPageType]);
  
  // If teacher selects 'school' but has no schools, automatically switch back to 'independent'
  useEffect(() => {
    if (state.showingPageType === 'teacher' && !project && teacherProjectContext === 'school') {
      const availableSchools = state.user.available_contexts?.schools || [];
      if (availableSchools.length === 0) {
        // No schools available, switch back to independent
        setTeacherProjectContext('independent');
        setSelectedSchoolId(undefined);
      }
    }
  }, [teacherProjectContext, state.user.available_contexts?.schools, state.showingPageType, project]);

  // Update organization field when teacher context changes
  useEffect(() => {
    if (state.showingPageType === 'teacher' && !project) {
      if (teacherProjectContext === 'independent') {
        // Independent teacher: "Prénom Nom - Enseignant"
        const independentTeacher = state.user.available_contexts?.independent_teacher as any;
        const firstName = state.user.name?.split(' ')[0] || independentTeacher?.organization_name?.split(' ')[0] || '';
        const lastName = state.user.name?.split(' ').slice(1).join(' ') || independentTeacher?.organization_name?.split(' ').slice(1).join(' ') || '';
        if (firstName || lastName) {
          setFormData(prev => ({ ...prev, organization: `${firstName} ${lastName} - Enseignant`.trim() }));
        } else {
          const defaultOrg = independentTeacher?.organization_name || '';
          setFormData(prev => ({ ...prev, organization: defaultOrg }));
        }
      } else if (teacherProjectContext === 'school' && selectedSchoolId) {
        // School: find school name by ID
        const selectedSchool = state.user.available_contexts?.schools?.find((s: any) => s.id === selectedSchoolId);
        if (selectedSchool) {
          setFormData(prev => ({ ...prev, organization: selectedSchool.name }));
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teacherProjectContext, selectedSchoolId, state.showingPageType, state.user.name, project]); // Utiliser state.user.name au lieu de state.user

  useEffect(() => {
    if (project) {
      setFormData({
        title: project.title,
        description: project.description,
        startDate: project.startDate,
        endDate: project.endDate,
        organization: project.organization,
        status: project.status,
        visibility: project.visibility || 'public',
        pathway: project.pathway || '',
        tags: project.tags.join(', '),
        links: project.links || '',
        participants: project.members,
        image: project.image || '',
        // responsible: '',
        coResponsibles: [],
        isPartnership: !!project.partner, // Infer from existing data
        partner: project.partner?.id || '',
        additionalImages: []
      });
      setImagePreview(project.image || '');
    } else {
      // Set default dates
      const today = new Date();
      const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, today.getDate());

      // Prefill organization based on context
      let defaultOrg = '';

      if (state.showingPageType === 'pro' && state.user.available_contexts?.companies && state.user.available_contexts.companies.length > 0) {
        defaultOrg = state.user.available_contexts.companies[0].name;
      } else if (state.showingPageType === 'edu' && state.user.available_contexts?.schools && state.user.available_contexts.schools.length > 0) {
        defaultOrg = state.user.available_contexts.schools[0].name;
      } else if (state.showingPageType === 'teacher') {
        // For teachers: default to independent teacher name format "Prénom Nom - Enseignant"
        const independentTeacher = state.user.available_contexts?.independent_teacher as any;
        const firstName = state.user.name?.split(' ')[0] || independentTeacher?.organization_name?.split(' ')[0] || '';
        const lastName = state.user.name?.split(' ').slice(1).join(' ') || independentTeacher?.organization_name?.split(' ').slice(1).join(' ') || '';
        if (firstName || lastName) {
          defaultOrg = `${firstName} ${lastName} - Enseignant`.trim();
        } else {
          // Fallback to independent_teacher organization_name if available
          defaultOrg = independentTeacher?.organization_name || '';
        }
      }

      setFormData(prev => ({
        ...prev,
        startDate: today.toISOString().split('T')[0],
        endDate: nextMonth.toISOString().split('T')[0],
        organization: defaultOrg
      }));
    }
  }, [project, state.showingPageType, state.user]);

  // Fetch tags when modal opens
  useEffect(() => {
    const fetchTags = async () => {
      if (state.tags.length === 0) {
        setIsLoadingTags(true);
        try {
          const tagsData = await getTags();
          // Ensure tagsData is an array before setting
          if (Array.isArray(tagsData)) {
            setTags(tagsData);
          } else {
            console.error('getTags returned non-array:', tagsData);
            setTags([]);
          }
        } catch (error) {
          console.error('Error fetching tags:', error);
          setTags([]); // Set empty array on error
        } finally {
          setIsLoadingTags(false);
        }
      }
    };

    fetchTags();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.tags.length]); // setTags est stable du contexte, pas besoin de le mettre en dépendance

  // Fetch members and partnerships when modal opens
  useEffect(() => {
    const fetchMembersAndPartnerships = async () => {
      // Utiliser le contexte sélectionné depuis localStorage (comme dans Dashboard et Projects)
      const savedContextId = localStorage.getItem('selectedContextId');
      const savedContextType = localStorage.getItem('selectedContextType') as 'school' | 'company' | 'teacher' | 'user' | null;
      
      let organizationId: number | undefined;
      let organizationType: 'school' | 'company' | undefined;
      
      // Si on a un contexte sauvegardé et que c'est une école ou une entreprise
      if (savedContextId && savedContextType && (savedContextType === 'school' || savedContextType === 'company')) {
        // Vérifier que l'utilisateur a toujours accès à ce contexte
        if (savedContextType === 'company') {
          const company = state.user.available_contexts?.companies?.find(
            (c: any) => c.id.toString() === savedContextId && (c.role === 'admin' || c.role === 'superadmin')
          );
          if (company) {
            organizationId = Number(savedContextId);
            organizationType = 'company';
          }
        } else if (savedContextType === 'school') {
          const school = state.user.available_contexts?.schools?.find(
            (s: any) => s.id.toString() === savedContextId && (s.role === 'admin' || s.role === 'superadmin')
          );
          if (school) {
            organizationId = Number(savedContextId);
            organizationType = 'school';
          }
        }
      }
      
      // Sinon, utiliser la logique par défaut
      if (!organizationId) {
        organizationId = getOrganizationId(state.user, state.showingPageType);
        organizationType = getOrganizationType(state.showingPageType);
      }

      console.log('Fetching members:', { organizationId, organizationType, showingPageType: state.showingPageType, teacherProjectContext });

      // Handle teacher context: fetch members based on selected context (independent vs school)
      if (state.showingPageType === 'teacher') {
        setIsLoadingMembers(true);
        try {
          let membersData: any[] = [];
          
          // For teachers, always use getTeacherMembers() which returns students from their classes
          // This works for both independent and school contexts since getTeacherMembers
          // returns all students from all classes the teacher manages (regardless of school)
          console.log('Fetching teacher class members');
          membersData = await getTeacherMembers({ per_page: 1000 });
          
          // If teacher selected "school" context, filter members to only show those from the selected school
          if (teacherProjectContext === 'school' && selectedSchoolId) {
            console.log('Filtering teacher members by school:', selectedSchoolId);
            // Filter members to only include those from classes belonging to the selected school
            // We need to check if the member's classes belong to the selected school
            // Since getTeacherMembers returns members from teacher's classes, we filter client-side
            // by checking if any of the member's classes belong to the selected school
            const filteredMembers = membersData.filter((member: any) => {
              // Check if member has classes in the selected school
              // The member object should have a 'classes' array from the API response
              if (member.classes && Array.isArray(member.classes)) {
                return member.classes.some((cls: any) => {
                  // Check both school_id directly and school.id
                  const classSchoolId = cls.school_id || cls.school?.id;
                  return classSchoolId === selectedSchoolId;
                });
              }
              // If no classes info, exclude the member (should not happen, but safer)
              return false;
            });
            membersData = filteredMembers;
            console.log(`Filtered to ${membersData.length} members from school ${selectedSchoolId}`);
          }
          
          console.log('Members fetched:', membersData);
          
          // Ensure membersData is an array
          if (Array.isArray(membersData)) {
            setMembers(membersData);
            console.log(`Loaded ${membersData.length} members`);
          } else {
            console.error('Members data is not an array:', membersData);
            setMembers([]);
          }
        } catch (error: any) {
          console.error('Error fetching members:', error);
          console.error('Error details:', error.response?.data || error.message);
          setMembers([]); // Set empty array on error
        } finally {
          setIsLoadingMembers(false);
        }

        // Fetch partnerships if partnership checkbox is checked (only for school context)
        if (formData.isPartnership && teacherProjectContext === 'school' && selectedSchoolId) {
          setIsLoadingPartnerships(true);
          try {
            const partnershipsResponse = await getPartnerships(selectedSchoolId, 'school');
            setAvailablePartnerships(partnershipsResponse.data || []);
          } catch (error) {
            console.error('Error fetching partnerships:', error);
          } finally {
            setIsLoadingPartnerships(false);
          }
        }
      } else if (organizationId && organizationType) {
        // For non-teacher contexts (school, company), use existing logic
        // Fetch members
        setIsLoadingMembers(true);
        try {
          const membersData = await getOrganizationMembers(organizationId, organizationType);
          console.log('Members fetched:', membersData);
          
          // Ensure membersData is an array
          if (Array.isArray(membersData)) {
            setMembers(membersData);
            console.log(`Loaded ${membersData.length} members`);
          } else {
            console.error('Members data is not an array:', membersData);
            setMembers([]);
          }
        } catch (error: any) {
          console.error('Error fetching members:', error);
          console.error('Error details:', error.response?.data || error.message);
          setMembers([]); // Set empty array on error
        } finally {
          setIsLoadingMembers(false);
        }

        // Fetch partnerships if partnership checkbox is checked
        if (formData.isPartnership) {
          setIsLoadingPartnerships(true);
          try {
            const partnershipsResponse = await getPartnerships(organizationId, organizationType);
            setAvailablePartnerships(partnershipsResponse.data || []);
          } catch (error) {
            console.error('Error fetching partnerships:', error);
          } finally {
            setIsLoadingPartnerships(false);
          }
        }
      } else {
        console.warn('Cannot fetch members: missing organizationId or organizationType', {
          organizationId,
          organizationType,
          showingPageType: state.showingPageType,
          available_contexts: state.user.available_contexts
        });
      }
    };

    fetchMembersAndPartnerships();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.showingPageType, state.user.id, formData.isPartnership, teacherProjectContext, selectedSchoolId]); // Add teacherProjectContext and selectedSchoolId to dependencies


  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    // Handle checkbox for isPartnership
    if (name === 'isPartnership') {
      setFormData(prev => ({
        ...prev,
        isPartnership: (e.target as HTMLInputElement).checked,
        partner: (e.target as HTMLInputElement).checked ? prev.partner : '' // Clear partner if unchecked
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setImagePreview(result);
        setFormData(prev => ({
          ...prev,
          image: result
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    // Validation: Pathway is required only if visible (not 'pro')
    const isPathwayRequired = state.showingPageType !== 'pro';
    const isPathwayValid = !isPathwayRequired || formData.pathway;

    // For teachers, organization is always required (but pre-filled)
    // For others, organization is required
    const isOrganizationRequired = true; // Always required, but pre-filled for teachers

    if (!formData.title || !formData.startDate || !formData.endDate || 
        (isOrganizationRequired && !formData.organization) || 
        !formData.status || !isPathwayValid) {
      setSubmitError('Veuillez remplir tous les champs obligatoires');
      return;
    }

    // Additional validation for teachers: if school context chosen, school must be selected
    if (state.showingPageType === 'teacher' && teacherProjectContext === 'school') {
      const availableSchools = state.user.available_contexts?.schools || [];
      if (availableSchools.length === 0) {
        setSubmitError('Vous ne pouvez pas créer un projet pour une école car vous n\'avez aucune école avec un statut confirmé. Veuillez sélectionner "Enseignant Indépendant".');
        return;
      }
      if (!selectedSchoolId) {
        setSubmitError('Veuillez sélectionner une école');
        return;
      }
    }

    setIsSubmitting(true);

    try {
      // Get context and organization ID
      const context = getContextFromPageType(state.showingPageType);
      // For teachers, use selectedSchoolId if school context chosen, otherwise undefined
      const organizationId = state.showingPageType === 'teacher' 
        ? getOrganizationId(state.user, state.showingPageType, teacherProjectContext === 'school' ? selectedSchoolId : undefined)
        : getOrganizationId(state.user, state.showingPageType);

      // Map frontend data to backend format
      const payload = mapFrontendToBackend(
        formData,
        context,
        organizationId,
        state.tags,
        state.user.id
      );

      // Convert Base64 images to File objects
      let mainImageFile: File | null = null;
      const additionalImageFiles: File[] = [];

      if (imagePreview) {
        mainImageFile = base64ToFile(imagePreview, 'main-image.jpg');
      }

      additionalImagePreviews.forEach((preview, index) => {
        if (preview) {
          const file = base64ToFile(preview, `additional-image-${index + 1}.jpg`);
          if (file) {
            additionalImageFiles.push(file);
          }
        }
      });

      // Validate images
      const imageValidation = validateImages(mainImageFile, additionalImageFiles);
      if (!imageValidation.valid) {
        setSubmitError(imageValidation.errors.join(', '));
        setIsSubmitting(false);
        return;
      }

      // Call backend API
      const createdProject = await createProject(payload, mainImageFile, additionalImageFiles);

      console.log('Project created successfully:', createdProject);

      // Transform backend response to frontend format and add to local state
      const newProject = {
        id: createdProject.id.toString(),
        title: createdProject.title,
        description: createdProject.description,
        status: createdProject.status as 'coming' | 'in_progress' | 'ended',
        visibility: payload.project.private ? 'private' : 'public' as 'public' | 'private',
        pathway: formData.pathway || 'citoyen',
        organization: formData.organization,
        owner: state.user.name,
        participants: createdProject.members_count,
        badges: 0,
        startDate: formData.startDate,
        endDate: formData.endDate,
        image: imagePreview || 'https://images.unsplash.com/photo-1551434678-e076c223a692?w=120&h=120&fit=crop&crop=center',
        additionalPhotos: additionalImagePreviews,
        tags: formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag),
        links: formData.links,
        progress: 0,
        members: formData.participants,
        events: [],
        badges_list: [],
        responsible: {
          id: state.user.id,
          name: state.user.name,
          avatar: state.user.avatar,
          profession: state.user.role,
          organization: formData.organization,
          email: state.user.email
        },
        coResponsibles: [],
        partner: null
      };

      // Add project to local state
      addProject(newProject);

      // Call onSave to notify parent component (will trigger refresh)
      // onSave expects Omit<Project, 'id'>, so we extract id from newProject
      const { id, ...projectDataWithoutId } = newProject;
      onSave(projectDataWithoutId);

      // Show success message
      setSuccessData({
        title: formData.title,
        image: imagePreview || 'https://images.unsplash.com/photo-1551434678-e076c223a692?w=120&h=120&fit=crop&crop=center'
      });
      setShowSuccess(true);

    } catch (error: any) {
      console.error('Error creating project:', error);

      // Handle backend errors
      if (error.response?.data?.details) {
        setSubmitError(error.response.data.details.join(', '));
      } else if (error.response?.data?.message) {
        setSubmitError(error.response.data.message);
      } else {
        setSubmitError('Une erreur est survenue lors de la création du projet. Veuillez réessayer.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAdditionalImageChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        const newPreviews = [...additionalImagePreviews];
        newPreviews[index] = result;
        setAdditionalImagePreviews(newPreviews);

        const newImages = [...formData.additionalImages];
        newImages[index] = result;
        setFormData(prev => ({
          ...prev,
          additionalImages: newImages
        }));
      };
      reader.readAsDataURL(file);
    }
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
    } else if (field === 'participants') {
      const newParticipants = formData.participants.includes(memberId)
        ? formData.participants.filter(id => id !== memberId)
        : [...formData.participants, memberId];
      setFormData(prev => ({ ...prev, participants: newParticipants }));
    }
  };

  const handlePartnerSelect = (partnerId: string) => {
    setFormData(prev => ({ ...prev, partner: partnerId }));
  };

  const getSelectedMember = (memberId: string) => {
    return members.find((m: any) => m.id === memberId || m.id === parseInt(memberId));
  };

  const getSelectedPartner = (partnerId: string) => {
    return availablePartnerships.find((p: any) => p.id === partnerId || p.id === parseInt(partnerId));
  };

  // Helper to determine if organization should be read-only
  const isOrgReadOnly = state.showingPageType === 'pro' || state.showingPageType === 'edu' || state.showingPageType === 'teacher';

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content project-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{project ? 'Modifier le projet' : 'Créer un nouveau projet'}</h2>
          <button className="modal-close" onClick={onClose}>
            <i className="fas fa-times"></i>
          </button>
        </div>

        <div className="modal-body">
          <form id="projectForm" onSubmit={handleSubmit} className="project-form">
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

            {/* Basic Project Info */}
            <div className="form-group">
              <label htmlFor="projectTitle">Titre du projet *</label>
              <input
                type="text"
                id="projectTitle"
                name="title"
                required
                placeholder="Ex: Atelier développement durable"
                value={formData.title}
                onChange={handleInputChange}
                className="form-input"
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="projectStartDate">Date estimée de début *</label>
                <input
                  type="date"
                  id="projectStartDate"
                  name="startDate"
                  required
                  value={formData.startDate}
                  onChange={handleInputChange}
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label htmlFor="projectEndDate">Date estimée de fin *</label>
                <input
                  type="date"
                  id="projectEndDate"
                  name="endDate"
                  required
                  value={formData.endDate}
                  onChange={handleInputChange}
                  className="form-input"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                {/* Teacher context selector (only for teachers creating new projects) */}
                {state.showingPageType === 'teacher' && !project && (
                  <div style={{ marginBottom: '12px' }}>
                    <label htmlFor="teacherProjectContext">Créer le projet en tant que *</label>
                    {(() => {
                      // Check if teacher has any confirmed school memberships
                      const availableSchools = state.user.available_contexts?.schools || [];
                      const hasSchools = availableSchools.length > 0;
                      
                      return (
                        <>
                          <select
                            id="teacherProjectContext"
                            value={teacherProjectContext}
                            onChange={(e) => {
                              const newContext = e.target.value as 'independent' | 'school';
                              setTeacherProjectContext(newContext);
                              if (newContext === 'independent') {
                                setSelectedSchoolId(undefined);
                              } else if (newContext === 'school' && hasSchools) {
                                // Auto-select first school if available (sorted alphabetically)
                                const sortedSchools = [...availableSchools].sort((a: any, b: any) => 
                                  (a.name || '').localeCompare(b.name || '')
                                );
                                setSelectedSchoolId(sortedSchools[0]?.id);
                              }
                            }}
                            className="form-select"
                            required
                          >
                            <option value="independent">Enseignant Indépendant</option>
                            <option value="school" disabled={!hasSchools}>
                              École{!hasSchools ? ' (Aucune école disponible)' : ''}
                            </option>
                          </select>
                          {!hasSchools && teacherProjectContext === 'school' && (
                            <div style={{ 
                              marginTop: '8px', 
                              padding: '8px', 
                              backgroundColor: '#fff3cd', 
                              border: '1px solid #ffc107',
                              borderRadius: '4px',
                              fontSize: '14px',
                              color: '#856404'
                            }}>
                              <strong>⚠️</strong> Vous n'avez aucune école avec un statut confirmé. 
                              Veuillez sélectionner "Enseignant Indépendant" pour créer votre projet.
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>
                )}
                
                {/* School selector (only shown when teacher chooses 'school' context and has schools) */}
                {state.showingPageType === 'teacher' && !project && teacherProjectContext === 'school' && (() => {
                  const availableSchools = state.user.available_contexts?.schools || [];
                  const hasSchools = availableSchools.length > 0;
                  
                  if (!hasSchools) {
                    // If no schools available, don't show the selector
                    return null;
                  }
                  
                  return (
                    <div style={{ marginBottom: '12px' }}>
                      <label htmlFor="selectedSchool">Sélectionner une école *</label>
                      <select
                        id="selectedSchool"
                        value={selectedSchoolId || ''}
                        onChange={(e) => {
                          const schoolId = e.target.value ? parseInt(e.target.value) : undefined;
                          setSelectedSchoolId(schoolId);
                        }}
                        className="form-select"
                        required={teacherProjectContext === 'school'}
                      >
                        <option value="">Sélectionner une école</option>
                        {(() => {
                          // Get all confirmed schools, sorted alphabetically
                          const sortedSchools = [...availableSchools].sort((a: any, b: any) => 
                            (a.name || '').localeCompare(b.name || '')
                          );
                          return sortedSchools.map((school: any) => (
                            <option key={school.id} value={school.id}>
                              {school.name}
                            </option>
                          ));
                        })()}
                      </select>
                    </div>
                  );
                })()}

                <label htmlFor="projectOrganization">Organisation *</label>
                {isOrgReadOnly || (state.showingPageType === 'teacher' && !project) ? (
                  <input
                    type="text"
                    id="projectOrganization"
                    name="organization"
                    value={formData.organization}
                    readOnly
                    className="form-input"
                    style={{ backgroundColor: '#f3f4f6', cursor: 'not-allowed' }}
                  />
                ) : (
                  <select
                    id="projectOrganization"
                    name="organization"
                    required
                    value={formData.organization}
                    onChange={handleInputChange}
                    className="form-select"
                  >
                    <option value="">Sélectionner une organisation</option>
                    {/* Assuming user has available_contexts.companies or similar to map here for personal user */}
                    {state.user.available_contexts?.companies?.map((c: any) => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                    ))}
                    {state.user.available_contexts?.schools?.map((s: any) => (
                      <option key={s.id} value={s.name}>{s.name}</option>
                    ))}
                  </select>
                )}
              </div>
              <div className="form-group">
                <label htmlFor="projectStatus">Statut *</label>
                <select
                  id="projectStatus"
                  name="status"
                  required
                  value={formData.status}
                  onChange={handleInputChange}
                  className="form-select"
                >
                  <option value="">Sélectionner un statut</option>
                  <option value="coming">À venir</option>
                  <option value="in_progress">En cours</option>
                  <option value="ended">Terminé</option>
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="projectVisibility">Visibilité *</label>
                <select
                  id="projectVisibility"
                  name="visibility"
                  required
                  value={formData.visibility}
                  onChange={handleInputChange}
                  className="form-select"
                >
                  <option value="public">Projet public</option>
                  <option value="private">Projet privé</option>
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="projectTags">Tags</label>
                <input
                  type="text"
                  id="projectTags"
                  name="tags"
                  placeholder="Ex: Fabrication, Créativité, Numérique"
                  value={formData.tags}
                  onChange={handleInputChange}
                  className="form-input"
                />
              </div>
            </div>

            {state.showingPageType !== 'pro' && (
              <div className="form-group">
                <label htmlFor="projectPathway">Parcours *</label>
                <select
                  id="projectPathway"
                  name="pathway"
                  required
                  value={formData.pathway}
                  onChange={handleInputChange}
                  className="form-select"
                >
                  <option value="">Sélectionner un parcours</option>
                  <option value="citoyen">Citoyen</option>
                  <option value="creativite">Créativité</option>
                  <option value="fabrication">Fabrication</option>
                  <option value="psychologie">Psychologie</option>
                  <option value="innovation">Innovation</option>
                  <option value="education">Éducation</option>
                  <option value="technologie">Technologie</option>
                  <option value="sante">Santé</option>
                  <option value="environnement">Environnement</option>
                </select>
              </div>
            )}

            <div className="form-group">
              <label htmlFor="projectLinks">Liens utiles</label>
              <input
                type="url"
                id="projectLinks"
                name="links"
                placeholder="https://exemple.com"
                value={formData.links}
                onChange={handleInputChange}
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label htmlFor="projectDescription">Description</label>
              <textarea
                id="projectDescription"
                name="description"
                rows={4}
                placeholder="Description du projet..."
                value={formData.description}
                onChange={handleInputChange}
                className="form-textarea"
              />
            </div>

            {/* Partnership Section */}
            <div className="form-group">
              <div className="checkbox-group">
                <input
                  type="checkbox"
                  id="isPartnership"
                  name="isPartnership"
                  checked={formData.isPartnership}
                  onChange={handleInputChange}
                />
                <label htmlFor="isPartnership">En partenariat</label>
              </div>
            </div>

            {/* Partenaire - Only visible if En partenariat is checked */}
            {formData.isPartnership && (
              <div className="form-group">
                <label htmlFor="projectPartner">Partenaire</label>
                <div className="compact-selection">
                  <div className="search-input-container">
                    <i className="fas fa-search search-icon"></i>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Rechercher un partenaire..."
                      value={searchTerms.partner}
                      onChange={(e) => handleSearchChange('partner', e.target.value)}
                    />
                  </div>
                  {formData.partner && (
                    <div className="selected-item">
                      {(() => {
                        const selected = getSelectedPartner(formData.partner);
                        return selected ? (
                          <div className="selected-member">
                            <img src={selected.logo} alt={selected.name} className="selected-avatar" />
                            <div className="selected-info">
                              <div className="selected-name">{selected.name}</div>
                              <div className="selected-role">{selected.type}</div>
                            </div>
                            <button
                              type="button"
                              className="remove-selection"
                              onClick={() => setFormData(prev => ({ ...prev, partner: '' }))}
                            >
                              <i className="fas fa-times"></i>
                            </button>
                          </div>
                        ) : null;
                      })()}
                    </div>
                  )}
                  {!formData.partner && (
                    <div className="selection-list">
                      {getFilteredPartners(searchTerms.partner).map((partner) => (
                        <div
                          key={partner.id}
                          className="selection-item"
                          onClick={() => handlePartnerSelect(partner.id)}
                        >
                          <img src={partner.logo} alt={partner.name} className="item-avatar" />
                          <div className="item-info">
                            <div className="item-name">{partner.name}</div>
                            <div className="item-role">{partner.type}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Co-responsables */}
            <div className="form-group">
              <label htmlFor="projectCoResponsibles">Co-responsable(s)</label>
              <div className="compact-selection">
                <div className="search-input-container">
                  <i className="fas fa-search search-icon"></i>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Rechercher des co-responsables..."
                    value={searchTerms.coResponsibles}
                    onChange={(e) => handleSearchChange('coResponsibles', e.target.value)}
                    disabled={isLoadingMembers}
                  />
                </div>
                
                {isLoadingMembers ? (
                  <div className="loading-members" style={{ padding: '1rem', textAlign: 'center', color: '#6b7280' }}>
                    <i className="fas fa-spinner fa-spin" style={{ marginRight: '0.5rem' }}></i>
                    <span>Chargement des membres...</span>
                  </div>
                ) : (
                  <>
                    {formData.coResponsibles.length > 0 && (
                      <div className="selected-items">
                        {formData.coResponsibles.map((memberId) => {
                          const member = getSelectedMember(memberId);
                          return member ? (
                            <div key={memberId} className="selected-member">
                              <AvatarImage src={member.avatar_url || '/default-avatar.png'} alt={member.full_name || `${member.first_name} ${member.last_name}`} className="selected-avatar" />
                              <div className="selected-info">
                                <div className="selected-name">{member.full_name || `${member.first_name} ${member.last_name}`}</div>
                                <div className="selected-role">{member.role}</div>
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
                      {getFilteredMembers(searchTerms.coResponsibles).length === 0 ? (
                        <div className="no-members-message" style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>
                          <i className="fas fa-users" style={{ fontSize: '2rem', marginBottom: '0.5rem', display: 'block' }}></i>
                          <p>Aucun membre disponible</p>
                        </div>
                      ) : (
                        getFilteredMembers(searchTerms.coResponsibles).map((member: any) => (
                          <div
                            key={member.id}
                            className="selection-item"
                            onClick={() => handleMemberSelect('coResponsibles', member.id)}
                          >
                            <AvatarImage src={member.avatar_url || '/default-avatar.png'} alt={member.full_name || `${member.first_name} ${member.last_name}`} className="item-avatar" />
                            <div className="item-info">
                              <div className="item-name">{member.full_name || `${member.first_name} ${member.last_name}`}</div>
                              <div className="item-role">{member.role}</div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Participants */}
            <div className="form-group">
              <label htmlFor="projectParticipants">Participants</label>
              <div className="compact-selection">
                <div className="search-input-container">
                  <i className="fas fa-search search-icon"></i>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Rechercher des participants..."
                    value={searchTerms.participants}
                    onChange={(e) => handleSearchChange('participants', e.target.value)}
                    disabled={isLoadingMembers}
                  />
                </div>
                
                {isLoadingMembers ? (
                  <div className="loading-members" style={{ padding: '1rem', textAlign: 'center', color: '#6b7280' }}>
                    <i className="fas fa-spinner fa-spin" style={{ marginRight: '0.5rem' }}></i>
                    <span>Chargement des membres...</span>
                  </div>
                ) : (
                  <>
                    {formData.participants.length > 0 && (
                      <div className="selected-items">
                        {formData.participants.map((memberId) => {
                          const member = getSelectedMember(memberId);
                          return member ? (
                            <div key={memberId} className="selected-member">
                              <AvatarImage src={member.avatar_url || '/default-avatar.png'} alt={member.full_name || `${member.first_name} ${member.last_name}`} className="selected-avatar" />
                              <div className="selected-info">
                                <div className="selected-name">{member.full_name || `${member.first_name} ${member.last_name}`}</div>
                                <div className="selected-role">{member.role}</div>
                              </div>
                              <button
                                type="button"
                                className="remove-selection"
                                onClick={() => handleMemberSelect('participants', memberId)}
                              >
                                <i className="fas fa-times"></i>
                              </button>
                            </div>
                          ) : null;
                        })}
                      </div>
                    )}
                    <div className="selection-list">
                      {getFilteredMembers(searchTerms.participants).length === 0 ? (
                        <div className="no-members-message" style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>
                          <i className="fas fa-users" style={{ fontSize: '2rem', marginBottom: '0.5rem', display: 'block' }}></i>
                          <p>Aucun membre disponible</p>
                        </div>
                      ) : (
                        getFilteredMembers(searchTerms.participants).map((member: any) => (
                          <div
                            key={member.id}
                            className="selection-item"
                            onClick={() => handleMemberSelect('participants', member.id)}
                          >
                            <AvatarImage src={member.avatar_url || '/default-avatar.png'} alt={member.full_name || `${member.first_name} ${member.last_name}`} className="item-avatar" />
                            <div className="item-info">
                              <div className="item-name">{member.full_name || `${member.first_name} ${member.last_name}`}</div>
                              <div className="item-role">{member.role}</div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Photos supplémentaires */}
            <div className="form-group">
              <label>Photos supplémentaires (taille max 1mo)</label>
              <div className="additional-images-grid">
                {[0, 1, 2, 3].map((index) => (
                  <div key={index} className="additional-image-upload">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleAdditionalImageChange(e, index)}
                      style={{ display: 'none' }}
                      id={`additionalImage${index}`}
                    />
                    <label htmlFor={`additionalImage${index}`} className="additional-image-label">
                      {additionalImagePreviews[index] ? (
                        <img src={additionalImagePreviews[index]} alt={`Additional ${index + 1}`} className="additional-image-preview" />
                      ) : (
                        <div className="additional-image-placeholder">
                          <i className="fas fa-plus"></i>
                          <span>Ajouter une photo</span>
                        </div>
                      )}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </form>
        </div>

        {/* Error Message */}
        {submitError && (
          <div className="modal-error" style={{ padding: '1rem', backgroundColor: '#fee', color: '#c00', borderRadius: '4px', margin: '1rem' }}>
            {submitError}
          </div>
        )}

        <div className="modal-footer">
          <button type="button" className="btn btn-outline" onClick={onClose} disabled={isSubmitting}>Annuler</button>
          <button type="submit" form="projectForm" className="btn btn-primary" disabled={isSubmitting}>
            {isSubmitting ? 'Création en cours...' : (project ? 'Modifier le projet' : 'Créer le projet')}
          </button>
        </div>
      </div>

      {/* Success Message */}
      {showSuccess && successData && (
        <div className="project-success-overlay" onClick={(e) => e.stopPropagation()}>
          <div className="project-success-modal" onClick={(e) => e.stopPropagation()}>
            <div className="project-success-content">
              <div className="project-success-icon">
                <i className="fas fa-check-circle"></i>
              </div>
              <div className="project-success-image">
                <img src={successData.image} alt={successData.title} />
              </div>
              <h3>Projet créé avec succès !</h3>
              <p>Le projet <strong>{successData.title}</strong> a été créé avec succès.</p>
              <button
                className="btn btn-primary"
                onClick={() => {
                  setShowSuccess(false);
                  onClose();
                }}
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectModal;