import React, { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Home from "./components/Home";
import Navbar from "./components/Navbar";
import Register from "./components/auth/Register";
import Login from "./components/auth/Login";
import Profile from "./components/auth/Profile";
import "./App.css";

const App = () => {
  const [loggedIn, setLoggedIn] = useState(null); // null indicates loading state

  const authenticate = async () => {
    try {
      const token = localStorage.getItem("token");
      if (token) {
        const response = await fetch("/api/validate-token", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
        setLoggedIn(response.ok);
      } else {
        setLoggedIn(false);
      }
    } catch (err) {
      console.error("Authentication error:", err);
      setLoggedIn(false);
    }
  };

  useEffect(() => {
    authenticate();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    setLoggedIn(false);
    window.location.href = "/";
  };

  const ProtectedRoute = ({ element }) => {
    if (loggedIn === null) return <div>Loading...</div>; // Handle loading state
    return loggedIn ? element : <Navigate to="/login" />;
  };

  return (
    <BrowserRouter>
      <Navbar loggedIn={loggedIn} handleLogout={handleLogout} />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />
        <Route path="/profile" element={<ProtectedRoute element={<Profile />} />} />
        <Route path="/logout" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
