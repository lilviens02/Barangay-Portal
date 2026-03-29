import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";

import ResidentLayout from "./pages/resident/ResidentLayout";
import Dashboard from "./pages/resident/Dashboard";
import MyRequests from "./pages/resident/MyRequests";
import MyProfile from "./pages/resident/MyProfile";

import StaffDashboard from "./pages/staff/StaffDashboard";
import StaffLayout from "./pages/staff/StaffLayout"; 
import ResidentApproval from "./pages/staff/ResidentApproval"; 
import AdminDashboard from "./pages/admin/AdminDashboard";
import CertificatePage from "./pages/CertificatePage";
import MessagesPage from "./pages/MessagesPage";

import ProtectedRoute from "./components/ProtectedRoute";
// ✅ 1. Idinagdag ang import dito
import ChangePassword from "./pages/ChangePassword";

import "./index.css";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* PUBLIC ROUTES */}
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* RESIDENT ROUTES */}
        <Route
          path="/resident"
          element={
            <ProtectedRoute allowedRoles={["resident"]}>
              <ResidentLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="requests" element={<MyRequests />} />
          <Route path="profile" element={<MyProfile />} />
        </Route>

        {/* STAFF ROUTES (NESTED) */}
<Route
  path="/staff"
  element={
    <ProtectedRoute allowedRoles={["staff"]}>
      <StaffLayout />
    </ProtectedRoute>
  }
>
  <Route index element={<StaffDashboard />} />
  <Route path="dashboard" element={<StaffDashboard />} />
  <Route path="approvals" element={<ResidentApproval />} />
</Route>

        {/* SUPER ADMIN DASHBOARD */}
        <Route
          path="/superadmin"
          element={
            <ProtectedRoute allowedRoles={["superadmin"]}>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />

        {/* CERTIFICATE PAGE */}
        <Route
          path="/certificate"
          element={
            <ProtectedRoute allowedRoles={["staff", "superadmin"]}>
              <CertificatePage />
            </ProtectedRoute>
          }
        />

        <Route
  path="/resident/messages"
  element={
    <ProtectedRoute allowedRoles={["resident"]}>
      <MessagesPage />
    </ProtectedRoute>
  }
/>

        {/* ✅ 2. DITO DAPAT ILAGAY (Sa loob ng Routes) */}
        <Route
          path="/force-change-password"
          element={
            <ProtectedRoute allowedRoles={["staff", "superadmin"]}>
              <ChangePassword />
            </ProtectedRoute>
          }
        />


        
      </Routes>
    </BrowserRouter>
  );
}

export default App;
