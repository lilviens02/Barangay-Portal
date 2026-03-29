import React, { useCallback, useEffect, useState } from "react";
import "./StaffDashboard.css";

function ResidentApproval() {
  const [pending, setPending] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  const fetchPending = useCallback(async () => {
    const token = localStorage.getItem("token");
    setLoading(true);

    try {
      const res = await fetch("http://localhost:5000/api/pending-residents", {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.message || "Failed to fetch pending residents");
      }

      const rows = Array.isArray(data) ? data : [];

      const filtered = search
        ? rows.filter((r) => {
            const fullName = `${r.Firstname || ""} ${r.Middlename || ""} ${r.Lastname || ""}`.toLowerCase();
            const email = (r.Email || "").toLowerCase();
            const address = (r.Address || "").toLowerCase();
            const term = search.toLowerCase();

            return (
              fullName.includes(term) ||
              email.includes(term) ||
              address.includes(term)
            );
          })
        : rows;

      setPending(filtered);
    } catch (err) {
      console.log("Fetch pending residents error:", err);
      setPending([]);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    fetchPending();
  }, [fetchPending]);

  const handleAction = async (id, action) => {
    const token = localStorage.getItem("token");

    try {
      const res = await fetch(`http://localhost:5000/api/residents/${id}/${action}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.message || "Action failed");
      }

      alert(data.message);
      fetchPending();
    } catch (err) {
      console.log("Approval action error:", err);
      alert(err.message || "Action failed");
    }
  };

  return (
    <div className="table-card">
      <h3>Resident Registration Approval</h3>

      <div style={{ marginBottom: "15px" }}>
        <input
          type="text"
          placeholder="Search by name, email, or address..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ marginRight: "10px", padding: "8px", width: "320px" }}
        />
        <button onClick={fetchPending}>Search</button>
      </div>

      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Address</th>
            <th>Date Registered</th>
            <th>Action</th>
          </tr>
        </thead>

        <tbody>
          {loading ? (
            <tr>
              <td colSpan="5" style={{ textAlign: "center", padding: "20px" }}>
                Loading...
              </td>
            </tr>
          ) : pending.length === 0 ? (
            <tr>
              <td colSpan="5" style={{ textAlign: "center", padding: "20px" }}>
                No pending residents
              </td>
            </tr>
          ) : (
            pending.map((r) => (
              <tr key={r.ResidentID}>
                <td>{`${r.Firstname || ""} ${r.Middlename || ""} ${r.Lastname || ""}`}</td>
                <td>{r.Email}</td>
                <td>{r.Address}</td>
                <td>{new Date(r.DateRegistered).toLocaleDateString()}</td>
                <td>
                  <button
                    onClick={() => handleAction(r.ResidentID, "approve")}
                    className="approve-btn"
                    style={{ marginRight: "8px" }}
                  >
                    Approve
                  </button>

                  <button
                    onClick={() => handleAction(r.ResidentID, "reject")}
                    className="reject-btn"
                  >
                    Reject
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export default ResidentApproval;