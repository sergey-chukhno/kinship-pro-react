import React, { useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { useAppContext } from '../../context/AppContext';
import Analytics from '../Pages/Analytics';
import AuthPage from '../Pages/AuthPage';
import Badges from '../Pages/Badges';
import Dashboard from '../Pages/Dashboard';
import Events from '../Pages/Events';
import Members from '../Pages/Members';
import MembershipRequests from '../Pages/MembershipRequests';
import PartnershipRequests from '../Pages/PartnershipRequests';
import Network from '../Pages/Network';
import Notifications from '../Pages/Notifications';
import ProjectManagement from '../Pages/ProjectManagement';
import Projects from '../Pages/Projects';
import Settings from '../Pages/Settings';
import PersonalSettings from '../Pages/PersonalSettings';
import Pik from '../Pages/Pik';
import PrivacyPolicy from '../RegisterForm/PrivacyPolicy';
import './MainLayout.css';
import Sidebar from './Sidebar';
import UserHeader from './UserHeader';
import { useAuthInit } from '../../hooks/useAuthInit';
import { applySpaceTheme } from '../../utils/spaceTheme';
import PresenceSessionPage from '../Pages/PresenceSessionPage';
import PresenceBanner from '../Presence/PresenceBanner';
import FormationDetail from '../Pages/FormationDetail';
import PreuveFormationPage from '../Pages/PreuveFormationPage';
import FormationsHub from '../Pages/FormationsHub';

const MainLayout: React.FC = () => {
  const { state, setCurrentPage} = useAppContext();

  const { isAuthChecking } = useAuthInit();

  // Initialiser les couleurs à des valeurs neutres au démarrage
  useEffect(() => {
    applySpaceTheme(null);
  }, []);

  // Couleur d'espace : suit l'ESPACE via --couleur-espace (KIN_UX_TOTP V1.1.2)
  useEffect(() => {
    if (isAuthChecking) return;
    applySpaceTheme(state.showingPageType);
  }, [state.showingPageType, isAuthChecking]);


  /*
  useEffect(() => {
    const handleUnauthorized = () => {
      setCurrentPage('Auth');
    };
    window.addEventListener('unauthorized', handleUnauthorized);
    return () => window.removeEventListener('unauthorized', handleUnauthorized);
  }, [setCurrentPage]);
  */

  const renderCurrentPage = () => {
    // Afficher un loader pendant la vérification de l'authentification
    if (isAuthChecking) {
      return (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
          width: '100%',
          background: '#ffffff'
        }}>
          <div className="loader" style={{
            border: '4px solid #f3f3f3',
            borderTop: '4px solid #6b7280',
            borderRadius: '50%',
            width: '50px',
            height: '50px',
            animation: 'spin 1s linear infinite'
          }} />
        </div>
      );
    }

    switch (state.currentPage) {
      case 'Auth':
        return <AuthPage />;
      case 'dashboard':
        return <Dashboard />;
      case 'members':
        return <Members />;
      case 'events':
        return <Events />;
      case 'projects':
        return <Projects />;
      case 'formations':
        return <FormationsHub />;
      case 'badges':
        return <Badges />;
      case 'analytics':
        return <Analytics />;
      case 'network':
        return <Network />;
      case 'notifications':
        return <Notifications />;
      case 'settings':
        return <Settings />;
      case 'personal-settings':
        return <PersonalSettings />;
      case 'pik':
        return <Pik />;
      case 'membership-requests':
        return <MembershipRequests />;
      case 'partnership-requests':
        return <PartnershipRequests />;
      case 'project-management':
        return <ProjectManagement />;
      case 'presence-session':
        return <PresenceSessionPage />;
      case 'formation-detail':
        return <FormationDetail />;
      case 'preuve-formation':
        return <PreuveFormationPage />;
      default:
        return <Dashboard />;
    }
  };

  const showPresenceBanner =
    !isAuthChecking &&
    state.showingPageType === 'user' &&
    state.currentPage !== 'Auth';

  return (
    <div className="app-container" data-theme={state.theme}>
      <Routes>
        {/* Routes d'authentification */}
        <Route path="/login" element={<AuthPage />} />
        <Route path="/register" element={<AuthPage />} />
        <Route path="/register/:registerType" element={<AuthPage />} />
        <Route path="/privacy-policy" element={<PrivacyPolicy />} />
        <Route path='/CGU' element={<AuthPage/>}/>


        {/* Routes principales de l'application */}
        <Route path="*" element={
          isAuthChecking ? (
            // Afficher uniquement le loader pendant la vérification
            renderCurrentPage()
          ) : (
            <>
              {state.showingPageType === 'user' && state.currentPage !== 'Auth' && (
                <UserHeader currentPage={state.currentPage} onPageChange={setCurrentPage} />
              )}

              <div
                className={`app-body ${
                  state.showingPageType === 'user' ? 'no-sidebar' : 'with-sidebar'
                }`}
              >
                {state.showingPageType !== 'user' && state.currentPage !== 'Auth' && (
                  <Sidebar currentPage={state.currentPage} onPageChange={setCurrentPage} />
                )}

                <main className="dashboard app-layout">
                  {showPresenceBanner && <PresenceBanner />}
                  {renderCurrentPage()}
                </main>
              </div>
            </>
          )
        } />
      </Routes>
    </div>
  );
};

export default MainLayout;
