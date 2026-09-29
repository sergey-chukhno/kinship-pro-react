import React, { useMemo, useState } from 'react';
import { LearningOutcome } from '../../data/mockFormations';
import { FormationParticipant } from '../../utils/formationStore';
import './AttestFormationModal.css';

interface AttestFormationModalProps {
  participants: FormationParticipant[];
  outcomes: LearningOutcome[];
  slots: { id: string; label: string; status: string }[];
  preselectedId?: string | null;
  onClose: () => void;
  onAttest: (payload: { participantIds: string[]; outcomeIds: string[]; accordingTo: string }) => void;
}

const AttestFormationModal: React.FC<AttestFormationModalProps> = ({
  participants,
  outcomes,
  slots,
  preselectedId,
  onClose,
  onAttest,
}) => {
  const openSlots = slots.filter((s) => s.status !== 'closed' && s.status !== 'cancelled');
  const [selectedPeople, setSelectedPeople] = useState<Set<string>>(
    () => new Set(preselectedId ? [preselectedId] : participants.slice(0, 3).map((p) => p.id))
  );
  const [selectedOutcomes, setSelectedOutcomes] = useState<Set<string>>(
    () => new Set(outcomes.slice(0, 1).map((o) => o.id))
  );
  const [accordingTo, setAccordingTo] = useState<'formation' | string>('formation');
  const [comment, setComment] = useState('');

  const solo = Boolean(preselectedId);
  const target = useMemo(
    () => participants.find((p) => p.id === preselectedId),
    [participants, preselectedId]
  );

  const toggle = (set: Set<string>, id: string, setter: (next: Set<string>) => void) => {
    const next = new Set(set);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setter(next);
  };

  return (
    <div className="afm-ov" role="dialog" aria-label="Attester une compétence">
      <div className="afm-modal">
        <h3>{solo && target ? `Attester — ${target.name}` : 'Attester une compétence'}</h3>
        {!solo && (
          <>
            <div className="afm-k">Les participants</div>
            <div className="afm-chips">
              {participants.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className={selectedPeople.has(p.id) ? 'on' : ''}
                  onClick={() => toggle(selectedPeople, p.id, setSelectedPeople)}
                >
                  {selectedPeople.has(p.id) ? '☑' : '☐'} {p.name.split(' ')[0]} {p.name.split(' ').slice(-1)[0][0]}.
                </button>
              ))}
            </div>
          </>
        )}
        <div className="afm-k">
          Les compétences <span>— le programme + la transversale, rien d’autre</span>
        </div>
        <div className="afm-list">
          {outcomes.map((o) => (
            <button
              key={o.id}
              type="button"
              className={selectedOutcomes.has(o.id) ? 'on' : ''}
              onClick={() => toggle(selectedOutcomes, o.id, setSelectedOutcomes)}
            >
              {selectedOutcomes.has(o.id) ? '☑' : '☐'} {o.text}
              <em>Niveau 2</em>
            </button>
          ))}
        </div>
        {solo && (
          <label className="afm-comment">
            Commentaire {selectedOutcomes.size > 0 ? <i>✱</i> : null}
            <textarea
              rows={2}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Le commentaire voyage avec l’attestation — attaché au geste, jamais après."
            />
          </label>
        )}
        <div className="afm-selon">
          <b>Selon :</b>
          {openSlots.slice(0, 3).map((s) => (
            <button
              key={s.id}
              type="button"
              className={accordingTo === s.id ? 'on' : ''}
              onClick={() => setAccordingTo(s.id)}
            >
              {s.label}
            </button>
          ))}
          <button
            type="button"
            className={accordingTo === 'formation' ? 'on' : ''}
            onClick={() => setAccordingTo('formation')}
          >
            la formation
          </button>
        </div>
        <div className="afm-actions">
          <button type="button" className="afm-cancel" onClick={onClose}>
            Annuler
          </button>
          <button
            type="button"
            className="afm-go"
            disabled={selectedPeople.size === 0 || selectedOutcomes.size === 0}
            onClick={() =>
              onAttest({
                participantIds: Array.from(selectedPeople),
                outcomeIds: Array.from(selectedOutcomes),
                accordingTo,
              })
            }
          >
            Attester
          </button>
        </div>
      </div>
    </div>
  );
};

export default AttestFormationModal;
