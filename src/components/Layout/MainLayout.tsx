import React, { useEffect } from 'react';
import { useAppContext } from '../../context/AppContext';
import Sidebar from './Sidebar';
import Dashboard from '../Pages/Dashboard';
import Members from '../Pages/Members';
import Events from '../Pages/Events';
import Projects from '../Pages/Projects';
import Badges from '../Pages/Badges';
import Analytics from '../Pages/Analytics';
import Network from '../Pages/Network';
import Notifications from '../Pages/Notifications';
import Settings from '../Pages/Settings';
import MembershipRequests from '../Pages/MembershipRequests';
import ProjectManagement from '../Pages/ProjectManagement';
import './MainLayout.css';
import UserHeader from './UserHeader';
import AuthPage from '../Pages/AuthPage';
import { useAuthInit } from '../../hooks/useAuthInit';

const MainLayout: React.FC = () => {
  const { state, setCurrentPage, setShowingPageType } = useAppContext();

  // useAuthInit();

  // Gérer les changements de showingPageType
  useEffect(() => {
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
      setCurrentPage('projects'); // Rediriger vers 'projects' pour user
      root.style.setProperty("--primary", "#db087cff"); // rose pour user
      root.style.setProperty("--hover-primary", "#b20666ff");
    }
  }, [state.showingPageType]); // Cette dépendance permet de réagir aux changements de showingPageType

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

        <main className="dashboard app-layout">{renderCurrentPage()}</main>
      </div>
    </div>
  );
};

export default MainLayout;
