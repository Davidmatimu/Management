import React, { useState, useEffect } from "react";
import axios from "axios";

const Profile = () => {
    const [userData, setUserData] = useState({});

    useEffect(() => {
        const fetchUserData = async () => {
            try {
                const response = await axios.get('http://localhost:5500/profile',{
                    headers: {Authorization: `Bearer ${localStorage.getItem('token')}`},
                });
                console.log(response.data);
                setUserData(response.data); // Optional: Set the fetched data to state
            } catch (err) {
                console.log('Error Fetching user profile data: ' + err)
            }
        }
        fetchUserData();
    }, [])


  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setUserData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

    return (
        <div style={{ maxWidth: '600px', margin: 'auto', padding: '20px', backgroundColor: '#f5f5f5', borderRadius: '8px' }}>
          <h2 style={{ textAlign: 'center' }}>Employee Profile</h2>
          <form>
            {Object.keys(userData).map((key) => (
              <div key={key} style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>
                  {key.replace(/_/g, ' ')}:
                </label>
                <input
                  type={key === 'password' ? 'password' : 'text'}
                  name={key}
                  value={userData[key] || ''}
                  onChange={handleInputChange}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #ccc',
                    borderRadius: '4px',
                  }}
                />
              </div>
            ))}
          </form>
        </div>
      );
    };
export default Profile;