import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Event, BadgeAPI, Member } from '../../types';
import { useAppContext } from '../../context/AppContext';
import { getBadges } from '../../api/Badges';
import { getOrganizationMembers, getTeacherStudents } from '../../api/Projects';
import { getCompanyGroups, getCompanyGroup } from '../../api/CompanyDashboard/Groups';
import { getOrganizationId, getOrganizationType } from '../../utils/projectMapper';
import { base64ToFile } from '../../utils/projectMapper';
import { 
  createSchoolEvent, 
  createCompanyEvent, 
  createTeacherEvent,
  createUserEvent,
  updateSchoolEvent,
  updateCompanyEvent,
  updateTeacherEvent,
  updateUserEvent,
  CreateEventPayload 
} from '../../api/Events';
import './Modal.css';
import AvatarImage from '../UI/AvatarImage';
import { useToast } from '../../hooks/useToast';

interface EventModalProps {
  event?: Event | null;
  initialData?: Partial<Event> | null;
  onClose: () => void;
  onSave: (eventData: Omit<Event, 'id'>) => void;
  forceCreate?: boolean;
}

interface NewParticipant {
  id: string; // Temporary ID for display
  identityKey: string;
  firstName: string;
  lastName: string;
  email?: string;
  birthday?: string;
  fullName: string;
}

interface CsvRow {
  identityKey: string;
  firstName: string;
  lastName: string;
  email?: string;
  birthday?: string;
  fullName: string;
}

const EventModal: React.FC<EventModalProps> = ({ event, initialData, onClose, onSave, forceCreate }) => {
  const { state } = useAppContext();
  const { showError } = useToast();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    date: '',
    time: '',
    duration: '60',
    type: 'session' as 'session' | 'workshop' | 'training' | 'meeting' | 'other',
    location: '',
    participants: [] as string[],
    // Pro: groups attached to the event
    groupIds: [] as string[],
    badges: [] as string[],
    image: ''
  });

  const [imagePreview, setImagePreview] = useState<string>('');
  const [participantSearch, setParticipantSearch] = useState<string>('');
  const [showParticipantDropdown, setShowParticipantDropdown] = useState(false);
  const [availableBadges, setAvailableBadges] = useState<BadgeAPI[]>([]);
  const [badgeSeriesFilter, setBadgeSeriesFilter] = useState('');
  const [badgeLevelFilter, setBadgeLevelFilter] = useState('');
  const [badgeToAdd, setBadgeToAdd] = useState('');
  const [documents, setDocuments] = useState<File[]>([]);
  const [csvUploadError, setCsvUploadError] = useState<string>('');
  const [csvUploadSuccess, setCsvUploadSuccess] = useState<string>('');
  const [organizationMembers, setOrganizationMembers] = useState<Member[]>([]);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);
  const [newParticipants, setNewParticipants] = useState<NewParticipant[]>([]);
  const [csvRows, setCsvRows] = useState<CsvRow[]>([]);
  const [selectedOrganizationId, setSelectedOrganizationId] = useState<number | undefined>(undefined);

  // Pro: groups attachment UI
  const [availableCompanyGroups, setAvailableCompanyGroups] = useState<any[]>([]);
  const [isLoadingCompanyGroups, setIsLoadingCompanyGroups] = useState(false);
  const [groupMembersByGroupId, setGroupMembersByGroupId] = useState<Record<string, number[]>>({});
  const [groupMembersDetailsByGroupId, setGroupMembersDetailsByGroupId] = useState<Record<string, any[]>>({});
  const [groupDetailPopup, setGroupDetailPopup] = useState<{ groupId: string; groupName: string } | null>(null);
  const [isLoadingGroupMembers, setIsLoadingGroupMembers] = useState(false);
  const displaySeries = useCallback((seriesName: string) => {
    return seriesName.toLowerCase().includes('toukouleur') ? 'Série Soft Skills 4LAB' : seriesName;
  }, []);

  const badgesBySeries = useMemo(() => {
    return availableBadges.reduce<Record<string, BadgeAPI[]>>((acc, badge) => {
      if (!acc[badge.series]) acc[badge.series] = [];
      acc[badge.series].push(badge);
      return acc;
    }, {});
  }, [availableBadges]);

  const availableSeries = useMemo(() => Object.keys(badgesBySeries), [badgesBySeries]);

  const levelsForSeries = useMemo(() => {
    if (!badgeSeriesFilter) return [];
    const allLevels = Array.from(
      new Set((badgesBySeries[badgeSeriesFilter] || []).map((b) => b.level))
    );
    // For "Série Parcours des possibles", only show levels 1 and 2
    // For "Série Audiovisuelle" and "Série Parcours professionnel", show all levels (1, 2, 3, 4)
    if (badgeSeriesFilter === 'Série Parcours des possibles') {
      return allLevels.filter(level => level === 'level_1' || level === 'level_2');
    }
    return allLevels;
  }, [badgeSeriesFilter, badgesBySeries]);

  const filteredBadges = useMemo(() => {
    return availableBadges.filter((badge) => {
      if (badgeSeriesFilter && badge.series !== badgeSeriesFilter) return false;
      if (badgeLevelFilter && badge.level !== badgeLevelFilter) return false;
      // For "Série Parcours des possibles", hide levels 3 and 4
      // For "Série Audiovisuelle" and "Série Parcours professionnel", show all levels (1, 2, 3, 4)
      if (badge.series === 'Série Parcours des possibles' && 
          (badge.level === 'level_3' || badge.level === 'level_4')) {
        return false;
      }
      return true;
    });
  }, [availableBadges, badgeSeriesFilter, badgeLevelFilter]);

  const previewBadge = useMemo(() => {
    if (!badgeToAdd) return null;
    return availableBadges.find((b) => b.id.toString() === badgeToAdd) || null;
  }, [badgeToAdd, availableBadges]);

  // Filter organization members based on search query
  const filteredMembers = useMemo(() => {
    if (!participantSearch.trim()) return organizationMembers;
    const searchLower = participantSearch.toLowerCase().trim();
    return organizationMembers.filter(member => {
      const fullName = `${member.firstName} ${member.lastName}`.toLowerCase();
      const email = member.email?.toLowerCase() || '';
      return fullName.includes(searchLower) || email.includes(searchLower);
    });
  }, [organizationMembers, participantSearch]);

  // Derived participant IDs from selected groups (prevents manual duplication)
  const groupDerivedParticipantIds = useMemo(() => {
    const ids: string[] = [];
    (formData.groupIds || []).forEach((gid) => {
      const memberIds = groupMembersByGroupId[gid] || [];
      memberIds.forEach((id) => ids.push(String(id)));
    });
    return new Set(ids);
  }, [formData.groupIds, groupMembersByGroupId]);

  const ensureGroupMembersLoaded = async (companyId: number, groupId: string) => {
    if (groupMembersByGroupId[groupId] && groupMembersDetailsByGroupId[groupId]) return;
    try {
      setIsLoadingGroupMembers(true);
      const res = await getCompanyGroup(companyId, Number(groupId));
      const data = res.data?.data || res.data;
      const membersArr = Array.isArray(data?.members) ? data.members : [];
      const memberIds = membersArr.map((m: any) => Number(m.id)).filter((id: number) => !Number.isNaN(id));
      setGroupMembersByGroupId((prev) => ({ ...prev, [groupId]: memberIds }));
      setGroupMembersDetailsByGroupId((prev) => ({ ...prev, [groupId]: membersArr }));
    } catch (e) {
      console.error('Error fetching company group members:', e);
    } finally {
      setIsLoadingGroupMembers(false);
    }
  };

  const handleGroupToggle = async (groupId: string) => {
    if (state.showingPageType !== 'pro') return;

    const companyId = getOrganizationId(state.user, state.showingPageType);
    if (!companyId) return;

    const isSelected = formData.groupIds.includes(groupId);
    const nextGroupIds = isSelected
      ? formData.groupIds.filter((id) => id !== groupId)
      : [...formData.groupIds, groupId];

    setFormData((prev) => ({ ...prev, groupIds: nextGroupIds }));

    if (isSelected && groupDetailPopup?.groupId === groupId) {
      setGroupDetailPopup(null);
    }

    // Fetch members for newly selected group, then remove them from manual participants
    if (!isSelected && !groupMembersByGroupId[groupId]) {
      await ensureGroupMembersLoaded(companyId, groupId);
    }

    if (!isSelected) {
      const cached = groupMembersByGroupId[groupId] || [];
      if (cached.length > 0) {
        const toRemove = new Set(cached.map((id) => String(id)));
        setFormData((prev) => ({
          ...prev,
          participants: prev.participants.filter((id) => !toRemove.has(String(id))),
        }));
      }
    }
  };

  // Fetch available badges on component mount
  useEffect(() => {
    const fetchBadges = async () => {
      try {
        const badges = await getBadges();
        setAvailableBadges(badges);
      } catch (error) {
        console.error('Error fetching badges:', error);
      }
    };
    fetchBadges();
  }, []);

  // Pro: load company groups for event group attachment selector
  useEffect(() => {
    const loadGroups = async () => {
      if (state.showingPageType !== 'pro') return;

      const companyId = getOrganizationId(state.user, state.showingPageType);
      if (!companyId) {
        setAvailableCompanyGroups([]);
        return;
      }

      setIsLoadingCompanyGroups(true);
      try {
        const res = await getCompanyGroups(companyId);
        const raw = res.data?.data || res.data || [];
        setAvailableCompanyGroups(Array.isArray(raw) ? raw : []);
      } catch (e) {
        console.error('Error fetching company groups:', e);
        setAvailableCompanyGroups([]);
      } finally {
        setIsLoadingCompanyGroups(false);
      }
    };

    loadGroups();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.showingPageType, state.user?.id]);

  const organizationsForTeacher = useMemo(() => {
    const contexts = state.user?.available_contexts;
    const orgs: Array<{ id: number; name: string }> = [];
    if (contexts?.schools) {
      contexts.schools.forEach((school: any) => {
        orgs.push({ id: school.id, name: school.name || 'Établissement' });
      });
    }
    return orgs;
  }, [state.user?.available_contexts]);

  useEffect(() => {
    if (state.showingPageType === 'teacher' && organizationsForTeacher.length === 1) {
      setSelectedOrganizationId(organizationsForTeacher[0].id);
    }
  }, [state.showingPageType, organizationsForTeacher]);

  // Fetch organization members based on context (edu, pro, teacher)
  useEffect(() => {
    const fetchOrganizationMembers = async () => {
      // Teacher context: fetch classes + students
      if (state.showingPageType === 'teacher') {
        setIsLoadingMembers(true);
        try {
          const classesData = await getTeacherStudents();
          const students: Member[] = (classesData || []).flatMap((cls: any) => {
            const schoolName = cls.school?.name;
            const className = cls.name;
            return (cls.students || []).map((student: any) => ({
              id: student.id?.toString() || '',
              firstName: student.first_name || '',
              lastName: student.last_name || '',
              fullName: student.full_name || `${student.first_name || ''} ${student.last_name || ''}`.trim(),
              email: student.email || '',
              birthday: student.birthday || student.birth_date || student.birthdate || student.date_of_birth || undefined,
              hasTemporaryEmail: student.has_temporary_email || student.hasTemporaryEmail || false,
              confirmedAt: student.confirmed_at,
              profession: student.role || 'Élève',
              roles: student.role ? [student.role] : [],
              skills: student.skills?.map((s: any) => s.name || s) || [],
              availability: student.availability || [],
              avatar: student.avatar_url || '/default-avatar.png',
              isTrusted: student.is_trusted || false,
              badges: student.badges || [],
              organization: schoolName || className || ''
            }));
          });
          setOrganizationMembers(students);
        } catch (error) {
          console.error('Error fetching teacher students:', error);
          setOrganizationMembers(state.members);
        } finally {
          setIsLoadingMembers(false);
        }
        return;
      }

      // Only fetch for edu or pro contexts
      if (state.showingPageType !== 'edu' && state.showingPageType !== 'pro') {
        // Fallback to state.members for other contexts
        setOrganizationMembers(state.members);
        return;
      }

      const organizationId = getOrganizationId(state.user, state.showingPageType);
      const organizationType = getOrganizationType(state.showingPageType);

      if (!organizationId || !organizationType) {
        // Fallback to state.members if no organization found
        setOrganizationMembers(state.members);
        return;
      }

      setIsLoadingMembers(true);
      try {
        const membersData = await getOrganizationMembers(organizationId, organizationType);
        
        // Map OrganizationMember to Member format
        const mappedMembers: Member[] = membersData.map((member: any) => ({
          id: member.id?.toString() || '',
          firstName: member.first_name || '',
          lastName: member.last_name || '',
          fullName: member.full_name || `${member.first_name || ''} ${member.last_name || ''}`.trim(),
          email: member.email || '',
          birthday: member.birthday || member.birth_date || member.birthdate || member.date_of_birth || undefined,
          hasTemporaryEmail: member.has_temporary_email || member.hasTemporaryEmail || false,
          confirmedAt: member.confirmed_at,
          profession: member.job || member.role || 'Membre',
          roles: member.role ? [member.role] : [],
          skills: member.skills?.map((s: any) => s.name || s) || [],
          availability: member.availability || [],
          avatar: member.avatar_url || '/default-avatar.png',
          isTrusted: member.is_trusted || false,
          badges: member.badges || [],
          organization: member.organization_name || ''
        }));

        setOrganizationMembers(mappedMembers);
      } catch (error) {
        console.error('Error fetching organization members:', error);
        // Fallback to state.members on error
        setOrganizationMembers(state.members);
      } finally {
        setIsLoadingMembers(false);
      }
    };

    fetchOrganizationMembers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.showingPageType, state.user.id]);

  useEffect(() => {
    const seed = event || initialData;
    if (seed) {
      const proSeedGroupIds = (seed as any)?.groupIds || [];
      const proSeedManualParticipantIds = (seed as any)?.manualParticipantIds;

      const participantIds =
        state.showingPageType === 'pro' && Array.isArray(proSeedManualParticipantIds)
          ? proSeedManualParticipantIds
          : (seed.participants || []).map(p =>
              typeof p === 'object' ? p.id.toString() : p.toString()
            );

      setFormData({
        title: seed.title || '',
        description: seed.description || '',
        date: seed.date || '',
        time: seed.time || '',
        duration: seed.duration?.toString() || '60',
        type: seed.type || 'session',
        location: seed.location || '',
        participants: participantIds,
        groupIds: state.showingPageType === 'pro' ? proSeedGroupIds : [],
        badges: seed.badges || [],
        image: seed.image || ''
      });
      setImagePreview(seed.image || '');
      setNewParticipants([]);
      setCsvRows([]);

      if (state.showingPageType === 'pro' && Array.isArray(proSeedGroupIds) && proSeedGroupIds.length > 0) {
        const companyId = getOrganizationId(state.user, state.showingPageType);
        if (companyId) {
          Promise.all(
            proSeedGroupIds.map((gid: string) => ensureGroupMembersLoaded(companyId, gid))
          ).catch(() => {
            // ignore; group member loading will be best-effort
          });
        }
      }
    } else {
      const today = new Date();
      setFormData(prev => ({
        ...prev,
        date: today.toISOString().split('T')[0],
        time: today.toTimeString().slice(0, 5)
      }));
      setNewParticipants([]);
      setCsvRows([]);
    }
  }, [event, initialData]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
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

  const handleDocumentsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const newFiles = Array.from(files);
    setDocuments((prev) => [...prev, ...newFiles]);
    e.target.value = '';
  };

  const handleRemoveDocument = (name: string) => {
    setDocuments((prev) => prev.filter((f) => f.name !== name));
  };

  // Helper function to create CSV file from parsed CSV rows
  const createCsvFileFromParticipants = (
    participants: Array<{ firstName: string; lastName: string; email?: string; birthday?: string }>
  ): File | null => {
    if (participants.length === 0) return null;

    // Create CSV content
    const headers = ['Prénom', 'Nom', 'Adresse e-mail', 'Date de naissance'];
    const rows = participants.map(p => [
      p.firstName,
      p.lastName,
      p.email || '',
      p.birthday || ''
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    // Create Blob and File
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    return new File([blob], 'participants.csv', { type: 'text/csv' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title || !formData.date || !formData.time) {
      return;
    }

    try {
      const organizationId = getOrganizationId(state.user, state.showingPageType);

      // Prepare event data
      const eventData: CreateEventPayload['event'] = {
        title: formData.title,
        description: formData.description || undefined,
        date: formData.date,
        time: formData.time,
        duration: parseInt(formData.duration),
        type: formData.type,
        location: formData.location || undefined,
        status: 'upcoming',
        badges: formData.badges.length > 0 ? formData.badges : undefined,
        organization_id: state.showingPageType === 'teacher' ? selectedOrganizationId : undefined,
        school_id: state.showingPageType === 'teacher' ? selectedOrganizationId : undefined,
        participants: formData.participants.length > 0
          ? formData.participants
          : undefined,
        group_ids:
          state.showingPageType === 'pro'
            ? formData.groupIds
                .map((gid) => Number.parseInt(gid, 10))
                .filter((id) => !Number.isNaN(id))
            : undefined
      };

      // Convert image to File if present
      let imageFile: File | null = null;
      let imageUrl: string | null = null;
      
      if (formData.image) {
        if (formData.image.startsWith('data:')) {
          // Base64 image - convert to File
          imageFile = base64ToFile(formData.image, 'event-image.jpg');
        } else {
          // Check if it's an Active Storage Rails URL (these cause CORS issues)
          const isActiveStorageUrl = formData.image.includes('/rails/active_storage/');
          
          // For Active Storage URLs or any URL, send directly to backend to avoid CORS issues
          // The backend can download it server-side without CORS restrictions
          if (isActiveStorageUrl || formData.image.startsWith('http://') || formData.image.startsWith('https://') || formData.image.startsWith('/')) {
            // Send URL directly to backend - it will handle the download server-side
            imageUrl = formData.image.startsWith('/') 
              ? `${globalThis.location.origin}${formData.image}` 
              : formData.image;
          }
        }
      }

      // Create CSV file from the union of parsed CSV rows (additive; required to add existing users too)
      let csvFile: File | null = null;
      if (csvRows.length > 0) {
        csvFile = createCsvFileFromParticipants(csvRows);
      }

      // Prepare payload
      const payload: CreateEventPayload = {
        event: eventData,
        image: imageFile || undefined,
        image_url: imageUrl || undefined,
        csv_file: csvFile || undefined,
        documents: documents.length ? documents : undefined
      };

      let createdEvent;
      const eventId = event ? parseInt(event.id) : null;
      const shouldUpdate = !forceCreate && event && eventId && !isNaN(eventId);

      // Call appropriate API based on context (create or update)
      if (shouldUpdate) {
        // Update existing event
        if (state.showingPageType === 'edu' && organizationId) {
          createdEvent = await updateSchoolEvent(organizationId, eventId as number, payload);
        } else if (state.showingPageType === 'pro' && organizationId) {
          createdEvent = await updateCompanyEvent(organizationId, eventId as number, payload);
        } else if (state.showingPageType === 'teacher') {
          createdEvent = await updateTeacherEvent(eventId as number, payload);
        } else if (state.showingPageType === 'user') {
          createdEvent = await updateUserEvent(eventId as number, payload);
        } else {
          throw new Error('Contexte invalide pour modifier un événement');
        }
      } else {
        // Create new event
        if (state.showingPageType === 'edu' && organizationId) {
          createdEvent = await createSchoolEvent(organizationId, payload);
        } else if (state.showingPageType === 'pro' && organizationId) {
          createdEvent = await createCompanyEvent(organizationId, payload);
        } else if (state.showingPageType === 'teacher') {
          createdEvent = await createTeacherEvent(payload);
        } else if (state.showingPageType === 'user') {
          createdEvent = await createUserEvent(payload);
        } else {
          throw new Error('Contexte invalide pour créer un événement');
        }
      }

      // Event created/updated successfully

      // Transform backend response to frontend format
      const frontendEvent: Omit<Event, 'id'> = {
        title: createdEvent.title,
        description: createdEvent.description || '',
        date: createdEvent.date,
        time: createdEvent.time,
        duration: createdEvent.duration,
        type: createdEvent.type as Event['type'],
        location: createdEvent.location || '',
        participants: createdEvent.participants?.map(p => p.toString()) || [],
        groupIds: (createdEvent.group_ids || []).map((gid: any) => gid.toString()),
        manualParticipantIds: createdEvent.manual_participant_ids || [],
        badges: createdEvent.badges?.map(b => b.toString()) || [],
        image: createdEvent.image || '',
        status: createdEvent.status as Event['status'],
        projectId: '',
        createdBy: state.user.id || '',
        createdAt: createdEvent.created_at
      };

      // Call onSave callback
      onSave(frontendEvent);

      // Clear new participants after successful save
      setNewParticipants([]);
      setCsvRows([]);
    } catch (error: any) {
      console.error('Error creating event:', error);
      const errorMessage = error.response?.data?.message || error.response?.data?.error || error.message || 'Erreur lors de la création de l\'événement';
      setCsvUploadError(errorMessage);
      showError(errorMessage);
    }
  };

  const handleAddParticipant = (participantId: string) => {
    if (!participantId) return;
    if (groupDerivedParticipantIds.has(participantId)) return;
    if (!formData.participants.includes(participantId)) {
      setFormData(prev => ({
        ...prev,
        participants: [...prev.participants, participantId]
      }));
      setParticipantSearch('');
      setShowParticipantDropdown(false);
    }
  };

  const handleRemoveParticipant = (participantId: string) => {
    setFormData(prev => ({
      ...prev,
      participants: prev.participants.filter(id => id !== participantId)
    }));
  };

  // Parse CSV file and merge/add participants (idempotent; no CSV replace)
  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset messages
    setCsvUploadError('');
    setCsvUploadSuccess('');

    // Check file type
    if (!file.name.endsWith('.csv')) {
      setCsvUploadError('Le fichier doit être au format CSV');
      return;
    }

    const existingCsvRowKeys = new Set(csvRows.map((r) => r.identityKey));
    const existingNewParticipantKeys = new Set(newParticipants.map((p) => p.identityKey));

    const buildIdentityKey = (row: { email?: string; firstName: string; lastName: string; birthday?: string }) => {
      const emailNorm = (row.email || '').trim().toLowerCase();
      if (emailNorm) return `email:${emailNorm}`;
      const bday = (row.birthday || '').trim();
      return `name+bday:${row.firstName.trim().toLowerCase()}|${row.lastName.trim().toLowerCase()}|${bday}`;
    };

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const lines = text.split('\n').filter((line) => line.trim());
        if (lines.length === 0) {
          setCsvUploadError('Le fichier CSV est vide');
          return;
        }

        // Find header row and column indices
        let headerRowIndex = -1;
        let emailIndex = -1;
        let firstNameIndex = -1;
        let lastNameIndex = -1;
        let birthdayIndex = -1;

        // Check first few lines for header (Google Forms format sometimes has header at line 3)
        for (let i = 0; i < Math.min(5, lines.length); i++) {
          const line = lines[i].toLowerCase();
          const parts = line.includes(',')
            ? line.split(',').map((p) => p.trim())
            : line.split(';').map((p) => p.trim());

          const emailIdx = parts.findIndex((p) => p.includes('email') || p.includes('e-mail') || p.includes('adresse e-mail'));
          const firstNameIdx = parts.findIndex((p) =>
            p.includes('prénom') || p.includes('prenom') || p.includes('first') || p.includes('firstname')
          );
          const lastNameIdx = parts.findIndex((p) =>
            (p.includes('nom') && !p.includes('prénom') && !p.includes('prenom')) ||
            p.includes('last') ||
            p.includes('lastname') ||
            (p.includes('name') && !p.includes('first'))
          );
          const birthdayIdx = parts.findIndex((p) => p.includes('naissance') || p.includes('birthday') || p.includes('birth') || p.includes('date'));

          if (emailIdx >= 0 || firstNameIdx >= 0 || lastNameIdx >= 0 || birthdayIdx >= 0) {
            headerRowIndex = i;
            emailIndex = emailIdx;
            firstNameIndex = firstNameIdx;
            lastNameIndex = lastNameIdx;
            birthdayIndex = birthdayIdx;
            break;
          }
        }

        const dataStartIndex = headerRowIndex >= 0 ? headerRowIndex + 1 : 0;

        // Check if required columns are present
        if (headerRowIndex < 0) {
          setCsvUploadError(
            'En-tête non trouvé dans le fichier CSV. Le fichier doit contenir les colonnes : Prénom, Nom, Date de naissance. Veuillez utiliser le template fourni.'
          );
          return;
        }

        const missingColumns: string[] = [];
        if (firstNameIndex < 0) missingColumns.push('Prénom');
        if (lastNameIndex < 0) missingColumns.push('Nom');
        if (birthdayIndex < 0) missingColumns.push('Date de naissance');

        if (missingColumns.length > 0) {
          setCsvUploadError(`Colonnes manquantes dans le fichier CSV : ${missingColumns.join(', ')}. Veuillez utiliser le template fourni.`);
          return;
        }

        const csvRowsToAdd: CsvRow[] = [];
        const newParticipantsToAdd: NewParticipant[] = [];
        const rowsWithoutBirthday: number[] = [];
        let matchedExistingInThisFile = 0;

        for (let i = dataStartIndex; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;

          // Try comma first, then semicolon
          const parts = line.includes(',')
            ? line.split(',').map((p) => p.trim().replace(/^"|"$/g, ''))
            : line.split(';').map((p) => p.trim().replace(/^"|"$/g, ''));

          // Extract data based on column indices
          let email = '';
          let firstName = '';
          let lastName = '';
          let birthday = '';

          if (emailIndex >= 0 && emailIndex < parts.length) email = parts[emailIndex];
          if (firstNameIndex >= 0 && firstNameIndex < parts.length) firstName = parts[firstNameIndex];
          if (lastNameIndex >= 0 && lastNameIndex < parts.length) lastName = parts[lastNameIndex];
          if (birthdayIndex >= 0 && birthdayIndex < parts.length) birthday = parts[birthdayIndex];

          if (!firstName && !lastName) continue;

          if (firstName && lastName && !birthday.trim()) {
            rowsWithoutBirthday.push(i + 1);
          }

          // Normalize birthday format
          let normalizedBirthday = '';
          if (birthday) {
            const dateMatch = birthday.match(/(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})/);
            if (dateMatch) {
              const [, d, m, y] = dateMatch;
              const year = y.length === 2 ? (parseInt(y) < 50 ? `20${y}` : `19${y}`) : y;
              normalizedBirthday = `${year}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
            } else {
              normalizedBirthday = birthday;
            }
          }

          const rowBirthday = normalizedBirthday || birthday || undefined;
          const identityKey = buildIdentityKey({ email, firstName, lastName, birthday: rowBirthday });

          // Existing member match
          let memberFound = false;
          if (normalizedBirthday && firstName && lastName) {
            const member = organizationMembers.find((m) => {
              const memberBirthday = m.birthday;
              const nameMatch =
                (m.firstName || '').toLowerCase() === firstName.toLowerCase() &&
                (m.lastName || '').toLowerCase() === lastName.toLowerCase();
              const birthdayMatch =
                memberBirthday && memberBirthday.split('T')[0] === normalizedBirthday.split('T')[0];
              return nameMatch && Boolean(birthdayMatch);
            });
            if (member) memberFound = true;
          }

          if (!memberFound && email) {
            const member = organizationMembers.find((m) => (m.email || '').toLowerCase() === email.toLowerCase());
            if (member) memberFound = true;
          }

          // Union-add CSV rows by identity (idempotent across uploads)
          const shouldAddCsvRow = !existingCsvRowKeys.has(identityKey);
          if (shouldAddCsvRow) {
            const csvRow: CsvRow = {
              identityKey,
              firstName,
              lastName,
              email: email || undefined,
              birthday: rowBirthday,
              fullName: `${firstName} ${lastName}`.trim()
            };
            csvRowsToAdd.push(csvRow);
            existingCsvRowKeys.add(identityKey);
          }

          if (memberFound) {
            matchedExistingInThisFile += 1;
            continue;
          }

          if (!memberFound && firstName && lastName) {
            // Stage "new participant" rows only when the identity isn't already staged
            if (!existingNewParticipantKeys.has(identityKey)) {
              const tempId = `new-${Date.now()}-${i}`;
              const newParticipant: NewParticipant = {
                id: tempId,
                identityKey,
                firstName,
                lastName,
                email: email || undefined,
                birthday: rowBirthday,
                fullName: `${firstName} ${lastName}`.trim()
              };
              newParticipantsToAdd.push(newParticipant);
              existingNewParticipantKeys.add(identityKey);
            }
          }
        }

        if (rowsWithoutBirthday.length > 0) {
          const rowsList =
            rowsWithoutBirthday.length <= 5
              ? rowsWithoutBirthday.join(', ')
              : `${rowsWithoutBirthday.slice(0, 5).join(', ')}... et ${rowsWithoutBirthday.length - 5} autre(s)`;
          setCsvUploadError(
            `Date de naissance manquante pour ${rowsWithoutBirthday.length} ligne(s) : ${rowsList}. Chaque participant doit avoir une date de naissance.`
          );
          return;
        }

        // Merge/add into state (no replacement)
        if (csvRowsToAdd.length > 0) {
          setCsvRows((prev) => {
            const map = new Map(prev.map((r) => [r.identityKey, r]));
            csvRowsToAdd.forEach((r) => map.set(r.identityKey, r));
            return Array.from(map.values());
          });
        }

        if (newParticipantsToAdd.length > 0) {
          setNewParticipants((prev) => {
            const map = new Map(prev.map((p) => [p.identityKey, p]));
            newParticipantsToAdd.forEach((p) => {
              if (!map.has(p.identityKey)) map.set(p.identityKey, p);
            });
            return Array.from(map.values());
          });
        }

        if (csvRowsToAdd.length > 0 || newParticipantsToAdd.length > 0) {
          const messages: string[] = [];
          if (matchedExistingInThisFile > 0) messages.push(`${matchedExistingInThisFile} participant(s) existant(s) ajoutés`);
          if (newParticipantsToAdd.length > 0) messages.push(`${newParticipantsToAdd.length} nouveau(x) participant(s) à créer`);
          setCsvUploadSuccess(messages.join(', '));
        } else {
          setCsvUploadError('Aucun participant valide trouvé dans le fichier CSV.');
        }

        e.target.value = '';
      } catch (error) {
        console.error('Error parsing CSV:', error);
        setCsvUploadError('Erreur lors de la lecture du fichier CSV');
      }
    };

    reader.onerror = () => setCsvUploadError('Erreur lors de la lecture du fichier');
    reader.readAsText(file);
  };

  // Remove new participant
  const handleRemoveNewParticipant = (participantId: string) => {
    const participant = newParticipants.find((p) => p.id === participantId);
    if (participant?.identityKey) {
      setCsvRows((prev) => prev.filter((r) => r.identityKey !== participant.identityKey));
    }
    setNewParticipants((prev) => prev.filter((p) => p.id !== participantId));
  };

  // Handle badge selection
  const handleBadgeToggle = (badgeId: string) => {
    setFormData(prev => {
      const badgeIdStr = badgeId.toString();
      if (prev.badges.includes(badgeIdStr)) {
        return {
          ...prev,
          badges: prev.badges.filter(id => id !== badgeIdStr)
        };
      } else {
        return {
          ...prev,
          badges: [...prev.badges, badgeIdStr]
        };
      }
    });
  };

  const handleAddBadge = () => {
    if (!badgeToAdd) return;
    const badgeIdStr = badgeToAdd.toString();
    setFormData((prev) => {
      if (prev.badges.includes(badgeIdStr)) {
        return prev;
      }
      return {
        ...prev,
        badges: [...prev.badges, badgeIdStr]
      };
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{event && !forceCreate ? 'Modifier l\'événement' : 'Créer un nouvel événement'}</h2>
          <button className="modal-close" onClick={onClose}>
            <i className="fas fa-times"></i>
          </button>
        </div>
        
        <form id="eventForm" onSubmit={handleSubmit} className="modal-body">
        {/* Event Image Selection */}
          <div className="form-section">
            <h3>Image de l'événement</h3>
            <div className="avatar-selection">
              <div className="avatar-preview">
                {imagePreview ? (
                  <img src={imagePreview} alt="Event preview" className="avatar-image" />
                ) : (
                  <div className="avatar-placeholder">
                    <i className="fas fa-calendar-alt"></i>
                    <span>Image par défaut</span>
                  </div>
                )}
              </div>
              <div className="avatar-actions">
                <button
                  type="button"
                  onClick={() => document.getElementById('eventImage')?.click()}
                  className="btn btn-outline btn-sm"
                >
                  <i className="fas fa-upload"></i>
                  Choisir une image
                </button>
                <input
                  id="eventImage"
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
          {/* Teacher: select establishment */}
          {state.showingPageType === 'teacher' && organizationsForTeacher.length > 0 && (
            <div className="form-group">
              <label htmlFor="teacherOrganization">Établissement</label>
              <select
                id="teacherOrganization"
                className="form-select"
                value={selectedOrganizationId || ''}
                onChange={(e) => setSelectedOrganizationId(e.target.value ? parseInt(e.target.value) : undefined)}
              >
                <option value="">Sélectionner un établissement</option>
                {organizationsForTeacher.map((org) => (
                  <option key={org.id} value={org.id}>{org.name}</option>
                ))}
              </select>
            </div>
          )}
          
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="eventTitle">Titre de l'événement *</label>
              <input 
                type="text" 
                id="eventTitle" 
                name="title"
                required 
                placeholder="Ex: Réunion équipe projet"
                value={formData.title}
                onChange={handleInputChange}
                className="form-input"
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="eventLocation">Lieu</label>
              <input 
                type="text" 
                id="eventLocation" 
                name="location"
                placeholder="Ex: Salle de conférence"
                value={formData.location}
                onChange={handleInputChange}
                className="form-input"
              />
            </div>
          </div>
          
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="eventDate">Date *</label>
              <input 
                type="date" 
                id="eventDate" 
                name="date"
                required
                value={formData.date}
                onChange={handleInputChange}
                className="form-input"
              />
            </div>
            <div className="form-group">
              <label htmlFor="eventTime">Heure *</label>
              <input 
                type="time" 
                id="eventTime" 
                name="time"
                required
                value={formData.time}
                onChange={handleInputChange}
                className="form-input"
              />
            </div>
          </div>
          
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="eventDuration">Durée</label>
              <select 
                id="eventDuration" 
                name="duration"
                value={formData.duration}
                onChange={handleInputChange}
                className="form-select"
              >
                <option value="30">30 minutes</option>
                <option value="60">1 heure</option>
                <option value="90">1h30</option>
                <option value="120">2 heures</option>
                <option value="240">4 heures</option>
                <option value="480">Journée complète</option>
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="eventType">Type d'événement</label>
              <select 
                id="eventType" 
                name="type"
                value={formData.type}
                onChange={handleInputChange}
                className="form-select"
              >
                <option value="session">Session</option>
                <option value="meeting">Réunion</option>
                <option value="workshop">Atelier</option>
                <option value="training">Formation</option>
                <option value="other">Autre</option>
              </select>
            </div>
          </div>
          
          <div className="form-group">
            <label htmlFor="eventDescription">Description</label>
            <textarea 
              id="eventDescription" 
              name="description"
              rows={4} 
              placeholder="Description de l'événement..."
              value={formData.description}
              onChange={handleInputChange}
              className="form-textarea"
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="eventParticipants">Participants</label>
            <div className="participants-selection" style={{ position: 'relative' }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <input
                  type="text"
                  id="eventParticipants"
                  className="form-input"
                  placeholder={isLoadingMembers ? 'Chargement...' : 'Rechercher un participant...'}
                  value={participantSearch}
                  onChange={(e) => {
                    setParticipantSearch(e.target.value);
                    setShowParticipantDropdown(true);
                  }}
                  onFocus={() => setShowParticipantDropdown(true)}
                  disabled={isLoadingMembers}
                  autoComplete="off"
                />
                <i
                  className="fas fa-search"
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#9ca3af',
                    pointerEvents: 'none'
                  }}
                />

                {/* Dropdown with filtered members */}
                {showParticipantDropdown && !isLoadingMembers && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      maxHeight: '250px',
                      overflowY: 'auto',
                      backgroundColor: 'white',
                      border: '1px solid #e0e0e0',
                      borderRadius: '8px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                      zIndex: 100,
                      marginTop: '4px'
                    }}
                  >
                    {filteredMembers.length === 0 ? (
                      <div style={{ padding: '12px 16px', color: '#666', textAlign: 'center' }}>
                        <i className="fas fa-user-slash" style={{ marginRight: '8px' }}></i>
                        Aucun participant trouvé
                      </div>
                    ) : (
                      filteredMembers.map((member) => {
                        const isAlreadySelected = formData.participants.includes(member.id);
                        return (
                          <div
                            key={member.id}
                            onClick={() => !isAlreadySelected && handleAddParticipant(member.id)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '12px',
                              padding: '10px 16px',
                              cursor: isAlreadySelected ? 'not-allowed' : 'pointer',
                              backgroundColor: isAlreadySelected ? '#f0f9ff' : 'transparent',
                              opacity: isAlreadySelected ? 0.6 : 1,
                              borderBottom: '1px solid #f0f0f0',
                              transition: 'background-color 0.15s'
                            }}
                            onMouseEnter={(e) => {
                              if (!isAlreadySelected) {
                                e.currentTarget.style.backgroundColor = '#f5f5f5';
                              }
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = isAlreadySelected ? '#f0f9ff' : 'transparent';
                            }}
                          >
                            <AvatarImage
                              src={member.avatar}
                              alt={`${member.firstName} ${member.lastName}`}
                              className="participant-avatar"
                              style={{ width: '36px', height: '36px', borderRadius: '50%' }}
                            />
                            <div style={{ flex: 1 }}>
                              <div style={{ fontWeight: 500, fontSize: '14px', color: '#333' }}>
                                {member.firstName} {member.lastName}
                              </div>
                              <div style={{ fontSize: '12px', color: '#666' }}>
                                {member.profession}
                                {member.email && <span> · {member.email}</span>}
                              </div>
                            </div>
                            {isAlreadySelected ? (
                              <span style={{
                                fontSize: '11px',
                                color: '#0ea5e9',
                                backgroundColor: '#e0f2fe',
                                padding: '2px 8px',
                                borderRadius: '12px',
                                fontWeight: 500
                              }}>
                                <i className="fas fa-check" style={{ marginRight: '4px' }}></i>
                                Ajouté
                              </span>
                            ) : (
                              <span style={{
                                fontSize: '11px',
                                color: '#666',
                                opacity: 0
                              }} className="add-hint">
                                <i className="fas fa-plus"></i>
                              </span>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>

              {/* Close dropdown when clicking outside */}
              {showParticipantDropdown && (
                <div
                  style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    zIndex: 99
                  }}
                  onClick={() => setShowParticipantDropdown(false)}
                />
              )}
            </div>

            {/* Pro: Groups */}
            {state.showingPageType === 'pro' && (
              <div className="form-group" style={{ marginTop: '15px' }}>
                <div className="form-label" style={{ fontWeight: 600, marginBottom: '10px' }}>
                  <i className="fas fa-users" style={{ marginRight: '8px' }}></i>
                  Ajouter un/des groupe(s) à l&apos;événement
                </div>

                {isLoadingCompanyGroups ? (
                  <div className="loading-message" style={{ padding: '12px', textAlign: 'center', color: '#6b7280' }}>
                    <i className="fas fa-spinner fa-spin" style={{ marginRight: '8px' }}></i>
                    <span>Chargement des groupes...</span>
                  </div>
                ) : (
                  <>
                    {availableCompanyGroups.length === 0 ? (
                      <div style={{ padding: '12px', textAlign: 'center', color: '#6b7280' }}>Aucun groupe disponible</div>
                    ) : (
                      <div className="multi-select-container" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                        {availableCompanyGroups.map((g: any) => {
                          const gid = g.id?.toString() || '';
                          const selected = formData.groupIds.includes(gid);
                          return (
                            <label
                              key={gid}
                              className={`multi-select-item !flex items-center gap-2 ${selected ? 'selected' : ''}`}
                            >
                              <input
                                type="checkbox"
                                checked={selected}
                                onChange={() => handleGroupToggle(gid)}
                              />
                              <div className="multi-select-checkmark">
                                <i className="fas fa-check"></i>
                              </div>
                              <span className="multi-select-label">
                                {g.name} {typeof g.members_count === 'number' ? `(${g.members_count} membre${g.members_count > 1 ? 's' : ''})` : ''}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </>
                )}

                {/* Selected groups summary + member popup trigger */}
                {formData.groupIds.map((groupId) => {
                  const groupItem = availableCompanyGroups.find((g: any) => g.id?.toString() === groupId);
                  const groupName = groupItem?.name || groupId;
                  const cachedMembers = groupMembersDetailsByGroupId[groupId] || [];
                  const count =
                    typeof groupItem?.members_count === 'number'
                      ? groupItem.members_count
                      : (groupMembersByGroupId[groupId]?.length ?? cachedMembers.length);

                  return (
                    <div
                      key={groupId}
                      className="form-group"
                      style={{ marginTop: '12px', paddingLeft: '8px', borderLeft: '3px solid #e5e7eb' }}
                    >
                      <div className="form-label" style={{ fontSize: '0.9rem', marginBottom: '8px' }}>{groupName}</div>
                      <div className="flex flex-wrap gap-2" style={{ marginBottom: '8px' }}>
                        <button
                          type="button"
                          className="btn btn-outline"
                          style={{ fontSize: '0.85rem', padding: '6px 12px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                          onClick={async () => {
                            const companyId = getOrganizationId(state.user, state.showingPageType);
                            if (!companyId) return;
                            await ensureGroupMembersLoaded(companyId, groupId);
                            setGroupDetailPopup({ groupId, groupName });
                          }}
                        >
                          <i className="fas fa-users" />
                          <span>Voir les membres ({count || 0})</span>
                        </button>
                        <button
                          type="button"
                          className="btn btn-outline"
                          style={{ fontSize: '0.85rem', padding: '6px 12px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                          onClick={() => handleGroupToggle(groupId)}
                        >
                          <i className="fas fa-times" />
                          <span>Retirer</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Popup détail groupe : liste des membres (lecture seule) */}
            {groupDetailPopup && (
              <div
                className="modal-overlay"
                style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                onClick={() => setGroupDetailPopup(null)}
              >
                <div
                  className="modal-content"
                  style={{ background: 'white', borderRadius: '8px', maxWidth: '420px', width: '92%', maxHeight: '80vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div style={{ padding: '16px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '4px' }}>
                    <h3 style={{ margin: 0, fontSize: '1.1rem' }}>{groupDetailPopup.groupName}</h3>
                    <button type="button" className="p-1 !px-2.5 rounded-full border border-gray-100" onClick={() => setGroupDetailPopup(null)}>
                      <i className="fas fa-times" />
                    </button>
                  </div>
                  <div style={{ padding: '16px', overflowY: 'auto', flex: 1 }}>
                    {(() => {
                      const membersArr = groupMembersDetailsByGroupId[groupDetailPopup.groupId] || [];
                      if (isLoadingGroupMembers && membersArr.length === 0) {
                        return (
                          <div style={{ padding: '12px', textAlign: 'center', color: '#6b7280' }}>
                            <i className="fas fa-spinner fa-spin" style={{ marginRight: '8px' }}></i>
                            <span>Chargement des membres...</span>
                          </div>
                        );
                      }
                      if (membersArr.length === 0) return <p style={{ color: '#6b7280' }}>Aucun membre dans ce groupe.</p>;

                      return (
                        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                          {membersArr.map((m: any) => {
                            const name = m.full_name || `${m.first_name || ''} ${m.last_name || ''}`.trim() || m.email || 'Membre';
                            return (
                              <li key={m.id} style={{ padding: '10px 0', borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <AvatarImage
                                  src={m.avatar_url || m.avatarUrl || '/default-avatar.png'}
                                  alt={name}
                                  className="item-avatar"
                                />
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 }}>
                                  <div style={{ fontWeight: 600, fontSize: '0.95rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {name}
                                  </div>
                                  {m.email && <div style={{ color: '#6b7280', fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.email}</div>}
                                </div>
                              </li>
                            );
                          })}
                        </ul>
                      );
                    })()}
                  </div>
                </div>
              </div>
            )}

            {/* CSV Upload Section */}
            <div className="flex flex-col gap-2 csv-upload-section" style={{ marginTop: '15px', padding: '15px', border: '1px solid #e0e0e0', borderRadius: '8px', backgroundColor: '#f9f9f9' }}>
              <label htmlFor="csvParticipants" style={{ display: 'block', marginBottom: '10px', fontWeight: '500' }}>
                <i className="fas fa-file-csv"></i> Importer une liste de participants (CSV)
              </label>
              <a download="/template-liste-participant.csv" 
               className="text-xs text-[-primary] flex items-center gap-1 hover:underline"
               href="/template-liste-participant.csv"
               title="Remplissez le template avec les participants que vous souhaitez inviter"
               >
                <i className="fas fa-info-circle"/> 
              Télécharger le template</a>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <input
                  id="csvParticipants"
                  type="file"
                  accept=".csv"
                  onChange={handleCsvUpload}
                  style={{ display: 'none' }}
                />
                <button
                  type="button"
                  onClick={() => document.getElementById('csvParticipants')?.click()}
                  className="btn btn-outline btn-sm"
                >
                  <i className="fas fa-upload"></i> Choisir un fichier CSV
                </button>
                <span style={{ fontSize: '12px', color: '#666' }}>
                  Format: email ou nom (une colonne par ligne)
                </span>
              </div>
              {csvUploadSuccess && (
                <div style={{ marginTop: '10px', padding: '8px', backgroundColor: '#d4edda', color: '#155724', borderRadius: '4px', fontSize: '14px' }}>
                  <i className="fas fa-check-circle"></i> {csvUploadSuccess}
                </div>
              )}
              {csvUploadError && (
                <div style={{ marginTop: '10px', padding: '8px', backgroundColor: '#f8d7da', color: '#721c24', borderRadius: '4px', fontSize: '14px' }}>
                  <i className="fas fa-exclamation-circle"></i> {csvUploadError}
                </div>
              )}
            </div>
            
            {(formData.participants.length > 0 || newParticipants.length > 0) && (
              <div className="selected-participants">
                <p className="participants-label">
                  Participants invités ({formData.participants.length + newParticipants.length}):
                </p>
                <div className="participants-list">
                  {/* Existing participants */}
                  {formData.participants.map((participantId) => {
                    const member = organizationMembers.find(m => m.id === participantId);
                    return member ? (
                      <span key={participantId} className="participant-tag">
                        <AvatarImage src={member.avatar} alt={`${member.firstName} ${member.lastName}`} className="participant-avatar" />
                        <span className="participant-name">{member.firstName} {member.lastName}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveParticipant(participantId)}
                          className="participant-remove"
                        >
                          <i className="fas fa-times"></i>
                        </button>
                      </span>
                    ) : null;
                  })}
                  
                  {/* New participants to be created */}
                  {newParticipants.map((newParticipant) => (
                    <span 
                      key={newParticipant.id} 
                      className="participant-tag"
                      style={{
                        position: 'relative',
                        border: '2px dashed #ff9800',
                        backgroundColor: '#fff3e0',
                        paddingRight: '30px' // Make room for remove button
                      }}
                    >
                      <span
                        style={{
                          position: 'absolute',
                          top: '-8px',
                          left: '-8px',
                          backgroundColor: '#ff9800',
                          color: 'white',
                          borderRadius: '50%',
                          width: '20px',
                          height: '20px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '10px',
                          fontWeight: 'bold',
                          zIndex: 1,
                          pointerEvents: 'none' // Don't interfere with clicks
                        }}
                        title="Nouveau participant - sera créé lors de l'enregistrement"
                      >
                        +
                      </span>
                      <div
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          backgroundColor: '#ff9800',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'white',
                          fontWeight: 'bold',
                          fontSize: '14px',
                          marginRight: '8px',
                          flexShrink: 0
                        }}
                      >
                        {newParticipant.firstName.charAt(0).toUpperCase()}
                        {newParticipant.lastName.charAt(0).toUpperCase()}
                      </div>
                      <span className="participant-name" style={{ flex: 1 }}>
                        {newParticipant.fullName}
                        {newParticipant.email && (
                          <span style={{ fontSize: '11px', color: '#666', display: 'block' }}>
                            {newParticipant.email}
                          </span>
                        )}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveNewParticipant(newParticipant.id);
                        }}
                        className="participant-remove"
                        style={{
                          position: 'absolute',
                          right: '5px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          zIndex: 2,
                          cursor: 'pointer',
                          backgroundColor: 'transparent',
                          border: 'none',
                          color: '#666',
                          fontSize: '14px',
                          padding: '4px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '20px',
                          height: '20px',
                          borderRadius: '50%',
                          transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#ff9800';
                          e.currentTarget.style.color = 'white';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent';
                          e.currentTarget.style.color = '#666';
                        }}
                        title="Supprimer de la sélection"
                      >
                        <i className="fas fa-times"></i>
                      </button>
                    </span>
                  ))}
                </div>
                {newParticipants.length > 0 && (
                  <p style={{ 
                    marginTop: '10px', 
                    fontSize: '12px', 
                    color: '#ff9800',
                    fontStyle: 'italic'
                  }}>
                    <i className="fas fa-info-circle"></i> {newParticipants.length} participant(s) sera(ont) créé(s) lors de l'enregistrement de l'événement
                  </p>
                )}
              </div>
            )}
          </div>

         <div className="form-group">
            <label htmlFor="eventBadges">Badges assignés à l'événement</label>
            {availableBadges.length === 0 ? (
              <p style={{ color: '#666', fontSize: '14px', fontStyle: 'italic' }}>
                Aucun badge disponible
              </p>
            ) : (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr',
                  gap: '16px',
                  alignItems: 'start'
                }}
              >
                <div
                  style={{
                    border: '1px solid #e0e0e0',
                    borderRadius: '8px',
                    padding: '12px',
                    background: '#fafafa',
                    // minHeight: '160px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div
                      style={{
                        width: '70px',
                        height: '70px',
                        borderRadius: '50%',
                        backgroundColor: '#f1f3f5',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: 'hidden'
                      }}
                    >
                      {previewBadge?.image_url ? (
                        <img
                          src={previewBadge.image_url}
                          alt={previewBadge.name}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      ) : (
                        <i className="fas fa-award" style={{ color: '#9e9e9e', fontSize: '28px' }}></i>
                      )}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '16px' }}>
                        {previewBadge ? previewBadge.name : 'Sélectionnez une série'}
                      </div>
                      <div style={{ fontSize: '13px', color: '#666' }}>
                        {previewBadge
                          ? `${displaySeries(previewBadge.series)} · Niveau ${previewBadge.level.replace('level_', '')}`
                          : 'Choisissez une série puis un badge'}
                      </div>
                    </div>
                  </div>
                  {previewBadge?.description && (
                    <p style={{ marginTop: '10px', fontSize: '13px', color: '#555' }}>
                      {previewBadge.description}
                    </p>
                  )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={{ fontWeight: 500 }}>Série de badge</label>
                    <select
                      className="form-select"
                      value={badgeSeriesFilter}
                      onChange={(e) => {
                        setBadgeSeriesFilter(e.target.value);
                        setBadgeLevelFilter('');
                        setBadgeToAdd('');
                      }}
                    >
                      <option value="">Sélectionner une série</option>
                      {availableSeries.map((series) => (
                        <option key={series} value={series}>
                          {displaySeries(series)}
                        </option>
                      ))}
                    </select>
                  </div>

                  {badgeSeriesFilter && (
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label style={{ fontWeight: 500 }}>Niveau</label>
                      <select
                        className="form-select"
                        value={badgeLevelFilter}
                        onChange={(e) => {
                          setBadgeLevelFilter(e.target.value);
                          setBadgeToAdd('');
                        }}
                      >
                        <option value="">Tous les niveaux</option>
                        {levelsForSeries.map((level) => (
                          <option key={level} value={level}>
                            Niveau {level.replace('level_', '')}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={{ fontWeight: 500 }}>Badge</label>
                    <select
                      className="form-select"
                      value={badgeToAdd}
                      onChange={(e) => setBadgeToAdd(e.target.value)}
                      disabled={!badgeSeriesFilter}
                    >
                      <option value="">{badgeSeriesFilter ? 'Sélectionner un badge' : 'Choisissez une série d’abord'}</option>
                      {filteredBadges.map((badge) => (
                        <option key={badge.id} value={badge.id.toString()}>
                          {badge.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={handleAddBadge}
                      disabled={!badgeToAdd}
                    >
                      <i className="fas fa-plus"></i> Ajouter le badge
                    </button>
                    {badgeToAdd && formData.badges.includes(badgeToAdd) && (
                      <span style={{ color: '#666', fontSize: '12px', alignSelf: 'center' }}>
                        Ce badge est déjà sélectionné
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {formData.badges.length > 0 && (
              <div style={{ marginTop: '14px' }}>
                <div style={{ fontWeight: 600, marginBottom: '8px', color: '#333' }}>
                  {formData.badges.length} badge(s) sélectionné(s)
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {formData.badges.map((badgeId) => {
                    const badge = availableBadges.find((b) => b.id.toString() === badgeId);
                    return (
                      <span
                        key={badgeId}
                        className="participant-tag"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '6px 10px',
                          background: '#f1f5f9',
                          border: '1px solid #e2e8f0',
                          borderRadius: '20px'
                        }}
                      >
                        <span style={{ fontWeight: 500 }}>{badge ? badge.name : `Badge ${badgeId}`}</span>
                        {badge && (
                          <span style={{ fontSize: '11px', color: '#666' }}>
                            {displaySeries(badge.series)} · Niv {badge.level.replace('level_', '')}
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => handleBadgeToggle(badgeId)}
                          className="participant-remove"
                          style={{ border: 'none', background: 'transparent', color: '#666' }}
                          title="Retirer le badge"
                        >
                          <i className="fas fa-times"></i>
                        </button>
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
          
          {/* Documents (optionnel) */}
          <div className="form-group">
            <label htmlFor="eventDocuments">Documents (optionnel)</label>
            <div className="file-upload-container">
              <input
                type="file"
                id="eventDocuments"
                className="file-input"
                multiple
                onChange={handleDocumentsChange}
              />
              <label htmlFor="eventDocuments flex gap-2 " className="file-upload-label">
                <i className="fas fa-upload"></i>
                <span>Ajouter des documents</span>
              </label>
            </div>
            {documents.length > 0 && (
              <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {documents.map((doc) => (
                  <div
                    key={doc.name}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 10px',
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: '6px'
                    }}
                  >
                    <i className="fas fa-file-alt" style={{ color: '#64748b' }}></i>
                    <span style={{ flex: 1, fontSize: '14px', color: '#334155' }}>{doc.name}</span>
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      onClick={() => handleRemoveDocument(doc.name)}
                    >
                      <i className="fas fa-times"></i>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </form>
        
        <div className="modal-footer">
          <button type="button" className="btn btn-outline" onClick={onClose}>Annuler</button>
          <button type="submit" form="eventForm" className="flex gap-2 items-center btn btn-primary">
          {forceCreate || !event ?  <i className="fas fa-plus"></i> : <i className="fas fa-pen"></i>}
            {forceCreate || !event ? 'Créer l\'événement' : 'Valider les modifications'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EventModal;