// Register.js
import React, { useState } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import './Register.css'; // Import your CSS file for styling

const Register = () => {
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        username: '',
        password: '',
        first_Name: '',
        middle_Initial: '',
        last_Name: '',
        date_Of_Birth: '',
        home_Address: '',
        home_Telephone: '',
        position_Level: '',
        organization_Mailing_Address: '',
        office_Telephone: '',
        work_Email_Address: '',
        position_Title: '',
        accommodation: '',
        accommodation_Reason: '',
        appointment: '',
        education_Level: '',
        pay_Plan: '',
        series: '',
        grade: '',
        step: ''
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prevData) => ({
            ...prevData,
            [name]: value,
        }))
    }

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const response = await axios.post('http://localhost:5500/register', formData);
            console.log("Registration Successful")
            navigate('/login')
        } catch (error) {
            console.log("Registration Failed: " + error)
        }
    }

    return (
        <div className="registration-container">
            <h2>Registration</h2>
            <form onSubmit={handleSubmit} className="form-grid">
                {/* Left Column */}
                <div className="form-column">
                    <input
                        type="text"
                        name="username"
                        value={formData.username}
                        onChange={handleChange}
                        required
                        placeholder="Enter Username"
                    />
                    <input
                        type="password"
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        required
                        placeholder="Enter Password"
                    />
                    <input
                        type="text"
                        name="first_Name"
                        value={formData.first_Name}
                        onChange={handleChange}
                        required
                        placeholder="Enter First Name"
                    />
                    <input
                        type="text"
                        name="middle_Initial"
                        value={formData.middle_Initial}
                        onChange={handleChange}
                        placeholder="Enter Middle Initial"
                    />
                    <input
                        type="text"
                        name="last_Name"
                        value={formData.last_Name}
                        onChange={handleChange}
                        required
                        placeholder="Enter Last Name"
                    />

                    <input
                        type="text"
                        name="date_Of_Birth"
                        value={formData.date_Of_Birth}
                        onChange={handleChange}
                        required
                        placeholder="Enter Date of Birth (YYYY-MM-DD)"
                    />
                    <input
                        type="text"
                        name="home_Address"
                        value={formData.home_Address}
                        onChange={handleChange}
                        required
                        placeholder="Enter Home Address"
                    />
                    <input
                        type="text"
                        name="home_Telephone"
                        value={formData.home_Telephone}
                        onChange={handleChange}
                        placeholder="Enter Home Telephone"
                    />
                    <input
                        type="text"
                        name="position_Level"
                        value={formData.position_Level}
                        onChange={handleChange}
                        placeholder="Enter Position Level"
                    />
                </div>

                {/* Right Column */}
                <div className="form-column">
                    <input
                        type="text"
                        name="organization_Mailing_Address"
                        value={formData.organization_Mailing_Address}
                        onChange={handleChange}
                        placeholder="Enter Organization Mailing Address"
                    />
                    <input
                        type="text"
                        name="office_Telephone"
                        value={formData.office_Telephone}
                        onChange={handleChange}
                        placeholder="Enter Office Telephone"
                    />
                    <input
                        type="text"
                        name="work_Email_Address"
                        value={formData.work_Email_Address}
                        onChange={handleChange}
                        placeholder="Enter Work Email Address"
                    />
                    <input
                        type="text"
                        name="position_Title"
                        value={formData.position_Title}
                        onChange={handleChange}
                        placeholder="Enter Position Title"
                    />
                    <input
                        type="text"
                        name="accommodation"
                        value={formData.accommodation}
                        onChange={handleChange}
                        placeholder="Enter Accommodation"
                    />
                    <input
                        type="text"
                        name="accommodation_Reason"
                        value={formData.accommodation_Reason}
                        onChange={handleChange}
                        placeholder="Enter Accommodation Reason"
                    />
                    <input
                        type="text"
                        name="appointment"
                        value={formData.appointment}
                        onChange={handleChange}
                        placeholder="Enter Appointment"
                    />
                    <input
                        type="text"
                        name="education_Level"
                        value={formData.education_Level}
                        onChange={handleChange}
                        placeholder="Enter Education Level"
                    />
                    <input
                        type="text"
                        name="pay_Plan"
                        value={formData.pay_Plan}
                        onChange={handleChange}
                        placeholder="Enter Pay Plan"
                    />
                    <input
                        type="text"
                        name="series"
                        value={formData.series}
                        onChange={handleChange}
                        placeholder="Enter Series"
                    />
                    <input
                        type="text"
                        name="grade"
                        value={formData.grade}
                        onChange={handleChange}
                        placeholder="Enter Grade"
                    />
                    <input
                        type="text"
                        name="step"
                        value={formData.step}
                        onChange={handleChange}
                        placeholder="Enter Step"
                    />
                </div>
            </form>
            <button type="submit">Register</button>
            <p>Already have an account? <Link to='/login'>Login</Link></p>
        </div>
    )
}
export default Register;
