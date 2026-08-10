import React, { useEffect, useState } from "react";
import api from "../api";
import Layout from "../components/Layout";
import { useToast } from "../components/Toast";

export default function WFHRequestPage() {
  const [date, setDate] = useState("");
  const [reason, setReason] = useState("");
  const [myRequests, setMyRequests] = useState([]);
  const { showToast } = useToast();

  async function load() {
    const { data } = await api.get("/wfh/me");
    setMyRequests(data);
  }
  useEffect(() => { load(); }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      await api.post("/wfh/apply", { date, reason });
      showToast("Work From Home request submitted for approval!", "success");
      setDate(""); setReason("");
      load();
    } catch (err) {
      showToast(err.response?.data?.error || "Failed to submit WFH request", "error");
    }
  }

  return (
    <Layout title="Work From Home" subtitle="Request an exception to the office-network clock-in rule">
      <div className="card">
        <h2>Request Work From Home</h2>
        <p style={{ color: "var(--grey)", fontSize: 14 }}>
          Clock-in/out normally only works from the office network. If approved,
          you'll be able to clock in/out from anywhere on the requested date.
        </p>
        <form onSubmit={handleSubmit}>
          <label>Date</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          <label>Reason</label>
          <textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} />
          <button className="btn" type="submit">Submit Request</button>
        </form>
      </div>

      <div className="card">
        <h3>My WFH Requests</h3>
        <table>
          <thead><tr><th>Date</th><th>Reason</th><th>Status</th></tr></thead>
          <tbody>
            {myRequests.map((r) => (
              <tr key={r.id}>
                <td>{new Date(r.date).toLocaleDateString()}</td>
                <td>{r.reason || "—"}</td>
                <td><span className={`status-badge status-${r.status}`}>{r.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Layout>
  );
}

