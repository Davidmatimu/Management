/**
 * Training Management System - Login Component
 *
 * Uses @react-keycloak/web hook to trigger Keycloak login flow.
 * All authentication is delegated to Keycloak server.
 */

import React from 'react';
import { useKeycloak } from '@react-keycloak/web';

const Login = () => {
  const { keycloak, initialized } = useKeycloak();

  if (!initialized) {
    return null;
  }

  if (keycloak.authenticated) {
    window.location.href = '/';
    return null;
  }

  const handleKeycloakLogin = async () => {
    try {
      await keycloak.login({
        redirectUri: window.location.origin,
      });
    } catch (error) {
      console.error('Keycloak login error:', error);
    }
  };

  return (
    <div className="login-container">
      <h2>Training Management System</h2>
      <p className="login-instruction">Please sign in with your Keycloak account</p>

      <button
        className="keycloak-login-btn"
        onClick={handleKeycloakLogin}
      >
        Sign in with Keycloak
      </button>
    </div>
  );
};

export default Login;
