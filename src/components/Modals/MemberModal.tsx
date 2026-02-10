import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../context/AppContext';
import { mockBadges } from '../../data/mockData';
import { Badge, Member } from '../../types';
import RolePill from '../UI/RolePill';
import QRCodePrintModal from './QRCodePrintModal';
import './Modal.css';
import AvatarImage from '../UI/AvatarImage';
import { translateRoles, translateRole, normalizeRoleKey } from '../../utils/roleTranslations';
import { translateSkill, translateSubSkill, SKILLS_FR, SUB_SKILLS_FR } from '../../translations/skills';
import { getLocalBadgeImage } from '../../utils/badgeImages';

interface MemberModalProps {
  member: Member;
  onClose: () => void;
  onUpdate: (updates: Partial<Member>) => void;
  onDelete: () => void;
  onContactClick: () => void;
  hideDeleteButton?: boolean; // Option to hide delete button and permissions (for network members)
  hideEditButton?: boolean; // Option to hide edit button (for network members)
  isSuperadmin?: boolean; // Hide delete button for superadmins
  badgeCartographyUrl?: string; // Optional URL for badge cartography
  hasBadges?: boolean; // When true, show Cartographie entry even while URL is loading (Élèves tab)
  isCartographyLoading?: boolean; // When true, show "Cartographie (chargement…)" instead of link
}

