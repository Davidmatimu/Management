import React from "react";
import {Link} from "react-router-dom"


const Navbar = ({loggedIn, handleLogout}) =>{
return(
    <div className="navbar">
<link to="/">Home</link>
<link to="/">Products</link>

{!loggedIn && <Link to="/login">Login</Link>}
{!loggedIn && <Link to="/register">register</Link>}
{!loggedIn && <Link to="/profile">profile</Link>}
{!loggedIn && <Link to="/logout" onClick={handleLogout}>Logout</Link>}

    </div>
)
}

export default Navbar
