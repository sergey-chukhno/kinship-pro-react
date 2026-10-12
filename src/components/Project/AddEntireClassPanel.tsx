import React, { useMemo, useState } from 'react';
import './AddEntireClassPanel.css';
import {
  TeacherVisibleClass,
  countMissingParticipants,
  isClassReferent,
  sortTeacherVisibleClasses
} from '../../utils/teacherVisibleClasses';

export type EntireClassStudent = {
  id: string | number;
  full_name?: string;
  first_name?: string;
  last_name?: string;
};

export type AddEntireClassPanelProps = {
  /** Classes « mes classes » (référent ∪ équipe péda) */
  myClasses: TeacherVisibleClass[];
  /** Résultats recherche établissement (hors mes classes déjà listées) */
  searchResults?: TeacherVisibleClass[];
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  isSearching?: boolean;
  /** Participant IDs already on the project / form */
  existingParticipantIds: Array<string | number>;
  /**
   * Resolve students for a class.
   * If it returns an array synchronously, the « Ajouter les N » label uses missing count.
   */
  getStudentsForClass: (classId: string) => EntireClassStudent[] | Promise<EntireClassStudent[]>;
  onAddAll: (classId: string, studentIds: string[]) => void;
  onChoose: (classId: string, studentIds: string[], preselectedIds: string[]) => void;
  lastToast?: string | null;
};

function addButtonLabel(
  cls: TeacherVisibleClass,
  classId: string,
  existingParticipantIds: Array<string | number>,
  getStudentsForClass: AddEntireClassPanelProps['getStudentsForClass']
): string {
  const sync = getStudentsForClass(classId);
  if (Array.isArray(sync)) {
    const missing = countMissingParticipants(
      sync.map(s => s.id),
      existingParticipantIds
    );
    if (sync.length > 0 && missing === 0) return 'Dans le projet';
    if (missing > 0) return `Ajouter les ${missing}`;
  }
  const count = typeof cls.students_count === 'number' ? cls.students_count : null;
  if (count != null) return `Ajouter les ${count}`;
  return 'Ajouter la classe';
}

const AddEntireClassPanel: React.FC<AddEntireClassPanelProps> = ({
  myClasses,
  searchResults = [],
  searchValue,
  onSearchChange,
  searchPlaceholder = "Rechercher une autre classe de l'établissement…",
  isSearching = false,
  existingParticipantIds,
  getStudentsForClass,
  onAddAll,
  onChoose,
  lastToast
}) => {
  const [busyClassId, setBusyClassId] = useState<string | null>(null);

  const sortedMine = useMemo(() => sortTeacherVisibleClasses(myClasses), [myClasses]);
  const myIds = useMemo(() => new Set(sortedMine.map(c => c.id.toString())), [sortedMine]);
  const extraFromSearch = useMemo(
    () => searchResults.filter(c => !myIds.has(c.id.toString())),
    [searchResults, myIds]
  );

  const hasMine = sortedMine.length > 0;
  const showSearchOnlyEmpty = !hasMine;

  const resolveAndRun = async (classId: string, action: 'add' | 'choose') => {
    setBusyClassId(classId);
    try {
      const students = await Promise.resolve(getStudentsForClass(classId));
      const ids = students.map(s => s.id.toString()).filter(Boolean);
      if (action === 'add') {
        onAddAll(classId, ids);
      } else {
        onChoose(classId, ids, ids);
      }
    } finally {
      setBusyClassId(null);
    }
  };

  const renderRow = (cls: TeacherVisibleClass) => {
    const id = cls.id.toString();
    const count = typeof cls.students_count === 'number' ? cls.students_count : undefined;
    const label = addButtonLabel(cls, id, existingParticipantIds, getStudentsForClass);
    const busy = busyClassId === id;
    const complete = label === 'Dans le projet';

    return (
      <div key={id} className="add-entire-class-panel__row">
        <div className="add-entire-class-panel__name">
          {cls.name || `Classe ${id}`}
          {isClassReferent(cls) && (
            <span className="add-entire-class-panel__badge">Référent</span>
          )}
        </div>
        <div className="add-entire-class-panel__meta">
          {count != null ? `${count} élève${count > 1 ? 's' : ''}` : '—'}
        </div>
        <div className="add-entire-class-panel__actions">
          <button
            type="button"
            className="btn btn-primary"
            style={{ fontSize: '0.85rem', padding: '6px 12px' }}
            disabled={busy || complete}
            onClick={() => resolveAndRun(id, 'add')}
          >
            {busy ? '…' : label}
          </button>
          <button
            type="button"
            className="btn btn-outline"
            style={{ fontSize: '0.85rem', padding: '6px 12px' }}
            disabled={busy}
            onClick={() => resolveAndRun(id, 'choose')}
          >
            choisir ›
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="add-entire-class-panel">
      <h4 className="add-entire-class-panel__title">Une classe entière</h4>

      {hasMine ? (
        sortedMine.map(renderRow)
      ) : (
        <p className="add-entire-class-panel__empty">
          Aucune classe personnelle — recherchez une classe de l&apos;établissement.
        </p>
      )}

      <div className="add-entire-class-panel__search">
        <div className="search-input-container">
          <i className="fas fa-search search-icon" />
          <input
            type="text"
            className="form-input"
            placeholder={
              showSearchOnlyEmpty
                ? "Rechercher une classe de l'établissement…"
                : searchPlaceholder
            }
            value={searchValue}
            onChange={e => onSearchChange(e.target.value)}
          />
        </div>
        {isSearching && (
          <p className="add-entire-class-panel__hint">
            <i className="fas fa-spinner fa-spin" style={{ marginRight: 6 }} />
            Recherche…
          </p>
        )}
        {extraFromSearch.length > 0 && extraFromSearch.map(renderRow)}
      </div>

      {lastToast && <div className="add-entire-class-panel__toast">{lastToast}</div>}
    </div>
  );
};

export default AddEntireClassPanel;
