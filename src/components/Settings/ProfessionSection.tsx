import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../context/AppContext';
import { updateUserProfile } from '../../api/UserDashBoard/Profile';
import { useToast } from '../../hooks/useToast';
import './ProfileSection.css';

const ProfessionSection: React.FC = () => {
  const { state, setUser } = useAppContext();
  const { showSuccess, showError } = useToast();
  
  const [job, setJob] = useState('');
  const [proposeWorkshop, setProposeWorkshop] = useState(false);
  const [takeTrainee, setTakeTrainee] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Load initial values from user context
  useEffect(() => {
    if (state.user) {
      setJob(state.user.job || '');
      setProposeWorkshop(state.user.propose_workshop || false);
      setTakeTrainee(state.user.take_trainee || false);
    }
  }, [state.user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const response = await updateUserProfile({
        firstName: state.user.name?.split(' ')[0] || '',
        lastName: state.user.name?.split(' ').slice(1).join(' ') || '',
        email: state.user.email || '',
        take_trainee: takeTrainee,
        propose_workshop: proposeWorkshop,
        job: job,
        show_my_skills: state.user.show_my_skills || false,
      });

      if (response.data) {
        // Update user context with new values
        setUser({
          ...state.user,
          job: job,
          propose_workshop: proposeWorkshop,
          take_trainee: takeTrainee,
        });
        showSuccess('Profession et offres mises à jour avec succès');
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.details?.[0] || error.response?.data?.error || 'Erreur lors de la mise à jour';
      showError(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="profile-section">
      <form onSubmit={handleSubmit} className="profile-form">
        <h3>Profession & Offres de stage</h3>
        
        <div className="form-group">
          <label htmlFor="job">Profession</label>
          <input
            type="text"
            id="job"
            value={job}
            onChange={(e) => setJob(e.target.value)}
            className="form-input"
            placeholder="Ex: Enseignant, Consultant, etc."
          />
        </div>

        <div className="form-group">
          <label className="checkbox-toggle">
            <input
              type="checkbox"
              checked={proposeWorkshop}
              onChange={(e) => setProposeWorkshop(e.target.checked)}
            />
            <span>Proposer un atelier de formation professionnel</span>
          </label>
        </div>

        <div className="form-group">
          <label className="checkbox-toggle">
            <input
              type="checkbox"
              checked={takeTrainee}
              onChange={(e) => setTakeTrainee(e.target.checked)}
            />
            <span>Proposer un stage</span>
          </label>
        </div>

        <button
          type="submit"
          className="btn btn-primary"
          disabled={isSaving}
        >
          {isSaving ? 'Enregistrement...' : 'Enregistrer les modifications'}
        </button>
      </form>
    </div>
  );
};

export default ProfessionSection;

