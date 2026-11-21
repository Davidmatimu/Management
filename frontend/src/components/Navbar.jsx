import React from 'react';
import { NavLink } from 'react-router-dom';
import { useKeycloak } from '@react-keycloak/web';

const Navbar = () => {
  const { keycloak, initialized } = useKeycloak();
  const loggedIn = initialized && keycloak.authenticated;
  const role = loggedIn ? keycloak.tokenParsed?.realm_access?.roles?.find((r) => ['employee', 'supervisor', 'AO', 'HR'].includes(r)) : null;

  return (
    <nav className="navbar">
      <NavLink to="/" className="navbar-brand">
        <span className="navbar-brand-mark">TMS</span>
        Training Management
      </NavLink>
      <div className="navbar-links">
        <NavLink to="/courses" className={({ isActive }) => (isActive ? 'active' : '')}>Courses</NavLink>
        {loggedIn && <NavLink to="/dashboard" className={({ isActive }) => (isActive ? 'active' : '')}>Dashboard</NavLink>}
        {loggedIn && <NavLink to="/profile" className={({ isActive }) => (isActive ? 'active' : '')}>Profile</NavLink>}
        {role && <span className="navbar-role-badge">{role}</span>}
        {loggedIn ? (
          <NavLink to="/" onClick={() => keycloak.logout()}>Log Out</NavLink>
        ) : (
          <NavLink to="/login" className="navbar-cta">Log In</NavLink>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
