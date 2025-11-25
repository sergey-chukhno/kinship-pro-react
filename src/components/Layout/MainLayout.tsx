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
import Network from '../Pages/Network';
import Notifications from '../Pages/Notifications';
import ProjectManagement from '../Pages/ProjectManagement';
import Projects from '../Pages/Projects';
import Settings from '../Pages/Settings';
import './MainLayout.css';
import Sidebar from './Sidebar';
import UserHeader from './UserHeader';
import { useAuthInit } from '../../hooks/useAuthInit';

const MainLayout: React.FC = () => {
  const { state, setCurrentPage} = useAppContext();

  const { isAuthChecking } = useAuthInit();

  // Initialiser les couleurs à des valeurs neutres au démarrage
  useEffect(() => {
    const root = document.documentElement;
    // Définir des couleurs neutres par défaut pour éviter tout flash
    root.style.setProperty("--primary", "#6b7280");
    root.style.setProperty("--hover-primary", "#4b5563");
  }, []);

  // Gérer les changements de showingPageType (pour les changements après l'init)
  useEffect(() => {
    // Ne pas appliquer pendant le chargement initial (géré par useAuthInit)
    if (isAuthChecking) return;

    const root = document.documentElement;
    console.log("Current showingPageType:", state.showingPageType);

    if (state.showingPageType === "pro") {
      root.style.setProperty("--primary", "#5570F1"); // bleu pour pro
      root.style.setProperty("--hover-primary", "#4c63d2");
    }
    else if (state.showingPageType === "edu") {
      root.style.setProperty("--primary", "#10b981"); // vert pour edu
      root.style.setProperty("--hover-primary", "#0f9f6d");
    }
    else if (state.showingPageType === "teacher") {
      root.style.setProperty("--primary", "#ffa600ff"); // jaune pour teacher
      root.style.setProperty("--hover-primary", "#e59400ff");
    }
    else if (state.showingPageType === "user") {
      root.style.setProperty("--primary", "#db087cff"); // rose pour user
      root.style.setProperty("--hover-primary", "#b20666ff");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.showingPageType, isAuthChecking]); // Réagir aux changements de showingPageType et isAuthChecking


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
      case 'membership-requests':
        return <MembershipRequests />;
      case 'project-management':
        return <ProjectManagement />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="app-container" data-theme={state.theme}>
      <Routes>
        {/* Routes d'authentification */}
        <Route path="/login" element={<AuthPage />} />
        <Route path="/register" element={<AuthPage />} />
        <Route path="/register/:registerType" element={<AuthPage />} />
        <Route path="/privacy-policy" element={<AuthPage />} />
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
