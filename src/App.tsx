import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import MainLayout from './components/Layout/MainLayout';
import './App.css';

function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <div className="App">
          <Routes>
            <Route path="/*" element={<MainLayout />} />
          </Routes>
        </div>
      </BrowserRouter>
    </AppProvider>
  );
}

export default App;