import React from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import "./Resident.css";

function ResidentLayout() {

  const navigate = useNavigate();

 const logout = () => {
  localStorage.removeItem("user");
  localStorage.removeItem("token");
  localStorage.removeItem("certID");
  navigate("/login");
};

  return (
    <div className="resident-layout">

      {/* SIDEBAR */}
      <div className="resident-sidebar">

<div className="resident-sidebar-title">
            Barangay E‑Docs
        </div>

        <nav>
          <NavLink to="/resident/dashboard">
            Dashboard
          </NavLink>

          <NavLink to="/resident/requests">
            My Requests
          </NavLink>



          <NavLink to="/resident/profile">My Profile</NavLink>
        </nav>
        <NavLink to="/resident/messages">
  Messages
</NavLink>

        <div className="resident-logout" onClick={logout}>
          Logout
        </div>

      </div>

      {/* PAGE CONTENT */}
      <div className="resident-content">
        <Outlet />
      </div>

    </div>
  );
}

export default ResidentLayout;