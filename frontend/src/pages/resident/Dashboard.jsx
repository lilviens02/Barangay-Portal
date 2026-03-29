import React, { useEffect, useState } from "react";
import "./Dashboard.css";
// 1. Dinagdag ang useNavigate (para sa paglipat ng page)
import { useNavigate } from "react-router-dom";
import { FaClipboardList, FaClock, FaCheckCircle, FaPlus } from "react-icons/fa";


function Dashboard() {
  // 2. In-initialize ang navigate
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);


  useEffect(() => {
    const token = localStorage.getItem("token");
    let userData = null;


    try {
      userData = JSON.parse(localStorage.getItem("user"));
    } catch {
      userData = null;
    }


    const loadRequests = async () => {
      if (!userData?.id || !token) {
        setRequests([]);
        return;
      }


      try {
        const res = await fetch(`http://localhost:5000/api/resident-requests/${userData.id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
       
        if (Array.isArray(data)) {
          setRequests(data);
        } else if (Array.isArray(data.requests)) {
          setRequests(data.requests);
        } else {
          setRequests([]);
        }
      } catch (err) {
        console.error(err);
        setRequests([]);
      }
    };


    loadRequests();
  }, []);


  const pending = requests.filter(r => r.Status === "Pending").length;
  const completed = requests.filter(
    r => r.Status === "Approved" || r.Status === "Released"
  ).length;


  const recent = [...requests]
    .sort((a, b) => new Date(b.DateSubmitted) - new Date(a.DateSubmitted))
    .slice(0, 5);


  return (
    <div className="dashboard-page">
      <div className="page-header">
        <div>
          <h1>Resident Dashboard</h1>
          <p>Overview of your service requests</p>
        </div>
      </div>


      <div className="dashboard-cards">
        <div className="stat-card">
          <FaClipboardList className="stat-icon"/>
          <h4>Total Requests</h4>
          <p>{requests.length}</p>
        </div>
        <div className="stat-card">
          <FaClock className="stat-icon"/>
          <h4>Pending</h4>
          <p>{pending}</p>
        </div>
        <div className="stat-card">
          <FaCheckCircle className="stat-icon"/>
          <h4>Completed</h4>
          <p>{completed}</p>
        </div>
      </div>


      <div className="quick-actions">
        {/* 3. DINAGDAGAN NG onClick PARA GUMANA NA ANG BUTTON */}
        <button className="action-btn" onClick={() => navigate("/resident/requests")}>
          <FaPlus/> New Request
        </button>
      </div>


      <div className="table-card">
        <div className="table-title">Request Logs</div>
        <table>
          <thead>
            <tr>
              <th>Reference</th>
              <th>Service</th>
              <th>Date</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {recent.length === 0 ? (
              <tr>
                <td colSpan="4" className="empty">No requests yet</td>
              </tr>
            ) : (
              recent.map(req => (
                <tr key={req.id || req.ReferenceNo}>
                  <td className="id">{req.ReferenceNo}</td>
                  <td>{req.DocumentType}</td>
                  <td>{new Date(req.DateSubmitted).toLocaleDateString()}</td>
                  <td>
                   <span className={`status ${String(req.Status).toLowerCase()}`}>
                      {req.Status}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}


export default Dashboard;