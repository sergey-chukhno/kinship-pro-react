import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Event, BadgeAPI, Member } from '../../types';
import { useAppContext } from '../../context/AppContext';
import { getBadges } from '../../api/Badges';
import { getOrganizationMembers, getTeacherStudents } from '../../api/Projects';
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

interface EventModalProps {
  event?: Event | null;
  initialData?: Partial<Event> | null;
  onClose: () => void;
  onSave: (eventData: Omit<Event, 'id'>) => void;
  forceCreate?: boolean;
}

interface NewParticipant {
  id: string; // Temporary ID for display
  firstName: string;
  lastName: string;
  email?: string;
  birthday?: string;
  fullName: string;
}

const EventModal: React.FC<EventModalProps> = ({ event, initialData, onClose, onSave, forceCreate }) => {
  const { state } = useAppContext();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    date: '',
    time: '',
    duration: '60',
    type: 'session' as 'session' | 'workshop' | 'training' | 'meeting' | 'other',
    location: '',
    participants: [] as string[],
    badges: [] as string[],
    image: ''
  });

  const [imagePreview, setImagePreview] = useState<string>('');
  const [selectedParticipant, setSelectedParticipant] = useState<string>('');
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
  const [selectedOrganizationId, setSelectedOrganizationId] = useState<number | undefined>(undefined);
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
    // For "Série Audiovisuelle", show all levels (1, 2, 3, 4)
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
      // For "Série Audiovisuelle", show all levels (1, 2, 3, 4)
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
      const participantIds = (seed.participants || []).map(p => 
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
        badges: seed.badges || [],
        image: seed.image || ''
      });
      setImagePreview(seed.image || '');
      setNewParticipants([]);
    } else {
      const today = new Date();
      setFormData(prev => ({
        ...prev,
        date: today.toISOString().split('T')[0],
        time: today.toTimeString().slice(0, 5)
      }));
      setNewParticipants([]);
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

  // Helper function to create CSV file from new participants
  const createCsvFileFromParticipants = (participants: NewParticipant[]): File | null => {
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
          : undefined
      };

      // Convert base64 image to File if present
      let imageFile: File | null = null;
      if (formData.image && formData.image.startsWith('data:')) {
        imageFile = base64ToFile(formData.image, 'event-image.jpg');
      }

      // Create CSV file from new participants if any
      let csvFile: File | null = null;
      if (newParticipants.length > 0) {
        csvFile = createCsvFileFromParticipants(newParticipants);
      }

      // Prepare payload
      const payload: CreateEventPayload = {
        event: eventData,
        image: imageFile || undefined,
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
    } catch (error: any) {
      console.error('Error creating event:', error);
      const errorMessage = error.response?.data?.message || error.response?.data?.error || error.message || 'Erreur lors de la création de l\'événement';
      setCsvUploadError(errorMessage);
      // You might want to show a toast notification here
    }
  };

  const handleInviteParticipant = () => {
    if (selectedParticipant && !formData.participants.includes(selectedParticipant)) {
      setFormData(prev => ({
        ...prev,
        participants: [...prev.participants, selectedParticipant]
      }));
      setSelectedParticipant('');
    }
  };

  const handleRemoveParticipant = (participantId: string) => {
    setFormData(prev => ({
      ...prev,
      participants: prev.participants.filter(id => id !== participantId)
    }));
  };

  // Parse CSV file and match participants
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

    // Clear previous CSV upload results (replace instead of append)
    setNewParticipants([]);
    // Note: We'll replace all participants on CSV upload
    // If you want to keep manually added participants, you'd need to track their origin

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const lines = text.split('\n').filter(line => line.trim());
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
            ? line.split(',').map(p => p.trim())
            : line.split(';').map(p => p.trim());
          
          const emailIdx = parts.findIndex(p => 
            p.includes('email') || p.includes('e-mail') || p.includes('adresse e-mail')
          );
          const firstNameIdx = parts.findIndex(p => 
            p.includes('prénom') || p.includes('prenom') || p.includes('first') || p.includes('firstname')
          );
          const lastNameIdx = parts.findIndex(p => 
            (p.includes('nom') && !p.includes('prénom') && !p.includes('prenom')) || 
            p.includes('last') || p.includes('lastname') || (p.includes('name') && !p.includes('first'))
          );
          const birthdayIdx = parts.findIndex(p => 
            p.includes('naissance') || p.includes('birthday') || p.includes('birth') || p.includes('date')
          );

          if (emailIdx >= 0 || firstNameIdx >= 0 || lastNameIdx >= 0 || birthdayIdx >= 0) {
            headerRowIndex = i;
            emailIndex = emailIdx;
            firstNameIndex = firstNameIdx;
            lastNameIndex = lastNameIdx;
            birthdayIndex = birthdayIdx;
            break;
          }
        }

        // If no header found, assume first line is header or data starts at line 0
        const dataStartIndex = headerRowIndex >= 0 ? headerRowIndex + 1 : 0;

        // Parse CSV (handle both comma and semicolon separators)
        const participants: string[] = [];
        const newParticipantsToAdd: NewParticipant[] = [];

        for (let i = dataStartIndex; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;

          // Try comma first, then semicolon
          const parts = line.includes(',') 
            ? line.split(',').map(p => p.trim().replace(/^"|"$/g, ''))
            : line.split(';').map(p => p.trim().replace(/^"|"$/g, ''));

          // Extract data based on column indices or try to infer
          let email = '';
          let firstName = '';
          let lastName = '';
          let birthday = '';

          if (headerRowIndex >= 0) {
            // Use column indices from header
            if (emailIndex >= 0 && emailIndex < parts.length) email = parts[emailIndex];
            if (firstNameIndex >= 0 && firstNameIndex < parts.length) firstName = parts[firstNameIndex];
            if (lastNameIndex >= 0 && lastNameIndex < parts.length) lastName = parts[lastNameIndex];
            if (birthdayIndex >= 0 && birthdayIndex < parts.length) birthday = parts[birthdayIndex];
          } else {
            // Try to infer: first column might be email or name, etc.
            if (parts.length > 0) {
              const firstPart = parts[0];
              if (firstPart.includes('@')) {
                email = firstPart;
                if (parts.length > 1) firstName = parts[1];
                if (parts.length > 2) lastName = parts[2];
                if (parts.length > 3) birthday = parts[3];
              } else {
                // Assume format: firstName, lastName, email, birthday
                if (parts.length > 0) firstName = parts[0];
                if (parts.length > 1) lastName = parts[1];
                if (parts.length > 2 && parts[2].includes('@')) email = parts[2];
                if (parts.length > 3) birthday = parts[3];
              }
            }
          }

          // Normalize birthday format (handle various formats)
          let normalizedBirthday = '';
          if (birthday) {
            // Try to parse and normalize date
            const dateMatch = birthday.match(/(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})/);
            if (dateMatch) {
              const [, d, m, y] = dateMatch;
              const year = y.length === 2 ? (parseInt(y) < 50 ? `20${y}` : `19${y}`) : y;
              normalizedBirthday = `${year}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
            } else {
              normalizedBirthday = birthday;
            }
          }

          // Try to find existing member by birthday + name + firstname
          let found = false;
          if (normalizedBirthday && firstName && lastName) {
            const member = organizationMembers.find(m => {
              const memberBirthday = m.birthday;
              const nameMatch = m.firstName.toLowerCase() === firstName.toLowerCase() &&
                               m.lastName.toLowerCase() === lastName.toLowerCase();
              const birthdayMatch = memberBirthday && 
                memberBirthday.split('T')[0] === normalizedBirthday.split('T')[0];
              return nameMatch && birthdayMatch;
            });

            if (member && !formData.participants.includes(member.id) && !participants.includes(member.id)) {
              participants.push(member.id);
              found = true;
            }
          }

          // Also try by email if not found
          if (!found && email) {
            const member = organizationMembers.find(m => 
              m.email.toLowerCase() === email.toLowerCase()
            );
            if (member && !formData.participants.includes(member.id) && !participants.includes(member.id)) {
              participants.push(member.id);
              found = true;
            }
          }

          // If not found and we have at least firstName and lastName, add as new participant
          if (!found && firstName && lastName) {
            const tempId = `new-${Date.now()}-${i}`;
            const newParticipant: NewParticipant = {
              id: tempId,
              firstName,
              lastName,
              email: email || undefined,
              birthday: normalizedBirthday || birthday || undefined,
              fullName: `${firstName} ${lastName}`
            };
            newParticipantsToAdd.push(newParticipant);
          }
        }

        // Replace participants from CSV (keep manually added ones if needed)
        // For complete replacement, replace all participants
        // For partial replacement, we'd need to track which came from CSV
        // Here we do complete replacement of all participants on CSV upload
        setFormData(prev => ({
          ...prev,
          participants: participants
        }));

        // Replace new participants (complete replacement)
        setNewParticipants(newParticipantsToAdd);

        // Set success/error messages
        if (participants.length > 0 || newParticipantsToAdd.length > 0) {
          const messages = [];
          if (participants.length > 0) {
            messages.push(`${participants.length} participant(s) existant(s) ajouté(s)`);
          }
          if (newParticipantsToAdd.length > 0) {
            messages.push(`${newParticipantsToAdd.length} nouveau(x) participant(s) à créer`);
          }
          setCsvUploadSuccess(messages.join(', '));
        } else {
          setCsvUploadError('Aucun participant valide trouvé dans le fichier CSV.');
        }

        // Reset file input
        e.target.value = '';
      } catch (error) {
        console.error('Error parsing CSV:', error);
        setCsvUploadError('Erreur lors de la lecture du fichier CSV');
      }
    };

    reader.onerror = () => {
      setCsvUploadError('Erreur lors de la lecture du fichier');
    };

    reader.readAsText(file);
  };

  // Remove new participant
  const handleRemoveNewParticipant = (participantId: string) => {
    setNewParticipants(prev => prev.filter(p => p.id !== participantId));
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
            <div className="participants-selection">
              <select 
                id="eventParticipants" 
                className="form-select"
                value={selectedParticipant}
                onChange={(e) => setSelectedParticipant(e.target.value)}
                disabled={isLoadingMembers}
              >
                <option value="">{isLoadingMembers ? 'Chargement...' : 'Sélectionner un participant'}</option>
                {organizationMembers.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.firstName} {member.lastName} - {member.profession}
                  </option>
                ))}
              </select>
              <button type="button" className="btn btn-primary btn-sm" onClick={handleInviteParticipant}>
                <i className="fas fa-plus"></i> Inviter
              </button>
            </div>

            {/* CSV Upload Section */}
            <div className="csv-upload-section" style={{ marginTop: '15px', padding: '15px', border: '1px solid #e0e0e0', borderRadius: '8px', backgroundColor: '#f9f9f9' }}>
              <label htmlFor="csvParticipants" style={{ display: 'block', marginBottom: '10px', fontWeight: '500' }}>
                <i className="fas fa-file-csv"></i> Importer une liste de participants (CSV)
              </label>
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

          {/* Badges Selection Section */}
{formData.type !== 'meeting' && formData.type !== 'other' &&          <div className="form-group">
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
          </div>}
          
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
          <button type="submit" form="eventForm" className="btn btn-primary">
            <i className="fas fa-plus"></i>
            {forceCreate || !event ? 'Créer l\'événement' : 'Modifier l\'événement'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EventModal;