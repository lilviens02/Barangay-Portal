import React, { useEffect, useState } from "react";

function CertificatePage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const id = localStorage.getItem("certID");
    const token = localStorage.getItem("token");

    if (!id || !token) {
      // FIX PARA SA RED LINE: Gawing asynchronous ang pag-set ng error
      setTimeout(() => {
        setError("Missing certificate reference.");
      }, 0);
      return;
    }

    fetch(`http://localhost:5000/api/certificates/${id}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(async (res) => {
        const result = await res.json();
        if (!res.ok) throw new Error(result.message || "Failed to load certificate");
        return result;
      })
      .then(setData)
      .catch((err) => setError(err.message));
  }, []);

  if (error) return <p style={{ padding: 40, color: "red" }}>{error}</p>;
  if (!data) return <p style={{ padding: 40 }}>Loading...</p>;

  return (
    <div style={{ padding: 40, textAlign: "center" }}>
      <h2>Barangay Certificate</h2>
      <h1>
        {data.Firstname} {data.Lastname}
      </h1>
      <p><strong>Document:</strong> {data.CertName}</p>
      <p><strong>Purpose:</strong> {data.Description}</p>
      <p><strong>Reference:</strong> {data.ReferenceNo}</p>
      <p><strong>Date Issued:</strong> {new Date(data.DateIssued).toLocaleDateString()}</p>
      <p><strong>Signed By:</strong> {data.SignedBy}</p>

      <button onClick={() => window.print()}>Print</button>
    </div>
  );
}

export default CertificatePage;
