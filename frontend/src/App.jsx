import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ReactKeycloakProvider } from '@react-keycloak/web';

import keycloak from './keycloak';
import Home from './components/Home';
import Login from './components/auth/Login';
import Profile from './components/auth/Profile';
import Dashboard from './components/Dashboard';
import CourseSearch from './components/CourseSearch';
import Navbar from './components/Navbar';
import './App.css';

const LoadingScreen = () => (
  <div className="app-loading">
    <div className="spinner" />
    <p>Loading application security layers...</p>
  </div>
);

const App = () => {
  return (
    <ReactKeycloakProvider authClient={keycloak} initOptions={{ onLoad: 'check-sso' }} LoadingComponent={<LoadingScreen />}>
      <BrowserRouter>
        <div className="app-container">
          <Navbar />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/courses" element={<CourseSearch />} />
            <Route path="*" element={<Home />} />
          </Routes>
        </div>
      </BrowserRouter>
    </ReactKeycloakProvider>
  );
};

export default App;
export { keycloak };
