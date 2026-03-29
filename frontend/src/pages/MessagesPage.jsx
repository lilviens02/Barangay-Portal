import React, { useEffect, useState } from "react";

function MessagesPage() {
  const [requestId, setRequestId] = useState("");
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const loadMessages = async () => {
    const token = localStorage.getItem("token");
    const id = requestId.trim();

    if (!id) {
      setError("Please enter a request ID.");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const res = await fetch(`http://localhost:5000/api/messages/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.message || "Failed to load messages");
      }

      setData(json);
    } catch (err) {
      setError(err.message || "Error loading messages");
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  // ✅ DAGDAG: Ito ang gagamit sa useEffect para mawala ang error sa VS Code
  useEffect(() => {
    // Kung gusto mong mag-load agad pagka-open ng page (kung may default ID)
    if (requestId) {
      loadMessages();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); 

  return (
    <div style={{ padding: "24px" }}>
      <h1>Messages</h1>
      <p>View reply threads and email interactions by request ID.</p>

      <div style={{ margin: "16px 0", display: "flex", gap: "10px", flexWrap: "wrap" }}>
        <input
          type="number"
          placeholder="Enter Request ID"
          value={requestId}
          onChange={(e) => setRequestId(e.target.value)}
        />
        <button type="button" onClick={loadMessages} disabled={loading}>
          {loading ? "Loading..." : "Load Thread"}
        </button>
      </div>

      {error && <p style={{ color: "red" }}>{error}</p>}

      {data && (
        <>
          <div style={{ marginBottom: "20px" }}>
            <h3>Request Info</h3>
            {/* ✅ Gumamit ng ?. (Optional Chaining) para safe sa loading */}
            <p><strong>Reference:</strong> {data.request?.ReferenceNo}</p>
            <p><strong>Resident:</strong> {data.request?.Firstname} {data.request?.Lastname}</p>
            <p><strong>Email:</strong> {data.request?.Email}</p>
            <p><strong>Document:</strong> {data.request?.DocumentType}</p>
            <p><strong>Status:</strong> {data.request?.Status}</p>
          </div>

          <div style={{ marginBottom: "24px" }}>
            <h3>Messages</h3>
            {data.messages?.length === 0 ? (
              <p>No reply messages found.</p>
            ) : (
              data.messages?.map((msg) => (
                <div key={msg.MessageID} style={{ border: "1px solid #ddd", borderRadius: "8px", padding: "12px", marginBottom: "10px" }}>
                  <p><strong>Sender:</strong> {msg.Sender}</p>
                  <p><strong>Date:</strong> {new Date(msg.Timestamp).toLocaleString()}</p>
                  <p>{msg.Body}</p>
                </div>
              ))
            )}
          </div>

          <div>
            <h3>Email Audit Trail</h3>
            {data.emailLogs?.length === 0 ? (
              <p>No email logs found.</p>
            ) : (
              data.emailLogs?.map((log) => (
                <div key={log.EmailLogID} style={{ border: "1px solid #eee", borderRadius: "8px", padding: "12px", marginBottom: "10px" }}>
                  <p><strong>Direction:</strong> {log.Direction}</p>
                  <p><strong>Status:</strong> {log.Status}</p>
                  <p><strong>Subject:</strong> {log.Subject}</p>
                  <p><strong>Date:</strong> {new Date(log.CreatedAt).toLocaleString()}</p>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default MessagesPage;
