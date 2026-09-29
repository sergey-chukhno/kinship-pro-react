import React from 'react';
import { Navigate } from 'react-router-dom';
import { isAuthenticatedSession } from '../../utils/contextUtils';

const FUNDER_HUB_IN_APP = '/projects?tab=je-finance';

/** The funder hub lives in the company/asso (Kinship Pro) space — never a standalone page. */
const FunderHubPage: React.FC = () => {
  if (isAuthenticatedSession()) {
    return <Navigate to={FUNDER_HUB_IN_APP} replace />;
  }
  return <Navigate to="/login" replace />;
};

export default FunderHubPage;
