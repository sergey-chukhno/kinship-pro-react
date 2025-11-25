import React, { useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { mockProjects, mockMembers } from '../../data/mockData';
import AddParticipantModal from '../Modals/AddParticipantModal';
import BadgeAssignmentModal from '../Modals/BadgeAssignmentModal';
import './ProjectManagement.css';
import './MembershipRequests.css';
import AvatarImage, { DEFAULT_AVATAR_SRC } from '../UI/AvatarImage';

const ProjectManagement: React.FC = () => {
  const { state, setCurrentPage, setSelectedProject } = useAppContext();
  const [activeTab, setActiveTab] = useState('overview');
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    tags: [] as string[],
    startDate: '',
    endDate: '',
    pathway: ''
  });
  const [isAddParticipantModalOpen, setIsAddParticipantModalOpen] = useState(false);
  const [isBadgeModalOpen, setIsBadgeModalOpen] = useState(false);
  const [selectedParticipantForBadge, setSelectedParticipantForBadge] = useState<string | null>(null);
  const [collapsedComments, setCollapsedComments] = useState<Set<string>>(new Set());
  
  // Badge filters
  const [badgeSeriesFilter, setBadgeSeriesFilter] = useState('');
  const [badgeLevelFilter, setBadgeLevelFilter] = useState('');
  const [badgeDomainFilter, setBadgeDomainFilter] = useState('');

  // Team management state
  const [teams, setTeams] = useState([
    {
      id: '1',
      name: 'Équipe Marketing',
      number: 1,
      chiefId: '2', // Sophie Martin
      members: ['2', '3'], // Sophie Martin, Lucas Bernard
      description: 'Équipe responsable de la communication et du marketing du projet'
    },
    {
      id: '2',
      name: 'Équipe Technique',
      number: 2,
      chiefId: '3', // Lucas Bernard
      members: ['3', '5'], // Lucas Bernard, Alexandre Moreau
      description: 'Équipe responsable du développement technique et de la formation'
    }
  ]);
  const [isCreateTeamModalOpen, setIsCreateTeamModalOpen] = useState(false);
  const [isEditTeamModalOpen, setIsEditTeamModalOpen] = useState(false);
  const [isViewTeamModalOpen, setIsViewTeamModalOpen] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<any>(null);
  const [newTeamForm, setNewTeamForm] = useState({
    name: '',
    description: '',
    chiefId: '',
    selectedMembers: [] as string[]
  });
  const [memberSearchTerm, setMemberSearchTerm] = useState('');
  
  // Kanban tasks state
  const [tasks, setTasks] = useState([
    {
      id: '1',
      title: 'Conception de la maquette',
      description: 'Créer les wireframes et maquettes pour l\'interface utilisateur',
      status: 'todo',
      assigneeType: 'team',
      assigneeId: '1',
      assigneeName: 'Équipe Marketing',
      startDate: '2024-01-15',
      dueDate: '2024-01-25',
      priority: 'high',
      createdAt: '2024-01-10',
      createdBy: 'Sophie Martin'
    },
    {
      id: '2',
      title: 'Développement frontend',
      description: 'Implémenter l\'interface utilisateur avec React',
      status: 'in-progress',
      assigneeType: 'individual',
      assigneeId: '3',
      assigneeName: 'Lucas Bernard',
      startDate: '2024-01-20',
      dueDate: '2024-02-05',
      priority: 'medium',
      createdAt: '2024-01-12',
      createdBy: 'Sophie Martin'
    }
  ]);
  
  const [isCreateTaskModalOpen, setIsCreateTaskModalOpen] = useState(false);
  const [isEditTaskModalOpen, setIsEditTaskModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [newTaskForm, setNewTaskForm] = useState({
    title: '',
    description: '',
    assigneeType: 'individual',
    assigneeId: '',
    startDate: '',
    dueDate: '',
    priority: 'medium'
  });

  // Get the selected project from context
  const project = state.selectedProject || mockProjects[0];

  // Mock data for requests and participants - using actual member data
  const [requests, setRequests] = useState([
    {
      id: '1',
      memberId: '5',
      name: 'Alexandre Moreau',
      profession: 'Chef de projet',
      email: 'alexandre.moreau@example.com',
      avatar: 'https://randomuser.me/api/portraits/men/45.jpg',
      skills: ['Sport et initiation', 'Bricolage & Jardinage', 'Cuisine et ses techniques'],
      availability: ['Samedi', 'Dimanche'],
      requestDate: '2024-01-20',
      organization: 'Association Sportive'
    },
    {
      id: '2',
      memberId: '6',
      name: 'Camille Rousseau',
      profession: 'Designer',
      email: 'camille.rousseau@example.com',
      avatar: 'https://randomuser.me/api/portraits/women/33.jpg',
      skills: ['Arts & Culture', 'Innovation'],
      availability: ['Mardi', 'Jeudi'],
      requestDate: '2024-01-22',
      organization: 'DesignStudio'
    }
  ]);

  const [participants, setParticipants] = useState([
    {
      id: '1',
      memberId: '3',
      name: 'Lucas Bernard',
      profession: 'Formateur',
      email: 'lucas.bernard@example.com',
      avatar: 'https://randomuser.me/api/portraits/men/67.jpg',
      skills: ['Gestion et Formation', 'Leadership', 'Communication'],
      availability: ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi'],
      organization: 'EduForm'
    },
    {
      id: '2',
      memberId: '2',
      name: 'Sophie Martin',
      profession: 'Designer',
      email: 'sophie.martin@example.com',
      avatar: 'https://randomuser.me/api/portraits/women/44.jpg',
      skills: ['Arts & Culture', 'Créativité', 'Innovation'],
      availability: ['Mardi', 'Jeudi'],
      organization: 'DesignStudio'
    }
  ]);

  const getStatusText = (status: string) => {
    switch (status) {
      case 'coming': return 'À venir';
      case 'in_progress': return 'En cours';
      case 'ended': return 'Terminé';
      default: return status;
    }
  };

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'coming': return 'coming';
      case 'in_progress': return 'in-progress';
      case 'ended': return 'ended';
      default: return 'coming';
    }
  };

  const handleEdit = () => {
    setEditForm({
      title: project.title,
      description: project.description,
      tags: [...(project.tags || [])],
      startDate: project.startDate,
      endDate: project.endDate,
      pathway: project.pathway
    });
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = () => {
    // Update the project in the context/state
    const updatedProject = {
      ...project,
      title: editForm.title,
      description: editForm.description,
      tags: editForm.tags,
      startDate: editForm.startDate,
      endDate: editForm.endDate,
      pathway: editForm.pathway
    };
    
    // Update the selected project in context
    setSelectedProject(updatedProject);
    
    // Update the project in the mock data (in a real app, this would be an API call)
    const projectIndex = mockProjects.findIndex(p => p.id === project.id);
    if (projectIndex !== -1) {
      mockProjects[projectIndex] = updatedProject;
    }
    
    console.log('Project updated:', updatedProject);
    setIsEditModalOpen(false);
  };

  const handleCancelEdit = () => {
    setIsEditModalOpen(false);
  };

  const handleTagChange = (index: number, value: string) => {
    const newTags = [...editForm.tags];
    newTags[index] = value;
    setEditForm({ ...editForm, tags: newTags });
  };

  const addTag = () => {
    setEditForm({ ...editForm, tags: [...editForm.tags, ''] });
  };

  const removeTag = (index: number) => {
    const newTags = editForm.tags.filter((_, i) => i !== index);
    setEditForm({ ...editForm, tags: newTags });
  };

  // Request handlers
  const handleAcceptRequest = (requestId: string) => {
    const request = requests.find(r => r.id === requestId);
    if (request) {
      // Add to participants
      const newParticipant = {
        id: Date.now().toString(),
        memberId: request.memberId,
        name: request.name,
        profession: request.profession,
        email: request.email,
        avatar: request.avatar,
        skills: request.skills,
        availability: request.availability,
        organization: request.organization
      };
      setParticipants([...participants, newParticipant]);
      
      // Remove from requests
      setRequests(requests.filter(r => r.id !== requestId));
    }
  };

  const handleRejectRequest = (requestId: string) => {
    setRequests(requests.filter(r => r.id !== requestId));
  };

  // Participant handlers
  const handleRemoveParticipant = (participantId: string) => {
    setParticipants(participants.filter(p => p.id !== participantId));
  };

  const handleAwardBadge = (participantId: string) => {
    setSelectedParticipantForBadge(participantId);
    setIsBadgeModalOpen(true);
  };

  const handleAssignBadge = () => {
    // Open badge modal without pre-selecting a participant
    setSelectedParticipantForBadge(null);
    setIsBadgeModalOpen(true);
  };

  const handleBadgeAssignment = (badgeData: any) => {
    console.log('Badge assigned:', badgeData);
    // Badge assignment is handled by the modal's success message
    // Close modal after success message is shown
    setTimeout(() => {
      setIsBadgeModalOpen(false);
      setSelectedParticipantForBadge(null);
    }, 2000); // Close after 2 seconds to allow user to see success message
  };

  // Team management functions
  const handleCreateTeam = () => {
    setIsCreateTeamModalOpen(true);
    setNewTeamForm({
      name: '',
      description: '',
      chiefId: '',
      selectedMembers: []
    });
  };

  const handleEditTeam = (team: any) => {
    setSelectedTeam(team);
    setNewTeamForm({
      name: team.name,
      description: team.description,
      chiefId: team.chiefId,
      selectedMembers: team.members
    });
    setIsEditTeamModalOpen(true);
  };

  const handleViewTeamDetails = (team: any) => {
    setSelectedTeam(team);
    setIsViewTeamModalOpen(true);
  };

  const handleDeleteTeam = (teamId: string) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cette équipe ?')) {
      setTeams(teams.filter(team => team.id !== teamId));
    }
  };

  const handleSaveTeam = () => {
    if (!newTeamForm.name.trim()) {
      alert('Veuillez saisir un nom d\'équipe');
      return;
    }

    if (newTeamForm.selectedMembers.length === 0) {
      alert('Veuillez sélectionner au moins un membre');
      return;
    }

    if (!newTeamForm.chiefId) {
      alert('Veuillez sélectionner un chef d\'équipe');
      return;
    }

    if (!newTeamForm.selectedMembers.includes(newTeamForm.chiefId)) {
      alert('Le chef d\'équipe doit être membre de l\'équipe');
      return;
    }

    const teamData = {
      id: selectedTeam ? selectedTeam.id : Date.now().toString(),
      name: newTeamForm.name,
      number: selectedTeam ? selectedTeam.number : teams.length + 1,
      chiefId: newTeamForm.chiefId,
      members: newTeamForm.selectedMembers,
      description: newTeamForm.description
    };

    if (selectedTeam) {
      // Edit existing team
      setTeams(teams.map(team => team.id === selectedTeam.id ? teamData : team));
      setIsEditTeamModalOpen(false);
    } else {
      // Create new team
      setTeams([...teams, teamData]);
      setIsCreateTeamModalOpen(false);
    }

    setSelectedTeam(null);
  };

  const handleCancelTeamForm = () => {
    setIsCreateTeamModalOpen(false);
    setIsEditTeamModalOpen(false);
    setSelectedTeam(null);
    setMemberSearchTerm('');
    setNewTeamForm({
      name: '',
      description: '',
      chiefId: '',
      selectedMembers: []
    });
  };

  const getParticipantById = (participantId: string) => {
    return participants.find(p => p.id === participantId);
  };

  // const getAvailableParticipants = (excludeTeamId?: string) => {
  //   if (!excludeTeamId) return participants;
    
  //   const team = teams.find(t => t.id === excludeTeamId);
  //   if (!team) return participants;
    
  //   return participants.filter(p => !team.members.includes(p.id));
  // };

  const getFilteredParticipants = () => {
    const available = participants.filter(participant => 
      !newTeamForm.selectedMembers.includes(participant.id)
    );
    
    if (!memberSearchTerm.trim()) {
      return available;
    }
    
    const searchLower = memberSearchTerm.toLowerCase();
    return available.filter(participant => 
      participant.name.toLowerCase().includes(searchLower) ||
      participant.profession.toLowerCase().includes(searchLower)
    );
  };

  // Task management functions
  const handleCreateTask = () => {
    setIsCreateTaskModalOpen(true);
    setNewTaskForm({
      title: '',
      description: '',
      assigneeType: 'individual',
      assigneeId: '',
      startDate: '',
      dueDate: '',
      priority: 'medium'
    });
  };

  const handleEditTask = (task: any) => {
    setSelectedTask(task);
    setNewTaskForm({
      title: task.title,
      description: task.description,
      assigneeType: task.assigneeType,
      assigneeId: task.assigneeId,
      startDate: task.startDate,
      dueDate: task.dueDate,
      priority: task.priority
    });
    setIsEditTaskModalOpen(true);
  };

  const handleSaveTask = () => {
    if (!newTaskForm.title.trim()) {
      alert('Veuillez saisir un titre de tâche');
      return;
    }

    if (!newTaskForm.assigneeId) {
      alert('Veuillez sélectionner un assigné');
      return;
    }

    const assigneeName = newTaskForm.assigneeType === 'team' 
      ? teams.find(t => t.id === newTaskForm.assigneeId)?.name || ''
      : participants.find(p => p.id === newTaskForm.assigneeId)?.name || '';

    const newTask = {
      id: selectedTask ? selectedTask.id : Date.now().toString(),
      title: newTaskForm.title,
      description: newTaskForm.description,
      status: selectedTask ? selectedTask.status : 'todo',
      assigneeType: newTaskForm.assigneeType,
      assigneeId: newTaskForm.assigneeId,
      assigneeName,
      startDate: newTaskForm.startDate,
      dueDate: newTaskForm.dueDate,
      priority: newTaskForm.priority,
      createdAt: selectedTask ? selectedTask.createdAt : new Date().toISOString().split('T')[0],
      createdBy: selectedTask ? selectedTask.createdBy : 'Sophie Martin'
    };

    if (selectedTask) {
      setTasks(tasks.map(task => task.id === selectedTask.id ? newTask : task));
    } else {
      setTasks([...tasks, newTask]);
    }

    handleCancelTaskForm();
  };

  const handleCancelTaskForm = () => {
    setIsCreateTaskModalOpen(false);
    setIsEditTaskModalOpen(false);
    setSelectedTask(null);
    setNewTaskForm({
      title: '',
      description: '',
      assigneeType: 'individual',
      assigneeId: '',
      startDate: '',
      dueDate: '',
      priority: 'medium'
    });
  };

  const handleDeleteTask = (taskId: string) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cette tâche ?')) {
      setTasks(tasks.filter(task => task.id !== taskId));
    }
  };

  const handleTaskDrag = (taskId: string, newStatus: string) => {
    setTasks(tasks.map(task => 
      task.id === taskId ? { ...task, status: newStatus } : task
    ));
  };

  const getTasksByStatus = (status: string) => {
    return tasks.filter(task => task.status === status);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return '#ef4444';
      case 'medium': return '#f59e0b';
      case 'low': return '#10b981';
      default: return '#6b7280';
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'high': return 'Haute';
      case 'medium': return 'Moyenne';
      case 'low': return 'Basse';
      default: return 'Non définie';
    }
  };

  const handleAddParticipant = () => {
    setIsAddParticipantModalOpen(true);
  };

  const handleAddParticipantSubmit = (participantData: {
    id: string;
    memberId: string;
    name: string;
    profession: string;
    email: string;
    avatar: string;
    skills: string[];
    availability: string[];
    organization: string;
  }) => {
    setParticipants([...participants, participantData]);
    setIsAddParticipantModalOpen(false);
  };

  const handleCopyLink = () => {
    const projectUrl = `${window.location.origin}/projects/${project.id}`;
    navigator.clipboard.writeText(projectUrl);
    console.log('Link copied:', projectUrl);
  };

  const handleReturnToProjects = () => {
    setCurrentPage('projects');
  };

  // Photo navigation functions
  const allPhotos = project.image ? [project.image, ...(project.additionalPhotos || [])] : (project.additionalPhotos || []);
  
  const nextPhoto = () => {
    setCurrentPhotoIndex((prev) => (prev + 1) % allPhotos.length);
  };

  const prevPhoto = () => {
    setCurrentPhotoIndex((prev) => (prev - 1 + allPhotos.length) % allPhotos.length);
  };

  const selectPhoto = (index: number) => {
    setCurrentPhotoIndex(index);
  };

  // Format date from ISO string or YYYY-MM-DD to DD-MM-YYYY
  const formatDate = (dateString: string) => {
    // Handle ISO string format
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear().toString().slice(-2); // Get last 2 digits of year
    return `${day}-${month}-${year}`;
  };

  // Toggle comment collapse
  const toggleComment = (badgeId: string) => {
    setCollapsedComments(prev => {
      const newSet = new Set(prev);
      if (newSet.has(badgeId)) {
        newSet.delete(badgeId);
      } else {
        newSet.add(badgeId);
      }
      return newSet;
    });
  };

  // Filter badges based on selected filters
  const getFilteredBadges = () => {
    return state.badgeAttributions
      .filter(attribution => attribution.projectId === project?.id)
      .filter(attribution => {
        // Series filter
        if (badgeSeriesFilter && attribution.badgeSeries !== badgeSeriesFilter) {
          return false;
        }
        
        // Level filter (for TouKouLeur and Audiovisuelle)
        if (badgeLevelFilter && attribution.badgeLevel !== badgeLevelFilter) {
          return false;
        }
        
        // Domain filter (for CPS and Audiovisuelle)
        if (badgeDomainFilter && attribution.domaineEngagement !== badgeDomainFilter) {
          return false;
        }
        
        return true;
      });
  };

  // Get the correct avatar and profession for the project owner
  const getOwnerInfo = (ownerName: string) => {
    const member = mockMembers.find(m => `${m.firstName} ${m.lastName}` === ownerName);
    if (member) {
      return {
        avatar: member.avatar,
        profession: member.profession,
        email: member.email
      };
    }
    // Fallback for unknown owners
    const avatarMap: { [key: string]: string } = {
      'Lucas Bernard': 'https://randomuser.me/api/portraits/men/67.jpg',
      'Marie Dubois': 'https://randomuser.me/api/portraits/women/44.jpg',
      'Sophie Martin': 'https://randomuser.me/api/portraits/women/44.jpg',
      'François Dupont': 'https://randomuser.me/api/portraits/men/32.jpg'
    };
    return {
      avatar: avatarMap[ownerName] || DEFAULT_AVATAR_SRC,
      profession: 'Membre',
      email: 'unknown@example.com'
    };
  };

  return (
    <section className="project-management-container with-sidebar">
      {/* Header with Return Button */}
      <div className="project-management-header">
        <div className="header-left">
          <button 
            className="return-btn" 
            onClick={handleReturnToProjects}
            title="Retour aux projets"
          >
            <i className="fas fa-arrow-left"></i>
          </button>
          <img src="/icons_logo/Icon=projet.svg" alt="Projets" className="section-icon" />
          <h2>Gestion du projet</h2>
        </div>
        <div className="header-right">
          <button type="button" className="btn btn-outline" onClick={handleCopyLink}>
            <i className="fas fa-link"></i> Copier le lien
          </button>
          <button type="button" className="btn btn-primary" onClick={handleAssignBadge}>
            <i className="fas fa-award"></i> Attribuer un badge
          </button>
        </div>
      </div>

      {/* Project Info Section */}
      <div className="project-management-body">
        <div className="project-info-section-redesigned">
          {/* Left Column: Project Image Gallery */}
          <div className="project-image-column">
            <div className="project-cover-large">
              {allPhotos.length > 0 ? (
                <>
                  <img src={allPhotos[currentPhotoIndex]} alt={project.title} />
                  {allPhotos.length > 1 && (
                    <>
                      <button className="photo-nav-btn photo-nav-prev" onClick={prevPhoto}>
                        <i className="fas fa-chevron-left"></i>
                      </button>
                      <button className="photo-nav-btn photo-nav-next" onClick={nextPhoto}>
                        <i className="fas fa-chevron-right"></i>
                      </button>
                      <div className="photo-counter">
                        {currentPhotoIndex + 1} / {allPhotos.length}
                      </div>
                      <div className="photo-gallery-overlay">
                        <div className="gallery-thumbnails">
                          {allPhotos.map((photo, index) => (
                            <button
                              key={index}
                              className={`gallery-thumbnail ${index === currentPhotoIndex ? 'active' : ''}`}
                              onClick={() => selectPhoto(index)}
                            >
                              <img src={photo} alt={`${project.title} ${index + 1}`} />
                            </button>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </>
              ) : (
                <div className="default-project-image">
                  <i className="fas fa-image"></i>
                </div>
              )}
            </div>
          </div>
          
          {/* Right Column: Project Details */}
          <div className="project-details-column">
            {/* Top Part: Title, Status, Actions */}
            <div className="project-details-top">
              <div className="project-title-status-group">
                <h3 className="project-title-large">{project.title}</h3>
                <div className="project-status-pills">
                  <span className={`project-modal-status-pill ${getStatusClass(project.status)}`}>
                    {getStatusText(project.status)}
                  </span>
                </div>
              </div>
              <div className="project-actions-header">
                <button type="button" className="btn-icon edit-btn" onClick={handleEdit} title="Modifier le projet">
                  <i className="fas fa-edit"></i>
                </button>
              </div>
            </div>

            {/* Project Description */}
            <div className="project-description-section">
              <div className={`project-description-content ${isDescriptionExpanded ? 'expanded' : 'collapsed'}`}>
                <p>{project.description}</p>
              </div>
              {project.description.length > 150 && (
                <button 
                  className="description-toggle-btn"
                  onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
                >
                  {isDescriptionExpanded ? (
                    <>
                      <span>Voir moins</span>
                      <i className="fas fa-chevron-up"></i>
                    </>
                  ) : (
                    <>
                      <span>Voir plus</span>
                      <i className="fas fa-chevron-down"></i>
                    </>
                  )}
                </button>
              )}
            </div>

            {/* Middle Part: Meta Info and Tags */}
            <div className="project-details-middle">
              <div className="project-meta-row">
                <div className="meta-item">
                  <img src="/icons_logo/Icon=calendrier petit.svg" alt="Calendar" className="meta-icon" />
                  <span className="meta-text">{formatDate(project.startDate)} - {formatDate(project.endDate)}</span>
                </div>
                <div className="meta-item">
                  <img src="/icons_logo/Icon=Membres.svg" alt="Participants" className="meta-icon" />
                  <span className="meta-text">{project.participants} participants</span>
                </div>
                <div className="meta-item">
                  <img src="/icons_logo/Icon=Badges.svg" alt="Badges" className="meta-icon" />
                  <span className="meta-text">{project.badges} badges</span>
                </div>
              </div>
              <div className="project-tags-row">
                <div className="pathway-section">
                  <div className="section-label">Parcours</div>
                  <div className="pathway-container">
                    <span className={`pathway-pill pathway-${project.pathway}`}>{project.pathway}</span>
                  </div>
                </div>
                <div className="tags-section">
                  <div className="section-label">Tags</div>
                  <div className="project-tags">
                    {project.tags?.map((tag, index) => (
                      <span key={index} className="tag">#{tag}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Part: Project Management Team */}
            <div className="project-details-bottom">
              {/* Responsable du projet */}
              <div className="project-manager-section">
                <div className="project-manager-header">
                  <h4>Responsable du projet</h4>
                </div>
                <div className="project-manager-info">
                  <div className="manager-left">
                    <div className="manager-avatar">
                      <AvatarImage src={project.responsible?.avatar || getOwnerInfo(project.owner).avatar} alt="Project Manager" />
                    </div>
                    <div className="manager-details">
                      <div className="manager-name">{project.responsible?.name || project.owner}</div>
                      <div className="manager-role">{project.responsible?.profession || getOwnerInfo(project.owner).profession}</div>
                    </div>
                  </div>
                  <div className="manager-right">
                    <div className="manager-organization">
                      <img src="/icons_logo/Icon=projet.svg" alt="Organization" className="manager-icon" />
                      <span className="manager-text">{project.responsible?.organization || project.organization}</span>
                    </div>
                    <div className="manager-email">
                      <img src="/icons_logo/Icon=mail.svg" alt="Email" className="manager-icon" />
                      <span className="manager-text">{project.responsible?.email || getOwnerInfo(project.owner).email}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Co-responsables */}
              {project.coResponsibles && project.coResponsibles.length > 0 && (
                <div className="project-co-responsibles-section">
                  <div className="project-manager-header">
                    <h4>Co-responsables</h4>
                  </div>
                  <div className="co-responsibles-list">
                    {project.coResponsibles.map((coResponsible, index) => (
                      <div key={coResponsible.id} className="co-responsible-item">
                        <div className="manager-left">
                          <div className="manager-avatar">
                            <AvatarImage src={coResponsible.avatar} alt={coResponsible.name} />
                          </div>
                          <div className="manager-details">
                            <div className="manager-name">{coResponsible.name}</div>
                            <div className="manager-role">{coResponsible.profession}</div>
                          </div>
                        </div>
                        <div className="manager-right">
                          <div className="manager-organization">
                            <img src="/icons_logo/Icon=projet.svg" alt="Organization" className="manager-icon" />
                            <span className="manager-text">{coResponsible.organization}</span>
                          </div>
                          <div className="manager-email">
                            <img src="/icons_logo/Icon=mail.svg" alt="Email" className="manager-icon" />
                            <span className="manager-text">{coResponsible.email}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Partenaire */}
              {project.partner && (
                <div className="project-partner-section">
                  <div className="project-manager-header">
                    <h4>Partenaire</h4>
                  </div>
                  <div className="project-partner-info">
                    <div className="manager-left">
                      <div className="manager-avatar">
                        <img src={project.partner.logo} alt={project.partner.name} />
                      </div>
                      <div className="manager-details">
                        <div className="manager-name">{project.partner.name}</div>
                        <div className="manager-role">{project.partner.organization}</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Project Management Tabs */}
        <div className="project-management-tabs">
          <button 
            type="button" 
            className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            Vue d'ensemble
          </button>
          <button 
            type="button" 
            className={`tab-btn ${activeTab === 'requests' ? 'active' : ''}`}
            onClick={() => setActiveTab('requests')}
          >
            Demandes
          </button>
          <button 
            type="button" 
            className={`tab-btn ${activeTab === 'participants' ? 'active' : ''}`}
            onClick={() => setActiveTab('participants')}
          >
            Participants
          </button>
          <button 
            type="button" 
            className={`tab-btn ${activeTab === 'equipes' ? 'active' : ''}`}
            onClick={() => setActiveTab('equipes')}
          >
            Équipes
          </button>
          <button 
            type="button" 
            className={`tab-btn ${activeTab === 'kanban' ? 'active' : ''}`}
            onClick={() => setActiveTab('kanban')}
          >
            Kanban
          </button>
          <button 
            type="button" 
            className={`tab-btn ${activeTab === 'badges' ? 'active' : ''}`}
            onClick={() => setActiveTab('badges')}
          >
            Badges
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="tab-content active">
            <div className="overview-grid">
              <div className="stat-card">
                <div className="stat-icon">
                  <i className="fas fa-chart-line"></i>
                </div>
                <div className="stat-content">
                  <div className="stat-value">{project.progress || 0}%</div>
                  <div className="stat-label">Progression</div>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${project.progress || 0}%` }}></div>
                  </div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">
                  <i className="fas fa-clock"></i>
                </div>
                <div className="stat-content">
                  <div className="stat-value">15</div>
                  <div className="stat-label">Jours restants</div>
                  <div className="stat-change positive">Dans les délais</div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">
                  <i className="fas fa-tasks"></i>
                </div>
                <div className="stat-content">
                  <div className="stat-value">12/18</div>
                  <div className="stat-label">Tâches complétées</div>
                  <div className="task-progress">
                    {Array.from({ length: 18 }, (_, i) => (
                      <div key={i} className={`task-bar ${i < 12 ? 'completed' : ''}`}></div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">
                  <i className="fas fa-award"></i>
                </div>
                <div className="stat-content">
                  <div className="stat-value">{project.badges}</div>
                  <div className="stat-label">Badges attribués</div>
                  <div className="stat-change positive">+{Math.floor(project.badges * 0.2)} ce mois</div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">
                  <i className="fas fa-users"></i>
                </div>
                <div className="stat-content">
                  <div className="stat-value">{project.participants}</div>
                  <div className="stat-label">Participants</div>
                  <div className="stat-change positive">+{Math.floor(project.participants * 0.1)} nouveaux</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'participants' && (
          <div className="tab-content">
            <div className="members-section">
              <div className="members-table">
                {participants.map((participant) => (
                  <div key={participant.id} className="member-row">
                    <div className="member-avatar">
                      <AvatarImage src={participant.avatar} alt={participant.name} />
                    </div>
                    <div className="member-info">
                      <div className="member-name">{participant.name}</div>
                      <div className="member-role">{participant.profession}</div>
                    </div>
                    <div className="member-badge badge-admin">Membre</div>
                    <div className="member-skills">
                      {participant.skills.map((skill, idx) => (
                        <span key={idx} className="tag skill">
                          <i className="fas fa-star"></i> {skill}
                        </span>
                      ))}
                    </div>
                    <div className="member-availability">
                      {participant.availability.map((day, idx) => (
                        <span key={idx} className="tag availability">{day}</span>
                      ))}
                    </div>
                    <div className="member-actions">
                      <button 
                        type="button" 
                        className="btn-icon badge-btn" 
                        title="Attribuer un badge"
                        onClick={() => {
                          setSelectedParticipantForBadge(participant.memberId);
                          setIsBadgeModalOpen(true);
                        }}
                      >
                        <img src="/icons_logo/Icon=Badges.svg" alt="Attribuer un badge" className="action-icon" />
                      </button>
                      <button type="button" className="btn-icon" title="Supprimer">
                        <img src="/icons_logo/Icon=trash.svg" alt="Delete" className="action-icon" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'requests' && (
          <div className="tab-content active">
            <div className="requests-section">
              <div className="section-header">
                <h3>Demandes de participation</h3>
                <span className="request-count">{requests.length} demande{requests.length > 1 ? 's' : ''}</span>
              </div>
              
              {requests.length === 0 ? (
                <div className="no-requests">
                  <i className="fas fa-inbox no-requests-icon"></i>
                  <h3>Aucune demande en attente</h3>
                  <p>Toutes les demandes de participation ont été traitées</p>
                </div>
              ) : (
                <div className="requests-grid">
                  {requests.map((request) => (
                    <div key={request.id} className="request-card">
                      <div className="request-header">
                        <div className="request-avatar">
                          <AvatarImage src={request.avatar} alt={request.name} />
                        </div>
                        <div className="request-info">
                          <h4 className="request-name">{request.name}</h4>
                          <p className="request-profession">{request.profession}</p>
                          <p className="request-email">{request.email}</p>
                          <p className="request-date">Demandé le {request.requestDate}</p>
                        </div>
                      </div>
                      
                      <div className="request-skills">
                        <h4>Compétences</h4>
                        <div className="skills-list">
                          {request.skills.map((skill, index) => (
                            <span key={index} className="skill-pill">{skill}</span>
                          ))}
                        </div>
                      </div>
                      
                      <div className="request-availability">
                        <h4>Disponibilités</h4>
                        <div className="availability-list">
                          {request.availability.map((day, index) => (
                            <span key={index} className="availability-pill">{day}</span>
                          ))}
                        </div>
                      </div>
                      
                      <div className="request-actions">
                        <div className="action-buttons">
                          <button 
                            className="btn-accept"
                            onClick={() => handleAcceptRequest(request.id)}
                          >
                            <i className="fas fa-check"></i>
                            Accepter
                          </button>
                          <button 
                            className="btn-reject"
                            onClick={() => handleRejectRequest(request.id)}
                          >
                            <i className="fas fa-times"></i>
                            Rejeter
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'participants' && (
          <div className="tab-content active">
            <div className="participants-section">
              <div className="section-header">
                <h3>Participants du projet</h3>
                <button 
                  className="btn btn-primary btn-sm"
                  onClick={handleAddParticipant}
                >
                  <i className="fas fa-plus"></i>
                  Ajouter un participant
                </button>
              </div>
              
              <div className="participants-table">
                {participants.map((participant) => (
                  <div key={participant.id} className="request-card">
                    <div className="request-header">
                      <div className="request-avatar">
                        <AvatarImage src={participant.avatar} alt={participant.name} />
                      </div>
                        <div className="request-info">
                          <h4 className="request-name">{participant.name}</h4>
                          <p className="request-profession">{participant.profession}</p>
                          <p className="request-email">{participant.email}</p>
                          <p className="request-date">{participant.organization}</p>
                        </div>
                    </div>
                    
                    <div className="request-skills">
                      <h4>Compétences</h4>
                      <div className="skills-list">
                        {participant.skills.map((skill, index) => (
                          <span key={index} className="skill-pill">{skill}</span>
                        ))}
                      </div>
                    </div>
                    
                    <div className="request-availability">
                      <h4>Disponibilités</h4>
                      <div className="availability-list">
                        {participant.availability.map((day, index) => (
                          <span key={index} className="availability-pill">{day}</span>
                        ))}
                      </div>
                    </div>
                    
                    <div className="request-actions">
                      <div className="action-buttons">
                        <button 
                          className="btn-reject"
                          onClick={() => handleRemoveParticipant(participant.id)}
                          title="Retirer du projet"
                        >
                          <i className="fas fa-user-minus"></i>
                          Retirer
                        </button>
                        <button 
                          className="btn-accept"
                          onClick={() => handleAwardBadge(participant.memberId)}
                          title="Attribuer un badge"
                        >
                          <i className="fas fa-award"></i>
                          Badge
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'equipes' && (
          <div className="tab-content active">
            <div className="teams-section">
              <div className="section-header">
                <div className="section-title-left">
                  <img src="/icons_logo/Icon=Membres.svg" alt="Équipes" className="section-icon" />
                  <h3>Gestion des équipes</h3>
                </div>
                <div className="section-actions">
                  <span className="team-count">{teams.length} équipe{teams.length > 1 ? 's' : ''}</span>
                  <button className="btn btn-primary" onClick={handleCreateTeam}>
                    <i className="fas fa-plus"></i>
                    Créer une équipe
                  </button>
                </div>
              </div>

              {teams.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon">
                    <i className="fas fa-users"></i>
                  </div>
                  <h4>Aucune équipe créée</h4>
                  <p>Créez votre première équipe pour organiser vos participants et améliorer la collaboration.</p>
                  <button className="btn btn-primary" onClick={handleCreateTeam}>
                    <i className="fas fa-plus"></i>
                    Créer une équipe
                  </button>
                </div>
              ) : (
                <div className="teams-table-container">
                  <div className="teams-table">
                    <div className="teams-table-header">
                      <div className="team-col-name">Équipe</div>
                      <div className="team-col-chief">Chef d'équipe</div>
                      <div className="team-col-members">Membres</div>
                      <div className="team-col-actions">Actions</div>
                    </div>
                    <div className="teams-table-body">
                      {teams.map((team) => {
                        const chief = getParticipantById(team.chiefId);
                        const teamMembers = team.members.map(memberId => getParticipantById(memberId)).filter(Boolean);
                        
                        return (
                          <div key={team.id} className="team-row">
                            <div className="team-col-name">
                              <div className="team-info">
                                <div className="team-number">Équipe {team.number}</div>
                                <div className="team-name">{team.name}</div>
                              </div>
                            </div>
                            <div className="team-col-chief">
                              {chief ? (
                                <div className="chief-info">
                                  <AvatarImage src={chief.avatar} alt={chief.name} className="chief-avatar" />
                                  <div className="chief-details">
                                    <div className="chief-name">{chief.name}</div>
                                    <div className="chief-role">{chief.profession}</div>
                                  </div>
                                </div>
                              ) : (
                                <span className="no-chief">Non défini</span>
                              )}
                            </div>
                            <div className="team-col-members">
                              <div className="members-display">
                                <div className="members-avatars">
                                  {teamMembers.slice(0, 5).map((member) => member && (
                                    <div key={member.id} className="member-avatar-small" title={member.name}>
                                      <AvatarImage src={member.avatar} alt={member.name} />
                                    </div>
                                  ))}
                                  {teamMembers.length > 5 && (
                                    <div className="member-avatar-small more-members" title={`${teamMembers.length - 5} autres membres`}>
                                      +{teamMembers.length - 5}
                                    </div>
                                  )}
                                </div>
                                <div className="member-count">{teamMembers.length} membre{teamMembers.length > 1 ? 's' : ''}</div>
                              </div>
                            </div>
                            <div className="team-col-actions">
                              <div className="team-actions">
                                <button 
                                  className="btn-icon view-btn" 
                                  title="Voir les détails"
                                  onClick={() => handleViewTeamDetails(team)}
                                >
                                  <i className="fas fa-eye"></i>
                                </button>
                                <button 
                                  className="btn-icon edit-btn" 
                                  title="Modifier l'équipe"
                                  onClick={() => handleEditTeam(team)}
                                >
                                  <i className="fas fa-edit"></i>
                                </button>
                                <button 
                                  className="btn-icon delete-btn" 
                                  title="Supprimer l'équipe"
                                  onClick={() => handleDeleteTeam(team.id)}
                                >
                                  <i className="fas fa-trash"></i>
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}


        {activeTab === 'badges' && (
          <div className="tab-content active">
            <div className="badges-section">
              <div className="badges-section-header">
                <h3>Badges attribués</h3>
                <div className="badge-count">
                  {getFilteredBadges().length} badges
                </div>
              </div>
              
              <div className="badges-filters">
                <div className="filter-group">
                  <label>Par série</label>
                  <select 
                    value={badgeSeriesFilter} 
                    onChange={(e) => {
                      setBadgeSeriesFilter(e.target.value);
                      setBadgeLevelFilter('');
                      setBadgeDomainFilter('');
                    }}
                  >
                    <option value="">Toutes les séries</option>
                    <option value="Série TouKouLeur">TouKouLeur</option>
                    <option value="Série CPS">CPS</option>
                    <option value="Série Audiovisuelle">Audiovisuelle</option>
                  </select>
                </div>
                
                {badgeSeriesFilter === 'Série TouKouLeur' && (
                  <div className="filter-group">
                    <label>Par niveau</label>
                    <select 
                      value={badgeLevelFilter} 
                      onChange={(e) => setBadgeLevelFilter(e.target.value)}
                    >
                      <option value="">Tous les niveaux</option>
                      <option value="1">Niveau 1</option>
                      <option value="2">Niveau 2</option>
                      <option value="3">Niveau 3</option>
                      <option value="4">Niveau 4</option>
                    </select>
                  </div>
                )}
                
                {badgeSeriesFilter === 'Série CPS' && (
                  <div className="filter-group">
                    <label>Par domaine</label>
                    <select 
                      value={badgeDomainFilter} 
                      onChange={(e) => setBadgeDomainFilter(e.target.value)}
                    >
                      <option value="">Tous les domaines</option>
                      <option value="cognitives">Cognitives</option>
                      <option value="emotionnelles">Émotionnelles</option>
                      <option value="sociales">Sociales</option>
                    </select>
                  </div>
                )}
                
                {badgeSeriesFilter === 'Série Audiovisuelle' && (
                  <>
                    <div className="filter-group">
                      <label>Par niveau</label>
                      <select 
                        value={badgeLevelFilter} 
                        onChange={(e) => setBadgeLevelFilter(e.target.value)}
                      >
                        <option value="">Tous les niveaux</option>
                        <option value="1">Niveau 1</option>
                        <option value="2">Niveau 2</option>
                        <option value="3">Niveau 3</option>
                        <option value="4">Niveau 4</option>
                      </select>
                    </div>
                    <div className="filter-group">
                      <label>Par domaine</label>
                      <select 
                        value={badgeDomainFilter} 
                        onChange={(e) => setBadgeDomainFilter(e.target.value)}
                      >
                        <option value="">Tous les domaines</option>
                        <option value="Production">Production</option>
                        <option value="Post-production">Post-production</option>
                        <option value="Diffusion">Diffusion</option>
                        <option value="Gestion">Gestion</option>
                      </select>
                    </div>
                  </>
                )}
              </div>
              
              <div className="badges-list">
                {getFilteredBadges().map((attribution) => (
                    <div key={attribution.id} className="badge-attribution-card">
                      <div className="badge-attribution-header">
                        <div className="badge-image">
                          <img src={attribution.badgeImage} alt={attribution.badgeTitle} />
                          {/* Level pill - bottom left */}
                          {attribution.badgeSeries !== 'Série CPS' && (
                            <span className={`badge-level-pill level-${attribution.badgeLevel || '1'}`}>
                              Niveau {attribution.badgeLevel || '1'}
                            </span>
                          )}
                          {/* Domain pill for CPS - bottom left */}
                          {attribution.badgeSeries === 'Série CPS' && (
                            <span className="badge-domain-pill">
                              Domaine - {attribution.domaineEngagement || 'Cognitives'}
                            </span>
                          )}
                          {/* Series pill - bottom right */}
                          <span className={`badge-series-pill series-${attribution.badgeSeries?.replace('Série ', '').toLowerCase() || 'toukouleur'}`}>
                            {attribution.badgeSeries || 'Série TouKouLeur'}
                          </span>
                        </div>
                        <div className="badge-info">
                          <h4 className="badge-title">{attribution.badgeTitle}</h4>
                          {attribution.badgeSeries !== 'Série CPS' && (
                            <p className="badge-domain">Domaine: {attribution.domaineEngagement}</p>
                          )}
                        </div>
                      </div>
                      
                      <div className="badge-attribution-details">
                        <div className="attribution-info">
                          <div className="attributed-to">
                            <h5>Attribué à:</h5>
                            <div className="person-info">
                              <div className="person-info-header">
                                <img src={attribution.participantAvatar} alt={attribution.participantName} />
                                <span className="person-name">{attribution.participantName}</span>
                              </div>
                              <span className="person-organization">{attribution.participantOrganization}</span>
                            </div>
                          </div>
                          <div className="attributed-by">
                            <h5>Attribué par:</h5>
                            <div className="person-info">
                              <div className="person-info-header">
                                <img src={attribution.attributedByAvatar} alt={attribution.attributedByName} />
                                <span className="person-name">{attribution.attributedByName}</span>
                              </div>
                              <span className="person-organization">{attribution.attributedByOrganization}</span>
                            </div>
                          </div>
                        </div>
                        
                        {attribution.commentaire && (
                          <div className={`badge-comment ${collapsedComments.has(attribution.id) ? 'collapsed' : ''}`}>
                            <h5 onClick={() => toggleComment(attribution.id)}>
                              Commentaire:
                              <span className={`comment-toggle ${collapsedComments.has(attribution.id) ? '' : 'expanded'}`}>
                                <i className="fas fa-chevron-down"></i>
                              </span>
                            </h5>
                            <p>{attribution.commentaire}</p>
                          </div>
                        )}
                        
                        {attribution.preuve && (
                          <div className={`badge-preuve ${collapsedComments.has(`${attribution.id}-preuve`) ? 'collapsed' : ''}`}>
                            <h5 onClick={() => toggleComment(`${attribution.id}-preuve`)}>
                              Preuve:
                              <span className={`comment-toggle ${collapsedComments.has(`${attribution.id}-preuve`) ? '' : 'expanded'}`}>
                                <i className="fas fa-chevron-down"></i>
                              </span>
                            </h5>
                            <div className="file-info">
                              <i className="fas fa-file"></i>
                              <span>{attribution.preuve.name}</span>
                              <small>({attribution.preuve.size})</small>
                            </div>
                          </div>
                        )}
                        
                        <div className="badge-date">
                          <small>Attribué le {formatDate(attribution.dateAttribution)}</small>
                        </div>
                      </div>
                    </div>
                  ))}
                
                {state.badgeAttributions.filter(attribution => 
                  attribution.projectId === project?.id
                ).length === 0 && (
                  <div className="empty-state">
                    <div className="empty-icon">
                      <i className="fas fa-award"></i>
                    </div>
                    <h4>Aucun badge attribué</h4>
                    <p>Les badges attribués dans ce projet apparaîtront ici.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'kanban' && (
          <div className="tab-content active">
            <div className="kanban-section">
              <div className="section-header">
                <div className="section-title-left">
                  <img src="/icons_logo/Icon=Tableau de bord.svg" alt="Kanban" className="section-icon" />
                  <h3>Tableau Kanban</h3>
                </div>
                <div className="section-actions">
                  <button className="btn btn-primary" onClick={handleCreateTask}>
                    <i className="fas fa-plus"></i>
                    Nouvelle tâche
                  </button>
                </div>
              </div>
              <div className="kanban-board">
                <div className="kanban-column">
                  <div className="kanban-column-header">
                    <div className="column-title">
                      <div className="column-color todo"></div>
                      <h4>À faire</h4>
                    </div>
                    <span className="task-count">{getTasksByStatus('todo').length}</span>
                  </div>
                  <div className="kanban-column-content">
                    {getTasksByStatus('todo').length === 0 ? (
                      <div className="empty-column">
                        <i className="fas fa-clipboard-list"></i>
                        <p>Aucune tâche</p>
                      </div>
                    ) : (
                      getTasksByStatus('todo').map((task) => (
                        <div 
                          key={task.id} 
                          className="task-card"
                          draggable
                          onDragStart={(e) => {
                            e.dataTransfer.setData('text/plain', task.id);
                          }}
                        >
                          <div className="task-header">
                            <div className="task-title">{task.title}</div>
                            <div className="task-actions">
                              <button 
                                className="task-action-btn edit-btn"
                                onClick={() => handleEditTask(task)}
                                title="Modifier la tâche"
                              >
                                <i className="fas fa-edit"></i>
                              </button>
                              <button 
                                className="task-action-btn delete-btn"
                                onClick={() => handleDeleteTask(task.id)}
                                title="Supprimer la tâche"
                              >
                                <i className="fas fa-trash"></i>
                              </button>
                            </div>
                          </div>
                          <div className="task-description">{task.description}</div>
                          <div className="task-meta">
                            <div className="task-assignee">
                              <i className="fas fa-user"></i>
                              {task.assigneeName}
                            </div>
                            <div className="task-priority" style={{ color: getPriorityColor(task.priority) }}>
                              <i className="fas fa-flag"></i>
                              {getPriorityLabel(task.priority)}
                            </div>
                          </div>
                          <div className="task-dates">
                            {task.startDate && (
                              <div className="task-date">
                                <i className="fas fa-play"></i>
                                {new Date(task.startDate).toLocaleDateString('fr-FR')}
                              </div>
                            )}
                            {task.dueDate && (
                              <div className="task-date">
                                <i className="fas fa-flag-checkered"></i>
                                {new Date(task.dueDate).toLocaleDateString('fr-FR')}
                              </div>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
                <div className="kanban-column">
                  <div className="kanban-column-header">
                    <div className="column-title">
                      <div className="column-color in-progress"></div>
                      <h4>En cours</h4>
                    </div>
                    <span className="task-count">{getTasksByStatus('in-progress').length}</span>
                  </div>
                  <div 
                    className="kanban-column-content"
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      const taskId = e.dataTransfer.getData('text/plain');
                      handleTaskDrag(taskId, 'in-progress');
                    }}
                  >
                    {getTasksByStatus('in-progress').length === 0 ? (
                      <div className="empty-column">
                        <i className="fas fa-play-circle"></i>
                        <p>Aucune tâche</p>
                      </div>
                    ) : (
                      getTasksByStatus('in-progress').map((task) => (
                        <div 
                          key={task.id} 
                          className="task-card"
                          draggable
                          onDragStart={(e) => {
                            e.dataTransfer.setData('text/plain', task.id);
                          }}
                        >
                          <div className="task-header">
                            <div className="task-title">{task.title}</div>
                            <div className="task-actions">
                              <button 
                                className="task-action-btn edit-btn"
                                onClick={() => handleEditTask(task)}
                                title="Modifier la tâche"
                              >
                                <i className="fas fa-edit"></i>
                              </button>
                              <button 
                                className="task-action-btn delete-btn"
                                onClick={() => handleDeleteTask(task.id)}
                                title="Supprimer la tâche"
                              >
                                <i className="fas fa-trash"></i>
                              </button>
                            </div>
                          </div>
                          <div className="task-description">{task.description}</div>
                          <div className="task-meta">
                            <div className="task-assignee">
                              <i className="fas fa-user"></i>
                              {task.assigneeName}
                            </div>
                            <div className="task-priority" style={{ color: getPriorityColor(task.priority) }}>
                              <i className="fas fa-flag"></i>
                              {getPriorityLabel(task.priority)}
                            </div>
                          </div>
                          <div className="task-dates">
                            {task.startDate && (
                              <div className="task-date">
                                <i className="fas fa-play"></i>
                                {new Date(task.startDate).toLocaleDateString('fr-FR')}
                              </div>
                            )}
                            {task.dueDate && (
                              <div className="task-date">
                                <i className="fas fa-flag-checkered"></i>
                                {new Date(task.dueDate).toLocaleDateString('fr-FR')}
                              </div>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
                <div className="kanban-column">
                  <div className="kanban-column-header">
                    <div className="column-title">
                      <div className="column-color completed"></div>
                      <h4>Terminé</h4>
                    </div>
                    <span className="task-count">{getTasksByStatus('completed').length}</span>
                  </div>
                  <div 
                    className="kanban-column-content"
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      const taskId = e.dataTransfer.getData('text/plain');
                      handleTaskDrag(taskId, 'completed');
                    }}
                  >
                    {getTasksByStatus('completed').length === 0 ? (
                      <div className="empty-column">
                        <i className="fas fa-check-circle"></i>
                        <p>Aucune tâche</p>
                      </div>
                    ) : (
                      getTasksByStatus('completed').map((task) => (
                        <div 
                          key={task.id} 
                          className="task-card"
                          draggable
                          onDragStart={(e) => {
                            e.dataTransfer.setData('text/plain', task.id);
                          }}
                        >
                          <div className="task-header">
                            <div className="task-title">{task.title}</div>
                            <div className="task-actions">
                              <button 
                                className="task-action-btn edit-btn"
                                onClick={() => handleEditTask(task)}
                                title="Modifier la tâche"
                              >
                                <i className="fas fa-edit"></i>
                              </button>
                              <button 
                                className="task-action-btn delete-btn"
                                onClick={() => handleDeleteTask(task.id)}
                                title="Supprimer la tâche"
                              >
                                <i className="fas fa-trash"></i>
                              </button>
                            </div>
                          </div>
                          <div className="task-description">{task.description}</div>
                          <div className="task-meta">
                            <div className="task-assignee">
                              <i className="fas fa-user"></i>
                              {task.assigneeName}
                            </div>
                            <div className="task-priority" style={{ color: getPriorityColor(task.priority) }}>
                              <i className="fas fa-flag"></i>
                              {getPriorityLabel(task.priority)}
                            </div>
                          </div>
                          <div className="task-dates">
                            {task.startDate && (
                              <div className="task-date">
                                <i className="fas fa-play"></i>
                                {new Date(task.startDate).toLocaleDateString('fr-FR')}
                              </div>
                            )}
                            {task.dueDate && (
                              <div className="task-date">
                                <i className="fas fa-flag-checkered"></i>
                                {new Date(task.dueDate).toLocaleDateString('fr-FR')}
                              </div>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* Edit Project Modal */}
      {isEditModalOpen && (
        <div className="modal-overlay" onClick={handleCancelEdit}>
          <div className="modal-content edit-project-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Modifier le projet</h3>
              <button className="modal-close" onClick={handleCancelEdit}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            
            <div className="modal-body">
              <div className="form-group">
                <label htmlFor="project-title">Titre du projet</label>
                <input
                  type="text"
                  id="project-title"
                  value={editForm.title}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                  className="form-input"
                  placeholder="Entrez le titre du projet"
                />
              </div>

              <div className="form-group">
                <label htmlFor="project-description">Description du projet</label>
                <textarea
                  id="project-description"
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  className="form-textarea"
                  rows={4}
                  placeholder="Entrez la description du projet"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="project-start-date">Date de début</label>
                  <input
                    type="date"
                    id="project-start-date"
                    value={editForm.startDate}
                    onChange={(e) => setEditForm({ ...editForm, startDate: e.target.value })}
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="project-end-date">Date de fin</label>
                  <input
                    type="date"
                    id="project-end-date"
                    value={editForm.endDate}
                    onChange={(e) => setEditForm({ ...editForm, endDate: e.target.value })}
                    className="form-input"
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="project-pathway">Parcours</label>
                <select
                  id="project-pathway"
                  value={editForm.pathway}
                  onChange={(e) => setEditForm({ ...editForm, pathway: e.target.value })}
                  className="form-input"
                >
                  <option value="sante">Santé</option>
                  <option value="eac">EAC</option>
                  <option value="citoyen">Citoyen</option>
                  <option value="creativite">Créativité</option>
                  <option value="avenir">Avenir</option>
                </select>
              </div>

              <div className="form-group">
                <label>Tags du projet</label>
                <div className="tags-input-container">
                  {editForm.tags.map((tag, index) => (
                    <div key={index} className="tag-input-row">
                      <input
                        type="text"
                        value={tag}
                        onChange={(e) => handleTagChange(index, e.target.value)}
                        className="form-input tag-input"
                        placeholder="Entrez un tag"
                      />
                      <button
                        type="button"
                        className="btn-icon remove-tag-btn"
                        onClick={() => removeTag(index)}
                        title="Supprimer ce tag"
                      >
                        <i className="fas fa-times"></i>
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    className="btn btn-outline add-tag-btn"
                    onClick={addTag}
                  >
                    <i className="fas fa-plus"></i>
                    Ajouter un tag
                  </button>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-outline" onClick={handleCancelEdit}>
                Annuler
              </button>
              <button className="btn btn-primary" onClick={handleSaveEdit}>
                Sauvegarder
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Participant Modal */}
      {isAddParticipantModalOpen && (
        <AddParticipantModal
          onClose={() => setIsAddParticipantModalOpen(false)}
          onAdd={handleAddParticipantSubmit}
          existingParticipants={participants}
        />
      )}

      {isBadgeModalOpen && (
        <BadgeAssignmentModal
          onClose={() => {
            setIsBadgeModalOpen(false);
            setSelectedParticipantForBadge(null);
          }}
          onAssign={handleBadgeAssignment}
          participants={participants.map(p => ({
            id: p.id,
            memberId: p.memberId,
            name: p.name,
            avatar: p.avatar,
            organization: p.organization
          }))}
          preselectedParticipant={selectedParticipantForBadge}
          projectId={project?.id}
          projectTitle={project?.title}
        />
      )}

      {/* Team Creation/Edit Modal */}
      {(isCreateTeamModalOpen || isEditTeamModalOpen) && (
        <div className="modal-overlay">
          <div className="modal-content team-modal">
            <div className="modal-header">
              <h3>{selectedTeam ? 'Modifier l\'équipe' : 'Créer une équipe'}</h3>
              <button className="modal-close" onClick={handleCancelTeamForm}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            
            <div className="modal-body">
              <div className="form-group">
                <label htmlFor="teamName">Nom de l'équipe *</label>
                <input
                  type="text"
                  id="teamName"
                  className="form-input"
                  value={newTeamForm.name}
                  onChange={(e) => setNewTeamForm({...newTeamForm, name: e.target.value})}
                  placeholder="Ex: Équipe Marketing, Équipe Technique..."
                />
              </div>

              <div className="form-group">
                <label htmlFor="teamDescription">Description</label>
                <textarea
                  id="teamDescription"
                  className="form-textarea"
                  value={newTeamForm.description}
                  onChange={(e) => setNewTeamForm({...newTeamForm, description: e.target.value})}
                  placeholder="Décrivez le rôle et les responsabilités de cette équipe..."
                  rows={3}
                />
              </div>

              <div className="form-group">
                <label>Chef d'équipe *</label>
                <div className="compact-selection">
                  <div className="search-input-container">
                    <i className="fas fa-search search-icon"></i>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Rechercher un chef d'équipe..."
                      value={memberSearchTerm}
                      onChange={(e) => setMemberSearchTerm(e.target.value)}
                    />
                  </div>
                  {newTeamForm.chiefId && (
                    <div className="selected-item">
                      {(() => {
                        const selected = participants.find(p => p.id === newTeamForm.chiefId);
                        return selected ? (
                          <div className="selected-member">
                            <AvatarImage src={selected.avatar} alt={selected.name} className="selected-avatar" />
                            <div className="selected-info">
                              <div className="selected-name">{selected.name}</div>
                              <div className="selected-role">{selected.profession}</div>
                            </div>
                            <button 
                              type="button" 
                              className="remove-selection"
                              onClick={() => setNewTeamForm({...newTeamForm, chiefId: ''})}
                            >
                              <i className="fas fa-times"></i>
                            </button>
                          </div>
                        ) : null;
                      })()}
                    </div>
                  )}
                  <div className="selection-list">
                    {getFilteredParticipants().slice(0, 3).map((participant) => (
                      <div 
                        key={participant.id} 
                        className="selection-item"
                        onClick={() => setNewTeamForm({...newTeamForm, chiefId: participant.id})}
                      >
                        <AvatarImage src={participant.avatar} alt={participant.name} className="item-avatar" />
                        <div className="item-info">
                          <div className="item-name">{participant.name}</div>
                          <div className="item-role">{participant.profession}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label>Membres de l'équipe *</label>
                <div className="compact-selection">
                  <div className="search-input-container">
                    <i className="fas fa-search search-icon"></i>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Rechercher des membres..."
                      value={memberSearchTerm}
                      onChange={(e) => setMemberSearchTerm(e.target.value)}
                    />
                  </div>
                  {newTeamForm.selectedMembers.length > 0 && (
                    <div className="selected-items">
                      {newTeamForm.selectedMembers.map((memberId) => {
                        const member = participants.find(p => p.id === memberId);
                        return member ? (
                          <div key={memberId} className="selected-member">
                            <AvatarImage src={member.avatar} alt={member.name} className="selected-avatar" />
                            <div className="selected-info">
                              <div className="selected-name">{member.name}</div>
                              <div className="selected-role">{member.profession}</div>
                            </div>
                            <button 
                              type="button" 
                              className="remove-selection"
                              onClick={() => {
                                setNewTeamForm({
                                  ...newTeamForm,
                                  selectedMembers: newTeamForm.selectedMembers.filter(id => id !== memberId),
                                  chiefId: newTeamForm.chiefId === memberId ? '' : newTeamForm.chiefId
                                });
                              }}
                            >
                              <i className="fas fa-times"></i>
                            </button>
                          </div>
                        ) : null;
                      })}
                    </div>
                  )}
                  <div className="selection-list">
                    {getFilteredParticipants().slice(0, 3).map((participant) => (
                      <div 
                        key={participant.id} 
                        className="selection-item"
                        onClick={() => {
                          if (!newTeamForm.selectedMembers.includes(participant.id)) {
                            setNewTeamForm({
                              ...newTeamForm,
                              selectedMembers: [...newTeamForm.selectedMembers, participant.id]
                            });
                          }
                        }}
                      >
                        <AvatarImage src={participant.avatar} alt={participant.name} className="item-avatar" />
                        <div className="item-info">
                          <div className="item-name">{participant.name}</div>
                          <div className="item-role">{participant.profession}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-outline" onClick={handleCancelTeamForm}>
                Annuler
              </button>
              <button className="btn btn-primary" onClick={handleSaveTeam}>
                {selectedTeam ? 'Modifier l\'équipe' : 'Créer l\'équipe'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Team Details Modal */}
      {isViewTeamModalOpen && selectedTeam && (
        <div className="modal-overlay">
          <div className="modal-content team-details-modal">
            <div className="modal-header">
              <h3>Détails de l'équipe</h3>
              <button className="modal-close" onClick={() => setIsViewTeamModalOpen(false)}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="modal-body">
              <div className="team-details-content">
                <div className="team-details-header">
                  <div className="team-details-info">
                    <h4>{selectedTeam.name}</h4>
                    <span className="team-number-badge">Équipe {selectedTeam.number}</span>
                  </div>
                </div>
                
                {selectedTeam.description && (
                  <div className="team-details-section">
                    <h5>Description</h5>
                    <p>{selectedTeam.description}</p>
                  </div>
                )}
                
                <div className="team-details-section">
                  <h5>Chef d'équipe</h5>
                  {(() => {
                    const chief = getParticipantById(selectedTeam.chiefId);
                    return chief ? (
                      <div className="chief-detail-card">
                        <AvatarImage src={chief.avatar} alt={chief.name} className="chief-detail-avatar" />
                        <div className="chief-detail-info">
                          <div className="chief-detail-name">{chief.name}</div>
                          <div className="chief-detail-role">{chief.profession}</div>
                          <div className="chief-detail-email">{chief.email}</div>
                        </div>
                      </div>
                    ) : (
                      <span className="no-chief">Non défini</span>
                    );
                  })()}
                </div>
                
                <div className="team-details-section">
                  <h5>Membres de l'équipe ({selectedTeam.members.length})</h5>
                  <div className="team-members-grid">
                    {selectedTeam.members.map((memberId: string) => {
                      const member = getParticipantById(memberId);
                      return member ? (
                        <div key={memberId} className="member-detail-card">
                          <AvatarImage src={member.avatar} alt={member.name} className="member-detail-avatar" />
                          <div className="member-detail-info">
                            <div className="member-detail-name">{member.name}</div>
                            <div className="member-detail-role">{member.profession}</div>
                            <div className="member-detail-email">{member.email}</div>
                          </div>
                        </div>
                      ) : null;
                    })}
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setIsViewTeamModalOpen(false)}>
                Fermer
              </button>
              <button className="btn btn-primary" onClick={() => {
                setIsViewTeamModalOpen(false);
                handleEditTeam(selectedTeam);
              }}>
                <i className="fas fa-edit"></i>
                Modifier l'équipe
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Task Creation/Edit Modal */}
      {(isCreateTaskModalOpen || isEditTaskModalOpen) && (
        <div className="modal-overlay">
          <div className="modal-content task-modal">
            <div className="modal-header">
              <h3>{selectedTask ? 'Modifier la tâche' : 'Créer une tâche'}</h3>
              <button className="modal-close" onClick={handleCancelTaskForm}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label htmlFor="taskTitle">Titre de la tâche *</label>
                <input
                  type="text"
                  id="taskTitle"
                  className="form-input"
                  value={newTaskForm.title}
                  onChange={(e) => setNewTaskForm({...newTaskForm, title: e.target.value})}
                  placeholder="Ex: Développement de la fonctionnalité X"
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="taskDescription">Description</label>
                <textarea
                  id="taskDescription"
                  className="form-textarea"
                  value={newTaskForm.description}
                  onChange={(e) => setNewTaskForm({...newTaskForm, description: e.target.value})}
                  placeholder="Décrivez les détails de cette tâche..."
                  rows={3}
                />
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label>Type d'assignation *</label>
                  <select
                    className="form-select"
                    value={newTaskForm.assigneeType}
                    onChange={(e) => setNewTaskForm({...newTaskForm, assigneeType: e.target.value, assigneeId: ''})}
                  >
                    <option value="individual">Participant individuel</option>
                    <option value="team">Équipe</option>
                  </select>
                </div>
                
                <div className="form-group">
                  <label>Assigné à *</label>
                  <select
                    className="form-select"
                    value={newTaskForm.assigneeId}
                    onChange={(e) => setNewTaskForm({...newTaskForm, assigneeId: e.target.value})}
                  >
                    <option value="">Sélectionner un assigné</option>
                    {newTaskForm.assigneeType === 'team' ? (
                      teams.map((team) => (
                        <option key={team.id} value={team.id}>
                          {team.name}
                        </option>
                      ))
                    ) : (
                      participants.map((participant) => (
                        <option key={participant.id} value={participant.id}>
                          {participant.name} - {participant.profession}
                        </option>
                      ))
                    )}
                  </select>
                </div>
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="taskStartDate">Date de début</label>
                  <input
                    type="date"
                    id="taskStartDate"
                    className="form-input"
                    value={newTaskForm.startDate}
                    onChange={(e) => setNewTaskForm({...newTaskForm, startDate: e.target.value})}
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="taskDueDate">Date d'échéance</label>
                  <input
                    type="date"
                    id="taskDueDate"
                    className="form-input"
                    value={newTaskForm.dueDate}
                    onChange={(e) => setNewTaskForm({...newTaskForm, dueDate: e.target.value})}
                  />
                </div>
              </div>
              
              <div className="form-group">
                <label>Priorité</label>
                <select
                  className="form-select"
                  value={newTaskForm.priority}
                  onChange={(e) => setNewTaskForm({...newTaskForm, priority: e.target.value})}
                >
                  <option value="low">Basse</option>
                  <option value="medium">Moyenne</option>
                  <option value="high">Haute</option>
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={handleCancelTaskForm}>
                Annuler
              </button>
              <button className="btn btn-primary" onClick={handleSaveTask}>
                {selectedTask ? 'Modifier la tâche' : 'Créer la tâche'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default ProjectManagement;
