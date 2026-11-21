import React from 'react';
import { Link } from 'react-router-dom';
import { useKeycloak } from '@react-keycloak/web';

const Home = () => {
  const { keycloak, initialized } = useKeycloak();

  if (!initialized) {
    return (
      <div className="app-loading">
        <div className="spinner" />
        <p>Loading application security layers...</p>
      </div>
    );
  }

  if (keycloak.authenticated) {
    return (
      <div className="home-loggedin card">
        <h2>Welcome back, {keycloak.tokenParsed?.given_name || keycloak.tokenParsed?.preferred_username}</h2>
        <p className="section-subtext">Pick up where you left off.</p>
        <div className="home-cta-row">
          <Link to="/dashboard" className="home-cta-primary">Go to Dashboard</Link>
          <Link to="/courses" className="home-cta-secondary">Browse Courses</Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="home-hero">
        <h1>Training Management System</h1>
        <p>Submit, track, and approve SF-182 training requests in one place — from request to certification.</p>
        <div className="home-cta-row">
          <button className="home-cta-primary" onClick={() => keycloak.login()}>Sign In to Get Started</button>
          <Link to="/courses" className="home-cta-secondary">Browse Courses</Link>
        </div>
      </div>

      <div className="home-features">
        <div className="home-feature-card">
          <div className="home-feature-icon">📝</div>
          <h4>Submit an SF-182</h4>
          <p>Fill out the full authorization form electronically, prefilled from courses your coworkers have already taken.</p>
        </div>
        <div className="home-feature-card">
          <div className="home-feature-icon">✅</div>
          <h4>Track approvals in real time</h4>
          <p>Follow your request through supervisor and Approving Official sign-off, with notifications at every stage.</p>
        </div>
        <div className="home-feature-card">
          <div className="home-feature-icon">🔍</div>
          <h4>Browse popular courses</h4>
          <p>See what training your organization requests most, and reuse vendor details instead of retyping them.</p>
        </div>
      </div>
    </>
  );
};

export default Home;
