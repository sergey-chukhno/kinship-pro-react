import React from 'react';
import { useParams } from 'react-router-dom';
import { getFunderFollow } from '../../data/mockFunderView';
import { getFormationById, getFormationPeople } from '../../utils/formationStore';
import { followViewFromFormation } from '../../utils/funderFollowFromFormation';
import FunderFollowView from '../FunderView/FunderFollowView';
import NotFoundPage from './NotFoundPage';
import '../FunderView/FunderView.css';

const FunderFollowPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const known = token ? getFunderFollow(token) : undefined;
  const formation = !known && token ? getFormationById(token) : undefined;
  const people = formation ? getFormationPeople(formation.id) : undefined;
  const data =
    known ??
    (formation
      ? followViewFromFormation(formation, {
          identitiesDone: people?.participants.filter((p) => p.identityVerified).length,
          identitiesTotal: people?.participants.length,
        })
      : undefined);

  if (!data) return <NotFoundPage />;

  return (
    <div className="fv-page">
      <div className={`fv-shell ${data.closed ? 'ended' : ''}`}>
        <FunderFollowView data={data} />
      </div>
    </div>
  );
};

export default FunderFollowPage;
