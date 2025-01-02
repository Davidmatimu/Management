import React from "react";
import { Link } from "react-router-dom";

const Navbar = ({ loggedIn, handleLogout }) => {

    return (
        <div className="navbar">
            {loggedIn && <Link to="/">Home</Link>}
            {loggedIn && <Link to="/">Products</Link>}
            {loggedIn && <Link to="/myrequests">My Requests</Link>}
            {loggedIn && <Link to="/profile">Profile</Link>}
            {loggedIn && <Link to="/logout" onClick={handleLogout}>Logout</Link>}
            {!loggedIn && <Link to="/login">Login</Link>}
            {!loggedIn && <Link to="/register">Register</Link>}
        </div>
    )
}
export default Navbar;