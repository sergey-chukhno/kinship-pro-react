import React from 'react';
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

const MainLayout: React.FC = () => {
  const { state, setCurrentPage, setShowingPageType } = useAppContext();

  // Effet séparé pour gérer les changements de showingPageType
  React.useEffect(() => {
    const root = document.documentElement;
    console.log("Current showingPageType:", state.showingPageType);

    if (state.showingPageType === "pro") {
      root.style.setProperty("--primary", "#5570F1"); // bleu pro
      root.style.setProperty("--hover-primary", "#4c63d2");
    }
    else if (state.showingPageType === "edu") {
      root.style.setProperty("--primary", "#10b981"); // autre couleur
      root.style.setProperty("--hover-primary", "#0f9f6d");
    }
    else if (state.showingPageType === "teacher") {
      root.style.setProperty("--primary", "#ffa600ff"); // autre couleur
      root.style.setProperty("--hover-primary", "#e59400ff");
    }
  }, [state.showingPageType]); // Cette dépendance permet de réagir aux changements de showingPageType

  const renderCurrentPage = () => {
    switch (state.currentPage) {
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
      <Sidebar currentPage={state.currentPage} onPageChange={setCurrentPage} />
      <main className="dashboard app-layout">
        {renderCurrentPage()}
      </main>
    </div>
  );
};

export default MainLayout;
