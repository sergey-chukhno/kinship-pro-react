import React, { useState, useRef, useEffect } from 'react';
import { MembershipRequest } from '../../types';
import { useAppContext } from '../../context/AppContext';
import RolePill from '../UI/RolePill';
import './MembershipRequests.css';

const MembershipRequests: React.FC = () => {
  const { state, acceptMembershipRequest, rejectMembershipRequest, updateMembershipRequestRole, setCurrentPage } = useAppContext();
  const [selectedRole, setSelectedRole] = useState<{ [key: string]: string }>({});
  const [openDropdowns, setOpenDropdowns] = useState<{ [key: string]: boolean }>({});

  const pendingRequests = state.membershipRequests.filter(req => req.status === 'pending');

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

  const handleAccept = (requestId: string) => {
    acceptMembershipRequest(requestId);
  };

  const handleReject = (requestId: string) => {
    rejectMembershipRequest(requestId);
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
        {pendingRequests.length === 0 ? (
          <div className="no-requests">
            <div className="no-requests-icon">
              <i className="fas fa-check-circle"></i>
            </div>
            <h3>Aucune demande en attente</h3>
            <p>Toutes les demandes d'adhésion ont été traitées.</p>
          </div>
        ) : (
          <div className="requests-grid">
            {pendingRequests.map((request) => (
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
                    {request.skills.map((skill, index) => (
                      <span key={index} className="skill-pill">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="request-availability">
                  <h4>Disponibilités</h4>
                  <div className="availability-list">
                    {request.availability.map((day, index) => (
                      <span key={index} className="availability-pill">
                        {day}
                      </span>
                    ))}
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
