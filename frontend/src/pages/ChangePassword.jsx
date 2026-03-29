import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
// ✅ TINANGGAL ANG NAVBAR AT FOOTER IMPORTS
import "./ChangePassword.css";

function ChangePassword() {
  const navigate = useNavigate();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  let user = null;
  try {
    user = JSON.parse(localStorage.getItem("user"));
  } catch {
    user = null;
  }

  const role = String(user?.role || "").toLowerCase();

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!newPassword || !confirmPassword) {
      alert("Please fill in all fields");
      return;
    }

    if (newPassword !== confirmPassword) {
      alert("Passwords do not match");
      return;
    }

    try {
      setLoading(true);

      const token = localStorage.getItem("token");

      const res = await fetch("http://localhost:5000/api/change-password", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ newPassword })
      });

      const data = await res.json();

      if (res.ok) {
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));

        const nextRoute =
          role === "superadmin"
            ? "/superadmin"
            : role === "staff"
            ? "/staff"
            : "/";

        navigate(nextRoute);
      } else {
        alert(data.message || "Failed to change password");
      }
    } catch (error) {
      console.error(error);
      alert("Server error");
    } finally {
      setLoading(false);
    }
  };

  // ✅ PINALITANG RETURN: TINANGGAL ANG <Navbar /> AT <Footer /> WRAPPER
  return (
    <main className="change-page">
      <div className="change-card">
        <h1>Change Temporary Password</h1>
        <p>You must change your password before using the dashboard.</p>

        <form onSubmit={handleSubmit} className="change-form">
          <input
            type="password"
            placeholder="New Password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />

          <input
            type="password"
            placeholder="Confirm New Password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />

          <button type="submit" disabled={loading}>
            {loading ? "Saving..." : "Save New Password"}
          </button>
        </form>
      </div>
    </main>
  );
}

export default ChangePassword;
