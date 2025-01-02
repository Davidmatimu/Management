import React, { useState } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";

const Login = ({ setLoggedIn }) => {
    const navigate = useNavigate();
    const [error, setError] = useState('');

    const [formData, setFormData] = useState({
        username: '',
        password: '',
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prevData) => ({
            ...prevData,
            [name]: value,
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const response = await axios.post('http://localhost:5500/login', formData);
            const { token } = response.data;

            // Store token in localStorage
            console.log("Login Token is: " + token);
            localStorage.setItem('token', token);

            // Update loggedIn state
            setLoggedIn(true);

            // Clear any previous errors and navigate to profile
            setError('');
            navigate('/profile');
        } catch (error) {
            console.log("Login Failed: " + error);
            setError(error.response?.data?.message || 'An error occurred');
            setTimeout(() => {
                setError('');
            }, 3000);
        }
    };

    return (
        <div className="login-container">
            <h2>Training Management System</h2>
            {error && <p style={{ color: 'red' }}>{error}</p>}
            <form onSubmit={handleSubmit}>
                <input
                    type="text"
                    name="username"
                    value={formData.username}
                    onChange={handleChange}
                    required
                    placeholder="Username"
                /> <br />
                <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    placeholder="Password"
                /> <br />
                <button type="submit">Login</button>
            </form>
            <p>Don't have an account? <Link to="/register">Register</Link></p>
        </div>
    );
};

export default Login;
