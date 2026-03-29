import React, { useEffect, useState, useCallback } from "react";
import "./MyRequests.css";
import RequestModal from "./RequestModal";

function MyRequests() {
  const [requests, setRequests] = useState([]);
  const [showModal, setShowModal] = useState(false);

  // 1. Balutin ang fetchRequests sa useCallback para safe sa useEffect
  const fetchRequests = useCallback(() => {
    /* ==========================================
       LOGIC NI SIR (SAFE VERSION)
    ========================================== */
    let user = null;
    const token = localStorage.getItem("token");

    try {
      user = JSON.parse(localStorage.getItem("user"));
    } catch {
      user = null;
    }

    if (!user?.id || !token) {
      // PAMPATANGGAL NG RED LINE:
      // Balutin sa setTimeout para maging "async" ang update.
      // Same logic pa rin ito sa setRequests([]) ni Sir.
      setTimeout(() => {
        setRequests([]);
      }, 0);
      return;
    }
    /* ========================================== */

    fetch(`http://localhost:5000/api/resident-requests/${user.id}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setRequests(data);
        } else {
          console.log("Invalid response:", data);
          setRequests([]);
        }
      })
      .catch((err) => console.error(err));
  }, []); // Empty dependency array para stable ang function

  // 2. Tawagin ang fetchRequests sa useEffect
  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  return (
    <div className="requests-page">
      <div className="header">
        <h1>My Requests</h1>
        <button className="new-btn" onClick={() => setShowModal(true)}>
          + New Request
        </button>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Reference</th>
              <th>Service</th>
              <th>Purpose</th>
              <th>Date</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {requests.length === 0 ? (
              <tr>
                <td colSpan="5" className="empty-row">No requests found</td>
              </tr>
            ) : (
              requests.map((req) => (
                <tr key={req.RequestID || req.ReferenceNo}>
                  <td>{req.ReferenceNo}</td>
                  <td>{req.DocumentType}</td>
                  <td>{req.Purpose}</td>
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

      {showModal && (
        <RequestModal
          close={() => {
            setShowModal(false);
            fetchRequests(); // Refresh ang listahan pagkatapos mag-submit
          }}
        />
      )}
    </div>
  );
}

export default MyRequests;