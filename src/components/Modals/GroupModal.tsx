import React, { useMemo, useState } from 'react';
import AvatarImage, { DEFAULT_AVATAR_SRC } from '../UI/AvatarImage';
import { useToast } from '../../hooks/useToast';

type MemberLite = {
  id: string; // Members.tsx uses string ids
  fullName: string;
  email: string;
  avatar?: string;
};

export type GroupModalMode = 'create' | 'view' | 'edit';

export type GroupModalData = {
  id?: number;
  name: string;
  createdAt?: string;
  createdByName?: string;
  memberIds: number[];
};

type Props = {
  isOpen: boolean;
  mode: GroupModalMode;
  group: GroupModalData;
  availableMembers: MemberLite[];
  canEdit: boolean;
  onClose: () => void;
  onSave: (payload: { name: string; memberIds: number[] }) => Promise<void> | void;
  onDelete?: () => Promise<void> | void;
};

const GroupModal: React.FC<Props> = ({ isOpen, mode, group, availableMembers, canEdit, onClose, onSave, onDelete }) => {
  const { showError, showSuccess } = useToast();
  const [name, setName] = useState(group.name || '');
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<number[]>(group.memberIds || []);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isReadOnly = mode === 'view' || !canEdit;

  const selectedMemberMap = useMemo(() => {
    const map = new Map<number, MemberLite>();
    availableMembers.forEach((m) => map.set(Number(m.id), m));
    return map;
  }, [availableMembers]);

  const selectedMembers = useMemo(
    () => selectedIds.map((id) => selectedMemberMap.get(id)).filter(Boolean) as MemberLite[],
    [selectedIds, selectedMemberMap]
  );

  const filteredMembers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return availableMembers;
    return availableMembers.filter((m) => (m.fullName || '').toLowerCase().includes(q) || (m.email || '').toLowerCase().includes(q));
  }, [availableMembers, search]);

  const toggleMember = (id: number) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const createdAtDisplay = (() => {
    if (!group.createdAt) return '';
    const d = new Date(group.createdAt);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleDateString('fr-FR');
  })();

  const handleSubmit = async () => {
    if (isReadOnly) return;
    if (!name.trim()) {
      showError('Le nom du groupe est requis');
      return;
    }
    setIsSubmitting(true);
    try {
      await onSave({ name: name.trim(), memberIds: selectedIds });
      showSuccess(mode === 'create' ? 'Groupe créé' : 'Groupe mis à jour');
      onClose();
    } catch (e: any) {
      showError(e?.response?.data?.message || 'Erreur lors de la sauvegarde du groupe');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    if (!window.confirm('Supprimer ce groupe ?')) return;
    setIsSubmitting(true);
    try {
      await onDelete();
      showSuccess('Groupe supprimé');
      onClose();
    } catch (e: any) {
      showError(e?.response?.data?.message || 'Erreur lors de la suppression du groupe');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content group-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>
            {mode === 'create' ? 'Créer un groupe' : mode === 'edit' ? 'Modifier le groupe' : 'Groupe'}
          </h2>
          <button className="close-button" onClick={onClose}>
            <i className="fas fa-times" />
          </button>
        </div>

        <div className="modal-body">
          <div className="form-group">
            <label>Nom du groupe</label>
            <input
              className="form-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isReadOnly}
              placeholder="Groupe 1, Groupe 2, Groupe RH..."
            />
          </div>

          {(mode === 'view') && (
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '12px' }}>
              <div style={{ color: '#6b7280', fontSize: '14px' }}>
                <strong>Créé par :</strong> {group.createdByName || '—'}
              </div>
              <div style={{ color: '#6b7280', fontSize: '14px' }}>
                <strong>Créé le :</strong> {createdAtDisplay || '—'}
              </div>
            </div>
          )}

          <div className="form-group">
            <label>Membres du groupe</label>
            <div className="search-input-container" style={{ maxWidth: '520px' }}>
              <i className="fas fa-search search-icon" />
              <input
                type="text"
                className="form-input"
                placeholder="Rechercher un membre..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                disabled={isReadOnly}
              />
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '10px' }}>
              {selectedMembers.length > 0 ? selectedMembers.map((m) => (
                <span
                  key={m.id}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    border: '1px solid #e5e7eb',
                    borderRadius: '999px',
                    padding: '4px 10px',
                    fontSize: '13px',
                    background: '#f9fafb'
                  }}
                >
                  <AvatarImage className="group-member-avatar group-member-avatar--sm" src={m.avatar || DEFAULT_AVATAR_SRC} alt={m.fullName} />
                  <span>{m.fullName}</span>
                  {!isReadOnly && (
                    <button
                      type="button"
                      onClick={() => toggleMember(Number(m.id))}
                      style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#6b7280' }}
                      title="Retirer"
                    >
                      <i className="fas fa-times" />
                    </button>
                  )}
                </span>
              )) : (
                <div style={{ color: '#6b7280', fontSize: '14px' }}>Aucun membre sélectionné</div>
              )}
            </div>

            {!isReadOnly && (
              <div className="group-member-options">
                {filteredMembers.map((m) => {
                  const id = Number(m.id);
                  const checked = selectedIds.includes(id);
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => toggleMember(id)}
                      className={`group-member-option ${checked ? 'selected' : ''}`}
                    >
                      <input type="checkbox" checked={checked} readOnly />
                      <AvatarImage className="group-member-avatar" src={m.avatar || DEFAULT_AVATAR_SRC} alt={m.fullName} />
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontWeight: 600 }}>{m.fullName}</span>
                        <span style={{ fontSize: '13px', color: '#6b7280' }}>{m.email}</span>
                      </div>
                    </button>
                  );
                })}
                {filteredMembers.length === 0 && (
                  <div style={{ padding: '12px', color: '#6b7280' }}>Aucun membre trouvé</div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
          <div>
            {mode !== 'create' && canEdit && onDelete && (
              <button type="button" className="btn btn-outline" onClick={handleDelete} disabled={isSubmitting}>
                <i className="fas fa-trash" /> Supprimer
              </button>
            )}
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button type="button" className="btn btn-outline" onClick={onClose} disabled={isSubmitting}>
              Annuler
            </button>
            {!isReadOnly && (
              <button type="button" className="btn btn-primary" onClick={handleSubmit} disabled={isSubmitting}>
                {mode === 'create' ? 'Créer' : 'Enregistrer'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GroupModal;

