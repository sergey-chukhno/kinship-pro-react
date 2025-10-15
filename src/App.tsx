import React from 'react';
import { AppProvider } from './context/AppContext';
import MainLayout from './components/Layout/MainLayout';
import './App.css';

function App() {
  return (
    <AppProvider>
      <div className="App">
        <MainLayout />
      </div>
    </AppProvider>
  );
}

export default App;