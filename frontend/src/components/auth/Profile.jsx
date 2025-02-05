import React, { useState, useEffect } from "react";
import axios from "axios";

const Profile = () => {
  const [userData, setUserData] = useState({});
  const [isEditing, setIsEditing] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const response = await axios.get("http://localhost:5500/profile", {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
        setUserData(response.data);
      } catch (err) {
        console.error("Error fetching user profile data: ", err);
      }
    };
    fetchUserData();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setUserData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  const handleEditClick = () => {
    setIsEditing(true);
    setSuccessMessage("");
  };

  const handleSaveClick = async () => {
    try {
      await axios.put(
        "http://localhost:5500/profile",
        userData,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }
      );
      setIsEditing(false);
      setSuccessMessage("Profile updated successfully!");
    } catch (err) {
      console.error("Error saving profile data: ", err);
      setSuccessMessage("Error saving profile. Please try again.");
    }
  };

  return (
    <div
      style={{
        maxWidth: "600px",
        margin: "auto",
        padding: "20px",
        backgroundColor: "#f5f5f5",
        borderRadius: "8px",
      }}
    >
      <h2 style={{ textAlign: "center" }}>Employee Profile</h2>
      {successMessage && (
        <p style={{ color: successMessage.includes("Error") ? "red" : "green" }}>
          {successMessage}
        </p>
      )}
      <form>
        {Object.keys(userData).map((key) => (
          <div key={key} style={{ marginBottom: "15px" }}>
            <label
              style={{
                display: "block",
                fontWeight: "bold",
                marginBottom: "5px",
              }}
            >
              {key.replace(/_/g, " ")}:
            </label>
            <input
              type={key === "password" ? "password" : "text"}
              name={key}
              value={userData[key] || ""}
              onChange={handleInputChange}
              disabled={!isEditing}
              style={{
                width: "100%",
                padding: "8px",
                border: isEditing ? "1px solid #ccc" : "none",
                backgroundColor: isEditing ? "white" : "#f5f5f5",
                borderRadius: "4px",
              }}
            />
          </div>
        ))}
      </form>
      {!isEditing ? (
        <button
          onClick={handleEditClick}
          style={{
            padding: "10px 20px",
            backgroundColor: "#007bff",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          Edit
        </button>
      ) : (
        <button
          onClick={handleSaveClick}
          style={{
            padding: "10px 20px",
            backgroundColor: "#28a745",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          Save
        </button>
      )}
    </div>
  );
};

export default Profile;
