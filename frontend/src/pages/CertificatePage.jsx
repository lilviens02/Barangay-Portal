import React, { useEffect, useState } from "react";

function CertificatePage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [pdfLoading, setPdfLoading] = useState(false);

  useEffect(() => {
    const id = localStorage.getItem("certID");
    const token = localStorage.getItem("token");

    if (!id || !token) {
      setError("Missing certificate reference.");
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

  const openPdf = async () => {
    try {
      setPdfLoading(true);
      const token = localStorage.getItem("token");

      const res = await fetch(
        `http://localhost:5000/api/certificates/download/${encodeURIComponent(data.ReferenceNo)}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || "Failed to open PDF");
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (err) {
      alert(err.message || "Failed to open certificate");
    } finally {
      setPdfLoading(false);
    }
  };

  if (error) return <p style={{ padding: 40, color: "red" }}>{error}</p>;
  if (!data) return <p style={{ padding: 40 }}>Loading...</p>;

  return (
    <div style={{ padding: 40 }}>
      <h2>Certificate Ready</h2>
      <p><strong>Reference:</strong> {data.ReferenceNo}</p>
      <p><strong>Name:</strong> {data.Firstname} {data.Lastname}</p>
      <p><strong>Status:</strong> {data.Status}</p>

      <button onClick={openPdf} disabled={pdfLoading}>
        {pdfLoading ? "Opening..." : "Open Printable PDF"}
      </button>
    </div>
  );
}

export default CertificatePage;