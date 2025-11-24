import React, { useState } from 'react'
import { ClassList } from '../../types';
import { useToast } from '../../hooks/useToast';

type Props = {
  onClose: () => void;
  onAdd: (levelData: { level: { name: string; level: string } }) => void;
}

export default function AddClassModal({ onClose, onAdd }: Props) {
  const [name, setName] = useState('');
  const [level, setLevel] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { showError, showSuccess } = useToast();

  const handleSubmit = async () => {
    if (!name.trim() || !level.trim()) {
      showError('Veuillez remplir tous les champs');
      return;
    }

    try {
      setIsLoading(true);
      const levelData = {
        level: {
          name: name.trim(),
          level: level.trim()
        }
      };

      await onAdd(levelData);
      showSuccess(`La classe ${levelData.level.name} a été ajoutée avec succès`);
    } catch (error) {
      console.error("Erreur lors de l'ajout de la classe :", error);
      showError("Erreur lors de l'ajout de la classe");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Ajouter une classe</h2>
        </div>
        <div className="modal-body">
          <div className="form-group">
            <label htmlFor="name">Nom de la classe</label>
            <input 
              type="text" 
              id="name" 
              name="name" 
              className='form-input'
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label htmlFor="level">Niveau de la classe</label>
            <input 
              type="text" 
              id="level" 
              name="level" 
              className='form-input'
              value={level}
              onChange={(e) => setLevel(e.target.value)}
            />
          </div>
          <div className="modal-footer">
          <button type="button" className="btn btn-outline" onClick={onClose} disabled={isLoading}>
            Annuler
          </button>
          <button type="submit" className="btn btn-primary" onClick={handleSubmit} disabled={isLoading}>
            <i className="fas fa-plus"></i>
            {isLoading ? 'Ajout en cours...' : 'Ajouter la classe'}
          </button>
        </div>
      </div>
        </div>
      </div>
  )
}