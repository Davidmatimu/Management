import React, { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Home from './components/Home';
import Navbar from './components/Navbar';
import Register from './components/auth/Register';
import Login from './components/auth/Login';
import Profile from './components/auth/Profile';
import './App.css';

const App = () => {
  const [loggedIn, setLoggedIn] = useState(false);

  // Function to authenticate user by checking token validity
  const authenticate = () => {
    const token = localStorage.getItem('token');
    console.log("Token found:", token);
    setLoggedIn(!!token); // Set loggedIn state based on token existence
  };

  // Initialize authentication status on app load
  useEffect(() => {
    authenticate();
  }, []);

  // Logout handler
  const handleLogout = () => {
    localStorage.removeItem('token'); // Clear token from localStorage
    setLoggedIn(false); // Update loggedIn state
  };

  return (
    <BrowserRouter>
      <Navbar loggedIn={loggedIn} handleLogout={handleLogout} />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="/login"
          element={loggedIn ? <Navigate to="/profile" /> : <Login setLoggedIn={setLoggedIn} />}
        />
        <Route
          path="/profile"
          element={loggedIn ? <Profile /> : <Navigate to="/login" />}
        />
        <Route path="/logout" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
