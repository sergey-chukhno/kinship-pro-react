import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../context/AppContext';
import RolePill from '../UI/RolePill';
import './MembershipRequests.css';
import { getCompanyUserProfile, getSchoolUserProfile } from '../../api/User';
import { getCurrentUser } from '../../api/Authentication';
import { acceptMember, getCompanyMembersPending } from '../../api/CompanyDashboard/Members';
import { acceptSchoolMember, getSchoolMembersPending } from '../../api/SchoolDashboard/Members';

interface MembershipRequest {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  profession: string;
  avatar: string;
  requestedDate: string;
  skills: string[];
  availability: string[];
  assignedRole: string;
  status: 'pending';
}

const MembershipRequests: React.FC = () => {
  const { state, acceptMembershipRequest, rejectMembershipRequest, updateMembershipRequestRole, setCurrentPage } = useAppContext();  const [requests, setRequests] = useState<MembershipRequest[]>([]);
  const [selectedRole, setSelectedRole] = useState<{ [key: string]: string }>({});
  const [openDropdowns, setOpenDropdowns] = useState<{ [key: string]: boolean }>({});
  const [loading, setLoading] = useState(true);
  
  // 1. Ajout de l'état pour stocker l'ID de l'entreprise
  const [companyId, setCompanyId] = useState<number | null>(null);
  const [contextId, setContextId] = useState<number | null>(null);

  // --- Fetch des membres en attente (Pending) ---
  useEffect(() => {
    const fetchPendingMembers = async () => {
      try {
        setLoading(true);
        const currentUser = await getCurrentUser();
        const isEdu = state.showingPageType === 'edu';

        // 1. Bascule ID
        const cId = isEdu
          ? currentUser.data?.available_contexts?.schools?.[0]?.id
          : currentUser.data?.available_contexts?.companies?.[0]?.id;

        if (!cId) return;

        setContextId(cId);

        // 2. Bascule API Pending
        const pendingRes = isEdu
          ? await getSchoolMembersPending(cId)
          : await getCompanyMembersPending(cId);

        const basicPendingList = pendingRes.data.data || pendingRes.data || [];

        const detailedRequests = await Promise.all(
          basicPendingList.map(async (m: any) => {
            try {
              // Profil détaillé (School ou Company)
              const profileRes = isEdu
                ? await getSchoolUserProfile(m.id, cId)
                : await getCompanyUserProfile(m.id, cId);
                
              const profile = profileRes.data.data || profileRes.data;

              // Traitement disponibilité
              const availData = profile.availability || {};
              const availabilityList: string[] = [];
              if (availData.monday) availabilityList.push('Lundi');
              if (availData.tuesday) availabilityList.push('Mardi');
              if (availData.wednesday) availabilityList.push('Mercredi');
              if (availData.thursday) availabilityList.push('Jeudi');
              if (availData.friday) availabilityList.push('Vendredi');
              if (availData.saturday) availabilityList.push('Samedi');
              if (availData.sunday) availabilityList.push('Dimanche');
              if (availData.available && availabilityList.length === 0) availabilityList.push('Disponible');

              // Traitement rôle (supporte les clés company et school)
              let rawRole = profile.role_in_company || m.role_in_company || profile.role_in_school || m.role_in_school || 'Membre';
              const displayRole = rawRole.charAt(0).toUpperCase() + rawRole.slice(1);

              return {
                id: (profile.id || m.id).toString(),
                firstName: profile.first_name,
                lastName: profile.last_name,
                email: profile.email,
                profession: profile.role_in_system || 'Non renseigné',
                avatar: profile.avatar_url || m.avatar_url || '',
                requestedDate: profile.joined_at || new Date().toISOString(),
                skills: profile.skills?.map((s: any) => s.name || s) || [],
                availability: availabilityList,
                assignedRole: displayRole,
                status: 'pending'
              } as MembershipRequest;

            } catch (err) {
              console.warn(`Profil détaillé non trouvé pour ${m.id}, utilisation fallback.`);
              return {
                id: m.id.toString(),
                firstName: m.first_name || 'Utilisateur',
                lastName: m.last_name || '',
                email: m.email || '',
                profession: '',
                avatar: m.avatar_url || '',
                requestedDate: new Date().toISOString(),
                skills: [],
                availability: [],
                assignedRole: 'Membre',
                status: 'pending'
              } as MembershipRequest;
            }
          })
        );

        const validRequests = detailedRequests.filter((r): r is MembershipRequest => r !== null);
        setRequests(validRequests);
      } catch (err) {
        console.error('Erreur lors de la récupération des demandes:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPendingMembers();
  }, [state.showingPageType]); // Ajout dépendance

  const handleRoleChange = (requestId: string, role: string) => {
    setSelectedRole(prev => ({ ...prev, [requestId]: role }));
    updateMembershipRequestRole(requestId, role);
  };

  const handleRoleClick = (requestId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setOpenDropdowns(prev => ({ ...prev, [requestId]: !prev[requestId] }));
  };

  const handleRoleSelect = (requestId: string, role: string, e: React.MouseEvent) => {
    e.stopPropagation();
    handleRoleChange(requestId, role);
    setOpenDropdowns(prev => ({ ...prev, [requestId]: false }));
  };

  // 3. Bascule API Accept
  const handleAccept = async (requestId: string) => {
    if (!contextId) {
      console.error("ID du contexte manquant");
      return;
    }

    try {
      const isEdu = state.showingPageType === 'edu';

      if (isEdu) {
        await acceptSchoolMember(contextId, Number(requestId));
      } else {
        await acceptMember(contextId, Number(requestId));
      }

      setRequests(prev => prev.filter(req => req.id !== requestId));
    } catch (error) {
      console.error("Erreur lors de l'acceptation du membre:", error);
      alert("Une erreur est survenue lors de l'acceptation.");
    }
  };

  const handleReject = async (requestId: string) => {
    try {
      await rejectMembershipRequest(requestId);
      setRequests(prev => prev.filter(req => req.id !== requestId));
    } catch (error) {
      console.error("Erreur lors du rejet:", error);
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'Admin': return 'role-admin';
      case 'Référent': return 'role-referent';
      case 'Membre': return 'role-membre';
      case 'Intervenant': return 'role-intervenant';
      default: return 'role-membre';
    }
  };

  return (
    <section className="membership-requests-container with-sidebar">
      {/* ... Le reste du JSX reste identique ... */}
      <div className="membership-requests-header">
        <div className="section-title-left">
          <button 
            className="back-button"
            onClick={() => setCurrentPage('members')}
            title="Revenir aux membres"
          >
            <i className="fas fa-arrow-left"></i>
          </button>
          <img src="/icons_logo/Icon=Membres.svg" alt="Demandes d'adhésion" className="section-icon" />
          <h2>Gérer demandes d'adhésion</h2>
        </div>
      </div>

      <div className="membership-requests-content">
        {loading ? (
          <div className="loading-state">Chargement des demandes...</div>
        ) : requests.length === 0 ? (
          <div className="no-requests">
            <div className="no-requests-icon">
              <i className="fas fa-check-circle"></i>
            </div>
            <h3>Aucune demande en attente</h3>
            <p>Toutes les demandes d'adhésion ont été traitées.</p>
          </div>
        ) : (
          <div className="requests-grid">
            {requests.map((request) => (
              <div key={request.id} className="request-card">
                <div className="request-header">
                  <div className="request-avatar">
                    <img src={request.avatar} alt={`${request.firstName} ${request.lastName}`} />
                  </div>
                  <div className="request-info">
                    <h3 className="request-name">{request.firstName} {request.lastName}</h3>
                    <p className="request-profession">{request.profession}</p>
                    <p className="request-email">{request.email}</p>
                    <p className="request-date">Demandé le {new Date(request.requestedDate).toLocaleDateString('fr-FR')}</p>
                  </div>
                </div>

                <div className="request-skills">
                  <h4>Compétences</h4>
                  <div className="skills-list">
                    {request.skills.length > 0 ? (
                      request.skills.map((skill, index) => (
                        <span key={index} className="skill-pill">
                          {skill}
                        </span>
                      ))
                    ) : (
                      <span className="no-data">Aucune compétence renseignée</span>
                    )}
                  </div>
                </div>

                <div className="request-availability">
                  <h4>Disponibilités</h4>
                  <div className="availability-list">
                    {request.availability.length > 0 ? (
                      request.availability.map((day, index) => (
                        <span key={index} className="availability-pill">
                          {day}
                        </span>
                      ))
                    ) : (
                      <span className="no-data">Non spécifié</span>
                    )}
                  </div>
                </div>

                <div className="request-actions">
                  <div className="role-selection">
                    <div className="role-container">
                      <RolePill
                        role={selectedRole[request.id] || request.assignedRole}
                        color={getRoleColor(selectedRole[request.id] || request.assignedRole)}
                        onClick={(e) => handleRoleClick(request.id, e)}
                        isDropdown={true}
                      />
                      {openDropdowns[request.id] && (
                        <div className="role-dropdown">
                          <div className="role-option" onClick={(e) => handleRoleSelect(request.id, 'Admin', e)}>
                            Admin
                          </div>
                          <div className="role-option" onClick={(e) => handleRoleSelect(request.id, 'Référent', e)}>
                            Référent
                          </div>
                          <div className="role-option" onClick={(e) => handleRoleSelect(request.id, 'Membre', e)}>
                            Membre
                          </div>
                          <div className="role-option" onClick={(e) => handleRoleSelect(request.id, 'Intervenant', e)}>
                            Intervenant
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="action-buttons">
                    <button
                      className="btn-accept"
                      onClick={() => handleAccept(request.id)}
                    >
                      <i className="fas fa-check"></i>
                      Accepter
                    </button>
                    <button
                      className="btn-reject"
                      onClick={() => handleReject(request.id)}
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
    </section>
  );
};

export default MembershipRequests;