const MemberModal: React.FC<MemberModalProps> = ({
  member,
  onClose,
  onUpdate,
  onDelete,
  onContactClick,
  hideDeleteButton = false,
  hideEditButton = false,
  isSuperadmin = false,
  badgeCartographyUrl,
  hasBadges = false,
  isCartographyLoading = false
}) => {
  const { state } = useAppContext();
  const displayRoles = translateRoles(member.roles);
  // Profession should be the actual job, not translated system role
  const professionLabel = member.profession || '';

  // Helper function to translate skill (tries main skill first, then sub-skill)
  const translateSkillName = (skillName: string): string => {
    const translated = translateSkill(skillName);
    // If translation found (different from original), return it
    if (translated !== skillName) {
      return translated;
    }
    // Otherwise try sub-skill translation
    return translateSubSkill(skillName);
  };

  // Helper function to separate and organize skills
  const organizeSkills = (skills: string[]) => {
    const mainSkillsSet = new Set<string>();
    const subSkills: string[] = [];

    skills.forEach(skill => {
      // Check if it's a main skill
      if (SKILLS_FR[skill]) {
        mainSkillsSet.add(skill);
      } 
      // Check if it's a sub-skill
      else if (SUB_SKILLS_FR[skill]) {
        subSkills.push(skill);
      }
      // If not in either, treat as main skill (fallback)
      else {
        mainSkillsSet.add(skill);
      }
    });

    return {
      mainSkills: Array.from(mainSkillsSet),
      subSkills: subSkills
    };
  };

  // Helper functions for badge data
  const getLevelName = (level: string): string => {
    const levelNames: { [key: string]: string } = {
      '1': 'Découverte',
      '2': 'Application',
      '3': 'Maîtrise',
      '4': 'Expertise'
    };
    return levelNames[level] || 'Découverte';
  };

  const getBadgeDescription = (title: string, series: string, level: string): string => {
    // Common descriptions for TouKouLeur badges
    const descriptions: { [key: string]: string } = {
      'Adaptabilité': 'CAPACITÉ À PRENDRE EN COMPTE LES CONTRAINTES, LES ALÉAS ET LES OPPORTUNITÉS CONTEXTUELS DANS LA POURSUITE D\'UN OBJECTIF.',
      'Créativité': 'CAPACITÉ À PROPOSER DE NOUVELLES SOLUTIONS, DES APPROCHES ORIGINALES ET DES INNOVATIONS POUR RÉSOUDRE DES PROBLÈMES COMPLEXES.',
      'Communication': 'CAPACITÉ À TRANSMETTRE DES INFORMATIONS DE MANIÈRE CLAIRE, PRÉCISE ET ADAPTÉE AU CONTEXTE ET AUX INTERLOCUTEURS.',
      'Coopération': 'CAPACITÉ À TRAVAILLER EN ÉQUIPE, À COLLABORER EFFICACEMENT ET À CONTRIBUER À L\'ATTEINTE D\'OBJECTIFS COLLECTIFS.',
      'Engagement': 'CAPACITÉ À S\'INVESTIR PLEINEMENT DANS UNE ACTIVITÉ, UN PROJET OU UNE CAUSE AVEC DÉTERMINATION ET PERSÉVÉRANCE.',
      'Esprit Critique': 'CAPACITÉ À ANALYSER, ÉVALUER ET QUESTIONNER LES INFORMATIONS, LES ARGUMENTS ET LES SITUATIONS DE MANIÈRE OBJECTIVE.',
      'Formation': 'CAPACITÉ À ACQUÉRIR DE NOUVELLES CONNAISSANCES ET COMPÉTENCES DE MANIÈRE AUTONOME ET CONTINUE.',
      'Gestion de Projet': 'CAPACITÉ À PLANIFIER, ORGANISER ET PILOTER UN PROJET DE SA CONCEPTION À SA RÉALISATION.',
      'Information Numérique': 'CAPACITÉ À UTILISER LES OUTILS NUMÉRIQUES DE MANIÈRE EFFICACE ET RESPONSABLE POUR RECHERCHER, TRAITER ET PARTAGER DES INFORMATIONS.',
      'Organisation Opérationnelle': 'CAPACITÉ À ORGANISER ET OPTIMISER LES PROCESSUS ET LES RESSOURCES POUR ATTEINDRE DES OBJECTIFS EFFICACEMENT.',
      'Sociabilité': 'CAPACITÉ À ÉTABLIR ET MAINTENIR DES RELATIONS POSITIVES AVEC AUTRUI DANS DIFFÉRENTS CONTEXTES SOCIAUX.'
    };
    return descriptions[title] || 'BADGE ATTRIBUÉ POUR RECONNAÎTRE LES COMPÉTENCES DÉVELOPPÉES DANS CE DOMAINE.';
  };
  // const [showAllBadges, setShowAllBadges] = useState(false);
  const [expandedDescriptions, setExpandedDescriptions] = useState<{ [key: string]: boolean }>({});
  const [showAllBadgeGroups, setShowAllBadgeGroups] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showQRCodeModal, setShowQRCodeModal] = useState(false);
  const [editedMember, setEditedMember] = useState({
    firstName: member.firstName,
    lastName: member.lastName,
    email: member.email,
    profession: member.profession,
    skills: [...member.skills],
    availability: [...member.availability]
  });
  const hasRoleLabel = (label: string) => displayRoles.includes(label);

  const [permissions, setPermissions] = useState({
    members: hasRoleLabel('Admin'),
    projects: hasRoleLabel('Admin') || hasRoleLabel('Référent'),
    badges: hasRoleLabel('Admin') || hasRoleLabel('Référent') || hasRoleLabel('Intervenant'),
    events: hasRoleLabel('Admin') || hasRoleLabel('Référent')
  });
  const [proposals, setProposals] = useState({
    canProposeStage: member.canProposeStage || false,
    canProposeAtelier: member.canProposeAtelier || false
  });

  // Update proposals when member prop changes
  useEffect(() => {
    setProposals({
      canProposeStage: member.canProposeStage || false,
      canProposeAtelier: member.canProposeAtelier || false
    });
  }, [member.canProposeStage, member.canProposeAtelier]);

  // const BADGES_LIMIT = 6; // Show only 6 badges initially

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'Admin': return 'role-admin';
      case 'Référent': return 'role-referent';
      case 'Membre': return 'role-membre';
      case 'Intervenant': return 'role-intervenant';
      default: return 'role-membre';
    }
  };

  // Check if member is a student (élève)
  const isStudent = () => {
    const roleCandidates = [
      ...(member.roles || []),
      member.role,
      (member as any).systemRole,
      (member as any).rawRole
    ].filter(Boolean) as string[];

    const isRoleStudent = roleCandidates.some(role => {
      const normalized = normalizeRoleKey(role);
      return (
        normalized.includes('eleve') ||
        normalized.includes('student') ||
        normalized.includes('etudiant') ||
        normalized.includes('collegien') ||
        normalized.includes('lyceen')
      );
    });

    return isRoleStudent || member.hasTemporaryEmail;
  };

  const toggleDescriptionExpansion = (badgeKey: string) => {
    setExpandedDescriptions(prev => ({
      ...prev,
      [badgeKey]: !prev[badgeKey]
    }));
  };

  const handlePermissionChange = (permission: keyof typeof permissions) => {
    setPermissions(prev => ({
      ...prev,
      [permission]: !prev[permission]
    }));
  };

  const handleProposalChange = (proposal: keyof typeof proposals) => {
    setProposals(prev => ({
      ...prev,
      [proposal]: !prev[proposal]
    }));
  };

  const handleEditToggle = () => {
    if (isEditing) {
      // Reset to original values when canceling
      setEditedMember({
        firstName: member.firstName,
        lastName: member.lastName,
        email: member.email,
        profession: member.profession,
        skills: [...member.skills],
        availability: [...member.availability]
      });
    }
    setIsEditing(!isEditing);
  };

  const handleSave = () => {
    onUpdate({
      firstName: editedMember.firstName,
      lastName: editedMember.lastName,
      email: editedMember.email,
      profession: editedMember.profession,
      skills: editedMember.skills,
      availability: editedMember.availability,
      canProposeStage: proposals.canProposeStage,
      canProposeAtelier: proposals.canProposeAtelier
    });
    setIsEditing(false);
  };

  const handleFieldChange = (field: string, value: string) => {
    setEditedMember(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleAddSkill = () => {
    const newSkill = prompt('Ajouter une compétence:');
    if (newSkill && newSkill.trim() && !editedMember.skills.includes(newSkill.trim())) {
      setEditedMember(prev => ({
        ...prev,
        skills: [...prev.skills, newSkill.trim()]
      }));
    }
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    setEditedMember(prev => ({
      ...prev,
      skills: prev.skills.filter(skill => skill !== skillToRemove)
    }));
  };

  const handleAddAvailability = () => {
    const newAvailability = prompt('Ajouter une disponibilité:');
    if (newAvailability && newAvailability.trim() && !editedMember.availability.includes(newAvailability.trim())) {
      setEditedMember(prev => ({
        ...prev,
        availability: [...prev.availability, newAvailability.trim()]
      }));
    }
  };

  const handleRemoveAvailability = (availabilityToRemove: string) => {
    setEditedMember(prev => ({
      ...prev,
      availability: prev.availability.filter(avail => avail !== availabilityToRemove)
    }));
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content member-management-content" onClick={(e) => e.stopPropagation()}>

        <div className="flex relative gap-4 items-start modal-header">
        <button className="modal-close" onClick={onClose}>
            <i className="fas fa-times"></i>
          </button>
          {/* block avatar , trusted badge */}
          <div className="flex relative justify-start items-center">
            <div className="border-2 member-avatar-large border-primary">
            <AvatarImage src={member.avatar} className="object-cover w-full h-full" alt={`${member.firstName} ${member.lastName}`} />
            </div>
            {member.isTrusted && (
              <div className="right-0 top-10 trusted-badge-large">
                <i className="fas fa-shield-alt"></i>
              </div>
            )}
          </div>
          {/* block name, profession, roles */}
          <div className="flex flex-col gap-2 member-details">
            <h2 className="member-name">{member.firstName} {member.lastName}</h2>
            <p className="">{professionLabel}</p>
            <div className="">
              {displayRoles.map((role, index) => (
                <RolePill key={index} role={role} color={getRoleColor(role)} />
              ))}
            </div>

          </div>
          {/* block actions */}
          <div className="flex flex-wrap gap-2 items-center">
            {isStudent() && member.claim_token && (
              <button
                className="btn btn-outline btn-sm"
                onClick={() => {
                  setShowQRCodeModal(true)
                }}
                title="Afficher le QR Code d'activation"
              >
                <i className="fas fa-qrcode"></i>
                QR Code
              </button>
            )}
            {isStudent() && (badgeCartographyUrl || hasBadges) && (
              badgeCartographyUrl ? (
                <a
                  href={badgeCartographyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-outline btn-sm"
                  onClick={(e) => {
                    e.stopPropagation();
                  }}
                  title="Voir la cartographie des badges"
                >
                  <i className="fas fa-map"></i>
                  Cartographie
                </a>
              ) : (
                <span
                  className="btn btn-outline btn-sm"
                  title="Voir la cartographie des badges"
                  style={{ opacity: 0.8, cursor: 'default' }}
                >
                  <i className="fas fa-map"></i>
                  Cartographie (chargement…)
                </span>
              )
            )}
            {hideDeleteButton ? (
              <button 
                className="btn btn-outline btn-sm" 
                onClick={async () => {
                  if (member.email) {
                    try {
                      await navigator.clipboard.writeText(member.email);
                      alert('Email copié dans le presse-papiers');
                    } catch (err) {
                      console.error('Failed to copy email:', err);
                      // Fallback for older browsers
                      const textArea = document.createElement('textarea');
                      textArea.value = member.email;
                      document.body.appendChild(textArea);
                      textArea.select();
                      document.execCommand('copy');
                      document.body.removeChild(textArea);
                      alert('Email copié dans le presse-papiers');
                    }
                  }
                }}
              >
                <i className="fas fa-copy"></i>
                Copier l'email
              </button>
            ) : (
              <a
              href={`mailto:${member.email}`}
              className="btn btn-outline btn-sm"
              onClick={(e) => {
                e.stopPropagation();
              }}
            >
              <i className="fas fa-envelope"></i>
              Contacter
            </a>
            )}
            {!hideDeleteButton && !isSuperadmin && (
              <button className="btn btn-outline btn-sm" onClick={onDelete}>
                <i className="fas fa-trash"></i>
                Supprimer
              </button>
            )}
          </div>


        </div>
        {showQRCodeModal && member.claim_token ? (
          <div className="modal-body">
            <QRCodePrintModal
              onClose={() => setShowQRCodeModal(false)}
              claimToken={member.claim_token || ''}
              studentName={member.fullName || `${member.firstName} ${member.lastName}`}
            />
          </div>
        ) : (
          <>
            <div className="modal-body">
              <div className="member-info-grid">
                <div className="info-section">
                  <h3>Informations personnelles</h3>
                  <div className="info-item">
                    <label>Prénom:</label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editedMember.firstName}
                        onChange={(e) => handleFieldChange('firstName', e.target.value)}
                        className="edit-input"
                      />
                    ) : (
                      <span>{member.firstName}</span>
                    )}
                  </div>
                  <div className="info-item">
                    <label>Nom:</label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editedMember.lastName}
                        onChange={(e) => handleFieldChange('lastName', e.target.value)}
                        className="edit-input"
                      />
                    ) : (
                      <span>{member.lastName}</span>
                    )}
                  </div>
                  <div className="info-item">
                    <label>Email:</label>
                    {isEditing ? (
                      <input
                        type="email"
                        value={editedMember.email}
                        onChange={(e) => handleFieldChange('email', e.target.value)}
                        className="edit-input"
                      />
                    ) : (
                      <span>{member.email}</span>
                    )}
                  </div>
                  <div className="info-item">
                    <label>Profession:</label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editedMember.profession}
                        onChange={(e) => handleFieldChange('profession', e.target.value)}
                        className="edit-input"
                      />
                    ) : (
                      <span>{professionLabel}</span>
                    )}
                  </div>
                </div>

                {/* Compétences Section - hidden for members with temporary email */}
                {!member.hasTemporaryEmail && (
                <div className="info-section">
                  <h3>Compétences</h3>
                  {(() => {
                    const skillsToDisplay = isEditing ? editedMember.skills : member.skills;
                    const { mainSkills, subSkills } = organizeSkills(skillsToDisplay);
                    return (
                      <>
                        <div className="skills-grid">
                          {mainSkills.length === 0 && subSkills.length === 0 ? (
                            <p className="w-full text-center no-badges">Aucune compétence renseignée</p>
                          ) : (
                            mainSkills.map((skill, index) => (
                              <span key={index} className="skill-tag">
                                {translateSkill(skill)}
                                {isEditing && (
                                  <button
                                    className="remove-tag-btn"
                                    onClick={() => handleRemoveSkill(skill)}
                                    title="Supprimer cette compétence"
                                  >
                                    <i className="fas fa-times"></i>
                                  </button>
                                )}
                              </span>
                            ))
                          )}
                          {isEditing && (
                            <button className="add-tag-btn" onClick={handleAddSkill}>
                              <i className="fas fa-plus"></i>
                              Ajouter une compétence
                            </button>
                          )}
                        </div>
                        {subSkills.length > 0 && (
                          <>
                            <h4 style={{ marginTop: '1rem', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: 600 }}>Sous-compétences</h4>
                            <div className="skills-grid">
                              {subSkills.map((skill, index) => (
                                <span key={index} className="sub-skill-tag">
                                  {translateSubSkill(skill)}
                                  {isEditing && (
                                    <button
                                      className="remove-tag-btn"
                                      onClick={() => handleRemoveSkill(skill)}
                                      title="Supprimer cette sous-compétence"
                                    >
                                      <i className="fas fa-times"></i>
                                    </button>
                                  )}
                                </span>
                              ))}
                            </div>
                          </>
                        )}
                      </>
                    );
                  })()}
                </div>
                )}

                {/* Disponibilités Section - hidden for members with temporary email */}
                {!member.hasTemporaryEmail && (
                <div className="info-section">
                  <h3>Disponibilités</h3>
                  <div className="availability-grid">
                    {member.availability.length === 0 ? (
                      <p className="w-full text-center no-badges">Aucune disponibilité renseignée</p>
                    ) : (
                      (isEditing ? editedMember.availability : member.availability).map((day, index) => (
                        <span key={index} className="availability-tag">
                          {day}
                          {isEditing && (
                            <button
                              className="remove-tag-btn"
                              onClick={() => handleRemoveAvailability(day)}
                              title="Supprimer cette disponibilité"
                            >
                              <i className="fas fa-times"></i>
                            </button>
                          )}
                        </span>
                      )))}
                    {isEditing && (
                      <button className="add-tag-btn" onClick={handleAddAvailability}>
                        <i className="fas fa-plus"></i>
                        Ajouter une disponibilité
                      </button>
                    )}
                  </div>
                </div>
                )}

                {/* Services Section - only show for network members and not for temporary email */}
                {!member.hasTemporaryEmail && (member.take_trainee || member.propose_workshop) && (
                  <div className="info-section">
                    <h3>Services proposés</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {member.take_trainee && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <i className="fas fa-check-circle" style={{ color: '#10b981', fontSize: '1.2rem' }}></i>
                          <span style={{ color: '#374151' }}>Accepte des stagiaires</span>
                        </div>
                      )}
                      {member.propose_workshop && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <i className="fas fa-check-circle" style={{ color: '#10b981', fontSize: '1.2rem' }}></i>
                          <span style={{ color: '#374151' }}>Propose des ateliers</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Recent Badges Section - show for all members */}
                <div className="info-section">
                  <h3>3 derniers badges reçus</h3>
                  {!member.latestBadges || member.latestBadges.length === 0 ? (
                    <p className="w-full text-center no-badges">Aucun badge reçu</p>
                  ) : (
                    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                      {member.latestBadges.slice(0, 3).map((latestBadge) => {
                        const badge = latestBadge.badge;
                        const badgeLevel = badge.level || 'level_1';
                        const badgeImage = badge.image_url || 
                          getLocalBadgeImage(badge.name, badgeLevel, badge.series) || 
                          '/TouKouLeur-Jaune.png';
                        
                        return (
                          <img 
                            key={latestBadge.id || `${badge.id}-${badgeLevel}`}
                            src={badgeImage} 
                            alt={badge.name}
                            title={`${badge.name} - ${badgeLevel.replace('level_', 'Niveau ')}`}
                            style={{ 
                              width: '64px', 
                              height: '64px', 
                              objectFit: 'contain',
                              cursor: 'pointer'
                            }}
                          />
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Badges reçus section - hidden as not used */}
                {false && (
                <div className="info-section">
                  <h3>Badges reçus</h3>
                  <div className="badges-grid">
                    {(() => {
                      // Get attributed badges for this member
                      const attributedBadges = state.badgeAttributions.filter(attribution =>
                        attribution.participantId === member.id
                      );

                      // Group existing badges by type and level, count duplicates
                      const badgeGroups: { [key: string]: { badge: Badge; count: number; isAttributed?: boolean; attribution?: any } } = {};

                      // Add existing badges
                      if (member.badges && member.badges.length > 0) {
                        member.badges.forEach(badgeId => {
                          const badge = mockBadges.find(b => b.id === badgeId);
                          if (badge) {
                            const key = `${badge.id}-${badge.level}`;
                            if (badgeGroups[key]) {
                              badgeGroups[key].count++;
                            } else {
                              badgeGroups[key] = { badge, count: 1 };
                            }
                          }
                        });
                      }

                      // Add attributed badges
                      attributedBadges.forEach(attribution => {
                        const key = `${attribution.badgeId}`;
                        if (badgeGroups[key]) {
                          badgeGroups[key].count++;
                        } else {
                          // Create a badge object from attribution data
                          const badge: Badge = {
                            id: attribution.badgeId,
                            name: attribution.badgeTitle,
                            description: getBadgeDescription(attribution.badgeTitle, attribution.badgeSeries, attribution.badgeLevel),
                            level: `Niveau ${attribution.badgeLevel} - ${getLevelName(attribution.badgeLevel)}`,
                            levelClass: `level-${attribution.badgeLevel}`,
                            icon: 'fas fa-award',
                            image: attribution.badgeImage,
                            category: attribution.badgeTitle,
                            series: attribution.badgeSeries.toLowerCase(),
                            recipients: 1,
                            created: new Date(attribution.dateAttribution).toLocaleDateString('fr-FR'),
                            domains: [attribution.domaineEngagement],
                            expertises: [],
                            recipients_list: [{
                              name: attribution.participantName,
                              avatar: attribution.participantAvatar,
                              date: new Date(attribution.dateAttribution).toLocaleDateString('fr-FR')
                            }],
                            files: attribution.preuve ? [{
                              name: attribution.preuve.name,
                              type: attribution.preuve.type,
                              size: attribution.preuve.size
                            }] : [],
                            requirements: [],
                            skills: []
                          };
                          badgeGroups[key] = {
                            badge,
                            count: 1,
                            isAttributed: true,
                            attribution
                          };
                        }
                      });

                      const badgeGroupsArray = Object.values(badgeGroups);
                      const BADGES_DISPLAY_LIMIT = 5; // Show only 5 badges initially
                      const displayedBadges = showAllBadgeGroups ? badgeGroupsArray : badgeGroupsArray.slice(0, BADGES_DISPLAY_LIMIT);
                      const hasMoreBadges = badgeGroupsArray.length > BADGES_DISPLAY_LIMIT;
                      const remainingCount = badgeGroupsArray.length - BADGES_DISPLAY_LIMIT;

                      if (badgeGroupsArray.length === 0) {
                        return <p className="no-badges">Aucun badge attribué</p>;
                      }

                      return (
                        <>
                          {displayedBadges.map((group, index) => (
                            <div key={index} className="badge-item">
                              <div className="badge-left-section">
                                <div className="badge-icon-container">
                                  <div className="badge-icon">
                                    <img src={group.badge.image} alt={group.badge.name} className="badge-image" />
                                  </div>
                                  {group.count > 1 && (
                                    <div className="badge-count">+{group.count - 1}</div>
                                  )}
                                </div>
                                <div className="badge-title-section">
                                  <h4 className="badge-name">{group.badge.name}</h4>
                                  <div className="badge-level-container">
                                    <span className={`badge-level ${group.badge.levelClass}`}>
                                      {group.badge.level}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <div className="badge-info">
                                <p className="badge-serie">
                                  {group.badge.series.startsWith('Série ') || group.badge.series.startsWith('série ') ?
                                    group.badge.series.charAt(0).toUpperCase() + group.badge.series.slice(1) :
                                    `Série ${group.badge.series.charAt(0).toUpperCase() + group.badge.series.slice(1)}`}
                                </p>
                                <div className="badge-description-container">
                                  <p
                                    className={`badge-description ${expandedDescriptions[`${group.badge.id}-${group.badge.level}`] ? 'expanded' : ''}`}
                                  >
                                    {group.badge.description}
                                  </p>
                                  <button
                                    className="btn-expand-description"
                                    onClick={() => toggleDescriptionExpansion(`${group.badge.id}-${group.badge.level}`)}
                                  >
                                    {expandedDescriptions[`${group.badge.id}-${group.badge.level}`] ? 'Voir moins' : 'Voir plus'}
                                  </button>
                                </div>
                                {group.badge.files && group.badge.files.length > 0 && (
                                  <div className="badge-proof">
                                    <button
                                      className="btn-proof"
                                      onClick={() => {
                                        // Simulate file download
                                        const file = group.badge.files[0];
                                        const link = document.createElement('a');
                                        link.href = `#`; // In real app, this would be the actual file URL
                                        link.download = file.name;
                                        link.click();
                                      }}
                                    >
                                      <i className="fas fa-download"></i>
                                      Télécharger preuve
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                          {hasMoreBadges && (
                            <div className="show-more-badges">
                              <button
                                className="btn-show-more"
                                onClick={() => setShowAllBadgeGroups(!showAllBadgeGroups)}
                              >
                                {showAllBadgeGroups ? (
                                  <>
                                    <i className="fas fa-chevron-up"></i>
                                    Voir moins ({remainingCount} badges cachés)
                                  </>
                                ) : (
                                  <>
                                    <i className="fas fa-chevron-down"></i>
                                    Voir plus (+{remainingCount} badges)
                                  </>
                                )}
                              </button>
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>
                </div>
                )}

              </div>

              {/* Permissions Section - hidden for members with temporary email */}
              {!hideDeleteButton && !member.hasTemporaryEmail && (
                <div className="info-section">
                  <h3>Permissions</h3>
                  <p className="section-subtitle">Le membre peut gérer :</p>
                  <div className="permissions-grid">
                  <div className="permission-item">
                    <label className="permission-checkbox">
                      <input
                        type="checkbox"
                        checked={permissions.members}
                        onChange={() => handlePermissionChange('members')}
                      />
                      <span className="checkmark"></span>
                      <span className="permission-label">Membres</span>
                    </label>
                  </div>
                  <div className="permission-item">
                    <label className="permission-checkbox">
                      <input
                        type="checkbox"
                        checked={permissions.projects}
                        onChange={() => handlePermissionChange('projects')}
                      />
                      <span className="checkmark"></span>
                      <span className="permission-label">Projets</span>
                    </label>
                  </div>
                  <div className="permission-item">
                    <label className="permission-checkbox">
                      <input
                        type="checkbox"
                        checked={permissions.badges}
                        onChange={() => handlePermissionChange('badges')}
                      />
                      <span className="checkmark"></span>
                      <span className="permission-label">Badges</span>
                    </label>
                  </div>
                  <div className="permission-item">
                    <label className="permission-checkbox">
                      <input
                        type="checkbox"
                        checked={permissions.events}
                        onChange={() => handlePermissionChange('events')}
                      />
                      <span className="checkmark"></span>
                      <span className="permission-label">Événements</span>
                    </label>
                  </div>
                </div>
                </div>
              )}

              {/* Proposals Section - hidden for members with temporary email */}
              {!hideDeleteButton && !member.hasTemporaryEmail && (
                <div className="info-section">
                  <h3>Propositions</h3>
                  <p className="section-subtitle">Le membre peut proposer :</p>
                  <div className="proposals-grid">
                    <div className="permission-item">
                      <label className="permission-checkbox">
                        <input
                          disabled
                          type="checkbox"
                          checked={proposals.canProposeStage}
                          onChange={() => handleProposalChange('canProposeStage')}
                        />
                        <span className="checkmark"></span>
                        <span className="permission-label">Propose un stage</span>
                      </label>
                    </div>
                    <div className="permission-item">
                      <label className="permission-checkbox">
                        <input
                          disabled
                          type="checkbox"
                          checked={proposals.canProposeAtelier}
                          onChange={() => handleProposalChange('canProposeAtelier')}
                        />
                        <span className="checkmark"></span>
                        <span className="permission-label">Propose un atelier pro</span>
                      </label>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button className="btn btn-outline" onClick={onClose}>
                Fermer
              </button>
              {/* {isEditing ? (
                <>
                  <button className="btn btn-outline" onClick={handleEditToggle}>
                    <i className="fas fa-times"></i>
                    Annuler
                  </button>
                  <button className="btn btn-primary" onClick={handleSave}>
                    <i className="fas fa-save"></i>
                    Sauvegarder
                  </button>
                </>
              ) : (
                !hideEditButton && (
                  <button className="btn btn-primary" onClick={handleEditToggle}>
                    <i className="fas fa-edit"></i>
                    Modifier
                  </button>
                )
              )} */}
            </div>
          </>
        )}
      </div>
    </div>
  );

};

export default MemberModal;
