import React, { useState, useEffect } from 'react';
import { Badge } from '../../types';
import './Modal.css';

interface BadgeModalProps {
  badge?: Badge | null;
  onClose: () => void;
  onSave: (badgeData: Omit<Badge, 'id'>) => void;
}

const BadgeModal: React.FC<BadgeModalProps> = ({ badge, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    level: '',
    series: '',
    requirements: [] as string[],
    skills: [] as string[],
    image: ''
  });

  const [newRequirement, setNewRequirement] = useState('');
  const [newSkill, setNewSkill] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const levels = [
    'Niveau 1 - Découverte',
    'Niveau 2 - Application', 
    'Niveau 3 - Maîtrise',
    'Niveau 4 - Expertise'
  ];

  const categories = [
    'Compétences techniques',
    'Compétences sociales',
    'Compétences créatives',
    'Compétences de leadership',
    'Compétences numériques'
  ];

  const series = [
    'TouKouLeur',
    'CPS (Compétences Psychosociales)',
    'Développement durable',
    'Innovation'
  ];

  useEffect(() => {
    if (badge) {
      setFormData({
        name: badge.name,
        description: badge.description,
        category: badge.category,
        level: badge.level,
        series: badge.series,
        requirements: badge.requirements,
        skills: badge.skills,
        image: badge.image || ''
      });
    } else {
      setFormData({
        name: '',
        description: '',
        category: '',
        level: '',
        series: '',
        requirements: [],
        skills: [],
        image: ''
      });
    }
  }, [badge]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
        setFormData(prev => ({ ...prev, image: e.target?.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddRequirement = () => {
    if (newRequirement.trim() && !formData.requirements.includes(newRequirement.trim())) {
      setFormData(prev => ({
        ...prev,
        requirements: [...prev.requirements, newRequirement.trim()]
      }));
      setNewRequirement('');
    }
  };

  const handleRemoveRequirement = (requirement: string) => {
    setFormData(prev => ({
      ...prev,
      requirements: prev.requirements.filter(r => r !== requirement)
    }));
  };

  const handleAddSkill = () => {
    if (newSkill.trim() && !formData.skills.includes(newSkill.trim())) {
      setFormData(prev => ({
        ...prev,
        skills: [...prev.skills, newSkill.trim()]
      }));
      setNewSkill('');
    }
  };

  const handleRemoveSkill = (skill: string) => {
    setFormData(prev => ({
      ...prev,
      skills: prev.skills.filter(s => s !== skill)
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.name && formData.category && formData.level) {
      const badgeData = {
        ...formData,
        levelClass: `level-${formData.level.toLowerCase().replace(/\s+/g, '-')}`,
        icon: 'fas fa-award',
        recipients: 0,
        created: new Date().toISOString(),
        domains: [],
        expertises: [],
        recipients_list: [],
        files: []
      };
      onSave(badgeData);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{badge ? 'Modifier le badge' : 'Créer un nouveau badge'}</h2>
          <button className="modal-close" onClick={onClose}>
            <i className="fas fa-times"></i>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body">
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="name">Nom du badge *</label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                required
                className="form-input"
                placeholder="Nom du badge"
              />
            </div>

            <div className="form-group">
              <label htmlFor="category">Catégorie *</label>
              <select
                id="category"
                name="category"
                value={formData.category}
                onChange={handleInputChange}
                required
                className="form-select"
              >
                <option value="">Sélectionner une catégorie</option>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="level">Niveau *</label>
              <select
                id="level"
                name="level"
                value={formData.level}
                onChange={handleInputChange}
                required
                className="form-select"
              >
                <option value="">Sélectionner un niveau</option>
                {levels.map((level) => (
                  <option key={level} value={level}>
                    {level}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="series">Série</label>
              <select
                id="series"
                name="series"
                value={formData.series}
                onChange={handleInputChange}
                className="form-select"
              >
                <option value="">Sélectionner une série</option>
                {series.map((serie) => (
                  <option key={serie} value={serie}>
                    {serie}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              className="form-textarea"
              placeholder="Description du badge"
              rows={3}
            />
          </div>

          <div className="form-section">
            <h3>Image du badge</h3>
            <div className="image-upload">
              <input
                type="file"
                id="image"
                name="image"
                accept="image/*"
                onChange={handleImageChange}
                className="file-input"
              />
              <label htmlFor="image" className="file-label">
                <i className="fas fa-upload"></i>
                Choisir une image
              </label>
              {imagePreview && (
                <div className="image-preview">
                  <img src={imagePreview} alt="Preview" />
                </div>
              )}
            </div>
          </div>

          <div className="form-section">
            <h3>Prérequis</h3>
            <div className="list-input">
              <input
                type="text"
                value={newRequirement}
                onChange={(e) => setNewRequirement(e.target.value)}
                className="form-input"
                placeholder="Ajouter un prérequis"
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddRequirement())}
              />
              <button type="button" onClick={handleAddRequirement} className="btn btn-outline btn-sm">
                <i className="fas fa-plus"></i>
              </button>
            </div>
            <div className="list-items">
              {formData.requirements.map((requirement, index) => (
                <span key={index} className="list-item">
                  {requirement}
                  <button
                    type="button"
                    onClick={() => handleRemoveRequirement(requirement)}
                    className="list-item-remove"
                  >
                    <i className="fas fa-times"></i>
                  </button>
                </span>
              ))}
            </div>
          </div>

          <div className="form-section">
            <h3>Compétences développées</h3>
            <div className="list-input">
              <input
                type="text"
                value={newSkill}
                onChange={(e) => setNewSkill(e.target.value)}
                className="form-input"
                placeholder="Ajouter une compétence"
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddSkill())}
              />
              <button type="button" onClick={handleAddSkill} className="btn btn-outline btn-sm">
                <i className="fas fa-plus"></i>
              </button>
            </div>
            <div className="list-items">
              {formData.skills.map((skill, index) => (
                <span key={index} className="list-item">
                  {skill}
                  <button
                    type="button"
                    onClick={() => handleRemoveSkill(skill)}
                    className="list-item-remove"
                  >
                    <i className="fas fa-times"></i>
                  </button>
                </span>
              ))}
            </div>
          </div>
        </form>

        <div className="modal-footer">
          <button type="button" className="btn btn-outline" onClick={onClose}>
            Annuler
          </button>
          <button type="submit" className="btn btn-primary" onClick={handleSubmit}>
            <i className="fas fa-save"></i>
            {badge ? 'Modifier' : 'Créer'} le badge
          </button>
        </div>
      </div>
    </div>
  );
};

export default BadgeModal;
