import React, { useEffect, useState, useCallback } from "react"; // 1. Idinagdag ang useCallback dito
import { useNavigate } from "react-router-dom"; 
import "./StaffDashboard.css"; 

function StaffDashboard() {
  const navigate = useNavigate(); 
  const [requests, setRequests] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [residents, setResidents] = useState([]);
  const [residentSearch, setResidentSearch] = useState("");

  // ✅ FIX: Binalot sa useCallback para mawala ang ESLint error
  const fetchResidents = useCallback(() => {
    const token = localStorage.getItem("token");
    fetch(`http://localhost:5000/api/users?search=${encodeURIComponent(residentSearch)}`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    })
      .then(res => res.json())
      .then(data => {
        setResidents(Array.isArray(data) ? data : []);
      })
      .catch(err => console.log("Resident fetch error:", err));
  }, [residentSearch]); // Nakadepende sa search input ng resident

  useEffect(() => {
    const fetchRequests = () => {
      const token = localStorage.getItem("token");
      fetch(`http://localhost:5000/api/requests?search=${encodeURIComponent(search)}&status=${encodeURIComponent(statusFilter)}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })
      .then(res => res.json())
      .then(data => {
        setRequests(data);
      })
      .catch(err => console.log("Fetch error:", err));
    };

    fetchRequests();
    fetchResidents(); 

    const interval = setInterval(() => {
      fetchRequests();
      fetchResidents(); 
    }, 5000);

    return () => clearInterval(interval);
    
    // ✅ FIX: Isinama ang fetchResidents sa dependency array
  }, [search, statusFilter, residentSearch, fetchResidents]); 

  const updateStatus = async (id, status) => {
  const token = localStorage.getItem("token");

  try {
    const endpoint =
      status === "Approved"
        ? `http://localhost:5000/api/requests/${id}/approve`
        : `http://localhost:5000/api/requests/${id}/reject`;

    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || "Failed to update request");
    }

    alert(data.message);
    setRequests((prev) =>
      prev.map((req) =>
        req.RequestID === id ? { ...req, Status: status } : req
      )
    );
  } catch (err) {
    console.error("Update error:", err);
    alert(err.message || "Failed to update request");
  }
};

  return (
    

      <div className="admin-content">
        <h1>Staff Dashboard</h1>

        <div className="table-card">
          <h3>Incoming Requests</h3>

          <div style={{ marginBottom: "15px" }}>
            <input
              type="text"
              placeholder="Search by name or reference..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ marginRight: "10px", padding: "5px" }}
            />

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ padding: "5px" }}
            >
              <option value="">All</option>
              <option value="Pending">Pending</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>

            {/* Removed: Issued is not a real backend status in the current schema  <option value="Issued">Issued</option>*/} 
            </select>
          </div>

          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Reference</th>
                <th>Document</th>
                <th>Purpose</th>
                <th>Date</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {requests.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: "center", padding: "20px" }}>
                    No results found
                  </td>
                </tr>
              ) : (
                requests.map(req => (
                  <tr key={req.RequestID}>
                    <td>{req.RequestID}</td>
                    <td>{req.ReferenceNo}</td>
                    <td>{req.DocumentType}</td>
                    <td>{req.Purpose}</td>
                    <td>{new Date(req.DateSubmitted).toLocaleDateString()}</td>
                    <td>
                      <span className={`badge ${String(req.Status).toLowerCase()}`}>
                        {req.Status}
                      </span>
                    </td>
                    <td>
                      {String(req.Status).toLowerCase() === "pending" && (
                        <>
                          <button onClick={() => updateStatus(req.RequestID, "Approved")}>
                            Approve
                          </button>
                          <button onClick={() => updateStatus(req.RequestID, "Rejected")}>
                            Reject
                          </button>
                        </>
                      )}

                      {String(req.Status).toLowerCase() === "approved" && (
                        <button
                          onClick={() => {
                            localStorage.setItem("certID", req.RequestID);
                            navigate("/certificate");
                          }}
                        >
                          Print
                        </button>
                      )}

                      {String(req.Status).toLowerCase() === "issued" && (
                        <button
                          onClick={() => {
                            localStorage.setItem("certID", req.RequestID);
                            navigate("/certificate");
                          }}
                        >
                          Print
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="table-card" style={{ marginTop: "30px" }}>
          <h3>Resident Records</h3>

          <div style={{ marginBottom: "15px" }}>
            <input
              type="text"
              placeholder="Search resident by name, email, or address..."
              value={residentSearch}
              onChange={(e) => setResidentSearch(e.target.value)}
              style={{ marginRight: "10px", padding: "5px" }}
            />
            <button onClick={fetchResidents}>Search Resident</button>
          </div>

          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Email</th>
                <th>Address</th>
                <th>Contact</th>
                <th>Date Registered</th>
              </tr>
            </thead>
            <tbody>
              {residents.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: "center", padding: "20px" }}>
                    No residents found
                  </td>
                </tr>
              ) : (
                residents.map((r) => (
                  <tr key={r.ResidentID}>
                    <td>{r.ResidentID}</td>
                    <td>{`${r.Firstname} ${r.Middlename || ""} ${r.Lastname}`}</td>
                    <td>{r.Email}</td>
                    <td>{r.Address}</td>
                    <td>{r.ContactNo}</td>
                    <td>{new Date(r.DateRegistered).toLocaleDateString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
    </div>
  );
}

export default StaffDashboard;
