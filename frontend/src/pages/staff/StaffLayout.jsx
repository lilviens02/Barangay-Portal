import React from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import "./StaffDashboard.css";

function StaffLayout() {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.clear();
    navigate("/login");
  };

  return (
    <div className="admin-layout">
      <aside className="sidebar">
        <div className="sidebar-header">
          <h2>Barangay Staff</h2>
          <span>Official Portal</span>
        </div>

        <nav className="sidebar-menu">
          <NavLink
            to="/staff/dashboard"
            className={({ isActive }) => (isActive ? "sidebar-link active" : "sidebar-link")}
          >
            Document Requests
          </NavLink>

          <NavLink
            to="/staff/approvals"
            className={({ isActive }) => (isActive ? "sidebar-link active" : "sidebar-link")}
          >
            Resident Approvals
          </NavLink>

          <button type="button" className="logout-btn" onClick={handleLogout}>
            Logout
          </button>
        </nav>
      </aside>

      <main className="admin-content">
        <Outlet />
      </main>
    </div>
  );
}

export default StaffLayout;