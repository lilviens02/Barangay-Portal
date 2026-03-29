import React, { useState } from "react";
import "./AdminDashboard.css";

function AdminDashboard() {
  const [form, setForm] = useState({
    fullname: "",
    email: "",
    gender: "",
    birthdate: ""
  });

  const [tempPassword, setTempPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.fullname || !form.email) {
      alert("Full name and email are required");
      return;
    }

    try {
      setLoading(true);

      const token = localStorage.getItem("token");

      const res = await fetch("http://localhost:5000/api/create-staff", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(form)
      });

      const data = await res.json();

      if (res.ok) {
        setTempPassword(data.tempPassword || "");
        alert("Staff account created successfully");
        setForm({
          fullname: "",
          email: "",
          gender: "",
          birthdate: ""
        });
      } else {
        alert(data.message || "Failed to create staff");
      }
    } catch (error) {
      console.error(error);
      alert("Server error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-dashboard">
      <div className="admin-card">
        <h1>Admin Dashboard</h1>
        <p>Create staff accounts with temporary passwords.</p>

        <form className="admin-form" onSubmit={handleSubmit}>
          <input
            name="fullname"
            placeholder="Full Name"
            value={form.fullname}
            onChange={handleChange}
          />
          <input
            type="email"
            name="email"
            placeholder="Email"
            value={form.email}
            onChange={handleChange}
          />
          <select name="gender" value={form.gender} onChange={handleChange}>
            <option value="">Gender</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
          </select>
          <input
            type="date"
            name="birthdate"
            value={form.birthdate}
            onChange={handleChange}
          />

          <button type="submit" disabled={loading}>
            {loading ? "Creating..." : "Create Staff Account"}
          </button>
        </form>

        {tempPassword && (
          <div className="temp-box">
            <strong>Temporary Password:</strong> {tempPassword}
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminDashboard;