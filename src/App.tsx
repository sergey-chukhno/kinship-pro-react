import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import MainLayout from './components/Layout/MainLayout';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import ForgotPassword from './components/Pages/ForgotPassword';
import ResetPassword from './components/Pages/ResetPassword';
import CheckinStudent from './components/Pages/CheckinStudent';
import ParentalClaim from './components/Pages/ParentalClaim';
import PublicBadgeCartography from './components/Pages/PublicBadgeCartography';
import NotFoundPage from './components/Pages/NotFoundPage';
import SharedProjectInfo from './components/Pages/SharedProjectInfo';
import SharedEventInfo from './components/Pages/SharedEventInfo';
import SelectedStudentsBadgeCartography from './components/Pages/SelectedStudentsBadgeCartography';
import Verify from './components/Pages/Verify';
import FunderHubPage from './components/Pages/FunderHubPage';
import PublicProofPage from './components/Pages/PublicProofPage';
import ProofIndex from './components/Pages/ProofIndex';
import PikDroits from './components/Pages/PikDroits';
import './App.css';

function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <div className="App">
          <Routes>
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/checkin-student" element={<CheckinStudent />} />
            <Route path="/parental-claim" element={<ParentalClaim />} />
            <Route path="/badge-cartography/:token" element={<PublicBadgeCartography />} />
            <Route path="/badge-cartography-selected/:token" element={<SelectedStudentsBadgeCartography />} />
            <Route path="/p/:id" element={<NotFoundPage />} />
            <Route path="/shared-project/:token" element={<SharedProjectInfo />} />
            <Route path="/shared/:token" element={<SharedProjectInfo />} />
            <Route path="/shared-event/:token" element={<SharedEventInfo />} />
            <Route path="/verify" element={<Verify />} />
            <Route path="/financeur" element={<FunderHubPage />} />
            <Route path="/proof" element={<ProofIndex />} />
            <Route path="/pik/droits" element={<PikDroits />} />
            <Route path="/pb/:token" element={<PublicProofPage proofType="PB" />} />
            <Route path="/pe/:token" element={<PublicProofPage proofType="PE" />} />
            <Route path="/*" element={<MainLayout />} />
          </Routes>
          <ToastContainer
            position="top-right"
            autoClose={3000}
            hideProgressBar={false}
            newestOnTop={false}
            closeOnClick
            rtl={false}
            pauseOnFocusLoss
            draggable
            pauseOnHover
            theme="light"
          />
        </div>
      </BrowserRouter>
    </AppProvider>
  );
}

export default App;