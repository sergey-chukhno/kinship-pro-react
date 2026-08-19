import React from 'react';
import FunderHub from '../FunderView/FunderHub';
import '../FunderView/FunderView.css';

const FunderHubPage: React.FC = () => {
  return (
    <div className="fv-page">
      <div className="fv-shell">
        <FunderHub />
      </div>
    </div>
  );
};

export default FunderHubPage;
