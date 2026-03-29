import React, { useEffect, useState } from "react";

function MyProfile() {
  const [profile, setProfile] = useState(null);
  // 1. Dinagdag ang error at loading states
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");

    fetch("http://localhost:5000/api/residents/me", {
      headers: {
        Authorization: `Bearer ${token}`
      }
    })
      .then(async (res) => {
        const data = await res.json();
        // 2. Mahigpit na error checking
        if (!res.ok) throw new Error(data.message || "Failed to load profile");
        return data;
      })
      .then((data) => setProfile(data))
      .catch((err) => setError(err.message)) // 3. I-save ang error message
      .finally(() => setLoading(false)); // 4. Patayin ang loading spinner
  }, []);

  // 5. Mas malinaw na feedback sa user
  if (loading) return <p>Loading profile...</p>;
  if (error) return <p style={{ color: "red" }}>{error}</p>;
  if (!profile) return <p>No profile data found.</p>;

  return (
    <div style={{ padding: "20px" }}>
      <h1>My Profile</h1>
      <p><strong>Name:</strong> {profile.Firstname} {profile.Middlename || ""} {profile.Lastname}</p>
      <p><strong>Email:</strong> {profile.Email}</p>
      <p><strong>Address:</strong> {profile.Address}</p>
      <p><strong>Gender:</strong> {profile.Gender}</p>
      <p><strong>Contact:</strong> {profile.ContactNo}</p>
      <p><strong>Date of Birth:</strong> {profile.DateOfBirth ? new Date(profile.DateOfBirth).toLocaleDateString() : "N/A"}</p>
    </div>
  );
}

export default MyProfile;
