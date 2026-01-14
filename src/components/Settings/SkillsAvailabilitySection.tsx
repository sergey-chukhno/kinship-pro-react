import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../context/AppContext';
import { getSkills, getSubSkills } from '../../api/RegistrationRessource';
import { getCurrentUser } from '../../api/Authentication';
import { updateUserSkills, updateUserAvailability } from '../../api/UserDashBoard/Skills';
import { translateSkill, translateSubSkill } from '../../translations/skills';
import { useToast } from '../../hooks/useToast';
import './SkillsAvailabilitySection.css';

interface Availability {
  monday: boolean;
  tuesday: boolean;
  wednesday: boolean;
  thursday: boolean;
  friday: boolean;
  other: boolean;
}

const SkillsAvailabilitySection: React.FC = () => {
  const { state } = useAppContext();
  const { showSuccess, showError } = useToast();

  const [skillList, setSkillList] = useState<Array<{ id: number; name: string; displayName: string }>>([]);
  const [skillSubList, setSkillSubList] = useState<Array<{ id: number; name: string; displayName: string; parent_skill_id: number }>>([]);
  const [selectedSkills, setSelectedSkills] = useState<number[]>([]);
  const [selectedSubSkills, setSelectedSubSkills] = useState<number[]>([]);
  const [availability, setAvailability] = useState<Availability>({
    monday: false,
    tuesday: false,
    wednesday: false,
    thursday: false,
    friday: false,
    other: false,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingSkills, setIsSavingSkills] = useState(false);
  const [isSavingAvailability, setIsSavingAvailability] = useState(false);

  // Load user's current skills and availability
  useEffect(() => {
    const loadUserData = async () => {
      try {
        // Load skills list
        const skillsResponse = await getSkills();
        const skillsData = skillsResponse?.data?.data ?? skillsResponse?.data ?? skillsResponse ?? [];
        if (Array.isArray(skillsData)) {
          const normalized = skillsData.map((s: any) => ({
            id: Number(s.id),
            name: s.name,
            displayName: translateSkill(s.name)
          }));
          setSkillList(normalized);
        }

        // Load current user data to get existing skills and availability
        const userResponse = await getCurrentUser();
        const userData = userResponse.data?.data || userResponse.data;
        
        // Extract current skills
        if (userData?.skills && Array.isArray(userData.skills)) {
          const userSkillIds = userData.skills.map((s: any) => Number(s.id));
          setSelectedSkills(userSkillIds);
          
          // Extract sub-skills (flatten from all skills)
          const userSubSkillIds: number[] = [];
          userData.skills.forEach((skill: any) => {
            if (skill.sub_skills && Array.isArray(skill.sub_skills)) {
              skill.sub_skills.forEach((sub: any) => {
                userSubSkillIds.push(Number(sub.id));
              });
            }
          });
          setSelectedSubSkills(userSubSkillIds);
        }
        
        // Extract current availability
        if (userData?.availability) {
          setAvailability({
            monday: userData.availability.monday || false,
            tuesday: userData.availability.tuesday || false,
            wednesday: userData.availability.wednesday || false,
            thursday: userData.availability.thursday || false,
            friday: userData.availability.friday || false,
            other: userData.availability.other || false,
          });
        }
      } catch (error) {
        console.error('Error loading user data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadUserData();
  }, [state.user]);

  // Load sub-skills when skills are selected
  useEffect(() => {
    if (skillList.length === 0) {
      setSkillSubList([]);
      return;
    }

    let mounted = true;

    const fetchAllSubSkills = async () => {
      try {
        const promises = skillList.map(async (skill) => {
          const resp = await getSubSkills(skill.id);
          const data = resp?.data ?? resp ?? {};
          const subSkills = Array.isArray(data.sub_skills)
            ? data.sub_skills
            : Array.isArray(data.skill?.sub_skills)
              ? data.skill.sub_skills
              : [];
          return subSkills.map((s: any) => ({
            id: Number(s.id),
            name: s.name,
            displayName: translateSubSkill(s.name),
            parent_skill_id: Number(skill.id),
          }));
        });

        const results = await Promise.all(promises);
        const flattened = results.flat();

        if (mounted) setSkillSubList(flattened);
      } catch (error) {
        console.error('Error loading sub-skills:', error);
      }
    };

    fetchAllSubSkills();

    return () => {
      mounted = false;
    };
  }, [skillList]);

  const toggleSkill = (skillId: number) => {
    if (selectedSkills.includes(skillId)) {
      setSelectedSkills(selectedSkills.filter(id => id !== skillId));
      // Remove sub-skills when skill is deselected
      const relatedSubSkills = skillSubList
        .filter(s => s.parent_skill_id === skillId)
        .map(s => s.id);
      setSelectedSubSkills(selectedSubSkills.filter(id => !relatedSubSkills.includes(id)));
    } else {
      setSelectedSkills([...selectedSkills, skillId]);
    }
  };

  const toggleSubSkill = (subSkillId: number, parentSkillId: number) => {
    // Ensure parent skill is selected
    if (!selectedSkills.includes(parentSkillId)) {
      setSelectedSkills([...selectedSkills, parentSkillId]);
    }

    if (selectedSubSkills.includes(subSkillId)) {
      setSelectedSubSkills(selectedSubSkills.filter(id => id !== subSkillId));
    } else {
      setSelectedSubSkills([...selectedSubSkills, subSkillId]);
    }
  };

  const handleSaveSkills = async () => {
    setIsSavingSkills(true);
    try {
      await updateUserSkills(selectedSkills, selectedSubSkills);
      showSuccess('Compétences mises à jour avec succès');
    } catch (error: any) {
      const errorMessage = error.response?.data?.details?.[0] || error.response?.data?.error || 'Erreur lors de la mise à jour des compétences';
      showError(errorMessage);
    } finally {
      setIsSavingSkills(false);
    }
  };

  const handleSaveAvailability = async () => {
    setIsSavingAvailability(true);
    try {
      await updateUserAvailability(availability);
      showSuccess('Disponibilités mises à jour avec succès');
    } catch (error: any) {
      const errorMessage = error.response?.data?.details?.[0] || error.response?.data?.error || 'Erreur lors de la mise à jour des disponibilités';
      showError(errorMessage);
    } finally {
      setIsSavingAvailability(false);
    }
  };

  if (isLoading) {
    return <div className="loading-container">Chargement...</div>;
  }

  return (
    <div className="skills-availability-section">
      {/* Skills Section */}
      <div className="skills-section">
        <h3>Compétences</h3>
        <p className="section-description">
          Sélectionnez les compétences et sous-compétences que vous souhaitez partager avec votre réseau
        </p>

        <div className="skills-container">
          <div className="skills-list-column">
            {skillList.map((skill) => {
              const skillId = skill.id;
              const isSelected = selectedSkills.includes(skillId);
              const relatedSubs = skillSubList.filter((s) => s.parent_skill_id === skillId);

              return (
                <div key={skillId} className="skill-checkbox-item">
                  <label className={`skill-checkbox-inline ${isSelected ? 'selected' : ''}`}>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSkill(skillId)}
                    />
                    <span className="skill-name-inline">{skill.displayName}</span>
                  </label>

                  {isSelected && relatedSubs.length > 0 && (
                    <div className="subskills-inline">
                      {relatedSubs.map((sub) => {
                        const isSubSelected = selectedSubSkills.includes(sub.id);
                        return (
                          <label
                            key={sub.id}
                            className={`subskill-checkbox-inline ${isSubSelected ? 'selected' : ''}`}
                          >
                            <input
                              type="checkbox"
                              checked={isSubSelected}
                              onChange={() => toggleSubSkill(sub.id, sub.parent_skill_id)}
                            />
                            <span className="subskill-name-inline">{sub.displayName}</span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <button
          type="button"
          className="btn btn-primary"
          onClick={handleSaveSkills}
          disabled={isSavingSkills}
        >
          {isSavingSkills ? 'Enregistrement...' : 'Enregistrer les compétences'}
        </button>
      </div>

      {/* Availability Section */}
      <div className="availability-section">
        <h3>Disponibilités</h3>
        <p className="section-description">
          Indiquez vos jours de disponibilité
        </p>

        <div className="availability-grid">
          {[
            { key: 'monday', label: 'Lundi' },
            { key: 'tuesday', label: 'Mardi' },
            { key: 'wednesday', label: 'Mercredi' },
            { key: 'thursday', label: 'Jeudi' },
            { key: 'friday', label: 'Vendredi' },
            { key: 'other', label: 'Autre' },
          ].map((day) => (
            <label key={day.key} className="availability-checkbox">
              <input
                type="checkbox"
                checked={availability[day.key as keyof Availability]}
                onChange={(e) => setAvailability({ ...availability, [day.key]: e.target.checked })}
              />
              <span>{day.label}</span>
            </label>
          ))}
        </div>

        <button
          type="button"
          className="btn btn-primary"
          onClick={handleSaveAvailability}
          disabled={isSavingAvailability}
        >
          {isSavingAvailability ? 'Enregistrement...' : 'Enregistrer les disponibilités'}
        </button>
      </div>
    </div>
  );
};

export default SkillsAvailabilitySection;

