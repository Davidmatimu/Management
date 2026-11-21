/**
 * Keycloak Configuration File (Standard keycloak-js)
 * 
 * Initializes standard keycloak-js instance for the TMS frontend application.
 * NO @react-keycloak/web or react-keycloak packages used.
 * Connects to Keycloak server at http://localhost:8080
 * Realm: tms-realm | Client: tms-frontend
 */

import Keycloak from 'keycloak-js';

// ─── Keycloak Configuration (Same as App.jsx) ──────────────────────────────
const keycloakConfig = {
  url: process.env.REACT_APP_KEYCLOAK_URL || 'http://localhost:8080',
  realm: 'tms-realm',
  clientId: 'tms-frontend',
};

// ─── Initialize Keycloak Instance (Standard keycloak-js) ────────────────────
const keycloak = new Keycloak(keycloakConfig);

// ─── Export Default ────────────────────────────────────────────────────────
export default keycloak;