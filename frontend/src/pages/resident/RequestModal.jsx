import React, { useState } from "react";
import "./RequestModal.css";

function RequestModal({ close }) {

  const [documentType, setDocumentType] = useState("");
  const [purpose, setPurpose] = useState("");
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
const handleSubmit = async (e) => {

  e.preventDefault();

  if (!documentType || !purpose) {
    alert("Please fill all required fields");
    return;
  }

  const formData = new FormData();

  formData.append("documentType", documentType);
  formData.append("purpose", purpose);

  if (file) {
    formData.append("file", file);
  }

  try {

    setLoading(true);

    const token = localStorage.getItem("token");

    const res = await fetch("http://localhost:5000/api/requests", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`
      },
      body: formData
    });

    const data = await res.json();

    if (res.ok) {
      alert("Request submitted! Reference: " + data.reference);
      close();
    } else {
      alert(data.message || "Request failed");
    }

  } catch (error) {
    console.error(error);
    alert("Server error");
  } finally {
    setLoading(false);
  }

};

  return (

    <div className="modal-overlay">

      <div className="modal-card">

        <div className="modal-header">
          <h2>Request Barangay Certificate</h2>
          <span className="close-btn" onClick={close}>×</span>
        </div>

        <p className="modal-desc">
          Please fill out the form below to request your document.
        </p>

        <form onSubmit={handleSubmit}>

          <label>Select Document Type</label>

          <select
            value={documentType}
            onChange={(e) => setDocumentType(e.target.value)}
            required
          >
            <option value="">Choose the type of certificate</option>
            <option value="Barangay Clearance">Barangay Clearance</option>
            <option value="Certificate of Residency">Certificate of Residency</option>
            <option value="Certificate of Indigency">Certificate of Indigency</option>
          </select>

          <label>Purpose of Request</label>

          <textarea
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
            placeholder="e.g., For Employment, For School Application"
            required
          />

          <div className="upload-box">

            <p>Upload a clear copy of your Valid ID</p>
            <small>Accepted formats: JPG, PNG, PDF. Max size: 5MB</small>

            <input
  type="file"
  accept=".jpg,.jpeg,.png,.pdf"
  onChange={(e) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    const allowedTypes = ["image/jpeg", "image/png", "application/pdf"];
    if (!allowedTypes.includes(selectedFile.type)) {
      alert("Invalid file type. JPG, PNG, and PDF only.");
      return;
    }

    if (selectedFile.size > 5 * 1024 * 1024) {
      alert("File too large. Maximum size is 5MB.");
      return;
    }

    setFile(selectedFile);
  }}
/>

          </div>

          <div className="modal-actions">

            <button
              type="button"
              className="cancel-btn"
              onClick={close}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="submit-btn"
              disabled={loading}
            >
              {loading ? "Submitting..." : "Submit Request"}
            </button>

          </div>

        </form>

      </div>

    </div>

  );
}

export default RequestModal;